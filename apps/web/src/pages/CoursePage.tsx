import { motion, AnimatePresence } from "framer-motion";
import {
    LucideChevronLeft, LucidePlay, LucideCheck, LucideFileText,
    LucideX, LucideChevronRight, LucideDownload, LucideZap, LucideBookOpen
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useCourseStore } from "../store/courseStore";
import { jwtDecode } from "jwt-decode";
import YouTubePlayer from "../components/YouTubePlayer";
import LoadingSpinner from "../components/LoadingSpinner";
import SyllabusList from "../components/SyllabusList";
import CircularProgress from "../components/CircularProgress";
import EssaySubmissionForm from "../components/EssaySubmissionForm";
import api from "../utils/api";
import { resolveThumbnail } from "../utils/url";
import logo from "../assets/logo.png";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function CoursePage() {
    const { id } = useParams();
    const courses = useCourseStore(state => state.courses);
    const fetchCourseById = useCourseStore(state => state.fetchCourseById);
    const enrollInCourse = useCourseStore(state => state.enrollInCourse);
    const toggleLessonCompletion = useCourseStore(state => state.toggleLessonCompletion);

    const course = courses.find(c => c.id === id);

    const [currentModuleIdx, setCurrentModuleIdx] = useState(0);
    const [currentLessonIdx, setCurrentLessonIdx] = useState(0);
    const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({ 0: true });
    const [isFetching, setIsFetching] = useState(false);
    const [userRole, setUserRole] = useState<string>('STUDENT');
    
    // Quiz States
    const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizCorrect, setQuizCorrect] = useState(false);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [showFeedback, setShowFeedback] = useState(false);
    const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
    
    // Essay & Material States
    const [myEssaySubmission, setMyEssaySubmission] = useState<any>(null);
    const [isLoadingSubmission, setIsLoadingSubmission] = useState(false);

    const [indicesInitialized, setIndicesInitialized] = useState(false);
    const [hasResumed, setHasResumed] = useState<string | null>(null);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [isSyllabusOpen, setIsSyllabusOpen] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                setUserRole((decoded.role || 'STUDENT').toUpperCase());
            } catch { }
        }
    }, []);

    const formatDuration = (val: any) => {
        if (typeof val === 'string' && val.includes(':')) return val;
        const seconds = parseInt(val);
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const totalModuleDuration = (module: any) => {
        const total = (module.lessons || []).reduce((acc: number, l: any) => {
            if (typeof l.duration === 'string' && l.duration.includes(':')) {
                const [m, s] = l.duration.split(':').map(Number);
                return acc + m * 60 + (s || 0);
            }
            return acc + (parseInt(l.duration) || 0);
        }, 0);
        if (total === 0) return null;
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        if (h > 0) return `${h}h ${m > 0 ? m + 'min' : ''}`.trim();
        return `${m}min`;
    };

    useEffect(() => {
        if (id) {
            setIsFetching(true);
            fetchCourseById(id).finally(() => setIsFetching(false));
            setIndicesInitialized(false);
            setHasResumed(null);
        }
    }, [id, fetchCourseById]);

    useEffect(() => {
        if (course && !indicesInitialized && hasResumed !== id) {
            if (course.lastLessonId) {
                let found = false;
                for (let mIdx = 0; mIdx < (course.modules || []).length; mIdx++) {
                    const module = course.modules![mIdx];
                    const lIdx = (module.lessons || []).findIndex((l: any) => l.id === course.lastLessonId);
                    if (lIdx !== -1) {
                        setCurrentModuleIdx(mIdx);
                        setCurrentLessonIdx(lIdx);
                        setExpandedModules({ [mIdx]: true });
                        found = true;
                        break;
                    }
                }
                if (!found) { setCurrentModuleIdx(0); setCurrentLessonIdx(0); }
            } else {
                setCurrentModuleIdx(0);
                setCurrentLessonIdx(0);
            }
            setIndicesInitialized(true);
            setHasResumed(id!);
        }
    }, [course, id, indicesInitialized, hasResumed]);

    const currentModule = course?.modules?.[currentModuleIdx];
    const currentLesson = (currentModule as any)?.lessons?.[currentLessonIdx];

    const fetchMySubmission = async () => {
        if (!currentLesson?.id) return;
        setIsLoadingSubmission(true);
        try {
            const response = await api.get(`/essay-submissions/my/${currentLesson.id}`);
            if (response.data) setMyEssaySubmission(response.data);
            else setMyEssaySubmission(null);
        } catch (error) { 
            console.error("Error fetching submission:", error); 
            setMyEssaySubmission(null); 
        } finally {
            setIsLoadingSubmission(false);
        }
    };

    const markAsCompleted = () => {
        if (currentLesson?.id) toggleLessonCompletion(currentLesson.id, true);
    };

    useEffect(() => {
        setQuizSubmitted(false);
        setQuizAnswers({});
        setCurrentQuestionIdx(0);
        setShowFeedback(false);
        setMyEssaySubmission(null);
        if (currentLesson?.contentType === 'ESSAY') fetchMySubmission();
        if (currentLesson?.contentType === 'PDF' && !currentLesson.completed) markAsCompleted();
    }, [currentModuleIdx, currentLessonIdx, currentLesson?.id]);

    if (isFetching || !indicesInitialized || !course) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-10 overflow-hidden">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-8">
                <div className="relative">
                    <img src={logo} alt="Brilha Mais" className="h-12 w-auto grayscale brightness-0 opacity-5" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <LoadingSpinner size="lg" variant="primary" />
                    </div>
                </div>
                <div className="space-y-1.5 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Sincronizando Conteúdo</p>
                </div>
            </motion.div>
        </div>
    );

    const { isEnrolled, modules = [] } = course;
    const totalLessons = modules.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0);
    const completedLessons = modules.reduce((acc: number, m: any) => acc + (m.lessons?.filter((l: any) => l.completed).length || 0), 0);
    const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const handleEnroll = async () => {
        if (!id) return;
        setIsEnrolling(true);
        try { await enrollInCourse(id); } finally { setIsEnrolling(false); }
    };

    const handleQuizSubmit = async () => {
        setIsSubmittingQuiz(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        const questions = currentLesson?.quiz?.questions || [];
        const isAllCorrect = questions.every((q: any, idx: number) => {
            const correctOptionIdx = q.options.findIndex((o: any) => o.isCorrect);
            return quizAnswers[idx] === correctOptionIdx;
        });
        setQuizCorrect(isAllCorrect);
        setQuizSubmitted(true);
        markAsCompleted();
        setIsSubmittingQuiz(false);
    };

    const downloadMaterial = async (url: string, name: string, lessonId: string, originalUrl: string) => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
            // Record download silently using the original DB URL for matching
            api.post('/material-downloads', { lessonId, materialName: name, materialUrl: originalUrl }).catch(() => {});
        } catch {
            window.open(url, '_blank');
        }
    };

    const goToLesson = (mIdx: number, lIdx: number) => {
        setCurrentModuleIdx(mIdx);
        setCurrentLessonIdx(lIdx);
        setExpandedModules(prev => ({ ...prev, [mIdx]: true }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const isLessonLocked = (mIdx: number, lIdx: number) => {
        if (userRole === 'ADMIN' || userRole === 'INSTRUCTOR') return false;
        if (mIdx === 0 && lIdx === 0) return false;
        
        const targetModule = modules[mIdx];
        const prevLesson = lIdx > 0 
            ? targetModule?.lessons?.[lIdx - 1] 
            : mIdx > 0 ? modules[mIdx - 1]?.lessons?.[modules[mIdx - 1].lessons.length - 1] : null;
        
        return !prevLesson || !prevLesson.completed;
    };

    const getNextLessonIndices = () => {
        const lessons = modules[currentModuleIdx]?.lessons || [];
        if (currentLessonIdx + 1 < lessons.length) return { mIdx: currentModuleIdx, lIdx: currentLessonIdx + 1 };
        else if (currentModuleIdx + 1 < modules.length) return { mIdx: currentModuleIdx + 1, lIdx: 0 };
        return null;
    };

    const nextIndices = getNextLessonIndices();
    const isNextLocked = nextIndices ? isLessonLocked(nextIndices.mIdx, nextIndices.lIdx) : false;

    const hasNext = !!nextIndices;
    const hasPrev = currentLessonIdx > 0 || currentModuleIdx > 0;

    if (!isEnrolled) return (
        <div className="bg-background text-foreground min-h-screen flex flex-col lg:flex-row lg:items-stretch">
            <div className="relative w-full lg:sticky lg:top-0 lg:h-screen lg:w-[55%] flex-shrink-0 overflow-hidden bg-slate-900">
                <img src={resolveThumbnail(course.thumbnail)} alt={course.title} className="w-full h-auto lg:h-full lg:object-cover aspect-video lg:aspect-auto" />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent lg:hidden" />
                <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-r from-transparent to-background hidden lg:block" />
            </div>
            <div className="flex-1 flex flex-col justify-center px-10 py-16">
                <h1 className="text-5xl lg:text-7xl font-black leading-none tracking-tighter mb-8 uppercase italic text-slate-900">{course.title}</h1>
                <p className="text-muted-foreground text-lg mb-12 max-w-xl">{course.description}</p>
                <button onClick={handleEnroll} disabled={isEnrolling} className="w-full max-w-sm bg-primary text-primary-foreground py-6 rounded-2xl font-black uppercase tracking-widest text-lg shadow-2xl shadow-primary/30 border-b-6 border-primary-foreground/10 hover:brightness-110 active:scale-95 transition-all">
                    {isEnrolling ? 'Iniciando...' : 'Iniciar Curso'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="bg-background text-foreground">
            <div className="lg:max-w-[1200px] lg:mx-auto lg:flex lg:gap-0 w-full min-h-screen">
                <div className="flex-1 min-w-0 lg:border-r lg:border-border flex flex-col">
                    {/* Desktop Breadcrumbs */}
                    <div className="hidden lg:flex items-center gap-3 px-8 py-6">
                        <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                            <LucideChevronLeft className="h-4 w-4" />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-800">Painel do Aluno</span>
                        </Link>
                        <span className="text-border mx-2">/</span>
                        <span className="text-xs font-bold text-foreground/70">{currentLesson?.title || course.title}</span>
                    </div>

                    {/* Mobile Navigation Sub-header */}
                    <div className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-5 py-4 flex items-center justify-between shadow-sm">
                        <button 
                            onClick={() => setIsSyllabusOpen(true)}
                            className="flex items-center gap-2 bg-slate-50 border border-slate-100 hover:border-primary/20 px-3 py-2 rounded-xl transition-all active:scale-95 group"
                        >
                            <LucideBookOpen className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Trilha</span>
                        </button>

                        <div className="flex-1 px-4 text-center truncate">
                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">Aula Atual</p>
                            <p className="text-[11px] font-black uppercase italic tracking-tighter text-slate-900 truncate leading-tight">{currentLesson?.title}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <button 
                                onClick={() => {
                                    if (currentLessonIdx > 0) goToLesson(currentModuleIdx, currentLessonIdx - 1);
                                    else if (currentModuleIdx > 0) {
                                        const prevModule = modules[currentModuleIdx - 1];
                                        goToLesson(currentModuleIdx - 1, (prevModule?.lessons?.length || 1) - 1);
                                    }
                                }} 
                                disabled={!hasPrev}
                                className="h-9 w-9 rounded-xl border border-slate-100 bg-white flex items-center justify-center text-slate-400 active:scale-95 disabled:opacity-30 disabled:active:scale-100 transition-all shadow-sm"
                            >
                                <LucideChevronLeft className="h-4 w-4" />
                            </button>
                            <button 
                                onClick={() => {
                                    if (nextIndices) goToLesson(nextIndices.mIdx, nextIndices.lIdx);
                                }} 
                                disabled={!hasNext || isNextLocked}
                                className="h-9 w-9 rounded-xl border border-slate-100 bg-white flex items-center justify-center text-slate-400 active:scale-95 disabled:opacity-30 disabled:active:scale-100 transition-all shadow-sm"
                            >
                                <LucideChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="w-full flex-1 min-h-[50vh]">
                        {!currentLesson ? (
                            <div className="w-full aspect-video bg-card flex flex-col items-center justify-center p-8">
                                <LucideFileText className="h-12 w-12 text-muted-foreground mb-4" />
                                <h2 className="text-xl font-black italic uppercase">Nenhum conteúdo ainda</h2>
                            </div>
                        ) : (
                            <>
                                {currentLesson.contentType === 'VIDEO' && (
                                    <div className="relative aspect-video w-full bg-black">
                                        <YouTubePlayer key={currentLesson.id} videoId={currentLesson.youtubeId} isCompleted={!!currentLesson.completed} isPrivileged={userRole === 'INSTRUCTOR' || userRole === 'ADMIN'} onEnded={markAsCompleted} />
                                    </div>
                                )}
                                {currentLesson.contentType === 'PDF' && (
                                    <div className="w-full aspect-video bg-white relative group/pdfview overflow-hidden border-b border-border/10">
                                        {currentLesson.pdfUrl ? (
                                            <div className="w-full h-full flex flex-col">
                                                {/* Overlay top-right to block Google Viewer's pop-out button */}
                                                {currentLesson.allowPdfDownload === false && (
                                                    <>
                                                        <div className="absolute top-0 right-0 w-32 h-16 bg-white/0 z-50 cursor-not-allowed" />
                                                        <div className="absolute top-6 right-6 bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl border border-white/10 select-none z-[60]">
                                                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Apenas Visualização
                                                        </div>
                                                    </>
                                                )}
                                                <iframe 
                                                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(currentLesson.pdfUrl)}&embedded=true`} 
                                                    className="w-full flex-1 border-none"
                                                    title="PDF Viewer"
                                                />
                                                {currentLesson.allowPdfDownload !== false && (
                                                    <div className="absolute bottom-6 right-6 flex gap-3">
                                                        <button 
                                                            onClick={() => downloadMaterial(currentLesson.pdfUrl, `${currentLesson.title}.pdf`, currentLesson.id, currentLesson.pdfUrl)}
                                                            className="bg-primary text-white p-4 rounded-2xl shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-all flex items-center gap-3 group/pdl"
                                                        >
                                                            <LucideDownload className="h-5 w-5" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest max-w-0 overflow-hidden group-hover/pdl:max-w-[200px] transition-all duration-500 whitespace-nowrap">Baixar Arquivo</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                                                <LucideFileText className="h-16 w-16 text-slate-200 mb-4" />
                                                <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-400">Nenhum PDF disponível</h2>
                                                <p className="text-slate-400 text-xs mt-2 uppercase font-bold tracking-widest leading-relaxed">O instrutor ainda não enviou o conteúdo principal desta aula.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {currentLesson.contentType === 'QUIZ' && (
                                    <div className="w-full bg-card p-6 md:p-10 min-h-[400px]">
                                        <h2 className="text-2xl font-black text-center mb-8 uppercase italic tracking-tighter">Mini Teste</h2>
                                        {/* Quiz components could be extracted too, but leaving them simplified for now */}
                                        <div className="max-w-2xl mx-auto space-y-6">
                                            {(!quizSubmitted && (!currentLesson.completed || Object.keys(quizAnswers).length > 0)) ? (
                                                <div className="space-y-6">
                                                    {(() => {
                                                        const q = (currentLesson.quiz?.questions || [])[currentQuestionIdx];
                                                        if (!q) return null;
                                                        return (
                                                            <div className="space-y-4">
                                                                <p className="font-bold text-lg">{currentQuestionIdx + 1}. {q.text}</p>
                                                                <div className="grid gap-3">
                                                                    {q.options.map((opt: any, oIdx: number) => (
                                                                        <button key={oIdx} onClick={() => !showFeedback && setQuizAnswers({ ...quizAnswers, [currentQuestionIdx]: oIdx })} className={`p-4 rounded-xl border text-left font-bold text-xs uppercase tracking-tight transition-all ${quizAnswers[currentQuestionIdx] === oIdx ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-border'}`}>
                                                                            {opt.text}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                    <button onClick={handleQuizSubmit} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20">Finalizar Teste</button>
                                                </div>
                                            ) : (
                                                <div className="text-center py-20">
                                                    <div className="h-20 w-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                                        <LucideCheck className="h-10 w-10 text-white" />
                                                    </div>
                                                    <h3 className="text-2xl font-black uppercase">Teste Concluído</h3>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {currentLesson.contentType === 'ESSAY' && (
                                    <div className="p-4 md:p-8">
                                        <EssaySubmissionForm 
                                            lesson={currentLesson} 
                                            mySubmission={myEssaySubmission} 
                                            isLoading={isLoadingSubmission}
                                            markAsCompleted={markAsCompleted} 
                                            onSuccess={fetchMySubmission} 
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="p-6 lg:p-10">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-sm font-black text-muted-foreground uppercase">{currentLesson?.title || 'Aula'}</h2>
                            {hasNext && !isNextLocked && (
                                <button onClick={() => {
                                    if (nextIndices) goToLesson(nextIndices.mIdx, nextIndices.lIdx);
                                }} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-black uppercase text-[10px] shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all">Próxima Aula</button>
                            )}
                        </div>
                        <p className="text-muted-foreground text-sm border-l-2 border-primary/20 pl-4 max-w-2xl leading-relaxed">{course.description}</p>
                        
                        {/* Materials Grid */}
                        {currentLesson?.materials?.length > 0 && (
                            <div className="mt-12 pt-10 border-t border-border">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                    <LucideFileText className="h-4 w-4" />
                                    Materiais Complementares
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {currentLesson.materials.map((mat: any, idx: number) => {
                                        // Skip if it is the main PDF and download is restricted
                                        const isMainPdf = currentLesson.pdfUrl && (mat.url === currentLesson.pdfUrl || mat.url.includes(currentLesson.pdfUrl.split('/').pop() || '____'));
                                        if (currentLesson.allowPdfDownload === false && isMainPdf) return null;
                                        
                                        return (
                                            <button
                                                key={idx}
                                                title={mat.name}
                                                onClick={() => downloadMaterial(mat.url?.startsWith('http') ? mat.url : `${API_URL}${mat.url}`, mat.name, currentLesson.id, mat.url)}
                                                className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border hover:border-primary/20 transition-all group text-left"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-9 w-9 shrink-0 bg-white border border-border group-hover:border-primary/20 rounded-lg flex items-center justify-center text-primary transition-all">
                                                        <LucideDownload className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-xs font-bold truncate">{mat.name}</span>
                                                </div>
                                                <LucideChevronRight className="h-4 w-4 shrink-0 ml-2 text-muted-foreground/30 group-hover:text-primary transition-all" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <div className="h-24" />
                    </div>
                </div>

                <div className="hidden lg:flex flex-col w-80 xl:w-96 flex-shrink-0 bg-card sticky top-0 h-screen overflow-y-auto border-l border-border">
                    <div className="px-6 py-8 border-b border-border sticky top-0 z-10 bg-card/80 backdrop-blur-md">
                        <div className="flex items-center justify-between gap-6 mb-6">
                            <div className="flex-1 truncate">
                                <h2 className="text-lg font-black truncate uppercase italic tracking-tighter text-slate-900">{course.title}</h2>
                                <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-1">{completedLessons} de {totalLessons} aulas concluídas</p>
                            </div>
                            <CircularProgress pct={progressPct} size={48} />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => {
                                if (currentLessonIdx > 0) goToLesson(currentModuleIdx, currentLessonIdx - 1);
                                else if (currentModuleIdx > 0) {
                                    const prevModule = modules[currentModuleIdx - 1];
                                    goToLesson(currentModuleIdx - 1, (prevModule?.lessons?.length || 1) - 1);
                                }
                            }} disabled={!hasPrev} className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:bg-muted text-slate-700 disabled:opacity-20 active:scale-95 transition-all"><LucideChevronLeft className="h-4 w-4" /></button>
                            <button onClick={() => {
                                if (nextIndices) goToLesson(nextIndices.mIdx, nextIndices.lIdx);
                            }} disabled={!hasNext || isNextLocked} className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:bg-muted text-slate-700 disabled:opacity-20 active:scale-95 transition-all"><LucideChevronRight className="h-4 w-4" /></button>
                        </div>
                    </div>
                    <div className="flex-1">
                        <SyllabusList modules={modules} expandedModules={expandedModules} setExpandedModules={setExpandedModules} currentModuleIdx={currentModuleIdx} currentLessonIdx={currentLessonIdx} isEnrolled={isEnrolled} userRole={userRole} goToLesson={goToLesson} formatDuration={formatDuration} totalModuleDuration={totalModuleDuration} />
                    </div>
                </div>
            </div>
            {/* Mobile Syllabus Drawer */}
            <AnimatePresence>
                {isSyllabusOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSyllabusOpen(false)}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[150] lg:hidden"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed top-0 right-0 h-full w-[320px] bg-white z-[160] lg:hidden shadow-[-10px_0_30px_rgba(0,0,0,0.05)] flex flex-col"
                        >
                            <div className="px-6 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-1 bg-primary rounded-full" />
                                    <span className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 italic">Trilha do Curso</span>
                                </div>
                                <button
                                    onClick={() => setIsSyllabusOpen(false)}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-100 text-slate-400 active:scale-95 transition-all shadow-sm"
                                >
                                    <LucideX className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="px-6 py-4 border-b border-slate-50">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{completedLessons} de {totalLessons} aulas</p>
                                    <CircularProgress pct={progressPct} size={32} />
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} className="h-full bg-primary" />
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar">
                                <SyllabusList 
                                    modules={modules} 
                                    expandedModules={expandedModules} 
                                    setExpandedModules={setExpandedModules} 
                                    currentModuleIdx={currentModuleIdx} 
                                    currentLessonIdx={currentLessonIdx} 
                                    isEnrolled={isEnrolled} 
                                    userRole={userRole} 
                                    goToLesson={(m, l) => {
                                        goToLesson(m, l);
                                        setIsSyllabusOpen(false);
                                    }} 
                                    formatDuration={formatDuration} 
                                    totalModuleDuration={totalModuleDuration} 
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
