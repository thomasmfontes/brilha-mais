import { motion, AnimatePresence } from "framer-motion";
import { LucideChevronLeft, LucidePlus, LucideTrash2, LucideLayout, LucidePlay, LucideClock, LucideSave, LucideLink, LucideChevronDown, LucideMoreVertical, LucideFileText, LucideDownload, LucideGlobe, LucideFileJson, LucideUploadCloud, LucideX, LucideCheck, LucideCircle, LucideHelpCircle } from "lucide-react";
import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { getYoutubeId } from "../utils/youtube";
import toast from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";
import { PortalModal } from "../components/PortalModal";

interface Material {
    id?: string;
    name: string;
    url: string;
    type: string;
    size: string;
}

interface QuizOption {
    id?: string;
    text: string;
    isCorrect: boolean;
}

interface QuizQuestion {
    id?: string;
    text: string;
    options: QuizOption[];
}

interface Quiz {
    id?: string;
    title: string;
    questions: QuizQuestion[];
}

interface DraftLesson {
    id?: string;
    title: string;
    duration: string;
    completed: boolean;
    contentType: 'VIDEO' | 'PDF' | 'QUIZ' | 'ESSAY';
    youtubeId?: string;
    pdfUrl?: string;
    content?: string; // For ESSAY instructions
    quiz?: Quiz;
    order?: number;
    materials?: Material[];
    allowPdfDownload?: boolean;
}

interface DraftModule {
    id?: string;
    title: string;
    lessons: DraftLesson[];
}

