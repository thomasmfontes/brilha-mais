import { motion } from "framer-motion";
import { LucideChevronLeft, LucideUsers, LucideFileText, LucideCheck, LucideClock, LucidePlus } from "lucide-react";
import toast from "react-hot-toast";
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import LoadingSpinner from "../components/LoadingSpinner";

export default function InstructorCourseProgress() {
    const { id: courseId } = useParams();
    const navigate = useNavigate();

    const [courseTitle, setCourseTitle] = useState("");
    const [viewMode, setViewMode] = useState<'byStudent' | 'byLesson'>('byStudent');
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
    const [courseStudents, setCourseStudents] = useState<any[]>([]);
    const [courseModules, setCourseModules] = useState<any[]>([]);
    const [studentProgress, setStudentProgress] = useState<any[]>([]);
    const [lessonStudents, setLessonStudents] = useState<any[]>([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [isLoadingProgress, setIsLoadingProgress] = useState(false);
    const [isLoadingModules, setIsLoadingModules] = useState(false);
    const [isLoadingLessonStudents, setIsLoadingLessonStudents] = useState(false);
    const [isLoadingCourse, setIsLoadingCourse] = useState(true);

    useEffect(() => {
        if (courseId) {
            fetchCourseDetails();
            fetchCourseStudents();
        }
    }, [courseId]);

    const fetchCourseDetails = async () => {
        setIsLoadingCourse(true);
        try {
            const { data } = await api.get(`/courses/${courseId}`);
            setCourseTitle(data.title);
            setCourseModules(data.modules || []);
        } catch (error) {
            console.error("Error fetching course details:", error);
            toast.error("Erro ao carregar detalhes do curso.");
        } finally {
            setIsLoadingCourse(false);
        }
    };

    const fetchCourseStudents = async () => {
        setIsLoadingStudents(true);
        try {
            const { data } = await api.get(`/courses/${courseId}/students`);
            setCourseStudents(data);
        } catch (error) {
            console.error("Error fetching course students:", error);
            toast.error("Erro ao carregar lista de alunos.");
        } finally {
            setIsLoadingStudents(false);
        }
    };

    const fetchStudentProgress = async (student: any) => {
        setSelectedStudent(student);
        setIsLoadingProgress(true);
        try {
            const { data } = await api.get(`/courses/${courseId}/students/${student.id}/progress`);
            setStudentProgress(data);
        } catch (error) {
            console.error("Error fetching student progress:", error);
            toast.error("Erro ao carregar progresso do aluno.");
        } finally {
            setIsLoadingProgress(false);
        }
    };

    const fetchLessonStudents = async (lesson: any) => {
        setSelectedLesson(lesson);
        setIsLoadingLessonStudents(true);
        try {
            const { data } = await api.get(`/courses/${courseId}/lessons/${lesson.id}/students`);
            setLessonStudents(data);
        } catch (error) {
            console.error("Error fetching lesson students:", error);
            toast.error("Erro ao carregar lista de alunos da aula.");
        } finally {
            setIsLoadingLessonStudents(false);
        }
    };

    const handleBack = () => {
        if (selectedStudent || selectedLesson) {
            setSelectedStudent(null);
            setSelectedLesson(null);
        } else {
            navigate('/instructor');
        }
    };

    if (isLoadingCourse && !courseTitle) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-32 px-4 md:px-8 lg:px-0">
            {/* Header / Breadcrumbs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-8">
                <div className="flex items-center gap-4 md:gap-6">
                    <button
                        onClick={handleBack}
                        className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 transition-all shadow-sm flex items-center justify-center group shrink-0"
                    >
                        <LucideChevronLeft className="h-5 w-5 md:h-6 md:w-6 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Instrutor</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Progresso</span>
                        </div>
                        <h1 className="text-xl md:text-3xl font-black text-slate-900 uppercase tracking-tight truncate">
                            {selectedStudent ? 'Progresso do Aluno' : selectedLesson ? 'Progresso da Aula' : 'Gestão de Alunos'}
                        </h1>
                        <p className="text-[11px] md:text-sm font-bold text-slate-500 uppercase tracking-widest mt-0.5 truncate">
                            {selectedStudent ? selectedStudent.name : selectedLesson ? selectedLesson.title : courseTitle}
                        </p>
                    </div>
                </div>

                {!selectedStudent && !selectedLesson && (
                    <div className="hidden md:flex gap-1 p-1 bg-slate-100/80 rounded-2xl">
                        <button
                            onClick={() => setViewMode('byStudent')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'byStudent' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Alunos
                        </button>
                        <button
                            onClick={() => setViewMode('byLesson')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'byLesson' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Aulas
                        </button>
                    </div>
                )}
            </div>

            {/* Mobile View Switching */}
            {!selectedStudent && !selectedLesson && (
                <div className="md:hidden flex gap-1 p-1 bg-slate-100/80 rounded-2xl mb-6">
                    <button
                        onClick={() => setViewMode('byStudent')}
                        className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'byStudent' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
                    >
                        Por Aluno
                    </button>
                    <button
                        onClick={() => setViewMode('byLesson')}
                        className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'byLesson' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
                    >
                        Por Aula
                    </button>
                </div>
            )}

            {/* Content Area */}
            <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 p-5 md:p-12 shadow-sm min-h-[60vh] flex flex-col">
                {viewMode === 'byStudent' ? (
                    selectedStudent ? (
                        <div className="space-y-10 md:space-y-12">
                            {isLoadingProgress ? (
                                [...Array(3)].map((_, i) => (
                                    <div key={i} className="space-y-6">
                                        <div className="flex items-center gap-3 ml-2">
                                            <div className="h-4 w-48 bg-slate-100 rounded animate-shimmer" />
                                        </div>
                                        <div className="grid gap-4">
                                            {[...Array(2)].map((_, j) => (
                                                <div key={j} className="h-24 w-full bg-slate-50/50 rounded-2xl md:rounded-3xl animate-shimmer border border-slate-100" />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                studentProgress.map((mod) => (
                                    <div key={mod.id} className="space-y-6">
                                        <div className="flex items-center gap-3 ml-2">
                                            <div className="h-2 w-2 rounded-full bg-primary" />
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{mod.title}</h4>
                                        </div>
                                        <div className="grid gap-4">
                                            {mod.lessons.map((lesson: any) => (
                                                <div key={lesson.id} className="flex items-center justify-between p-5 md:p-8 rounded-2xl md:rounded-[2rem] bg-slate-50 border border-slate-100/50 group/lesson transition-all hover:bg-white hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/40">
                                                    <div className="flex items-center gap-4 md:gap-6 min-w-0">
                                                        <div className={`h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 transition-all ${lesson.isCompleted ? 'bg-emerald-50 text-emerald-500 border border-emerald-100 shadow-sm shadow-emerald-200/20' : 'bg-white text-amber-500 border border-slate-200 shadow-sm'}`}>
                                                            {lesson.isCompleted ? <LucideCheck className="h-5 w-5 md:h-7 md:w-7" /> : <LucideClock className="h-5 w-5 md:h-7 md:w-7" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm md:text-lg font-black text-slate-800 leading-tight group-hover/lesson:text-primary transition-colors truncate uppercase tracking-tight">{lesson.title}</p>
                                                            <div className="flex items-center gap-2 md:gap-3 mt-1.5 md:mt-2">
                                                                 <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 md:px-2.5 py-0.5 md:py-1 rounded-md md:rounded-lg bg-slate-200/50 text-slate-500 border border-slate-200/50">
                                                                    {lesson.contentType === 'QUIZ' || (lesson.hasQuiz && !lesson.youtubeId) ? 'MINI TESTE' : (lesson.contentType || 'VÍDEO')}
                                                                 </span>
                                                                {lesson.hasQuiz && lesson.contentType !== 'QUIZ' && lesson.youtubeId && (
                                                                    <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1 md:gap-1.5">
                                                                        <div className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                                                                        + Mini Teste
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 ml-3 md:ml-4">
                                                        {lesson.isCompleted ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className="hidden md:block text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600/50 mb-1.5">Status</span>
                                                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-emerald-100 shadow-sm">
                                                                    OK
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-end">
                                                                <span className="hidden md:block text-[9px] font-black uppercase tracking-[0.2em] text-amber-600/50 mb-1.5">Status</span>
                                                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-amber-100 shadow-sm italic">
                                                                    ...
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            {isLoadingStudents ? (
                                <div className="grid gap-4">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="h-24 md:h-28 w-full bg-slate-50/50 rounded-2xl md:rounded-3xl animate-shimmer border border-slate-100" />
                                    ))}
                                </div>
                            ) : courseStudents.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-6">
                                    <div className="h-20 w-20 md:h-24 md:w-24 bg-slate-50 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center border border-slate-100 shadow-inner">
                                        <LucideUsers className="h-8 w-8 md:h-10 md:w-10 text-slate-200" />
                                    </div>
                                    <div className="max-w-xs">
                                        <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-widest">Nenhum Aluno</h3>
                                        <p className="text-slate-400 text-xs md:text-sm mt-2 font-medium">Ainda não há alunos matriculados neste curso ou área.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-3 md:gap-4">
                                    {courseStudents.map((student) => (
                                        <button
                                            key={student.id}
                                            onClick={() => fetchStudentProgress(student)}
                                            className="w-full flex items-center justify-between p-4 md:p-8 rounded-2xl md:rounded-[2rem] bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group text-left"
                                        >
                                            <div className="flex items-center gap-4 md:gap-6 min-w-0">
                                                <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-[1.25rem] bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                                                    {student.avatarUrl ? (
                                                        <img src={student.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-base md:text-lg font-black text-primary uppercase">{student.name?.substring(0, 2)}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-base md:text-xl font-black text-slate-900 leading-none group-hover:text-primary transition-colors truncate uppercase tracking-tight">{student.name}</span>
                                                    <span className="text-[10px] md:text-xs font-bold text-slate-400 mt-1.5 md:mt-2 truncate">{student.email}</span>
                                                </div>
                                            </div>
                                            <div className="hidden sm:flex flex-col items-end shrink-0 ml-4 group-hover:translate-x-1 transition-transform">
                                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1.5 md:mb-2">Matrícula</span>
                                                <span className="text-[10px] md:text-xs font-black text-slate-600 bg-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-slate-100 shadow-sm">
                                                    {new Date(student.enrolledAt).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )
                            }
                        </div>
                    )
                ) : (
                    selectedLesson ? (
                        <div className="space-y-6 flex-1 flex flex-col">
                            {isLoadingLessonStudents ? (
                                <div className="grid gap-4">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="h-24 w-full bg-slate-50/50 rounded-2xl md:rounded-3xl animate-shimmer border border-slate-100" />
                                    ))}
                                </div>
                            ) : lessonStudents.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-6">
                                    <div className="h-20 w-20 md:h-24 md:w-24 bg-slate-50 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center border border-slate-100 shadow-inner">
                                        <LucideUsers className="h-8 w-8 md:h-10 md:w-10 text-slate-200" />
                                    </div>
                                    <div className="max-w-xs">
                                        <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-widest">Ninguém assistiu</h3>
                                        <p className="text-slate-400 text-xs md:text-sm mt-2 font-medium">Nenhum aluno assistiu a esta aula até o momento.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {lessonStudents.map((student) => (
                                        <div
                                            key={student.id}
                                            className="flex items-center justify-between p-5 md:p-8 rounded-2xl md:rounded-[2rem] bg-slate-50/50 border border-slate-100/50 hover:bg-white hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/40 transition-all group"
                                        >
                                            <div className="flex items-center gap-4 md:gap-6 min-w-0">
                                                <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-[1.25rem] bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                                    {student.avatarUrl ? (
                                                        <img src={student.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-base md:text-lg font-black text-primary uppercase">{student.name?.substring(0, 2)}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-base md:text-xl font-black text-slate-900 leading-none truncate uppercase tracking-tight">{student.name}</span>
                                                    <span className="text-[10px] md:text-xs font-bold text-slate-400 mt-1.5 md:mt-2 truncate">{student.email}</span>
                                                </div>
                                            </div>
                                            <div className="shrink-0 ml-3 md:ml-4">
                                                {student.status === 'COMPLETED' ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="hidden md:block text-[9px] font-black uppercase tracking-[0.2em] text-emerald-600/50 mb-1.5">Status</span>
                                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-emerald-100 shadow-sm">
                                                            OK
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-end">
                                                        <span className="hidden md:block text-[9px] font-black uppercase tracking-[0.2em] text-amber-600/50 mb-1.5">Status</span>
                                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-amber-100 shadow-sm italic">
                                                            ...
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-12 focus-visible:outline-none">
                            {isLoadingModules ? (
                                [...Array(2)].map((_, i) => (
                                    <div key={i} className="space-y-6">
                                        <div className="h-5 w-48 bg-slate-100 rounded animate-shimmer ml-2" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                            {[...Array(2)].map((_, j) => (
                                                <div key={j} className="h-28 w-full bg-slate-50/50 rounded-2xl md:rounded-[2rem] animate-shimmer border border-slate-100" />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : courseModules.length === 0 ? (
                                <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                                    <div className="h-20 w-20 md:h-24 md:w-24 bg-slate-50 rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center border border-slate-100 shadow-inner">
                                        <LucideFileText className="h-8 w-8 md:h-10 md:w-10 text-slate-200" />
                                    </div>
                                    <div className="max-w-xs">
                                        <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-widest">Nenhuma Aula</h3>
                                        <p className="text-slate-400 text-xs md:text-sm mt-2 font-medium">Crie módulos e aulas primeiro para ver o progresso.</p>
                                    </div>
                                </div>
                            ) : (
                                courseModules.map((mod) => (
                                    <div key={mod.id} className="space-y-6">
                                        <div className="flex items-center gap-3 ml-2">
                                            <div className="h-2 w-2 rounded-full bg-primary" />
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{mod.title}</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                            {mod.lessons.map((lesson: any) => (
                                                <button
                                                    key={lesson.id}
                                                    onClick={() => fetchLessonStudents(lesson)}
                                                    className="w-full flex items-center justify-between p-5 md:p-8 rounded-2xl md:rounded-[2rem] bg-slate-50 border border-slate-100/50 hover:bg-white hover:border-slate-200 hover:shadow-2xl hover:shadow-slate-200/40 transition-all group text-left"
                                                >
                                                    <div className="flex items-center gap-4 md:gap-5 min-w-0">
                                                        <div className="h-10 w-10 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:border-primary/30 transition-all shrink-0 shadow-sm">
                                                            <LucideFileText className="h-5 w-5 md:h-7 md:w-7" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm md:text-lg font-black text-slate-800 leading-tight group-hover:text-primary transition-colors truncate uppercase tracking-tight">{lesson.title}</p>
                                                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-slate-400/80 truncate block mt-1.5 md:mt-2">{lesson.contentType === 'QUIZ' ? 'MINI TESTE' : lesson.contentType}</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-primary group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all shrink-0 ml-3">
                                                        <LucidePlus className="h-4 w-4 md:h-5 md:w-5" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )
                )
                }
            </div>
        </div>
    );
}
