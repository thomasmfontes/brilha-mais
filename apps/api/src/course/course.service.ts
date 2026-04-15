import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CourseService {
    constructor(
        private prisma: PrismaService,
        private audit: AuditService
    ) { }

    private extractYoutubeId(url: string | null): string | undefined {
        if (!url) return undefined;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : undefined;
    }

    private formatDuration(seconds: number | null): string {
        if (!seconds) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    private transformCourse(course: any, userId?: string) {
        const isEnrolled = userId ? (course.enrollments?.length > 0) : false;

        // Progress calculation
        const allLessons = course.modules?.flatMap((m: any) => m.lessons) || [];
        const totalLessons = allLessons.length;
        const completedLessons = allLessons.filter((l: any) => (l.progress?.length > 0 && l.progress[0].isCompleted));
        const progress = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;

        const interactedLessons = allLessons
            .filter((l: any) => (l.progress?.length > 0))
            .sort((a: any, b: any) => {
                const dateA = new Date(a.progress[0].updatedAt).getTime();
                const dateB = new Date(b.progress[0].updatedAt).getTime();
                return dateB - dateA;
            });

        const lastLessonTitle = interactedLessons.length > 0
            ? interactedLessons[0].title
            : (allLessons[0]?.title || 'Começar curso');

        const lastAccessedAt = interactedLessons.length > 0
            ? interactedLessons[0].progress[0].updatedAt
            : undefined;

        return {
            ...course,
            isEnrolled,
            instructor: course.instructor?.name || 'Instrutor',
            category: course.category?.name || 'Geral',
            students: course._count?.enrollments || 0,
            views: 0,
            progress: isEnrolled ? progress : 0,
            lastLesson: isEnrolled ? lastLessonTitle : undefined,
            lastAccessedAt: isEnrolled ? lastAccessedAt : undefined,
            modules: course.modules?.map((mod: any) => ({
                ...mod,
                lessons: mod.lessons?.map((less: any) => ({
                    ...less,
                    completed: (less.progress?.length > 0 && less.progress[0].isCompleted),
                    quizAnswers: less.progress?.[0]?.quizAnswers,
                    youtubeId: this.extractYoutubeId(less.videoUrl),
                    duration: this.formatDuration(less.duration),
                    description: less.description,
                    quiz: less.quizzes?.[0],
                    materials: less.materials
                }))
            })) || []
        };
    }

    async findAdminCourses(locationId?: string) {
        const where = locationId ? { locationId } : {};
        const courses = await this.prisma.course.findMany({
            where,
            include: {
                location: true,
                category: true,
                _count: {
                    select: { 
                        enrollments: { 
                            where: { user: { role: 'STUDENT' } } 
                        } 
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return courses.map(course => ({
            ...course,
            status: course.isPublished ? 'Publicado' : 'Privado',
            students: course._count?.enrollments || 0,
            category: course.category?.name || 'Sem categoria',
            locationName: course.location?.name || 'Global'
        }));
    }

    async findByInstructor(instructorId: string, role?: string) {
        const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
        const where = isAdmin ? {} : { instructorId };

        const courses = await this.prisma.course.findMany({
            where,
            include: {
                category: true,
                instructor: {
                    select: { name: true }
                },
                _count: {
                    select: { 
                        enrollments: { 
                            where: { user: { role: 'STUDENT' } } 
                        } 
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return courses.map(course => ({
            ...course,
            status: course.isPublished ? 'Publicado' : 'Privado',
            students: course._count?.enrollments || 0,
            category: course.category?.name || 'Sem categoria',
            instructorName: course.instructor?.name || 'Instrutor'
        }));
    }

    async findEnrolled(userId: string) {
        const enrollments = await this.prisma.enrollment.findMany({
            where: { userId },
            include: {
                course: {
                    include: {
                        category: true,
                        instructor: true,
                        enrollments: { where: { userId } },
                        _count: { 
                            select: { 
                                enrollments: { 
                                    where: { user: { role: 'STUDENT' } } 
                                } 
                            } 
                        },
                        modules: {
                            orderBy: { order: 'asc' },
                            include: {
                                lessons: {
                                    orderBy: { order: 'asc' },
                                    include: {
                                        progress: { where: { userId } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        return enrollments.map(en => this.transformCourse(en.course, userId));
    }

    async findAll(userId?: string) {
        const where: any = { isPublished: true };

        if (userId) {
            const [user, instructorAreas, studentTurma] = await Promise.all([
                this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, locationId: true } }),
                this.prisma.instructorArea.findMany({ where: { userId }, select: { categoryId: true } }),
                this.prisma.turma.findFirst({
                    where: { users: { some: { id: userId } } },
                    include: { areas: true }
                })
            ]);

            // Scope by location: (Course.locationId === user.locationId OR Course.locationId === null)
            if (user?.locationId) {
                where.OR = [
                    { locationId: user.locationId },
                    { locationId: null }
                ];
            }

            if (user?.role === 'STUDENT') {
                const areaIds = studentTurma?.areas.map(a => a.categoryId) || [];
                where.categoryId = { in: areaIds };
            } else if (user?.role === 'INSTRUCTOR') {
                where.categoryId = { in: instructorAreas.map(a => a.categoryId) };
            }
        }

        const courses = await this.prisma.course.findMany({
            where,
            include: {
                category: true,
                instructor: true,
                enrollments: userId ? { where: { userId } } : undefined,
                _count: { 
                    select: { 
                        enrollments: { 
                            where: { user: { role: 'STUDENT' } } 
                        } 
                    } 
                },
                modules: {
                    orderBy: { order: 'asc' },
                    include: {
                        lessons: {
                            orderBy: { order: 'asc' },
                            include: {
                                progress: userId ? { where: { userId } } : undefined,
                            }
                        }
                    }
                }
            }
        });

        return courses.map(course => this.transformCourse(course, userId));
    }

    async findOne(id: string, userId?: string) {
        const course = await this.prisma.course.findUnique({
            where: { id },
            include: {
                category: true,
                instructor: true,
                enrollments: userId ? { where: { userId } } : undefined,
                _count: { 
                    select: { 
                        enrollments: { 
                            where: { user: { role: 'STUDENT' } } 
                        } 
                    } 
                }
            }
        });

        if (!course) return null;

        const modules = await this.prisma.module.findMany({
            where: { courseId: id },
            orderBy: { order: 'asc' },
            include: {
                lessons: {
                    orderBy: { order: 'asc' },
                    include: {
                        progress: userId ? { where: { userId } } : undefined,
                        quizzes: {
                            include: {
                                questions: { include: { options: true } }
                            }
                        },
                        materials: true
                    }
                }
            }
        });

        (course as any).modules = modules;
        return this.transformCourse(course, userId);
    }

    async create(data: any) {
        const { modules, ...courseData } = data;

        // Filtrar apenas campos que existem no modelo Course do Prisma
        const validFields = ['title', 'description', 'thumbnail', 'price', 'isPublished', 'instructorId', 'categoryId', 'locationId'];
        const filteredData: any = {};
        validFields.forEach(field => {
            if (courseData[field] !== undefined) {
                filteredData[field] = courseData[field];
            }
        });
        
        // Use the inherited locationId from instructor if no locationId was provided
        let finalLocationId = courseData.locationId;
        if (!finalLocationId && courseData.instructorId) {
            const instructor = await this.prisma.user.findUnique({
                where: { id: courseData.instructorId },
                select: { locationId: true }
            });
            finalLocationId = instructor?.locationId;
        }

        if (finalLocationId) {
            filteredData.locationId = finalLocationId;
        }

        const course = await this.prisma.course.create({
            data: filteredData
        });

        if (modules && Array.isArray(modules)) {
            for (let i = 0; i < modules.length; i++) {
                const mod = modules[i];
                await this.prisma.module.create({
                    data: {
                        title: mod.title,
                        order: i,
                        courseId: course.id,
                        lessons: {
                            create: (mod.lessons || []).map((less: any, lIdx: number) => ({
                                title: less.title,
                                contentType: less.contentType || 'VIDEO',
                                content: less.content,
                                videoUrl: less.youtubeId ? `https://youtube.com/watch?v=${less.youtubeId}` : less.videoUrl,
                                pdfUrl: less.pdfUrl,
                                description: less.description,
                                duration: typeof less.duration === 'number' ? less.duration : 0,
                                order: lIdx,
                                isFree: less.isFree || false,
                                allowPdfDownload: less.allowPdfDownload !== false,
                                quizzes: less.quiz ? {
                                    create: {
                                        title: less.quiz.title || "Mini Teste",
                                        description: less.quiz.description,
                                        questions: {
                                            create: (less.quiz.questions || []).map((q: any) => ({
                                                text: q.text,
                                                explanation: q.explanation || null,
                                                options: {
                                                    create: (q.options || []).map((o: any) => ({
                                                        text: o.text,
                                                        isCorrect: o.isCorrect
                                                    }))
                                                }
                                            }))
                                        }
                                    }
                                } : undefined,
                                materials: {
                                    create: (less.materials || []).map((m: any) => ({
                                        name: m.name,
                                        url: m.url,
                                        type: m.type,
                                        size: m.size || '0'
                                    }))
                                }
                            }))
                        }
                    }
                });
            }
        }

        await this.audit.log('Criação de Curso', course.title, course.id, course.instructorId);
        return this.findOne(course.id);
    }

    async update(id: string, data: any, actorId?: string) {
        const { modules, ...courseData } = data;
        const validFields = ['title', 'description', 'thumbnail', 'price', 'isPublished', 'categoryId', 'locationId'];
        const filteredUpdateData: any = {};

        validFields.forEach(field => {
            if (courseData[field] !== undefined) {
                filteredUpdateData[field] = courseData[field];
            }
        });

        if (Object.keys(filteredUpdateData).length > 0) {
            await this.prisma.course.update({
                where: { id },
                data: filteredUpdateData,
            });
        }

        if (modules) {
            const incomingModuleIds = modules.map((m: any) => m.id).filter(Boolean);

            // 1. Remover módulos que não estão no payload recebido
            await this.prisma.module.deleteMany({
                where: {
                    courseId: id,
                    id: { notIn: incomingModuleIds }
                }
            });

            // 2. Iterar sobre os módulos recebidos
            for (let i = 0; i < modules.length; i++) {
                const mod = modules[i];
                let moduleId = mod.id;

                if (moduleId) {
                    // Atualizar título e ordem do módulo existente
                    await this.prisma.module.update({
                        where: { id: moduleId },
                        data: { title: mod.title, order: i }
                    });
                } else {
                    // Criar novo módulo
                    const newMod = await this.prisma.module.create({
                        data: {
                            title: mod.title,
                            order: i,
                            courseId: id,
                        }
                    });
                    moduleId = newMod.id;
                }

                // 3. Reconciliar aulas dentro do módulo
                const incomingLessonIds = (mod.lessons || []).map((l: any) => l.id).filter(Boolean);

                // Remover aulas que foram excluídas deste módulo
                await this.prisma.lesson.deleteMany({
                    where: {
                        moduleId: moduleId,
                        id: { notIn: incomingLessonIds }
                    }
                });

                for (let lIdx = 0; lIdx < (mod.lessons || []).length; lIdx++) {
                    const less = mod.lessons[lIdx];
                    const lessonData: any = {
                        title: less.title,
                        contentType: less.contentType || 'VIDEO',
                        content: less.content,
                        videoUrl: less.youtubeId ? `https://youtube.com/watch?v=${less.youtubeId}` : less.videoUrl,
                        pdfUrl: less.pdfUrl,
                        duration: typeof less.duration === 'number' ? less.duration : 0,
                        description: less.description,
                        order: lIdx,
                        isFree: less.isFree || false,
                        allowPdfDownload: less.allowPdfDownload !== false,
                    };

                    if (less.id) {
                        // Atualizar aula existente
                        await this.prisma.lesson.update({
                            where: { id: less.id },
                            data: lessonData
                        });

                        // Atualizar Quiz e Materiais da aula existente (estratégia de substituir para simplificar)
                        await this.prisma.quiz.deleteMany({ where: { lessonId: less.id } });
                        await this.prisma.material.deleteMany({ where: { lessonId: less.id } });

                        if (less.quiz) {
                            await this.prisma.quiz.create({
                                data: {
                                    title: less.quiz.title || "Mini Teste",
                                    description: less.quiz.description,
                                    lessonId: less.id,
                                    questions: {
                                        create: (less.quiz.questions || []).map((q: any) => ({
                                            text: q.text,
                                            explanation: q.explanation || null,
                                            options: {
                                                create: (q.options || []).map((o: any) => ({
                                                    text: o.text,
                                                    isCorrect: o.isCorrect
                                                }))
                                            }
                                        }))
                                    }
                                }
                            });
                        }

                        if (less.materials && less.materials.length > 0) {
                            await this.prisma.material.createMany({
                                data: less.materials.map((m: any) => ({
                                    name: m.name,
                                    url: m.url,
                                    type: m.type,
                                    size: m.size || '0',
                                    lessonId: less.id
                                }))
                            });
                        }

                    } else {
                        // Criar nova aula (com quiz e materiais aninhados)
                        await this.prisma.lesson.create({
                            data: {
                                ...lessonData,
                                moduleId: moduleId,
                                quizzes: less.quiz ? {
                                    create: {
                                        title: less.quiz.title || "Mini Teste",
                                        description: less.quiz.description,
                                        questions: {
                                            create: (less.quiz.questions || []).map((q: any) => ({
                                                text: q.text,
                                                explanation: q.explanation || null,
                                                options: {
                                                    create: (q.options || []).map((o: any) => ({
                                                        text: o.text,
                                                        isCorrect: o.isCorrect
                                                    }))
                                                }
                                            }))
                                        }
                                    }
                                } : undefined,
                                materials: {
                                    create: (less.materials || []).map((m: any) => ({
                                        name: m.name,
                                        url: m.url,
                                        type: m.type,
                                        size: m.size || '0'
                                    }))
                                }
                            }
                        });
                    }
                }
            }
        }

        await this.audit.log('Atualização de Curso', courseData.title ?? id, id, actorId);
        return this.findOne(id);
    }

    async getCourseStudentProgress(courseId: string, studentId: string, instructorId: string, role?: string) {
        const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            select: { instructorId: true }
        });

        if (!course || (!isAdmin && course.instructorId !== instructorId)) {
            throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
        }

        const modules = await this.prisma.module.findMany({
            where: { courseId },
            orderBy: { order: 'asc' },
            include: {
                lessons: {
                    orderBy: { order: 'asc' },
                    include: {
                        progress: { where: { userId: studentId } },
                        quizzes: true
                    }
                }
            }
        });

        return modules.map(mod => ({
            id: mod.id,
            title: mod.title,
            lessons: mod.lessons.map(lesson => ({
                id: lesson.id,
                title: lesson.title,
                contentType: lesson.contentType,
                videoUrl: lesson.videoUrl,
                youtubeId: lesson.videoUrl?.includes('youtube.com') ? lesson.videoUrl.split('v=')[1]?.split('&')[0] : null,
                isCompleted: lesson.progress.length > 0 && lesson.progress[0].isCompleted,
                completedAt: lesson.progress.length > 0 ? lesson.progress[0].updatedAt : null,
                hasQuiz: lesson.quizzes.length > 0
            }))
        }));
    }

    async findStudentsByCourse(courseId: string, instructorId: string, role?: string) {
        const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            select: { instructorId: true }
        });

        if (!course || (!isAdmin && course.instructorId !== instructorId)) {
            throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
        }

        const enrollments = await this.prisma.enrollment.findMany({
            where: { 
                courseId,
                user: { role: 'STUDENT' }
            },
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } }
            },
            orderBy: { enrolledAt: 'desc' }
        });

        return enrollments.map(en => ({
            id: en.user.id,
            name: en.user.name,
            email: en.user.email,
            avatarUrl: en.user.avatarUrl,
            enrolledAt: en.enrolledAt
        }));
    }

    async getLessonStudentsProgress(courseId: string, lessonId: string, instructorId: string, role?: string) {
        const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
        const course = await this.prisma.course.findUnique({
            where: { id: courseId },
            select: { instructorId: true }
        });

        if (!course || (!isAdmin && course.instructorId !== instructorId)) {
            throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
        }

        const enrollments = await this.prisma.enrollment.findMany({
            where: { 
                courseId,
                user: { role: 'STUDENT' }
            },
            include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } }
            }
        });

        const progresses = await this.prisma.progress.findMany({
            where: {
                lessonId,
                userId: { in: enrollments.map(e => e.userId) }
            }
        });

        const progressMap = new Map(progresses.map(p => [p.userId, p]));

        return enrollments.map(en => {
            const prog: any = progressMap.get(en.userId);
            return {
                id: en.user.id,
                name: en.user.name,
                email: en.user.email,
                avatarUrl: en.user.avatarUrl,
                status: prog?.isCompleted ? 'COMPLETED' : 'PENDING',
                completedAt: prog?.isCompleted ? prog.updatedAt : null
            };
        });
    }

    async delete(id: string, actorId?: string) {
        const deletedCourse = await this.prisma.course.delete({ where: { id } });
        await this.audit.log('Exclusão de Curso', deletedCourse.title, id, actorId);
        return deletedCourse;
    }
}
