import React, { useEffect } from "react";
import { LucidePlay, LucideClock, LucideBookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { useCourseStore } from "../store/courseStore";
import { resolveThumbnail } from "../utils/url";
import { CourseCard } from "../components/CourseCard";

export default function MyCoursesPage() {
    const myCourses = useCourseStore(state => state.myCourses);
    const isLoading = useCourseStore(state => state.isMyCoursesLoading);
    const fetchMyCourses = useCourseStore(state => state.fetchMyCourses);

    useEffect(() => {
        fetchMyCourses();
    }, []);

    const enrolledCourses = myCourses;

    return (
        <div className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:px-0">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tighter text-slate-900 uppercase italic leading-none">Meus Cursos</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] md:text-xs">Sua jornada de aprendizado contínuo.</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-900 text-white px-5 md:px-6 py-4 rounded-2xl border border-slate-800 shadow-xl">
                    <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <LucideBookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 italic">Inscrições</p>
                        <p className="text-base md:text-lg font-black tracking-tight">{enrolledCourses.length} <span className="text-[10px] text-white/60">ATIVOS</span></p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 md:px-0">
                {isLoading ? (
                    // Skeleton Loaders
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden shadow-sm h-[350px] flex flex-col">
                            <div className="aspect-video bg-slate-200 animate-shimmer" />
                            <div className="p-5 flex-1 space-y-4">
                                <div className="space-y-2">
                                    <div className="h-4 bg-slate-200 rounded w-3/4 animate-shimmer" />
                                    <div className="h-3 bg-slate-200 rounded w-1/2 animate-shimmer" />
                                </div>
                                <div className="pt-4 border-t border-slate-100 space-y-2">
                                    <div className="flex justify-between">
                                        <div className="h-2 bg-slate-200 rounded w-1/4 animate-shimmer" />
                                        <div className="h-2 bg-slate-200 rounded w-10 animate-shimmer" />
                                    </div>
                                    <div className="h-1.5 bg-slate-200 rounded-full w-full animate-shimmer" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    enrolledCourses.map((course) => (
                        <CourseCard
                            key={course.id}
                            {...course}
                            progress={course.progress}
                            isEnrolled={true}
                        />
                    ))
                )}

                {!isLoading && (
                    <Link to="/explore" className="group">
                        <div className="h-full border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4 hover:border-primary hover:bg-primary/5 transition-all group min-h-[300px]">
                            <div className="h-14 w-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-primary transition-all shadow-sm">
                                <LucideBookOpen className="h-6 w-6 text-slate-400 group-hover:text-white transition-colors" />
                            </div>
                            <div>
                                <h4 className="font-black text-slate-900 uppercase tracking-tight">Explorar mais cursos</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Conhecimento infinito</p>
                            </div>
                        </div>
                    </Link>
                )}
            </div>
        </div>
    );
}
