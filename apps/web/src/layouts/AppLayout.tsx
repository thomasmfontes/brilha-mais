import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { compressImage } from "@/utils/image";
import {
    LucideLayoutDashboard,
    LucidePlayCircle,
    LucideGraduationCap,
    LucideSearch,
    LucideLogOut,
    LucideMenu,
    LucideX,
    LucideSettings2,
    LucideMonitorPlay,
    LucideBookOpen,
    LucideBriefcase,
    LucideArrowRight,
    LucideCheckCircle,
    LucideCamera,
    LucideLoader2,
    LucideQrCode,
    LucideFingerprint,
    LucideChevronDown
} from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import logo from "../assets/logo.png";
import icon from "../assets/icon.png";
import { WelcomeVideoModal } from "../components/WelcomeVideoModal";
import { LocationPickerModal } from "../components/LocationPickerModal";
import SettingsModal from "../components/SettingsModal";
import api from "../utils/api";
import { toast } from "react-hot-toast";

const menuItems = [
    { icon: <LucideLayoutDashboard className="h-5 w-5" />, label: "Dashboard", path: "/dashboard" },
    { icon: <LucidePlayCircle className="h-5 w-5" />, label: "Meus Cursos", path: "/my-courses" },
    { icon: <LucideSearch className="h-5 w-5" />, label: "Explorar", path: "/explore" },
    { icon: <LucideGraduationCap className="h-5 w-5" />, label: "Certificados", path: "/certificates" },
    { icon: <LucideBookOpen className="h-5 w-5" />, label: "Recursos", path: "/resources" },
    { icon: <LucideBriefcase className="h-5 w-5" />, label: "Meu Currículo", path: "/curriculo" },
];

const adminItems = [
    { icon: <LucideMonitorPlay className="h-5 w-5" />, label: "Instrutor", path: "/instructor", roles: ['instructor', 'admin', 'super_admin'] },
    { icon: <LucideCheckCircle className="h-5 w-5" />, label: "Correções", path: "/instructor/submissions", roles: ['instructor', 'admin', 'super_admin'] },
    { icon: <LucideSettings2 className="h-5 w-5" />, label: "Administração", path: "/admin", roles: ['admin', 'super_admin'] },
];

