import { useState, useEffect } from "react";
import { LucideFileText, LucideCheck, LucideDownload, LucideX, LucideZap, LucideChevronRight, LucideRefreshCw, LucidePaperclip, LucideClock } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";
import api from "../utils/api";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface EssaySubmissionFormProps {
    lesson: any;
    mySubmission: any;
    isLoading?: boolean;
    onSuccess: () => void;
    markAsCompleted: () => void;
}

export default function EssaySubmissionForm({ lesson, mySubmission, isLoading, onSuccess, markAsCompleted }: EssaySubmissionFormProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Synchronous initialization to prevent race conditions
    const [essayResponse, setEssayResponse] = useState(() => {
        if (typeof window === 'undefined' || !lesson?.id) return "";
        const saved = localStorage.getItem(`draft_essay_${lesson.id}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return (parsed.content ?? (mySubmission?.lessonId === lesson.id ? mySubmission?.content : "")) || "";
            } catch { return (mySubmission?.lessonId === lesson.id ? mySubmission?.content : "") || ""; }
        }
        return (mySubmission?.lessonId === lesson.id ? mySubmission?.content : "") || "";
    });

    const [essayFile, setEssayFile] = useState<{ url: string; name: string } | null>(() => {
        if (typeof window === 'undefined' || !lesson?.id) {
            return mySubmission?.lessonId === lesson.id && mySubmission?.fileUrl ? { url: mySubmission.fileUrl, name: mySubmission.fileName || "arquivo-anexo" } : null;
        }
        const saved = localStorage.getItem(`draft_essay_${lesson.id}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return parsed.file ?? (mySubmission?.lessonId === lesson.id && mySubmission?.fileUrl ? { url: mySubmission.fileUrl, name: mySubmission.fileName || "arquivo-anexo" } : null);
            } catch { return null; }
        }
        return mySubmission?.lessonId === lesson.id && mySubmission?.fileUrl ? { url: mySubmission.fileUrl, name: mySubmission.fileName || "arquivo-anexo" } : null;
    });

    useEffect(() => {
        const isRedoRequired = mySubmission?.status === 'REDO_REQUIRED';
        const isLocked = !!mySubmission && !isRedoRequired;

        if (mySubmission && mySubmission.lessonId !== lesson?.id) return;

        if (isLocked) {
            setEssayResponse(mySubmission.content || "");
            setEssayFile(mySubmission.fileUrl ? { url: mySubmission.fileUrl, name: mySubmission.fileName || "arquivo-anexo" } : null);
        } else if (lesson?.id && mySubmission) {
            const savedDraft = localStorage.getItem(`draft_essay_${lesson.id}`);
            if (!savedDraft) {
                setEssayResponse(mySubmission.content || "");
                setEssayFile(mySubmission.fileUrl ? { url: mySubmission.fileUrl, name: mySubmission.fileName || "arquivo-anexo" } : null);
            }
        }
    }, [mySubmission, lesson?.id]);

    // Auto-save Draft
    useEffect(() => {
        const isRedoRequired = mySubmission?.status === 'REDO_REQUIRED';
        const isLocked = !!mySubmission && !isRedoRequired;
        
        if (!isLocked && lesson?.id && !isLoading) {
            const draft = { content: essayResponse, file: essayFile };
            localStorage.setItem(`draft_essay_${lesson.id}`, JSON.stringify(draft));
        }
    }, [essayResponse, essayFile, lesson?.id, mySubmission, isLoading]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
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
                    setUploadProgress(percent);
                }
            });

            const publicUrl = `${supabaseUrl}/storage/v1/object/public/course-images/${filePath}`;
            setEssayFile({ url: publicUrl, name: file.name });
        } catch (err) {
            console.error(err);
            alert("Erro ao enviar arquivo. Tente novamente.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!lesson?.id) return;
        setIsSubmitting(true);
        try {
            await api.post('/essay-submissions', {
                lessonId: lesson.id,
                content: essayResponse,
                fileUrl: essayFile?.url,
                fileName: essayFile?.name
            });
            markAsCompleted();
            onSuccess();
            if (lesson?.id) {
                localStorage.removeItem(`draft_essay_${lesson.id}`);
            }
        } catch (err) {
            console.error(err);
            alert("Erro ao enviar resposta.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isReviewed = mySubmission?.status === 'REVIEWED';
    const isRedoRequired = mySubmission?.status === 'REDO_REQUIRED';
    const isExpired = lesson.deadline && new Date() > new Date(lesson.deadline);
    const isLocked = (!!mySubmission && !isRedoRequired) || (isExpired && !mySubmission);

    if (isLoading) {
        return (
            <div className="w-full max-w-4xl mx-auto bg-white p-6 md:p-8 border border-slate-200/80 rounded-2xl shadow-2xs space-y-6 animate-pulse">
                <div className="h-6 bg-slate-100 rounded w-48 mx-auto" />
                <div className="h-24 bg-slate-50 rounded-xl w-full" />
                <div className="h-48 bg-slate-50 rounded-xl w-full" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto bg-white p-6 md:p-8 border border-slate-200/80 rounded-2xl shadow-2xs space-y-6">
            {/* Header & Instructions */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60 shrink-0">
                            <LucideFileText className="h-4 w-4" />
                        </div>
                        <h2 className="text-base font-bold text-slate-900 tracking-tight">
                            {lesson.title || "Desafio Prático"}
                        </h2>
                    </div>

                    {lesson.deadline && (
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border shrink-0 ${
                            isExpired 
                                ? 'bg-rose-50 text-rose-700 border-rose-200/60' 
                                : 'bg-slate-50 text-slate-600 border-slate-200/60'
                        }`}>
                            <LucideClock className="h-3.5 w-3.5" />
                            <span>
                                Prazo: {new Date(lesson.deadline).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isExpired && <span className="font-semibold text-rose-700 ml-0.5">• Expirado</span>}
                        </div>
                    )}
                </div>

                {lesson.content && (
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 md:p-5">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Instruções do Desafio
                        </p>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {lesson.content}
                        </p>
                    </div>
                )}
            </div>

            {/* Expired Notice (if expired and not submitted) */}
            {isExpired && !mySubmission && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50/70 border border-rose-200/80 text-rose-900">
                    <div className="h-8 w-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                        <LucideX className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-rose-900">Prazo de envio encerrado</p>
                        <p className="text-xs text-rose-700 leading-relaxed mt-0.5">
                            O limite para envio deste desafio foi finalizado. Não é mais possível submeter novas respostas.
                        </p>
                    </div>
                </div>
            )}

            {/* Review & Feedback Section */}
            {(isReviewed || isRedoRequired) && (
                <div className={`p-4 md:p-5 border rounded-xl space-y-3 ${
                    isRedoRequired 
                        ? 'bg-amber-50/60 border-amber-200 text-amber-950' 
                        : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {isRedoRequired ? (
                                <LucideRefreshCw className="h-4 w-4 text-amber-600 animate-spin-slow" />
                            ) : (
                                <LucideCheck className="h-4 w-4 text-emerald-600" />
                            )}
                            <span className="font-semibold text-xs">
                                {isRedoRequired ? 'Refação Solicitada pelo Instrutor' : 'Desafio Avaliado e Corrigido'}
                            </span>
                        </div>
                        {mySubmission.grade !== null && !isRedoRequired && (
                            <div className="bg-slate-900 text-white px-2.5 py-0.5 rounded-md text-xs font-semibold">
                                Nota: {mySubmission.grade}/100
                            </div>
                        )}
                    </div>
                    
                    {isRedoRequired && (
                        <p className="text-xs text-amber-800 leading-relaxed">
                            O instrutor solicitou que você revise sua resposta. Veja o feedback abaixo e envie uma versão corrigida.
                        </p>
                    )}

                    {mySubmission.feedback && (
                        <div className="p-3 bg-white/80 rounded-lg border border-slate-200/60">
                            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Feedback do Instrutor</p>
                            <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">{mySubmission.feedback}</p>
                        </div>
                    )}

                    {mySubmission.feedbackFileUrl && (
                        <div className="pt-1">
                            <a 
                                href={mySubmission.feedbackFileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
                            >
                                <LucideDownload className="h-3.5 w-3.5 text-slate-500" />
                                <span>{mySubmission.feedbackFileName || "Baixar arquivo de correção"}</span>
                            </a>
                        </div>
                    )}
                </div>
            )}

            {/* Answer Input & Actions */}
            {(!isExpired || !!mySubmission) && (
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-medium text-slate-700 block mb-1.5">
                            Sua Resposta
                        </label>
                        <textarea 
                            value={essayResponse}
                            onChange={(e) => setEssayResponse(e.target.value)}
                            readOnly={isLocked}
                            placeholder="Escreva sua resposta detalhada para este desafio..."
                            className={`w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 outline-none transition-colors min-h-[200px] resize-y ${
                                isLocked ? 'opacity-70 cursor-not-allowed bg-slate-50/50' : ''
                            }`}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="w-full sm:flex-1">
                            <input type="file" id="essay-file-upload" className="hidden" onChange={handleFileUpload} disabled={isLocked} />
                            {essayFile ? (
                                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg h-10 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <LucideFileText className="h-4 w-4 text-amber-600 shrink-0" />
                                        <span className="text-xs font-medium text-slate-800 truncate max-w-[200px]">{essayFile.name}</span>
                                    </div>
                                    {!isLocked && (
                                        <button 
                                            onClick={() => setEssayFile(null)} 
                                            className="p-1 hover:text-rose-600 text-slate-400 rounded transition-colors"
                                            title="Remover anexo"
                                        >
                                            <LucideX className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => document.getElementById('essay-file-upload')?.click()}
                                    disabled={isUploading || isLocked}
                                    className="w-full h-10 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg flex items-center justify-center gap-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? (
                                        <><LoadingSpinner size="xs" variant="primary" /> <span className="text-xs">Enviando {uploadProgress}%</span></>
                                    ) : (
                                        <><LucidePaperclip className="h-3.5 w-3.5 text-slate-500" /> <span>Anexar arquivo complementar</span></>
                                    )}
                                </button>
                            )}
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || (!essayResponse.trim() && !essayFile) || isLocked}
                            className={`w-full sm:w-auto min-w-[160px] h-10 px-5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors shrink-0 ${
                                isSubmitting || (!essayResponse.trim() && !essayFile) || isLocked 
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none' 
                                    : isRedoRequired 
                                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs' 
                                        : 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs'
                            }`}
                        >
                            {isSubmitting ? (
                                <><LoadingSpinner size="xs" variant="white" /> Enviando...</>
                            ) : (
                                <>
                                    <LucideZap className="h-3.5 w-3.5" /> 
                                    <span>
                                        {isExpired && !mySubmission 
                                            ? 'Prazo Expirado' 
                                            : (isRedoRequired ? 'Reenviar Correção' : (mySubmission ? 'Desafio Enviado' : 'Enviar Resposta'))}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
