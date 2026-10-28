import { motion } from "framer-motion";
import { LucidePlay, LucidePlayCircle, LucideArrowRight } from "lucide-react";
import { getIconComponent } from "../utils/icons";
import { Link } from "react-router-dom";
import React, { useState, useEffect, useMemo } from "react";
import api from "../utils/api";
import { useCourseStore } from "../store/courseStore";
import { resolveThumbnail } from "../utils/url";
import Skeleton from "../components/Skeleton";

interface Category {
    id: string;
    name: string;
    icon?: string;
}

export default function Dashboard() {
    const [categories, setCategories] = useState<Category[]>([]);
    const { courses, fetchCourses, isLoading } = useCourseStore();

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data } = await api.get('/categories');
                setCategories(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error fetching categories:", error);
                setCategories([]);
            }
        };
        fetchCategories();
        fetchCourses();
    }, [fetchCourses]);

    // Calculate real Continue Watching (Only for enrolled courses in progress)
    const inProgressCourse = useMemo(() => [...courses]
        .filter(c => c.isEnrolled && (c.progress ?? 0) < 100)
        .sort((a, b) => {
            if (a.lastAccessedAt && b.lastAccessedAt) {
                return new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime();
            }
            if (a.lastAccessedAt) return -1;
            if (b.lastAccessedAt) return 1;
            return (b.progress ?? 0) - (a.progress ?? 0);
        })[0], [courses]);

    const latestCourse = useMemo(() => [...courses].sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA;
    })[0], [courses]);

    return (
        <div className="space-y-10 w-full pb-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Início</h1>
                <p className="text-sm text-zinc-500 mt-1">Sua jornada de aprendizado na Brilha Mais.</p>
            </div>

            {/* Dynamic News Banner */}
            <section>
                {isLoading ? (
                    <div className="relative h-[260px] sm:h-[320px] md:h-[350px] rounded-2xl overflow-hidden bg-white border border-zinc-200/80 shadow-xs">
                        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 space-y-4">
                            <Skeleton className="h-4 w-24" variant="rounded" />
                            <Skeleton className="h-8 md:h-10 w-2/3" variant="rounded" />
                            <Skeleton className="h-4 w-1/2" variant="rectangle" />
                            <div className="flex gap-3 pt-2">
                                <Skeleton className="h-10 w-28" variant="rounded" />
                                <Skeleton className="h-10 w-28" variant="rounded" />
                            </div>
                        </div>
                    </div>
                ) : latestCourse ? (
                    <div className="relative h-[260px] sm:h-[320px] md:h-[360px] rounded-2xl overflow-hidden group border border-zinc-200/80 shadow-xs">
                        <img
                            src={resolveThumbnail(latestCourse.thumbnail)}
                            alt={latestCourse.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        {/* Gradient legibility layer */}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/50 to-transparent md:bg-gradient-to-r md:from-zinc-950/95 md:via-zinc-950/50 md:to-transparent" />
                        
                        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 md:p-10 space-y-3 md:space-y-4">
                            {/* Clean Status Pill */}
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 bg-amber-500/90 text-white px-2.5 py-0.5 rounded-full text-xs font-semibold backdrop-blur-md">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    Novidade
                                </span>
                                <span className="text-zinc-300 text-xs font-medium">Brilha Mais News</span>
                            </div>

                            {/* Title */}
                            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold max-w-xl text-white tracking-tight leading-snug line-clamp-2">
                                {latestCourse.title}
                            </h2>

                            {/* Description */}
                            {latestCourse.description && (
                                <p className="hidden md:block text-zinc-300 text-sm max-w-lg line-clamp-2 font-normal leading-relaxed">
                                    {latestCourse.description}
                                </p>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-row gap-3 pt-1">
                                <Link
                                    to={`/course/${latestCourse.id}`}
                                    className="bg-white hover:bg-zinc-100 text-zinc-950 px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-sm active:scale-[0.98] whitespace-nowrap"
                                >
                                    <LucidePlay className="h-4 w-4 fill-current shrink-0" />
                                    <span>Assistir</span>
                                </Link>
                                <Link
                                    to={`/course/${latestCourse.id}`}
                                    className="bg-white/15 hover:bg-white/25 backdrop-blur-md text-white px-5 py-2.5 rounded-xl font-medium text-sm border border-white/20 transition-all active:scale-[0.98] whitespace-nowrap"
                                >
                                    Ver Detalhes
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : null}
            </section>

            {/* Continue Watching */}
            {(isLoading || inProgressCourse) && (
                <section className="w-full">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Continue assistindo</h2>
                    </div>

                    <div className="grid grid-cols-1 max-w-2xl gap-4">
                        {isLoading ? (
                            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 flex gap-4 sm:gap-5 items-center">
                                <Skeleton className="h-20 w-32 sm:h-24 sm:w-40 shrink-0" variant="rounded" />
                                <div className="space-y-3 flex-1">
                                    <Skeleton className="h-3 w-20" variant="rectangle" />
                                    <Skeleton className="h-4 w-full" variant="rounded" />
                                    <Skeleton className="h-2 w-full" variant="rectangle" />
                                </div>
                            </div>
                        ) : inProgressCourse && (
                            <Link to={`/course/${inProgressCourse.id}`} className="group block">
                                <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-5 items-center sm:items-start hover:border-zinc-300 hover:shadow-sm transition-all">
                                    <div className="w-full sm:w-40 h-32 sm:h-24 rounded-xl overflow-hidden shrink-0 shadow-xs border border-zinc-100 relative group-hover:shadow-sm transition-shadow">
                                        <img
                                            src={resolveThumbnail(inProgressCourse.thumbnail)}
                                            alt={inProgressCourse.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                            <LucidePlayCircle className="h-8 w-8 text-white opacity-90 group-hover:scale-110 transition-transform" />
                                        </div>
                                    </div>

                                    <div className="space-y-3 w-full flex-1">
                                        <div>
                                            <span className="text-xs font-semibold text-[#F19B0A] mb-1 block">
                                                {typeof inProgressCourse.category === 'object' ? (inProgressCourse.category as any)?.name : inProgressCourse.category || 'Curso'}
                                            </span>
                                            <h3 className="text-base font-semibold leading-snug text-zinc-900 line-clamp-1 group-hover:text-[#F19B0A] transition-colors">
                                                {inProgressCourse.title}
                                            </h3>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-xs text-zinc-500">
                                                <span>{inProgressCourse.lastLesson || 'Próxima Aula'}</span>
                                                <span className="font-semibold text-zinc-700">{inProgressCourse.progress || 0}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${inProgressCourse.progress || 0}%` }}
                                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                                    className="h-full bg-[#F19B0A]"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )}
                    </div>
                </section>
            )}

            {/* Categories */}
            <section className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Categorias</h2>
                    {!isLoading && (
                        <Link to="/explore" className="text-xs font-medium text-[#F19B0A] hover:text-[#D98B08] flex items-center gap-1 transition-colors">
                            <span>Ver todas</span>
                            <LucideArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                    {isLoading ? (
                        [...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white border border-zinc-200/80 h-24 rounded-xl flex flex-col items-center justify-center gap-2.5 p-3">
                                <Skeleton className="h-9 w-9" variant="rounded" />
                                <Skeleton className="h-3 w-16" variant="rectangle" />
                            </div>
                        ))
                    ) : Array.isArray(categories) && categories.length > 0 ? (
                        categories.map((cat, idx) => (
                            <Link
                                key={idx}
                                to="/explore"
                                className="bg-white border border-zinc-200/80 hover:border-amber-300 hover:bg-amber-50/20 h-24 rounded-xl transition-all flex flex-col items-center justify-center gap-2.5 p-3 group shadow-2xs hover:shadow-xs active:scale-[0.98]"
                            >
                                <div className="w-9 h-9 bg-zinc-50 border border-zinc-100 rounded-lg flex items-center justify-center group-hover:bg-amber-50 group-hover:border-amber-200/60 transition-colors shadow-2xs">
                                    <div className="text-zinc-600 group-hover:text-[#F19B0A] transition-colors">
                                        {getIconComponent(cat.icon || "LucideLayoutGrid", "h-4 w-4")}
                                    </div>
                                </div>
                                <span className="text-xs font-medium text-zinc-700 group-hover:text-zinc-950 text-center px-1 leading-tight line-clamp-1">
                                    {cat.name}
                                </span>
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-full py-6 text-center text-xs text-zinc-400 italic">
                            Nenhuma categoria cadastrada.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