export function AppLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [userRole, setUserRole] = useState<'student' | 'instructor' | 'admin' | 'super_admin'>(() => {
        try {
            const token = localStorage.getItem('auth_token');
            if (token) return (jwtDecode<any>(token).role || 'STUDENT').toLowerCase() as any;
        } catch (e) {}
        return 'student';
    });
    const [userName, setUserName] = useState<string>(() => {
        try {
            const token = localStorage.getItem('auth_token');
            if (token) return jwtDecode<any>(token).name || '';
        } catch (e) {}
        return '';
    });
    const [userEmail, setUserEmail] = useState<string>(() => {
        try {
            const token = localStorage.getItem('auth_token');
            if (token) return jwtDecode<any>(token).email || '';
        } catch (e) {}
        return '';
    });
    const [userAvatar, setUserAvatar] = useState<string>(() => {
        try {
            const token = localStorage.getItem('auth_token');
            if (token) return jwtDecode<any>(token).avatarUrl || '';
        } catch (e) {}
        return '';
    });
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isWelcomeVideoOpen, setIsWelcomeVideoOpen] = useState(false);
    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
    const [isLoadingUserData, setIsLoadingUserData] = useState(() => {
        try {
            return !localStorage.getItem('auth_token');
        } catch (e) {
            return true;
        }
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        // Reset internal scroll on route change
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
        setIsProfileMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        
        if (!token) {
            navigate('/login', { replace: true });
            return;
        }

        const syncUser = async () => {
            // Background sync - do not trigger loading skeleton
            try {
                const res = await api.get('/users/me');
                const user = res.data;
                
                if (user.name) setUserName(user.name);
                if (user.email) setUserEmail(user.email);
                if (user.avatarUrl) setUserAvatar(user.avatarUrl);
                if (user.role) setUserRole(user.role.toLowerCase() as any);

                // Prioridade 1: Vídeo de Boas-vindas
                if (user.role === 'STUDENT' && user.hasSeenWelcomeVideo === false) {
                    setIsWelcomeVideoOpen(true);
                }
                // Prioridade 2: Seleção de Localidade (Só aparece se já viu o vídeo ou não é aluno)
                else if (!user.locationId && user.role !== 'SUPER_ADMIN') {
                    setIsLocationPickerOpen(true);
                }
            } catch (error: any) {
                console.error("Auth sync error:", error);
                if (error.response?.status === 401) {
                    localStorage.removeItem('auth_token');
                    navigate('/login', { replace: true });
                }
            } finally {
                setIsLoadingUserData(false);
            }
        };

        syncUser();
    }, [navigate]);

    const handleCloseWelcomeVideo = async () => {
        setIsWelcomeVideoOpen(false);
        try {
            await api.patch('/users/me/welcome-video');
            
            // Após fechar o vídeo, verifica se precisa selecionar a localidade
            const res = await api.get('/users/me');
            const user = res.data;
            if (!user.locationId && user.role !== 'SUPER_ADMIN') {
                setIsLocationPickerOpen(true);
            }
        } catch (error) {
            console.error("Error marking welcome video as seen:", error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        navigate('/login', { replace: true });
    };

    const visibleAdminItems = useMemo(() => adminItems.filter(item => item.roles.includes(userRole)), [userRole]);

    const activeIndex = useMemo(() => menuItems.findIndex(item => item.path === location.pathname), [location.pathname]);

    const currentPageTitle = useMemo(() => {
        const path = location.pathname;
        if (path.startsWith('/dashboard')) return 'Dashboard';
        if (path.startsWith('/my-courses')) return 'Meus Cursos';
        if (path.startsWith('/explore')) return 'Explorar';
        if (path.startsWith('/certificates')) return 'Certificados';
        if (path.startsWith('/resources')) return 'Recursos';
        if (path.startsWith('/curriculo')) return 'Meu Currículo';
        if (path.startsWith('/instructor/submissions')) return 'Correções';
        if (path.startsWith('/instructor/turma')) return 'Encontros';
        if (path.startsWith('/instructor')) return 'Instrutor';
        if (path.startsWith('/admin')) return 'Administração';
        if (path.startsWith('/course')) return 'Curso';
        if (path.startsWith('/scan')) return 'Presença';
        return '';
    }, [location.pathname]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            toast.error("Por favor, selecione uma imagem válida.");
            return;
        }

        setIsUpdatingAvatar(true);
        
        try {
            // Compress image (Avatars are usually small, 1024x1024 is more than enough)
            const compressedFile = await compressImage(file, 1024, 1024, 0.9);

            const formData = new FormData();
            formData.append('file', compressedFile, 'avatar.jpg');

            // 1. Upload to storage
            const uploadRes = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const newAvatarUrl = uploadRes.data.url;

            // 2. Update user profile
            await api.patch('/users/me', { avatarUrl: newAvatarUrl });

            // 3. Update local state
            setUserAvatar(newAvatarUrl);
            toast.success("Foto de perfil atualizada!");
        } catch (error) {
            console.error("Error updating avatar:", error);
            toast.error("Erro ao atualizar foto de perfil.");
        } finally {
            setIsUpdatingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="h-[100dvh] w-full bg-background text-foreground flex overflow-hidden">
            {/* Sidebar Desktop - V2 Minimalist with Buttery Smooth Animation */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarOpen ? 240 : 72 }}
                transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
                className="hidden md:flex flex-col border-r border-slate-200/80 bg-white h-full shrink-0 z-40 select-none overflow-hidden"
            >
                {/* Brand Header - Clean centered star icon, no text */}
                <div className="h-16 flex items-center px-4 border-b border-slate-100 shrink-0">
                    <Link to="/" className="flex items-center justify-center w-10 h-10 focus:outline-none">
                        <img src={logo} alt="Brilha Mais" className="h-8 w-8 object-contain" />
                    </Link>
                </div>

                {/* Nav items */}
                <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto no-scrollbar">
                    {menuItems.map((item: any) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={`sidebar-link-${item.path}`}
                                to={item.path}
                                title={!isSidebarOpen ? item.label : undefined}
                                className={`
                                    flex items-center h-10 w-full px-3 rounded-lg group transition-colors duration-150 overflow-hidden
                                    ${isActive
                                        ? 'bg-slate-100 text-slate-900 font-semibold'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal'}
                                `}
                            >
                                <div className={`w-6 h-6 flex items-center justify-center shrink-0 transition-colors ${isActive ? 'text-amber-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                    {item.icon}
                                </div>
                                <AnimatePresence initial={false}>
                                    {isSidebarOpen && (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.1 }}
                                            className="overflow-hidden whitespace-nowrap text-sm leading-none ml-2.5 font-medium"
                                        >
                                            {item.label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </Link>
                        );
                    })}

                    {visibleAdminItems.length > 0 && (
                        <div className="pt-2 space-y-1">
                            {/* Constant height divider/header container - Prevents vertical layout shift */}
                            <div className="h-6 flex items-center px-3 my-1 overflow-hidden">
                                <AnimatePresence mode="wait" initial={false}>
                                    {isSidebarOpen ? (
                                        <motion.span
                                            key="label-gestao"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.1 }}
                                            className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap select-none"
                                        >
                                            Gestão
                                        </motion.span>
                                    ) : (
                                        <motion.div
                                            key="divider-gestao"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.1 }}
                                            className="w-full border-t border-slate-200/70"
                                        />
                                    )}
                                </AnimatePresence>
                            </div>
                            {visibleAdminItems.map((item: any) => {
                                const isActive = location.pathname === item.path;
                                return (
                                    <Link
                                        key={`sidebar-admin-link-${item.path}`}
                                        to={item.path}
                                        title={!isSidebarOpen ? item.label : undefined}
                                        className={`
                                            flex items-center h-10 w-full px-3 rounded-lg group transition-colors duration-150 overflow-hidden
                                            ${isActive
                                                ? 'bg-slate-100 text-slate-900 font-semibold'
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal'}
                                        `}
                                    >
                                        <div className={`w-6 h-6 flex items-center justify-center shrink-0 transition-colors ${isActive ? 'text-amber-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                            {item.icon}
                                        </div>
                                        <AnimatePresence initial={false}>
                                            {isSidebarOpen && (
                                                <motion.span
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.1 }}
                                                    className="overflow-hidden whitespace-nowrap text-sm leading-none ml-2.5 font-medium"
                                                >
                                                    {item.label}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </nav>

                {/* Footer Utility Actions */}
                <div className="p-3 border-t border-slate-100 mt-auto space-y-1 shrink-0">
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        title={!isSidebarOpen ? 'Biometria' : undefined}
                        className="flex items-center h-10 w-full px-3 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-900 group transition-colors duration-150 overflow-hidden"
                    >
                        <div className="w-6 h-6 flex items-center justify-center shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors">
                            <LucideFingerprint className="h-5 w-5" />
                        </div>
                        <AnimatePresence initial={false}>
                            {isSidebarOpen && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.1 }}
                                    className="overflow-hidden whitespace-nowrap text-sm leading-none ml-2.5 font-normal"
                                >
                                    Biometria
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                    <button
                        onClick={handleLogout}
                        title={!isSidebarOpen ? 'Sair' : undefined}
                        className="flex items-center h-10 w-full px-3 rounded-lg hover:bg-red-50/70 text-slate-500 hover:text-red-600 group transition-colors duration-150 overflow-hidden"
                    >
                        <div className="w-6 h-6 flex items-center justify-center shrink-0 text-slate-400 group-hover:text-red-600 transition-colors">
                            <LucideLogOut className="h-5 w-5" />
                        </div>
                        <AnimatePresence initial={false}>
                            {isSidebarOpen && (
                                <motion.span
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.1 }}
                                    className="overflow-hidden whitespace-nowrap text-sm leading-none ml-2.5 font-normal"
                                >
                                    Sair
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                </div>
            </motion.aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
                {/* Header Desktop & Mobile - V2 Minimalist */}
                <header className="h-16 border-b border-slate-200/80 bg-white z-30 px-4 md:px-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Desktop toggle */}
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                            aria-label="Alternar menu lateral"
                            className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors active:scale-95"
                        >
                            <LucideMenu className="h-4.5 w-4.5" />
                        </button>

                        {/* Breadcrumb / Section Context */}
                        {currentPageTitle && (
                            <div className="hidden md:flex items-center gap-2 text-sm">
                                <span className="text-slate-300">/</span>
                                <span className="font-semibold text-slate-800">
                                    {currentPageTitle}
                                </span>
                            </div>
                        )}

                        {/* Mobile logo */}
                        <Link to="/" className="md:hidden">
                            <img src={logo} alt="Brilha Mais" className="h-8 w-auto object-contain" />
                        </Link>
                    </div>

                    <div className="flex items-center gap-3 md:gap-5">
                        {/* Hidden File Input */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            accept="image/*;capture=camera" 
                        />

                        {/* Desktop Profile Trigger - Clean, non-redundant compact pill */}
                        <div className="relative hidden md:block" ref={profileMenuRef}>
                            <button 
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsProfileMenuOpen((prev) => !prev);
                                }}
                                aria-expanded={isProfileMenuOpen}
                                aria-haspopup="true"
                                className={`
                                    flex items-center gap-2 pl-1.5 pr-2.5 h-9 rounded-full border transition-colors duration-150 select-none
                                    outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 active:outline-none ring-0
                                    ${isProfileMenuOpen 
                                        ? 'bg-slate-100 border-slate-300 shadow-sm' 
                                        : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs'}
                                `}
                                style={{ outline: 'none' }}
                            >
                                <div className="h-6 w-6 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 font-medium text-slate-600 text-xs">
                                    {isLoadingUserData ? (
                                        <div className="h-full w-full bg-slate-200 animate-pulse" />
                                    ) : userAvatar ? (
                                        <img 
                                            src={userAvatar.startsWith('http') ? userAvatar : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${userAvatar}`} 
                                            alt={userName} 
                                            className="h-full w-full object-cover" 
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).parentElement!.innerText = userName ? userName.charAt(0) : '';
                                            }}
                                        />
                                    ) : (
                                        <span>{userName ? userName.charAt(0) : 'U'}</span>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-sm font-medium text-slate-800 leading-none">
                                        {userName ? userName.split(' ')[0] : 'Conta'}
                                    </span>
                                    <LucideChevronDown className={`h-3.5 w-3.5 text-slate-400 shrink-0 -translate-y-[0.5px] transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180 text-slate-700' : ''}`} />
                                </div>
                            </button>

                            {/* Dropdown Menu - V2 Premium Account Popover */}
                            <AnimatePresence>
                                {isProfileMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                                        transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                                        className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-900/10 p-2 z-50 overflow-hidden"
                                    >
                                        {/* Full User Identity Card */}
                                        <div className="p-3 mb-1.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                                                {userAvatar ? (
                                                    <img 
                                                        src={userAvatar.startsWith('http') ? userAvatar : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${userAvatar}`} 
                                                        alt={userName} 
                                                        className="h-full w-full object-cover" 
                                                    />
                                                ) : (
                                                    <span className="font-semibold text-slate-600 text-sm">
                                                        {userName ? userName.charAt(0) : 'U'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 truncate leading-snug">
                                                    {userName || 'Usuário'}
                                                </p>
                                                {userEmail && (
                                                    <p className="text-xs text-slate-500 truncate leading-snug mt-0.5">
                                                        {userEmail}
                                                    </p>
                                                )}
                                                <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/60">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                    <span className="text-[10px] font-medium text-amber-800">
                                                        {userRole === 'super_admin' ? 'Super Admin' : userRole === 'admin' ? 'Administrador' : userRole === 'instructor' ? 'Instrutor' : 'Aluno'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Rows */}
                                        <div className="space-y-0.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsProfileMenuOpen(false);
                                                    handleAvatarClick();
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 transition-all text-left group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-white border border-slate-200/60 flex items-center justify-center text-slate-500 group-hover:text-slate-700 transition-colors shrink-0 shadow-xs">
                                                    <LucideCamera className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="leading-tight text-xs font-semibold text-slate-800">Alterar foto</p>
                                                    <p className="text-[11px] text-slate-400 font-normal leading-tight mt-0.5">Atualize sua foto de perfil</p>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsProfileMenuOpen(false);
                                                    setIsSettingsOpen(true);
                                                }}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 transition-all text-left group"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-white border border-slate-200/60 flex items-center justify-center text-slate-500 group-hover:text-slate-700 transition-colors shrink-0 shadow-xs">
                                                    <LucideFingerprint className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="leading-tight text-xs font-semibold text-slate-800">Biometria & Segurança</p>
                                                    <p className="text-[11px] text-slate-400 font-normal leading-tight mt-0.5">Passkeys / Touch ID / Face ID</p>
                                                </div>
                                            </button>
                                        </div>

                                        <div className="my-1.5 border-t border-slate-100" />

                                        {/* Logout Button */}
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50/70 transition-all text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-red-50 group-hover:bg-red-100/80 border border-red-100 flex items-center justify-center text-red-500 shrink-0 transition-colors">
                                                <LucideLogOut className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="leading-tight text-xs font-semibold text-red-600">Sair da conta</p>
                                                <p className="text-[11px] text-red-400 font-normal leading-tight mt-0.5">Encerrar sessão ativa</p>
                                            </div>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Mobile Menu Toggle Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Abrir menu"
                            className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                            <LucideMenu className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                {/* Scrollable Page Content */}
                <main ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar">
                    {location.pathname.startsWith('/course/') ? (
                        <div className="w-full">
                            <Outlet />
                        </div>
                    ) : (
                        <div className="px-5 py-6 md:p-10 max-w-7xl mx-auto w-full pb-32 md:pb-10">
                            <Outlet />
                        </div>
                    )}
                </main>

                {/* Mobile Side Menu (Drawer) - V2 Minimalist */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[110] md:hidden"
                            />
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: "spring", damping: 28, stiffness: 280 }}
                                className="fixed top-0 right-0 h-full w-[310px] max-w-[85vw] bg-[#FAFAF9] z-[120] md:hidden shadow-2xl flex flex-col border-l border-slate-200/80"
                            >
                                {/* Header */}
                                <div className="p-5 border-b border-slate-200/70 flex items-center justify-between bg-white">
                                    <span className="text-base font-semibold text-slate-900">Menu</span>
                                    <button
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        aria-label="Fechar menu"
                                        className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
                                    >
                                        <LucideX className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="flex-1 px-5 py-6 space-y-6 overflow-y-auto no-scrollbar">
                                    {visibleAdminItems.length > 0 && (
                                        <div className="space-y-3">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
                                                Gestão
                                            </p>
                                            <div className="grid grid-cols-1 gap-2">
                                                {visibleAdminItems.map((item: any) => (
                                                    <Link
                                                        key={`mobile-admin-link-${item.path}`}
                                                        to={item.path}
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                        className={`
                                                            flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80 transition-all duration-150 group shadow-sm
                                                            ${location.pathname === item.path ? 'border-amber-300 bg-amber-50/50 text-amber-900' : 'text-slate-700'}
                                                        `}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-200/50 flex items-center justify-center text-amber-600 shrink-0">
                                                                {item.icon}
                                                            </div>
                                                            <span className="text-sm font-medium text-slate-800 group-hover:text-slate-950">
                                                                {item.label}
                                                            </span>
                                                        </div>
                                                        <LucideArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
                                            Configurações
                                        </p>
                                        <div className="grid grid-cols-1 gap-2">
                                            {userRole === 'student' && (
                                                <Link
                                                    to="/scan"
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50/80 text-slate-800 text-sm font-medium transition-all shadow-sm"
                                                >
                                                    <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                                                        <LucideQrCode className="h-4 w-4" />
                                                    </div>
                                                    <span>Marcar Presença</span>
                                                </Link>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setIsMobileMenuOpen(false);
                                                    setIsSettingsOpen(true);
                                                }}
                                                className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50/80 text-slate-800 text-sm font-medium transition-all shadow-sm w-full text-left"
                                            >
                                                <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                                                    <LucideFingerprint className="h-4 w-4" />
                                                </div>
                                                <span>Configurar Biometria</span>
                                            </button>
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-white border border-slate-200/80 hover:bg-red-50/50 hover:border-red-200 text-red-600 text-sm font-medium transition-all shadow-sm w-full text-left"
                                            >
                                                <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                                                    <LucideLogOut className="h-4 w-4" />
                                                </div>
                                                <span>Sair da Conta</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer User Profile */}
                                <div className="p-4 border-t border-slate-200/70 bg-white">
                                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FAFAF9] border border-slate-200/70">
                                        {isLoadingUserData ? (
                                            <>
                                                <div className="h-10 w-10 bg-slate-200 animate-pulse rounded-full" />
                                                <div className="flex-1 space-y-1.5">
                                                    <div className="h-3.5 w-24 bg-slate-200 animate-pulse rounded-full" />
                                                    <div className="h-2.5 w-16 bg-slate-100 animate-pulse rounded-full" />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <button 
                                                    onClick={handleAvatarClick}
                                                    disabled={isUpdatingAvatar}
                                                    className="h-10 w-10 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden font-medium text-slate-600 text-sm shrink-0 relative group/avatar-mobile shadow-sm"
                                                >
                                                    {userAvatar ? (
                                                        <img 
                                                            src={userAvatar} 
                                                            alt={userName}
                                                            className={`h-full w-full object-cover transition-all ${isUpdatingAvatar ? 'opacity-30' : ''}`}
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                (e.target as HTMLImageElement).parentElement!.innerText = userName ? userName.charAt(0) : '';
                                                            }}
                                                        />
                                                    ) : (
                                                        userName.charAt(0) || 'U'
                                                    )}
                                                    {isUpdatingAvatar && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                                                            <LucideLoader2 className="h-4 w-4 text-amber-600 animate-spin" />
                                                        </div>
                                                    )}
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 truncate leading-snug">
                                                        {userName || 'Usuário'}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                        <p className="text-xs text-amber-700 font-medium">
                                                            {userRole === 'super_admin' ? 'Super Admin' : userRole === 'admin' ? 'Administrador' : userRole === 'instructor' ? 'Instrutor' : 'Aluno'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-5 left-5 right-5 z-[100]" style={{ isolation: 'isolate' }}>
                <LayoutGroup id="mobile-pill">
                    <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl shadow-slate-950/20 px-2 py-1.5 max-w-sm mx-auto flex items-center justify-between relative overflow-hidden">
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={`mobile-nav-${item.path}`}
                                    to={item.path}
                                    className={`
                                        relative flex items-center justify-center py-3 rounded-xl flex-1 z-10
                                        ${isActive ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'}
                                    `}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="mobileActiveTab"
                                            layout="position"
                                            className="absolute inset-x-1 inset-y-1 bg-white/10 rounded-xl"
                                            transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                        />
                                    )}
                                    <div className="relative z-10">
                                        {item.icon}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </LayoutGroup>
            </nav>

            <WelcomeVideoModal
                isOpen={isWelcomeVideoOpen}
                onClose={handleCloseWelcomeVideo}
            />

            <LocationPickerModal
                isOpen={isLocationPickerOpen}
                onLocationSelected={(_locationId) => {
                    setIsLocationPickerOpen(false);
                }}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
}
export default AppLayout;
