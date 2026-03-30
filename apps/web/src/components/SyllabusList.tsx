import { motion, AnimatePresence } from "framer-motion";
import { LucideChevronDown, LucideLock, LucideCheck, LucidePlay } from "lucide-react";

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
                                            <span className="shrink-0 text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                                                {lesson.contentType === 'VIDEO'
                                                    ? (lesson.duration && lesson.duration !== '0:00' ? formatDuration(lesson.duration) : 'Vídeo')
                                                    : lesson.contentType === 'PDF' ? 'PDF' : lesson.contentType === 'QUIZ' ? 'Quiz' : 'Desafio'}
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

export default SyllabusList;
