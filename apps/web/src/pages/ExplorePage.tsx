import { LucideSearch } from "lucide-react";
import { getIconComponent } from "../utils/icons";
import { CourseCard } from "../components/CourseCard";
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
            course.instructor?.toLowerCase?.().includes(search.toLowerCase());
        const matchesCategory = !selectedCategory || course.categoryId === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-8 w-full pb-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Explorar conteúdo</h1>
                <p className="text-sm text-zinc-500 mt-1">Encontre seu próximo curso e expanda seus conhecimentos.</p>
            </div>

            {/* Search and Filters */}
            <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative flex-1 group max-w-2xl">
                    <LucideSearch className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#F19B0A] transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar cursos por título ou instrutor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white border border-zinc-200/80 rounded-xl pl-11 pr-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#F19B0A] focus:ring-2 focus:ring-[#F19B0A]/10 outline-none transition-all shadow-xs"
                    />
                </div>

                {/* Category Chips - Scrollable on Mobile */}
                <div className="flex overflow-x-auto no-scrollbar gap-2 py-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scroll-smooth items-center">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all border whitespace-nowrap active:scale-[0.98] ${
                            selectedCategory === null
                                ? "bg-[#F19B0A] text-white border-[#F19B0A] shadow-xs"
                                : "bg-white text-zinc-600 border-zinc-200/80 hover:border-zinc-300 hover:text-zinc-900"
                        }`}
                    >
                        Todos
                    </button>
                    {categories.length === 0 && isLoading ? (
                        [...Array(4)].map((_, i) => (
                            <div key={i} className="h-9 w-24 bg-zinc-100 rounded-xl animate-pulse" />
                        ))
                    ) : (
                        categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all border flex items-center gap-2 whitespace-nowrap active:scale-[0.98] ${
                                    selectedCategory === cat.id
                                        ? "bg-[#F19B0A] text-white border-[#F19B0A] shadow-xs"
                                        : "bg-white text-zinc-600 border-zinc-200/80 hover:border-zinc-300 hover:text-zinc-900"
                                }`}
                            >
                                {cat.icon && (
                                    <div className={selectedCategory === cat.id ? "text-white" : "text-zinc-500"}>
                                        {getIconComponent(cat.icon, "h-3.5 w-3.5")}
                                    </div>
                                )}
                                <span>{cat.name}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
                {isLoading ? (
                    [...Array(8)].map((_, i) => (
                        <div key={i} className="bg-white border border-zinc-200/80 rounded-2xl p-4 space-y-4">
                            <Skeleton className="h-40 w-full" variant="rounded" />
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
                    <div className="col-span-full py-16 text-center space-y-3">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
                            <LucideSearch className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-zinc-900 font-semibold text-sm">Nenhum curso encontrado</p>
                            <p className="text-zinc-500 text-xs mt-1">Tente ajustar seus termos de busca ou selecionar outra categoria.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
