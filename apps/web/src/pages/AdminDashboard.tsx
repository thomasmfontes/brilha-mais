import { LucideShield, LucideUsers, LucideBookOpen, LucideAlertTriangle, LucideShieldCheck, LucidePlus, LucideLayoutGrid, LucideSearch, LucideUserCog, LucideCheck, LucideTrash2, LucideEdit2, LucidePencil, LucideFolder, LucideChevronDown, LucideXCircle, LucideUserCircle, LucideMaximize2, LucideLoader2, LucideCamera, LucideMapPin, LucideLayoutDashboard, LucideGraduationCap } from "lucide-react";
import { getIconComponent } from "../utils/icons";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import api from "../utils/api";
import { compressImage } from "@/utils/image";
import toast from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";
import { PortalModal } from "../components/PortalModal";
import { ConfirmModal } from "../components/ConfirmModal";
import UserMaterialsModal from "../components/UserMaterialsModal";
import CountUp from "../components/CountUp";
import Skeleton from "../components/Skeleton";

interface Category {
    id: string;
    name: string;
    icon?: string;
    instructors?: { user: { name: string } }[];
    _count?: { courses: number };
}

interface Location {
    id: string;
    name: string;
    slug: string;
    _count?: {
        turmas: number;
        courses: number;
    };
    counts?: {
        students: number;
        instructors: number;
        admins: number;
    }
}

interface User {
    id: string;
    name: string;
    email: string;
    role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'SUPER_ADMIN';
    avatarUrl?: string;
    assignedAreas: { category: { id: string, name: string } }[];
    turmas: { 
        id: string, 
        name: string,
        areas?: { category: { id: string, name: string } }[]
    }[];
    locationId?: string | null;
    location?: Location | null;
}

interface AdminStats {
    totalUsers: number;
    totalCourses: number;
    totalEnrollments: number;
    recentLogs: {
        user: string;
        action: string;
        entity: string;
        time: string;
    }[];
}

interface Turma {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    _count?: { users: number };
    areas?: { category: { id: string, name: string } }[];
    locationId?: string | null;
    location?: Location | null;
}

const UserSkeleton = () => (
    <tr className="border-b border-border last:border-0">
        <td className="px-8 py-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10" variant="circle" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-32" variant="rectangle" />
                    <Skeleton className="h-3 w-48" variant="rectangle" />
                </div>
            </div>
        </td>
        <td className="px-8 py-6"><Skeleton className="h-8 w-24" variant="rounded" /></td>
        <td className="px-8 py-6"><Skeleton className="h-6 w-32" variant="rounded" /></td>
        <td className="px-8 py-6 text-right"><Skeleton className="h-8 w-8 ml-auto" variant="rounded" /></td>
    </tr>
);

const UserCardSkeleton = () => (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 shrink-0" variant="circle" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-2/3" variant="rectangle" />
                <Skeleton className="h-3 w-1/2" variant="rectangle" />
            </div>
        </div>
        <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-8" variant="rectangle" />
                <Skeleton className="h-8 w-24" variant="rounded" />
            </div>
            <Skeleton className="h-10 w-full" variant="rounded" />
        </div>
    </div>
);

const CategorySkeleton = () => (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
        <div className="flex items-start justify-between mb-6">
            <div className="space-y-2">
                <Skeleton className="h-5 w-32" variant="rounded" />
                <Skeleton className="h-3 w-20" variant="rectangle" />
            </div>
            <Skeleton className="h-8 w-8" variant="rounded" />
        </div>
        <div className="space-y-3">
            <Skeleton className="h-3 w-16" variant="rectangle" />
            <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-8 w-8 border-2 border-card" variant="circle" />
                ))}
            </div>
        </div>
    </div>
);

const StatSkeleton = () => (
    <div className="p-6 rounded-3xl bg-card border border-border shadow-sm h-32 flex flex-col justify-center">
        <Skeleton className="h-10 w-10 mb-4" variant="rounded" />
        <Skeleton className="h-6 w-16 mb-2" variant="rounded" />
        <Skeleton className="h-3 w-24" variant="rectangle" />
    </div>
);

const FilterSkeleton = () => (
    <Skeleton className="h-10 w-32 border border-slate-200/50" variant="rounded" />
);



const ActivitySkeleton = () => (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
        <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" variant="circle" />
            <div className="space-y-2">
                <Skeleton className="h-4 w-24" variant="rectangle" />
                <Skeleton className="h-3 w-40" variant="rectangle" />
            </div>
        </div>
        <Skeleton className="h-3 w-16" variant="rectangle" />
    </div>
);

const AuditSkeleton = () => (
    <div className="relative pl-8 border-l-2 border-slate-100 pb-8 last:pb-0">
        <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-white border-4 border-slate-200" />
        <Skeleton className="h-3 w-20 mb-3" variant="rectangle" />
        <Skeleton className="h-5 w-32 mb-2" variant="rounded" />
        <Skeleton className="h-4 w-48" variant="rounded" />
    </div>
);

