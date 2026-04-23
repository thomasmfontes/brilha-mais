import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { compressImage } from "@/utils/image";
import {
    LucideLayoutDashboard,
    LucidePlayCircle,
    LucideGraduationCap,
    LucideSearch,
    LucideLogOut,
    LucideMenu,
    LucideSettings2,
    LucideMonitorPlay,
    LucideBookOpen,
    LucideArrowRight,
    LucideCheckCircle,
    LucideCamera,
    LucideLoader2
} from "lucide-react";
import { jwtDecode } from "jwt-decode";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import logo from "../assets/logo.png";
import icon from "../assets/icon.png";
import { WelcomeVideoModal } from "../components/WelcomeVideoModal";
import { LocationPickerModal } from "../components/LocationPickerModal";
import api from "../utils/api";
import { toast } from "react-hot-toast";

const menuItems = [
    { icon: <LucideLayoutDashboard className="h-5 w-5" />, label: "Dashboard", path: "/dashboard" },
    { icon: <LucidePlayCircle className="h-5 w-5" />, label: "Meus Cursos", path: "/my-courses" },
    { icon: <LucideSearch className="h-5 w-5" />, label: "Explorar", path: "/explore" },
    { icon: <LucideGraduationCap className="h-5 w-5" />, label: "Certificados", path: "/certificates" },
    { icon: <LucideBookOpen className="h-5 w-5" />, label: "Recursos", path: "/resources" },
];

const adminItems = [
    { icon: <LucideMonitorPlay className="h-5 w-5" />, label: "Instrutor", path: "/instructor", roles: ['instructor', 'admin', 'super_admin'] },
    { icon: <LucideCheckCircle className="h-5 w-5" />, label: "Correções", path: "/instructor/submissions", roles: ['instructor', 'admin', 'super_admin'] },
    { icon: <LucideSettings2 className="h-5 w-5" />, label: "Administração", path: "/admin", roles: ['admin', 'super_admin'] },
];

