import { motion, AnimatePresence } from "framer-motion";
import { LucideChevronLeft, LucidePlus, LucideSave, LucideSettings, LucideTrash2, LucideUsers, LucideEdit, LucideFileText, LucideLayout, LucideImage, LucideAlertTriangle, LucideShield, LucideLock, LucideUnlock, LucideGlobe, LucideSearch, LucideX, LucideInfo, LucideCheckCircle2, LucideMapPin, LucideAlertCircle, LucideRefreshCw } from "lucide-react";
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
import Skeleton from "../components/Skeleton";
import { PortalModal } from "../components/PortalModal";
import { ConfirmModal } from "../components/ConfirmModal";
import CountUp from "../components/CountUp";

export default function InstructorDashboard() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();
    const [isUploading, setIsUploading] = useState(false);
    const [editingCourse, setEditingCourse] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isLoadingCourses, setIsLoadingCourses] = useState(true);
    const [isLoadingTurmas, setIsLoadingTurmas] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'cursos' | 'turmas'>('cursos');
    const [myTurmas, setMyTurmas] = useState<any[]>([]);
    const [confirmModal, setConfirmModal] = useState<{ message: string; subtext?: string; onConfirm: () => void } | null>(null);
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Helper for retrying failed requests (Vercel deploy instability)
    const fetchWithRetry = async (fn: () => Promise<any>, retries = 3, delay = 1500) => {
        try {
            return await fn();
        } catch (error) {
            if (retries <= 0) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(fn, retries - 1, delay);
        }
    };

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
        instructorId: "",
        isGlobal: false,
        locationId: null as string | null
    });

    const [instructors, setInstructors] = useState<any[]>([]);

    const [assignedCategories, setAssignedCategories] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);

    const fetchInstructorCoursesWithLoading = async () => {
        setIsLoadingCourses(true);
        setHasError(false);
        try {
            await fetchWithRetry(() => fetchInstructorCourses());
        } catch (error) {
            console.error("Error fetching courses after retries:", error);
            setHasError(true);
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
            const { data } = await fetchWithRetry(() => api.get('/stats/instructor'));
            setStats(data);
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const fetchUser = async () => {
        setIsLoadingTurmas(true);
        try {
            const response = await fetchWithRetry(() => api.get('/users/me'));
            if (response.data) {
                const userData = response.data;
                setUserRole(userData.role);
                
                // If it's a Super Admin, they should see all categories
                if (userData.role === 'SUPER_ADMIN' || userData.role === 'ADMIN') {
                    const [{ data: allCategories }, { data: allUsers }, { data: allLocations }, { data: allTurmas }] = await Promise.all([
                        api.get('/categories'),
                        api.get('/users'),
                        api.get('/locations'),
                        api.get('/turmas')
                    ]);
                    setAssignedCategories(allCategories);
                    setLocations(allLocations);
                    setMyTurmas(allTurmas);
                    
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
                if (userData.turmas && userData.role !== 'SUPER_ADMIN' && userData.role !== 'ADMIN') {
                    setMyTurmas(userData.turmas);
                }
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            setHasError(true);
        } finally {
            setIsLoadingTurmas(false);
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
                    instructorId: newCourse.instructorId,
                    isGlobal: newCourse.isGlobal,
                    locationId: newCourse.locationId
                });
            } else {
                await addCourse({
                    title: newCourse.title,
                    categoryId: newCourse.category,
                    thumbnail: newCourse.thumbnail,
                    youtubeUrl: newCourse.youtubeUrl,
                    instructorId: newCourse.instructorId,
                    isGlobal: newCourse.isGlobal,
                    locationId: newCourse.locationId
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
            instructorId: course.instructorId || "",
            isGlobal: !!course.isGlobal,
            locationId: course.locationId || null
        });
        setIsCreateModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsCreateModalOpen(false);
        setEditingCourse(null);
        setNewCourse({ title: "", category: assignedCategories[0]?.id || "", thumbnail: "", youtubeUrl: "", instructorId: instructors.find(i => i.role === 'SUPER_ADMIN')?.id || "", isGlobal: false, locationId: null });
        setUploadPreview(null);
    };


    return (
        <div className="space-y-6">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Painel do Instrutor</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Gestão de conteúdos e desempenho.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="h-10 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 whitespace-nowrap self-start sm:self-auto"
                >
                    <LucidePlus className="h-4 w-4" /> Novo Curso
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard
                    title="Total Alunos"
                    value={stats?.totalStudents || 0}
                    change={stats?.studentsTrend || "0% este mês"}
                    icon={<LucideUsers className="h-4 w-4" />}
                    isLoading={isLoadingStats}
                />
                <StatCard
                    title="Cursos Ativos"
                    value={stats?.totalCourses || 0}
                    change="Mantido"
                    icon={<LucideLayout className="h-4 w-4" />}
                    isLoading={isLoadingStats}
                />
            </div>

            {hasError && !isLoadingCourses && (
                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-6 text-center space-y-4">
                    <div className="h-12 w-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto text-amber-600">
                        <LucideAlertCircle className="h-6 w-6" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                        <h2 className="text-base font-semibold text-amber-900">Instabilidade Detectada</h2>
                        <p className="text-amber-700/80 text-xs leading-relaxed">
                            Não conseguimos carregar todos os dados. Isso geralmente acontece durante atualizações do sistema.
                        </p>
                    </div>
                    <button 
                        onClick={() => {
                            fetchUser();
                            fetchInitialData();
                        }}
                        className="h-9 px-4 bg-amber-600 text-white rounded-lg font-medium text-xs hover:bg-amber-700 transition-colors shadow-2xs active:scale-95 inline-flex items-center gap-2 mx-auto"
                    >
                        <LucideRefreshCw className="h-3.5 w-3.5" /> Tentar Novamente
                    </button>
                </div>
            )}

            {/* Segmented Control Tabs */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1 w-fit">
                <button
                    onClick={() => setActiveTab('cursos')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activeTab === 'cursos'
                            ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                            : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                    Cursos
                </button>
                <button
                    onClick={() => setActiveTab('turmas')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activeTab === 'turmas'
                            ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                            : 'text-slate-500 hover:text-slate-900'
                    }`}
                >
                    Chamadas
                </button>
            </div>

            {activeTab === 'cursos' ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">Meus Cursos</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Gerencie seus cursos publicados e rascunhos</p>
                        </div>
                    </div>

                    {/* Desktop Version */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 text-xs font-medium text-slate-500 bg-slate-50/75">
                                    <th className="px-5 py-3">Informações do Curso</th>
                                    {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                                        <th className="px-5 py-3">Criador</th>
                                    )}
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3 text-center">Alunos</th>
                                    <th className="px-5 py-3 text-right">Gerenciamento</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoadingCourses ? (
                                    [...Array(3)].map((_, i) => (
                                        <tr key={i}>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-10 w-16" variant="rounded" />
                                                    <div className="space-y-1.5">
                                                        <Skeleton className="h-4 w-40" variant="rectangle" />
                                                        <Skeleton className="h-3 w-20" variant="rectangle" />
                                                    </div>
                                                </div>
                                            </td>
                                            {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                                                <td className="px-5 py-3.5">
                                                    <Skeleton className="h-4 w-24" variant="rectangle" />
                                                </td>
                                            )}
                                            <td className="px-5 py-3.5">
                                                <Skeleton className="h-7 w-20" variant="rounded" />
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <Skeleton className="h-7 w-12 mx-auto" variant="rounded" />
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex justify-end gap-1.5">
                                                    <Skeleton className="h-8 w-8" variant="rounded" />
                                                    <Skeleton className="h-8 w-8" variant="rounded" />
                                                    <Skeleton className="h-8 w-8" variant="rounded" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : courses.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-12 text-center">
                                            <LucideFileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                            <p className="text-sm font-medium text-slate-700">Nenhum curso encontrado</p>
                                            <p className="text-xs text-slate-400 mt-0.5">Comece criando um novo curso no botão acima</p>
                                        </td>
                                    </tr>
                                ) : (
                                    courses.map((course, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                                                        <img
                                                            src={resolveThumbnail(course.thumbnail)}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-medium text-sm text-slate-900 group-hover:text-amber-600 transition-colors leading-snug line-clamp-1">
                                                            {course.title}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-slate-400 font-normal">
                                                                {course.categoryName || (typeof course.category === 'object' ? (course.category as any)?.name : (course.category || 'Sem categoria'))}
                                                            </span>
                                                            {course.isGlobal && (
                                                                <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                                                                    Global
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                                                <td className="px-5 py-3.5">
                                                    <span className="text-xs font-medium text-slate-600">{(course as any).instructorName || '—'}</span>
                                                </td>
                                            )}
                                            <td className="px-5 py-3.5">
                                                <button
                                                    onClick={() => toggleStatus(course)}
                                                    disabled={updatingStatusId === course.id}
                                                    className={`h-7 px-2.5 rounded-md text-xs font-medium border transition-colors inline-flex items-center gap-1.5 ${
                                                        updatingStatusId === course.id ? 'opacity-50' : ''
                                                    } ${
                                                        course.status === 'Publicado'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100/80'
                                                            : 'bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100/80'
                                                    }`}
                                                    title={course.status === 'Publicado' ? 'Clique para Privatizar' : 'Clique para Publicar'}
                                                >
                                                    {updatingStatusId === course.id ? (
                                                        <LoadingSpinner size="xs" variant="current" />
                                                    ) : (
                                                        <>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${course.status === 'Publicado' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                            {course.status}
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-5 py-3.5 text-center">
                                                <Link
                                                    to={`/instructor/course/${course.id}/progress`}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700 hover:border-amber-400 hover:text-amber-700 transition-colors text-xs font-medium"
                                                >
                                                    <LucideUsers className="h-3.5 w-3.5 text-slate-400" />
                                                    <span>{course.students}</span>
                                                </Link>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex justify-end gap-1.5">
                                                    <Link
                                                        to={`/instructor/course/${course.id}/syllabus`}
                                                        className="p-1.5 rounded-lg bg-slate-900 text-white hover:bg-amber-500 transition-colors shadow-2xs"
                                                        title="Gerenciar Grade"
                                                    >
                                                        <LucideLayout className="h-3.5 w-3.5" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleEdit(course)}
                                                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <LucideEdit className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmModal({
                                                            message: "Excluir este curso?",
                                                            subtext: "Todos os módulos e aulas vinculadas serão removidos permanentemente.",
                                                            onConfirm: async () => {
                                                                setIsSaving(true);
                                                                try {
                                                                    await api.delete(`/courses/${course.id}`);
                                                                    toast.success("Curso excluído com sucesso!");
                                                                    setConfirmModal(null);
                                                                    fetchInitialData();
                                                                } catch (error) {
                                                                    toast.error("Erro ao excluir curso.");
                                                                } finally {
                                                                    setIsSaving(false);
                                                                }
                                                            }
                                                        })}
                                                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
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

                    {/* Mobile: Course List (Cards) */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {isLoadingCourses ? (
                            [1, 2, 3].map((_, i) => (
                                <div key={i} className="p-4 space-y-3">
                                    <div className="flex gap-3">
                                        <Skeleton className="h-14 w-20" variant="rounded" />
                                        <div className="flex-1 space-y-1.5">
                                            <Skeleton className="h-4 w-3/4" variant="rectangle" />
                                            <Skeleton className="h-3 w-1/2" variant="rectangle" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : courses.length === 0 ? (
                            <div className="text-center py-8 px-4">
                                <LucideFileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs font-medium text-slate-500">Nenhum curso criado ainda.</p>
                            </div>
                        ) : (
                            courses.map((course, idx) => (
                                <div key={idx} className="p-4 space-y-3">
                                    <div className="flex gap-3">
                                        <div className="h-14 w-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                                            <img
                                                src={resolveThumbnail(course.thumbnail)}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-sm text-slate-900 line-clamp-2 leading-snug">{course.title}</h3>
                                            <div className="flex items-center gap-1.5 mt-1">
                                                <span className="text-xs text-slate-400 font-normal">
                                                    {course.categoryName || (typeof course.category === 'object' ? (course.category as any)?.name : (course.category || 'Sem categoria'))}
                                                </span>
                                                {course.isGlobal && (
                                                    <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">Global</span>
                                                )}
                                            </div>
                                            {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                                                <span className="text-xs text-slate-500 block mt-1">
                                                    {(course as any).instructorName}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-2 flex items-center justify-between gap-2">
                                        <button
                                            onClick={() => toggleStatus(course)}
                                            disabled={updatingStatusId === course.id}
                                            className={`h-8 px-2.5 rounded-lg text-xs font-medium border transition-colors inline-flex items-center gap-1.5 ${
                                                course.status === 'Publicado'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                                    : 'bg-amber-50 text-amber-700 border-amber-200/80'
                                            }`}
                                        >
                                            {updatingStatusId === course.id ? <LoadingSpinner size="xs" variant="current" /> : (
                                                <>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${course.status === 'Publicado' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                    {course.status}
                                                </>
                                            )}
                                        </button>

                                        <div className="flex gap-1.5">
                                            <Link
                                                to={`/instructor/course/${course.id}/progress`}
                                                className="h-8 px-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 flex items-center gap-1 text-xs font-medium"
                                            >
                                                <LucideUsers className="h-3.5 w-3.5" />
                                                <span>{course.students}</span>
                                            </Link>
                                            <Link
                                                to={`/instructor/course/${course.id}/syllabus`}
                                                className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center hover:bg-amber-500 transition-colors shadow-2xs"
                                            >
                                                <LucideLayout className="h-3.5 w-3.5" />
                                            </Link>
                                            <button
                                                onClick={() => handleEdit(course)}
                                                className="h-8 w-8 rounded-lg border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors"
                                            >
                                                <LucideEdit className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setConfirmModal({
                                                    message: "Excluir?",
                                                    onConfirm: async () => {
                                                        setIsSaving(true);
                                                        try {
                                                            await api.delete(`/courses/${course.id}`);
                                                            toast.success("Excluído!");
                                                            setConfirmModal(null);
                                                            fetchInitialData();
                                                        } catch (error) {
                                                            toast.error("Erro.");
                                                        } finally {
                                                            setIsSaving(false);
                                                        }
                                                    }
                                                })}
                                                className="h-8 w-8 rounded-lg border border-slate-200 text-slate-400 flex items-center justify-center hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                                            >
                                                <LucideTrash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                /* Chamadas Tab */
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">Minhas Turmas</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Turmas presenciais e listas de chamada</p>
                        </div>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {isLoadingTurmas ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="bg-slate-50/75 border border-slate-200/80 rounded-xl p-5 space-y-3">
                                    <Skeleton className="h-5 w-3/4" variant="rounded" />
                                    <Skeleton className="h-3.5 w-full" variant="rectangle" />
                                    <Skeleton className="h-9 w-full mt-3" variant="rounded" />
                                </div>
                            ))
                        ) : myTurmas.length === 0 ? (
                            <div className="col-span-full text-center py-10">
                                <LucideUsers className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm font-medium text-slate-600">Você não está atribuído a nenhuma turma presencial.</p>
                            </div>
                        ) : (
                            myTurmas.map((turma, idx) => (
                                <div key={idx} className="bg-white border border-slate-200/80 rounded-xl p-5 flex flex-col justify-between hover:border-amber-300 transition-all shadow-2xs">
                                    <div>
                                        <h3 className="font-semibold text-base text-slate-900 mb-1 leading-snug">{turma.name}</h3>
                                        {turma.description && <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{turma.description}</p>}
                                    </div>
                                    <Link 
                                        to={`/instructor/turma/${turma.id}/meetings`}
                                        className="mt-4 h-9 px-3 bg-slate-900 hover:bg-amber-500 text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                                    >
                                        <LucideLayout className="h-3.5 w-3.5" />
                                        Gerenciar Chamadas
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Create Course Modal */}
            <PortalModal isOpen={isCreateModalOpen} onClose={handleCloseModal} preventCloseOnOverlayClick={isSaving}>
                <motion.div
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.96, opacity: 0 }}
                    className="relative w-full max-w-lg bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
                >
                    <div className="mb-5 flex items-start justify-between shrink-0">
                        <div>
                            <h2 className="text-lg font-bold tracking-tight text-slate-900">
                                {editingCourse ? 'Editar Conteúdo' : 'Novo Conteúdo'}
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">Preencha as informações para gerenciar seu curso.</p>
                        </div>
                        <button
                            onClick={handleCloseModal}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <LucideX className="h-5 w-5" />
                        </button>
                    </div>

                    <form className="flex-1 flex flex-col min-h-0" onSubmit={handleSave}>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-700">Título do Curso</label>
                                <input
                                    required
                                    type="text"
                                    value={newCourse.title}
                                    onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                                    placeholder="Ex: Domine o Mercado de Capitais"
                                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-700">Área / Categoria</label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={newCourse.category}
                                            onChange={(e) => setNewCourse({ ...newCourse, category: e.target.value })}
                                            className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 appearance-none cursor-pointer focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors pr-9"
                                        >
                                            <option value="" disabled>Selecione uma categoria</option>
                                            {assignedCategories.length > 0 ? (
                                                assignedCategories.map((cat) => (
                                                    <option key={cat.id} value={cat.id}>
                                                        {cat.name}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="" disabled>Nenhuma área atribuída</option>
                                            )}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <LucidePlus className="h-4 w-4 rotate-45" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-700">Criador do Curso</label>
                                    <div className="relative">
                                        {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') ? (
                                            <>
                                                <select
                                                    required
                                                    value={newCourse.instructorId}
                                                    onChange={(e) => setNewCourse({ ...newCourse, instructorId: e.target.value })}
                                                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 appearance-none cursor-pointer focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors pr-9"
                                                >
                                                    <option value="" disabled>Selecione um instrutor</option>
                                                    {instructors.length > 0 ? (
                                                        instructors.map((inst) => (
                                                            <option key={inst.id} value={inst.id}>
                                                                {inst.name || inst.email} ({inst.role})
                                                            </option>
                                                        ))
                                                    ) : (
                                                        <option value="" disabled>Carregando instrutores...</option>
                                                    )}
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                    <LucideUsers className="h-4 w-4" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium text-slate-600 flex items-center justify-between">
                                                <span>{editingCourse ? (editingCourse as any).instructorName : 'Você (Criador)'}</span>
                                                <LucideUsers className="h-4 w-4 text-slate-400" />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Acesso Compartilhado: Visível para instrutores da mesma Área e Localidade.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-700">Configurações de Visibilidade</label>
                                    <div 
                                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                                            newCourse.isGlobal ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                                        }`}
                                        onClick={() => setNewCourse({ ...newCourse, isGlobal: !newCourse.isGlobal })}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                                                newCourse.isGlobal ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                                            }`}>
                                                {newCourse.isGlobal ? <LucideGlobe className="h-4 w-4" /> : <LucideLock className="h-4 w-4" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-900 leading-tight">Curso Global</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">Visível em todas as unidades da rede</p>
                                            </div>
                                        </div>
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${newCourse.isGlobal ? 'bg-amber-500' : 'bg-slate-300'}`}>
                                            <motion.div 
                                                animate={{ x: newCourse.isGlobal ? 22 : 2 }}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {!newCourse.isGlobal && (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-700">Localidade do Curso</label>
                                        <div className="relative">
                                            <select
                                                required={!newCourse.isGlobal}
                                                value={newCourse.locationId || ""}
                                                onChange={(e) => setNewCourse({ ...newCourse, locationId: e.target.value || null })}
                                                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 appearance-none cursor-pointer focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors pr-9"
                                            >
                                                <option value="">Global / Sem Unidade</option>
                                                {locations.map((loc) => (
                                                    <option key={loc.id} value={loc.id}>
                                                        {loc.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <LucideMapPin className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-400">Define em qual unidade este curso local será exibido</p>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-slate-700">Identidade Visual (Capa)</label>
                                        <button 
                                            type="button"
                                            onClick={() => setIsGuideModalOpen(true)}
                                            className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1"
                                        >
                                            <LucideInfo className="h-3.5 w-3.5" />
                                            Guia de Capas
                                        </button>
                                    </div>
                                    <div className="w-full h-36 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-amber-400 hover:bg-amber-50/30 transition-all cursor-pointer relative overflow-hidden text-center group">
                                        {isUploading ? (
                                            <div className="flex flex-col items-center gap-2 w-full px-8">
                                                <LoadingSpinner size="sm" />
                                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="bg-amber-500 h-full"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${uploadProgress}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-medium text-slate-600">
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
                                                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                                                        <LucideImage className="h-5 w-5 text-white" />
                                                        <span className="text-xs font-medium text-white">Trocar Imagem</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-400 group-hover:text-amber-600 transition-colors shadow-2xs">
                                                        <LucideImage className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium text-slate-700">Subir Imagem de Capa</p>
                                                        <p className="text-[11px] text-slate-400">Recomendado 1920x1080 (16:9)</p>
                                                    </div>
                                                </>
                                            )
                                        )}
                                        <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 shrink-0 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                disabled={isSaving}
                                className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-xs transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={isSaving}
                                type="submit"
                                className="h-10 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs shadow-xs transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <LoadingSpinner size="xs" variant="white" />
                                ) : (
                                    <LucideSave className="h-4 w-4" />
                                )}
                                {isSaving ? 'Salvando...' : (editingCourse ? 'Salvar Alterações' : 'Criar Curso')}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </PortalModal>
            
            <ConfirmModal 
                isOpen={!!confirmModal}
                onClose={() => !isSaving && setConfirmModal(null)}
                onConfirm={confirmModal?.onConfirm || (() => {})}
                isLoading={isSaving}
                title={confirmModal?.message || ""}
                description={confirmModal?.subtext || "Esta ação não pode ser desfeita."}
                confirmText="Sim, Excluir"
            />

            {/* Modal de Guia de Capas */}
            <PortalModal isOpen={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="relative z-10 bg-white rounded-2xl overflow-hidden max-w-xl w-full shadow-xl border border-slate-200/80 max-h-[90vh] flex flex-col"
                >
                    <div className="p-5 border-b border-slate-100 flex items-start justify-between shrink-0">
                        <div>
                            <h2 className="text-lg font-bold tracking-tight text-slate-900">
                                Guia de Capas
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Recomendações visuais para boa apresentação do curso.
                            </p>
                        </div>
                        <button 
                            onClick={() => setIsGuideModalOpen(false)} 
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <LucideX className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                        {/* 1. O Formato e Resolução */}
                        <section className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">01. Formato & Resolução</h3>
                            
                            <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                                <img 
                                    src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200" 
                                    alt="Exemplo de Layout" 
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 border-[12px] border-black/10 backdrop-blur-[1px] flex items-center justify-center">
                                    <div className="bg-slate-900/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20 text-center">
                                        <p className="text-xs font-semibold text-white">Área Segura Central</p>
                                        <p className="text-[11px] text-white/70">Mantenha os elementos principais aqui</p>
                                    </div>
                                </div>
                                <div className="absolute top-3 left-3 flex gap-1.5">
                                    <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-medium">1920 × 1080</span>
                                    <span className="px-2 py-0.5 bg-slate-900/80 text-white rounded text-[11px] font-medium">16:9</span>
                                </div>
                            </div>
                        </section>

                        {/* 2. Dicas de Composição */}
                        <section className="space-y-3">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">02. Dicas de Composição</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                                    <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center mb-2.5">
                                        <LucideEdit className="h-4 w-4" />
                                    </div>
                                    <h4 className="text-xs font-semibold text-slate-900 mb-1">Tipografia</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">Use fontes legíveis e com alto contraste. Evite textos minúsculos ou excesso de efeitos.</p>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                                    <div className="h-8 w-8 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center mb-2.5">
                                        <LucideLayout className="h-4 w-4" />
                                    </div>
                                    <h4 className="text-xs font-semibold text-slate-900 mb-1">Hierarquia</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">O assunto principal deve ser o ponto focal. Não polua a capa com excesso de logotipos.</p>
                                </div>
                            </div>
                        </section>

                        {/* 3. Dica Final */}
                        <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                            <div className="flex items-center gap-2 text-amber-400">
                                <LucideAlertTriangle className="h-4 w-4" />
                                <h4 className="text-xs font-semibold">Dica Importante</h4>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                Um gradiente sutil é aplicado na base dos cards para leitura do título. <strong className="text-white font-medium">Posicione rostos e elementos importantes no centro ou topo.</strong>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </PortalModal>

        </div>
    );
}

function StatCard({ title, value, change, icon, isLoading }: { title: string, value: number, change: string, icon: React.ReactNode, isLoading?: boolean }) {
    if (isLoading) {
        return (
            <div className="p-5 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                    <div className="h-9 w-9 bg-slate-200 rounded-lg animate-shimmer" />
                    <div className="h-4 w-20 bg-slate-100 rounded animate-shimmer" />
                </div>
                <div className="space-y-1.5">
                    <div className="h-3 w-20 bg-slate-100 rounded animate-shimmer" />
                    <div className="h-7 w-16 bg-slate-200 rounded animate-shimmer" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-5 rounded-xl border border-slate-200/80 bg-white shadow-2xs space-y-3 hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
                <div className="h-9 w-9 bg-amber-50 border border-amber-200/60 rounded-lg flex items-center justify-center text-amber-600">
                    {icon}
                </div>
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                    {change}
                </span>
            </div>
            <div>
                <p className="text-xs font-medium text-slate-500 mb-0.5">{title}</p>
                <p className="text-2xl font-bold tracking-tight text-slate-900"><CountUp value={value} /></p>
            </div>
        </div>
    );
}