export default function AdminDashboard() {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const [activeTab, setActiveTab] = useState<'overview' | 'areas' | 'turmas' | 'users' | 'locations'>('overview');
    const [users, setUsers] = useState<User[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [turmas, setTurmas] = useState<Turma[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocationId, setSelectedLocationId] = useState<string>("ALL");
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [isFetchingTurmas, setIsFetchingTurmas] = useState(false);
    const [isFetchingCategories, setIsFetchingCategories] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterRole, setFilterRole] = useState<'ALL' | 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'SUPER_ADMIN'>('ALL');
    const [filterTurma, setFilterTurma] = useState<string>("ALL");
    const [filterArea, setFilterArea] = useState<string>("ALL");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
    const [isTurmaAssignmentModalOpen, setIsTurmaAssignmentModalOpen] = useState(false);
    const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null);
    const [tempInstructorAreas, setTempInstructorAreas] = useState<string[]>([]);
    const [tempStudentAreas, setTempStudentAreas] = useState<string[]>([]);
    const [tempUserTurmas, setTempUserTurmas] = useState<string[]>([]);
    const [isSavingPermissions, setIsSavingPermissions] = useState(false);
    const [isSavingCategory, setIsSavingCategory] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ message: string; subtext?: string; onConfirm: () => void } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingNameFor, setEditingNameFor] = useState<string | null>(null);
    const [editingNameValue, setEditingNameValue] = useState('');
    const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false);
    const [previewAvatar, setPreviewAvatar] = useState<{ id: string; url: string; name: string } | null>(null);
    const [isUpdatingAvatarFor, setIsUpdatingAvatarFor] = useState<string | null>(null);
    const [targetUserIdForAvatar, setTargetUserIdForAvatar] = useState<string | null>(null);
    const [isTurmaAreaModalOpen, setIsTurmaAreaModalOpen] = useState(false);
    const [selectedTurmaForAreas, setSelectedTurmaForAreas] = useState<Turma | null>(null);
    const [tempTurmaAreas, setTempTurmaAreas] = useState<string[]>([]);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [locationName, setLocationName] = useState("");
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [isSavingLocation, setIsSavingLocation] = useState(false);
    const [userLocationId, setUserLocationId] = useState<string | null | undefined>(undefined);
    const [currentUserRole, setCurrentUserRole] = useState<'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'SUPER_ADMIN' | null>(null);
    const listFileInputRef = useRef<HTMLInputElement>(null);

    const handleTabChange = (tab: typeof activeTab) => {
        if (tab !== activeTab) {
            setIsLoading(true);
            setActiveTab(tab);
        }
    };

    const handleListAvatarEditClick = (userId: string) => {
        setTargetUserIdForAvatar(userId);
        listFileInputRef.current?.click();
    };

    const handleListAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const userId = targetUserIdForAvatar;
        if (!file || !userId) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Por favor, selecione uma imagem válida.");
            return;
        }

        setIsUpdatingAvatarFor(userId);
        
        try {
            // Compress image to 1024px (High Quality)
            const compressedFile = await compressImage(file, 1024, 1024, 0.9);

            const formData = new FormData();
            formData.append('file', compressedFile, 'avatar.jpg');

            const uploadRes = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const newAvatarUrl = uploadRes.data.url;
            await api.patch(`/users/${userId}`, { avatarUrl: newAvatarUrl });

            setUsers(prev => prev.map(u => u.id === userId ? { ...u, avatarUrl: newAvatarUrl } : u));
            toast.success("Foto de perfil atualizada!");
        } catch (error) {
            console.error("Error updating user avatar:", error);
            toast.error("Erro ao atualizar foto.");
        } finally {
            setIsUpdatingAvatarFor(null);
            setTargetUserIdForAvatar(null);
            if (listFileInputRef.current) listFileInputRef.current.value = '';
        }
    };

    // Category Modal State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [categoryName, setCategoryName] = useState("");
    const [categoryIcon, setCategoryIcon] = useState("LucideLayoutGrid");
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    // Turma Modal State
    const [isTurmaModalOpen, setIsTurmaModalOpen] = useState(false);
    const [turmaName, setTurmaName] = useState("");
    const [turmaDescription, setTurmaDescription] = useState("");
    const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
    const [isSavingTurma, setIsSavingTurma] = useState(false);
    const [tempLocationId, setTempLocationId] = useState<string | null>(null);

    const availableIcons = [
        { name: "Geral", icon: "LucideLayoutGrid" },
        { name: "Tecnologia", icon: "LucideCpu" },
        { name: "Código", icon: "LucideCode" },
        { name: "Smartphone", icon: "LucideSmartphone" },
        { name: "Laptop", icon: "LucideLaptop" },
        { name: "Idiomas", icon: "LucideLanguages" },
        { name: "Globo", icon: "LucideGlobe" },
        { name: "Pessoas", icon: "LucideUsers" },
        { name: "RH", icon: "LucideUserCheck" },
        { name: "Finanças", icon: "LucideWallet" },
        { name: "Moeda", icon: "LucideBanknote" },
        { name: "Gráfico", icon: "LucideTrendingUp" },
        { name: "Cérebro", icon: "LucideBrain" },
        { name: "Direito", icon: "LucideScale" },
        { name: "Justiça", icon: "LucideGavel" },
        { name: "Palestras", icon: "LucideMic2" },
        { name: "Apresentação", icon: "LucidePresentation" },
        { name: "Livro", icon: "LucideBookOpen" },
        { name: "Troféu", icon: "LucideTrophy" },
        { name: "Estrela", icon: "LucideStar" }
    ];

    const getIconBadge = (role: string) => {
        switch (role) {
            case 'SUPER_ADMIN':
                return <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 text-indigo-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm"><LucideShieldCheck className="h-3 w-3" /> Super</span>;
            case 'ADMIN':
                return <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 text-purple-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest border border-purple-100 shadow-sm"><LucideShield className="h-3 w-3" /> Admin</span>;
            case 'INSTRUCTOR':
                return <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest border border-blue-100 shadow-sm"><LucideUsers className="h-3 w-3" /> Instrutor</span>;
            case 'STUDENT':
                return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm"><LucideBookOpen className="h-3 w-3" /> Aluno</span>;
            default:
                return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 text-slate-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest border border-slate-100"><LucideAlertTriangle className="h-3 w-3" /> Desconhecido</span>;
        }
    };

    const [stats, setStats] = useState<AdminStats>({
        totalUsers: 0,
        totalCourses: 0,
        totalEnrollments: 0,
        recentLogs: []
    });

    const [auditLimit, setAuditLimit] = useState(5);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [isLoadingMoreAudit, setIsLoadingMoreAudit] = useState(false);

    useEffect(() => {
        fetchProfile();
        fetchLocations(true);
        if (activeTab === 'overview') fetchStats();
        if (activeTab === 'users') {
            fetchUsers();
            fetchCategories(true);
            fetchTurmas(true);
        }
        if (activeTab === 'areas') fetchCategories();
        if (activeTab === 'turmas') {
            fetchTurmas();
            fetchCategories(true);
        }
    }, [activeTab]);

    const fetchProfile = async () => {
        try {
            const { data } = await api.get('/users/me');
            setUserLocationId(data.locationId);
            setCurrentUserRole(data.role);
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    };

    const fetchStats = async () => {
        setIsLoadingStats(true);
        try {
            const { data } = await api.get('/stats/admin');
            setStats(data);
            setAuditLogs(data.recentLogs || []);
            setAuditLimit(5);
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setIsLoadingStats(false);
        }
    };

    const handleLoadMoreAudit = async () => {
        setIsLoadingMoreAudit(true);
        try {
            const nextLimit = auditLimit + 15;
            const { data } = await api.get(`/audit/instructor?limit=${nextLimit}`);
            const mapped = data.map((log: any) => ({
                user: log.user?.name || 'Sistema',
                action: log.action,
                entity: log.entity,
                time: log.createdAt,
            }));
            setAuditLogs(mapped);
            setAuditLimit(nextLimit);
        } catch (error) {
            console.error("Error loading more audit logs:", error);
            toast.error("Erro ao carregar mais registros de auditoria.");
        } finally {
            setIsLoadingMoreAudit(false);
        }
    };

    const fetchUsers = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const { data } = await api.get('/users');
            setUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const fetchCategories = async (silent = false) => {
        setIsFetchingCategories(true);
        if (!silent) {
            setIsLoading(true);
        }
        try {
            const { data } = await api.get('/categories');
            setCategories(data);
        } catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setIsFetchingCategories(false);
            if (!silent) {
                setIsLoading(false);
            }
        }
    };

    const fetchTurmas = async (silent = false) => {
        setIsFetchingTurmas(true);
        if (!silent) {
            setIsLoading(true);
        }
        try {
            const { data } = await api.get('/turmas');
            setTurmas(data);
        } catch (error) {
            console.error("Error fetching turmas:", error);
        } finally {
            setIsFetchingTurmas(false);
            if (!silent) {
                setIsLoading(false);
            }
        }
    };

    const fetchLocations = async (silent = false) => {
        try {
            const { data } = await api.get('/locations');
            setLocations(data);
        } catch (error) {
            console.error("Error fetching locations:", error);
        }
    };

    const handleSaveLocation = async () => {
        if (!locationName.trim()) return;
        setIsSavingLocation(true);
        try {
            if (editingLocation) {
                await api.put(`/locations/${editingLocation.id}`, { name: locationName });
            } else {
                await api.post("/locations", { name: locationName });
            }
            await fetchLocations(true);
            toast.success(editingLocation ? "Localidade atualizada!" : "Localidade criada!");
            setIsLocationModalOpen(false);
            setLocationName("");
            setEditingLocation(null);
        } catch (error) {
            console.error("Error saving location:", error);
            toast.error("Erro ao salvar localidade.");
        } finally {
            setIsSavingLocation(false);
        }
    };

    const handleDeleteLocation = async (id: string) => {
        setConfirmModal({
            message: "Excluir esta localidade?",
            subtext: "Isso afetará usuários e turmas vinculados. Esta ação não pode ser desfeita.",
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    await api.delete(`/locations/${id}`);
                    await fetchLocations(true);
                } catch (error) {
                    console.error("Error deleting location:", error);
                    toast.error("Erro ao excluir localidade.");
                } finally {
                    setIsDeleting(false);
                    setConfirmModal(null);
                }
            }
        });
    };

    const handleUpdateRole = async (userId: string, role: string) => {
        // Optimistic update
        const previousUsers = [...users];
        setUsers(users.map(u => u.id === userId ? { 
            ...u, 
            role: role as any,
            locationId: role === 'SUPER_ADMIN' ? null : u.locationId,
            location: role === 'SUPER_ADMIN' ? null : u.location
        } : u));

        setUpdatingRoleFor(userId);
        try {
            await api.put(`/users/${userId}/role`, { role });
            // Refresh in background to ensure sync, but silently
            await fetchUsers(true);
        } catch (error) {
            console.error("Error updating role:", error);
            setUsers(previousUsers); // Revert
            toast.error("Erro ao atualizar função do usuário. A alteração foi revertida.");
        } finally {
            setUpdatingRoleFor(null);
        }
    };

    const handleUpdateUserLocation = async (userId: string, locationId: string | null) => {
        setUpdatingRoleFor(userId); // Use the same spinner state
        try {
            await api.put(`/users/${userId}/location`, { locationId });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, locationId, location: locations.find(l => l.id === locationId) || null } : u));
            toast.success("Localidade do usuário atualizada!");
        } catch (error) {
            console.error("Error updating user location:", error);
            toast.error("Erro ao atualizar localidade do usuário.");
        } finally {
            setUpdatingRoleFor(null);
        }
    };

    const handleToggleArea = (categoryId: string, type: 'instructor' | 'turma', isAssigned: boolean) => {
        if (type === 'instructor') {
            setTempInstructorAreas(prev =>
                isAssigned ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
            );
        } else {
            setTempTurmaAreas(prev =>
                isAssigned ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
            );
        }
    };

    const handleToggleTurma = (turmaId: string, isAssigned: boolean) => {
        if (selectedUser?.role === 'STUDENT') {
            setTempUserTurmas(isAssigned ? [] : [turmaId]);
        } else {
            setTempUserTurmas(prev =>
                isAssigned ? prev.filter(id => id !== turmaId) : [...prev, turmaId]
            );
        }
    };

    const handleOpenAreaModal = (user: User) => {
        setSelectedUser(user);
        setTempInstructorAreas(user.assignedAreas.map(a => a.category.id));
        setIsAreaModalOpen(true);
    };

    const handleOpenTurmaAreaModal = (turma: Turma) => {
        setSelectedTurmaForAreas(turma);
        setTempTurmaAreas(turma.areas?.map(a => a.category.id) || []);
        setIsTurmaAreaModalOpen(true);
    };

    const handleOpenTurmaModal = (user: User) => {
        setSelectedUser(user);
        setTempUserTurmas(user.turmas?.map(t => t.id) || []);
        setIsTurmaAssignmentModalOpen(true);
    };

    const handleSaveAreas = async () => {
        if (!selectedUser) return;
        setIsSavingPermissions(true);
        try {
            const { data: updatedUser } = await api.put(`/users/${selectedUser.id}/areas`, {
                instructorAreaIds: tempInstructorAreas,
            });

            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
            toast.success("Áreas de conhecimento atualizadas!");
            setIsAreaModalOpen(false);
        } catch (error) {
            console.error("Error saving areas:", error);
            toast.error("Erro ao salvar áreas. Tente novamente.");
        } finally {
            setIsSavingPermissions(false);
        }
    };

    const handleSaveTurmaAreas = async () => {
        if (!selectedTurmaForAreas) return;
        setIsSavingPermissions(true);
        try {
            await api.put(`/turmas/${selectedTurmaForAreas.id}/areas`, {
                categoryIds: tempTurmaAreas,
            });

            await fetchTurmas(true);
            // Also refresh users if they are on screen because their inherited areas might have changed
            if (activeTab === 'users') await fetchUsers(true);

            toast.success("Áreas da turma atualizadas!");
            setIsTurmaAreaModalOpen(false);
        } catch (error) {
            console.error("Error saving turma areas:", error);
            toast.error("Erro ao salvar áreas da turma. Tente novamente.");
        } finally {
            setIsSavingPermissions(false);
        }
    };

    const handleSaveUserTurmas = async () => {
        if (!selectedUser) return;
        setIsSavingPermissions(true);
        try {
            const { data: updatedUser } = await api.put(`/users/${selectedUser.id}/turmas`, {
                turmaIds: tempUserTurmas
            });

            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
            toast.success("Turmas atualizadas!");
            setIsTurmaAssignmentModalOpen(false);
        } catch (error) {
            console.error("Error saving turmas:", error);
            toast.error("Erro ao salvar turmas. Tente novamente.");
        } finally {
            setIsSavingPermissions(false);
        }
    };


    const handleSaveCategory = async () => {
        if (!categoryName.trim()) return;
        setIsSavingCategory(true);
        try {
            if (editingCategory) {
                await api.put(`/categories/${editingCategory.id}`, {
                    name: categoryName,
                    icon: categoryIcon
                });
            } else {
                await api.post("/categories", {
                    name: categoryName,
                    icon: categoryIcon
                });
            }
            await fetchCategories(true);
            toast.success(editingCategory ? "Categoria atualizada!" : "Categoria criada!");
            setIsCategoryModalOpen(false);
            setCategoryName("");
            setCategoryIcon("LucideLayoutGrid");
            setTempLocationId(null);
            setEditingCategory(null);
        } catch (error) {
            console.error("Error saving category:", error);
            toast.error("Erro ao salvar categoria.");
        } finally {
            setIsSavingCategory(false);
        }
    };

    const handleSaveTurma = async () => {
        if (!turmaName.trim()) return;
        setIsSavingTurma(true);
        try {
            if (editingTurma) {
                await api.put(`/turmas/${editingTurma.id}`, {
                    name: turmaName,
                    description: turmaDescription,
                    locationId: tempLocationId
                });
            } else {
                await api.post("/turmas", {
                    name: turmaName,
                    description: turmaDescription,
                    locationId: tempLocationId
                });
            }
            await fetchTurmas(true);
            toast.success(editingTurma ? "Turma atualizada!" : "Turma criada!");
            setIsTurmaModalOpen(false);
            setTurmaName("");
            setTurmaDescription("");
            setTempLocationId(null);
            setEditingTurma(null);
        } catch (error) {
            console.error("Error saving turma:", error);
            toast.error("Erro ao salvar turma.");
        } finally {
            setIsSavingTurma(false);
        }
    };

    const handleDeleteTurma = async (id: string) => {
        setConfirmModal({
            message: "Excluir esta turma?",
            subtext: "Esta ação não pode ser desfeita e removerá todos os usuários desta turma.",
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    await api.delete(`/turmas/${id}`);
                    await fetchTurmas(true);
                } catch (error) {
                    console.error("Error deleting turma:", error);
                    toast.error("Erro ao excluir turma.");
                } finally {
                    setIsDeleting(false);
                    setConfirmModal(null);
                }
            }
        });
    };

    const handleDeleteCategory = async (id: string) => {
        setConfirmModal({
            message: "Excluir esta área?",
            subtext: "Isso pode afetar cursos vinculados. Esta ação não pode ser desfeita.",
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    await api.delete(`/categories/${id}`);
                    await fetchCategories(true);
                } catch (error) {
                    console.error("Error deleting category:", error);
                } finally {
                    setIsDeleting(false);
                    setConfirmModal(null);
                }
            }
        });
    };

    const handleDeleteUser = async (id: string) => {
        setConfirmModal({
            message: "Excluir este usuário?",
            subtext: "Todos os dados deste usuário serão removidos permanentemente.",
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    await api.delete(`/users/${id}`);
                    await fetchUsers(true);
                } catch (error) {
                    console.error("Error deleting user:", error);
                } finally {
                    setIsDeleting(false);
                    setConfirmModal(null);
                }
            }
        });
    };

    const filteredUsers = users
        .filter(u => {
            const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = filterRole === 'ALL' || 
                (filterRole === 'ADMIN' ? (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') : u.role === filterRole);
            const matchesTurma = filterTurma === 'ALL' || (
                filterTurma === 'NONE' 
                    ? (!u.turmas || u.turmas.length === 0) && u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN'
                    : (u.role === 'STUDENT' || u.role === 'INSTRUCTOR') && u.turmas?.some(t => t.id === filterTurma)
            );
            
            const matchesArea = filterArea === 'ALL' || (
                (u.role === 'INSTRUCTOR' && u.assignedAreas?.some(a => a.category.id === filterArea)) ||
                (u.role === 'STUDENT' && u.turmas?.some(t => t.areas?.some(a => a.category.id === filterArea)))
            );
            
            // Security filter: Unit admin only sees their location. Super admin follows the location filter.
            const isWithinAdminScope = !userLocationId || u.locationId === userLocationId;
            const matchesLocationFilter = selectedLocationId === 'ALL' || u.locationId === selectedLocationId;

            return matchesSearch && matchesRole && matchesTurma && matchesArea && isWithinAdminScope && matchesLocationFilter;
        })
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const filteredTurmas = turmas.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Security filter: Unit admin only sees their location. Super admin follows the location filter.
        const isWithinAdminScope = !userLocationId || t.locationId === userLocationId;
        const matchesLocationFilter = selectedLocationId === 'ALL' || t.locationId === selectedLocationId;
        
        return matchesSearch && isWithinAdminScope && matchesLocationFilter;
    });

    const filteredCategories = categories.filter(c => {
        return c.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="space-y-8 md:space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:px-0">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2 uppercase text-slate-900">Administração</h1>
                    <p className="text-slate-900 text-xs md:text-lg font-bold">Gestão central do ecossistema Brilha Mais.</p>
                </div>

                <div className="bg-slate-100 p-1 rounded-[2rem] border border-slate-200/50 w-full shadow-inner overflow-hidden">
                    <div className="flex w-full gap-0.5">
                        <button
                            onClick={() => handleTabChange('overview')}
                            className={`flex-1 flex items-center justify-center px-1 md:px-6 py-3 rounded-[1.5rem] text-[8px] md:text-[10px] font-black uppercase tracking-tight md:tracking-[0.15em] transition-all duration-300 whitespace-nowrap ${activeTab === 'overview' ? 'bg-primary text-white shadow-md' : 'text-slate-900 hover:text-primary hover:bg-white/50'}`}
                        >
                            <LucideLayoutDashboard className="h-4 w-4 md:hidden" />
                            <span className="hidden md:inline">Visão Geral</span>
                        </button>
                        <button
                            onClick={() => handleTabChange('areas')}
                            className={`flex-1 flex items-center justify-center px-1 md:px-6 py-3 rounded-[1.5rem] text-[8px] md:text-[10px] font-black uppercase tracking-tight md:tracking-[0.15em] transition-all duration-300 whitespace-nowrap ${activeTab === 'areas' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-primary hover:bg-white/50'}`}
                        >
                            <LucideLayoutGrid className="h-4 w-4 md:hidden" />
                            <span className="hidden md:inline">Áreas</span>
                        </button>
                        <button
                            onClick={() => handleTabChange('turmas')}
                            className={`flex-1 flex items-center justify-center px-1 md:px-6 py-3 rounded-[1.5rem] text-[8px] md:text-[10px] font-black uppercase tracking-tight md:tracking-[0.15em] transition-all duration-300 whitespace-nowrap ${activeTab === 'turmas' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-primary hover:bg-white/50'}`}
                        >
                            <LucideGraduationCap className="h-4 w-4 md:hidden" />
                            <span className="hidden md:inline">Turmas</span>
                        </button>
                        <button
                            onClick={() => handleTabChange('users')}
                            className={`flex-1 flex items-center justify-center px-1 md:px-6 py-3 rounded-[1.5rem] text-[8px] md:text-[10px] font-black uppercase tracking-tight md:tracking-[0.15em] transition-all duration-300 whitespace-nowrap ${activeTab === 'users' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-primary hover:bg-white/50'}`}
                        >
                            <LucideUserCircle className="h-4 w-4 md:hidden" />
                            <span className="hidden md:inline">Usuários</span>
                        </button>
                        {userLocationId === undefined ? (
                            <div className="flex-1 flex items-center justify-center px-1 md:px-6 py-3 rounded-[1.5rem] bg-slate-200/50 animate-shimmer">
                                <LucideMapPin className="h-4 w-4 md:hidden opacity-20" />
                                <span className="hidden md:inline opacity-20 text-[8px] md:text-[10px] font-black uppercase tracking-tight md:tracking-[0.15em]">Localidades</span>
                            </div>
                        ) : userLocationId === null && (
                            <button
                                onClick={() => handleTabChange('locations')}
                                className={`flex-1 flex items-center justify-center px-1 md:px-6 py-3 rounded-[1.5rem] text-[8px] md:text-[10px] font-black uppercase tracking-tight md:tracking-[0.15em] transition-all duration-300 whitespace-nowrap ${activeTab === 'locations' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:text-primary hover:bg-white/50'}`}
                            >
                                <LucideMapPin className="h-4 w-4 md:hidden" />
                                <span className="hidden md:inline">Localidades</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>


            {activeTab === 'overview' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-10"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {isLoadingStats ? (
                            <>
                                <StatSkeleton />
                                <StatSkeleton />
                                <StatSkeleton />
                            </>
                        ) : (
                            <>
                                <AdminStat icon={<LucideUsers />} label="Usuários" value={stats.totalUsers} />
                                <AdminStat icon={<LucideBookOpen />} label="Cursos" value={stats.totalCourses} />
                                <AdminStat icon={<LucideShieldCheck />} label="Matrículas" value={stats.totalEnrollments} />
                            </>
                        )}
                    </div>

                    <div className="grid lg:grid-cols-1 gap-8">
                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-12 shadow-sm">
                            <h2 className="text-2xl font-black mb-12 flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100">
                                    <LucideShield className="h-6 w-6" />
                                </div>
                                Auditoria
                            </h2>
                            <div className="space-y-0">
                                {isLoadingStats ? (
                                    <>
                                        <AuditSkeleton />
                                        <AuditSkeleton />
                                        <AuditSkeleton />
                                    </>
                                ) : auditLogs.length > 0 ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="space-y-0"
                                    >
                                        {auditLogs.map((log, idx) => (
                                            <div key={idx} className="relative pl-10 border-l-2 border-slate-100 pb-10 last:pb-0 group">
                                                <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-amber-400 border-4 border-white shadow-[0_0_15px_rgba(251,191,36,0.5)] z-10 group-hover:scale-125 transition-transform" />

                                                <div className="space-y-2 translate-y-[-4px]">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">
                                                        {timeAgo(log.time)}
                                                    </p>
                                                    <div>
                                                        <p className="text-lg font-black text-slate-900 group-hover:text-primary transition-colors">
                                                            {log.user}
                                                        </p>
                                                        <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                                            {log.action}: <span className="text-slate-900 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{log.entity}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {auditLogs.length >= auditLimit && (
                                            <div className="flex justify-center pt-8 mt-4 border-t border-slate-50">
                                                <button
                                                    onClick={handleLoadMoreAudit}
                                                    disabled={isLoadingMoreAudit}
                                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-100 text-amber-600 font-black text-xs uppercase tracking-wider shadow-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all cursor-pointer"
                                                >
                                                    {isLoadingMoreAudit ? (
                                                        <>
                                                            <LucideLoader2 className="h-4 w-4 animate-spin text-amber-500" />
                                                            Carregando...
                                                        </>
                                                    ) : (
                                                        'Ver Mais Histórico'
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                ) : (
                                    <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                                        <LucideShield className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                                        <p className="text-sm font-bold text-slate-400">Nenhum registro de auditoria disponível.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {activeTab === 'locations' && !userLocationId && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:px-0">
                        <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase">Gestão de Localidades</h2>
                        <button
                            onClick={() => { setEditingLocation(null); setLocationName(""); setIsLocationModalOpen(true); }}
                            className="w-full md:w-auto bg-primary text-primary-foreground px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/10 hover:scale-[1.02] active:scale-95 transition-all text-xs"
                        >
                            <LucidePlus className="h-5 w-5" /> Nova Localidade
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:px-0">
                        {locations.map(loc => (
                            <div key={loc.id} className="p-8 rounded-[2.5rem] bg-card border border-border backdrop-blur-md relative group shadow-sm flex flex-col justify-between">
                                <div className="space-y-6">
                                    <div className="flex items-start justify-between">
                                        <div className="p-3 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100 mb-4">
                                            <LucideMapPin className="h-6 w-6" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingLocation(loc);
                                                    setLocationName(loc.name);
                                                    setIsLocationModalOpen(true);
                                                }}
                                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-muted-foreground hover:text-primary"
                                            >
                                                <LucideEdit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteLocation(loc.id)}
                                                className="p-2 rounded-xl bg-white/5 transition-colors text-destructive hover:bg-destructive/10"
                                            >
                                                <LucideTrash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-bold mb-2 uppercase tracking-tight">{loc.name}</h3>
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Alunos</span>
                                                <span className="text-base font-black text-slate-900">{loc.counts?.students || 0}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Instrutores</span>
                                                <span className="text-base font-black text-slate-900">{loc.counts?.instructors || 0}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Admins</span>
                                                <span className="text-base font-black text-slate-900">{loc.counts?.admins || 0}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Turmas</span>
                                                <span className="text-base font-black text-slate-900">{loc._count?.turmas || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {activeTab === 'areas' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:px-0">
                        <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase">Áreas de Conhecimento</h2>
                        <button
                            onClick={() => { setEditingCategory(null); setCategoryName(""); setCategoryIcon("LucideLayoutGrid"); setIsCategoryModalOpen(true); }}
                            className="w-full md:w-auto bg-primary text-primary-foreground px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/10 hover:scale-[1.02] active:scale-95 transition-[transform,shadow,background-color] text-xs"
                        >
                            <LucidePlus className="h-5 w-5" /> Nova Área
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:px-0">
                        {isLoading ? (
                            <>
                                <CategorySkeleton />
                                <CategorySkeleton />
                                <CategorySkeleton />
                            </>
                        ) : filteredCategories.map(area => (
                            <div key={area.id} className="p-8 rounded-[2.5rem] bg-card border border-border backdrop-blur-md relative group shadow-sm flex flex-col justify-between">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="space-y-2 flex-1">
                                        <div className="p-3 rounded-2xl bg-primary/10 text-primary w-fit mb-4">
                                            {getIconComponent(area.icon || "LucideLayoutGrid")}
                                        </div>
                                        <h3 className="text-xl font-bold">{area.name}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{area._count?.courses || 0} cursos cadastrados</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingCategory(area);
                                                setCategoryName(area.name);
                                                setCategoryIcon(area.icon || "LucideLayoutGrid");
                                                setIsCategoryModalOpen(true);
                                            }}
                                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-muted-foreground hover:text-primary"
                                        >
                                            <LucideEdit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCategory(area.id)}
                                            className="p-2 rounded-xl bg-white/5 transition-colors text-destructive hover:bg-destructive/10"
                                        >
                                            <LucideTrash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                                        <span>Instrutores Atribuídos</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {area.instructors && area.instructors.length > 0 ? area.instructors.map((ins, idx) => (
                                            <span key={idx} className="px-3 py-1 rounded-full bg-muted border border-border text-[10px] font-bold">
                                                {ins.user.name}
                                            </span>
                                        )) : <span className="text-[10px] text-muted-foreground italic">Nenhum instrutor</span>}
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {activeTab === 'turmas' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:px-0">
                        <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase">Gestão de Turmas</h2>
                        <button
                            onClick={() => { setEditingTurma(null); setTurmaName(""); setTurmaDescription(""); setIsTurmaModalOpen(true); }}
                            className="w-full md:w-auto bg-primary text-primary-foreground px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/10 hover:scale-[1.02] active:scale-95 transition-[transform,shadow,background-color] text-xs"
                        >
                            <LucidePlus className="h-5 w-5" /> Nova Turma
                        </button>
                    </div>
 
                    {/* Desktop Toolbar */}
                    <div className="hidden md:block bg-card border border-border rounded-[2rem] p-4 shadow-sm mb-8">
                         <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                             <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
                                 <div className="relative group flex-1 max-w-md">
                                     <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                     <input
                                         type="text"
                                         placeholder="Buscar turmas..."
                                         value={searchQuery}
                                         onChange={(e) => setSearchQuery(e.target.value)}
                                         className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-black outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all placeholder:text-slate-400 text-slate-950"
                                     />
                                 </div>
 
                                 <div className="flex flex-wrap gap-2 items-center">
                                     {userLocationId === undefined ? (
                                         <FilterSkeleton />
                                     ) : userLocationId === null && (
                                         <FilterSelect
                                             icon={LucideMapPin}
                                             value={selectedLocationId}
                                             onChange={setSelectedLocationId}
                                             placeholder="Localidade"
                                             options={locations.map(l => ({ id: l.id, name: l.name }))}
                                         />
                                     )}
                                 </div>
                             </div>
 
                             <div className="flex items-center shrink-0">
                                 <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-900 bg-slate-100/50 px-4 py-2 rounded-xl border border-slate-100 whitespace-nowrap">
                                     TOTAL: <span className="text-primary ml-1">{filteredTurmas.length}</span>
                                 </span>
                             </div>
                         </div>
                    </div>

                    {/* Mobile Toolbar */}
                    <div className="md:hidden bg-card border border-border rounded-[2.5rem] p-4 shadow-sm mb-8 space-y-3">
                        <div className="relative group">
                            <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar turmas..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-black outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-slate-400 text-slate-950"
                            />
                        </div>
                        {userLocationId === undefined ? (
                            <div className="h-12 w-full bg-slate-100 rounded-2xl animate-shimmer border border-slate-200/50" />
                        ) : userLocationId === null && (
                            <FilterSelect
                                icon={LucideMapPin}
                                value={selectedLocationId}
                                onChange={setSelectedLocationId}
                                placeholder="Localidade"
                                options={locations.map(l => ({ id: l.id, name: l.name }))}
                            />
                        )}
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:px-0">
                        {isLoading ? (
                            <>
                                <CategorySkeleton />
                                <CategorySkeleton />
                                <CategorySkeleton />
                            </>
                        ) : filteredTurmas.map(turma => (
                            <div key={turma.id} className="p-8 rounded-[2.5rem] bg-card border border-border backdrop-blur-md relative group shadow-sm flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="p-3 rounded-2xl bg-primary/10 text-primary w-fit mb-4">
                                            <LucideUsers className="h-6 w-6" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleOpenTurmaAreaModal(turma)}
                                                className="p-2 rounded-xl bg-white/5 hover:bg-emerald-500/10 transition-colors text-muted-foreground hover:text-emerald-500"
                                                title="Gerenciar Áreas da Turma"
                                            >
                                                <LucideLayoutGrid className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingTurma(turma);
                                                    setTurmaName(turma.name);
                                                    setTurmaDescription(turma.description || "");
                                                    setTempLocationId(turma.locationId || null);
                                                    setIsTurmaModalOpen(true);
                                                }}
                                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-muted-foreground hover:text-primary"
                                            >
                                                <LucideEdit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTurma(turma.id)}
                                                className="p-2 rounded-xl bg-white/5 transition-colors text-destructive hover:bg-destructive/10"
                                            >
                                                <LucideTrash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">{turma.name}</h3>
                                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{turma.description || "Sem descrição"}</p>
                                        <div className="flex flex-wrap gap-1.5 mt-4">
                                            {turma.areas?.map((a, i) => (
                                                <span key={i} className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                                                    {a.category.name}
                                                </span>
                                            ))}
                                            {(!turma.areas || turma.areas.length === 0) && (
                                                <span className="text-[9px] text-muted-foreground/40 font-black uppercase tracking-widest italic">Nenhuma área atribuída</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-border flex flex-col gap-4">
                                     <div className="flex items-center justify-between w-full">
                                         <div className="flex items-center gap-2">
                                             <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center">
                                                 <LucideUsers className="h-4 w-4 text-slate-300" />
                                             </div>
                                             <span className="text-xs font-bold text-slate-500">{turma._count?.users || 0} Integrantes</span>
                                         </div>
                                         <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{new Date(turma.createdAt).toLocaleDateString()}</span>
                                     </div>
                                     
                                     <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/50 rounded-xl border border-slate-100/50">
                                         <LucideMapPin className="h-3 w-3 text-primary/40" />
                                         <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                             {turma.location?.name || 'Unidade Geral'}
                                         </span>
                                     </div>
                                 </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {activeTab === 'users' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >


                    <div className="hidden xl:block bg-card border border-border rounded-[2.5rem] shadow-sm relative z-20">
                        {/* Header Interno com Filtros */}
                        <div className="px-8 py-5 border-b border-border bg-slate-50/20 rounded-t-[2.4rem]">
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex flex-col md:flex-row gap-3 items-center">
                                    <div className="relative w-full md:w-72 group">
                                        <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Busca rápida..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-black outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all placeholder:text-slate-400 text-slate-950"
                                        />
                                    </div>

                                    <div className="flex flex-wrap gap-2 items-center">
                                        <FilterSelect
                                            icon={LucideUserCircle}
                                            value={filterRole}
                                            onChange={(val) => setFilterRole(val as any)}
                                            placeholder="Função"
                                            options={[
                                                { id: 'STUDENT', name: 'Alunos' },
                                                { id: 'INSTRUCTOR', name: 'Instrutores' },
                                                { id: 'ADMIN', name: 'Administradores' },
                                                { id: 'SUPER_ADMIN', name: 'Super Admins' },
                                            ]}
                                        />

                                        <FilterSelect
                                            icon={LucideUsers}
                                            value={filterTurma}
                                            onChange={setFilterTurma}
                                            placeholder="Turma"
                                            options={[
                                                { id: 'NONE', name: 'Sem Turma' },
                                                ...turmas.map(t => ({ id: t.id, name: t.name }))
                                            ]}
                                        />

                                        <FilterSelect
                                            icon={LucideLayoutGrid}
                                            value={filterArea}
                                            onChange={setFilterArea}
                                            placeholder="Área"
                                            options={categories.map(c => ({ id: c.id, name: c.name }))}
                                        />

                                        {userLocationId === undefined ? (
                                            <FilterSkeleton />
                                        ) : userLocationId === null && (
                                            <FilterSelect
                                                icon={LucideMapPin}
                                                value={selectedLocationId}
                                                onChange={setSelectedLocationId}
                                                placeholder="Localidade"
                                                options={locations.map(l => ({ id: l.id, name: l.name }))}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="hidden md:flex items-center shrink-0">
                                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-900 bg-slate-100/50 px-4 py-2 rounded-xl border border-slate-100 whitespace-nowrap">
                                        TOTAL: <span className="text-primary ml-1"><CountUp value={filteredUsers.length} /></span>
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="w-full overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[1000px]">
                                <thead>
                                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 bg-slate-50/50">
                                    <th className="px-5 py-3.5 w-[25%] min-w-[200px]">Usuário</th>
                                    <th className="px-5 py-3.5 w-[15%]">Função</th>
                                    <th className="px-5 py-3.5 w-[15%]">Turma</th>
                                    <th className="px-5 py-3.5 w-[15%]">Área</th>
                                    <th className="px-5 py-3.5 w-[15%]">Localidade</th>
                                    <th className="px-5 py-3.5 w-[15%] text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <>
                                        <UserSkeleton />
                                        <UserSkeleton />
                                        <UserSkeleton />
                                    </>
                                ) : filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b border-border last:border-0 hover:bg-primary/5 transition-colors group">
                                        <td className="px-5 py-3.5 group-last:rounded-bl-[2.4rem]">
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => setPreviewAvatar({ 
                                                        id: user.id,
                                                        url: user.avatarUrl?.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}`, 
                                                        name: user.name || '' 
                                                    })}
                                                    className="relative h-10 w-10 rounded-full flex items-center justify-center font-black text-primary border border-primary/20 bg-primary/10 shrink-0 overflow-hidden group/avatar shadow-sm hover:border-primary/50 transition-all hover:scale-105 active:scale-95"
                                                    title="Clique para expandir"
                                                >
                                                    {user.avatarUrl
                                                        ? <img src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}`} alt={user.name || ''} className={`h-full w-full object-cover transition-all ${isUpdatingAvatarFor === user.id ? 'opacity-30 blur-[2px]' : 'group-hover/avatar:scale-110'}`} referrerPolicy="no-referrer" />
                                                        : <span className={isUpdatingAvatarFor === user.id ? 'opacity-0' : ''}>{user.name?.charAt(0) || '?'}</span>
                                                    }
                                                    
                                                    {isUpdatingAvatarFor === user.id && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                                                            <LucideLoader2 className="h-4 w-4 text-primary animate-spin" />
                                                        </div>
                                                    )}
                                                </button>
                                                <div>
                                                    {editingNameFor === user.id ? (
                                                        <input
                                                            autoFocus
                                                            className="font-bold bg-transparent border-b border-primary outline-none text-sm w-40"
                                                            value={editingNameValue}
                                                            onChange={e => setEditingNameValue(e.target.value)}
                                                            onBlur={async () => {
                                                                if (editingNameValue.trim() && editingNameValue !== user.name) {
                                                                    await api.put(`/users/${user.id}/name`, { name: editingNameValue.trim() });
                                                                    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, name: editingNameValue.trim() } : u));
                                                                }
                                                                setEditingNameFor(null);
                                                            }}
                                                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingNameFor(null); }}
                                                        />
                                                    ) : (
                                                        <p className="font-bold cursor-pointer hover:text-primary transition-colors group flex items-center gap-1" onClick={() => { setEditingNameFor(user.id); setEditingNameValue(user.name || ''); }}>
                                                            {user.name}
                                                            <LucidePencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {updatingRoleFor === user.id ? (
                                                <div className="flex items-center justify-center h-8 w-24">
                                                    <LoadingSpinner size="sm" />
                                                </div>
                                            ) : (
                                                <RoleSelect
                                                    value={user.role}
                                                    onChange={(val) => handleUpdateRole(user.id, val)}
                                                    currentUserRole={currentUserRole}
                                                />
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            {updatingRoleFor === user.id ? (
                                                <div className="flex items-center">
                                                    <LoadingSpinner size="xs" />
                                                </div>
                                            ) : (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {user.turmas?.map((t, i) => (
                                                        <span key={`turma-${i}`} className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                                                            {t.name}
                                                        </span>
                                                    ))}
                                                    {user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && (
                                                        <button
                                                            onClick={() => handleOpenTurmaModal(user)}
                                                            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground transition-colors"
                                                        >
                                                            <LucidePlus className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                    {(!user.turmas || user.turmas.length === 0) && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                                                        <span className="text-[10px] text-muted-foreground/50 italic">N/A</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex flex-wrap gap-1.5">
                                                            {updatingRoleFor === user.id ? (
                                                                <div className="flex items-center">
                                                                    <LoadingSpinner size="xs" />
                                                                </div>
                                                            ) : user.role === 'SUPER_ADMIN' ? (
                                                                <span className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-[0.15em] border border-indigo-100 shadow-sm">
                                                                    Acesso Geral
                                                                </span>
                                                            ) : user.role === 'ADMIN' ? (
                                                                <span className="px-3 py-1.5 rounded-full bg-purple-50 text-purple-600 text-[9px] font-black uppercase tracking-[0.15em] border border-purple-100 shadow-sm">
                                                                    Admin
                                                                </span>
                                                            ) : (
                                                                <>
                                                                    {user.role === 'INSTRUCTOR' && user.assignedAreas.map((a, i) => (
                                                                        <span key={`ins-${i}`} className="px-3 py-1.5 rounded-lg bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/10">
                                                                            {a.category.name}
                                                                        </span>
                                                                    ))}
                                                                    {user.role === 'STUDENT' && user.turmas?.map(t => t.areas?.map((a, i) => (
                                                                        <span key={`stu-${t.id}-${i}`} className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                                                                            {a.category.name}
                                                                        </span>
                                                                    )))}
                                                                </>
                                                            )}

                                                            {user.role === 'INSTRUCTOR' && (
                                                                <button
                                                                    onClick={() => handleOpenAreaModal(user)}
                                                                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground transition-colors"
                                                                >
                                                                    <LucidePlus className="h-3 w-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            {updatingRoleFor === user.id ? (
                                                                <LoadingSpinner size="sm" />
                                                            ) : !userLocationId && user.role !== 'SUPER_ADMIN' ? (
                                                                <LocationSelect
                                                                    value={user.locationId || null}
                                                                    onChange={(val) => handleUpdateUserLocation(user.id, val)}
                                                                    options={locations}
                                                                />
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                    {user.location?.name || 'Global'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                        <td className="px-5 py-3.5 text-right group-last:rounded-br-[2.4rem]">
                                            <div className="flex justify-end gap-1 text-right">
                                                {user.role === 'STUDENT' && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setIsMaterialsModalOpen(true);
                                                        }}
                                                        className="p-2 rounded-xl bg-white/5 transition-colors text-primary hover:bg-primary/10"
                                                        title="Materiais do Aluno"
                                                    >
                                                        <LucideFolder className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="p-2 rounded-xl bg-white/5 transition-colors text-destructive hover:bg-destructive/10"
                                                >
                                                    <LucideTrash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground font-medium text-xs">
                                            Nenhum usuário encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Card List */}
                    <div className="xl:hidden space-y-4">
                        <div className="bg-card border border-border rounded-[2.5rem] p-4 shadow-sm space-y-3">
                            <div className="relative group">
                                <LucideSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Buscar usuários..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-black outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-slate-400 text-slate-950"
                                />
                            </div>

                            <div className="space-y-2">
                                {userLocationId === undefined ? (
                                    <div className="h-12 w-full bg-slate-100 rounded-2xl animate-shimmer border border-slate-200/50" />
                                ) : userLocationId === null && (
                                    <FilterSelect
                                        icon={LucideMapPin}
                                        value={selectedLocationId}
                                        onChange={setSelectedLocationId}
                                        placeholder="Localidade"
                                        options={locations.map(l => ({ id: l.id, name: l.name }))}
                                    />
                                )}
                                <FilterSelect
                                    icon={LucideUserCircle}
                                    value={filterRole}
                                    onChange={(val) => setFilterRole(val as any)}
                                    placeholder="Função"
                                    options={[
                                        { id: 'STUDENT', name: 'Alunos' },
                                        { id: 'INSTRUCTOR', name: 'Instrutores' },
                                        { id: 'ADMIN', name: 'Administradores' },
                                        { id: 'SUPER_ADMIN', name: 'Super Admins' },
                                    ]}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <FilterSelect
                                        icon={LucideGraduationCap}
                                        value={filterTurma}
                                        onChange={setFilterTurma}
                                        placeholder="Turma"
                                        options={turmas.map(t => ({ id: t.id, name: t.name }))}
                                    />
                                    <FilterSelect
                                        icon={LucideLayoutGrid}
                                        value={filterArea}
                                        onChange={setFilterArea}
                                        placeholder="Área"
                                        options={categories.map(c => ({ id: c.id, name: c.name }))}
                                    />
                                </div>
                            </div>
                        </div>
                        {isLoading ? (
                            <>
                                <UserCardSkeleton />
                                <UserCardSkeleton />
                            </>
                        ) : filteredUsers.length > 0 ? filteredUsers.map((user) => (
                            <div key={user.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className={`h-1.5 w-1.5 rounded-full ${user.role === 'ADMIN' ? 'bg-purple-500' : user.role === 'INSTRUCTOR' ? 'bg-blue-500' : 'bg-emerald-500'} shadow-sm animate-pulse`} />
                                </div>

                                <div className="flex items-center gap-5">
                                    <button 
                                        onClick={() => setPreviewAvatar({ 
                                            id: user.id,
                                            url: user.avatarUrl?.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}`, 
                                            name: user.name || '' 
                                        })}
                                        className="h-14 w-14 rounded-2xl flex items-center justify-center font-black text-primary border-2 border-slate-100 bg-slate-50 shrink-0 overflow-hidden shadow-sm relative group/avatar hover:border-primary/50 transition-all hover:scale-105"
                                    >
                                        {user.avatarUrl
                                            ? <img src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}`} alt={user.name || ''} className={`h-full w-full object-cover transition-all ${isUpdatingAvatarFor === user.id ? 'opacity-30 blur-[2px]' : 'group-hover/avatar:scale-110'}`} referrerPolicy="no-referrer" />
                                            : <span className={`text-xl uppercase ${isUpdatingAvatarFor === user.id ? 'opacity-0' : ''}`}>{user.name?.charAt(0) || '?'}</span>
                                        }
                                        
                                        {isUpdatingAvatarFor === user.id && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                                                <LucideLoader2 className="h-5 w-5 text-primary animate-spin" />
                                            </div>
                                        )}
                                    </button>
                                    <div className="min-w-0 flex-1">
                                        {editingNameFor === user.id ? (
                                            <input
                                                autoFocus
                                                className="font-black text-lg bg-transparent border-b-2 border-primary outline-none text-slate-900 w-full mb-1"
                                                value={editingNameValue}
                                                onChange={e => setEditingNameValue(e.target.value)}
                                                onBlur={async () => {
                                                    if (editingNameValue.trim() && editingNameValue !== user.name) {
                                                        await api.put(`/users/${user.id}/name`, { name: editingNameValue.trim() });
                                                        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, name: editingNameValue.trim() } : u));
                                                    }
                                                    setEditingNameFor(null);
                                                }}
                                                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingNameFor(null); }}
                                            />
                                        ) : (
                                            <h3 className="font-black text-lg text-slate-900 truncate leading-snug cursor-pointer hover:text-primary transition-colors flex items-center gap-2 group/name" onClick={() => { setEditingNameFor(user.id); setEditingNameValue(user.name || ''); }}>
                                                {user.name}
                                                <LucidePencil className="h-3.5 w-3.5 opacity-0 group-hover/name:opacity-30 transition-opacity shrink-0" />
                                            </h3>
                                        )}
                                        <p className="text-sm font-medium text-slate-500 truncate lowercase">{user.email}</p>
                                        <div className="mt-1">
                                            {!userLocationId ? (
                                                <select
                                                    value={user.locationId || ""}
                                                    onChange={(e) => handleUpdateUserLocation(user.id, e.target.value || null)}
                                                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500 outline-none"
                                                >
                                                    <option value="">Global</option>
                                                    {locations.map(loc => (
                                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                                    {user.location?.name || 'Global'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6 pt-2">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                                <LucideUsers className="h-3 w-3" /> Turmas Atribuídas
                                            </p>
                                            <span className="text-[9px] font-bold text-slate-300 bg-slate-50 px-2 py-0.5 rounded-md">{user.turmas?.length || 0} turmas</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 min-h-[32px]">
                                            {user.turmas?.map((t, i) => (
                                                <span key={`turma-mb-${i}`} className="px-3 py-1.5 rounded-xl bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-tight border border-slate-100 shadow-sm">
                                                    {t.name}
                                                </span>
                                            ))}
                                            {user.role !== 'ADMIN' && (
                                                <button
                                                    onClick={() => handleOpenTurmaModal(user)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all text-[10px] font-black uppercase tracking-tight shadow-sm hover:shadow-md"
                                                >
                                                    <LucidePlus className="h-3 w-3" /> Gerenciar
                                                </button>
                                            )}
                                            {(!user.turmas || user.turmas.length === 0) && user.role === 'ADMIN' && (
                                                <span className="text-[10px] text-slate-300 font-bold italic py-1.5">Acesso Global</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-slate-50">
                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                                    <LucideShield className="h-3 w-3" /> Nível de Acesso
                                                </p>
                                                <p className="text-[9px] font-bold text-slate-300 leading-none">Define permissões de sistema</p>
                                            </div>

                                            {updatingRoleFor === user.id ? (
                                                <div className="h-10 w-full sm:w-40 flex items-center justify-center bg-slate-50 rounded-2xl">
                                                    <LoadingSpinner size="sm" />
                                                </div>
                                            ) : (
                                                <div className={`flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl pl-5 pr-4 py-3 w-full sm:w-48 shadow-sm group-hover/role:bg-white transition-all focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary ${(user.role === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN') ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
                                                    <select
                                                        value={user.role}
                                                        disabled={user.role === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN'}
                                                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                                        className={`appearance-none bg-transparent border-none p-0 text-[10px] font-black uppercase tracking-widest outline-none w-full ${(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') ? 'text-purple-600' : user.role === 'INSTRUCTOR' ? 'text-blue-600' : 'text-emerald-600'} ${(user.role === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN') ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                    >
                                                        <option value="STUDENT">Aluno</option>
                                                        <option value="INSTRUCTOR">Instrutor</option>
                                                        <option value="ADMIN">Administrador</option>
                                                        {(currentUserRole === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN') && (
                                                            <option value="SUPER_ADMIN">Super Admin</option>
                                                        )}
                                                    </select>
                                                    <LucideUserCog className="h-4 w-4 opacity-30 pointer-events-none shrink-0" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3 pt-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                                    <LucideLayoutGrid className="h-3 w-3" /> Áreas de Atuação
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2 min-h-[32px]">
                                                {updatingRoleFor === user.id ? (
                                                    <div className="flex items-center">
                                                        <LoadingSpinner size="xs" />
                                                    </div>
                                                ) : user.role === 'ADMIN' ? (
                                                    <div className="flex-1 p-3 rounded-2xl bg-purple-50/50 border border-purple-100/50">
                                                        <p className="text-[9px] font-black uppercase tracking-[0.1em] text-purple-600 flex items-center gap-2">
                                                            <LucideShieldCheck className="h-3 w-3" /> Administrador tem acesso a todas as áreas
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {user.role === 'INSTRUCTOR' && user.assignedAreas.map((a, i) => (
                                                            <span key={`ins-${i}`} className="px-3 py-1.5 rounded-xl bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/10 shadow-sm">
                                                                {a.category.name}
                                                            </span>
                                                        ))}
                                                        {user.role === 'STUDENT' && user.turmas?.map(t => t.areas?.map((a, i) => (
                                                            <span key={`stu-mb-${t.id}-${i}`} className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                                                                {a.category.name}
                                                            </span>
                                                        )))}

                                                        {user.role === 'INSTRUCTOR' && (
                                                            <button
                                                                onClick={() => handleOpenAreaModal(user)}
                                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all text-[10px] font-black uppercase tracking-tight shadow-sm hover:shadow-md"
                                                            >
                                                                <LucidePlus className="h-3 w-3" /> Adicionar Área
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    {user.role === 'STUDENT' && (
                                        <button
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setIsMaterialsModalOpen(true);
                                            }}
                                            className="flex-1 py-4 rounded-2xl bg-slate-50 hover:bg-primary/5 text-slate-400 hover:text-primary text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-slate-100 hover:border-primary/20 flex items-center justify-center gap-3 group/materials shadow-sm"
                                        >
                                            <LucideFolder className="h-4 w-4 group-hover/materials:scale-110 transition-transform" /> Materiais
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className={`${user.role === 'STUDENT' ? 'flex-[0.5]' : 'flex-1'} py-4 rounded-2xl bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-slate-100 hover:border-red-100 flex items-center justify-center gap-3 group/delete shadow-sm`}
                                    >
                                        <LucideTrash2 className="h-4 w-4 group-hover/delete:scale-110 transition-transform" /> Excluir
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="bg-card border border-border rounded-[2.5rem] p-16 text-center shadow-sm">
                                <LucideSearch className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-slate-900 font-black uppercase tracking-tight">Nenhum usuário</h3>
                                <p className="text-sm text-slate-400 mt-1">A busca por "{searchQuery}" não retornou resultados.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Area Assignment Modal */}
            <PortalModal isOpen={isAreaModalOpen} onClose={() => setIsAreaModalOpen(false)} preventCloseOnOverlayClick={isSavingPermissions}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-xl bg-card border border-border rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />

                    <div className="mb-6 md:mb-10 relative shrink-0">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                        <LucideShieldCheck className="h-6 w-6 text-primary" />
                                    </div>
                                    Áreas de Conhecimento
                                </h2>
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 leading-none">Editando áreas de</span>
                                        <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[9px] font-black tracking-widest uppercase border border-primary/20">
                                            {selectedUser?.name}
                                        </span>
                                    </div>
                                    {selectedUser?.turmas && selectedUser.turmas.length > 0 && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 leading-none">•</span>
                                            <div className="flex gap-1">
                                                {selectedUser.turmas.map((t, i) => (
                                                    <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[9px] font-black tracking-widest uppercase border border-slate-200">
                                                        {t.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1">
                        {isFetchingCategories ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4 w-full">
                                <LoadingSpinner size="md" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando áreas...</p>
                            </div>
                        ) : categories.length === 0 ? (
                            <p className="w-full text-center py-10 text-xs text-muted-foreground italic bg-slate-50 rounded-3xl border border-dashed border-slate-200">Nenhuma área cadastrada.</p>
                        ) : (
                            <div className="space-y-2">
                                {categories.map(area => {
                                    const isInstructorAssigned = tempInstructorAreas.includes(area.id);
                                    const isStudentAssigned = tempStudentAreas.includes(area.id);

                                    const showInstructorToggle = selectedUser?.role === 'INSTRUCTOR' || selectedUser?.role === 'ADMIN';

                                    return (
                                        <div key={area.id} className="group p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-primary/30 transition-all duration-300 flex items-center justify-between gap-6 shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner">
                                                    {getIconComponent(area.icon || "", "h-5 w-5")}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm tracking-tight text-slate-900">{area.name}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {showInstructorToggle && (
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        <span className="text-[8px] font-black uppercase text-muted-foreground/50 tracking-widest">Lecionar</span>
                                                        <button
                                                            onClick={() => handleToggleArea(area.id, 'instructor', isInstructorAssigned || false)}
                                                            className={`h-7 w-12 rounded-full flex items-center transition-all px-1 ${isInstructorAssigned ? 'bg-primary justify-end' : 'bg-slate-200 justify-start'}`}
                                                        >
                                                            <motion.div layout className="h-5 w-5 rounded-full bg-white shadow-md" />
                                                        </button>
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="pt-8 border-t border-white/10 flex gap-4 shrink-0">
                        <button
                            onClick={handleSaveAreas}
                            disabled={isSavingPermissions}
                            className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isSavingPermissions ? (
                                <>
                                    <LoadingSpinner size="sm" variant="white" />
                                    Salvando...
                                </>
                            ) : (
                                "Salvar Áreas"
                            )}
                        </button>
                    </div>
                </motion.div>
            </PortalModal>

            {/* Turma Assignment Modal */}
            <PortalModal isOpen={isTurmaAssignmentModalOpen} onClose={() => setIsTurmaAssignmentModalOpen(false)} preventCloseOnOverlayClick={isSavingPermissions}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-xl bg-card border border-border rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />

                    <div className="mb-6 md:mb-10 relative shrink-0">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                                        <LucideUsers className="h-6 w-6 text-primary" />
                                    </div>
                                    Atribuir Turma
                                </h2>
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 leading-none">Editando turmas de</span>
                                    <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[9px] font-black tracking-widest uppercase border border-primary/20">
                                        {selectedUser?.name}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1">
                        {isFetchingTurmas ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4 w-full">
                                <LoadingSpinner size="md" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando turmas...</p>
                            </div>
                        ) : turmas.length === 0 ? (
                            <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                                <LucideUsers className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                                <p className="text-sm font-bold text-slate-400">Nenhuma turma cadastrada.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full auto-rows-fr">
                                {turmas.map(t => {
                                    const isAssigned = tempUserTurmas.includes(t.id);
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => handleToggleTurma(t.id, isAssigned)}
                                            className={`group p-5 rounded-3xl border text-left flex items-start justify-between gap-4 transition-all duration-300 relative overflow-hidden h-full ${
                                                isAssigned 
                                                ? 'bg-primary/5 border-primary shadow-[0_8px_30px_-12px_rgba(249,115,22,0.2)]' 
                                                : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 hover:shadow-sm'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1 relative z-10">
                                                <p className={`font-black text-sm uppercase tracking-tight mb-1.5 transition-colors ${isAssigned ? 'text-primary' : 'text-slate-900 group-hover:text-primary'}`}>
                                                    {t.name}
                                                </p>
                                                {t.description ? (
                                                    <p className={`text-[10px] font-bold leading-relaxed line-clamp-2 transition-colors ${isAssigned ? 'text-primary/60' : 'text-slate-400'}`}>
                                                        {t.description}
                                                    </p>
                                                ) : (
                                                    <p className="text-[9px] font-bold italic text-slate-300">Sem descrição</p>
                                                )}
                                                
                                                <div className="mt-3 flex items-center gap-2">
                                                    <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                                                        <LucideMapPin className="h-2.5 w-2.5 text-slate-400" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">{t.location?.name || 'Geral'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="shrink-0 pt-0.5 relative z-10">
                                                <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                                    isAssigned 
                                                    ? 'bg-primary border-primary text-white scale-110 shadow-lg shadow-primary/20' 
                                                    : 'bg-white border-slate-200 text-transparent group-hover:border-primary/30 group-hover:scale-105'
                                                }`}>
                                                    <LucideCheck className={`h-3.5 w-3.5 transition-transform duration-300 ${isAssigned ? 'scale-100' : 'scale-0'}`} />
                                                </div>
                                            </div>

                                            {isAssigned && (
                                                <motion.div 
                                                    layoutId={`active-bg-${t.id}`}
                                                    className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" 
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="pt-8 border-t border-white/10 flex gap-4 shrink-0">
                        <button
                            onClick={handleSaveUserTurmas}
                            disabled={isSavingPermissions}
                            className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isSavingPermissions ? (
                                <>
                                    <LoadingSpinner size="sm" variant="white" />
                                    Salvando...
                                </>
                            ) : (
                                "Salvar Turma"
                            )}
                        </button>
                    </div>
                </motion.div>
            </PortalModal>

            {/* Turma Area Assignment Modal */}
            <PortalModal isOpen={isTurmaAreaModalOpen} onClose={() => setIsTurmaAreaModalOpen(false)} preventCloseOnOverlayClick={isSavingPermissions}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-xl bg-card border border-border rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/50 via-emerald-500 to-emerald-500/50" />

                    <div className="mb-6 md:mb-10 relative shrink-0">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                        <LucideLayoutGrid className="h-6 w-6 text-emerald-500" />
                                    </div>
                                    Áreas da Turma
                                </h2>
                                <div className="mt-4 flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 leading-none">Editando áreas da turma</span>
                                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[9px] font-black tracking-widest uppercase border border-emerald-500/20">
                                        {selectedTurmaForAreas?.name}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 overflow-y-auto pr-2 md:pr-4 custom-scrollbar flex-1">
                        {isFetchingCategories ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4 w-full">
                                <LoadingSpinner size="md" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando áreas...</p>
                            </div>
                        ) : categories.length === 0 ? (
                            <p className="w-full text-center py-10 text-xs text-muted-foreground italic bg-slate-50 rounded-3xl border border-dashed border-slate-200">Nenhuma área cadastrada.</p>
                        ) : (
                            <div className="space-y-2">
                                {categories.map(area => {
                                    const isAssigned = tempTurmaAreas.includes(area.id);
                                    return (
                                        <div key={area.id} className="group p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-500/30 transition-all duration-300 flex items-center justify-between gap-6 shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform shadow-inner">
                                                    {getIconComponent(area.icon || "", "h-5 w-5")}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm tracking-tight text-slate-900">{area.name}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => handleToggleArea(area.id, 'turma', isAssigned)}
                                                    className={`h-7 w-12 rounded-full flex items-center transition-all px-1 ${isAssigned ? 'bg-emerald-500 justify-end' : 'bg-slate-200 justify-start'}`}
                                                >
                                                    <motion.div layout className="h-5 w-5 rounded-full bg-white shadow-md" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="pt-8 border-t border-white/10 flex gap-4 shrink-0">
                        <button
                            onClick={handleSaveTurmaAreas}
                            disabled={isSavingPermissions}
                            className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {isSavingPermissions ? (
                                <>
                                    <LoadingSpinner size="sm" variant="white" />
                                    Salvando...
                                </>
                            ) : (
                                "Salvar Áreas da Turma"
                            )}
                        </button>
                    </div>
                </motion.div>
            </PortalModal>

            {/* Category CRUD Modal */}
            <PortalModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-xl bg-card border border-border rounded-[2rem] p-8 md:p-12 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-foreground" />
                    <h2 className="text-3xl font-black mb-10 flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                            <LucidePlus className="h-6 w-6" />
                        </div>
                        {editingCategory ? 'Editar Área' : 'Nova Área'}
                    </h2>
                    <div className="space-y-6 overflow-y-auto custom-scrollbar">
                        <div>
                            <label className="text-[11px] uppercase font-black tracking-[0.15em] text-slate-800 ml-1">Nome da Área</label>
                            <input className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 outline-none font-bold mt-2 text-slate-900 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all"
                                placeholder="Ex: Tecnologia, Inglês, etc." value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-[11px] uppercase font-black tracking-[0.15em] text-slate-800 ml-1">Ícone Representativo</label>
                            <div className="grid grid-cols-5 md:grid-cols-6 gap-2 mt-2 bg-slate-50/50 p-3 rounded-[1.5rem] border border-slate-100">
                                {availableIcons.map((item) => (
                                    <button key={item.icon} onClick={() => setCategoryIcon(item.icon)}
                                        className={`aspect-square rounded-xl flex items-center justify-center transition-all ${categoryIcon === item.icon ? 'bg-primary text-white scale-105 shadow-md' : 'bg-white text-slate-400 hover:text-primary hover:bg-primary/5'}`}>
                                        {getIconComponent(item.icon, "h-5 w-5")}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-100">
                        <button onClick={() => setIsCategoryModalOpen(false)} className="bg-slate-100 text-slate-600 py-4 rounded-xl font-black uppercase tracking-widest transition-all hover:bg-slate-200 text-xs">Cancelar</button>
                        <button onClick={handleSaveCategory} disabled={isSavingCategory} className="bg-primary text-primary-foreground py-4 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-xs">
                            {isSavingCategory ? (
                                <>
                                    <LoadingSpinner size="sm" variant="white" />
                                    <span>Salvando...</span>
                                </>
                            ) : 'Salvar Área'}
                        </button>
                    </div>
                </motion.div>
            </PortalModal>

            {/* Turma CRUD Modal */}
            <PortalModal isOpen={isTurmaModalOpen} onClose={() => setIsTurmaModalOpen(false)}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-xl bg-card border border-border rounded-[2rem] p-8 md:p-12 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-foreground" />
                    <h2 className="text-3xl font-black mb-10 flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                            <LucideUsers className="h-6 w-6" />
                        </div>
                        {editingTurma ? 'Editar Turma' : 'Nova Turma'}
                    </h2>
                    <div className="space-y-8 overflow-y-auto custom-scrollbar">
                        <div>
                            <label className="text-[11px] uppercase font-black tracking-[0.15em] text-slate-800 ml-1">Nome da Turma</label>
                            <input className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 outline-none font-bold mt-2 text-slate-900 shadow-sm"
                                placeholder="Ex: Turma A 2024" value={turmaName} onChange={(e) => setTurmaName(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-[11px] uppercase font-black tracking-[0.15em] text-slate-800 ml-1">Descrição</label>
                            <textarea className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 outline-none font-bold mt-2 text-slate-900 shadow-sm min-h-[100px] resize-none"
                                placeholder="Sobre a turma..." value={turmaDescription} onChange={(e) => setTurmaDescription(e.target.value)} />
                        </div>
                        {!userLocationId && (
                            <div>
                                <label className="text-[11px] uppercase font-black tracking-[0.15em] text-slate-800 ml-1">Localidade</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 outline-none font-bold mt-2 text-slate-900 shadow-sm"
                                    value={tempLocationId || ""} onChange={(e) => setTempLocationId(e.target.value || null)}>
                                    <option value="">Selecione uma localidade (Obrigatório)</option>
                                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-100">
                        <button onClick={() => setIsTurmaModalOpen(false)} className="bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-slate-200 text-xs">Cancelar</button>
                        <button onClick={handleSaveTurma} disabled={isSavingTurma} className="bg-primary text-primary-foreground py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-xs">
                            {isSavingTurma ? (
                                <>
                                    <LoadingSpinner size="sm" variant="white" />
                                    <span>Salvando...</span>
                                </>
                            ) : 'Salvar Turma'}
                        </button>
                    </div>
                </motion.div>
            </PortalModal>

            {/* Location Manager Modal */}
            <PortalModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full max-w-lg bg-card border border-border rounded-[2rem] p-8 md:p-12 shadow-2xl">
                    <h2 className="text-3xl font-black mb-8 flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-amber-50 text-amber-500">
                            <LucideMapPin className="h-6 w-6" />
                        </div>
                        {editingLocation ? 'Editar Localidade' : 'Nova Localidade'}
                    </h2>
                    <div className="space-y-6">
                        <div>
                            <label className="text-[11px] uppercase font-black tracking-[0.15em] text-slate-800 ml-1">Nome da Localidade</label>
                            <input className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-8 py-5 outline-none font-bold mt-2 text-slate-900 shadow-sm"
                                placeholder="Ex: Água Rasa, Cubatão..." value={locationName} onChange={(e) => setLocationName(e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-10">
                        <button onClick={() => setIsLocationModalOpen(false)} className="bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-slate-200 text-xs">Cancelar</button>
                        <button onClick={handleSaveLocation} disabled={isSavingLocation} className="bg-primary text-primary-foreground py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-xs">
                            {isSavingLocation ? (
                                <>
                                    <LoadingSpinner size="sm" variant="white" />
                                    <span>Salvando...</span>
                                </>
                            ) : 'Salvar'}
                        </button>
                    </div>
                </motion.div>
            </PortalModal>

            {/* Confirm Modal */}
            <ConfirmModal 
                isOpen={!!confirmModal}
                onClose={() => !isDeleting && setConfirmModal(null)}
                onConfirm={confirmModal?.onConfirm || (() => {})}
                isLoading={isDeleting}
                title={confirmModal?.message || ""}
                description={confirmModal?.subtext || "Esta ação não pode ser desfeita."}
                confirmText="Sim, Excluir"
            />

            {/* Student Materials Modal */}
            {isMaterialsModalOpen && selectedUser && (
                <UserMaterialsModal
                    isOpen={isMaterialsModalOpen}
                    onClose={() => setIsMaterialsModalOpen(false)}
                    userId={selectedUser.id}
                    userName={selectedUser.name || 'Aluno'}
                />
            )}

            {/* Hidden File Input for List Avatars */}
            <input 
                type="file" 
                ref={listFileInputRef} 
                onChange={handleListAvatarFileChange} 
                className="hidden" 
                accept="image/*;capture=camera" 
            />

            {/* Lightbox for Avatars */}
            <AnimatePresence>
                {previewAvatar && (
                    <PortalModal isOpen={true} onClose={() => setPreviewAvatar(null)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-full max-w-lg aspect-square bg-white rounded-[3rem] overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border-[12px] border-white group"
                        >
                            {previewAvatar.url ? (
                                <img src={previewAvatar.url} alt={previewAvatar.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300 font-black text-6xl uppercase">
                                    {previewAvatar.name.charAt(0)}
                                </div>
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-80" />

                            <div className="absolute bottom-0 left-0 w-full p-8 md:p-10 flex items-end justify-between gap-4 md:gap-6">
                                <div className="min-w-0">
                                    <p className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter shadow-sm truncate mb-1">{previewAvatar.name}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                        <p className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] text-white/50">Foto de Perfil</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        handleListAvatarEditClick(previewAvatar.id);
                                        setPreviewAvatar(null);
                                    }}
                                    className="flex items-center gap-2 md:gap-2.5 px-4 md:px-6 py-3 md:py-4 bg-primary text-white rounded-xl md:rounded-[1.25rem] text-[10px] md:text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 shrink-0 border border-white/20"
                                >
                                    <LucideCamera className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                    Trocar Foto
                                </button>
                            </div>
                            
                            <button
                                onClick={() => setPreviewAvatar(null)}
                                className="absolute top-6 md:top-8 right-6 md:right-8 h-10 w-10 md:h-12 md:w-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all hover:scale-110 active:scale-95 border border-white/20"
                            >
                                <LucideXCircle className="h-5 w-5 md:h-6 md:w-6" />
                            </button>
                        </motion.div>
                    </PortalModal>
                )}
            </AnimatePresence>
        </div>
    );
}

function AdminStat({ icon, label, value, color = "text-primary" }: { icon: React.ReactNode, label: string, value: number, color?: string }) {
    return (
        <div className="p-6 rounded-3xl bg-card border border-border group hover:border-primary/20 transition-colors shadow-sm">
            <div className={`p-3 rounded-xl bg-white/5 ${color} w-fit mb-4 group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <p className="text-3xl font-black mb-1"><CountUp value={value} /></p>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        </div>
    );
}

function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " anos atrás";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " meses atrás";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " dias atrás";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " horas atrás";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " min atrás";
    return "agora mesmo";
}

function RoleSelect({
    value,
    onChange,
    disabled = false,
    currentUserRole
}: {
    value: string,
    onChange: (val: string) => void,
    disabled?: boolean,
    currentUserRole?: string | null
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isLocked = value === 'SUPER_ADMIN' && currentUserRole !== 'SUPER_ADMIN';
    const isDisabled = disabled || isLocked;

    const options = [
        { id: 'STUDENT', name: 'Aluno', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { id: 'INSTRUCTOR', name: 'Instrutor', color: 'text-blue-600', bg: 'bg-blue-50' },
        { id: 'ADMIN', name: 'Admin', color: 'text-purple-600', bg: 'bg-purple-50' },
        ...(currentUserRole === 'SUPER_ADMIN' || value === 'SUPER_ADMIN'
            ? [{ id: 'SUPER_ADMIN', name: 'Super', color: 'text-indigo-600', bg: 'bg-indigo-50' }]
            : []
        )
    ];

    const selectedOption = options.find(o => o.id === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative w-32" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => !isDisabled && setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center justify-between pl-3 pr-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider outline-none transition-all duration-300
                    ${isOpen 
                        ? 'bg-white border border-primary shadow-[0_4px_15px_-5px_rgba(249,115,22,0.15)] z-10 relative' 
                        : 'bg-slate-50 border border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-sm shadow-sm'
                    }
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
            >
                <div className={`truncate text-left flex-1 ${selectedOption.color} transition-colors`}>
                    {selectedOption.name}
                </div>
                <div className={`shrink-0 transition-colors duration-300 ${isOpen ? 'text-primary' : 'text-slate-300 opacity-50'}`}>
                    <LucideUserCog className="h-3.5 w-3.5" />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 top-full left-0 mt-2 w-full bg-card border border-border rounded-[1.25rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] overflow-hidden"
                    >
                        <div className="p-1.5 flex flex-col gap-1 relative bg-white">
                            {options.map(opt => {
                                const isSelected = value === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => { onChange(opt.id); setIsOpen(false); }}
                                        className={`
                                            w-full text-left px-2.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all
                                            ${isSelected 
                                                ? `${opt.bg} ${opt.color}` 
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 flex items-center justify-center shrink-0">
                                                {isSelected && <LucideCheck className={`h-3 w-3 ${opt.color}`} />}
                                            </div>
                                            <span className="truncate">{opt.name}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function LocationSelect({
    value,
    onChange,
    options
}: {
    value: string | null,
    onChange: (val: string | null) => void,
    options: { id: string, name: string }[],
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isActive = value !== null && value !== "";
    const selectedOption = isActive ? options.find(o => o.id === value) : null;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative w-40" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center justify-between pl-3 pr-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none transition-all duration-300
                    ${isOpen 
                        ? 'bg-white border border-primary/30 shadow-[0_4px_15px_-5px_rgba(249,115,22,0.15)] z-10 relative' 
                        : 'bg-slate-50 border border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-sm'
                    }
                    ${isActive ? 'text-primary' : 'text-slate-600'}
                `}
            >
                <div className="truncate text-left flex-1 transition-colors">
                    {selectedOption ? selectedOption.name : "Global"}
                </div>
                <div className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-slate-400'}`}>
                    <LucideChevronDown className="h-3 w-3" />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 top-full right-0 mt-1.5 w-48 bg-card border border-border rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] overflow-hidden"
                    >
                        <div className="p-1 flex flex-col gap-0.5 relative bg-white max-h-48 overflow-y-auto custom-scrollbar">
                            <button
                                type="button"
                                onClick={() => { onChange(null); setIsOpen(false); }}
                                className={`
                                    w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                                    ${!isActive ? 'bg-primary/5 text-primary' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                `}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-3 flex items-center justify-center shrink-0">
                                        {!isActive && <LucideCheck className="h-3 w-3 text-primary" />}
                                    </div>
                                    <span className="truncate">Global</span>
                                </div>
                            </button>
                            
                            {options.map(opt => {
                                const isSelected = value === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => { onChange(opt.id); setIsOpen(false); }}
                                        className={`
                                            w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                                            ${isSelected 
                                                ? 'bg-primary/5 text-primary' 
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 flex items-center justify-center shrink-0">
                                                {isSelected && <LucideCheck className="h-3 w-3 text-primary" />}
                                            </div>
                                            <span className="truncate">{opt.name}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function FilterSelect({
    icon: Icon,
    value,
    onChange,
    options,
    placeholder
}: {
    icon: React.ElementType,
    value: string,
    onChange: (val: string) => void,
    options: { id: string, name: string }[],
    placeholder: string
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isActive = value !== 'ALL';
    const selectedOption = value === 'ALL' ? null : options.find(o => o.id === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full lg:w-auto min-w-[140px] flex items-center justify-between pl-4 pr-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest outline-none transition-all duration-300
                    ${isActive
                        ? `bg-white border border-primary/30 shadow-[0_4px_15px_-5px_rgba(249,115,22,0.15)] text-slate-900 group`
                        : isOpen ? 'bg-slate-50 border border-slate-300 text-slate-900 shadow-sm' : 'bg-transparent border border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-600'
                    }
                `}
            >
                <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-4">
                    <div className={`transition-colors duration-300 shrink-0 ${isActive ? 'text-primary' : isOpen ? 'text-slate-900' : 'text-slate-400'}`}>
                        <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className={`truncate text-left flex-1 ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                        {isActive && selectedOption ? selectedOption.name : placeholder}
                    </span>
                </div>
                <div className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-slate-900' : isActive ? 'text-primary' : 'text-slate-300'}`}>
                    <LucideChevronDown className="h-3 w-3" />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 top-full left-0 mt-2 w-[220px] bg-card border border-border rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] overflow-hidden"
                    >
                        <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-1.5 flex flex-col gap-1">
                            <button
                                type="button"
                                onClick={() => { onChange('ALL'); setIsOpen(false); }}
                                className={`
                                    w-full text-left px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                                    ${value === 'ALL' 
                                        ? 'bg-slate-100 text-slate-900' 
                                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-3" />
                                    {placeholder}
                                </div>
                            </button>
                            
                            {options.map(opt => {
                                const isSelected = value === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => { onChange(opt.id); setIsOpen(false); }}
                                        className={`
                                            w-full text-left px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                                            ${isSelected 
                                                ? 'bg-primary/5 text-primary' 
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 flex items-center justify-center shrink-0">
                                                {isSelected && <LucideCheck className="h-3 w-3 text-primary" />}
                                            </div>
                                            <span className="truncate">{opt.name}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
