import { motion, AnimatePresence } from "framer-motion";
import { LucideChevronLeft, LucideUsers, LucideFileText, LucideCheck, LucideClock, LucidePlus, LucideDownload, LucideX, LucideMaximize2, LucideXCircle } from "lucide-react";
import toast from "react-hot-toast";
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../utils/api";
import LoadingSpinner from "../components/LoadingSpinner";
import Skeleton from "../components/Skeleton";

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
    const [downloadCounts, setDownloadCounts] = useState<any[]>([]);
    const [isLoadingCounts, setIsLoadingCounts] = useState(false);
    const [downloadModal, setDownloadModal] = useState<{ open: boolean; materialUrl: string; materialName: string; list: any[]; loading: boolean }>({
        open: false, materialUrl: '', materialName: '', list: [], loading: false
    });
    const [previewAvatar, setPreviewAvatar] = useState<{ url: string; name: string } | null>(null);

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
        setDownloadCounts([]);
        try {
            const { data } = await api.get(`/courses/${courseId}/lessons/${lesson.id}/students`);
            setLessonStudents(data);
        } catch (error) {
            console.error("Error fetching lesson students:", error);
            toast.error("Erro ao carregar lista de alunos da aula.");
        } finally {
            setIsLoadingLessonStudents(false);
        }
        // Load download counts in parallel (don't block)
        if (lesson.materials?.length > 0) {
            setIsLoadingCounts(true);
            api.get(`/material-downloads/counts?lessonId=${lesson.id}`)
                .then(({ data }) => setDownloadCounts(data))
                .catch(() => {})
                .finally(() => setIsLoadingCounts(false));
        }
    };

    const openDownloadModal = async (materialUrl: string, materialName: string, lessonId: string) => {
        setDownloadModal({ open: true, materialUrl, materialName, list: [], loading: true });
        try {
            const { data } = await api.get(`/material-downloads?lessonId=${lessonId}&materialUrl=${encodeURIComponent(materialUrl)}`);
            setDownloadModal(prev => ({ ...prev, list: data, loading: false }));
        } catch {
            setDownloadModal(prev => ({ ...prev, loading: false }));
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
            <div className="max-w-4xl mx-auto px-4 md:px-8 lg:px-0 py-8 space-y-8">
                <div className="flex items-center gap-6">
                    <Skeleton className="h-12 w-12" variant="circle" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" variant="rectangle" />
                        <Skeleton className="h-8 w-64" variant="rounded" />
                    </div>
                </div>
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-12 h-96">
                    <Skeleton className="h-full w-full" variant="rounded" />
                </div>
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
            <div className="bg-white rounded-[1.25rem] md:rounded-[2.5rem] border border-slate-200 p-2 md:p-12 shadow-sm min-h-[60vh] flex flex-col overflow-hidden">
                {viewMode === 'byStudent' ? (
                    selectedStudent ? (
                        <div className="space-y-10 md:space-y-12">
                            {isLoadingProgress ? (
                                [...Array(3)].map((_, i) => (
                                    <div key={i} className="space-y-6">
                                        <div className="flex items-center gap-3 ml-2">
                                            <Skeleton className="h-4 w-48" variant="rectangle" />
                                        </div>
                                        <div className="grid gap-4">
                                            {[...Array(2)].map((_, j) => (
                                                <Skeleton key={j} className="h-24 w-full" variant="rounded" />
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
                                        <div className="grid gap-3 md:gap-4">
                                            {mod.lessons.map((lesson: any) => (
                                                <div key={lesson.id} className="flex items-center justify-between p-4 md:p-5 rounded-2xl md:rounded-3xl bg-slate-50 border border-slate-100/50 group/lesson transition-all hover:bg-white hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/40">
                                                    <div className="flex items-center gap-4 md:gap-5 min-w-0">
                                                        <div className={`h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 transition-all ${lesson.isCompleted ? 'bg-emerald-50 text-emerald-500 border border-emerald-100 shadow-sm shadow-emerald-200/20' : 'bg-white text-amber-500 border border-slate-200 shadow-sm'}`}>
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
                                                                {lesson.completedAt && (
                                                                    <div className="flex items-center gap-1 mt-1.5 opacity-70">
                                                                        <LucideClock className="h-2.5 w-2.5 text-slate-400" />
                                                                        <span className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-500 italic">
                                                                            {new Date(lesson.completedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {new Date(lesson.completedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                )}
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
                                        <Skeleton key={i} className="h-24 md:h-28 w-full" variant="rounded" />
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
                                            className="w-full flex items-center justify-between p-4 md:p-5 rounded-2xl md:rounded-3xl bg-slate-50/50 hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group text-left"
                                        >
                                            <div className="flex items-center gap-4 md:gap-6 min-w-0">
                                                <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl md:rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:scale-110 transition-transform">
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
                                        <Skeleton key={i} className="h-24 w-full" variant="rounded" />
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
                                <div className="grid gap-2.5 md:gap-4">
                                    {lessonStudents.map((student) => (
                                        <div
                                            key={student.id}
                                            className="flex items-center justify-between p-3 md:p-6 rounded-xl md:rounded-3xl bg-slate-50/50 border border-slate-100/50 hover:bg-white hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/40 transition-all group"
                                        >
                                            <div className="flex items-center gap-3 md:gap-6 flex-1 min-w-0">
                                                <div className="h-10 w-10 md:h-16 md:w-16 rounded-lg md:rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-transform group-hover:scale-105">
                                                    {student.avatarUrl ? (
                                                        <img src={student.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-base md:text-xl font-black text-primary uppercase">{student.name?.substring(0, 2)}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-base md:text-lg font-black text-slate-900 leading-none truncate uppercase tracking-tight group-hover:text-primary transition-colors">{student.name}</span>
                                                    <span className="text-[10px] md:text-xs font-bold text-slate-400 mt-1 md:mt-2 truncate">{student.email}</span>
                                                </div>
                                            </div>
                                            <div className="shrink-0 ml-3">
                                                {student.status === 'COMPLETED' ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="hidden md:block text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/50 mb-2">Status</span>
                                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border border-emerald-100 shadow-sm">
                                                            OK
                                                        </span>
                                                        {student.completedAt && (
                                                            <div className="flex items-center gap-1 mt-2 opacity-70">
                                                                <LucideClock className="h-2.5 w-2.5 text-slate-400" />
                                                                <span className="text-[8px] font-black uppercase tracking-[0.1em] text-slate-500 italic">
                                                                    {new Date(student.completedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {new Date(student.completedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-end">
                                                        <span className="hidden md:block text-[10px] font-black uppercase tracking-[0.2em] text-amber-600/50 mb-2">Status</span>
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
                            
                            {/* Materials Download Section */}
                            {selectedLesson?.materials?.length > 0 && (
                                <div className="mt-8 pt-8 border-t border-slate-100">
                                    <div className="flex items-center gap-3 mb-6 ml-2">
                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Materiais de Apoio</h4>
                                    </div>
                                    <div className="grid gap-3">
                                        {selectedLesson.materials.map((mat: any, idx: number) => {
                                            const count = downloadCounts.find(d => d.materialUrl === mat.url)?.downloadCount ?? 0;
                                            return (
                                                <div key={idx} className="flex items-center justify-between p-4 md:p-5 rounded-2xl bg-slate-50 border border-slate-100/50 hover:bg-white hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/40 transition-all group">
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0 shadow-sm transition-transform group-hover:scale-105">
                                                            <LucideFileText className="h-5 w-5 md:h-6 md:w-6" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm md:text-base font-bold text-slate-800 leading-tight truncate uppercase tracking-tight">{mat.name}</p>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1.5">{mat.type || 'Arquivo'}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => openDownloadModal(mat.url, mat.name, selectedLesson.id)}
                                                        disabled={isLoadingCounts}
                                                        className={`ml-4 shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-[11px] font-black uppercase tracking-widest border shadow-sm ${isLoadingCounts ? 'bg-slate-100/50 text-slate-300 border-slate-100 animate-pulse cursor-wait' : 'bg-primary/5 hover:bg-primary text-primary hover:text-white border-primary/10 shadow-primary/5'}`}
                                                    >
                                                        <LucideUsers className="h-3.5 w-3.5" />
                                                        {isLoadingCounts ? (
                                                            <div className="h-3 w-8 bg-slate-200 rounded animate-shimmer" />
                                                        ) : (
                                                            <>
                                                                {count} {count === 1 ? 'Download' : 'Downloads'}
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-12 focus-visible:outline-none">
                            {isLoadingModules ? (
                                [...Array(2)].map((_, i) => (
                                    <div key={i} className="space-y-6">
                                        <Skeleton className="h-5 w-48 ml-2" variant="rectangle" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                            {[...Array(2)].map((_, j) => (
                                                <Skeleton key={j} className="h-28 w-full" variant="rounded" />
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

            {/* Download Modal */}
            {downloadModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/40 backdrop-blur-[2px]">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white w-full max-w-lg rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Modal Header */}
                        <div className="pt-8 px-8 md:px-10 pb-6 border-b border-slate-50 shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-primary/5 text-primary rounded-2xl flex items-center justify-center">
                                        <LucideDownload className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Registro de Downloads</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{downloadModal.materialName}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setDownloadModal(prev => ({ ...prev, open: false }))}
                                    className="h-10 w-10 rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center"
                                >
                                    <LucideX className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-3">
                            {downloadModal.loading ? (
                                <div className="flex items-center justify-center py-10">
                                    <LoadingSpinner />
                                </div>
                            ) : downloadModal.list.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                                    <div className="h-16 w-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center border border-slate-100">
                                        <LucideUsers className="h-6 w-6 text-slate-200" />
                                    </div>
                                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Nenhum download registrado</p>
                                </div>
                            ) : (
                                downloadModal.list.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100 group">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <button 
                                                onClick={() => setPreviewAvatar({ 
                                                    url: item.user.avatarUrl || '', 
                                                    name: item.user.name || '' 
                                                })}
                                                disabled={!item.user.avatarUrl}
                                                className="h-11 w-11 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-sm transition-all hover:scale-110 active:scale-95 group/student-avatar relative"
                                                title="Clique para expandir"
                                            >
                                                {item.user.avatarUrl ? (
                                                    <img src={item.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 font-black text-xs">
                                                        {item.user.name?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                            </button>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-slate-800 uppercase tracking-tight truncate group-hover:text-primary transition-colors">{item.user.name}</p>
                                                <p className="text-[10px] font-medium text-slate-400 truncate">{item.user.email}</p>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Data</span>
                                            <span className="text-[10px] font-black text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">
                                                {new Date(item.downloadedAt).toLocaleDateString('pt-BR')} {new Date(item.downloadedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-slate-50 shrink-0 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Total de {downloadModal.list.length} downloads únicos</span>
                        </div>
                    </motion.div>
                </div>
            )}
            {/* Lightbox for Avatars */}
            <AnimatePresence>
                {previewAvatar && (
                    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPreviewAvatar(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative z-[20001] w-full max-w-lg aspect-square bg-white rounded-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white animate-in zoom-in duration-300"
                        >
                            {previewAvatar.url ? (
                                <img src={previewAvatar.url} alt={previewAvatar.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300 font-black text-6xl uppercase">
                                    {previewAvatar.name.charAt(0)}
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-8 md:p-10">
                                <p className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter shadow-sm">{previewAvatar.name}</p>
                            </div>
                            <button
                                onClick={() => setPreviewAvatar(null)}
                                className="absolute top-6 right-6 h-10 w-10 md:h-12 md:w-12 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110 active:scale-95"
                            >
                                <LucideXCircle className="h-5 w-5 md:h-6 md:w-6" />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
