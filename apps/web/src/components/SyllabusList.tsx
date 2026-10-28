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
    isLessonLocked: (mIdx: number, lIdx: number) => boolean;
}

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

const SyllabusList = ({
    modules,
    expandedModules,
    setExpandedModules,
    currentModuleIdx,
    currentLessonIdx,
    isEnrolled,
    goToLesson,
    formatDuration,
    totalModuleDuration,
    isLessonLocked
}: SyllabusListProps) => (
    <div className="divide-y divide-slate-100">
        {modules.map((module, mIdx) => {
            const isExpanded = !!expandedModules[mIdx];
            const dur = totalModuleDuration(module);
            return (
                <div key={`module-${mIdx}-${module.id || mIdx}`} className="relative">
                    <button
                        onClick={() => setExpandedModules(prev => ({ ...prev, [mIdx]: !prev[mIdx] }))}
                        className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors sticky top-0 z-20 border-b ${
                            isExpanded ? 'border-slate-200/80 bg-slate-50 hover:bg-slate-100 shadow-2xs' : 'border-slate-100 bg-white hover:bg-slate-50'
                        }`}
                    >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <motion.div
                                animate={{ rotate: isExpanded ? 0 : -90 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                className={`shrink-0 h-5 w-5 flex items-center justify-center rounded-md ${
                                    isExpanded ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'
                                }`}
                            >
                                <LucideChevronDown className="h-3.5 w-3.5" />
                            </motion.div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider leading-none mb-0.5">
                                    Módulo {mIdx + 1}
                                </span>
                                <span className="text-xs font-semibold text-slate-900 truncate">
                                    {normalizeTitle(module.title)}
                                </span>
                            </div>
                        </div>
                        {dur && (
                            <span className="shrink-0 text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                {dur}
                            </span>
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
                                    opacity: { duration: 0.15 }
                                }}
                                className="overflow-hidden bg-slate-50/40 divide-y divide-slate-100/70"
                            >
                                {(module.lessons || []).map((lesson: any, lIdx: number) => {
                                    const isLocked = isLessonLocked(mIdx, lIdx);
                                    const isActive = mIdx === currentModuleIdx && lIdx === currentLessonIdx;

                                    return (
                                        <button
                                            key={`lesson-${lIdx}-${lesson.id || lIdx}`}
                                            disabled={!isEnrolled || !!isLocked}
                                            onClick={() => { if (!isLocked) goToLesson(mIdx, lIdx); }}
                                            className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors group relative ${
                                                isActive ? 'bg-amber-50/70 text-slate-900' : 'hover:bg-slate-100/60 text-slate-700'
                                            } ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        >
                                            {isActive && (
                                                <motion.div 
                                                    layoutId="active-indicator"
                                                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500 rounded-r" 
                                                />
                                            )}
                                            
                                            <div className={`shrink-0 h-6 w-6 rounded-md flex items-center justify-center text-xs transition-colors ${
                                                lesson.completed ? 'bg-emerald-500 text-white' 
                                                : isActive ? 'bg-amber-500 text-white shadow-2xs font-semibold' 
                                                : 'bg-slate-100 text-slate-500 font-medium'
                                            }`}>
                                                {isLocked ? <LucideLock className="h-3 w-3 text-slate-300" />
                                                    : lesson.completed ? <LucideCheck className="h-3.5 w-3.5" />
                                                        : isActive ? <LucidePlay className="h-3 w-3 fill-current ml-0.5" />
                                                            : <span>{lIdx + 1}</span>}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs leading-tight truncate ${
                                                    isActive ? 'font-semibold text-slate-900' : lesson.completed ? 'text-slate-500' : 'text-slate-700'
                                                }`}>
                                                    {normalizeTitle(lesson.title)}
                                                </p>
                                            </div>

                                            <div className="shrink-0">
                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                                    isActive ? 'bg-amber-100/70 text-amber-800' : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                    {lesson.contentType === 'VIDEO'
                                                        ? (lesson.duration && lesson.duration !== '0:00' ? formatDuration(lesson.duration) : 'Vídeo')
                                                        : lesson.contentType === 'PDF' ? 'PDF' : lesson.contentType === 'QUIZ' ? 'Quiz' : 'Desafio'}
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
