import { motion, AnimatePresence } from "framer-motion";
import {
    LucideChevronLeft, LucidePlay, LucideCheck, LucideFileText,
    LucideBrainCircuit, LucideX, LucideChevronRight, LucideChevronDown,
    LucideDownload, LucideLock, LucideStar, LucideZap
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useCourseStore } from "../store/courseStore";
import { jwtDecode } from "jwt-decode";
import YouTubePlayer from "../components/YouTubePlayer";
import LoadingSpinner from "../components/LoadingSpinner";
import { resolveThumbnail } from "../utils/url";
import logo from "../assets/logo.png";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

declare global {
    interface Window {
        onYouTubeIframeAPIReady: () => void;
        YT: any;
    }
}

// ─── SYLLABUS LIST COMPONENT ──────────────────────────────────
interface SyllabusListProps {
    modules: any[];
    expandedModules: Record<number, boolean>;
    setExpandedModules: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
    currentModuleIdx: number;
    currentLessonIdx: number;
    isEnrolled: boolean;
    goToLesson: (mIdx: number, lIdx: number) => void;
    formatDuration: (val: any) => string;
    totalModuleDuration: (module: any) => string | null;
}

const SyllabusList = ({
    modules,
    expandedModules,
    setExpandedModules,
    currentModuleIdx,
    currentLessonIdx,
    isEnrolled,
    goToLesson,
    formatDuration,
    totalModuleDuration
}: SyllabusListProps) => (
    <div className="space-y-0">
        {modules.map((module, mIdx) => {
            const isExpanded = !!expandedModules[mIdx];
            const dur = totalModuleDuration(module);
            return (
                <div key={`module-${mIdx}-${module.id || mIdx}`} className="border-b border-border last:border-none">
                    <button
                        onClick={() => setExpandedModules(prev => ({ ...prev, [mIdx]: !prev[mIdx] }))}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <motion.div
                                animate={{ rotate: isExpanded ? 0 : -90 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className="shrink-0 flex items-center justify-center"
                            >
                                <LucideChevronDown className="h-4 w-4 text-muted-foreground" />
                            </motion.div>
                            <span className="text-sm font-bold text-foreground truncate">{module.title}</span>
                        </div>
                        {dur && <span className="shrink-0 text-xs text-muted-foreground ml-3">{dur}</span>}
                    </button>

                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                key={`module-content-${mIdx}`}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                    height: { type: "spring", stiffness: 300, damping: 30 },
                                    opacity: { duration: 0.2 }
                                }}
                                className="overflow-hidden"
                            >
                                {(module.lessons || []).map((lesson: any, lIdx: number) => {
                                    const isFirst = mIdx === 0 && lIdx === 0;
                                    const prevLesson = lIdx > 0 ? module.lessons[lIdx - 1] : mIdx > 0 ? modules[mIdx - 1]?.lessons?.[modules[mIdx - 1].lessons.length - 1] : null;
                                    const isLocked = !isFirst && prevLesson && !prevLesson.completed;
                                    const isActive = mIdx === currentModuleIdx && lIdx === currentLessonIdx;

                                    return (
                                        <button
                                            key={`lesson-${lIdx}-${lesson.id || lIdx}`}
                                            disabled={!isEnrolled || !!isLocked}
                                            onClick={() => { if (!isLocked) goToLesson(mIdx, lIdx); }}
                                            className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${isActive ? 'bg-primary/20' : 'hover:bg-muted/50'} ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        >
                                            <div className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${lesson.completed ? 'bg-primary' : isActive ? 'border-2 border-primary' : 'border border-border'}`}>
                                                {isLocked ? <LucideLock className="h-3 w-3 text-muted-foreground" />
                                                    : lesson.completed ? <LucideCheck className="h-3 w-3 text-primary-foreground" />
                                                        : isActive ? <LucidePlay className="h-2.5 w-2.5 text-primary fill-primary" />
                                                            : <span className="text-[9px] text-muted-foreground font-black">{lIdx + 1}</span>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-bold truncate ${isActive ? 'text-primary' : lesson.completed ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                    {lesson.title}
                                                </p>
                                            </div>
                                            <span className="shrink-0 text-[10px] text-muted-foreground">
                                                {lesson.contentType === 'VIDEO'
                                                    ? formatDuration(lesson.duration)
                                                    : lesson.contentType === 'PDF' ? 'PDF' : 'Quiz'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            );
        })}
    </div>
);


// Circular progress ring (like Finclass)
function CircularProgress({ pct, size = 64 }: { pct: number; size?: number }) {
    const r = (size - 10) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return (
        <svg width={size} height={size} className="-rotate-90">
            {/* Darker, more professional track */}
            <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" className="text-muted/20" strokeWidth={4} fill="none" />
            <circle
                cx={size / 2} cy={size / 2} r={r}
                stroke="currentColor" className="text-primary" strokeWidth={4} fill="none"
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
            {pct === 0 && (
                <text
                    x={size / 2} y={size / 2}
                    textAnchor="middle" dominantBaseline="central"
                    className="fill-foreground font-bold"
                    style={{ fontSize: size <= 48 ? 9 : 10, transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
                >
                    0%
                </text>
            )}
            {pct > 0 && (
                <text
                    x={size / 2} y={size / 2}
                    textAnchor="middle" dominantBaseline="central"
                    className="fill-foreground font-bold"
                    style={{ fontSize: size <= 48 ? 9 : 10, transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
                >
                    {pct}%
                </text>
            )}
        </svg>
    );
}


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
    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                setUserRole((decoded.role || 'STUDENT').toUpperCase());
            } catch { }
        }
    }, []);

    const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizCorrect, setQuizCorrect] = useState(false);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [showFeedback, setShowFeedback] = useState(false);

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

    const [hasResumed, setHasResumed] = useState<string | null>(null);
    const [indicesInitialized, setIndicesInitialized] = useState(false);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

    useEffect(() => {
        if (id) {
            setIsFetching(true);
            fetchCourseById(id).finally(() => setIsFetching(false));
            setIndicesInitialized(false);
            setHasResumed(null);
            setCurrentModuleIdx(0);
            setCurrentLessonIdx(0);
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

    useEffect(() => {
        setQuizSubmitted(false);
        setQuizAnswers({});
        setCurrentQuestionIdx(0);
        setShowFeedback(false);
    }, [currentModuleIdx, currentLessonIdx]);

    const currentModule = course?.modules?.[currentModuleIdx];
    const currentLesson = (currentModule as any)?.lessons?.[currentLessonIdx];

    // ─── Loading Screen (Bloqueante por pedido do usuário) ──────────
    if (isFetching || !indicesInitialized || !course) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-10 overflow-hidden">
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-8"
            >
                <div className="relative">
                    <img src={logo} alt="Brilha Mais" className="h-12 w-auto grayscale brightness-0 opacity-5" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <LoadingSpinner size="lg" variant="primary" />
                    </div>
                </div>
                <div className="space-y-1.5 text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Sincronizando Conteúdo</p>
                    <p className="text-[9px] text-muted-foreground uppercase font-medium tracking-widest">Preparando sua experiência...</p>
                </div>
            </motion.div>
        </div>
    );

    // Se não encontrou o curso após o fetch, erro 404
    if (!course) return (
        <div className="min-h-screen flex items-center justify-center p-10 text-center">
            <div className="space-y-4">
                <h2 className="text-3xl font-black">Curso não encontrado</h2>
                <Link to="/dashboard" className="text-primary hover:underline uppercase font-black tracking-widest text-xs">Voltar para o Início</Link>
            </div>
        </div>
    );

    const { isEnrolled, modules = [] } = course;
    const categoryName = typeof course.category === 'object' ? (course.category as any)?.name : course.category;
    const totalLessons = modules.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0);
    const completedLessons = modules.reduce((acc: number, m: any) =>
        acc + (m.lessons?.filter((l: any) => l.completed).length || 0), 0);
    const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const handleEnroll = async () => {
        if (!id) return;
        setIsEnrolling(true);
        try { await enrollInCourse(id); } finally { setIsEnrolling(false); }
    };

    const markAsCompleted = () => {
        if (currentLesson?.id) toggleLessonCompletion(currentLesson.id, true);
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

    const isAllAnswered = currentLesson?.quiz?.questions && currentLesson.quiz.questions.length > 0 &&
        currentLesson.quiz.questions.every((_: any, idx: number) => quizAnswers[idx] !== undefined);

    const goToLesson = (mIdx: number, lIdx: number) => {
        setCurrentModuleIdx(mIdx);
        setCurrentLessonIdx(lIdx);
        setExpandedModules(prev => ({ ...prev, [mIdx]: true }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const goNext = () => {
        const lessons = modules[currentModuleIdx]?.lessons || [];
        if (currentLessonIdx + 1 < lessons.length) {
            goToLesson(currentModuleIdx, currentLessonIdx + 1);
        } else if (currentModuleIdx + 1 < modules.length) {
            goToLesson(currentModuleIdx + 1, 0);
        }
    };

    const goPrev = () => {
        if (currentLessonIdx > 0) {
            goToLesson(currentModuleIdx, currentLessonIdx - 1);
        } else if (currentModuleIdx > 0) {
            const prevModule = modules[currentModuleIdx - 1];
            goToLesson(currentModuleIdx - 1, (prevModule?.lessons?.length || 1) - 1);
        }
    };

    const hasNext = currentLessonIdx + 1 < (modules[currentModuleIdx]?.lessons?.length || 0) || currentModuleIdx + 1 < modules.length;
    const hasPrev = currentLessonIdx > 0 || currentModuleIdx > 0;

    // ─── SYLLABUS ACCORDION RENDERER ──────────────────────────────
    const renderSyllabus = () => (
        <SyllabusList
            modules={modules}
            expandedModules={expandedModules}
            setExpandedModules={setExpandedModules}
            currentModuleIdx={currentModuleIdx}
            currentLessonIdx={currentLessonIdx}
            isEnrolled={!!isEnrolled}
            goToLesson={goToLesson}
            formatDuration={formatDuration}
            totalModuleDuration={totalModuleDuration}
        />
    );


    // ─── PRE-ENROLLMENT ────────────────────────────────────────────
    if (!isEnrolled) {
        return (
            <div className="bg-background text-foreground min-h-screen flex flex-col lg:flex-row lg:items-stretch">
                {/* Hero Image Section */}
                <div className="relative w-full lg:sticky lg:top-0 lg:h-screen lg:w-[55%] flex-shrink-0 overflow-hidden bg-slate-900">
                    <img 
                        src={resolveThumbnail(course.thumbnail)} 
                        alt={course.title} 
                        className="w-full h-auto lg:h-full lg:object-cover aspect-video lg:aspect-auto" 
                    />
                    
                    {/* Bottom gradient only for mobile transition */}
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent lg:hidden" />
                    
                    {/* Right gradient for desktop transition */}
                    <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-r from-transparent to-background hidden lg:block" />

                    {/* Category badge - Always on the image */}
                    {categoryName && (
                        <div className="absolute top-6 left-6 z-20">
                            <span className="bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-2xl shadow-primary/40 backdrop-blur-md">
                                {categoryName}
                            </span>
                        </div>
                    )}
                </div>

                {/* Info Section Container */}
                <div className="flex-1 flex flex-col relative z-10">
                    {/* Mobile: Sequential Info Panel */}
                    <div className="lg:hidden px-6 pt-2 pb-20 space-y-8 flex flex-col">
                        <div className="space-y-3">
                            <h1 className="text-4xl sm:text-5xl font-black leading-[1.1] tracking-tighter text-slate-900 uppercase italic">
                                {course.title}
                            </h1>
                            <div className="flex items-center gap-4 text-slate-400 text-[11px] font-black uppercase tracking-widest">
                                <span className="flex items-center gap-2">
                                    <LucideFileText className="h-4 w-4" />
                                    {totalLessons} aulas
                                </span>
                                <span className="h-1.5 w-1.5 rounded-full bg-primary/20" />
                                <span className="text-primary">Acesso Liberado</span>
                            </div>
                        </div>

                        {course.description && (
                            <div className="relative">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/10 rounded-full" />
                                <p className="text-slate-500 text-sm leading-relaxed pl-6 font-medium italic line-clamp-6">
                                    {course.description}
                                </p>
                            </div>
                        )}

                        <div className="space-y-4 pt-4">
                            <button
                                onClick={handleEnroll} 
                                disabled={isEnrolling}
                                className="w-full bg-primary text-primary-foreground py-6 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 text-sm disabled:opacity-60 active:scale-95 transition-all shadow-xl shadow-primary/20 border-b-4 border-primary-foreground/10"
                            >
                                {isEnrolling ? (
                                    <><LoadingSpinner size="sm" variant="white" />Iniciando...</>
                                ) : (
                                    <><LucidePlay className="h-5 w-5 fill-current" />Iniciar Curso</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Desktop: Centered Info Panel */}
                    <div className="hidden lg:flex flex-col justify-center flex-1 px-20 py-16">
                        <h1 className="text-6xl xl:text-8xl font-black leading-none tracking-tighter mb-8 uppercase italic text-slate-900">
                            {course.title}
                        </h1>
                        <p className="text-muted-foreground text-xl leading-relaxed mb-12 max-w-xl font-medium">
                            {course.description}
                        </p>
                        <div className="flex gap-8 mb-12 text-slate-400 text-sm font-black uppercase tracking-widest">
                            <span className="flex items-center gap-3">
                                <LucideFileText className="h-5 w-5" />
                                {totalLessons} aulas
                            </span>
                            <span className="flex items-center gap-3">
                                <LucideStar className="h-5 w-5 fill-primary text-primary" />
                                Curso Premium
                            </span>
                        </div>
                        <button
                            onClick={handleEnroll} 
                            disabled={isEnrolling}
                            className="w-full max-w-sm bg-primary text-primary-foreground py-6 rounded-2xl font-black uppercase tracking-[0.2em] flex items-center justify-center gap-4 text-lg disabled:opacity-60 hover:brightness-110 active:scale-95 transition-all shadow-2xl shadow-primary/30 border-b-6 border-primary-foreground/10"
                        >
                            {isEnrolling ? (
                                <><LoadingSpinner size="sm" variant="white" />Iniciando...</>
                            ) : (
                                <><LucidePlay className="h-7 w-7 fill-current" />Iniciar Curso</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── ENROLLED — Finclass-style ─────────────────────────────────
    return (
        <div className="bg-background text-foreground">
            <div className="lg:max-w-[1200px] lg:mx-auto lg:flex lg:gap-0 w-full">

                {/* ── LEFT: Main Content (Player + Info) ── */}
                <div className="flex-1 min-w-0 lg:border-r lg:border-border flex flex-col">

                    {/* Desktop breadcrumb */}
                    <div className="hidden lg:flex items-center gap-3 px-8 py-6">
                        <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                            <LucideChevronLeft className="h-4 w-4" />
                            <span className="text-xs font-black uppercase tracking-widest">Painel do Aluno</span>
                        </Link>
                        <span className="text-border mx-2">/</span>
                        <span className="text-xs font-bold text-foreground/70 truncate">{currentLesson?.title || course.title}</span>
                    </div>

                    {/* ── Player / Content Area ── */}
                    <div className="w-full flex-shrink-0">
                        {!currentLesson ? (
                            <div className="w-full aspect-video bg-card flex flex-col items-center justify-center gap-4 text-center p-8">
                                <LucideFileText className="h-12 w-12 text-muted-foreground" />
                                <h2 className="text-xl font-black">Nenhum conteúdo ainda</h2>
                                <p className="text-muted-foreground text-sm">Este curso ainda não possui aulas.</p>
                            </div>
                        ) : (
                            <>
                                {currentLesson.contentType === 'VIDEO' && (
                                    <div className="relative aspect-video w-full bg-black">
                                        {currentLesson.youtubeId ? (
                                            <YouTubePlayer
                                                key={currentLesson.id}
                                                videoId={currentLesson.youtubeId}
                                                isCompleted={!!currentLesson.completed}
                                                isPrivileged={userRole === 'INSTRUCTOR' || userRole === 'ADMIN'}
                                                onEnded={markAsCompleted}
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                                <LucidePlay className="h-12 w-12 text-muted-foreground" />
                                                <div className="text-center">
                                                    <h3 className="font-black">Vídeo não configurado</h3>
                                                    <p className="text-muted-foreground text-sm mt-1">O instrutor ainda não adicionou o vídeo.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {currentLesson.contentType === 'PDF' && (
                                    <div className="w-full bg-card" style={{ height: '56vw', minHeight: 380 }}>
                                        <iframe src={`${currentLesson.pdfUrl?.startsWith('http') ? currentLesson.pdfUrl : `${API_URL}${currentLesson.pdfUrl}`}#toolbar=0`} className="w-full h-full" onLoad={() => setTimeout(markAsCompleted, 5000)} />
                                    </div>
                                )}

                                {currentLesson.contentType === 'QUIZ' && (
                                    <div className="w-full bg-card p-6 md:p-10" style={{ minHeight: 380 }}>
                                        <h2 className="text-2xl font-black text-center uppercase tracking-tighter mb-8">Mini Teste</h2>
                                        {(!quizSubmitted && (!currentLesson.completed || Object.keys(quizAnswers).length > 0)) ? (
                                            <div className="max-w-2xl mx-auto space-y-6">
                                                {(() => {
                                                    const q = (currentLesson.quiz?.questions || [])[currentQuestionIdx];
                                                    if (!q) return null;
                                                    return (
                                                        <div className="space-y-4">
                                                            <p className="font-black text-base uppercase tracking-tight leading-snug">
                                                                {currentQuestionIdx + 1}. {q.text}
                                                            </p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                {q.options.map((opt: any, oIdx: number) => (
                                                                    <button
                                                                        key={oIdx}
                                                                        onClick={() => { if (!currentLesson.completed && !showFeedback) setQuizAnswers({ ...quizAnswers, [currentQuestionIdx]: oIdx }); }}
                                                                        className={`p-4 rounded-xl border text-left font-bold text-xs uppercase tracking-tight transition-all ${showFeedback
                                                                            ? opt.isCorrect ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                                                                : quizAnswers[currentQuestionIdx] === oIdx ? 'bg-red-500/20 border-red-500 text-red-400'
                                                                                    : 'bg-muted/50 border-border text-muted-foreground'
                                                                            : quizAnswers[currentQuestionIdx] === oIdx
                                                                                ? 'bg-primary/20 border-primary text-primary'
                                                                                : 'bg-muted border-border text-foreground hover:border-foreground/30'
                                                                            }`}
                                                                    >
                                                                        <span className="opacity-40 mr-2">{String.fromCharCode(65 + oIdx)}.</span>{opt.text}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                                {!showFeedback && (
                                                    <button onClick={() => setShowFeedback(true)} disabled={quizAnswers[currentQuestionIdx] === undefined}
                                                        className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all ${quizAnswers[currentQuestionIdx] !== undefined ? 'bg-primary text-primary-foreground hover:brightness-110 active:scale-95' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}>
                                                        Enviar Resposta
                                                    </button>
                                                )}
                                                {!currentLesson.completed && showFeedback && (
                                                    currentQuestionIdx < (currentLesson.quiz?.questions?.length || 0) - 1 ? (
                                                        <button onClick={() => { setCurrentQuestionIdx(p => p + 1); setShowFeedback(false); }}
                                                            className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm bg-primary text-primary-foreground flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all">
                                                            Próxima <LucideChevronRight className="h-4 w-4" />
                                                        </button>
                                                    ) : (
                                                        <button onClick={handleQuizSubmit} disabled={!isAllAnswered || isSubmittingQuiz}
                                                            className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all ${isAllAnswered && !isSubmittingQuiz ? 'bg-primary text-primary-foreground hover:brightness-110 active:scale-95' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}>
                                                            {isSubmittingQuiz ? <span className="flex items-center justify-center gap-2"><LoadingSpinner size="sm" variant="white" />Validando...</span> : 'Finalizar Teste'}
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4 max-w-sm mx-auto">
                                                <div className={`h-20 w-20 rounded-full flex items-center justify-center mx-auto ${quizCorrect || currentLesson.completed ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                                    {quizCorrect || currentLesson.completed ? <LucideCheck className="h-10 w-10 text-white" /> : <LucideX className="h-10 w-10 text-white" />}
                                                </div>
                                                <h3 className="text-2xl font-black">{quizSubmitted ? (quizCorrect ? 'Parabéns!' : 'Não foi dessa vez') : 'Teste Concluído'}</h3>
                                                <p className="text-muted-foreground">{quizSubmitted ? (quizCorrect ? 'Você acertou todas!' : 'Resposta registrada.') : 'Você já completou este teste.'}</p>
                                            </motion.div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Mobile Progress Block (Reordered: Logo depois do vídeo) */}
                    <div className="lg:hidden bg-card px-5 py-8 border-b border-border">
                        <div className="flex items-center justify-between gap-6">
                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl font-bold leading-[1.1] tracking-tight text-foreground">{course.title}</h2>
                                <p className="text-muted-foreground text-[11px] font-medium mt-1.5 tracking-wide">{completedLessons} de {totalLessons} aulas concluídas</p>
                            </div>
                            <div className="flex flex-col items-center gap-2 shrink-0">
                                <CircularProgress pct={progressPct} size={48} />
                                <div className="flex gap-1.5 mt-0.5">
                                    <button onClick={goPrev} disabled={!hasPrev} className="h-7 w-7 rounded-full border border-border bg-muted/20 flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-20 active:scale-95 transition-all"><LucideChevronLeft className="h-3.5 w-3.5" /></button>
                                    <button onClick={goNext} disabled={!hasNext || (!currentLesson?.completed && userRole !== 'INSTRUCTOR' && userRole !== 'ADMIN')} className="h-7 w-7 rounded-full border border-border bg-muted/20 flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-20 active:scale-95 transition-all"><LucideChevronRight className="h-3.5 w-3.5" /></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Details Area ── */}
                    <div className="p-6 lg:p-10 flex-1">
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                    <LucidePlay className="h-3.5 w-3.5 fill-current" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Contéudo • {currentLesson?.completed ? 'Concluído' : 'Em progresso'}</span>
                                </div>
                                <span className="text-muted-foreground/40 font-bold hidden sm:inline">•</span>
                                <h2 className="text-sm font-black text-muted-foreground uppercase tracking-wider">{currentLesson?.title || 'Selecione uma aula'}</h2>
                            </div>

                            {/* Move Next CTA to Top Right */}
                            {currentLesson?.completed && hasNext && (
                                <button onClick={goNext}
                                    className="hidden sm:flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-black uppercase tracking-widest text-[10px] hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 shrink-0">
                                    Próxima Aula <LucideChevronRight className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {course.description && (
                            <p className="text-muted-foreground text-sm leading-relaxed mt-4 border-l-2 border-primary/20 pl-4">
                                {course.description}
                            </p>
                        )}

                        {/* Materials Section (Desktop Only here) */}
                        {currentLesson?.materials?.length > 0 && (
                            <div className="hidden lg:block mt-10 pt-8 border-t border-border">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                                    <LucideFileText className="h-4 w-4" />
                                    Materiais da Aula
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {currentLesson.materials.map((mat: any, idx: number) => (
                                        <a key={idx} href={mat.url?.startsWith('http') ? mat.url : `${API_URL}${mat.url}`} download={mat.name} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center border border-border group-hover:border-primary/20">
                                                    <LucideDownload className="h-4 w-4 text-primary" />
                                                </div>
                                                <span className="text-xs font-bold truncate max-w-[150px]">{mat.name}</span>
                                            </div>
                                            <LucideChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Mobile Next CTA (Full width) */}
                        {currentLesson?.completed && hasNext && (
                            <div className="mt-8 sm:hidden">
                                <button onClick={goNext}
                                    className="w-full flex items-center justify-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-primary/20">
                                    Próxima Aula <LucideChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Mobile: Syllabus Section (at bottom of content) ── */}
                    <div className="lg:hidden border-t border-border">
                        {renderSyllabus()}

                        {/* Mobile Materials (Reordered: Depois dos módulos) */}
                        {currentLesson?.materials?.length > 0 && (
                            <div className="px-5 py-8 border-t border-border bg-muted/10">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                                    <LucideFileText className="h-4 w-4" />
                                    Materiais da Aula
                                </h3>
                                <div className="space-y-3">
                                    {currentLesson.materials.map((mat: any, idx: number) => (
                                        <a key={idx} href={mat.url?.startsWith('http') ? mat.url : `${API_URL}${mat.url}`} download={mat.name} className="flex items-center justify-between p-4 rounded-xl bg-card border border-border active:scale-95 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center border border-border">
                                                    <LucideDownload className="h-4 w-4 text-primary" />
                                                </div>
                                                <span className="text-xs font-bold truncate">{mat.name}</span>
                                            </div>
                                            <LucideChevronRight className="h-4 w-4 text-muted-foreground/30" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="h-24" />
                    </div>
                </div>

                {/* ── RIGHT: Desktop Sidebar (Syllabus) ── */}
                <div className="hidden lg:flex flex-col w-80 xl:w-96 flex-shrink-0 bg-card sticky top-0 h-screen overflow-y-auto border-l border-border">
                    <div className="px-6 py-8 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                        <div className="flex items-center justify-between gap-6">
                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl font-bold leading-tight tracking-tight text-foreground line-clamp-3">{course.title}</h2>
                                <p className="text-muted-foreground text-[11px] font-medium mt-1.5 tracking-wide">{completedLessons} de {totalLessons} aulas concluídas</p>
                            </div>
                            <div className="flex flex-col items-center gap-2 shrink-0">
                                <CircularProgress pct={progressPct} size={48} />
                                <div className="flex gap-1.5 mt-0.5">
                                    <button onClick={goPrev} disabled={!hasPrev} className="h-7 w-7 rounded-full border border-border bg-muted/20 flex items-center justify-center hover:bg-muted text-foreground disabled:opacity-20 active:scale-95 transition-all"><LucideChevronLeft className="h-3.5 w-3.5" /></button>
                                    <button onClick={goNext} disabled={!hasNext || (!currentLesson?.completed && userRole !== 'INSTRUCTOR' && userRole !== 'ADMIN')} className="h-7 w-7 rounded-full border border-border bg-muted/20 flex items-center justify-center hover:bg-muted text-foreground disabled:opacity-20 active:scale-95 transition-all"><LucideChevronRight className="h-3.5 w-3.5" /></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        {renderSyllabus()}
                    </div>

                </div>

            </div>
        </div>
    );
}