export function AppLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
    const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
    const [isLoadingUserData, setIsLoadingUserData] = useState(() => {
        try {
            return !localStorage.getItem('auth_token');
        } catch (e) {
            return true;
        }
    });

    useEffect(() => {
        // Reset internal scroll on route change
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
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
            // 1. Compress image (Avatars are usually small, 512x512 is more than enough)
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
            {/* Sidebar */}
            <aside className={`
        ${isSidebarOpen ? 'w-64' : 'w-20'}
        hidden md:flex flex-col border-r border-slate-200 bg-white shadow-sm transition-[width] duration-300 h-full shrink-0 z-40
      `}>
                <div className="h-20 flex items-center px-6 mb-4">
                    <div className="flex items-center gap-3">
                        {isSidebarOpen ? (
                            <img src={logo} alt="Brilha Mais" className="h-10 w-auto" />
                        ) : (
                            <img src={logo} alt="B" className="h-10 w-10 object-contain transition-all" />
                        )}
                    </div>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto no-scrollbar">
                    <p className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-4">{isSidebarOpen ? 'Menu Aluno' : '---'}</p>
                    {menuItems.map((item: any) => (
                        <Link
                            key={`sidebar-link-${item.path}`}
                            to={item.path}
                            className={`
                flex items-center transition-colors group rounded-xl
                ${isSidebarOpen ? 'gap-4 px-3 py-3' : 'justify-center p-3'}
                ${location.pathname === item.path
                                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/5'
                                    : 'hover:bg-slate-50 text-slate-500 hover:text-slate-900'}
              `}
                        >
                            <div className="shrink-0">{item.icon}</div>
                            {isSidebarOpen && <span className="text-sm font-semibold">{item.label}</span>}
                        </Link>
                    ))}

                    {visibleAdminItems.length > 0 && (
                        <div className="pt-8 space-y-2">
                            <p className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-4">{isSidebarOpen ? 'Gestão' : '---'}</p>
                            {visibleAdminItems.map((item: any) => (
                                <Link
                                    key={`sidebar-admin-link-${item.path}`}
                                    to={item.path}
                                    className={`
                      flex items-center transition-colors group rounded-xl
                      ${isSidebarOpen ? 'gap-4 px-3 py-3' : 'justify-center p-3'}
                      ${location.pathname === item.path
                                            ? 'bg-primary/10 text-primary border border-primary/20 font-black'
                                            : 'hover:bg-slate-50 text-slate-500 hover:text-slate-900'}
                    `}
                                >
                                    <div className="shrink-0">{item.icon}</div>
                                    {isSidebarOpen && <span className="text-sm font-semibold">{item.label}</span>}
                                </Link>
                            ))}
                        </div>
                    )}
                </nav>

                <div className="p-4 border-t mt-auto">
                    <button
                        onClick={handleLogout}
                        className={`
                            flex items-center transition-colors w-full rounded-xl hover:bg-destructive/10 text-destructive/80 hover:text-destructive
                            ${isSidebarOpen ? 'gap-4 px-3 py-3' : 'justify-center p-3'}
                        `}
                    >
                        <LucideLogOut className="h-5 w-5" />
                        {isSidebarOpen && <span className="text-sm font-semibold">Sair</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area (Internal Scroll) */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
                {/* Header (Sticky inside flexbox) */}
                <header className="h-14 md:h-16 border-b border-slate-200 bg-white z-30 px-4 md:px-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        {/* Desktop toggle */}
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:block">
                            <LucideMenu className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                        </button>

                        {/* Mobile logo (visible when sidebar is hidden) */}
                        <Link to="/" className="md:hidden">
                            <img src={logo} alt="Brilha Mais" className="h-9 w-auto object-contain" />
                        </Link>
                    </div>

                    <div className="flex items-center gap-4 md:gap-6">
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                {isLoadingUserData ? (
                                    <div className="space-y-1">
                                        <div className="h-3 w-24 bg-slate-100 animate-pulse rounded-full ml-auto" />
                                        <div className="h-2 w-16 bg-slate-50 animate-pulse rounded-full ml-auto" />
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-[11px] font-black uppercase tracking-tight text-slate-900 leading-tight">{userName || 'Usuário'}</p>
                                        <p className="text-[9px] text-primary uppercase font-black tracking-widest leading-tight">
                                            {userRole === 'super_admin' ? 'Super Admin' : userRole === 'admin' ? 'Administrador' : userRole === 'instructor' ? 'Instrutor' : 'Aluno'}
                                        </p>
                                    </>
                                )}
                            </div>
                            
                            {/* Hidden File Input */}
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                                accept="image/*;capture=camera" 
                            />

                            <button 
                                onClick={handleAvatarClick}
                                disabled={isUpdatingAvatar || isLoadingUserData}
                                className={`relative h-10 w-10 md:h-9 md:w-9 bg-slate-100 rounded-xl md:rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm uppercase font-black text-slate-400 text-xs shrink-0 group/avatar transition-all hover:border-primary/30 active:scale-95 ${isLoadingUserData ? 'animate-pulse' : ''}`}
                                title="Alterar foto de perfil"
                            >
                                {isLoadingUserData ? (
                                    <div className="h-full w-full bg-slate-200" />
                                ) : userAvatar ? (
                                    <img 
                                        src={userAvatar.startsWith('http') ? userAvatar : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${userAvatar}`} 
                                        alt={userName} 
                                        className={`h-full w-full object-cover transition-all ${isUpdatingAvatar ? 'opacity-30 blur-[2px]' : 'group-hover/avatar:scale-110 group-hover/avatar:opacity-40'}`} 
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            (e.target as HTMLImageElement).parentElement!.innerHTML = userName ? userName.charAt(0) : '';
                                        }}
                                    />
                                ) : (
                                    <span className={isUpdatingAvatar ? 'opacity-0' : ''}>
                                        {userName ? userName.charAt(0) : <LucideSettings2 className="h-4 w-4" />}
                                    </span>
                                )}

                                {/* Hover Overlay / Loading Indicator */}
                                <div className={`absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover/avatar:opacity-100 transition-opacity ${isUpdatingAvatar ? 'opacity-100' : ''}`}>
                                    {isUpdatingAvatar ? (
                                        <LucideLoader2 className="h-4 w-4 text-primary animate-spin" />
                                    ) : (
                                        <LucideCamera className="h-4 w-4 text-primary" />
                                    )}
                                </div>
                            </button>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-primary transition-colors"
                        >
                            <LucideMenu className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                {/* Scrolable Page Content */}
                <main ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar">
                    {location.pathname.startsWith('/course/') ? (
                        <div className="w-full">
                            <Outlet />
                        </div>
                    ) : (
                        <div className="px-6 py-6 md:p-10 max-w-7xl mx-auto w-full pb-32 md:pb-10">
                            <Outlet />
                        </div>
                    )}
                </main>

                {/* Mobile Side Menu (Drawer) */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[110] md:hidden"
                            />
                            <motion.div
                                initial={{ x: '100%', opacity: 0.5 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: '100%', opacity: 0.5 }}
                                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                                className="fixed top-0 right-0 h-full w-[320px] bg-white z-[120] md:hidden shadow-[-10px_0_30px_rgba(0,0,0,0.05)] flex flex-col"
                            >
                                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-1 bg-primary rounded-full" />
                                        <span className="text-base font-black uppercase tracking-[0.2em] text-slate-900 italic">Menu</span>
                                    </div>
                                    <button
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="h-11 w-11 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-400 shadow-sm active:scale-95 transition-colors"
                                    >
                                        <LucideMenu className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="flex-1 px-8 py-10 space-y-10 overflow-y-auto no-scrollbar">
                                    {visibleAdminItems.length > 0 && (
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 px-4">Gestão</p>
                                            <div className="grid grid-cols-1 gap-3">
                                                {visibleAdminItems.map((item: any) => (
                                                    <Link
                                                        key={`mobile-admin-link-${item.path}`}
                                                        to={item.path}
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                        className={`
                                                            flex items-center justify-between gap-4 px-5 py-5 rounded-[1.5rem] bg-amber-50/50 border border-amber-100 transition-all group active:scale-95
                                                            ${location.pathname === item.path ? 'ring-2 ring-primary ring-offset-2 shadow-md shadow-amber-200/50' : ''}
                                                        `}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="h-10 w-10 rounded-xl bg-white border border-amber-100 flex items-center justify-center text-amber-500 shadow-sm">
                                                                {item.icon}
                                                            </div>
                                                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-800">{item.label}</span>
                                                        </div>
                                                        <LucideArrowRight className="h-4 w-4 text-amber-200 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 px-4">Configurações</p>
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-4 px-6 py-5 rounded-[1.5rem] bg-red-50/50 text-red-500 border border-red-100 font-black uppercase tracking-widest text-[10px] w-full transition-colors active:scale-95 shadow-sm"
                                        >
                                            <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
                                                <LucideLogOut className="h-4 w-4" />
                                            </div>
                                            Sair da Conta
                                        </button>
                                    </div>
                                </div>

                                <div className="p-8 border-t border-slate-50 bg-slate-50/30">
                                    <div className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm">
                                        {isLoadingUserData ? (
                                            <>
                                                <div className="h-12 w-12 bg-slate-100 animate-pulse rounded-2xl" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-3 w-24 bg-slate-100 animate-pulse rounded-full" />
                                                    <div className="h-2 w-16 bg-slate-50 animate-pulse rounded-full" />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <button 
                                                    onClick={handleAvatarClick}
                                                    disabled={isUpdatingAvatar}
                                                    className="h-12 w-12 bg-slate-50 rounded-2xl border-2 border-slate-100 flex items-center justify-center overflow-hidden font-black text-slate-400 text-lg shadow-inner relative group/avatar-mobile"
                                                >
                                                    {userAvatar ? (
                                                        <img 
                                                            src={userAvatar} 
                                                            className={`h-full w-full object-cover transition-all ${isUpdatingAvatar ? 'opacity-30' : ''}`}
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                (e.target as HTMLImageElement).parentElement!.innerText = userName ? userName.charAt(0) : '';
                                                            }}
                                                        />
                                                    ) : (
                                                        userName.charAt(0)
                                                    )}
                                                    {isUpdatingAvatar && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                                                            <LucideLoader2 className="h-5 w-5 text-primary animate-spin" />
                                                        </div>
                                                    )}
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black uppercase tracking-tight text-slate-900 truncate leading-none mb-1">{userName || 'Usuário'}</p>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                                        <p className="text-[10px] text-primary font-black uppercase tracking-widest">{userRole === 'super_admin' ? 'Super Admin' : userRole}</p>
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

            {/* Mobile Bottom Nav - Floating Premium Pill */}
            <nav className="md:hidden fixed bottom-6 left-6 right-6 z-[100]" style={{ isolation: 'isolate' }}>
                <LayoutGroup id="mobile-pill">
                    <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-[2.5rem] shadow-xl shadow-slate-950/20 px-2 py-2 max-w-sm mx-auto flex items-center justify-between relative overflow-hidden">
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={`mobile-nav-${item.path}`}
                                    to={item.path}
                                    className={`
                                        relative flex items-center justify-center py-4 rounded-full flex-1 z-10
                                        ${isActive ? 'text-primary' : 'text-slate-400'}
                                    `}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="mobileActiveTab"
                                            layout="position"
                                            className="absolute inset-x-1 inset-y-1 bg-primary/10 rounded-[2rem] border border-primary/20"
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
        </div>
    );
}
