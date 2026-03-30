import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { 
    LucideFileText, LucideClock, LucideCheckCircle, LucideChevronRight, 
    LucideSearch, LucideFilter, LucideMessageSquare, LucideStar,
    LucideDownload, LucideX, LucideZap, LucideCalendar, LucideUser
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";
import api from "../utils/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import toast from "react-hot-toast";

interface Submission {
    id: string;
    content: string;
    fileUrl?: string;
    fileName?: string;
    status: 'PENDING' | 'REVIEWED';
    grade?: number;
    feedback?: string;
    createdAt: string;
    user: {
        name: string;
        email: string;
    };
    lesson: {
        id: string;
        title: string;
        module: {
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
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'REVIEWED'>('PENDING');

    // Review Modal States
    const [grade, setGrade] = useState<number>(100);
    const [feedback, setFeedback] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [feedbackFile, setFeedbackFile] = useState<{ url: string; name: string } | null>(null);
    const [isUploadingFeedback, setIsUploadingFeedback] = useState(false);
    const [uploadFeedbackProgress, setUploadFeedbackProgress] = useState(0);

    useEffect(() => {
        fetchSubmissions();
    }, [filter]);

    const fetchSubmissions = async () => {
        setIsLoading(true);
        try {
            const statusParam = filter === 'ALL' ? '' : `?status=${filter}`;
            const response = await api.get(`/essay-submissions/pending${statusParam}`);
            setSubmissions(response.data);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar submissões");
        } finally {
            setIsLoading(false);
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

    const filteredSubmissions = submissions.filter(s => 
        (s.user.name.toLowerCase().includes(search.toLowerCase()) || 
         s.lesson.title.toLowerCase().includes(search.toLowerCase())) &&
        (filter === 'ALL' || s.status === filter)
    );

    return (
        <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-10">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 text-primary mb-2">
                        <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                            <LucideFileText className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Gestão Pedagógica</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter italic uppercase text-slate-900">Correções de Desafios</h1>
                    <p className="text-muted-foreground text-sm font-medium">Avalie o desempenho dos seus alunos e envie feedbacks personalizados.</p>
                </div>

                <div className="flex items-center gap-3 bg-card p-2 rounded-2xl border border-border shadow-sm">
                    <button onClick={() => setFilter('PENDING')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'PENDING' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-muted-foreground hover:bg-muted'}`}>Pendentes</button>
                    <button onClick={() => setFilter('REVIEWED')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'REVIEWED' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-muted-foreground hover:bg-muted'}`}>Revisados</button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 relative">
                    <LucideSearch className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <input 
                        type="text" 
                        placeholder="Buscar por aluno ou aula..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-card border border-border rounded-2xl py-4 pl-14 pr-6 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    />
                </div>
                <div className="relative">
                    <LucideFilter className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <select className="w-full bg-card border border-border rounded-2xl py-4 pl-14 pr-6 text-sm font-black uppercase tracking-widest appearance-none outline-none">
                        <option>Todos os Cursos</option>
                    </select>
                </div>
            </div>

            {/* Submissions List */}
            {isLoading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                    <LoadingSpinner size="lg" variant="primary" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Carregando submissões...</p>
                </div>
            ) : filteredSubmissions.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-card rounded-3xl border-dashed border-border border-2">
                    <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4 text-muted-foreground/30">
                        <LucideCheckCircle className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-black uppercase italic tracking-tighter">Tudo em dia!</h3>
                    <p className="text-muted-foreground text-sm mt-1">Não há submissões pendentes no momento.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredSubmissions.map((sub, idx) => (
                        <motion.div 
                            key={sub.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => {
                                setSelectedSubmission(sub);
                                setGrade(sub.grade || 100);
                                setFeedback(sub.feedback || "");
                                setFeedbackFile(null);
                            }}
                            className="bg-card border border-border rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/30 cursor-pointer group transition-all hover:shadow-xl hover:shadow-primary/5 active:scale-[0.99]"
                        >
                            <div className="flex items-center gap-6">
                                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${sub.status === 'PENDING' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-inner' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-inner'}`}>
                                    <LucideUser className="h-6 w-6" />
                                </div>
                                <div className="space-y-1 min-w-0">
                                    <h3 className="font-black italic uppercase tracking-tighter text-slate-800 truncate text-lg">{sub.user.name}</h3>
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <LucideCalendar className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">{format(new Date(sub.createdAt), "dd MMM, yyyy", { locale: ptBR })}</span>
                                        </div>
                                        <span className="text-border">|</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest truncate">{sub.lesson.module.course.title} • {sub.lesson.title}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                                {sub.status === 'REVIEWED' && (
                                    <div className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-lg font-black italic tracking-tighter">
                                        {sub.grade}/100
                                    </div>
                                )}
                                <div className="h-10 w-10 bg-muted/50 rounded-full flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
                                    <LucideChevronRight className="h-5 w-5" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
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
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
                            />
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                                className="relative w-full max-w-4xl bg-background rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] z-[1000]"
                            >
                                {/* Student Content Area */}
                                <div className="flex-[1.5] p-8 lg:p-12 overflow-y-auto border-r border-border custom-scrollbar">
                                    <div className="space-y-8">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{selectedSubmission.lesson.module.course.title}</p>
                                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">{selectedSubmission.lesson.title}</h2>
                                            </div>
                                            <button onClick={() => setSelectedSubmission(null)} className="h-10 w-10 bg-muted rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors">
                                                <LucideX className="h-5 w-5" />
                                            </button>
                                        </div>

                                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-4">
                                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                <LucideMessageSquare className="h-4 w-4" /> Resposta do Aluno
                                            </div>
                                            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                                {selectedSubmission.content || "Nenhum texto enviado."}
                                            </p>
                                        </div>

                                        {selectedSubmission.fileUrl && (
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Anexo do Aluno</p>
                                                <a 
                                                    href={selectedSubmission.fileUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-between p-5 bg-primary/5 border border-primary/10 rounded-2xl hover:bg-primary/10 transition-all group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm border border-primary/10">
                                                            <LucideFileText className="h-6 w-6" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-black text-slate-800 truncate max-w-[200px]">{selectedSubmission.fileName || "Ver arquivo"}</p>
                                                            <p className="text-[9px] font-bold text-primary uppercase tracking-widest mt-0.5">Clique para visualizar</p>
                                                        </div>
                                                    </div>
                                                    <LucideDownload className="h-5 w-5 text-primary group-hover:translate-y-0.5 transition-transform" />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Instructor Review Area */}
                                <div className="flex-1 bg-slate-50/50 p-8 lg:p-10 flex flex-col justify-between">
                                    <div className="space-y-10">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <LucideStar className="h-4 w-4 text-amber-500 fill-amber-500" /> Nota da Atividade
                                            </label>
                                            <div className="flex items-center gap-4">
                                                <input 
                                                    type="range" 
                                                    min="0" max="100" 
                                                    value={grade} 
                                                    onChange={(e) => setGrade(Number(e.target.value))}
                                                    className="flex-1 accent-primary h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                                />
                                                <div className="h-16 w-20 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-2xl font-black italic text-primary shadow-sm">
                                                    {grade}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <LucideMessageSquare className="h-4 w-4 text-primary" /> Feedback / Orientação
                                            </label>
                                            <textarea 
                                                value={feedback}
                                                onChange={(e) => setFeedback(e.target.value)}
                                                placeholder="Ex: Ótima reflexão, você conseguiu conectar o tema..."
                                                className="w-full bg-white border border-slate-200 rounded-2xl p-5 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[140px] shadow-sm"
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <LucideDownload className="h-4 w-4 text-emerald-500" /> Material Complementar (Opcional)
                                            </label>
                                            
                                            <input type="file" id="feedback-file-upload" className="hidden" onChange={handleFeedbackFileUpload} />
                                            
                                            {feedbackFile ? (
                                                <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl group">
                                                    <div className="flex items-center gap-3 truncate">
                                                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-500/10 shrink-0">
                                                            <LucideFileText className="h-5 w-5" />
                                                        </div>
                                                        <div className="truncate">
                                                            <p className="text-[10px] font-black text-slate-800 truncate">{feedbackFile.name}</p>
                                                            <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">Material de Correção</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setFeedbackFile(null)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors">
                                                        <LucideX className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => document.getElementById('feedback-file-upload')?.click()}
                                                    disabled={isUploadingFeedback || selectedSubmission.status === 'REVIEWED'}
                                                    className="w-full h-14 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-500 transition-all group disabled:opacity-50"
                                                >
                                                    {isUploadingFeedback ? (
                                                        <><LoadingSpinner size="sm" variant="primary" /> {uploadFeedbackProgress}%</>
                                                    ) : (
                                                        <><LucideDownload className="h-4 w-4 group-hover:-translate-y-0.5 transition-all" /> <span className="text-[10px] font-black uppercase tracking-widest">Anexar material de correção</span></>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleReview}
                                        disabled={isSaving || selectedSubmission.status === 'REVIEWED'}
                                        className="w-full h-16 bg-primary text-primary-foreground rounded-[1.5rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-10"
                                    >
                                        {isSaving ? <LoadingSpinner size="sm" variant="white" /> : <><LucideZap className="h-5 w-5 fill-current" /> Finalizar Correção</>}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
