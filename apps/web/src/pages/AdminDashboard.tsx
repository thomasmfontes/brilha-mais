import { LucideShield, LucideUsers, LucideBookOpen, LucideAlertTriangle, LucideShieldCheck, LucidePlus, LucideLayoutGrid, LucideSearch, LucideUserCog, LucideCheck, LucideTrash2, LucideEdit2, LucidePencil, LucideFolder, LucideChevronDown, LucideXCircle, LucideUserCircle, LucideMaximize2, LucideLoader2, LucideCamera, LucideMapPin, LucideLayoutDashboard, LucideGraduationCap } from "lucide-react";
import { getIconComponent } from "../utils/icons";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { jwtDecode } from "jwt-decode";
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
    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-start justify-between">
            <Skeleton className="h-10 w-10" variant="rounded" />
            <Skeleton className="h-6 w-14" variant="rounded" />
        </div>
        <div className="space-y-1.5">
            <Skeleton className="h-5 w-28" variant="rounded" />
            <Skeleton className="h-3 w-20" variant="rectangle" />
        </div>
        <div className="pt-4 border-t border-slate-100 space-y-2">
            <Skeleton className="h-3 w-24" variant="rectangle" />
            <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16" variant="rounded" />
                <Skeleton className="h-5 w-20" variant="rounded" />
            </div>
        </div>
    </div>
);

