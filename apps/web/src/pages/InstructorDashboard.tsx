import { motion, AnimatePresence } from "framer-motion";
import { LucideChevronLeft, LucidePlus, LucideSave, LucideSettings, LucideTrash2, LucideUsers, LucideEdit, LucideFileText, LucideLayout, LucideImage, LucideAlertTriangle, LucideShield, LucideLock, LucideUnlock, LucideSearch, LucideX } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { compressImage } from "@/utils/image";
import { useCourseStore } from "../store/courseStore";
import { getYoutubeId } from "../utils/youtube";
import { resolveThumbnail } from "../utils/url";
import api from "../utils/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { PortalModal } from "../components/PortalModal";

export default function InstructorDashboard() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();
    const [isUploading, setIsUploading] = useState(false);
    const [editingCourse, setEditingCourse] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isLoadingCourses, setIsLoadingCourses] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ message: string; subtext?: string; onConfirm: () => void } | null>(null);

    const courses = useCourseStore(state => state.instructorCourses);
    const addCourse = useCourseStore(state => state.addCourse);
    const updateCourse = useCourseStore(state => state.updateCourse);
    const removeCourseStore = useCourseStore(state => state.removeCourse); // Renamed to avoid conflict
    const fetchInstructorCourses = useCourseStore(state => state.fetchInstructorCourses);

    const [newCourse, setNewCourse] = useState({
        title: "",
        category: "",
        thumbnail: "",
        youtubeUrl: "",
        instructorId: ""
    });

    const [instructors, setInstructors] = useState<any[]>([]);

    const [assignedCategories, setAssignedCategories] = useState<any[]>([]);

    const fetchInstructorCoursesWithLoading = async () => {
        setIsLoadingCourses(true);
        try {
            await fetchInstructorCourses();
        } finally {
            setIsLoadingCourses(false);
        }
    };

    const fetchInitialData = async () => {
        await Promise.all([
            fetchInstructorCoursesWithLoading(),
            fetchStats()
        ]);
    };


    useEffect(() => {
        fetchUser();
        fetchInitialData();
    }, []);

    const fetchStats = async () => {
        setIsLoadingStats(true);
        try {
            const { data } = await api.get('/stats/instructor');
            setStats(data);
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const fetchUser = async () => {
        try {
            const response = await api.get('/users/me');
            if (response.data) {
                const userData = response.data;
                setUserRole(userData.role);
                
                // If it's a Super Admin, they should see all categories
                if (userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN') {
                    const [{ data: allCategories }, { data: allUsers }] = await Promise.all([
                        api.get('/categories'),
                        api.get('/users')
                    ]);
                    setAssignedCategories(allCategories);
                    
                    const instructorList = allUsers.filter((u: any) => u.role === 'INSTRUCTOR' || u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
                    setInstructors(instructorList);

                    if (allCategories.length > 0) {
                        setNewCourse(prev => ({ ...prev, category: allCategories[0].id }));
                    }
                    
                    // Set default instructor to current user
                    setNewCourse(prev => ({ ...prev, instructorId: userData.id }));
                } else if (userData.assignedAreas) {
                    const categories = userData.assignedAreas.map((area: any) => area.category);
                    setAssignedCategories(categories);
                    if (categories.length > 0) {
                        setNewCourse(prev => ({ ...prev, category: categories[0].id }));
                    }
                    setNewCourse(prev => ({ ...prev, instructorId: userData.id }));
                }
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCourse.title || !newCourse.category) {
            toast.error("Por favor, preencha o título e selecione uma categoria/área.");
            return;
        }

        setIsSaving(true);

        try {
            if (editingCourse) {
                await updateCourse(editingCourse.id, {
                    title: newCourse.title,
                    categoryId: newCourse.category,
                    thumbnail: newCourse.thumbnail,
                    youtubeUrl: newCourse.youtubeUrl,
                    instructorId: newCourse.instructorId
                });
            } else {
                await addCourse({
                    title: newCourse.title,
                    categoryId: newCourse.category,
                    thumbnail: newCourse.thumbnail,
                    youtubeUrl: newCourse.youtubeUrl,
                    instructorId: newCourse.instructorId
                });
            }

            toast.success(editingCourse ? "Curso atualizado com sucesso!" : "Curso criado com sucesso!");
            handleCloseModal();
            fetchInitialData();
        } catch (error: any) {
            console.error("Error creating course:", error);
            const msg = error.response?.data?.message || error.message || "Erro desconhecido";
            toast.error(`Erro ao salvar curso: ${msg} `);
        } finally {
            setIsSaving(false);
        }
    };


    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            toast.error("Configuração do Supabase ausente no frontend!");
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        
        try {
            const fileToUpload = await compressImage(file, 1920, 1080, 0.9);
            
            // Gerar preview local imediato
            if (file.type.startsWith('image/')) {
                const preview = URL.createObjectURL(fileToUpload);
                setUploadPreview(preview);
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `courses/${fileName}`;

            // Modern direct upload using Axios to Supabase REST API
            const uploadUrl = `${supabaseUrl}/storage/v1/object/course-images/${filePath}`;

            const formData = new FormData();
            formData.append('file', fileToUpload);

            const response = await axios.post(uploadUrl, formData, {
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey,
                    'x-upsert': 'true'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || progressEvent.loaded));
                    setUploadProgress(percentCompleted);
                }
            });

            if (response.status !== 200) {
                throw new Error("Upload failed");
            }

            // Public URL
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/course-images/${filePath}`;

            setNewCourse(prev => ({ ...prev, thumbnail: publicUrl }));
            toast.success("Imagem enviada diretamente!");
        } catch (error: any) {
            console.error("Upload error details:", error.response?.data);
            const errMsg = error.response?.data?.message || error.message || "Erro ao fazer upload";
            toast.error(`Falha no upload: ${errMsg}`);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const toggleStatus = async (course: any) => {
        setUpdatingStatusId(course.id);
        try {
            await updateCourse(course.id, { isPublished: !course.isPublished });
            await fetchInstructorCourses();
            toast.success("Status atualizado!");
        } catch (error) {
            console.error("Error toggling status:", error);
            toast.error("Erro ao atualizar status.");
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const handleEdit = (course: any) => {
        setEditingCourse(course);
        setNewCourse({
            title: course.title,
            category: course.categoryId || course.category?.id || "",
            thumbnail: course.thumbnail || "",
            youtubeUrl: course.youtubeUrl || (course.youtubeId ? `https://www.youtube.com/watch?v=${course.youtubeId}` : ""),
            instructorId: course.instructorId || ""
        });
        setIsCreateModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsCreateModalOpen(false);
        setEditingCourse(null);
        setNewCourse({ title: "", category: assignedCategories[0]?.id || "", thumbnail: "", youtubeUrl: "", instructorId: "" });
        setUploadPreview(null);
    };


    return (
        <div className="space-y-10">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:px-0">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2 uppercase">Painel do Instrutor</h1>
                    <p className="text-muted-foreground text-xs md:text-lg">Gestão de conteúdos e desempenho.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="w-full md:w-auto bg-primary text-primary-foreground px-6 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all whitespace-nowrap text-xs"
                >
                    <LucidePlus className="h-5 w-5" /> Novo Curso
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:px-0">
                <StatCard
                    title="Total Alunos"
                    value={stats?.totalStudents?.toString() || "0"}
                    change={stats?.studentsTrend || "0% este mês"}
                    icon={<LucideUsers className="h-4 w-4" />}
                    isLoading={isLoadingStats}
                />
                <StatCard
                    title="Cursos Ativos"
                    value={stats?.totalCourses?.toString() || "0"}
                    change="Mantido"
                    icon={<LucideLayout className="h-4 w-4" />}
                    isLoading={isLoadingStats}
                />
            </div>


            <div className="bg-white md:border md:border-slate-200 md:rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 bg-slate-50 md:bg-white px-4 md:px-6">
                    <h2 className="text-base md:text-lg font-black tracking-tight text-slate-800 uppercase">Meus Cursos</h2>
                </div>

                {/* Desktop Version */}
                <div className="hidden md:block">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-slate-50/50">
                                <th className="px-8 py-4 text-center">Informações do Curso</th>
                                {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && <th className="px-8 py-4 text-center">Instrutor</th>}
                                <th className="px-8 py-4">Status</th>
                                <th className="px-8 py-4 text-center">Alunos</th>
                                <th className="px-8 py-4 text-right">Gerenciamento</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoadingCourses ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i} className="border-b border-slate-100 last:border-0">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-20 rounded-lg bg-slate-200 animate-shimmer" />
                                                <div className="space-y-2">
                                                    <div className="h-4 w-40 bg-slate-300 rounded animate-shimmer" />
                                                    <div className="h-3 w-20 bg-slate-200 rounded animate-shimmer" />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="h-6 w-16 bg-slate-200 rounded-full animate-shimmer" />
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="mx-auto h-4 w-8 bg-slate-200 rounded animate-shimmer" />
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex justify-end gap-2">
                                                <div className="h-9 w-9 bg-slate-200 rounded-xl animate-shimmer" />
                                                <div className="h-9 w-9 bg-slate-200 rounded-xl animate-shimmer" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                courses.map((course, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                                                    <img
                                                        src={resolveThumbnail(course.thumbnail)}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-sm text-slate-900 group-hover:text-primary transition-colors uppercase tracking-tight leading-snug">{course.title}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                                        {typeof course.category === 'object' ? (course.category as any)?.name : (course.category || 'Sem categoria')}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                                            <td className="px-8 py-5 text-center">
                                                <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{(course as any).instructorName}</span>
                                            </td>
                                        )}
                                        <td className="px-8 py-5">
                                            <button
                                                onClick={() => toggleStatus(course)}
                                                disabled={updatingStatusId === course.id}
                                                className={`min-w-[80px] h-8 flex items-center justify-center rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${updatingStatusId === course.id ? 'opacity-50' : 'hover:scale-105 active:scale-95'} ${course.status === 'Publicado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'}`}
                                                title={course.status === 'Publicado' ? 'Clique para Privatizar' : 'Clique para Publicar'}
                                            >
                                                {updatingStatusId === course.id ? (
                                                    <LoadingSpinner size="xs" variant="current" />
                                                ) : (
                                                    course.status
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <Link
                                                to={`/instructor/course/${course.id}/progress`}
                                                className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-primary/30 hover:bg-primary/5 transition-all group/student flex items-center gap-2 w-fit mx-auto"
                                            >
                                                <LucideUsers className="h-3 w-3 text-slate-400 group-hover/student:text-primary transition-colors" />
                                                <span className="text-sm font-black text-slate-700 group-hover/student:text-primary transition-colors">{course.students}</span>
                                            </Link>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex justify-end gap-2">
                                                <Link to={`/instructor/course/${course.id}/syllabus`} className="p-2.5 rounded-lg bg-slate-900 text-white hover:bg-primary transition-all shadow-md group/btn" title="Gerenciar Grade">
                                                    <LucideLayout className="h-3.5 w-3.5" />
                                                </Link>
                                                <button
                                                    onClick={() => handleEdit(course)}
                                                    className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-primary hover:text-primary transition-all"
                                                    title="Editar"
                                                >
                                                    <LucideEdit className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmModal({
                                                        message: "Excluir este curso?",
                                                        subtext: "Todos os módulos e aulas vinculadas serão removidos permanentemente.",
                                                        onConfirm: async () => {
                                                            setConfirmModal(null);
                                                            try {
                                                                await api.delete(`/courses/${course.id}`);
                                                                toast.success("Curso excluído com sucesso!");
                                                                fetchInitialData();
                                                            } catch (error) {
                                                                toast.error("Erro ao excluir curso.");
                                                            }
                                                        }
                                                    })}
                                                    className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-300 hover:border-destructive hover:text-destructive transition-all"
                                                    title="Excluir"
                                                >
                                                    <LucideTrash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile: Course List (Cards) - Now inside the container to benefit from styles */}
                <div className="md:hidden space-y-4 p-4 border-t border-slate-100">
                    {isLoadingCourses ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 animate-pulse space-y-4">
                                <div className="flex gap-4">
                                    <div className="h-16 w-24 bg-slate-200 rounded-lg" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-3/4 bg-slate-200 rounded" />
                                        <div className="h-3 w-1/2 bg-slate-100 rounded" />
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-50 flex justify-between">
                                    <div className="h-6 w-20 bg-slate-100 rounded-full" />
                                    <div className="flex gap-2">
                                        <div className="h-8 w-8 bg-slate-100 rounded-lg" />
                                        <div className="h-8 w-8 bg-slate-100 rounded-lg" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : courses.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <LucideFileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm font-bold text-slate-500">Nenhum curso criado ainda.</p>
                        </div>
                    ) : (
                        courses.map((course, idx) => (
                            <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all">
                                <div className="flex gap-4 mb-4">
                                    <div className="h-16 w-24 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 shrink-0">
                                        <img
                                            src={resolveThumbnail(course.thumbnail)}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-sm text-slate-900 line-clamp-2 uppercase tracking-tight">{course.title}</h3>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 block">
                                            {typeof course.category === 'object' ? (course.category as any)?.name : (course.category || 'Sem categoria')}
                                        </span>
                                        {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                                            <span className="text-[8px] font-black text-primary uppercase tracking-[0.15em] mt-1 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10 w-fit">
                                                {(course as any).instructorName}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-50 flex items-center justify-between gap-3">
                                    <button
                                        onClick={() => toggleStatus(course)}
                                        disabled={updatingStatusId === course.id}
                                        className={`flex-1 h-9 flex items-center justify-center rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${course.status === 'Publicado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}
                                    >
                                        {updatingStatusId === course.id ? <LoadingSpinner size="xs" variant="current" /> : course.status}
                                    </button>

                                    <div className="flex gap-2">
                                        <Link to={`/instructor/course/${course.id}/progress`} className="h-9 w-9 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center shadow-sm active:bg-slate-50">
                                            <LucideUsers className="h-4 w-4" />
                                        </Link>
                                        <Link to={`/instructor/course/${course.id}/syllabus`} className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md active:bg-primary transition-colors">
                                            <LucideLayout className="h-4 w-4" />
                                        </Link>
                                        <button onClick={() => handleEdit(course)} className="h-9 w-9 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-center active:bg-slate-50">
                                            <LucideEdit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setConfirmModal({
                                                message: "Excluir?",
                                                onConfirm: async () => {
                                                    setConfirmModal(null);
                                                    try {
                                                        await api.delete(`/courses/${course.id}`);
                                                        toast.success("Excluído!");
                                                        fetchInitialData();
                                                    } catch (error) {
                                                        toast.error("Erro.");
                                                    }
                                                }
                                            })}
                                            className="h-9 w-9 rounded-xl border border-slate-200 text-slate-300 flex items-center justify-center hover:text-destructive active:bg-red-50"
                                        >
                                            <LucideTrash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Create Course Modal */}
            <PortalModal isOpen={isCreateModalOpen} onClose={handleCloseModal} preventCloseOnOverlayClick={isSaving}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-lg bg-card border border-border rounded-[2rem] md:rounded-[3.5rem] p-6 md:p-10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />

                    <div className="mb-6 md:mb-10 relative shrink-0">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-3xl font-black tracking-tight text-slate-900">{editingCourse ? 'Editar Conteúdo' : 'Novo Conteúdo'}</h2>
                            <button onClick={handleCloseModal} className="p-2 rounded-2xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all border border-transparent hover:border-slate-100">
                                <LucideX className="h-6 w-6" />
                            </button>
                        </div>
                        <p className="text-slate-500 font-medium leading-tight">Preencha as informações para gerenciar seu curso com excelência.</p>
                    </div>

                    <form className="flex-1 flex flex-col min-h-0" onSubmit={handleSave}>
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-6">
                            <div className="space-y-3">
                                <label className="text-[11px] uppercase font-black tracking-[0.15em] text-slate-800 ml-1">Título do Curso</label>
                                <input
                                    required
                                    type="text"
                                    value={newCourse.title}
                                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                                    placeholder="Ex: Domine o Mercado de Capitais"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300 shadow-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[11px] uppercase font-black tracking-[0.15em] text-slate-800 ml-1">Área / Categoria</label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={newCourse.category}
                                            onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all font-bold text-slate-900 appearance-none cursor-pointer shadow-sm"
                                        >
                                            <option value="" disabled>Selecione uma categoria</option>
                                            {assignedCategories.length > 0 ? (
                                                assignedCategories.map((cat) => (
                                                    <option key={cat.id} value={cat.id} className="text-slate-900">
                                                        {cat.name}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="" disabled>Nenhuma área atribuída</option>
                                            )}
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <LucidePlus className="h-4 w-4 rotate-45" />
                                        </div>
                                    </div>
                                </div>

                                {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                                    <div className="space-y-3">
                                        <label className="text-[11px] uppercase font-black tracking-[0.15em] text-slate-800 ml-1">Instrutor Responsável</label>
                                        <div className="relative">
                                            <select
                                                required
                                                value={newCourse.instructorId}
                                                onChange={(e) => setNewCourse({ ...newCourse, instructorId: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all font-bold text-slate-900 appearance-none cursor-pointer shadow-sm"
                                            >
                                                <option value="" disabled>Selecione um instrutor</option>
                                                {instructors.length > 0 ? (
                                                    instructors.map((inst) => (
                                                        <option key={inst.id} value={inst.id} className="text-slate-900">
                                                            {inst.name || inst.email} ({inst.role})
                                                        </option>
                                                    ))
                                                ) : (
                                                    <option value="" disabled>Carregando instrutores...</option>
                                                )}
                                            </select>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <LucideUsers className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <label className="text-[11px] uppercase font-black tracking-[0.15em] text-slate-800 ml-1">Capa do Curso</label>
                                    <div className="w-full h-40 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer relative overflow-hidden text-center group shadow-sm">
                                        {isUploading ? (
                                            <div className="flex flex-col items-center gap-3 w-full px-10">
                                                <LoadingSpinner size="md" />
                                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="bg-primary h-full"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${uploadProgress}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-black text-primary uppercase">
                                                    {uploadProgress === 100 ? 'Processando...' : `${uploadProgress}%`}
                                                </span>
                                            </div>
                                        ) : (
                                            newCourse.thumbnail || uploadPreview ? (
                                                <>
                                                    <img
                                                        src={uploadPreview || resolveThumbnail(newCourse.thumbnail!)}
                                                        alt="Thumbnail"
                                                        className="absolute inset-0 w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-sm rounded-[2rem]">
                                                        <LucideImage className="h-6 w-6 text-white" />
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Trocar Imagem</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="p-4 rounded-2xl bg-white border border-slate-100 text-slate-400 group-hover:text-primary group-hover:scale-110 transition-all shadow-sm">
                                                        <LucideImage className="h-6 w-6" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-primary transition-colors">Subir Imagem</span>
                                                </>
                                            )
                                        )}
                                        <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 shrink-0 bg-white">
                            <button
                                disabled={isSaving}
                                type="submit"
                                className="w-full bg-primary text-primary-foreground py-6 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <LoadingSpinner size="sm" variant="white" />
                                ) : (
                                    <LucideSave className="h-6 w-6" />
                                )}
                                {isSaving ? 'Salvando...' : (editingCourse ? 'Salvar Alterações' : 'Salvar Projeto')}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </PortalModal>
            
            {/* Modal de Confirmação de Exclusão */}
            <PortalModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)}>
                {confirmModal && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative z-10 bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl space-y-8 border border-slate-100"
                    >
                        <div className="h-20 w-20 bg-destructive/10 text-destructive rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
                            <LucideTrash2 className="h-10 w-10" />
                        </div>

                        <div className="text-center space-y-3">
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">
                                {confirmModal.message}
                            </h2>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed px-2">
                                {confirmModal.subtext || "Esta ação não pode ser desfeita."}
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={confirmModal.onConfirm}
                                className="w-full bg-destructive text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-destructive/20"
                            >
                                Sim, Remover Permanentemente
                            </button>
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-200 active:scale-[0.98] transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </motion.div>
                )}
            </PortalModal>

        </div>
    );
}

function StatCard({ title, value, change, icon, isLoading }: { title: string, value: string, change: string, icon: React.ReactNode, isLoading?: boolean }) {
    if (isLoading) {
        return (
            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div className="h-9 w-9 bg-slate-300 rounded-lg animate-shimmer" />
                    <div className="h-4 w-20 bg-slate-200 rounded animate-shimmer" />
                </div>
                <div className="space-y-2">
                    <div className="h-3 w-24 bg-slate-200 rounded animate-shimmer" />
                    <div className="h-8 w-16 bg-slate-300 rounded animate-shimmer" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4 group hover:border-primary/30 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
                <div className="h-9 w-9 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-900 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                    {icon}
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Tendência</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{change}</span>
                </div>
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1 border-l-2 border-primary pl-2">{title}</p>
                <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
            </div>
        </div>
    );
}
