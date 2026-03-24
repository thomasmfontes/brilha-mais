
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditData() {
    try {
        const email = 'thomasmfontes7@gmail.com';
        const instructor = await prisma.user.findUnique({ where: { email } });
        if (!instructor) return console.log(JSON.stringify({ error: 'Instructor not found' }));
        const instructorId = instructor.id;

        const enrollments = await prisma.enrollment.findMany({
            where: { course: { instructorId } },
            include: { course: { select: { title: true } }, user: { select: { name: true, email: true } } }
        });

        const progress = await prisma.progress.findMany({
            where: { isCompleted: true, lesson: { module: { course: { instructorId } } } },
            include: {
                lesson: { select: { title: true, duration: true } },
                user: { select: { name: true } }
            }
        });

        const result = {
            instructor: instructor.name,
            enrollments: enrollments.map(e => ({
                student: e.user?.name,
                email: e.user?.email,
                course: e.course?.title
            })),
            progress: progress.map(p => ({
                lesson: p.lesson?.title,
                duration: p.lesson?.duration,
                student: p.user?.name
            }))
        };

        console.log('AUDIT_START');
        console.log(JSON.stringify(result, null, 2));
        console.log('AUDIT_END');

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

auditData();
