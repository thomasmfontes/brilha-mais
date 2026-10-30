import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { 
    LucideFileText, LucideCheckCircle, LucideChevronRight, 
    LucideSearch, LucideFilter, LucideMessageSquare, LucideStar,
    LucideDownload, LucideX, LucideZap, LucideCalendar, LucideUser, 
    LucideChevronDown, LucideRefreshCw, LucideCheck, LucideChevronLeft
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import { ConfirmModal } from "../components/ConfirmModal";
import Skeleton from "../components/Skeleton";
import api from "../utils/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

interface Submission {
    id: string;
    content: string;
    fileUrl?: string;
    fileName?: string;
    status: 'PENDING' | 'REVIEWED' | 'REDO_REQUIRED';
    grade?: number;
    feedback?: string;
    feedbackFileUrl?: string;
    feedbackFileName?: string;
    createdAt: string;
    user: {
        name: string;
        email: string;
        avatarUrl?: string;
    };
    lesson: {
        id: string;
        title: string;
        content?: string;
        order: number;
        module: {
            title: string;
            order: number;
            course: {
                id: string;
                title: string;
            };
        };
    };
}

export default function InstructorSubmissions() {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'REVIEWED'>('PENDING');
    const [selectedCourseId, setSelectedCourseId] = useState<string>('ALL');
    const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
    
    // Pagination States
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ total: 0, page: 1, lastPage: 1 });
    const [courses, setCourses] = useState<{id: string, title: string}[]>([]);

    // Review Modal States
    const [grade, setGrade] = useState<number>(100);
    const [feedback, setFeedback] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [feedbackFile, setFeedbackFile] = useState<{ url: string; name: string } | null>(null);
    const [isUploadingFeedback, setIsUploadingFeedback] = useState(false);
    const [uploadFeedbackProgress, setUploadFeedbackProgress] = useState(0);
    const [showEnunciado, setShowEnunciado] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showRedoConfirm, setShowRedoConfirm] = useState(false);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [filter, selectedCourseId]);

    useEffect(() => {
        fetchSubmissions();
    }, [filter, selectedCourseId, debouncedSearch, page]);

    const fetchCourses = async () => {
        try {
            const response = await api.get("/courses/instructor");
            setCourses(response.data);
        } catch (error) {
            console.error("Erro ao buscar cursos:", error);
        }
    };

    useEffect(() => {
        if (selectedSubmission) {
            setGrade(selectedSubmission.grade ?? 100);
            setFeedback(selectedSubmission.feedback ?? "");
            if (selectedSubmission.feedbackFileUrl) {
                setFeedbackFile({
                    url: selectedSubmission.feedbackFileUrl,
                    name: selectedSubmission.feedbackFileName ?? "Arquivo de feedback"
                });
            } else {
                setFeedbackFile(null);
            }
        }
    }, [selectedSubmission]);

    const fetchSubmissions = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter !== 'ALL') params.append('status', filter);
            if (selectedCourseId !== 'ALL') params.append('courseId', selectedCourseId);
            if (debouncedSearch) params.append('search', debouncedSearch);
            params.append('page', page.toString());
            params.append('limit', '10');

            const response = await api.get(`/essay-submissions/pending?${params.toString()}`);
            setSubmissions(response.data.data);
            setMeta(response.data.meta);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar submissões");
        } finally {
            setIsLoading(false);
        }
    };

    const sanitizeFilename = (name: string) => {
        return name.replace(/[<>:"/\\|?*]/g, '').trim();
    };

    const handleDownloadFile = async (sub: Submission) => {
        if (!sub.fileUrl) return;
        
        setIsDownloading(sub.id);
        try {
            const response = await api.get(`/essay-submissions/${sub.id}/download`, {
                responseType: 'blob'
            });
            
            const blob = new Blob([response.data], { type: response.headers['content-type'] as string });
            const originalExt = sub.fileName?.split('.').pop() || sub.fileUrl?.split('.').pop()?.split('?')[0] || 'file';
            
            const studentName = sanitizeFilename(sub.user.name);
            const moduleNum = sub.lesson.module.order + 1;
            const lessonNum = sub.lesson.order + 1;
            const courseTitle = sanitizeFilename(sub.lesson.module.course.title);

            const newFileName = `${studentName} - M${moduleNum} - A${lessonNum} - ${courseTitle}.${originalExt}`;
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', newFileName);
            document.body.appendChild(link);
            link.click();
            
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao baixar arquivo.");
        } finally {
            setIsDownloading(null);
        }
    };

    const handleFeedbackFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingFeedback(true);
        setUploadFeedbackProgress(0);

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `feedback-${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `submissions/${fileName}`;
            const uploadUrl = `${supabaseUrl}/storage/v1/object/course-images/${filePath}`;

            const formData = new FormData();
            formData.append('file', file);

            const axios = (await import('axios')).default;
            await axios.post(uploadUrl, formData, {
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey,
                    'x-upsert': 'true'
                },
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || progressEvent.loaded));
                    setUploadFeedbackProgress(percent);
                }
            });

            const publicUrl = `${supabaseUrl}/storage/v1/object/public/course-images/${filePath}`;
            setFeedbackFile({ url: publicUrl, name: file.name });
            toast.success("Arquivo anexado com sucesso!");
        } catch (err) {
            console.error(err);
            toast.error("Erro ao enviar arquivo.");
        } finally {
            setIsUploadingFeedback(false);
        }
    };

    const handleReview = async () => {
        if (!selectedSubmission) return;
        setIsSaving(true);
        try {
            await api.patch(`/essay-submissions/${selectedSubmission.id}/review`, {
                grade,
                feedback,
                feedbackFileUrl: feedbackFile?.url,
                feedbackFileName: feedbackFile?.name
            });
            toast.success("Correção enviada com sucesso!");
            setSelectedSubmission(null);
            fetchSubmissions();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao enviar correção");
        } finally {
            setIsSaving(false);
        }
    };

    const handleClearSubmission = async () => {
        if (!selectedSubmission) return;
        setShowRedoConfirm(true);
    };

    const confirmRedo = async () => {
        if (!selectedSubmission) return;

        setIsDeleting(true);
        try {
            await api.patch(`/essay-submissions/${selectedSubmission.id}/redo`, {
                feedback,
                feedbackFileUrl: feedbackFile?.url,
                feedbackFileName: feedbackFile?.name
            });
            toast.success("Solicitação de refação enviada!");
            setSelectedSubmission(null);
            setShowRedoConfirm(false);
            fetchSubmissions();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao solicitar refação");
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredSubmissions = submissions;

    return (
        <div className="space-y-8 w-full pb-10">
            {/* Header Area - Clean V2 */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                        Correções de Desafios
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Avalie o desempenho dos seus alunos e envie feedbacks personalizados.
                    </p>
                </div>

                {/* Segmented Filter Control */}
                <div className="inline-flex p-1 bg-slate-100 rounded-xl self-start sm:self-auto border border-slate-200/60">
                    <button 
                        onClick={() => setFilter('PENDING')} 
                        className={`px-3.5 py-1.5 rounded-lg text-xs transition-all ${
                            filter === 'PENDING' 
                                ? 'bg-white text-slate-900 font-semibold shadow-xs' 
                                : 'text-slate-600 hover:text-slate-900 font-medium'
                        }`}
                    >
                        Pendentes
                    </button>
                    <button 
                        onClick={() => setFilter('REVIEWED')} 
                        className={`px-3.5 py-1.5 rounded-lg text-xs transition-all ${
                            filter === 'REVIEWED' 
                                ? 'bg-white text-slate-900 font-semibold shadow-xs' 
                                : 'text-slate-600 hover:text-slate-900 font-medium'
                        }`}
                    >
                        Revisados
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 relative">
                    <LucideSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar por aluno ou aula..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-10 bg-white border border-slate-200/80 rounded-xl pl-10 pr-4 text-sm font-normal text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors outline-none"
                    />
                </div>
                <div className="relative">
                    <button 
                        onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                        className={`w-full h-10 bg-white border ${
                            isCourseDropdownOpen ? 'border-amber-500 ring-1 ring-amber-500' : 'border-slate-200/80 hover:border-slate-300'
                        } rounded-xl px-3.5 text-left transition-colors flex items-center justify-between outline-none`}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <LucideFilter className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="text-xs font-medium text-slate-700 truncate">
                                {selectedCourseId === 'ALL' ? 'Todos os Cursos' : courses.find(c => c.id === selectedCourseId)?.title}
                            </span>
                        </div>
                        <LucideChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${isCourseDropdownOpen ? 'rotate-180 text-slate-700' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {isCourseDropdownOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setIsCourseDropdownOpen(false)}
                                />
                                <motion.div 
                                    initial={{ opacity: 0, y: 4, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                                    transition={{ duration: 0.12 }}
                                    className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-xl shadow-lg z-50 p-1 flex flex-col gap-0.5 overflow-hidden"
                                >
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col">
                                        <button
                                            onClick={() => {
                                                setSelectedCourseId('ALL');
                                                setIsCourseDropdownOpen(false);
                                            }}
                                            className={`w-full px-3 py-2 rounded-lg text-left text-xs font-medium transition-colors flex items-center justify-between ${
                                                selectedCourseId === 'ALL' ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            }`}
                                        >
                                            <span>Todos os Cursos</span>
                                            {selectedCourseId === 'ALL' && <LucideCheck className="h-3.5 w-3.5 text-amber-600" />}
                                        </button>
                                        {courses.map(course => (
                                            <button
                                                key={course.id}
                                                onClick={() => {
                                                    setSelectedCourseId(course.id);
                                                    setIsCourseDropdownOpen(false);
                                                }}
                                                className={`w-full px-3 py-2 rounded-lg text-left text-xs font-medium transition-colors flex items-center justify-between ${
                                                    selectedCourseId === course.id ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                }`}
                                            >
                                                <span className="truncate pr-2">{course.title}</span>
                                                {selectedCourseId === course.id && <LucideCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Submissions List */}
            {isLoading ? (
                <div className="space-y-2.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="bg-white border border-slate-200/80 rounded-xl p-4 flex items-center gap-4">
                            <Skeleton className="h-10 w-10 shrink-0" variant="circle" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/4" variant="rectangle" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-3 w-20" variant="rectangle" />
                                    <Skeleton className="h-3 w-40" variant="rectangle" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredSubmissions.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-dashed border-slate-200">
                    <div className="h-10 w-10 bg-slate-50 rounded-lg border border-slate-200/60 flex items-center justify-center mb-2.5 text-slate-400">
                        <LucideCheckCircle className="h-5 w-5 text-emerald-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800">Tudo em dia!</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Não há submissões pendentes no momento.</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {filteredSubmissions.map((sub) => (
                        <div 
                            key={sub.id}
                            onClick={() => {
                                setSelectedSubmission(sub);
                                setGrade(sub.grade ?? 100);
                                setFeedback(sub.feedback || "");
                                setFeedbackFile(null);
                                setShowEnunciado(false);
                            }}
                            className="bg-white border border-slate-200/80 rounded-xl p-3.5 md:p-4 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between gap-4"
                        >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div className="h-10 w-10 rounded-full border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden text-slate-500 font-medium text-xs">
                                    {sub.user.avatarUrl ? (
                                        <img src={sub.user.avatarUrl} alt={sub.user.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <LucideUser className="h-4 w-4 text-slate-400" />
                                    )}
                                </div>
                                <div className="space-y-1 min-w-0">
                                    <h3 className="font-semibold text-slate-900 group-hover:text-amber-600 transition-colors text-sm truncate leading-snug">
                                        {sub.user.name}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                                        <div className="flex items-center gap-1 text-slate-400 shrink-0">
                                            <LucideCalendar className="h-3.5 w-3.5" />
                                            <span>{format(new Date(sub.createdAt), "dd MMM, yyyy", { locale: ptBR })}</span>
                                        </div>
                                        <span className="text-slate-300">•</span>
                                        <div className="flex items-center gap-2 truncate">
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/50 text-[11px] font-medium shrink-0">
                                                M{sub.lesson.module.order + 1} • A{sub.lesson.order + 1}
                                            </span>
                                            <span className="truncate text-slate-500" title={`${sub.lesson.module.title} • ${sub.lesson.title}`}>
                                                {sub.lesson.module.title} • {sub.lesson.title}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                {sub.status === 'REVIEWED' && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-semibold">
                                        Nota {sub.grade}
                                    </span>
                                )}
                                <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400 group-hover:bg-amber-50 group-hover:border-amber-200 group-hover:text-amber-600 transition-colors">
                                    <LucideChevronRight className="h-4 w-4" />
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Pagination Controls - Clean V2 */}
                    {meta.lastPage > 1 && (
                        <div className="flex items-center justify-between pt-5 pb-8 border-t border-slate-200/60 text-xs text-slate-500">
                            <div>
                                Mostrando <span className="font-semibold text-slate-800">{submissions.length}</span> de <span className="font-semibold text-slate-800">{meta.total}</span> submissões
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                                <button 
                                    disabled={page === 1}
                                    onClick={() => {
                                        setPage(p => p - 1);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                >
                                    <LucideChevronLeft className="h-4 w-4" />
                                </button>
                                
                                <span className="px-2 font-medium text-slate-700">
                                    {meta.page} / {meta.lastPage}
                                </span>

                                <button 
                                    disabled={page === meta.lastPage}
                                    onClick={() => {
                                        setPage(p => p + 1);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                >
                                    <LucideChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Review Modal Area via Portal */}
            {createPortal(
                <AnimatePresence>
                    {selectedSubmission && (
                        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 md:p-6 overflow-hidden">
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }} 
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                onClick={() => setSelectedSubmission(null)} 
                                className="fixed inset-0 bg-slate-950/60 will-change-[opacity]" 
                            />
                            <motion.div 
                                initial={{ scale: 0.97, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.97, opacity: 0, y: 10 }}
                                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                                className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh] z-[100000] border border-slate-200/90 text-left"
                            >
                                {/* Modal Close Button */}
                                <button 
                                    onClick={() => setSelectedSubmission(null)} 
                                    className="absolute top-4 right-4 z-30 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                                    aria-label="Fechar"
                                >
                                    <LucideX className="h-5 w-5" />
                                </button>

                                {/* Student Content Area */}
                                <div className="flex-[1.3] p-6 lg:p-7 overflow-y-auto border-r border-slate-200/80 space-y-5 bg-white">
                                    {/* Header */}
                                    <div className="space-y-1.5 pr-2">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/50 text-[11px] font-medium">
                                                M{selectedSubmission.lesson.module.order + 1} • A{selectedSubmission.lesson.order + 1}
                                            </span>
                                            <span className="text-xs text-slate-400 font-medium truncate max-w-[220px]">
                                                {selectedSubmission.lesson.module.title}
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-bold tracking-tight text-slate-900 leading-snug">
                                            {selectedSubmission.lesson.title}
                                        </h2>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 pt-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-[10px] overflow-hidden">
                                                    {selectedSubmission.user.avatarUrl ? (
                                                        <img src={selectedSubmission.user.avatarUrl} alt={selectedSubmission.user.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <LucideUser className="h-3 w-3" />
                                                    )}
                                                </div>
                                                <span className="font-semibold text-slate-800">{selectedSubmission.user.name}</span>
                                            </div>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-slate-400">
                                                {format(new Date(selectedSubmission.createdAt), "dd MMM, yyyy 'às' HH:mm", { locale: ptBR })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Challenge Instructions Accordion */}
                                    {selectedSubmission.lesson.content && (
                                        <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/50">
                                            <button 
                                                onClick={() => setShowEnunciado(!showEnunciado)}
                                                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100/60 transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <LucideFileText className="h-4 w-4 text-slate-500" />
                                                    <span className="text-xs font-semibold text-slate-700">
                                                        Instruções do Desafio
                                                    </span>
                                                </div>
                                                <LucideChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showEnunciado ? 'rotate-180' : ''}`} />
                                            </button>
                                            <AnimatePresence>
                                                {showEnunciado && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden bg-white border-t border-slate-100"
                                                    >
                                                        <div className="p-4 text-xs text-slate-600 leading-relaxed font-normal whitespace-pre-wrap">
                                                            {selectedSubmission.lesson.content}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}

                                    {/* Student Submission Answer */}
                                    <div className="p-4 bg-slate-50/60 border border-slate-200/70 rounded-xl space-y-2">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                                            <LucideMessageSquare className="h-3.5 w-3.5 text-amber-600" />
                                            <span>Resposta do Aluno</span>
                                        </div>
                                        {selectedSubmission.content ? (
                                            <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-normal">
                                                {selectedSubmission.content}
                                            </p>
                                        ) : (
                                            <p className="text-slate-400 text-xs italic">
                                                Nenhum texto enviado.
                                            </p>
                                        )}
                                    </div>

                                    {/* Attached File */}
                                    {selectedSubmission.fileUrl && (
                                        <div className="space-y-1.5">
                                            <p className="text-xs font-semibold text-slate-500">Anexo Enviado</p>
                                            <div 
                                                onClick={() => handleDownloadFile(selectedSubmission)}
                                                className="flex items-center justify-between p-3 border border-slate-200/80 rounded-xl bg-white hover:border-slate-300 transition-colors cursor-pointer group"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-9 w-9 bg-amber-50 border border-amber-200/60 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
                                                        <LucideFileText className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium text-slate-900 truncate">
                                                            {selectedSubmission.fileName || "Baixar anexo"}
                                                        </p>
                                                        <p className="text-[11px] text-amber-600 font-medium">Clique para baixar</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="text-slate-400 group-hover:text-amber-600 transition-colors pl-2">
                                                    {isDownloading === selectedSubmission.id ? (
                                                        <LoadingSpinner size="sm" variant="primary" />
                                                    ) : (
                                                        <LucideDownload className="h-4 w-4" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Instructor Review Area */}
                                <div className="flex-1 bg-slate-50/50 p-6 lg:p-7 flex flex-col justify-between overflow-y-auto">
                                    <div className="space-y-5">
                                        {/* Grade Input */}
                                        <div className="space-y-2 pr-9">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                                    <LucideStar className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                                    Nota Final (0 a 100)
                                                </label>
                                                <span className="text-base font-bold text-amber-600 px-2.5 py-0.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                                                    {grade}
                                                </span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="0" max="100" 
                                                value={grade} 
                                                onChange={(e) => setGrade(Number(e.target.value))}
                                                className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                        </div>

                                        {/* Feedback Textarea */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                                <LucideMessageSquare className="h-3.5 w-3.5 text-slate-400" />
                                                Feedback Personalizado
                                            </label>
                                            <textarea 
                                                value={feedback}
                                                onChange={(e) => setFeedback(e.target.value)}
                                                placeholder="Oriente o aluno sobre pontos fortes e melhorias..."
                                                className="w-full bg-white border border-slate-200/80 rounded-xl p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors min-h-[120px] resize-none"
                                            />
                                        </div>

                                        {/* Feedback Material Attachment */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                                                <LucideDownload className="h-3.5 w-3.5 text-slate-400" />
                                                Material Complementar (Opcional)
                                            </label>
                                            
                                            <input type="file" id="feedback-file-upload-slim" className="hidden" onChange={handleFeedbackFileUpload} />
                                            
                                            {feedbackFile ? (
                                                <div className="flex items-center justify-between p-3 bg-white border border-emerald-200/80 rounded-xl">
                                                    <div className="flex items-center gap-2.5 truncate">
                                                        <div className="h-8 w-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                                                            <LucideFileText className="h-4 w-4" />
                                                        </div>
                                                        <p className="text-xs font-medium text-slate-800 truncate">{feedbackFile.name}</p>
                                                    </div>
                                                    <button onClick={() => setFeedbackFile(null)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                                                        <LucideX className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => document.getElementById('feedback-file-upload-slim')?.click()}
                                                    disabled={isUploadingFeedback || selectedSubmission.status === 'REVIEWED'}
                                                    className="w-full h-10 border border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-xs font-medium text-slate-600 hover:border-amber-500 hover:text-amber-600 bg-white transition-colors disabled:opacity-50"
                                                >
                                                    {isUploadingFeedback ? (
                                                        <><LoadingSpinner size="sm" variant="primary" /> <span>{uploadFeedbackProgress}%</span></>
                                                    ) : (
                                                        <><LucideDownload className="h-3.5 w-3.5" /> <span>Anexar material complementar</span></>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-2.5 pt-6 mt-auto">
                                        <button 
                                            onClick={handleReview}
                                            disabled={isSaving || isDeleting || selectedSubmission.status === 'REVIEWED'}
                                            className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-all active:scale-[0.98] shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isSaving ? <LoadingSpinner size="sm" variant="white" /> : <><LucideCheck className="h-4 w-4" /> Finalizar Avaliação</>}
                                        </button>

                                        <button 
                                            onClick={handleClearSubmission}
                                            disabled={isSaving || isDeleting}
                                            className="w-full h-10 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-xl font-medium text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isDeleting ? <LoadingSpinner size="sm" variant="primary" /> : <><LucideRefreshCw className="h-3.5 w-3.5" /> Solicitar Refação</>}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Redo Confirmation Modal */}
            <ConfirmModal 
                isOpen={showRedoConfirm}
                onClose={() => setShowRedoConfirm(false)}
                onConfirm={confirmRedo}
                isLoading={isDeleting}
                variant="warning"
                title="Solicitar Refação?"
                description="Deseja solicitar que o aluno refaça este desafio? Ele conseguirá ver seu feedback atual e enviar uma nova versão."
                confirmText="Sim, Solicitar"
            />
        </div>
    );
}