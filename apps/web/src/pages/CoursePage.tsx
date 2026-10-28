import { motion, AnimatePresence } from "framer-motion";
import {
    LucideChevronLeft, LucidePlay, LucideCheck, LucideFileText,
    LucideX, LucideChevronRight, LucideDownload, LucideZap, LucideBookOpen
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useCourseStore } from "../store/courseStore";
import { jwtDecode } from "jwt-decode";
import YouTubePlayer from "../components/YouTubePlayer";
import LoadingSpinner from "../components/LoadingSpinner";
import SyllabusList from "../components/SyllabusList";
import EssaySubmissionForm from "../components/EssaySubmissionForm";
import Skeleton from "../components/Skeleton";
import api from "../utils/api";
import { resolveThumbnail } from "../utils/url";
import logo from "../assets/logo.png";
import CustomPDFViewer from "../components/CustomPDFViewer";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const normalizeTitle = (str: string) => {
    if (!str) return '';
    if (str === str.toUpperCase() && str.length > 3) {
        const lowerExceptions = new Set(['de', 'da', 'do', 'das', 'dos', 'em', 'e', 'para', 'com', 'por', 'a', 'o']);
        return str.toLowerCase().split(' ').map((word, idx) => {
            if (idx > 0 && lowerExceptions.has(word)) return word;
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    }
    return str;
};

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
    
    // Tracking lesson switches to prevent navigation reset during data sync
    const lastLessonIdRef = useRef<string | null>(null);

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

    const markAsCompleted = (answers?: Record<number, number>) => {
        if (currentLesson?.id) toggleLessonCompletion(currentLesson.id, true, answers);
    };

    useEffect(() => {
        // Sync quiz status and load previous answers whenever they change in the store/DB
        setQuizSubmitted(!!currentLesson?.completed);
        setQuizAnswers(currentLesson?.quizAnswers || {});

        // Reset navigation indices ONLY if the lesson ID has actually changed
        if (currentLesson?.id !== lastLessonIdRef.current) {
            setCurrentQuestionIdx(0);
            setShowFeedback(false);
            setMyEssaySubmission(null);
            lastLessonIdRef.current = currentLesson?.id || null;
            
            if (currentLesson?.contentType === 'ESSAY') fetchMySubmission();
            if (currentLesson?.contentType === 'PDF' && !currentLesson.completed) markAsCompleted();
        }
    }, [currentModuleIdx, currentLessonIdx, currentLesson?.id, currentLesson?.completed, currentLesson?.quizAnswers]);

    if (isFetching || !indicesInitialized || !course) return (
        <div className="min-h-screen bg-background flex flex-col overflow-hidden">
            <div className="lg:max-w-[1200px] lg:mx-auto lg:flex w-full h-full">
                {/* Main Content Skeleton */}
                <div className="flex-1 flex flex-col h-full border-r border-slate-100">
                    {/* Header Breadcrumb Skeleton */}
                    <div className="hidden lg:flex items-center gap-3 px-8 py-6">
                        <Skeleton className="h-4 w-32" variant="rectangle" />
                        <Skeleton className="h-4 w-4" variant="rectangle" />
                        <Skeleton className="h-4 w-48" variant="rectangle" />
                    </div>
                    {/* Video Player Skeleton */}
                    <Skeleton className="w-full aspect-video" variant="rectangle" />
                    {/* Title & Info Skeleton */}
                    <div className="p-6 lg:p-10 space-y-6">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-3">
                                <Skeleton className="h-2 w-24" variant="rectangle" />
                                <Skeleton className="h-8 w-64" variant="rounded" />
                            </div>
                            <Skeleton className="h-12 w-40" variant="rounded" />
                        </div>
                        <Skeleton className="h-24 w-full" variant="rounded" />
                    </div>
                </div>
                {/* Sidebar Skeleton */}
                <div className="hidden lg:flex flex-col w-80 xl:w-96 bg-slate-50 h-full p-6 space-y-6">
                    <div className="space-y-4">
                        <Skeleton className="h-6 w-1/2" variant="rounded" />
                        <Skeleton className="h-12 w-full" variant="rounded" />
                    </div>
                    <div className="space-y-4 pt-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex gap-4">
                                <Skeleton className="h-10 w-10 shrink-0" variant="rounded" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-3 w-full" variant="rectangle" />
                                    <Skeleton className="h-2 w-1/2" variant="rectangle" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
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
        markAsCompleted(quizAnswers);
        setIsSubmittingQuiz(false);
    };

    const handleNextQuestion = () => {
        const questions = currentLesson?.quiz?.questions || [];
        if (currentQuestionIdx < questions.length - 1) {
            setCurrentQuestionIdx(prev => prev + 1);
            setShowFeedback(false);
        }
    };

    const handlePrevQuestion = () => {
        if (currentQuestionIdx > 0) {
            setCurrentQuestionIdx(prev => prev - 1);
            setShowFeedback(true);
        }
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
        if (userRole === 'ADMIN' || userRole === 'INSTRUCTOR' || userRole === 'SUPER_ADMIN') return false;
        if (mIdx === 0 && lIdx === 0) return false;
        
        // Iterate through all modules and lessons up to the current one
        for (let m = 0; m <= mIdx; m++) {
            const moduleLessons = modules[m]?.lessons || [];
            const maxL = (m === mIdx) ? lIdx : moduleLessons.length;
            
            for (let l = 0; l < maxL; l++) {
                const prevLesson = moduleLessons[l];
                if (!prevLesson) continue;

                // Check if this specific previous lesson blocks progress
                if (!prevLesson.completed) {
                    // Exception: If it's an expired challenge, it doesn't block
                    if (prevLesson.contentType === 'ESSAY' && prevLesson.deadline) {
                        const isExpired = new Date() > new Date(prevLesson.deadline);
                        if (isExpired) continue; // Skip blocking for expired challenges
                    }
                    return true; // Found an uncompleted lesson that blocks
                }
            }
        }
        
        return false;
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
        <div className="min-h-screen w-full bg-[#FAFAF9] flex flex-col justify-center items-center p-6 md:p-12 relative">
            <Link
                to="/explore"
                className="absolute top-6 left-6 p-2 rounded-lg border border-slate-200/80 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs z-20 flex items-center gap-1.5 text-xs font-medium"
                title="Voltar ao catálogo"
            >
                <LucideChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Voltar</span>
            </Link>

            <motion.div 
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative z-10 w-full max-w-5xl flex flex-col lg:flex-row items-center gap-8 lg:gap-12"
            >
                {/* Visual Side */}
                <div className="w-full sm:max-w-md lg:max-w-lg lg:w-[480px] shrink-0">
                    <div className="aspect-video rounded-2xl overflow-hidden shadow-2xs border border-slate-200/80 bg-slate-100">
                        <img 
                            src={resolveThumbnail(course.thumbnail)} 
                            alt={course.title} 
                            className="w-full h-full object-cover" 
                        />
                    </div>
                </div>

                {/* Content Side */}
                <div className="flex-1 flex flex-col space-y-5 text-center lg:text-left">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200/60 text-amber-700 text-xs font-medium uppercase tracking-wider">
                                {typeof course.category === 'object' ? (course.category as any)?.name : course.category || "Curso"}
                            </span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
                            {course.title}
                        </h1>
                        
                        {course.description && (
                            <p className="text-slate-600 text-sm leading-relaxed max-w-xl mx-auto lg:mx-0">
                                {course.description}
                            </p>
                        )}
                    </div>

                    <div className="pt-2 flex justify-center lg:justify-start">
                        <button 
                            onClick={handleEnroll} 
                            disabled={isEnrolling} 
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm shadow-2xs transition-colors disabled:opacity-50"
                        >
                            {isEnrolling ? (
                                <>
                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Iniciando...</span>
                                </>
                            ) : (
                                <>
                                    <span>Começar agora</span>
                                    <LucidePlay className="h-4 w-4 fill-current" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );

    return (
        <div className="bg-background text-foreground h-screen overflow-hidden">
            <div className="w-full h-full lg:flex">
                <div className="flex-1 min-w-0 lg:border-r border-slate-200/80 flex flex-col h-full overflow-y-auto custom-scrollbar">
                    {/* Desktop Breadcrumbs & Quick Nav */}
                    <div className="hidden lg:flex items-center justify-between px-6 py-3 border-b border-slate-200/80 bg-white shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <Link to="/dashboard" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs">
                                <LucideChevronLeft className="h-3.5 w-3.5" />
                                <span>Painel</span>
                            </Link>
                            <span className="text-slate-300">/</span>
                            <span className="text-xs text-slate-500 truncate max-w-xs">{normalizeTitle(course.title)}</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-xs font-semibold text-slate-800 truncate max-w-md">{normalizeTitle(currentLesson?.title)}</span>
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
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 transition-colors shadow-2xs" 
                                title="Aula anterior"
                            >
                                <LucideChevronLeft className="h-3.5 w-3.5" />
                                <span className="hidden xl:inline">Anterior</span>
                            </button>
                            <button 
                                onClick={() => {
                                    if (nextIndices) goToLesson(nextIndices.mIdx, nextIndices.lIdx);
                                }} 
                                disabled={!hasNext || isNextLocked} 
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 transition-colors shadow-2xs" 
                                title="Próxima aula"
                            >
                                <span className="hidden xl:inline">Próxima</span>
                                <LucideChevronRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Mobile Navigation Sub-header */}
                    <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-2">
                            <Link 
                                to="/dashboard"
                                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs"
                                title="Voltar ao Painel"
                            >
                                <LucideChevronLeft className="h-4 w-4" />
                            </Link>
                            <button 
                                onClick={() => setIsSyllabusOpen(true)}
                                className="flex items-center gap-1.5 bg-white border border-slate-200/80 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 shadow-2xs"
                            >
                                <LucideBookOpen className="h-3.5 w-3.5 text-amber-600" />
                                <span>Trilha</span>
                            </button>
                        </div>

                        <div className="flex-1 px-3 text-center truncate">
                            <p className="text-[10px] text-slate-400 font-medium leading-none mb-0.5 uppercase tracking-wider">Aula atual</p>
                            <p className="text-xs font-semibold text-slate-900 truncate">{normalizeTitle(currentLesson?.title)}</p>
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
                                className="h-8 w-8 rounded-lg border border-slate-200/80 bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-colors shadow-2xs"
                                title="Aula anterior"
                            >
                                <LucideChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <button 
                                onClick={() => {
                                    if (nextIndices) goToLesson(nextIndices.mIdx, nextIndices.lIdx);
                                }} 
                                disabled={!hasNext || isNextLocked}
                                className="h-8 w-8 rounded-lg border border-slate-200/80 bg-white flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-colors shadow-2xs"
                                title="Próxima aula"
                            >
                                <LucideChevronRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="w-full">
                        {!currentLesson ? (
                            <div className="w-full aspect-video bg-card flex flex-col items-center justify-center p-8">
                                <LucideFileText className="h-10 w-10 text-slate-300 mb-3" />
                                <h2 className="text-sm font-semibold text-slate-600">Nenhum conteúdo disponível</h2>
                            </div>
                        ) : (
                            <>
                                {currentLesson.contentType === 'VIDEO' && (
                                    <div className="relative aspect-video w-full bg-black">
                                        <YouTubePlayer 
                                            key={currentLesson.id} 
                                            videoId={currentLesson.youtubeId} 
                                            isCompleted={!!currentLesson.completed} 
                                            isPrivileged={userRole === 'INSTRUCTOR' || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'} 
                                            allowSeeking={currentLesson.allowSeeking !== false}
                                            onEnded={markAsCompleted} 
                                        />
                                    </div>
                                )}
                                {currentLesson.contentType === 'PDF' && (
                                    <div className="w-full aspect-video bg-white relative group/pdfview overflow-hidden border-b border-border/10">
                                        {currentLesson.pdfUrl ? (
                                            <div className="w-full h-full flex flex-col relative bg-slate-100">
                                                <CustomPDFViewer url={currentLesson.pdfUrl} />
                                                
                                                {currentLesson.allowPdfDownload !== false && (
                                                    <div className="absolute top-4 right-4 z-50">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                downloadMaterial(currentLesson.pdfUrl, `${currentLesson.title}.pdf`, currentLesson.id, currentLesson.pdfUrl);
                                                            }}
                                                            title="Baixar material"
                                                            className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition-colors"
                                                        >
                                                            <LucideDownload className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50">
                                                <LucideFileText className="h-12 w-12 text-slate-300 mb-3" />
                                                <h2 className="text-sm font-semibold text-slate-700">Nenhum PDF disponível</h2>
                                                <p className="text-slate-400 text-xs mt-1">O instrutor ainda não enviou o conteúdo principal desta aula.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {currentLesson.contentType === 'QUIZ' && (
                                    <div className="w-full bg-slate-50/50 p-6 md:p-10 min-h-[460px] flex items-center justify-center">
                                        <div className="w-full max-w-2xl bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-2xs space-y-6">
                                            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                                <div>
                                                    <h2 className="text-base font-semibold text-slate-900 tracking-tight">Mini Teste</h2>
                                                    <p className="text-xs text-slate-500">Valide seu conhecimento sobre a aula</p>
                                                </div>
                                                {currentLesson.quiz?.questions && !quizSubmitted && (!currentLesson.completed || Object.keys(quizAnswers).length > 0) && (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-600">
                                                        <span>Questão {currentQuestionIdx + 1} de {currentLesson.quiz.questions.length}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="w-full flex flex-col">
                                                {(!quizSubmitted && (!currentLesson.completed || Object.keys(quizAnswers).length > 0)) ? (
                                                    <div key="quiz-interaction-block" className="flex flex-col">
                                                        <div>
                                                            {(() => {
                                                                const questions = currentLesson.quiz?.questions || [];
                                                                const q = questions[currentQuestionIdx];
                                                                if (!q) return null;
                                                                return (
                                                                    <motion.div 
                                                                        key={currentQuestionIdx}
                                                                        initial={{ opacity: 0, y: 6 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        className="space-y-4"
                                                                    >
                                                                        <p className="font-semibold text-sm md:text-base text-slate-900 leading-snug">{q.text}</p>
                                                                        <div className="grid gap-2.5">
                                                                            {q.options.map((opt: any, oIdx: number) => {
                                                                                const isSelected = quizAnswers[currentQuestionIdx] === oIdx;
                                                                                const isCorrect = opt.isCorrect;
                                                                                
                                                                                let borderColor = 'border-slate-200';
                                                                                let bgColor = 'bg-white';
                                                                                let textColor = 'text-slate-700';
                                                                                let iconBg = 'border-slate-300 bg-white text-transparent';
                                                                                let iconInner = null;

                                                                                if (showFeedback) {
                                                                                    if (isCorrect) {
                                                                                        borderColor = 'border-emerald-300';
                                                                                        bgColor = 'bg-emerald-50/70';
                                                                                        textColor = 'text-emerald-950 font-medium';
                                                                                        iconBg = 'border-emerald-500 bg-emerald-500 text-white';
                                                                                        iconInner = <LucideCheck className="h-3 w-3" />;
                                                                                    } else if (isSelected && !isCorrect) {
                                                                                        borderColor = 'border-rose-300';
                                                                                        bgColor = 'bg-rose-50/70';
                                                                                        textColor = 'text-rose-950 font-medium';
                                                                                        iconBg = 'border-rose-500 bg-rose-500 text-white';
                                                                                        iconInner = <LucideX className="h-3 w-3" />;
                                                                                    } else {
                                                                                        borderColor = 'border-slate-100';
                                                                                        bgColor = 'bg-slate-50/50';
                                                                                        textColor = 'text-slate-400';
                                                                                        iconBg = 'border-slate-200 bg-slate-100/50';
                                                                                    }
                                                                                } else if (isSelected) {
                                                                                    borderColor = 'border-amber-400';
                                                                                    bgColor = 'bg-amber-50/40';
                                                                                    textColor = 'text-slate-900 font-medium';
                                                                                    iconBg = 'border-amber-500 bg-amber-500 text-white';
                                                                                    iconInner = <LucideCheck className="h-3 w-3" />;
                                                                                }

                                                                                const showExplanation = showFeedback && isCorrect && q.explanation;
                                                                                return (
                                                                                    <div
                                                                                        key={oIdx}
                                                                                        onClick={() => {
                                                                                            if (!showFeedback) setQuizAnswers({ ...quizAnswers, [currentQuestionIdx]: oIdx });
                                                                                        }}
                                                                                        className={`rounded-xl border text-left text-xs md:text-sm transition-all ${borderColor} ${bgColor} ${textColor} ${
                                                                                            (!showFeedback && !isSelected) ? 'hover:border-slate-300 hover:bg-slate-50/80 cursor-pointer' : ''
                                                                                        } ${isSelected && !showFeedback ? 'ring-1 ring-amber-300/40' : ''}`}
                                                                                    >
                                                                                        <div className="p-3.5 flex items-center justify-between gap-3">
                                                                                            <span className="flex-1">{opt.text}</span>
                                                                                            <div className={`h-5 w-5 shrink-0 rounded-full border flex items-center justify-center transition-all ${iconBg}`}>
                                                                                                {iconInner}
                                                                                            </div>
                                                                                        </div>
                                                                                        {showExplanation && (
                                                                                            <div className="px-3.5 pb-3 border-t border-emerald-200/50">
                                                                                                <div className="flex items-start gap-2 pt-2">
                                                                                                    <LucideBookOpen className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                                                                                                    <div>
                                                                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 mb-0.5">Explicação</p>
                                                                                                        <p className="text-xs text-emerald-900 leading-relaxed">{q.explanation}</p>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </motion.div>
                                                                );
                                                            })()}
                                                        </div>

                                                        <div key="quiz-actions" className="flex items-center gap-3 mt-8 pt-6 border-t border-slate-100">
                                                            {!showFeedback ? (
                                                                    <button 
                                                                        key="btn-confirm-answer"
                                                                        onClick={() => setShowFeedback(true)}
                                                                        disabled={quizAnswers[currentQuestionIdx] === undefined}
                                                                        className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 ${
                                                                            quizAnswers[currentQuestionIdx] === undefined
                                                                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                                                                                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs active:scale-[0.99]'
                                                                        }`}
                                                                    >
                                                                        <span>Confirmar resposta</span>
                                                                        <LucideCheck className="h-4 w-4" />
                                                                    </button>
                                                            ) : (
                                                                <div key="quiz-nav-feedback" className="flex items-center gap-3 w-full">
                                                                    <button 
                                                                        key="btn-prev-q"
                                                                        onClick={handlePrevQuestion}
                                                                        disabled={currentQuestionIdx === 0}
                                                                        className="flex-1 py-2.5 px-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg font-medium text-xs disabled:opacity-0 transition-colors flex items-center justify-center gap-1.5"
                                                                    >
                                                                        <LucideChevronLeft className="h-3.5 w-3.5" />
                                                                        <span>Anterior</span>
                                                                    </button>
                                                                    
                                                                    {currentQuestionIdx < (currentLesson.quiz?.questions?.length || 0) - 1 ? (
                                                                        <button 
                                                                            key="btn-next-q"
                                                                            onClick={handleNextQuestion}
                                                                            className="flex-[2] py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                                                                        >
                                                                            <span>Próxima pergunta</span>
                                                                            <LucideChevronRight className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    ) : (
                                                                        <button 
                                                                            key="btn-finish-quiz"
                                                                            onClick={handleQuizSubmit} 
                                                                            disabled={isSubmittingQuiz || Object.keys(quizAnswers).length < (currentLesson.quiz?.questions?.length || 0)}
                                                                            className={`flex-[2] py-2.5 px-4 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 ${
                                                                                isSubmittingQuiz || Object.keys(quizAnswers).length < (currentLesson.quiz?.questions?.length || 0)
                                                                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                                                                                    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-2xs active:scale-[0.99]'
                                                                            }`}
                                                                        >
                                                                            {isSubmittingQuiz ? (
                                                                                <span className="flex items-center gap-2">
                                                                                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                                    Processando...
                                                                                </span>
                                                                            ) : (
                                                                                <span className="flex items-center gap-1.5">
                                                                                    Finalizar teste
                                                                                    <LucideZap className="h-3.5 w-3.5 fill-current" />
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div key="quiz-results-block" className="text-center py-4 flex flex-col items-center justify-center">
                                                        <div className="h-11 w-11 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mb-3">
                                                            <LucideCheck className="h-5 w-5" />
                                                        </div>
                                                        <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-0.5">Parabéns!</h3>
                                                        <p className="text-slate-500 text-xs mb-5">Você concluiu este mini teste</p>
                                                        
                                                        <div className="w-full bg-slate-50/70 rounded-xl p-5 mb-5 text-left border border-slate-200/70">
                                                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60">
                                                                <div>
                                                                    <h4 className="text-xs font-semibold text-slate-900">Desempenho Geral</h4>
                                                                    <p className="text-[11px] text-slate-500">Resumo do teste</p>
                                                                </div>
                                                                <div className="bg-amber-50 text-amber-800 border border-amber-200/60 px-2.5 py-1 rounded-md text-xs font-semibold">
                                                                    {(currentLesson.quiz?.questions || []).filter((q: any, idx: number) => quizAnswers[idx] === q.options.findIndex((o: any) => o.isCorrect)).length} / {currentLesson.quiz?.questions?.length} Acertos
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="divide-y divide-slate-200/60 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                                {(currentLesson.quiz?.questions || []).map((q: any, idx: number) => {
                                                                    const selectedIdx = quizAnswers[idx];
                                                                    const correctIdx = q.options.findIndex((o: any) => o.isCorrect);
                                                                    const isCorrect = selectedIdx === correctIdx;
                                                                    
                                                                    return (
                                                                        <div key={idx} className="py-3.5 flex items-start gap-3 first:pt-0 last:pb-0">
                                                                            <div className={`h-5 w-5 shrink-0 rounded-full flex items-center justify-center text-xs mt-0.5 ${
                                                                                isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                                            }`}>
                                                                                {isCorrect ? <LucideCheck className="h-3 w-3" /> : <LucideX className="h-3 w-3" />}
                                                                            </div>
                                                                            <div className="flex-1 min-w-0 space-y-1">
                                                                                <p className="text-xs font-semibold text-slate-900">{q.text}</p>
                                                                                <div className="text-xs">
                                                                                    <span className="text-slate-400 text-[11px] block">
                                                                                        {isCorrect ? 'Resposta correta:' : 'A resposta correta é:'}
                                                                                    </span>
                                                                                    <span className={`font-medium ${isCorrect ? 'text-emerald-700' : 'text-slate-800'}`}>
                                                                                        {q.options[correctIdx]?.text}
                                                                                    </span>
                                                                                </div>
                                                                                {q.explanation && (
                                                                                    <p className="text-xs text-slate-500 border-t border-slate-200/50 pt-1 mt-1">{q.explanation}</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {currentLesson.contentType === 'ESSAY' && (
                                    <div className="p-4 md:p-8">
                                        <EssaySubmissionForm 
                                            key={currentLesson.id}
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

                    <div className="p-6 lg:p-8">
                        <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-amber-700">Conteúdo da aula</p>
                                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">{currentLesson?.title || 'Aula'}</h1>
                            </div>
                            {hasNext && !isNextLocked && (
                                <button 
                                    onClick={() => {
                                        if (nextIndices) goToLesson(nextIndices.mIdx, nextIndices.lIdx);
                                    }} 
                                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-2xs transition-colors shrink-0"
                                >
                                    <span>Próxima aula</span>
                                    <LucideChevronRight className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        {(currentLesson?.description || course.description) && (
                            <div className="prose prose-slate max-w-none">
                                <p className="text-slate-600 text-sm border-l-2 border-amber-400/80 pl-3.5 py-0.5 leading-relaxed whitespace-pre-wrap">
                                    {currentLesson?.description || course.description}
                                </p>
                            </div>
                        )}
                        
                        {/* Materials Grid */}
                        {currentLesson?.materials?.length > 0 && (
                            <div className="mt-10 pt-8 border-t border-slate-100">
                                <h3 className="text-xs font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <LucideFileText className="h-4 w-4 text-slate-500" />
                                    Materiais Complementares
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {currentLesson.materials.map((mat: any, idx: number) => {
                                        // Skip if it is the main PDF and download is restricted
                                        const isMainPdf = currentLesson.pdfUrl && (mat.url === currentLesson.pdfUrl || mat.url.includes(currentLesson.pdfUrl.split('/').pop() || '____'));
                                        if (currentLesson.allowPdfDownload === false && isMainPdf) return null;
                                        
                                        return (
                                            <button
                                                key={idx}
                                                title={mat.name}
                                                onClick={() => downloadMaterial(mat.url?.startsWith('http') ? mat.url : `${API_URL}${mat.url}`, mat.name, currentLesson.id, mat.url)}
                                                className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/50 transition-colors group text-left"
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="h-8 w-8 shrink-0 bg-white border border-slate-200 rounded-md flex items-center justify-center text-slate-600 transition-colors">
                                                        <LucideDownload className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-800 truncate">{mat.name}</span>
                                                </div>
                                                <LucideChevronRight className="h-4 w-4 shrink-0 ml-2 text-slate-300 group-hover:text-slate-600 transition-colors" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <div className="h-16" />
                    </div>
                </div>

                <div className="hidden lg:flex flex-col w-80 xl:w-96 flex-shrink-0 bg-white border-l border-slate-200/80 h-full overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200/80 bg-white">
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <h2 className="text-sm font-bold text-slate-900 truncate tracking-tight" title={course.title}>
                                {normalizeTitle(course.title)}
                            </h2>
                            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 shrink-0">
                                {progressPct}%
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div style={{ width: `${progressPct}%` }} className="h-full bg-amber-500 transition-all duration-300" />
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">
                                {completedLessons} de {totalLessons} aulas concluídas
                            </p>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <SyllabusList modules={modules} expandedModules={expandedModules} setExpandedModules={setExpandedModules} currentModuleIdx={currentModuleIdx} currentLessonIdx={currentLessonIdx} isEnrolled={isEnrolled} userRole={userRole} goToLesson={goToLesson} formatDuration={formatDuration} totalModuleDuration={totalModuleDuration} isLessonLocked={isLessonLocked} />
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
                            className="fixed top-0 right-0 h-full w-[320px] bg-white z-[160] lg:hidden shadow-lg flex flex-col"
                        >
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <div className="flex items-center gap-2">
                                    <LucideBookOpen className="h-4 w-4 text-amber-600" />
                                    <span className="text-sm font-semibold text-slate-900">Trilha do Curso</span>
                                </div>
                                <button
                                    onClick={() => setIsSyllabusOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    <LucideX className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="px-5 py-4 border-b border-slate-200/80 bg-white">
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <span className="text-xs font-semibold text-slate-900">Progresso</span>
                                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 shrink-0">
                                        {progressPct}%
                                    </span>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div style={{ width: `${progressPct}%` }} className="h-full bg-amber-500 transition-all duration-300" />
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        {completedLessons} de {totalLessons} aulas concluídas
                                    </p>
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
                                    isLessonLocked={isLessonLocked}
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