export default function InstructorSyllabus() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Local state for course and modules
    const [courseTitle, setCourseTitle] = useState("");
    const [localModules, setLocalModules] = useState<DraftModule[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadingFor, setUploadingFor] = useState<string | null>(null); // "mIdx-lIdx"
    const [pendingUploadTarget, setPendingUploadTarget] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        description: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: "",
        description: "",
        onConfirm: () => { }
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (id) fetchCourse();
    }, [id]);

    const fetchCourse = async () => {
        try {
            const response = await api.get(`/courses/${id}`);
            setCourseTitle(response.data.title);
            setLocalModules(response.data.modules || []);
        } catch (error) {
            console.error("Error fetching course:", error);
            toast.error("Erro ao carregar curso.");
            navigate("/instructor");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) return (
        <div className="max-w-4xl mx-auto space-y-8 pb-32 px-4 md:px-0">
            <div className="flex justify-between items-center pt-6">
                <div className="flex items-center gap-6">
                    <div className="h-12 w-12 rounded-full bg-slate-200 animate-shimmer" />
                    <div className="space-y-2">
                        <div className="h-3 w-24 bg-slate-200 rounded animate-shimmer" />
                        <div className="h-8 w-48 bg-slate-300 rounded animate-shimmer" />
                    </div>
                </div>
                <div className="h-12 w-40 bg-slate-200 rounded-xl animate-shimmer" />
            </div>
            <div className="space-y-12">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-[2rem] h-[400px] shadow-sm flex flex-col p-6 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-9 w-9 bg-slate-200 rounded-lg animate-shimmer" />
                            <div className="h-6 w-64 bg-slate-300 rounded animate-shimmer" />
                        </div>
                        <div className="flex-1 bg-slate-50 rounded-2xl animate-shimmer" />
                    </div>
                ))}
            </div>
        </div>
    );
    if (!courseTitle) return <div className="p-20 text-center font-black">Curso não encontrado</div>;

    const addModule = () => {
        setLocalModules([
            ...localModules,
            { title: "Novo Módulo", lessons: [] }
        ]);
    };

    const removeModule = (mIdx: number) => {
        setConfirmModal({
            isOpen: true,
            title: "Remover Módulo?",
            description: "Isso apagará o módulo e todas as aulas contidas nele. Esta ação não pode ser desfeita.",
            onConfirm: () => {
                setLocalModules(localModules.filter((_, i) => i !== mIdx));
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const updateModuleTitle = (mIdx: number, title: string) => {
        const next = [...localModules];
        next[mIdx].title = title;
        setLocalModules(next);
    };

    const addLesson = (mIdx: number) => {
        const next = [...localModules];
        next[mIdx].lessons.push({
            title: "Nova Aula",
            duration: "10:00",
            completed: false,
            contentType: 'VIDEO',
            youtubeId: "",
            materials: []
        });
        setLocalModules(next);
    };

    const removeLesson = (mIdx: number, lIdx: number) => {
        setConfirmModal({
            isOpen: true,
            title: "Remover Aula?",
            description: "Você tem certeza que deseja remover esta aula da grade?",
            onConfirm: () => {
                const next = [...localModules];
                next[mIdx].lessons = next[mIdx].lessons.filter((_, i) => i !== lIdx);
                setLocalModules(next);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const updateLesson = (mIdx: number, lIdx: number, data: Partial<DraftLesson>) => {
        const next = [...localModules];
        const updatedData = { ...data };
        if (updatedData.youtubeId !== undefined) {
            updatedData.youtubeId = getYoutubeId(updatedData.youtubeId) || updatedData.youtubeId;
        }
        next[mIdx].lessons[lIdx] = { ...next[mIdx].lessons[lIdx], ...updatedData };
        setLocalModules(next);
    };

    const addQuestion = (mIdx: number, lIdx: number) => {
        const next = [...localModules];
        const lesson = next[mIdx].lessons[lIdx];
        if (!lesson.quiz) {
            lesson.quiz = { title: "Mini Teste", questions: [] };
        }
        lesson.quiz.questions.push({
            text: "",
            options: [
                { text: "", isCorrect: true },
                { text: "", isCorrect: false }
            ]
        });
        setLocalModules(next);
    };

    const removeQuestion = (mIdx: number, lIdx: number, qIdx: number) => {
        setConfirmModal({
            isOpen: true,
            title: "Remover Pergunta?",
            description: "Deseja realmente excluir esta pergunta do quiz?",
            onConfirm: () => {
                const next = [...localModules];
                next[mIdx].lessons[lIdx].quiz?.questions.splice(qIdx, 1);
                setLocalModules(next);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const updateQuestionText = (mIdx: number, lIdx: number, qIdx: number, text: string) => {
        const next = [...localModules];
        const quiz = next[mIdx].lessons[lIdx].quiz;
        if (quiz) {
            quiz.questions[qIdx].text = text;
            setLocalModules(next);
        }
    };

    const addOption = (mIdx: number, lIdx: number, qIdx: number) => {
        const next = [...localModules];
        const options = next[mIdx].lessons[lIdx].quiz?.questions[qIdx].options;
        if (options && options.length >= 4) {
            toast.error("Máximo de 4 opções permitido.");
            return;
        }
        options?.push({
            text: "",
            isCorrect: false
        });
        setLocalModules(next);
    };

    const removeOption = (mIdx: number, lIdx: number, qIdx: number, oIdx: number) => {
        const next = [...localModules];
        next[mIdx].lessons[lIdx].quiz?.questions[qIdx].options.splice(oIdx, 1);
        setLocalModules(next);
    };

    const updateOption = (mIdx: number, lIdx: number, qIdx: number, oIdx: number, data: Partial<QuizOption>) => {
        const next = [...localModules];
        const quiz = next[mIdx].lessons[lIdx].quiz;
        if (quiz) {
            const options = quiz.questions[qIdx].options;
            options[oIdx] = { ...options[oIdx], ...data };
            setLocalModules(next);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileType = (filename: string) => {
        const ext = filename.split('.').pop()?.toUpperCase();
        if (['JPG', 'PNG', 'JPEG', 'GIF'].includes(ext!)) return 'IMG';
        if (ext === 'PDF') return 'PDF';
        if (ext === 'HTML') return 'HTML';
        if (['ZIP', 'RAR', '7Z'].includes(ext!)) return 'ZIP';
        return 'FILE';
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !pendingUploadTarget) return;

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            toast.error("Configuração do Supabase ausente no frontend!");
            return;
        }

            const [mIdxStr, lIdxStr, isPdfMain] = (pendingUploadTarget as string).split('-');
            const mIdx = parseInt(mIdxStr);
            const lIdx = parseInt(lIdxStr);
            
            setUploadingFor(pendingUploadTarget as string);
            setUploadProgress(0);

            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
                const filePath = `courses/${fileName}`;
                const uploadUrl = `${supabaseUrl}/storage/v1/object/course-images/${filePath}`;

                const formData = new FormData();
                formData.append('file', file);

                await axios.post(uploadUrl, formData, {
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                        'apikey': supabaseKey,
                        'x-upsert': 'true'
                    },
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || progressEvent.loaded));
                        setUploadProgress(percentCompleted);
                    }
                });

                const publicUrl = `${supabaseUrl}/storage/v1/object/public/course-images/${filePath}`;

                const next = [...localModules];
                if (isPdfMain === 'pdfMain') {
                    next[mIdx].lessons[lIdx].pdfUrl = publicUrl;
                } else {
                    const newMaterial: Material = {
                        name: file.name,
                        url: publicUrl,
                        type: getFileType(file.name),
                        size: formatFileSize(file.size)
                    };
                    const materials = next[mIdx].lessons[lIdx].materials || [];
                    next[mIdx].lessons[lIdx].materials = [...materials, newMaterial];
                }
                setLocalModules(next);
            toast.success("Arquivo enviado!");
        } catch (error: any) {
            console.error("Upload error details:", error.response?.data);
            const errMsg = error.response?.data?.message || error.message || "Erro ao enviar arquivo";
            toast.error(`Falha no upload: ${errMsg}`);
        } finally {
            setUploadingFor(null);
            setPendingUploadTarget(null);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeMaterial = (mIdx: number, lIdx: number, matIdx: number) => {
        setConfirmModal({
            isOpen: true,
            title: "Remover Material?",
            description: "O arquivo será removido desta aula. Deseja continuar?",
            onConfirm: () => {
                const next = [...localModules];
                next[mIdx].lessons[lIdx].materials = next[mIdx].lessons[lIdx].materials?.filter((_, i) => i !== matIdx);
                setLocalModules(next);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleYoutubeIdChange = async (mIdx: number, lIdx: number, value: string) => {
        const youtubeId = getYoutubeId(value) || value;
        updateLesson(mIdx, lIdx, { youtubeId });
    };

    const handleSave = async () => {
        if (!id) return;
        setIsSaving(true);
        try {
            await api.put(`/courses/${id}`, {
                modules: localModules
            });
            toast.success("Grade salva com sucesso!");
        } catch (error) {
            console.error("Error saving syllabus:", error);
            toast.error("Erro ao salvar grade.");
        } finally {
            setIsSaving(false);
        }
    };

    const getMaterialIcon = (type: string) => {
        switch (type) {
            case 'PDF': return <LucideFileText className="h-4 w-4 text-red-500" />;
            case 'HTML': return <LucideGlobe className="h-4 w-4 text-blue-500" />;
            case 'ZIP': return <LucideFileJson className="h-4 w-4 text-yellow-500" />;
            default: return <LucideFileText className="h-4 w-4 text-muted-foreground" />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-32 px-4 md:px-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-6">
                <div className="flex items-center gap-4 md:gap-6">
                    <Link
                        to="/instructor"
                        className="p-2.5 md:p-3 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm group"
                    >
                        <LucideChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 text-primary mb-0.5">
                            <LucideLayout className="h-3 w-3" />
                            <span className="text-[8px] md:text-[9px] uppercase font-black tracking-[0.3em] truncate max-w-[150px] md:max-w-none block">{courseTitle}</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-900 uppercase">Grade Curricular</h1>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 md:flex-none bg-primary text-primary-foreground px-6 md:px-8 py-3 md:py-3.5 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 text-[10px]"
                    >
                        {isSaving ? (
                            <LoadingSpinner size="sm" variant="white" />
                        ) : (
                            <LucideSave className="h-4 w-4" />
                        )}
                        {isSaving ? "Salvando..." : "Salvar Alterações"}
                    </button>
                </div>
            </div>

            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />


            {/* Syllabus Editor */}
            <div className="space-y-6 md:space-y-12">
                {localModules.map((module, mIdx) => (
                    <div key={mIdx} className="bg-white border border-slate-200 rounded-[2rem] md:rounded-[3rem] shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="h-9 w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-md">
                                    {String(mIdx + 1).padStart(2, '0')}
                                </div>
                                <input
                                    className="bg-transparent text-lg font-black outline-none focus:text-primary transition-colors w-full uppercase tracking-tight text-slate-800"
                                    value={module.title}
                                    onChange={(e) => updateModuleTitle(mIdx, e.target.value)}
                                    placeholder="NOME DO MÓDULO"
                                />
                            </div>
                            <button
                                onClick={() => removeModule(mIdx)}
                                className="p-2.5 rounded-xl hover:bg-destructive/10 text-slate-400 hover:text-destructive transition-all border border-transparent hover:border-destructive/20"
                                title="Remover Módulo"
                            >
                                <LucideTrash2 className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Lessons List Area */}
                        <div className="bg-slate-50/50 p-3 md:p-10 space-y-4 md:space-y-6">
                            {module.lessons.map((lesson, lIdx) => (
                                <div key={lesson.id || `new-${mIdx}-${lIdx}`} className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2.5rem] p-3.5 md:p-8 group/lesson relative hover:border-slate-300 transition-colors shadow-sm">
                                    {/* Lesson Header Row */}
                                    <div className="flex items-center justify-between mb-5 pb-5 border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase bg-slate-900 text-white px-2.5 py-1.5 rounded-lg tracking-widest shadow-sm">
                                                    Aula {String(lIdx + 1).padStart(2, '0')}
                                                </span>
                                                {lesson.title && (
                                                    <span className="hidden md:inline font-black uppercase text-[10px] tracking-tight text-slate-400">
                                                            // {lesson.title}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeLesson(mIdx, lIdx)}
                                            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-destructive transition-all active:scale-90 border border-transparent hover:border-destructive/20"
                                            title="Remover Aula"
                                        >
                                            <LucideTrash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
                                        {/* Lesson Info */}
                                        <div className="lg:col-span-8 space-y-5">
                                            <div>
                                                <label className="text-[9px] uppercase font-black tracking-[0.2em] text-slate-600 mb-2 block border-l-2 border-primary pl-2 italic">Título da aula</label>
                                                <input
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300"
                                                    value={lesson.title}
                                                    onChange={(e) => updateLesson(mIdx, lIdx, { title: e.target.value })}
                                                    placeholder="Como instalar as ferramentas..."
                                                />
                                            </div>

                                            {lesson.contentType === 'VIDEO' && (
                                                <div className="space-y-2">
                                                    <label className="text-[9px] uppercase font-black tracking-[0.2em] text-slate-600 mb-2 block pl-2 border-l-2 border-red-500 italic">ID do YouTube</label>
                                                    <div className="relative group/input">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500">
                                                            <LucidePlay className="h-3 w-3 fill-current" />
                                                        </div>
                                                        <input
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 outline-none focus:border-red-400 focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300 text-sm"
                                                            value={lesson.youtubeId || ''}
                                                            onChange={(e) => handleYoutubeIdChange(mIdx, lIdx, e.target.value)}
                                                            placeholder="Cole a URL do vídeo"
                                                        />
                                                    </div>
                                                    </div>
                                                )}

                                            {lesson.contentType === 'PDF' && (
                                                <div className="space-y-2">
                                                    <label className="text-[9px] uppercase font-black tracking-[0.2em] text-slate-600 mb-2 block pl-2 border-l-2 border-primary italic">Arquivo PDF da Aula</label>
                                                    
                                                    {lesson.pdfUrl ? (
                                                        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl group/pdf">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-10 w-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                                                                    <LucideFileText className="h-5 w-5" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-[10px] font-black uppercase text-emerald-900 truncate">PDF Carregado</p>
                                                                    <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-tight">Conteúdo protegido</p>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => updateLesson(mIdx, lIdx, { pdfUrl: undefined })}
                                                                className="h-8 w-8 rounded-lg flex items-center justify-center text-emerald-300 hover:text-destructive hover:bg-white transition-all"
                                                            >
                                                                <LucideTrash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => {
                                                                setPendingUploadTarget(`${mIdx}-${lIdx}-pdfMain`);
                                                                fileInputRef.current?.click();
                                                            }}
                                                            disabled={!!uploadingFor}
                                                            className="w-full py-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all group/upload"
                                                        >
                                                            {uploadingFor === `${mIdx}-${lIdx}-pdfMain` ? (
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <LoadingSpinner size="sm" variant="primary" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">{uploadProgress}%</span>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover/upload:bg-primary group-hover/upload:text-white transition-all">
                                                                        <LucideUploadCloud className="h-5 w-5" />
                                                                    </div>
                                                                    <span className="text-[9px] font-black uppercase tracking-widest">Enviar PDF da Aula</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {lesson.contentType === 'ESSAY' && (
                                                <div className="space-y-2">
                                                    <label className="text-[9px] uppercase font-black tracking-[0.2em] text-slate-600 mb-2 block pl-2 border-l-2 border-amber-500 italic">Instruções do Desafio</label>
                                                    <textarea
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300 min-h-[120px] text-sm"
                                                        value={lesson.content || ''}
                                                        onChange={(e) => updateLesson(mIdx, lIdx, { content: e.target.value })}
                                                        placeholder="Descreva o que o aluno deve fazer neste desafio..."
                                                    />
                                                </div>
                                            )}

                                            {lesson.contentType === 'QUIZ' && (
                                                <div className="space-y-3 pt-1">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                                                                <LucideHelpCircle className="h-2.5 w-2.5" />
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800">Questões do Teste</span>
                                                        </div>
                                                        <button
                                                            onClick={() => addQuestion(mIdx, lIdx)}
                                                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-primary transition-all text-[8px] font-black uppercase tracking-[0.2em] shadow-md border border-slate-800 hover:border-primary"
                                                        >
                                                            <LucidePlus className="h-2.5 w-2.5" /> Adicionar Pergunta
                                                        </button>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {lesson.quiz?.questions.map((q, qIdx) => (
                                                            <div key={qIdx} className="bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl p-3 md:p-6 space-y-4 relative group/q hover:border-slate-300 transition-all">
                                                                <div className="flex items-center justify-between pb-4 border-b border-slate-100/50">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[8px] font-black uppercase text-slate-400">Pergunta {String(qIdx + 1).padStart(2, '0')}</span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => removeQuestion(mIdx, lIdx, qIdx)}
                                                                        className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-destructive transition-all active:scale-90"
                                                                        title="Remover Pergunta"
                                                                    >
                                                                        <LucideTrash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <label className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 block px-2 italic border-l-2 border-primary">Enunciado</label>
                                                                    <input
                                                                        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-primary transition-all font-black text-slate-900 text-xs uppercase tracking-tight placeholder:text-slate-300"
                                                                        value={q.text}
                                                                        onChange={(e) => updateQuestionText(mIdx, lIdx, qIdx, e.target.value)}
                                                                        placeholder="EX: QUAL O PRINCIPAL BENEFÍCIO DO MÉTODO?"
                                                                    />
                                                                </div>

                                                                <div className="space-y-4">
                                                                    <div className="flex items-center justify-between px-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <LucideX className="h-2.5 w-2.5 text-slate-400" />
                                                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Alternativas Sugeridas</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => addOption(mIdx, lIdx, qIdx)}
                                                                            disabled={(q.options?.length || 0) >= 4}
                                                                            className={`text-[8px] font-black uppercase tracking-[0.2em] italic flex items-center gap-1 transition-all ${(q.options?.length || 0) >= 4
                                                                                ? 'text-slate-300 cursor-not-allowed opacity-50'
                                                                                : 'text-primary hover:underline'
                                                                                }`}
                                                                        >
                                                                            <LucidePlus className="h-2 w-2" />
                                                                            {(q.options?.length || 0) >= 4 ? 'Limite de 4 opções' : 'Opção'}
                                                                        </button>
                                                                    </div>
                                                                    <div className="grid gap-2 md:gap-3">
                                                                        {q.options.map((opt, oIdx) => (
                                                                            <div key={oIdx} className="flex items-center gap-2 md:gap-3">
                                                                                <button
                                                                                    onClick={() => updateOption(mIdx, lIdx, qIdx, oIdx, { isCorrect: !opt.isCorrect })}
                                                                                    className={`h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-2xl flex items-center justify-center border transition-all ${opt.isCorrect ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white border-slate-200 text-slate-200 hover:border-primary/50'}`}
                                                                                    title={opt.isCorrect ? "Correta" : "Marcar como correta"}
                                                                                >
                                                                                    {opt.isCorrect ? <LucideCheck className="h-4 w-4" /> : <LucideCircle className="h-4 w-4" />}
                                                                                </button>
                                                                                <input
                                                                                    className={`flex-1 bg-white border rounded-xl md:rounded-2xl px-2 py-1.5 md:px-4 md:py-2.5 outline-none transition-all text-[11px] font-bold ${opt.isCorrect ? 'border-primary/30 ring-1 ring-primary/10 text-slate-900' : 'border-slate-200 focus:border-slate-400 text-slate-600'}`}
                                                                                    value={opt.text}
                                                                                    onChange={(e) => updateOption(mIdx, lIdx, qIdx, oIdx, { text: e.target.value })}
                                                                                    placeholder={`Opção ${oIdx + 1}`}
                                                                                />
                                                                                <button
                                                                                    onClick={() => removeOption(mIdx, lIdx, qIdx, oIdx)}
                                                                                    className="h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-2xl text-slate-300 hover:text-white hover:bg-destructive/80 transition-all flex items-center justify-center border border-transparent hover:border-destructive/20"
                                                                                >
                                                                                    <LucideX className="h-4 w-4" />
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Type Selector (Desktop right-side) */}
                                        <div className="lg:col-span-4 space-y-4">
                                            <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                                <label className="text-[9px] uppercase font-black tracking-[0.2em] text-slate-600 mb-2 block text-left border-l-2 border-slate-200 pl-2 italic">Tipo de conteúdo</label>
                                                <select
                                                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-primary transition-all font-black text-slate-900 appearance-none cursor-pointer text-center uppercase tracking-widest text-[10px]"
                                                    value={lesson.contentType || 'VIDEO'}
                                                    onChange={(e) => updateLesson(mIdx, lIdx, { contentType: e.target.value as any })}
                                                >
                                                    <option value="VIDEO">Vídeo YouTube</option>
                                                    <option value="PDF">Arquivo PDF</option>
                                                    <option value="QUIZ">Mini Teste</option>
                                                    <option value="ESSAY">Desafio Dissertativo</option>
                                                </select>
                                            </div>

                                            {lesson.contentType === 'PDF' && (
                                                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm group/toggle hover:border-primary/20 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${lesson.allowPdfDownload !== false ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-400'}`}>
                                                            <LucideDownload className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-800">Liberar Download</p>
                                                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">Permitir salvar arquivo</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => updateLesson(mIdx, lIdx, { allowPdfDownload: lesson.allowPdfDownload === false })}
                                                        className={`w-10 h-5 rounded-full relative transition-all ${lesson.allowPdfDownload !== false ? 'bg-primary' : 'bg-slate-200'}`}
                                                    >
                                                        <motion.div
                                                            animate={{ x: lesson.allowPdfDownload !== false ? 22 : 2 }}
                                                            className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                                                        />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Materials Section */}
                                    <div className="mt-8 pt-6 border-t border-slate-100">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-2 w-2 rounded-full bg-primary" />
                                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Materiais de Apoio</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setPendingUploadTarget(`${mIdx}-${lIdx}`);
                                                    fileInputRef.current?.click();
                                                }}
                                                disabled={!!uploadingFor}
                                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-primary transition-all text-[8px] font-black uppercase tracking-[0.2em] shadow-md disabled:opacity-50"
                                            >
                                                {uploadingFor === `${mIdx}-${lIdx}` ? (
                                                    <><LoadingSpinner size="xs" variant="white" /> {uploadProgress === 100 ? 'Processando...' : `${uploadProgress}%`}</>
                                                ) : (
                                                    <><LucideUploadCloud className="h-3 w-3" /> {uploadingFor ? 'Aguarde...' : 'Anexar'}</>
                                                )}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {lesson.materials?.map((mat: any, matIdx: number) => (
                                                <div key={matIdx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 group/mat hover:border-primary transition-all">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-white flex items-center justify-center border border-slate-200 group-hover/mat:border-primary/20 transition-colors shadow-sm">
                                                            {getMaterialIcon(mat.type)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] font-black text-slate-800 truncate">{mat.name}</p>
                                                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                                                <span className="text-primary">{mat.type}</span> • {mat.size}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeMaterial(mIdx, lIdx, matIdx)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-destructive transition-all"
                                                    >
                                                        <LucideX className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            {(!lesson.materials || lesson.materials.length === 0) && (
                                                <div className="md:col-span-2 text-center py-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 italic">Nenhum anexo para esta aula</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="px-3 md:px-6 pb-6 md:pb-10">
                            <button
                                onClick={() => addLesson(mIdx)}
                                className="w-full py-6 md:py-8 border-2 border-dashed border-slate-200 rounded-[1.5rem] md:rounded-[2.5rem] text-slate-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all font-black uppercase tracking-[0.4em] flex flex-col items-center justify-center gap-3 group/add text-[9px]"
                            >
                                <div className="p-2 rounded-full bg-slate-100 text-slate-400 group-hover/add:bg-primary group-hover/add:text-white transition-all shadow-sm">
                                    <LucidePlus className="h-5 w-5" />
                                </div>
                                <span>Adicionar Nova Aula</span>
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    onClick={addModule}
                    className="w-full py-12 border-2 border-dashed border-primary/30 rounded-[3rem] text-primary hover:bg-primary/5 transition-all font-black uppercase tracking-[0.6em] flex flex-col items-center justify-center gap-4 bg-primary/5 shadow-xl shadow-primary/5 group/mod text-[10px]"
                >
                    <div className="p-4 rounded-2xl bg-primary text-white shadow-xl shadow-primary/30 group-hover:scale-110 transition-transform">
                        <LucidePlus className="h-10 w-10" />
                    </div>
                    <span>Novo Módulo de Estudo</span>
                </button>
            </div>

            {/* Global Delete Confirmation Modal */}
            <PortalModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="relative z-10 bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl space-y-8 border border-slate-100"
                >
                    <div className="h-20 w-20 bg-destructive/10 text-destructive rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                        <LucideTrash2 className="h-10 w-10" />
                    </div>

                    <div className="text-center space-y-3">
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">
                            {confirmModal.title}
                        </h2>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed px-2">
                            {confirmModal.description}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={confirmModal.onConfirm}
                            className="w-full bg-destructive text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-destructive/20"
                        >
                            Sim, Remover Permanentemente
                        </button>
                        <button
                            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                            className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-200 active:scale-[0.98] transition-all"
                        >
                            Cancelar
                        </button>
                    </div>
                </motion.div>
            </PortalModal>
        </div>
    );
}
