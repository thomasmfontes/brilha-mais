import { motion } from "framer-motion";
import { LucidePlay, LucideClock, LucideStar, LucidePlayCircle, LucideLayoutGrid, LucideBookOpen } from "lucide-react";
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
                setCategories(data);
            } catch (error) {
                console.error("Error fetching categories:", error);
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
        <div className="space-y-12 w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-[28px] md:text-5xl font-black tracking-tighter text-slate-900 uppercase italic leading-none">Início</h1>
                    <p className="text-slate-400 text-[10px] md:text-lg font-bold uppercase tracking-[0.2em] md:tracking-widest mt-2 italic invisible sm:visible">Sua jornada Brilha Mais começa aqui.</p>
                </div>
            </div>

            {/* Dynamic News Banner */}
            <section>
                {isLoading ? (
                    <div className="relative h-[250px] md:h-[350px] rounded-[2.5rem] overflow-hidden bg-white border border-slate-100 shadow-xl">
                        <div className="absolute inset-x-0 bottom-0 p-6 md:p-10 space-y-4">
                            <div className="flex gap-2">
                                <Skeleton className="h-3 md:h-4 w-16 md:w-20" variant="rectangle" />
                                <Skeleton className="h-3 md:h-4 w-24 md:w-32" variant="rectangle" />
                            </div>
                            <Skeleton className="h-8 md:h-10 w-2/3" variant="rounded" />
                            <Skeleton className="h-3 md:h-4 w-1/2" variant="rectangle" />
                            <div className="flex gap-3 pt-2">
                                <Skeleton className="h-10 md:h-12 w-24 md:w-32" variant="rounded" />
                                <Skeleton className="h-10 md:h-12 w-24 md:w-32" variant="rounded" />
                            </div>
                        </div>
                    </div>
                ) : latestCourse ? (
                    <div className="relative h-[280px] md:h-[350px] rounded-[2.5rem] overflow-hidden group border border-slate-200 shadow-lg">
                        <img
                            src={resolveThumbnail(latestCourse.thumbnail)}
                            alt={latestCourse.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        {/* Gradient: stronger on mobile for legibility */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/70 to-slate-900/10 md:bg-gradient-to-r md:from-slate-900 md:via-slate-900/20 md:to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-5 md:p-10 space-y-2 md:space-y-4">
                            {/* Badge row */}
                            <div className="flex items-center gap-2">
                                <span className="bg-primary text-white px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.15em] shadow-lg shadow-primary/20">Novidade</span>
                                <span className="text-white/50 text-[9px] font-black uppercase tracking-[0.15em] italic">Brilha Mais News</span>
                            </div>
                            {/* Title */}
                            <h2 className="text-xl md:text-4xl font-black max-w-xl leading-none text-white uppercase tracking-tighter italic line-clamp-2">
                                {latestCourse.title}
                            </h2>
                            {/* Description - hidden on mobile */}
                            <p className="hidden md:block text-slate-300 text-sm max-w-lg line-clamp-2 font-medium leading-relaxed">
                                {latestCourse.description}
                            </p>
                            {/* Buttons - always side by side */}
                            <div className="flex flex-row gap-3 pt-1">
                                <Link to={`/course/${latestCourse.id}`} className="bg-primary text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary/10 whitespace-nowrap">
                                    <LucidePlay className="h-3.5 w-3.5 fill-current shrink-0" /> Assistir
                                </Link>
                                <Link to={`/course/${latestCourse.id}`} className="bg-white/10 backdrop-blur-md text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/20 hover:bg-white/20 transition-colors whitespace-nowrap">
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
                    <div className="flex items-center gap-2 mb-6">
                        <div className="h-8 w-1 bg-primary rounded-full shadow-lg shadow-primary/20" />
                        <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 italic">Continue Assistindo</h2>
                    </div>
                    <div className="grid grid-cols-1 max-w-2xl gap-8 md:px-0">
                        {isLoading ? (
                            <div className="bg-white border border-slate-100 rounded-2xl p-5 flex gap-6 items-center overflow-hidden">
                                <Skeleton className="h-28 w-28 shrink-0" variant="rounded" />
                                <div className="space-y-4 flex-1">
                                    <div className="space-y-2">
                                        <Skeleton className="h-2 w-20" variant="rectangle" />
                                        <Skeleton className="h-4 w-full" variant="rounded" />
                                    </div>
                                    <div className="pt-2 space-y-2">
                                        <div className="flex justify-between">
                                            <Skeleton className="h-2 w-1/4" variant="rectangle" />
                                            <Skeleton className="h-2 w-10" variant="rectangle" />
                                        </div>
                                        <Skeleton className="h-1.5 w-full" variant="rectangle" />
                                    </div>
                                </div>
                            </div>
                        ) : inProgressCourse && (
                            <Link to={`/course/${inProgressCourse.id}`} className="group">
                                <div className="bg-white border border-slate-200 rounded-[2rem] p-5 flex flex-col sm:flex-row gap-6 items-center sm:items-start hover:border-primary transition-colors shadow-sm group">
                                    <div className="h-24 w-24 md:h-28 md:w-28 rounded-[1.25rem] md:rounded-[1.5rem] overflow-hidden shrink-0 shadow-lg border border-slate-100 relative">
                                        <img
                                            src={resolveThumbnail(inProgressCourse.thumbnail)}
                                            alt={inProgressCourse.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-transparent transition-colors flex items-center justify-center">
                                            <LucidePlayCircle className="h-8 w-8 text-white opacity-80 group-hover:scale-110 transition-transform" />
                                        </div>
                                    </div>
                                    <div className="space-y-4 w-full text-center sm:text-left flex-1">
                                        <div>
                                            <span className="text-[9px] uppercase font-black tracking-[0.2em] text-primary italic mb-1 block">
                                                {typeof inProgressCourse.category === 'object' ? (inProgressCourse.category as any)?.name : inProgressCourse.category || 'Curso'}
                                            </span>
                                            <h3 className="text-lg font-black leading-tight text-slate-900 uppercase tracking-tight line-clamp-1">{inProgressCourse.title}</h3>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                <span>{inProgressCourse.lastLesson || 'Próxima Aula'}</span>
                                                <span className="text-primary">{inProgressCourse.progress || 0}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 border border-slate-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${inProgressCourse.progress || 0}%` }}
                                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                                    className="h-full bg-primary"
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
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-1 bg-primary rounded-full shadow-lg shadow-primary/20" />
                        <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 italic">Categorias</h2>
                    </div>
                    {!isLoading && (
                        <Link to="/explore" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline italic">Ver tudo</Link>
                    )}
                </div>
                <div className="flex overflow-x-auto no-scrollbar gap-4 pb-4 -mx-6 px-6 md:grid md:grid-cols-4 lg:grid-cols-6 md:mx-0 md:px-0 scroll-smooth">
                    {isLoading ? (
                        [...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white border border-slate-100 h-28 rounded-[2rem] flex flex-col items-center justify-center gap-3 min-w-[120px]">
                                <Skeleton className="h-10 w-10" variant="rounded" />
                                <Skeleton className="h-2 w-2/3" variant="rectangle" />
                            </div>
                        ))
                    ) : (
                        categories.map((cat, idx) => (
                            <Link key={idx} to="/explore" className="bg-white border border-slate-200 h-28 min-w-[120px] md:min-w-0 md:w-full rounded-[2rem] hover:border-primary transition-colors flex flex-col items-center justify-center gap-3 group shadow-sm hover:shadow-md">
                                <div className="h-10 w-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center group-hover:bg-primary transition-colors shadow-sm">
                                    <div className="text-primary group-hover:text-white transition-colors">
                                        {getIconComponent(cat.icon || "LucideLayoutGrid", "h-4 w-4")}
                                    </div>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 text-center px-3 leading-tight break-words">{cat.name}</span>
                            </Link>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
