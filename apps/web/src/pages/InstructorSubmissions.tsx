import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { 
    LucideFileText, LucideCheckCircle, LucideChevronRight, 
    LucideSearch, LucideFilter, LucideMessageSquare, LucideStar,
    LucideDownload, LucideX, LucideZap, LucideCalendar, LucideUser, LucideChevronDown, LucideRefreshCw, LucideCheck
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import { PortalModal } from "../components/PortalModal";
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

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset page on search
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        setPage(1); // Reset page on filter/course change
    }, [filter, selectedCourseId]);

    useEffect(() => {
        fetchSubmissions();
    }, [filter, selectedCourseId, debouncedSearch, page]);

    const fetchCourses = async () => {
        try {
            const response = await api.get("/courses/instructor");
            setCourses(response.data);
        } catch (error) {
            console.error(error);
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

    const [isDownloading, setIsDownloading] = useState<string | null>(null);

    const sanitizeFilename = (name: string) => {
        return name.replace(/[<>:"/\\|?*]/g, '').trim();
    };

    const handleDownloadFile = async (sub: Submission) => {
        if (!sub.fileUrl) return;
        
        setIsDownloading(sub.id);
        try {
            // Call our new backend proxy endpoint which handles renaming and CORS
            const response = await api.get(`/essay-submissions/${sub.id}/download`, {
                responseType: 'blob'
            });
            
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            
            // Re-calculate the pretty name (calculating is safer and synchronous)
            const originalExt = sub.fileName?.split('.').pop() || sub.fileUrl?.split('.').pop()?.split('?')[0] || 'file';
            
            const studentName = sanitizeFilename(sub.user.name);
            const moduleNum = sub.lesson.module.order + 1;
            const lessonNum = sub.lesson.order + 1;
            const courseTitle = sanitizeFilename(sub.lesson.module.course.title);

            const newFileName = `${studentName} - M${moduleNum} - A${lessonNum} - ${courseTitle}.${originalExt}`;
            
            // Trigger download
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', newFileName);
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
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

    const filteredSubmissions = submissions; // Filters are now server-side

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 text-primary mb-1">
                        <div className="h-8 w-8 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                            <LucideFileText className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Gestão Pedagógica</span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter italic uppercase text-slate-900">Correções de Desafios</h1>
                    <p className="text-muted-foreground text-xs font-medium">Avalie o desempenho dos seus alunos e envie feedbacks personalizados.</p>
                </div>

                <div className="flex items-center w-full md:w-auto p-1.5 rounded-xl border border-border bg-slate-50/50 shadow-sm">
                    <button onClick={() => setFilter('PENDING')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'PENDING' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>Pendentes</button>
                    <button onClick={() => setFilter('REVIEWED')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'REVIEWED' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>Revisados</button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 relative">
                    <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                    <input 
                        type="text" 
                        placeholder="Buscar por aluno ou aula..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-card border border-border rounded-xl py-3 pl-11 pr-5 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none h-11"
                    />
                </div>
                <div className="relative">
                    <button 
                        onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
                        className={`w-full bg-card border ${isCourseDropdownOpen ? 'border-primary ring-4 ring-primary/5' : 'border-border'} rounded-xl py-3 pl-11 pr-10 text-left transition-all outline-none h-11 relative shadow-sm hover:border-primary/30`}
                    >
                        <LucideFilter className={`absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors ${isCourseDropdownOpen ? 'text-primary' : 'text-muted-foreground/50'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 truncate block">
                            {selectedCourseId === 'ALL' ? 'Todos os Cursos' : courses.find(c => c.id === selectedCourseId)?.title}
                        </span>
                        <LucideChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-all ${isCourseDropdownOpen ? 'text-primary rotate-180' : 'text-muted-foreground/30'}`} />
                    </button>

                    <AnimatePresence>
                        {isCourseDropdownOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 z-[40]" 
                                    onClick={() => setIsCourseDropdownOpen(false)}
                                />
                                <motion.div 
                                    initial={{ opacity: 0, y: -5, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -5, scale: 0.98 }}
                                    transition={{ duration: 0.15, ease: "easeOut" }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] z-[50] p-1.5 flex flex-col gap-1 overflow-hidden"
                                >
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                        <button
                                            onClick={() => {
                                                setSelectedCourseId('ALL');
                                                setIsCourseDropdownOpen(false);
                                            }}
                                            className={`w-full px-3 py-2.5 rounded-xl text-left text-[9px] font-black uppercase tracking-widest transition-all ${selectedCourseId === 'ALL' ? 'bg-primary/5 text-primary' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 flex items-center justify-center shrink-0">
                                                    {selectedCourseId === 'ALL' && <LucideCheck className="h-3 w-3" />}
                                                </div>
                                                Todos os Cursos
                                            </div>
                                        </button>
                                        {courses.map(course => (
                                            <button
                                                key={course.id}
                                                onClick={() => {
                                                    setSelectedCourseId(course.id);
                                                    setIsCourseDropdownOpen(false);
                                                }}
                                                className={`w-full px-3 py-2.5 rounded-xl text-left text-[9px] font-black uppercase tracking-widest transition-all ${selectedCourseId === course.id ? 'bg-primary/5 text-primary' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 flex items-center justify-center shrink-0">
                                                        {selectedCourseId === course.id && <LucideCheck className="h-3 w-3" />}
                                                    </div>
                                                    <span className="truncate">{course.title}</span>
                                                </div>
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
                <div className="grid gap-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-11 w-11 shrink-0" variant="circle" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-1/3" variant="rectangle" />
                                    <div className="flex gap-2">
                                        <Skeleton className="h-3 w-20" variant="rectangle" />
                                        <Skeleton className="h-3 w-40" variant="rectangle" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredSubmissions.length === 0 ? (
                <div className="h-56 flex flex-col items-center justify-center text-center p-6 bg-card rounded-2xl border-dashed border-border border-2">
                    <div className="h-12 w-12 bg-muted/50 rounded-full flex items-center justify-center mb-3 text-muted-foreground/30">
                        <LucideCheckCircle className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-black uppercase italic tracking-tighter">Tudo em dia!</h3>
                    <p className="text-muted-foreground text-xs mt-1">Não há submissões pendentes no momento.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {filteredSubmissions.map((sub, idx) => (
                        <motion.div 
                            key={sub.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => {
                                setSelectedSubmission(sub);
                                setGrade(sub.grade ?? 100);
                                setFeedback(sub.feedback || "");
                                setFeedbackFile(null);
                                setShowEnunciado(false);
                            }}
                            className="bg-card border border-border rounded-2xl p-4 md:p-5 hover:border-primary/30 cursor-pointer group transition-all hover:shadow-lg hover:shadow-primary/5 active:scale-[0.99] w-full min-w-0"
                        >
                            {/* --- MOBILE LAYOUT --- */}
                            <div className="flex flex-col md:hidden w-full gap-3 overflow-hidden">
                                {/* 1. User Info Row */}
                                <div className="flex items-start justify-between min-w-0 w-full">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`h-10 w-10 mt-0.5 rounded-full flex flex-col items-center justify-center shrink-0 border transition-all overflow-hidden ${sub.status === 'PENDING' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                                            {sub.user.avatarUrl ? (
                                                <img src={sub.user.avatarUrl} alt={sub.user.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <LucideUser className="h-4 w-4" />
                                            )}
                                        </div>
                                        <div className="space-y-0.5 min-w-0 flex-1">
                                            <h3 className="font-black italic uppercase tracking-tighter text-slate-800 truncate text-sm leading-tight pr-1">
                                                {sub.user.name}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
                                                <LucideCalendar className="h-3 w-3 text-slate-400" />
                                                <span className="text-[9px] font-bold uppercase tracking-widest">{format(new Date(sub.createdAt), "dd MMM, yyyy", { locale: ptBR })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Mobile Grade Badge (Top Right) */}
                                    <div className="shrink-0 ml-3">
                                        {sub.status === 'REVIEWED' && (
                                            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-2 py-1 rounded-md text-[10px] font-black italic tracking-tighter">
                                                NOTA {sub.grade}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 2. Lesson Box Context */}
                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex flex-col gap-2 text-muted-foreground w-full overflow-hidden min-w-0">
                                    <div className="flex items-center gap-2 min-w-0 w-full overflow-hidden">
                                        <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm text-[8px] font-black shrink-0">
                                            M{sub.lesson.module.order + 1} • A{sub.lesson.order + 1}
                                        </span>
                                        <span className="text-[9px] font-bold uppercase tracking-widest truncate min-w-0 flex-1 leading-normal" title={`${sub.lesson.module.title} • ${sub.lesson.title}`}>
                                            {sub.lesson.module.title} • {sub.lesson.title}
                                        </span>
                                    </div>
                                </div>

                                {/* 3. Action Section */}
                                <div className="flex items-center justify-between w-full pt-3 border-t border-slate-100 shrink-0">
                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${sub.status === 'REVIEWED' ? 'text-emerald-500/70' : 'text-slate-400'}`}>
                                        {sub.status === 'REVIEWED' ? 'Avaliação Concluída' : 'Ver Resposta'}
                                    </span>
                                    <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                                        <LucideChevronRight className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>

                            {/* --- DESKTOP LAYOUT --- */}
                            <div className="hidden md:flex items-center justify-between gap-5 w-full">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border transition-all overflow-hidden ${sub.status === 'PENDING' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                                        {sub.user.avatarUrl ? (
                                            <img src={sub.user.avatarUrl} alt={sub.user.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <LucideUser className="h-5 w-5" />
                                        )}
                                    </div>
                                    <div className="space-y-0.5 min-w-0">
                                        <h3 className="font-black italic uppercase tracking-tighter text-slate-800 truncate text-base leading-tight pr-1">{sub.user.name}</h3>
                                        <div className="flex items-center gap-2.5 text-muted-foreground">
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <LucideCalendar className="h-3 w-3" />
                                                <span className="text-[9px] font-bold uppercase tracking-widest">{format(new Date(sub.createdAt), "dd MMM, yyyy", { locale: ptBR })}</span>
                                            </div>
                                            <span className="text-border opacity-50">|</span>
                                            <div className="flex items-center gap-2 truncate">
                                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[9px] font-black shrink-0">
                                                    M{sub.lesson.module.order + 1} • A{sub.lesson.order + 1}
                                                </span>
                                                <span className="text-[9px] font-bold uppercase tracking-widest truncate">
                                                    {sub.lesson.module.title} • {sub.lesson.title}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    {sub.status === 'REVIEWED' && (
                                        <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-black italic tracking-tighter">
                                            {sub.grade}
                                        </div>
                                    )}
                                    <div className="h-8 w-8 bg-muted/50 rounded-lg flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
                                        <LucideChevronRight className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                   {/* Pagination Controls - Premium & Responsive Redesign */}
            {meta.lastPage > 1 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-5 md:gap-6 pt-8 pb-28 md:pb-8 border-t border-slate-100/50">
                    <div className="flex items-center justify-center md:justify-start gap-2 w-full md:w-auto">
                        <div className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-50 border border-slate-100 rounded-full shadow-sm shrink-0">
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                                Resultados: <span className="text-slate-900">{meta.total}</span>
                            </p>
                        </div>
                        <div className="px-3 md:px-4 py-1.5 md:py-2 bg-slate-50 border border-slate-100 rounded-full shadow-sm shrink-0">
                            <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                                Página: <span className="text-slate-900">{meta.page} <span className="mx-0.5 text-slate-300">/</span> {meta.lastPage}</span>
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 md:gap-3 w-full md:w-auto">
                        <button 
                            disabled={page === 1}
                            onClick={() => {
                                setPage(p => p - 1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="h-10 w-10 md:h-11 md:w-11 flex items-center justify-center bg-white border border-slate-200 rounded-xl md:rounded-2xl text-slate-400 hover:border-primary hover:text-primary transition-all disabled:opacity-20 disabled:grayscale shadow-sm active:scale-90 group shrink-0"
                        >
                            <LucideChevronRight className="h-4 w-4 md:h-5 md:w-5 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        
                        <div className="flex items-center gap-1 bg-slate-50 p-1 md:p-1.5 rounded-2xl border border-slate-100 shadow-inner">
                            {[...Array(meta.lastPage)].map((_, i) => {
                                const p = i + 1;
                                const isNeighbor = Math.abs(p - page) <= 1;
                                const isEdge = p === 1 || p === meta.lastPage;

                                if (isEdge || isNeighbor) {
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => {
                                                setPage(p);
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className={`h-8 md:h-9 min-w-[2rem] md:min-w-[2.25rem] px-1.5 md:px-2 rounded-xl text-[9px] md:text-[10px] font-black transition-all ${p === page ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'bg-transparent text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {p}
                                        </button>
                                    );
                                } else if (p === page - 2 || p === page + 2) {
                                    return <span key={p} className="px-0.5 text-slate-300 font-black">.</span>;
                                }
                                return null;
                            })}
                        </div>

                        <button 
                            disabled={page === meta.lastPage}
                            onClick={() => {
                                setPage(p => p + 1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="h-10 w-10 md:h-11 md:w-11 flex items-center justify-center bg-white border border-slate-200 rounded-xl md:rounded-2xl text-slate-400 hover:border-primary hover:text-primary transition-all disabled:opacity-20 disabled:grayscale shadow-sm active:scale-90 group shrink-0"
                        >
                            <LucideChevronRight className="h-4 w-4 md:h-5 md:w-5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </div>
            )}            </div>
            )}

            {/* Review Modal Area via Portal */}
            {createPortal(
                <AnimatePresence>
                    {selectedSubmission && (
                        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }} 
                                onClick={() => setSelectedSubmission(null)} 
                                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
                            />
                            <motion.div 
                                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                                transition={{ type: "spring", damping: 25, stiffness: 250 }}
                                className="relative w-full max-w-4xl bg-background rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh] z-[1000] border border-border"
                            >
                                {/* Student Content Area */}
                                <div className="flex-[1.4] p-7 lg:p-9 overflow-y-auto border-r border-border custom-scrollbar space-y-7 bg-white">
                                    {/* Redesigned Slim Header */}
                                    <div className="flex items-start justify-between gap-5">
                                        <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase">
                                                        M{selectedSubmission.lesson.module.order + 1} • A{selectedSubmission.lesson.order + 1}
                                                    </span>
                                                    <div className="h-1 w-1 rounded-full bg-slate-200" />
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[200px]">{selectedSubmission.lesson.module.title}</p>
                                                </div>
                                            
                                            <div>
                                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight mb-2.5">{selectedSubmission.lesson.title}</h2>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-muted-foreground">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="h-5 w-5 bg-primary/10 rounded-md flex items-center justify-center text-primary overflow-hidden">
                                                            {selectedSubmission.user.avatarUrl ? (
                                                                <img src={selectedSubmission.user.avatarUrl} alt={selectedSubmission.user.name} className="h-full w-full object-cover" />
                                                            ) : (
                                                                <LucideUser className="h-3 w-3" />
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{selectedSubmission.user.name}</span>
                                                    </div>
                                                    <span className="text-slate-200 hidden sm:block">•</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <LucideCalendar className="h-3.5 w-3.5 text-slate-300" />
                                                        <span className="text-[10px] font-bold uppercase tracking-widest">
                                                            {format(new Date(selectedSubmission.createdAt), "dd MMM, yyyy 'às' HH:mm", { locale: ptBR })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedSubmission(null)} 
                                            className="h-9 w-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white hover:border-primary/20 hover:text-primary transition-all active:scale-95 shadow-sm shrink-0"
                                        >
                                            <LucideX className="h-5 w-5" />
                                        </button>
                                    </div>

                                    {/* Compact Challenge Instructions Toggle */}
                                    {selectedSubmission.lesson.content && (
                                        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl overflow-hidden group hover:border-primary/20 transition-all border-dashed">
                                            <button 
                                                onClick={() => setShowEnunciado(!showEnunciado)}
                                                className="w-full px-5 py-3.5 flex items-center justify-between text-left transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${showEnunciado ? 'bg-primary/10 text-primary' : 'bg-white border border-slate-100 text-slate-400'}`}>
                                                        <LucideFileText className="h-4 w-4" />
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${showEnunciado ? 'text-primary' : 'text-slate-500'}`}>
                                                        Instruções do Desafio
                                                    </span>
                                                </div>
                                                <motion.div animate={{ rotate: showEnunciado ? 180 : 0 }}>
                                                    <LucideChevronDown className={`h-4 w-4 text-slate-300 transition-colors ${showEnunciado ? 'text-primary' : ''}`} />
                                                </motion.div>
                                            </button>
                                            <AnimatePresence>
                                                {showEnunciado && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden bg-white/50"
                                                    >
                                                        <div className="px-5 pb-5 pt-1 text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                                                            <div className="h-px w-full bg-slate-100 mb-4" />
                                                            {selectedSubmission.lesson.content}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}

                                    {/* Student Submission Card */}
                                    <div className="p-6 bg-slate-50/30 border border-slate-100 rounded-2xl space-y-4 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60">
                                            <LucideMessageSquare className="h-3.5 w-3.5" /> Resposta do Aluno
                                        </div>
                                        <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                            {selectedSubmission.content || "Nenhum texto enviado."}
                                        </p>
                                    </div>

                                    {selectedSubmission.fileUrl && (
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Anexo Enviado</p>
                                            <div 
                                                onClick={() => handleDownloadFile(selectedSubmission)}
                                                className={`flex items-center justify-between p-4 border rounded-xl transition-all group shadow-sm cursor-pointer ${isDownloading === selectedSubmission.id ? 'bg-slate-50 border-slate-100 opacity-80' : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-primary/30'}`}
                                            >
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    <div className="h-11 w-11 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm border border-slate-100 group-hover:scale-105 transition-transform shrink-0">
                                                        <LucideFileText className="h-5 w-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-slate-800 truncate">{selectedSubmission.fileName || "Baixar anexo"}</p>
                                                        <p className="text-[9px] font-bold text-primary uppercase tracking-[0.1em] mt-0.5">Clique para baixar</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="h-10 w-10 flex items-center justify-center text-slate-300 group-hover:text-primary transition-all ml-2">
                                                    {isDownloading === selectedSubmission.id ? (
                                                        <LoadingSpinner size="sm" variant="primary" />
                                                    ) : (
                                                        <LucideDownload className="h-5 w-5 group-hover:translate-y-0.5 transition-all" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Instructor Review Area - Slim Version */}
                                <div className="flex-1 bg-slate-50/50 p-7 lg:p-9 flex flex-col justify-between overflow-y-auto custom-scrollbar">
                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <LucideStar className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Nota Final (0-100)
                                            </label>
                                            <div className="flex items-center gap-4">
                                                <input 
                                                    type="range" 
                                                    min="0" max="100" 
                                                    value={grade} 
                                                    onChange={(e) => setGrade(Number(e.target.value))}
                                                    className="flex-1 accent-primary h-2 bg-slate-200 rounded-full appearance-none cursor-pointer"
                                                />
                                                <div className="h-12 w-14 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-xl font-black italic text-primary shadow-sm">
                                                    {grade}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <LucideMessageSquare className="h-3.5 w-3.5 text-primary" /> Feedback Personalizado
                                            </label>
                                            <textarea 
                                                value={feedback}
                                                onChange={(e) => setFeedback(e.target.value)}
                                                placeholder="Oriente o aluno sobre o que pode ser melhorado..."
                                                className="w-full bg-white border border-slate-200 rounded-xl p-5 text-sm font-medium focus:ring focus:ring-primary/10 focus:border-primary outline-none transition-all min-h-[140px] shadow-sm placeholder:text-slate-300"
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <LucideDownload className="h-3.5 w-3.5 text-emerald-500" /> Material Complementar
                                            </label>
                                            
                                            <input type="file" id="feedback-file-upload-slim" className="hidden" onChange={handleFeedbackFileUpload} />
                                            
                                            {feedbackFile ? (
                                                <div className="flex items-center justify-between p-4 bg-white border border-emerald-100 rounded-xl shadow-sm">
                                                    <div className="flex items-center gap-3 truncate">
                                                        <div className="h-9 w-9 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500 shrink-0">
                                                            <LucideFileText className="h-5 w-5" />
                                                        </div>
                                                        <p className="text-[10px] font-black text-slate-800 truncate">{feedbackFile.name}</p>
                                                    </div>
                                                    <button onClick={() => setFeedbackFile(null)} className="h-7 w-7 hover:bg-destructive/10 text-destructive rounded-lg transition-colors flex items-center justify-center shrink-0">
                                                        <LucideX className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => document.getElementById('feedback-file-upload-slim')?.click()}
                                                    disabled={isUploadingFeedback || selectedSubmission.status === 'REVIEWED'}
                                                    className="w-full h-12 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2.5 text-slate-400 hover:border-primary hover:text-primary transition-all group disabled:opacity-50"
                                                >
                                                    {isUploadingFeedback ? (
                                                        <><LoadingSpinner size="sm" variant="primary" /> <span className="text-[10px] font-bold">{uploadFeedbackProgress}%</span></>
                                                    ) : (
                                                        <><LucideDownload className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" /> <span className="text-[10px] font-black uppercase tracking-widest">Anexar material</span></>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 mt-8 shrink-0">
                                        <button 
                                            onClick={handleReview}
                                            disabled={isSaving || isDeleting || selectedSubmission.status === 'REVIEWED'}
                                            className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                        >
                                            {isSaving ? <LoadingSpinner size="sm" variant="white" /> : <><LucideZap className="h-4 w-4 fill-current" /> Finalizar Avaliação</>}
                                        </button>

                                        <button 
                                            onClick={handleClearSubmission}
                                            disabled={isSaving || isDeleting}
                                            className="w-full h-12 bg-white border border-amber-500/20 text-amber-600 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-amber-50 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isDeleting ? <LoadingSpinner size="sm" variant="primary" /> : <><LucideRefreshCw className="h-3.5 w-3.5" /> Solicitar Refação / Correção</>}
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
