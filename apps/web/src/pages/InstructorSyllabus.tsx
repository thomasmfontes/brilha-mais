import { LucideChevronLeft, LucidePlus, LucideTrash2, LucidePlay, LucideLock, LucideUnlock, LucideSave, LucideFileText, LucideDownload, LucideGlobe, LucideFileJson, LucideUploadCloud, LucideX, LucideCheck, LucideHelpCircle, LucideZap } from "lucide-react";
import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { getYoutubeId } from "../utils/youtube";
import toast from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";
import { ConfirmModal } from "../components/ConfirmModal";
import Skeleton from "../components/Skeleton";

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
    explanation?: string;
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
    content?: string; // For ESSAY instructions/statements
    description?: string; // Short intro/description
    quiz?: Quiz;
    order?: number;
    materials?: Material[];
    allowPdfDownload?: boolean;
    allowSeeking?: boolean;
    deadline?: string;
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
    const [jumpIndices, setJumpIndices] = useState<Record<string, string>>({});
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
        <div className="max-w-4xl mx-auto space-y-6 pb-24 px-4 md:px-0">
            <div className="flex justify-between items-center pt-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" variant="rounded" />
                    <div className="space-y-1.5">
                        <Skeleton className="h-3 w-28" variant="rectangle" />
                        <Skeleton className="h-7 w-48" variant="rounded" />
                    </div>
                </div>
                <Skeleton className="h-10 w-36" variant="rounded" />
            </div>
            <div className="space-y-6">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-white border border-slate-200/80 rounded-2xl h-[320px] shadow-2xs flex flex-col p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <Skeleton className="h-7 w-20" variant="rounded" />
                            <Skeleton className="h-6 w-52" variant="rounded" />
                        </div>
                        <Skeleton className="flex-1 w-full" variant="rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
    if (!courseTitle) return (
        <div className="max-w-4xl mx-auto p-12 text-center text-sm font-medium text-slate-500">
            Curso não encontrado
        </div>
    );

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

    const jumpModule = (mIdx: number) => {
        const value = jumpIndices[`m-${mIdx}`];
        if (!value) return;
        
        let newIdx = parseInt(value) - 1;
        if (isNaN(newIdx)) return;
        
        const next = [...localModules];
        if (newIdx < 0) newIdx = 0;
        if (newIdx >= next.length) newIdx = next.length - 1;
        
        if (newIdx === mIdx) {
            setJumpIndices(prev => {
                const n = { ...prev };
                delete n[`m-${mIdx}`];
                return n;
            });
            return;
        }

        const target = next.splice(mIdx, 1)[0];
        next.splice(newIdx, 0, target);
        
        setLocalModules(next);
        setJumpIndices(prev => {
            const n = { ...prev };
            delete n[`m-${mIdx}`];
            return n;
        });
    };

    const addLesson = (mIdx: number) => {
        const next = [...localModules];
        next[mIdx].lessons.push({
            title: "Nova Aula",
            duration: "10:00",
            completed: false,
            contentType: 'VIDEO',
            youtubeId: "",
            allowSeeking: false,
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

    const jumpLesson = (mIdx: number, lIdx: number) => {
        const value = jumpIndices[`l-${mIdx}-${lIdx}`];
        if (!value) return;

        let newIdx = parseInt(value) - 1;
        if (isNaN(newIdx)) return;

        const next = [...localModules];
        const lessons = [...next[mIdx].lessons];
        
        if (newIdx < 0) newIdx = 0;
        if (newIdx >= lessons.length) newIdx = lessons.length - 1;

        if (newIdx === lIdx) {
            setJumpIndices(prev => {
                const n = { ...prev };
                delete n[`l-${mIdx}-${lIdx}`];
                return n;
            });
            return;
        }

        const target = lessons.splice(lIdx, 1)[0];
        lessons.splice(newIdx, 0, target);
        
        next[mIdx].lessons = lessons;
        setLocalModules(next);
        setJumpIndices(prev => {
            const n = { ...prev };
            delete n[`l-${mIdx}-${lIdx}`];
            return n;
        });
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

    const jumpQuestion = (mIdx: number, lIdx: number, qIdx: number) => {
        const key = `q-${mIdx}-${lIdx}-${qIdx}`;
        const value = jumpIndices[key];
        if (!value) return;

        let newIdx = parseInt(value) - 1;
        if (isNaN(newIdx)) return;

        const next = [...localModules];
        const questions = [...(next[mIdx].lessons[lIdx].quiz?.questions || [])];

        if (newIdx < 0) newIdx = 0;
        if (newIdx >= questions.length) newIdx = questions.length - 1;

        if (newIdx === qIdx) {
            setJumpIndices(prev => { const n = { ...prev }; delete n[key]; return n; });
            return;
        }

        const target = questions.splice(qIdx, 1)[0];
        questions.splice(newIdx, 0, target);
        next[mIdx].lessons[lIdx].quiz!.questions = questions;

        setLocalModules(next);
        setJumpIndices(prev => { const n = { ...prev }; delete n[key]; return n; });
    };

    const updateQuestionText = (mIdx: number, lIdx: number, qIdx: number, text: string) => {
        const next = [...localModules];
        const quiz = next[mIdx].lessons[lIdx].quiz;
        if (quiz) {
            quiz.questions[qIdx].text = text;
            setLocalModules(next);
        }
    };

    const updateQuestionExplanation = (mIdx: number, lIdx: number, qIdx: number, explanation: string) => {
        const next = [...localModules];
        const quiz = next[mIdx].lessons[lIdx].quiz;
        if (quiz) {
            quiz.questions[qIdx].explanation = explanation;
            setLocalModules(next);
        }
    };

    const addOption = (mIdx: number, lIdx: number, qIdx: number) => {
        const next = [...localModules];
        const options = next[mIdx].lessons[lIdx].quiz?.questions[qIdx].options;
        if (options && options.length >= 5) {
            toast.error("Máximo de 5 opções permitido.");
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
            case 'PDF': return <LucideFileText className="h-4 w-4 text-rose-500" />;
            case 'HTML': return <LucideGlobe className="h-4 w-4 text-blue-500" />;
            case 'ZIP': return <LucideFileJson className="h-4 w-4 text-amber-500" />;
            default: return <LucideFileText className="h-4 w-4 text-slate-400" />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-24 px-4 md:px-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6">
                <div className="flex items-center gap-3.5">
                    <Link
                        to="/instructor"
                        className="p-2 rounded-lg border border-slate-200/80 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
                        title="Voltar para painel"
                    >
                        <LucideChevronLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                            <Link to="/instructor" className="hover:text-slate-700 transition-colors">Painel</Link>
                            <span className="text-slate-300">/</span>
                            <span className="truncate max-w-[200px] md:max-w-sm text-slate-700 font-medium">{courseTitle}</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Grade Curricular</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs shadow-2xs transition-colors disabled:opacity-50"
                    >
                        {isSaving ? (
                            <LoadingSpinner size="sm" variant="white" />
                        ) : (
                            <LucideSave className="h-4 w-4" />
                        )}
                        <span>{isSaving ? "Salvando..." : "Salvar alterações"}</span>
                    </button>
                </div>
            </div>

            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

            {/* Syllabus Editor */}
            <div className="space-y-6">
                {localModules.map((module, mIdx) => (
                    <div key={mIdx} className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
                        {/* Module Header */}
                        <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <div className="flex items-center gap-1.5 bg-white rounded-lg px-2.5 py-1 border border-slate-200 text-xs text-slate-600 shadow-2xs focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400/20 transition-all">
                                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider select-none">Módulo</span>
                                        <input
                                            type="number"
                                            className="w-7 bg-transparent text-center font-bold text-xs text-slate-800 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            value={jumpIndices[`m-${mIdx}`] !== undefined ? jumpIndices[`m-${mIdx}`] : String(mIdx + 1).padStart(2, '0')}
                                            onChange={(e) => setJumpIndices(prev => ({ ...prev, [`m-${mIdx}`]: e.target.value }))}
                                            onKeyDown={(e) => e.key === 'Enter' && jumpModule(mIdx)}
                                        />
                                    </div>
                                    {jumpIndices[`m-${mIdx}`] !== undefined && parseInt(jumpIndices[`m-${mIdx}`]) !== (mIdx + 1) && (
                                        <button
                                            onClick={() => jumpModule(mIdx)}
                                            className="h-7 w-7 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-colors shadow-2xs"
                                            title="Confirmar nova ordem"
                                        >
                                            <LucideCheck className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                                <input
                                    className="bg-transparent text-base font-semibold text-slate-900 outline-none focus:text-slate-900 placeholder:text-slate-400 transition-colors w-full"
                                    value={module.title}
                                    onChange={(e) => updateModuleTitle(mIdx, e.target.value)}
                                    placeholder="Nome do módulo"
                                />
                            </div>
                            <button
                                onClick={() => removeModule(mIdx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Excluir módulo"
                            >
                                <LucideTrash2 className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Lessons List Area */}
                        <div className="p-4 md:p-6 space-y-4 bg-slate-50/40">
                            {module.lessons.map((lesson, lIdx) => (
                                <div key={lesson.id || `new-${mIdx}-${lIdx}`} className="bg-white border border-slate-200/80 rounded-xl p-4 md:p-5 shadow-2xs space-y-4 transition-colors hover:border-slate-300">
                                    {/* Lesson Header Row */}
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <div className="flex items-center gap-1 bg-slate-100/80 rounded-md px-2 py-0.5 border border-slate-200/60 text-xs text-slate-600 focus-within:border-slate-400 focus-within:bg-white transition-all">
                                                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider select-none">Aula</span>
                                                    <input
                                                        type="number"
                                                        className="w-6 bg-transparent text-center font-bold text-xs text-slate-800 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        value={jumpIndices[`l-${mIdx}-${lIdx}`] !== undefined ? jumpIndices[`l-${mIdx}-${lIdx}`] : String(lIdx + 1).padStart(2, '0')}
                                                        onChange={(e) => setJumpIndices(prev => ({ ...prev, [`l-${mIdx}-${lIdx}`]: e.target.value }))}
                                                        onKeyDown={(e) => e.key === 'Enter' && jumpLesson(mIdx, lIdx)}
                                                    />
                                                </div>
                                                {jumpIndices[`l-${mIdx}-${lIdx}`] !== undefined && parseInt(jumpIndices[`l-${mIdx}-${lIdx}`]) !== (lIdx + 1) && (
                                                    <button
                                                        onClick={() => jumpLesson(mIdx, lIdx)}
                                                        className="h-6 w-6 rounded-md bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-colors shadow-2xs"
                                                        title="Confirmar posição"
                                                    >
                                                        <LucideCheck className="h-3 w-3" />
                                                    </button>
                                                )}
                                            </div>
                                            {lesson.title && (
                                                <span className="text-xs text-slate-500 truncate hidden sm:inline">
                                                    — {lesson.title}
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => removeLesson(mIdx, lIdx)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                            title="Remover aula"
                                        >
                                            <LucideTrash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                                        {/* Lesson Info */}
                                        <div className="lg:col-span-8 space-y-4">
                                            <div>
                                                <label className="text-xs font-medium text-slate-700 mb-1.5 block">Título da aula</label>
                                                <input
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 transition-colors"
                                                    value={lesson.title}
                                                    onChange={(e) => updateLesson(mIdx, lIdx, { title: e.target.value })}
                                                    placeholder="Ex: Introdução e conceitos fundamentais"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs font-medium text-slate-700 mb-1.5 block">
                                                    Descrição da aula <span className="text-slate-400 font-normal">(opcional)</span>
                                                </label>
                                                <textarea
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 transition-colors min-h-[72px] resize-y"
                                                    value={lesson.description || ''}
                                                    onChange={(e) => updateLesson(mIdx, lIdx, { description: e.target.value })}
                                                    placeholder="Uma breve introdução sobre o que será tratado nesta aula..."
                                                />
                                            </div>

                                            {lesson.contentType === 'VIDEO' && (
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-slate-700 block">Link ou ID do YouTube</label>
                                                    <div className="relative">
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500">
                                                            <LucidePlay className="h-4 w-4 fill-current" />
                                                        </div>
                                                        <input
                                                            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 transition-colors"
                                                            value={lesson.youtubeId || ''}
                                                            onChange={(e) => handleYoutubeIdChange(mIdx, lIdx, e.target.value)}
                                                            placeholder="Cole a URL ou código do vídeo"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {lesson.contentType === 'PDF' && (
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-slate-700 block">Arquivo PDF da aula</label>
                                                    
                                                    {lesson.pdfUrl ? (
                                                        <div className="flex items-center justify-between p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-lg">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                                                    <LucideFileText className="h-4 w-4" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-semibold text-emerald-900 truncate">PDF Carregado</p>
                                                                    <p className="text-[11px] text-emerald-600 truncate">Conteúdo protegido para alunos</p>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={() => updateLesson(mIdx, lIdx, { pdfUrl: undefined })}
                                                                className="p-1.5 rounded-lg text-emerald-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                                title="Remover PDF"
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
                                                            className="w-full py-6 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:border-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                                        >
                                                            {uploadingFor === `${mIdx}-${lIdx}-pdfMain` ? (
                                                                <div className="flex items-center gap-2 text-xs font-medium text-amber-600">
                                                                    <LoadingSpinner size="sm" variant="primary" />
                                                                    <span>Enviando... {uploadProgress}%</span>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                                                                        <LucideUploadCloud className="h-4 w-4" />
                                                                    </div>
                                                                    <span className="text-xs font-medium text-slate-700">Selecionar arquivo PDF da aula</span>
                                                                    <span className="text-[11px] text-slate-400">PDF de até 50MB</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {lesson.contentType === 'ESSAY' && (
                                                <div className="space-y-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-medium text-slate-700 block">Instruções / Enunciado do Desafio</label>
                                                        <textarea
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 transition-colors min-h-[100px] resize-y"
                                                            value={lesson.content || ''}
                                                            onChange={(e) => updateLesson(mIdx, lIdx, { content: e.target.value })}
                                                            placeholder="Descreva o que o aluno deve fazer neste desafio..."
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-medium text-slate-700 block">
                                                            Prazo de entrega <span className="text-slate-400 font-normal">(opcional)</span>
                                                        </label>
                                                        <input
                                                            type="datetime-local"
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 transition-colors"
                                                            value={lesson.deadline ? new Date(new Date(lesson.deadline).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (!val) {
                                                                    updateLesson(mIdx, lIdx, { deadline: undefined });
                                                                    return;
                                                                }
                                                                const date = new Date(val);
                                                                updateLesson(mIdx, lIdx, { deadline: date.toISOString() });
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {lesson.contentType === 'QUIZ' && (
                                                <div className="space-y-3 pt-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <LucideHelpCircle className="h-4 w-4 text-slate-500" />
                                                            <span className="text-xs font-semibold text-slate-800">Questões do Quiz</span>
                                                        </div>
                                                        <button
                                                            onClick={() => addQuestion(mIdx, lIdx)}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors shadow-2xs"
                                                        >
                                                            <LucidePlus className="h-3.5 w-3.5" /> Adicionar pergunta
                                                        </button>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {lesson.quiz?.questions.map((q, qIdx) => (
                                                            <div key={qIdx} className="bg-slate-50/70 border border-slate-200/80 rounded-lg p-3.5 md:p-4 space-y-3 relative">
                                                                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className="flex items-center gap-1 bg-white rounded-md px-2 py-0.5 border border-slate-200 text-xs text-slate-600 focus-within:border-slate-400 transition-all">
                                                                            <span className="text-[10px] font-medium text-slate-400 uppercase select-none">Questão</span>
                                                                            <input
                                                                                type="number"
                                                                                className="w-5 bg-transparent text-center font-bold text-xs text-slate-800 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                                value={jumpIndices[`q-${mIdx}-${lIdx}-${qIdx}`] !== undefined ? jumpIndices[`q-${mIdx}-${lIdx}-${qIdx}`] : String(qIdx + 1).padStart(2, '0')}
                                                                                onChange={(e) => setJumpIndices(prev => ({ ...prev, [`q-${mIdx}-${lIdx}-${qIdx}`]: e.target.value }))}
                                                                                onKeyDown={(e) => e.key === 'Enter' && jumpQuestion(mIdx, lIdx, qIdx)}
                                                                            />
                                                                        </div>
                                                                        {jumpIndices[`q-${mIdx}-${lIdx}-${qIdx}`] !== undefined && parseInt(jumpIndices[`q-${mIdx}-${lIdx}-${qIdx}`]) !== (qIdx + 1) && (
                                                                            <button
                                                                                onClick={() => jumpQuestion(mIdx, lIdx, qIdx)}
                                                                                className="h-6 w-6 rounded-md bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-colors shadow-2xs"
                                                                                title="Confirmar ordem"
                                                                            >
                                                                                <LucideCheck className="h-3 w-3" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => removeQuestion(mIdx, lIdx, qIdx)}
                                                                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                                        title="Remover pergunta"
                                                                    >
                                                                        <LucideTrash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <label className="text-xs font-medium text-slate-700 block">Enunciado da pergunta</label>
                                                                    <input
                                                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 transition-colors font-medium"
                                                                        value={q.text}
                                                                        onChange={(e) => updateQuestionText(mIdx, lIdx, qIdx, e.target.value)}
                                                                        placeholder="Ex: Qual o principal benefício do método?"
                                                                    />
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <label className="text-xs font-medium text-slate-700 block">
                                                                        Explicação da resposta <span className="text-slate-400 font-normal">(opcional)</span>
                                                                    </label>
                                                                    <textarea
                                                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-slate-400 transition-colors min-h-[56px] resize-none"
                                                                        value={q.explanation || ''}
                                                                        onChange={(e) => updateQuestionExplanation(mIdx, lIdx, qIdx, e.target.value)}
                                                                        placeholder="Ex: A resposta correta é a B porque..."
                                                                    />
                                                                </div>

                                                                <div className="space-y-2 pt-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs font-medium text-slate-600">Alternativas</span>
                                                                        <button
                                                                            onClick={() => addOption(mIdx, lIdx, qIdx)}
                                                                            disabled={(q.options?.length || 0) >= 5}
                                                                            className="text-xs text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                                                        >
                                                                            <LucidePlus className="h-3 w-3" />
                                                                            <span>{(q.options?.length || 0) >= 5 ? 'Limite de 5' : 'Adicionar opção'}</span>
                                                                        </button>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        {q.options.map((opt, oIdx) => (
                                                                            <div key={oIdx} className="flex items-center gap-2">
                                                                                <button
                                                                                    onClick={() => updateOption(mIdx, lIdx, qIdx, oIdx, { isCorrect: !opt.isCorrect })}
                                                                                    className={`h-7 w-7 shrink-0 rounded-md flex items-center justify-center border transition-all ${
                                                                                        opt.isCorrect
                                                                                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                                                                                            : 'bg-white border-slate-200 text-slate-300 hover:border-slate-400'
                                                                                    }`}
                                                                                    title={opt.isCorrect ? "Alternativa correta" : "Marcar como correta"}
                                                                                >
                                                                                    <LucideCheck className="h-3.5 w-3.5" />
                                                                                </button>
                                                                                <input
                                                                                    className={`flex-1 bg-white border rounded-lg px-3 py-1.5 text-xs outline-none transition-all ${
                                                                                        opt.isCorrect
                                                                                            ? 'border-emerald-300 ring-1 ring-emerald-200 text-slate-900 font-medium'
                                                                                            : 'border-slate-200 focus:border-slate-400 text-slate-700'
                                                                                    }`}
                                                                                    value={opt.text}
                                                                                    onChange={(e) => updateOption(mIdx, lIdx, qIdx, oIdx, { text: e.target.value })}
                                                                                    placeholder={`Alternativa ${oIdx + 1}`}
                                                                                />
                                                                                <button
                                                                                    onClick={() => removeOption(mIdx, lIdx, qIdx, oIdx)}
                                                                                    className="h-7 w-7 shrink-0 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center"
                                                                                    title="Remover opção"
                                                                                >
                                                                                    <LucideX className="h-3.5 w-3.5" />
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
                                        <div className="lg:col-span-4 space-y-3.5">
                                            <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                                                <label className="text-xs font-medium text-slate-700 mb-2.5 block">Tipo de conteúdo</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {([
                                                        { value: 'VIDEO', label: 'Vídeo', icon: <LucidePlay className="h-4 w-4" /> },
                                                        { value: 'PDF', label: 'PDF', icon: <LucideFileText className="h-4 w-4" /> },
                                                        { value: 'QUIZ', label: 'Quiz', icon: <LucideHelpCircle className="h-4 w-4" /> },
                                                        { value: 'ESSAY', label: 'Desafio', icon: <LucideZap className="h-4 w-4" /> },
                                                    ] as const).map((opt) => {
                                                        const isActive = (lesson.contentType || 'VIDEO') === opt.value;
                                                        return (
                                                            <button
                                                                key={opt.value}
                                                                type="button"
                                                                onClick={() => updateLesson(mIdx, lIdx, { contentType: opt.value as any })}
                                                                className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-lg border text-xs transition-all ${
                                                                    isActive
                                                                        ? 'bg-slate-900 border-slate-900 text-white font-semibold shadow-2xs'
                                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 font-medium'
                                                                }`}
                                                            >
                                                                {opt.icon}
                                                                <span>{opt.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {lesson.contentType === 'PDF' && (
                                                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                                                            lesson.allowPdfDownload !== false ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'
                                                        }`}>
                                                            <LucideDownload className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-medium text-slate-800">Liberar download</p>
                                                            <p className="text-[11px] text-slate-400 truncate">Permitir salvar arquivo</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked={lesson.allowPdfDownload !== false}
                                                        onClick={() => {
                                                            const isAllowed = lesson.allowPdfDownload !== false;
                                                            updateLesson(mIdx, lIdx, { allowPdfDownload: !isAllowed });
                                                        }}
                                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                            lesson.allowPdfDownload !== false ? 'bg-amber-500' : 'bg-slate-200'
                                                        }`}
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                                                lesson.allowPdfDownload !== false ? 'translate-x-5' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>
                                                </div>
                                            )}

                                            {lesson.contentType === 'VIDEO' && (
                                                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/80 bg-white">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                                                            lesson.allowSeeking !== false ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'
                                                        }`}>
                                                            {lesson.allowSeeking !== false ? <LucideUnlock className="h-4 w-4" /> : <LucideLock className="h-4 w-4" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-medium text-slate-800">Liberar avanço</p>
                                                            <p className="text-[11px] text-slate-400 truncate">Pular partes do vídeo</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked={lesson.allowSeeking !== false}
                                                        onClick={() => {
                                                            const isAllowed = lesson.allowSeeking !== false;
                                                            updateLesson(mIdx, lIdx, { allowSeeking: !isAllowed });
                                                        }}
                                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                            lesson.allowSeeking !== false ? 'bg-amber-500' : 'bg-slate-200'
                                                        }`}
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                                                lesson.allowSeeking !== false ? 'translate-x-5' : 'translate-x-0'
                                                            }`}
                                                        />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Materials Section */}
                                    <div className="mt-5 pt-4 border-t border-slate-100">
                                        <div className="flex items-center justify-between gap-3 mb-3">
                                            <span className="text-xs font-medium text-slate-700">Materiais de apoio</span>
                                            <button
                                                onClick={() => {
                                                    setPendingUploadTarget(`${mIdx}-${lIdx}`);
                                                    fileInputRef.current?.click();
                                                }}
                                                disabled={!!uploadingFor}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs disabled:opacity-50"
                                            >
                                                {uploadingFor === `${mIdx}-${lIdx}` ? (
                                                    <><LoadingSpinner size="xs" variant="primary" /> <span className="text-[11px]">{uploadProgress === 100 ? 'Processando...' : `${uploadProgress}%`}</span></>
                                                ) : (
                                                    <><LucideUploadCloud className="h-3.5 w-3.5 text-slate-500" /> <span>Anexar</span></>
                                                )}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                            {lesson.materials?.map((mat: any, matIdx: number) => (
                                                <div key={matIdx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/80">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="h-8 w-8 shrink-0 rounded-md bg-white border border-slate-200 flex items-center justify-center">
                                                            {getMaterialIcon(mat.type)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-medium text-slate-800 truncate">{mat.name}</p>
                                                            <p className="text-[11px] text-slate-400">
                                                                <span className="font-medium text-slate-600">{mat.type}</span> • {mat.size}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => removeMaterial(mIdx, lIdx, matIdx)}
                                                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                        title="Remover material"
                                                    >
                                                        <LucideX className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                            {(!lesson.materials || lesson.materials.length === 0) && (
                                                <div className="md:col-span-2 text-center py-4 border border-dashed border-slate-200 rounded-lg bg-slate-50/40">
                                                    <p className="text-xs text-slate-400">Nenhum anexo para esta aula</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="px-4 md:px-6 pb-4 md:pb-6">
                            <button
                                onClick={() => addLesson(mIdx)}
                                className="w-full py-2.5 border border-dashed border-slate-300 hover:border-slate-400 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50/70 transition-colors text-xs font-medium flex items-center justify-center gap-1.5"
                            >
                                <LucidePlus className="h-4 w-4" />
                                <span>Adicionar aula</span>
                            </button>
                        </div>
                    </div>
                ))}

                <button
                    onClick={addModule}
                    className="w-full py-3.5 border border-dashed border-slate-300 hover:border-amber-400/80 rounded-2xl text-slate-600 hover:text-amber-800 hover:bg-amber-50/20 transition-colors text-xs font-medium flex items-center justify-center gap-2"
                >
                    <LucidePlus className="h-4 w-4 text-amber-600" />
                    <span>Novo módulo de estudo</span>
                </button>
            </div>

            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                onClose={() => !isSaving && setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                isLoading={isSaving}
                title={confirmModal.title}
                description={confirmModal.description}
                confirmText="Sim, Remover"
            />
        </div>
    );
}
