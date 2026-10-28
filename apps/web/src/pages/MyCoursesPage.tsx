import React, { useEffect } from "react";
import { LucideBookOpen, LucidePlus } from "lucide-react";
import { Link } from "react-router-dom";
import { useCourseStore } from "../store/courseStore";
import { CourseCard } from "../components/CourseCard";
import Skeleton from "../components/Skeleton";

export default function MyCoursesPage() {
    const myCourses = useCourseStore(state => state.myCourses);
    const isLoading = useCourseStore(state => state.isMyCoursesLoading);
    const fetchMyCourses = useCourseStore(state => state.fetchMyCourses);

    useEffect(() => {
        fetchMyCourses();
    }, [fetchMyCourses]);

    const enrolledCourses = myCourses;

    return (
        <div className="space-y-8 w-full pb-10">
            {/* Header with Clean Stat Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Meus cursos</h1>
                    <p className="text-sm text-zinc-500 mt-1">Acompanhe seu progresso e continue seus estudos.</p>
                </div>

                {/* Refined Stat Pill */}
                <div className="inline-flex items-center gap-3 self-start sm:self-auto bg-white border border-zinc-200/80 px-4 py-2.5 rounded-2xl shadow-2xs">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-[#F19B0A]">
                        <LucideBookOpen className="w-4 h-4" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold text-zinc-900">{enrolledCourses.length}</span>
                        <span className="text-xs text-zinc-500 font-medium">
                            {enrolledCourses.length === 1 ? 'curso em andamento' : 'cursos em andamento'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                {isLoading ? (
                    // Skeleton Loaders
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white border border-zinc-200/80 rounded-2xl p-4 space-y-4 h-[320px] flex flex-col justify-between">
                            <Skeleton className="aspect-video w-full" variant="rounded" />
                            <div className="space-y-2 flex-1 pt-2">
                                <Skeleton className="h-4 w-3/4" variant="rectangle" />
                                <Skeleton className="h-3 w-1/2" variant="rectangle" />
                            </div>
                            <div className="pt-3 border-t border-zinc-100 space-y-2">
                                <div className="flex justify-between">
                                    <Skeleton className="h-2 w-1/4" variant="rectangle" />
                                    <Skeleton className="h-2 w-8" variant="rectangle" />
                                </div>
                                <Skeleton className="h-1.5 w-full" variant="rectangle" />
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

                {/* Explore More Card */}
                {!isLoading && (
                    <Link to="/explore" className="group block h-full">
                        <div className="h-full min-h-[280px] border-2 border-dashed border-zinc-200/80 hover:border-amber-400 hover:bg-amber-50/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 transition-all duration-200 group">
                            <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-200/60 group-hover:bg-amber-50 group-hover:border-amber-200/80 flex items-center justify-center text-zinc-400 group-hover:text-[#F19B0A] transition-colors shadow-2xs">
                                <LucidePlus className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm text-zinc-900 group-hover:text-zinc-950 transition-colors">
                                    Explorar novos cursos
                                </h4>
                                <p className="text-xs text-zinc-500 mt-1 max-w-[180px]">
                                    Descubra outros conteúdos para continuar evoluindo
                                </p>
                            </div>
                        </div>
                    </Link>
                )}
            </div>
        </div>
    );
}
