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
            <div className="max-w-4xl mx-auto px-4 md:px-8 lg:px-0 py-6 space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-9 w-9" variant="rounded" />
                    <div className="space-y-1.5">
                        <Skeleton className="h-3 w-32" variant="rectangle" />
                        <Skeleton className="h-5 w-48" variant="rounded" />
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 h-96 shadow-2xs">
                    <Skeleton className="h-full w-full" variant="rounded" />
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-24 px-4 md:px-8 lg:px-0">
            {/* Header / Breadcrumbs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="h-9 w-9 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs flex items-center justify-center shrink-0"
                        title={selectedStudent || selectedLesson ? "Voltar à lista" : "Voltar ao painel"}
                    >
                        <LucideChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                            <span>Instrutor</span>
                            <span>/</span>
                            <span className="text-amber-600 font-medium">Progresso</span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight truncate leading-snug">
                            {selectedStudent ? 'Progresso do Aluno' : selectedLesson ? 'Progresso da Aula' : 'Gestão de Alunos'}
                        </h1>
                        <p className="text-xs text-slate-500 truncate font-normal mt-0.5">
                            {selectedStudent ? selectedStudent.name : selectedLesson ? selectedLesson.title : courseTitle}
                        </p>
                    </div>
                </div>

                {!selectedStudent && !selectedLesson && (
                    <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1 self-start sm:self-auto w-fit">
                        <button
                            onClick={() => setViewMode('byStudent')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                viewMode === 'byStudent'
                                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Alunos
                        </button>
                        <button
                            onClick={() => setViewMode('byLesson')}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                viewMode === 'byLesson'
                                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Aulas
                        </button>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 md:p-6 shadow-2xs min-h-[60vh] flex flex-col">
                {viewMode === 'byStudent' ? (
                    selectedStudent ? (
                        <div className="space-y-6">
                            {isLoadingProgress ? (
                                [...Array(3)].map((_, i) => (
                                    <div key={i} className="space-y-3">
                                        <Skeleton className="h-4 w-40" variant="rectangle" />
                                        <div className="grid gap-2.5">
                                            {[...Array(2)].map((_, j) => (
                                                <Skeleton key={j} className="h-16 w-full" variant="rounded" />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                studentProgress.map((mod) => (
                                    <div key={mod.id} className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{mod.title}</h4>
                                        </div>
                                        <div className="grid gap-2.5">
                                            {mod.lessons.map((lesson: any) => (
                                                <div key={lesson.id} className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 shadow-2xs transition-all group/lesson">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                                                            lesson.isCompleted 
                                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/80' 
                                                                : 'bg-slate-100 text-slate-400 border border-slate-200'
                                                        }`}>
                                                            {lesson.isCompleted ? <LucideCheck className="h-4 w-4" /> : <LucideClock className="h-4 w-4" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-slate-900 group-hover/lesson:text-amber-600 transition-colors truncate">{lesson.title}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                                                    {lesson.contentType === 'QUIZ' || (lesson.hasQuiz && !lesson.youtubeId) ? 'Mini Teste' : (lesson.contentType || 'Vídeo')}
                                                                </span>
                                                                {lesson.hasQuiz && lesson.contentType !== 'QUIZ' && lesson.youtubeId && (
                                                                    <span className="text-xs text-amber-600 font-medium">
                                                                        + Mini Teste
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 ml-3">
                                                        {lesson.isCompleted ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                                                                    Concluído
                                                                </span>
                                                                {lesson.completedAt && (
                                                                    <span className="text-[11px] text-slate-400 mt-0.5">
                                                                        {new Date(lesson.completedAt).toLocaleDateString('pt-BR')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                                                Pendente
                                                            </span>
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
                                <div className="grid gap-2.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Skeleton key={i} className="h-16 w-full" variant="rounded" />
                                    ))}
                                </div>
                            ) : courseStudents.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-3">
                                    <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200/80 text-slate-300">
                                        <LucideUsers className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900">Nenhum Aluno</h3>
                                        <p className="text-slate-400 text-xs mt-0.5">Ainda não há alunos matriculados neste curso ou área.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-2.5">
                                    {courseStudents.map((student) => (
                                        <button
                                            key={student.id}
                                            onClick={() => fetchStudentProgress(student)}
                                            className="w-full flex items-center justify-between p-3.5 md:p-4 rounded-xl bg-white hover:bg-slate-50/60 border border-slate-200/80 hover:border-slate-300 transition-all shadow-2xs group text-left"
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                    {student.avatarUrl ? (
                                                        <img src={student.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs font-semibold text-slate-700 uppercase">{student.name?.substring(0, 2)}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-semibold text-slate-900 group-hover:text-amber-600 transition-colors truncate leading-snug">{student.name}</span>
                                                    <span className="text-xs text-slate-400 mt-0.5 truncate">{student.email}</span>
                                                </div>
                                            </div>
                                            <div className="hidden sm:flex items-center gap-2 shrink-0 ml-4">
                                                <span className="text-xs text-slate-400 font-medium">Matrícula:</span>
                                                <span className="text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
                                                    {new Date(student.enrolledAt).toLocaleDateString('pt-BR')}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    selectedLesson ? (
                        <div className="space-y-6 flex-1 flex flex-col">
                            {isLoadingLessonStudents ? (
                                <div className="grid gap-2.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Skeleton key={i} className="h-16 w-full" variant="rounded" />
                                    ))}
                                </div>
                            ) : lessonStudents.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-3">
                                    <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200/80 text-slate-300">
                                        <LucideUsers className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900">Ninguém assistiu</h3>
                                        <p className="text-slate-400 text-xs mt-0.5">Nenhum aluno assistiu a esta aula até o momento.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid gap-2.5">
                                    {lessonStudents.map((student) => (
                                        <div
                                            key={student.id}
                                            className="flex items-center justify-between p-3.5 md:p-4 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all shadow-2xs group"
                                        >
                                            <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                                <div className="h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                                    {student.avatarUrl ? (
                                                        <img src={student.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-xs font-semibold text-slate-700 uppercase">{student.name?.substring(0, 2)}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-semibold text-slate-900 leading-snug truncate group-hover:text-amber-600 transition-colors">{student.name}</span>
                                                    <span className="text-xs text-slate-400 mt-0.5 truncate">{student.email}</span>
                                                </div>
                                            </div>
                                            <div className="shrink-0 ml-3">
                                                {student.status === 'COMPLETED' ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                                                            Assistida
                                                        </span>
                                                        {student.completedAt && (
                                                            <span className="text-[11px] text-slate-400 mt-0.5">
                                                                {new Date(student.completedAt).toLocaleDateString('pt-BR')}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                                        Não assistida
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {/* Materials Download Section */}
                            {selectedLesson?.materials?.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Materiais de Apoio</h4>
                                    </div>
                                    <div className="grid gap-2.5">
                                        {selectedLesson.materials.map((mat: any, idx: number) => {
                                            const count = downloadCounts.find(d => d.materialUrl === mat.url)?.downloadCount ?? 0;
                                            return (
                                                <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all shadow-2xs group">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                                                            <LucideFileText className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-slate-900 leading-snug truncate">{mat.name}</p>
                                                            <p className="text-xs text-slate-400 mt-0.5">{mat.type || 'Arquivo'}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => openDownloadModal(mat.url, mat.name, selectedLesson.id)}
                                                        disabled={isLoadingCounts}
                                                        className="ml-4 shrink-0 h-8 px-3 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80 hover:bg-amber-100/80 transition-colors flex items-center gap-1.5"
                                                    >
                                                        <LucideUsers className="h-3.5 w-3.5" />
                                                        {isLoadingCounts ? (
                                                            <div className="h-3 w-8 bg-slate-200 rounded animate-shimmer" />
                                                        ) : (
                                                            <span>{count} {count === 1 ? 'Download' : 'Downloads'}</span>
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
                        <div className="space-y-6">
                            {isLoadingModules ? (
                                [...Array(2)].map((_, i) => (
                                    <div key={i} className="space-y-3">
                                        <Skeleton className="h-4 w-40" variant="rectangle" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {[...Array(2)].map((_, j) => (
                                                <Skeleton key={j} className="h-20 w-full" variant="rounded" />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : courseModules.length === 0 ? (
                                <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                                    <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200/80 text-slate-300">
                                        <LucideFileText className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900">Nenhuma Aula</h3>
                                        <p className="text-slate-400 text-xs mt-0.5">Crie módulos e aulas primeiro para ver o progresso.</p>
                                    </div>
                                </div>
                            ) : (
                                courseModules.map((mod) => (
                                    <div key={mod.id} className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{mod.title}</h4>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {mod.lessons.map((lesson: any) => (
                                                <button
                                                    key={lesson.id}
                                                    onClick={() => fetchLessonStudents(lesson)}
                                                    className="w-full flex items-center justify-between p-3.5 md:p-4 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all shadow-2xs group text-left"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-amber-600 transition-colors shrink-0">
                                                            <LucideFileText className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-slate-900 group-hover:text-amber-600 transition-colors truncate">{lesson.title}</p>
                                                            <span className="text-xs text-slate-400 mt-0.5 block">{lesson.contentType === 'QUIZ' ? 'Mini Teste' : lesson.contentType || 'Vídeo'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-7 w-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-amber-600 group-hover:border-amber-300 transition-all shrink-0 ml-2">
                                                        <LucidePlus className="h-3.5 w-3.5" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )
                )}
            </div>

            {/* Download Modal */}
            {downloadModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-900/40 backdrop-blur-[2px]">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white w-full max-w-lg rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex items-start justify-between shrink-0">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">Registro de Downloads</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{downloadModal.materialName}</p>
                            </div>
                            <button
                                onClick={() => setDownloadModal(prev => ({ ...prev, open: false }))}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <LucideX className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-2">
                            {downloadModal.loading ? (
                                <div className="flex items-center justify-center py-10">
                                    <LoadingSpinner size="md" />
                                </div>
                            ) : downloadModal.list.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                                    <div className="h-10 w-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200/80 text-slate-300">
                                        <LucideUsers className="h-5 w-5" />
                                    </div>
                                    <p className="text-slate-500 text-xs font-medium">Nenhum download registrado</p>
                                </div>
                            ) : (
                                downloadModal.list.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-200/60">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <button 
                                                onClick={() => setPreviewAvatar({ 
                                                    url: item.user.avatarUrl || '', 
                                                    name: item.user.name || '' 
                                                })}
                                                disabled={!item.user.avatarUrl}
                                                className="h-9 w-9 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 shadow-2xs"
                                                title="Expandir foto"
                                            >
                                                {item.user.avatarUrl ? (
                                                    <img src={item.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-600 font-semibold text-xs">
                                                        {item.user.name?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                            </button>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">{item.user.name}</p>
                                                <p className="text-xs text-slate-400 truncate">{item.user.email}</p>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className="text-xs text-slate-500">
                                                {new Date(item.downloadedAt).toLocaleDateString('pt-BR')} {new Date(item.downloadedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 text-center">
                            <span className="text-xs text-slate-500 font-medium">Total de {downloadModal.list.length} downloads únicos</span>
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
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
                        />
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.96, opacity: 0 }}
                            className="relative z-[20001] w-full max-w-sm aspect-square bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200"
                        >
                            {previewAvatar.url ? (
                                <img src={previewAvatar.url} alt={previewAvatar.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300 font-bold text-5xl uppercase">
                                    {previewAvatar.name.charAt(0)}
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-slate-950/80 to-transparent p-4">
                                <p className="text-sm font-semibold text-white">{previewAvatar.name}</p>
                            </div>
                            <button
                                onClick={() => setPreviewAvatar(null)}
                                className="absolute top-3 right-3 h-8 w-8 bg-black/40 hover:bg-black/60 text-white rounded-lg flex items-center justify-center backdrop-blur-xs transition-colors"
                            >
                                <LucideX className="h-4 w-4" />
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
