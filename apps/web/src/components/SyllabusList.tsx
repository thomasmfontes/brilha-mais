import { motion, AnimatePresence } from "framer-motion";
import { LucideChevronDown, LucideLock, LucideCheck, LucidePlay } from "lucide-react";

interface SyllabusListProps {
    modules: any[];
    expandedModules: Record<number, boolean>;
    setExpandedModules: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
    currentModuleIdx: number;
    currentLessonIdx: number;
    isEnrolled: boolean;
    userRole?: string;
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
    userRole = 'STUDENT',
    goToLesson,
    formatDuration,
    totalModuleDuration
}: SyllabusListProps) => (
    <div className="space-y-0">
        {modules.map((module, mIdx) => {
            const isExpanded = !!expandedModules[mIdx];
            const dur = totalModuleDuration(module);
            return (
                <div key={`module-${mIdx}-${module.id || mIdx}`} className="border-b border-slate-50 last:border-none relative">
                    <button
                        onClick={() => setExpandedModules(prev => ({ ...prev, [mIdx]: !prev[mIdx] }))}
                        className={`w-full flex items-center justify-between px-6 py-5 text-left hover:bg-slate-50/50 transition-all sticky top-0 z-20 bg-white/90 backdrop-blur-lg border-b border-transparent ${isExpanded ? 'border-primary/5 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]' : ''}`}
                    >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <motion.div
                                animate={{ rotate: isExpanded ? 0 : -90 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className={`shrink-0 h-6 w-6 flex items-center justify-center rounded-lg ${isExpanded ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'}`}
                            >
                                <LucideChevronDown className="h-4 w-4" />
                            </motion.div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">Módulo {mIdx + 1}</span>
                                <span className="text-sm font-black text-slate-900 tracking-tight leading-tight">{module.title}</span>
                            </div>
                        </div>
                        {dur && (
                            <div className="shrink-0 bg-slate-100 px-2 py-1 rounded-md">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{dur}</span>
                            </div>
                        )}
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
                                className="overflow-hidden bg-slate-50/30"
                            >
                                {(module.lessons || []).map((lesson: any, lIdx: number) => {
                                    const isFirst = mIdx === 0 && lIdx === 0;
                                    const prevLesson = lIdx > 0 ? module.lessons[lIdx - 1] : mIdx > 0 ? modules[mIdx - 1]?.lessons?.[modules[mIdx - 1].lessons.length - 1] : null;
                                    
                                    const isPrivileged = userRole === 'ADMIN' || userRole === 'INSTRUCTOR' || userRole === 'SUPER_ADMIN';
                                    const isLocked = !isPrivileged && !isFirst && (!prevLesson || !prevLesson.completed);
                                    const isActive = mIdx === currentModuleIdx && lIdx === currentLessonIdx;

                                    return (
                                        <button
                                            key={`lesson-${lIdx}-${lesson.id || lIdx}`}
                                            disabled={!isEnrolled || !!isLocked}
                                            onClick={() => { if (!isLocked) goToLesson(mIdx, lIdx); }}
                                            className={`w-full flex items-center gap-4 px-6 py-4 text-left transition-all group relative ${isActive ? 'bg-primary/5' : 'hover:bg-slate-100/50'} ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        >
                                            {isActive && (
                                                <motion.div 
                                                    layoutId="active-indicator"
                                                    className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full shadow-[0_0_15px_rgba(255,165,0,0.5)]" 
                                                />
                                            )}
                                            
                                            <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                                                lesson.completed ? 'bg-primary shadow-md shadow-primary/20' 
                                                : isActive ? 'border-2 border-primary bg-primary/5' 
                                                : 'bg-white border border-slate-200'
                                            }`}>
                                                {isLocked ? <LucideLock className="h-3 w-3 text-slate-300" />
                                                    : lesson.completed ? <LucideCheck className="h-4 w-4 text-white" />
                                                        : isActive ? <LucidePlay className="h-3 w-3 text-primary fill-primary ml-0.5" />
                                                            : <span className="text-[10px] text-slate-400 font-black">{lIdx + 1}</span>}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-bold leading-tight ${isActive ? 'text-primary' : lesson.completed ? 'text-slate-400' : 'text-slate-700'}`}>
                                                    {lesson.title}
                                                </p>
                                            </div>

                                            <div className="shrink-0">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                                                    isActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                    {lesson.contentType === 'VIDEO'
                                                        ? (lesson.duration && lesson.duration !== '0:00' ? formatDuration(lesson.duration) : 'Vídeo')
                                                        : lesson.contentType === 'PDF' ? 'PDF' : lesson.contentType === 'QUIZ' ? 'Questões' : 'Desafio'}
                                                </span>
                                            </div>
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

export default SyllabusList;