const StatSkeleton = () => (
    <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div className="space-y-2">
            <Skeleton className="h-3 w-16" variant="rectangle" />
            <Skeleton className="h-7 w-20" variant="rounded" />
        </div>
        <Skeleton className="h-10 w-10" variant="rounded" />
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
    <div className="relative pl-6 border-l border-slate-200 pb-5 last:pb-0">
        <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-slate-200 ring-4 ring-white" />
        <Skeleton className="h-3 w-16 mb-2" variant="rectangle" />
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
    const [currentUserRole, setCurrentUserRole] = useState<'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'SUPER_ADMIN' | null>(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            try {
                const decoded: any = jwtDecode(token);
                return decoded.role || null;
            } catch (e) {
                return null;
            }
        }
        return null;
    });

    const isSuperAdminOrGlobal = currentUserRole === 'SUPER_ADMIN' || !userLocationId;
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
            const isWithinAdminScope = isSuperAdminOrGlobal || u.locationId === userLocationId;
            const matchesLocationFilter = selectedLocationId === 'ALL' || u.locationId === selectedLocationId;

            return matchesSearch && matchesRole && matchesTurma && matchesArea && isWithinAdminScope && matchesLocationFilter;
        })
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const filteredTurmas = turmas.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Security filter: Unit admin only sees their location. Super admin follows the location filter.
        const isWithinAdminScope = isSuperAdminOrGlobal || t.locationId === userLocationId;
        const matchesLocationFilter = selectedLocationId === 'ALL' || t.locationId === selectedLocationId;
        
        return matchesSearch && isWithinAdminScope && matchesLocationFilter;
    });

    const filteredCategories = categories.filter(c => {
        return c.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="space-y-8 w-full pb-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                        Administração
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Gestão central do ecossistema Brilha Mais.
                    </p>
                </div>

                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 self-start sm:self-auto overflow-x-auto max-w-full">
                    <button
                        onClick={() => handleTabChange('overview')}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900 font-medium'}`}
                    >
                        Visão Geral
                    </button>
                    <button
                        onClick={() => handleTabChange('areas')}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${activeTab === 'areas' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900 font-medium'}`}
                    >
                        Áreas
                    </button>
                    <button
                        onClick={() => handleTabChange('turmas')}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${activeTab === 'turmas' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900 font-medium'}`}
                    >
                        Turmas
                    </button>
                    <button
                        onClick={() => handleTabChange('users')}
                        className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900 font-medium'}`}
                    >
                        Usuários
                    </button>
                    {isSuperAdminOrGlobal && (
                        <button
                            onClick={() => handleTabChange('locations')}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${activeTab === 'locations' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900 font-medium'}`}
                        >
                            Localidades
                        </button>
                    )}
                </div>
            </div>


            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {isLoadingStats ? (
                            <>
                                <StatSkeleton />
                                <StatSkeleton />
                                <StatSkeleton />
                            </>
                        ) : (
                            <>
                                <AdminStat icon={<LucideUsers className="h-5 w-5" />} label="Usuários" value={stats.totalUsers} />
                                <AdminStat icon={<LucideBookOpen className="h-5 w-5" />} label="Cursos" value={stats.totalCourses} />
                                <AdminStat icon={<LucideShieldCheck className="h-5 w-5" />} label="Matrículas" value={stats.totalEnrollments} />
                            </>
                        )}
                    </div>

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-7 shadow-2xs">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                                <LucideShield className="h-4.5 w-4.5" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-slate-900 leading-tight">
                                    Auditoria
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Histórico de ações e eventos do sistema.
                                </p>
                            </div>
                        </div>

                        {isLoadingStats ? (
                            <div className="space-y-4">
                                <AuditSkeleton />
                                <AuditSkeleton />
                                <AuditSkeleton />
                            </div>
                        ) : auditLogs.length > 0 ? (
                            <div>
                                <div className="space-y-0">
                                    {auditLogs.map((log, idx) => (
                                        <div key={idx} className="relative pl-6 border-l border-slate-200 pb-5 last:pb-0 group">
                                            <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-amber-500 ring-4 ring-white" />

                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-400 font-medium">
                                                        {timeAgo(log.time)}
                                                    </span>
                                                </div>
                                                <div className="text-sm">
                                                    <span className="font-semibold text-slate-900">
                                                        {log.user}
                                                    </span>
                                                    <span className="text-slate-500 font-normal">
                                                        {' '}— {log.action}:{' '}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/60">
                                                        {log.entity}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {auditLogs.length >= auditLimit && (
                                    <div className="flex justify-center pt-6 mt-6 border-t border-slate-100">
                                        <button
                                            onClick={handleLoadMoreAudit}
                                            disabled={isLoadingMoreAudit}
                                            className="h-9 px-4 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs shadow-2xs transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isLoadingMoreAudit ? (
                                                <>
                                                    <LucideLoader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                                                    Carregando...
                                                </>
                                            ) : (
                                                'Ver mais histórico'
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                <LucideShield className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs font-medium text-slate-500">Nenhum registro de auditoria disponível.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'locations' && isSuperAdminOrGlobal && (
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
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Áreas de Conhecimento</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Categorias para organização de cursos e instrutores.</p>
                        </div>
                        <button
                            onClick={() => { setEditingCategory(null); setCategoryName(""); setCategoryIcon("LucideLayoutGrid"); setIsCategoryModalOpen(true); }}
                            className="h-10 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs transition-all active:scale-[0.98] shadow-xs flex items-center justify-center gap-2 self-start sm:self-auto"
                        >
                            <LucidePlus className="h-4 w-4" /> Nova Área
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        {isLoading ? (
                            <>
                                <CategorySkeleton />
                                <CategorySkeleton />
                                <CategorySkeleton />
                            </>
                        ) : filteredCategories.map(area => (
                            <div key={area.id} className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all shadow-2xs flex flex-col justify-between group">
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                                            {getIconComponent(area.icon || "LucideLayoutGrid", "h-5 w-5")}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    setEditingCategory(area);
                                                    setCategoryName(area.name);
                                                    setCategoryIcon(area.icon || "LucideLayoutGrid");
                                                    setIsCategoryModalOpen(true);
                                                }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                                title="Editar Área"
                                            >
                                                <LucideEdit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(area.id)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                title="Excluir Área"
                                            >
                                                <LucideTrash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-amber-600 transition-colors leading-snug">
                                        {area.name}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {area._count?.courses || 0} {(area._count?.courses === 1) ? 'curso cadastrado' : 'cursos cadastrados'}
                                    </p>
                                </div>

                                <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                                        Instrutores Atribuídos
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {area.instructors && area.instructors.length > 0 ? area.instructors.map((ins, idx) => (
                                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-200/60 text-xs font-medium">
                                                {ins.user.name}
                                            </span>
                                        )) : <span className="text-xs text-slate-400 italic">Nenhum instrutor atribuído</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'turmas' && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Gestão de Turmas</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Gerencie as turmas, áreas vinculadas e localidades de atendimento.</p>
                        </div>
                        <button
                            onClick={() => { setEditingTurma(null); setTurmaName(""); setTurmaDescription(""); setTempLocationId(null); setIsTurmaModalOpen(true); }}
                            className="w-full sm:w-auto h-10 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 shrink-0"
                        >
                            <LucidePlus className="h-4 w-4" />
                            <span>Nova Turma</span>
                        </button>
                    </div>

                    {/* Toolbar */}
                    <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
                            <div className="relative flex-1 max-w-md">
                                <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar turmas..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-9 bg-white border border-slate-200/80 rounded-lg pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                />
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
                                {userLocationId === undefined && currentUserRole === null ? (
                                    <div className="h-9 w-32 bg-slate-100 rounded-lg animate-pulse" />
                                ) : isSuperAdminOrGlobal && (
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

                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                            <span className="text-xs text-slate-500">
                                Total: <strong className="text-slate-900 font-semibold">{filteredTurmas.length}</strong> {filteredTurmas.length === 1 ? 'turma' : 'turmas'}
                            </span>
                        </div>
                    </div>

                    {/* Turmas Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        {isLoading ? (
                            <>
                                <CategorySkeleton />
                                <CategorySkeleton />
                                <CategorySkeleton />
                            </>
                        ) : filteredTurmas.length === 0 ? (
                            <div className="col-span-full py-12 px-4 text-center bg-white border border-slate-200/80 rounded-2xl">
                                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400 mx-auto mb-3">
                                    <LucideUsers className="h-6 w-6" />
                                </div>
                                <h3 className="text-sm font-semibold text-slate-900">Nenhuma turma encontrada</h3>
                                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                    {searchQuery ? 'Tente ajustar os filtros de busca para encontrar o que procura.' : 'Cadastre a primeira turma clicando no botão "Nova Turma" acima.'}
                                </p>
                            </div>
                        ) : filteredTurmas.map(turma => (
                            <div key={turma.id} className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all shadow-2xs flex flex-col justify-between group">
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                                            <LucideUsers className="h-5 w-5" />
                                        </div>
                                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenTurmaAreaModal(turma)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
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
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                                title="Editar Turma"
                                            >
                                                <LucideEdit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTurma(turma.id)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                title="Excluir Turma"
                                            >
                                                <LucideTrash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-amber-600 transition-colors leading-snug">
                                        {turma.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                        {turma.description || "Sem descrição informada."}
                                    </p>

                                    <div className="mt-3.5 space-y-1.5">
                                        <span className="text-[11px] font-medium text-slate-400 block">Áreas vinculadas:</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {turma.areas && turma.areas.length > 0 ? (
                                                turma.areas.map((a, i) => (
                                                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-medium">
                                                        {a.category.name}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Nenhuma área vinculada</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between gap-3 text-xs text-slate-500">
                                    <div className="flex items-center gap-1.5">
                                        <LucideUsers className="h-3.5 w-3.5 text-slate-400" />
                                        <span className="font-medium text-slate-700">{turma._count?.users || 0}</span>
                                        <span className="text-slate-400">{(turma._count?.users === 1) ? 'aluno' : 'alunos'}</span>
                                    </div>

                                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 border border-slate-200/60 text-[11px] text-slate-600">
                                        <LucideMapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                        <span className="truncate max-w-[120px]">{turma.location?.name || 'Unidade Geral'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {activeTab === 'users' && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                >
                    {/* Desktop Table View */}
                    <div className="hidden xl:block bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden relative z-20">
                        {/* Header Interno com Filtros */}
                        <div className="p-3.5 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex flex-col md:flex-row gap-2.5 items-center flex-1">
                                    <div className="relative w-full md:w-64">
                                        <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Buscar usuários..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full h-9 bg-white border border-slate-200/80 rounded-lg pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
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

                                        {userLocationId === undefined && currentUserRole === null ? (
                                            <FilterSkeleton />
                                        ) : isSuperAdminOrGlobal && (
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
                                    <span className="text-xs text-slate-500">
                                        Total: <strong className="text-slate-900 font-semibold">{filteredUsers.length}</strong> {filteredUsers.length === 1 ? 'usuário' : 'usuários'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[1000px]">
                                <thead>
                                    <tr className="border-b border-slate-200/80 text-xs font-semibold text-slate-600 bg-slate-50/75">
                                        <th className="px-5 py-3 w-[26%] min-w-[200px]">Usuário</th>
                                        <th className="px-5 py-3 w-[14%]">Função</th>
                                        <th className="px-5 py-3 w-[18%]">Turmas</th>
                                        <th className="px-5 py-3 w-[18%]">Áreas</th>
                                        <th className="px-5 py-3 w-[14%]">Localidade</th>
                                        <th className="px-5 py-3 w-[10%] text-right">Ações</th>
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
                                        <tr key={user.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <button 
                                                        onClick={() => setPreviewAvatar({ 
                                                            id: user.id,
                                                            url: user.avatarUrl?.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}`, 
                                                            name: user.name || '' 
                                                        })}
                                                        className="relative h-9 w-9 rounded-full flex items-center justify-center font-medium text-xs text-slate-600 border border-slate-200/80 bg-slate-100 shrink-0 overflow-hidden shadow-2xs hover:border-amber-400 hover:ring-2 hover:ring-amber-400/20 transition-all"
                                                        title="Clique para visualizar ou alterar foto"
                                                    >
                                                        {user.avatarUrl
                                                            ? <img src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}`} alt={user.name || ''} className={`h-full w-full object-cover ${isUpdatingAvatarFor === user.id ? 'opacity-30 blur-[2px]' : ''}`} referrerPolicy="no-referrer" />
                                                            : <span className={isUpdatingAvatarFor === user.id ? 'opacity-0' : ''}>{user.name?.charAt(0) || '?'}</span>
                                                        }
                                                        
                                                        {isUpdatingAvatarFor === user.id && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                                                                <LucideLoader2 className="h-3.5 w-3.5 text-amber-500 animate-spin" />
                                                            </div>
                                                        )}
                                                    </button>
                                                    <div className="min-w-0">
                                                        {editingNameFor === user.id ? (
                                                            <input
                                                                autoFocus
                                                                className="font-medium bg-white border border-amber-500 rounded px-1.5 py-0.5 outline-none text-xs w-40 text-slate-900"
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
                                                            <p className="font-semibold text-sm text-slate-900 cursor-pointer hover:text-amber-600 transition-colors flex items-center gap-1.5 leading-snug group/name" onClick={() => { setEditingNameFor(user.id); setEditingNameValue(user.name || ''); }}>
                                                                <span className="truncate">{user.name}</span>
                                                                <LucidePencil className="h-3 w-3 text-slate-400 opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {updatingRoleFor === user.id ? (
                                                    <div className="flex items-center justify-center h-7 w-20">
                                                        <LoadingSpinner size="xs" />
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
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        {user.turmas?.map((t, i) => (
                                                            <span key={`turma-${i}`} className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60 text-xs font-medium">
                                                                {t.name}
                                                            </span>
                                                        ))}
                                                        {user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' && (
                                                            <button
                                                                onClick={() => handleOpenTurmaModal(user)}
                                                                className="h-6 w-6 rounded-md border border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors inline-flex items-center justify-center shrink-0"
                                                                title="Gerenciar Turmas"
                                                            >
                                                                <LucidePlus className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                        {(!user.turmas || user.turmas.length === 0) && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                                                            <span className="text-xs text-slate-400 italic">Acesso Geral</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {updatingRoleFor === user.id ? (
                                                        <div className="flex items-center">
                                                            <LoadingSpinner size="xs" />
                                                        </div>
                                                    ) : user.role === 'SUPER_ADMIN' ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 text-xs font-medium">
                                                            Super Admin
                                                        </span>
                                                    ) : user.role === 'ADMIN' ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 text-xs font-medium">
                                                            Acesso Geral
                                                        </span>
                                                    ) : (
                                                        <>
                                                            {user.role === 'INSTRUCTOR' && user.assignedAreas.map((a, i) => (
                                                                <span key={`ins-${i}`} className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 text-xs font-medium">
                                                                    {a.category.name}
                                                                </span>
                                                            ))}
                                                            {user.role === 'STUDENT' && user.turmas?.map(t => t.areas?.map((a, i) => (
                                                                <span key={`stu-${t.id}-${i}`} className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-medium">
                                                                    {a.category.name}
                                                                </span>
                                                            )))}
                                                        </>
                                                    )}

                                                    {user.role === 'INSTRUCTOR' && (
                                                        <button
                                                            onClick={() => handleOpenAreaModal(user)}
                                                            className="h-6 w-6 rounded-md border border-dashed border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors inline-flex items-center justify-center shrink-0"
                                                            title="Gerenciar Áreas"
                                                        >
                                                            <LucidePlus className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    {updatingRoleFor === user.id ? (
                                                        <LoadingSpinner size="xs" />
                                                    ) : isSuperAdminOrGlobal && user.role !== 'SUPER_ADMIN' ? (
                                                        <LocationSelect
                                                            value={user.locationId || null}
                                                            onChange={(val) => handleUpdateUserLocation(user.id, val)}
                                                            options={locations}
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-slate-500 font-medium">
                                                            {user.location?.name || 'Global'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <div className="flex justify-end items-center gap-1">
                                                    {user.role === 'STUDENT' && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setIsMaterialsModalOpen(true);
                                                            }}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                                            title="Materiais do Aluno"
                                                        >
                                                            <LucideFolder className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        title="Excluir Usuário"
                                                    >
                                                        <LucideTrash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-xs">
                                                Nenhum usuário encontrado para a busca atual.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Card List */}
                    <div className="xl:hidden space-y-4">
                        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs space-y-3">
                            <div className="relative">
                                <LucideSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar usuários..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-9 bg-white border border-slate-200/80 rounded-lg pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                {userLocationId === undefined && currentUserRole === null ? (
                                    <div className="h-9 w-full bg-slate-100 rounded-lg animate-pulse" />
                                ) : isSuperAdminOrGlobal && (
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
                            <div key={user.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <button 
                                            onClick={() => setPreviewAvatar({ 
                                                id: user.id,
                                                url: user.avatarUrl?.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}`, 
                                                name: user.name || '' 
                                            })}
                                            className="h-11 w-11 rounded-full flex items-center justify-center font-medium text-xs text-slate-600 border border-slate-200/80 bg-slate-100 shrink-0 overflow-hidden shadow-2xs hover:border-amber-400 transition-all"
                                        >
                                            {user.avatarUrl
                                                ? <img src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `${API_URL}${user.avatarUrl}`} alt={user.name || ''} className={`h-full w-full object-cover ${isUpdatingAvatarFor === user.id ? 'opacity-30 blur-[2px]' : ''}`} referrerPolicy="no-referrer" />
                                                : <span className={`text-sm ${isUpdatingAvatarFor === user.id ? 'opacity-0' : ''}`}>{user.name?.charAt(0) || '?'}</span>
                                            }
                                            
                                            {isUpdatingAvatarFor === user.id && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                                                    <LucideLoader2 className="h-4 w-4 text-amber-500 animate-spin" />
                                                </div>
                                            )}
                                        </button>
                                        <div className="min-w-0 flex-1">
                                            {editingNameFor === user.id ? (
                                                <input
                                                    autoFocus
                                                    className="font-semibold text-base bg-white border border-amber-500 rounded px-1.5 py-0.5 outline-none text-slate-900 w-full mb-1"
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
                                                <h3 className="font-semibold text-sm text-slate-900 truncate leading-snug cursor-pointer hover:text-amber-600 transition-colors flex items-center gap-1.5 group/name" onClick={() => { setEditingNameFor(user.id); setEditingNameValue(user.name || ''); }}>
                                                    <span className="truncate">{user.name}</span>
                                                    <LucidePencil className="h-3 w-3 opacity-0 group-hover/name:opacity-50 transition-opacity shrink-0" />
                                                </h3>
                                            )}
                                            <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                        </div>
                                    </div>

                                    <RoleSelect
                                        value={user.role}
                                        onChange={(val) => handleUpdateRole(user.id, val)}
                                        currentUserRole={currentUserRole}
                                    />
                                </div>

                                <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-slate-400 font-medium">Turmas:</span>
                                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                                            {user.turmas?.map((t, i) => (
                                                <span key={`turma-mb-${i}`} className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60 text-xs font-medium">
                                                    {t.name}
                                                </span>
                                            ))}
                                            {user.role !== 'ADMIN' && (
                                                <button
                                                    onClick={() => handleOpenTurmaModal(user)}
                                                    className="h-5 px-2 rounded-md border border-dashed border-slate-200 hover:border-slate-300 text-slate-500 text-[11px] inline-flex items-center gap-1 transition-colors"
                                                >
                                                    <LucidePlus className="h-3 w-3" /> Gerenciar
                                                </button>
                                            )}
                                            {(!user.turmas || user.turmas.length === 0) && user.role === 'ADMIN' && (
                                                <span className="text-slate-400 italic">Acesso Global</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-slate-400 font-medium">Áreas:</span>
                                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                                            {user.role === 'ADMIN' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 text-xs font-medium">
                                                    Acesso Geral
                                                </span>
                                            ) : (
                                                <>
                                                    {user.role === 'INSTRUCTOR' && user.assignedAreas.map((a, i) => (
                                                        <span key={`ins-${i}`} className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 text-xs font-medium">
                                                            {a.category.name}
                                                        </span>
                                                    ))}
                                                    {user.role === 'STUDENT' && user.turmas?.map(t => t.areas?.map((a, i) => (
                                                        <span key={`stu-mb-${t.id}-${i}`} className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-medium">
                                                            {a.category.name}
                                                        </span>
                                                    )))}
                                                    {user.role === 'INSTRUCTOR' && (
                                                        <button
                                                            onClick={() => handleOpenAreaModal(user)}
                                                            className="h-5 px-2 rounded-md border border-dashed border-slate-200 hover:border-amber-300 text-slate-500 text-[11px] inline-flex items-center gap-1 transition-colors"
                                                        >
                                                            <LucidePlus className="h-3 w-3" /> Áreas
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-slate-400 font-medium">Localidade:</span>
                                        {isSuperAdminOrGlobal && user.role !== 'SUPER_ADMIN' ? (
                                            <LocationSelect
                                                value={user.locationId || null}
                                                onChange={(val) => handleUpdateUserLocation(user.id, val)}
                                                options={locations}
                                            />
                                        ) : (
                                            <span className="text-xs text-slate-600 font-medium">
                                                {user.location?.name || 'Global'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                    {user.role === 'STUDENT' && (
                                        <button
                                            onClick={() => {
                                                setSelectedUser(user);
                                                setIsMaterialsModalOpen(true);
                                            }}
                                            className="h-8 px-3 rounded-lg border border-slate-200/80 hover:bg-amber-50 hover:border-amber-200 text-slate-600 hover:text-amber-700 text-xs font-medium transition-colors flex items-center gap-1.5"
                                        >
                                            <LucideFolder className="h-3.5 w-3.5" /> Materiais
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="h-8 px-3 rounded-lg border border-slate-200/80 hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600 text-xs font-medium transition-colors flex items-center gap-1.5"
                                    >
                                        <LucideTrash2 className="h-3.5 w-3.5" /> Excluir
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-2xs">
                                <LucideSearch className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <h3 className="text-sm font-semibold text-slate-900">Nenhum usuário encontrado</h3>
                                <p className="text-xs text-slate-400 mt-1">A busca por "{searchQuery}" não retornou resultados.</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Area Assignment Modal */}
            <PortalModal isOpen={isAreaModalOpen} onClose={() => setIsAreaModalOpen(false)} preventCloseOnOverlayClick={isSavingPermissions}>
                <div className="relative w-full max-w-lg bg-white border border-slate-200/80 rounded-2xl p-6 md:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                            <LucideLayoutGrid className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold text-slate-900 leading-tight">Áreas de Atuação</h2>
                                {selectedUser && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 text-xs font-medium truncate max-w-[160px]">
                                        {selectedUser.name}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Selecione quais áreas de conhecimento este usuário tem acesso.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2.5 overflow-y-auto pr-1 custom-scrollbar flex-1">
                        {isFetchingCategories ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-3 w-full">
                                <LoadingSpinner size="md" />
                                <p className="text-xs text-slate-400">Carregando áreas...</p>
                            </div>
                        ) : categories.length === 0 ? (
                            <p className="w-full text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                Nenhuma área cadastrada no sistema.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {categories.map(area => {
                                    const isInstructorAssigned = tempInstructorAreas.includes(area.id);
                                    const showInstructorToggle = selectedUser?.role === 'INSTRUCTOR' || selectedUser?.role === 'ADMIN';

                                    return (
                                        <div 
                                            key={area.id} 
                                            className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                                                isInstructorAssigned 
                                                    ? 'bg-amber-50/40 border-amber-200/80 shadow-2xs' 
                                                    : 'bg-white border-slate-200/70 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                                    isInstructorAssigned 
                                                        ? 'bg-amber-100 text-amber-700' 
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {getIconComponent(area.icon || "", "h-4 w-4")}
                                                </div>
                                                <p className="font-medium text-sm text-slate-900 truncate">{area.name}</p>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {showInstructorToggle && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleArea(area.id, 'instructor', isInstructorAssigned || false)}
                                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                            isInstructorAssigned ? 'bg-amber-500' : 'bg-slate-200'
                                                        }`}
                                                    >
                                                        <span 
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                                                isInstructorAssigned ? 'translate-x-5' : 'translate-x-0'
                                                            }`} 
                                                        />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                        <button 
                            type="button"
                            onClick={() => setIsAreaModalOpen(false)} 
                            disabled={isSavingPermissions}
                            className="h-10 px-4 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveAreas}
                            disabled={isSavingPermissions}
                            className="h-10 px-5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSavingPermissions ? (
                                <>
                                    <LoadingSpinner size="sm" variant="white" />
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                "Salvar Áreas"
                            )}
                        </button>
                    </div>
                </div>
            </PortalModal>

            {/* Turma Assignment Modal */}
            <PortalModal isOpen={isTurmaAssignmentModalOpen} onClose={() => setIsTurmaAssignmentModalOpen(false)} preventCloseOnOverlayClick={isSavingPermissions}>
                <div className="relative w-full max-w-xl bg-white border border-slate-200/80 rounded-2xl p-6 md:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                            <LucideUsers className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold text-slate-900 leading-tight">Atribuir Turmas</h2>
                                {selectedUser && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 text-xs font-medium truncate max-w-[160px]">
                                        {selectedUser.name}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Selecione as turmas às quais este usuário pertence.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar flex-1">
                        {isFetchingTurmas ? (
                            <div className="flex flex-col items-center justify-center py-16 space-y-3 w-full">
                                <LoadingSpinner size="md" />
                                <p className="text-xs text-slate-400">Carregando turmas...</p>
                            </div>
                        ) : turmas.length === 0 ? (
                            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <LucideUsers className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs text-slate-400 font-medium">Nenhuma turma cadastrada.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                                {turmas.map(t => {
                                    const isAssigned = tempUserTurmas.includes(t.id);
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => handleToggleTurma(t.id, isAssigned)}
                                            className={`p-3.5 rounded-xl border text-left flex items-start justify-between gap-3 transition-all relative ${
                                                isAssigned 
                                                    ? 'bg-amber-50/50 border-amber-300 shadow-2xs' 
                                                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className={`font-semibold text-sm leading-snug ${isAssigned ? 'text-amber-900' : 'text-slate-900'}`}>
                                                    {t.name}
                                                </p>
                                                {t.description && (
                                                    <p className={`text-xs mt-1 line-clamp-2 ${isAssigned ? 'text-amber-700/80' : 'text-slate-400'}`}>
                                                        {t.description}
                                                    </p>
                                                )}
                                                {t.location && (
                                                    <div className="flex items-center gap-1 mt-2 text-[11px] text-slate-400">
                                                        <LucideMapPin className="h-3 w-3" />
                                                        <span className="truncate">{t.location.name}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="shrink-0 pt-0.5">
                                                <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                                                    isAssigned 
                                                        ? 'bg-amber-500 border-amber-500 text-white' 
                                                        : 'bg-white border-slate-300 text-transparent'
                                                }`}>
                                                    <LucideCheck className="h-3.5 w-3.5" />
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                        <button 
                            type="button"
                            onClick={() => setIsTurmaAssignmentModalOpen(false)} 
                            disabled={isSavingPermissions}
                            className="h-10 px-4 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveUserTurmas}
                            disabled={isSavingPermissions}
                            className="h-10 px-5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSavingPermissions ? (
                                <>
                                    <LoadingSpinner size="sm" variant="white" />
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                "Salvar Turmas"
                            )}
                        </button>
                    </div>
                </div>
            </PortalModal>

            {/* Turma Area Assignment Modal */}
            <PortalModal isOpen={isTurmaAreaModalOpen} onClose={() => setIsTurmaAreaModalOpen(false)} preventCloseOnOverlayClick={isSavingPermissions}>
                <div className="relative w-full max-w-lg bg-white border border-slate-200/80 rounded-2xl p-6 md:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shrink-0">
                            <LucideLayoutGrid className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold text-slate-900 leading-tight">Áreas da Turma</h2>
                                {selectedTurmaForAreas && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-medium truncate max-w-[160px]">
                                        {selectedTurmaForAreas.name}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Selecione quais áreas de conhecimento esta turma terá acesso.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2.5 overflow-y-auto pr-1 custom-scrollbar flex-1">
                        {isFetchingCategories ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-3 w-full">
                                <LoadingSpinner size="md" />
                                <p className="text-xs text-slate-400">Carregando áreas...</p>
                            </div>
                        ) : categories.length === 0 ? (
                            <p className="w-full text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                Nenhuma área cadastrada no sistema.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {categories.map(area => {
                                    const isAssigned = tempTurmaAreas.includes(area.id);
                                    return (
                                        <div 
                                            key={area.id} 
                                            className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                                                isAssigned 
                                                    ? 'bg-emerald-50/40 border-emerald-200/80 shadow-2xs' 
                                                    : 'bg-white border-slate-200/70 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                                    isAssigned 
                                                        ? 'bg-emerald-100 text-emerald-700' 
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {getIconComponent(area.icon || "", "h-4 w-4")}
                                                </div>
                                                <p className="font-medium text-sm text-slate-900 truncate">{area.name}</p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleToggleArea(area.id, 'turma', isAssigned)}
                                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                    isAssigned ? 'bg-emerald-600' : 'bg-slate-200'
                                                }`}
                                            >
                                                <span 
                                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                                        isAssigned ? 'translate-x-5' : 'translate-x-0'
                                                    }`} 
                                                />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                        <button 
                            type="button"
                            onClick={() => setIsTurmaAreaModalOpen(false)} 
                            disabled={isSavingPermissions}
                            className="h-10 px-4 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveTurmaAreas}
                            disabled={isSavingPermissions}
                            className="h-10 px-5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSavingPermissions ? (
                                <>
                                    <LoadingSpinner size="sm" variant="white" />
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                "Salvar Áreas da Turma"
                            )}
                        </button>
                    </div>
                </div>
            </PortalModal>

            {/* Category CRUD Modal */}
            <PortalModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)}>
                <div className="relative w-full max-w-lg bg-white border border-slate-200/80 rounded-2xl p-6 md:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                            <LucidePlus className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 leading-tight">
                                {editingCategory ? 'Editar Área' : 'Nova Área'}
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Defina o nome e o ícone representativo da área.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Nome da Área</label>
                            <input 
                                className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                placeholder="Ex: Tecnologia, Inglês, etc." 
                                value={categoryName} 
                                onChange={(e) => setCategoryName(e.target.value)} 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Ícone Representativo</label>
                            <div className="grid grid-cols-6 sm:grid-cols-7 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 max-h-48 overflow-y-auto custom-scrollbar">
                                {availableIcons.map((item) => (
                                    <button 
                                        key={item.icon} 
                                        type="button"
                                        onClick={() => setCategoryIcon(item.icon)}
                                        className={`aspect-square rounded-lg flex items-center justify-center transition-all ${categoryIcon === item.icon ? 'bg-amber-500 text-white shadow-xs scale-105' : 'bg-white text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-slate-200/60'}`}
                                    >
                                        {getIconComponent(item.icon, "h-4 w-4")}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                        <button 
                            type="button"
                            onClick={() => setIsCategoryModalOpen(false)} 
                            className="h-10 px-4 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="button"
                            onClick={handleSaveCategory} 
                            disabled={isSavingCategory} 
                            className="h-10 px-5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSavingCategory ? (
                                <>
                                    <LoadingSpinner size="sm" variant="white" />
                                    <span>Salvando...</span>
                                </>
                            ) : 'Salvar Área'}
                        </button>
                    </div>
                </div>
            </PortalModal>

            {/* Turma CRUD Modal */}
            <PortalModal isOpen={isTurmaModalOpen} onClose={() => setIsTurmaModalOpen(false)}>
                <div className="relative w-full max-w-lg bg-white border border-slate-200/80 rounded-2xl p-6 md:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                            <LucideUsers className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 leading-tight">
                                {editingTurma ? 'Editar Turma' : 'Nova Turma'}
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Preencha as informações básicas e localidade da turma.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Nome da Turma</label>
                            <input 
                                className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                placeholder="Ex: Turma A 2024" 
                                value={turmaName} 
                                onChange={(e) => setTurmaName(e.target.value)} 
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Descrição</label>
                            <textarea 
                                className="w-full bg-white border border-slate-200/80 rounded-xl p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all resize-none min-h-[90px]"
                                placeholder="Breve resumo ou observações sobre a turma..." 
                                value={turmaDescription} 
                                onChange={(e) => setTurmaDescription(e.target.value)} 
                            />
                        </div>

                        {isSuperAdminOrGlobal && (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700">Localidade</label>
                                <select 
                                    className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3 text-sm text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                    value={tempLocationId || ""} 
                                    onChange={(e) => setTempLocationId(e.target.value || null)}
                                >
                                    <option value="">Selecione uma localidade (Obrigatório)</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                        <button 
                            type="button"
                            onClick={() => setIsTurmaModalOpen(false)} 
                            className="h-10 px-4 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="button"
                            onClick={handleSaveTurma} 
                            disabled={isSavingTurma} 
                            className="h-10 px-5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSavingTurma ? (
                                <>
                                    <LoadingSpinner size="sm" variant="white" />
                                    <span>Salvando...</span>
                                </>
                            ) : 'Salvar Turma'}
                        </button>
                    </div>
                </div>
            </PortalModal>

            {/* Location Manager Modal */}
            <PortalModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)}>
                <div className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-6 md:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                            <LucideMapPin className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 leading-tight">
                                {editingLocation ? 'Editar Localidade' : 'Nova Localidade'}
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Cadastre polos ou unidades de atendimento.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Nome da Localidade</label>
                            <input 
                                className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                                placeholder="Ex: Água Rasa, Cubatão..." 
                                value={locationName} 
                                onChange={(e) => setLocationName(e.target.value)} 
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                        <button 
                            type="button"
                            onClick={() => setIsLocationModalOpen(false)} 
                            className="h-10 px-4 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="button"
                            onClick={handleSaveLocation} 
                            disabled={isSavingLocation} 
                            className="h-10 px-5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSavingLocation ? (
                                <>
                                    <LoadingSpinner size="sm" variant="white" />
                                    <span>Salvando...</span>
                                </>
                            ) : 'Salvar Localidade'}
                        </button>
                    </div>
                </div>
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

function AdminStat({ icon, label, value, color = "text-amber-600" }: { icon: React.ReactNode, label: string, value: number, color?: string }) {
    return (
        <div className="p-5 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
                    <CountUp value={value} />
                </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                {icon}
            </div>
        </div>
    );
}

function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const years = Math.floor(seconds / 31536000);
    if (years >= 1) return `${years} ${years === 1 ? 'ano' : 'anos'} atrás`;
    const months = Math.floor(seconds / 2592000);
    if (months >= 1) return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`;
    const days = Math.floor(seconds / 86400);
    if (days >= 1) return `${days} ${days === 1 ? 'dia' : 'dias'} atrás`;
    const hours = Math.floor(seconds / 3600);
    if (hours >= 1) return `${hours} ${hours === 1 ? 'hora' : 'horas'} atrás`;
    const minutes = Math.floor(seconds / 60);
    if (minutes >= 1) return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} atrás`;
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
        { id: 'STUDENT', name: 'Aluno', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200/60' },
        { id: 'INSTRUCTOR', name: 'Instrutor', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200/60' },
        { id: 'ADMIN', name: 'Admin', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200/60' },
        ...(currentUserRole === 'SUPER_ADMIN' || value === 'SUPER_ADMIN'
            ? [{ id: 'SUPER_ADMIN', name: 'Super Admin', color: 'text-amber-800', bg: 'bg-amber-50 border-amber-200/60' }]
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
        <div className="relative inline-block" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => !isDisabled && setIsOpen(!isOpen)}
                className={`
                    h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md text-xs font-medium border transition-colors outline-none
                    ${selectedOption.bg} ${selectedOption.color}
                    ${isOpen ? 'ring-2 ring-amber-500/20' : ''}
                    ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:brightness-95'}
                `}
            >
                <span>{selectedOption.name}</span>
                <LucideChevronDown className="h-3 w-3 opacity-60" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 top-full left-0 mt-1.5 w-36 bg-white border border-slate-200/90 rounded-xl shadow-lg overflow-hidden"
                    >
                        <div className="p-1 flex flex-col gap-0.5">
                            {options.map(opt => {
                                const isSelected = value === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => { onChange(opt.id); setIsOpen(false); }}
                                        className={`
                                            w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between
                                            ${isSelected ? `${opt.bg} ${opt.color} font-semibold` : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                        `}
                                    >
                                        <span className="truncate">{opt.name}</span>
                                        {isSelected && <LucideCheck className="h-3 w-3 shrink-0" />}
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
        <div className="relative w-36" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full h-7 flex items-center justify-between px-2 rounded-md text-xs font-medium outline-none transition-colors border
                    ${isOpen ? 'bg-white border-amber-500 ring-2 ring-amber-500/20' : 'bg-slate-50 border-slate-200/80 hover:bg-white hover:border-slate-300'}
                    ${isActive ? 'text-slate-800' : 'text-slate-500'}
                `}
            >
                <span className="truncate text-left flex-1">
                    {selectedOption ? selectedOption.name : "Global"}
                </span>
                <LucideChevronDown className="h-3 w-3 text-slate-400 shrink-0 ml-1" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 top-full right-0 mt-1.5 w-48 bg-white border border-slate-200/90 rounded-xl shadow-lg overflow-hidden"
                    >
                        <div className="max-h-[220px] overflow-y-auto custom-scrollbar p-1 flex flex-col gap-0.5">
                            <button
                                type="button"
                                onClick={() => { onChange(null); setIsOpen(false); }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${!value ? 'bg-amber-50 text-amber-800 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                Global
                            </button>
                            {options.map(loc => {
                                const isSelected = value === loc.id;
                                return (
                                    <button
                                        key={loc.id}
                                        type="button"
                                        onClick={() => { onChange(loc.id); setIsOpen(false); }}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${isSelected ? 'bg-amber-50 text-amber-800 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                    >
                                        <span className="truncate">{loc.name}</span>
                                        {isSelected && <LucideCheck className="h-3.5 w-3.5 text-amber-600 shrink-0 ml-1" />}
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
                    w-full lg:w-auto min-w-[130px] h-9 flex items-center justify-between px-3 rounded-lg text-xs font-medium outline-none transition-all
                    ${isActive
                        ? 'bg-amber-50/80 border border-amber-300 text-amber-900 shadow-2xs'
                        : isOpen 
                            ? 'bg-slate-100 border border-slate-300 text-slate-900' 
                            : 'bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 text-slate-600'
                    }
                `}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                    <div className={`shrink-0 transition-colors ${isActive ? 'text-amber-600' : 'text-slate-400'}`}>
                        <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="truncate text-left flex-1">
                        {isActive && selectedOption ? selectedOption.name : placeholder}
                    </span>
                </div>
                <div className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-slate-900' : isActive ? 'text-amber-600' : 'text-slate-400'}`}>
                    <LucideChevronDown className="h-3 w-3" />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 top-full left-0 mt-1.5 w-[200px] bg-white border border-slate-200/90 rounded-xl shadow-lg overflow-hidden"
                    >
                        <div className="max-h-[260px] overflow-y-auto custom-scrollbar p-1 flex flex-col gap-0.5">
                            <button
                                type="button"
                                onClick={() => { onChange('ALL'); setIsOpen(false); }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${value === 'ALL' ? 'bg-amber-50 text-amber-800 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                            >
                                Todas as opções
                            </button>
                            {options.map(opt => {
                                const isSelected = value === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => { onChange(opt.id); setIsOpen(false); }}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${isSelected ? 'bg-amber-50 text-amber-800 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                                    >
                                        <span className="truncate">{opt.name}</span>
                                        {isSelected && <LucideCheck className="h-3.5 w-3.5 text-amber-600 shrink-0 ml-1" />}
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
