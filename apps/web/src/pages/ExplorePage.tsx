import { motion } from "framer-motion";
import { LucideSearch, LucideFilter, LucideLayoutGrid } from "lucide-react";
import { getIconComponent } from "../utils/icons";
import { CourseCard } from "../components/CourseCard";
import { Link } from "react-router-dom";

import { useCourseStore } from "../store/courseStore";
import api from "../utils/api";
import Skeleton from "../components/Skeleton";

import React, { useEffect, useState } from "react";

export default function ExplorePage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const { courses, fetchCourses, isLoading } = useCourseStore();

    useEffect(() => {
        const loadData = async () => {
            fetchCourses();
            try {
                const { data } = await api.get('/categories');
                setCategories(data);
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        };
        loadData();
    }, []);

    const filteredCourses = courses.filter(course => {
        const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase()) ||
            course.instructor.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !selectedCategory || course.categoryId === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-10">
            <div className="md:px-0">
                <h1 className="text-[28px] md:text-4xl font-black tracking-tighter text-slate-900 uppercase italic leading-none">Explorar conteúdo</h1>
                <p className="text-slate-400 text-[10px] md:text-lg font-black uppercase tracking-[0.2em] md:tracking-widest mt-2 italic invisible sm:visible">Encontre seu próximo conhecimento.</p>
            </div>

            <div className="flex flex-col gap-8 md:px-0">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <LucideSearch className="h-5 w-5 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Pesquisar..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-14 pr-6 py-4 md:py-4.5 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all font-black text-slate-900 placeholder:text-slate-300 uppercase tracking-tight text-[10px] md:text-sm shadow-sm"
                        />
                    </div>
                </div>

                {/* Category Chips - Scrollable on Mobile */}
                <div className="flex overflow-x-auto md:overflow-visible no-scrollbar gap-2.5 py-3 pb-4 -mx-6 px-6 md:mx-0 md:px-1 md:flex-wrap scroll-smooth relative">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${selectedCategory === null
                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105"
                            : "bg-white text-slate-400 border-slate-200 hover:border-primary hover:text-primary"
                            }`}
                    >
                        Todos
                    </button>
                    {categories.length === 0 && isLoading ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="h-10 w-28 bg-slate-200 rounded-xl animate-shimmer" />
                        ))
                    ) : (
                        categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2.5 whitespace-nowrap shadow-sm ${selectedCategory === cat.id
                                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105"
                                    : "bg-white text-slate-400 border-slate-200 hover:border-primary hover:text-primary"
                                    }`}
                            >
                                {cat.icon && (
                                    <div className={`${selectedCategory === cat.id ? "text-white" : "text-primary"} transition-colors`}>
                                        {getIconComponent(cat.icon, "h-4 w-4")}
                                    </div>
                                )}
                                {cat.name}
                            </button>
                        ))
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 md:px-0">
                {isLoading ? (
                    [...Array(8)].map((_, i) => (
                        <div key={i} className="space-y-4">
                            <Skeleton className="h-[200px] w-full" variant="rounded" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-3/4" variant="rectangle" />
                                <Skeleton className="h-3 w-1/2" variant="rectangle" />
                            </div>
                        </div>
                    ))
                ) : filteredCourses.length > 0 ? (
                    filteredCourses.map(course => (
                        <CourseCard key={course.id} {...course} hideProgress={true} />
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                            <LucideSearch className="h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-slate-500 font-bold">Nenhum curso encontrado</p>
                            <p className="text-slate-400 text-xs">Tente ajustar seus filtros ou busca.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
