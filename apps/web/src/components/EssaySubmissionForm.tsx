import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LucideFileText, LucideCheck, LucideDownload, LucideX, LucideZap, LucidePlay, LucideChevronRight } from "lucide-react";
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
    const [essayResponse, setEssayResponse] = useState(mySubmission?.content || "");
    const [essayFile, setEssayFile] = useState<{ url: string; name: string } | null>(
        mySubmission?.fileUrl ? { url: mySubmission.fileUrl, name: mySubmission.fileName || "arquivo-anexo" } : null
    );
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sync state with prop when it changes (essential for async data)
    useEffect(() => {
        if (mySubmission) {
            setEssayResponse(mySubmission.content || "");
            if (mySubmission.fileUrl) {
                setEssayFile({ url: mySubmission.fileUrl, name: mySubmission.fileName || "arquivo-anexo" });
            }
        }
    }, [mySubmission]);

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
        } catch (err) {
            console.error(err);
            alert("Erro ao enviar resposta.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isReviewed = mySubmission?.status === 'REVIEWED';

    if (isLoading) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full bg-card p-6 md:p-10 border border-border/50 rounded-[2rem] shadow-sm space-y-10 animate-pulse">
                <div className="h-32 bg-slate-100 rounded-[2rem] w-full" />
                <div className="space-y-4">
                    <div className="h-4 bg-slate-50 rounded w-24" />
                    <div className="h-48 bg-slate-50 rounded-[2rem] w-full" />
                </div>
                <div className="h-16 bg-slate-50 rounded-2xl w-full" />
            </motion.div>
        );
    }

    return (
        <div className="w-full bg-card p-6 md:p-10 border border-border/50 rounded-[2rem] shadow-sm">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-3">
                    <div className="h-16 w-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                        <LucideFileText className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter italic text-slate-900">Desafio Dissertativo</h2>
                    <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
                        {lesson.content || "Leia as instruções e envie sua resposta ou anexo abaixo."}
                    </p>
                </div>

                {isReviewed && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-emerald-500">
                                <LucideCheck className="h-5 w-5" />
                                <span className="font-black uppercase tracking-widest text-[10px]">Desafio Corrigido</span>
                            </div>
                            <div className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-lg font-black italic">
                                {mySubmission.grade}/100
                            </div>
                        </div>
                        {mySubmission.feedback && (
                            <div className="p-4 bg-white/50 rounded-xl">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 italic">Feedback do Instrutor:</p>
                                <p className="text-sm font-medium text-slate-700 italic">"{mySubmission.feedback}"</p>
                            </div>
                        )}
                        {mySubmission.feedbackFileUrl && (
                            <div className="space-y-2 pt-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Material de Correção Anexado:</p>
                                <a 
                                    href={mySubmission.feedbackFileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between p-4 bg-white/60 border border-emerald-500/10 rounded-xl hover:bg-white transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500 border border-emerald-500/10">
                                            <LucideDownload className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold text-slate-800 truncate max-w-[180px]">{mySubmission.feedbackFileName || "Ver correção"}</p>
                                            <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Clique para baixar</p>
                                        </div>
                                    </div>
                                    <LucideChevronRight className="h-4 w-4 text-emerald-500/30 group-hover:text-emerald-500 transition-all" />
                                </a>
                            </div>
                        )}
                    </motion.div>
                )}

                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            Sua Resposta
                        </label>
                        <textarea 
                            value={essayResponse}
                            onChange={(e) => setEssayResponse(e.target.value)}
                            readOnly={!!mySubmission}
                            placeholder="Escreva sua resposta aqui..."
                            className={`w-full bg-white border border-slate-200 rounded-3xl p-8 text-slate-700 font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[300px] shadow-sm ${!!mySubmission ? 'opacity-70 cursor-not-allowed bg-slate-50/50' : ''}`}
                        />
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <input type="file" id="essay-file-upload" className="hidden" onChange={handleFileUpload} disabled={!!mySubmission} />
                            {essayFile ? (
                                <div className="flex items-center justify-between p-5 bg-primary/5 border border-primary/10 rounded-2xl h-16 transition-all group">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm border border-primary/10 shrink-0">
                                            <LucideFileText className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-slate-800 truncate max-w-[150px]">{essayFile.name}</p>
                                            <p className="text-[9px] font-bold text-primary uppercase tracking-widest mt-0.5">Arquivo Anexado</p>
                                        </div>
                                    </div>
                                    {!mySubmission && (
                                        <button onClick={() => setEssayFile(null)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors">
                                            <LucideX className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => document.getElementById('essay-file-upload')?.click()}
                                    disabled={isUploading || !!mySubmission}
                                    className="w-full h-16 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-400 hover:border-primary/50 hover:text-primary transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? (
                                        <><LoadingSpinner size="sm" variant="primary" /> {uploadProgress}%</>
                                    ) : (
                                        <><LucidePlay className="h-4 w-4 group-hover:text-primary transition-colors rotate-90" /> <span className="text-[10px] font-black uppercase tracking-widest">Anexar material extra</span></>
                                    )}
                                </button>
                            )}
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || (!essayResponse.trim() && !essayFile) || !!mySubmission}
                            className="flex-1 h-16 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale shrink-0"
                        >
                            {isSubmitting ? (
                                <><LoadingSpinner size="sm" variant="white" /> Enviando...</>
                            ) : (
                                <>
                                    <LucideZap className={`h-5 w-5 ${!mySubmission ? 'fill-current' : ''}`} /> 
                                    {mySubmission ? 'DESAFIO ENVIADO' : 'ENVIAR RESPOSTA'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
