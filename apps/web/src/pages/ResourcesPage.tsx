import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LucidePlay, LucideVideo, LucideX } from "lucide-react";
import api from "../utils/api";
import Skeleton from "../components/Skeleton";

const RESOURCES = [
    {
        id: "welcome",
        title: "Boas-vindas",
        description: "Assista ao vídeo de boas-vindas.",
        videoSrc: "/brilha-mais-welcome.mp4",
        type: "video",
        badge: "Essencial"
    }
];

export default function ResourcesPage() {
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [userRole, setUserRole] = useState<string>('student');
    const [userTurmas, setUserTurmas] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsMounted(true);
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            const { data } = await api.get('/users/me');
            setUserRole(data.role?.toLowerCase() || 'student');
            setUserTurmas(data.turmas || []);
        } catch (error) {
            console.error("Error fetching user profile:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const visibleResources = useMemo(() => {
        return RESOURCES.filter(item => {
            if (item.id === 'welcome') {
                const isStudent = userRole === 'student' || userRole === 'user';
                const hasTurma = userTurmas.length > 0;
                if (isStudent) {
                    return hasTurma;
                }
                return true;
            }
            return true;
        });
    }, [userRole, userTurmas]);

    const handleSelectVideo = (src: string) => {
        setSelectedVideo(src);
    };

    const handleClose = () => {
        setSelectedVideo(null);
    };

    return (
        <div className="space-y-8 w-full min-h-screen">
            {/* Header V2 Minimalist */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                        Recursos
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Biblioteca de conteúdos, tutoriais e orientações.
                    </p>
                </div>
            </div>

            {/* Grid for 9:16 Vertical Content */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                {isLoading ? (
                    // Skeleton Loading
                    [...Array(4)].map((_, i) => (
                        <div key={i} className="flex flex-col gap-3">
                            <Skeleton className="aspect-[9/16] w-full rounded-2xl" variant="rounded" />
                            <div className="space-y-1.5 px-0.5">
                                <Skeleton className="h-4 w-3/4 rounded-md" variant="rectangle" />
                                <Skeleton className="h-3 w-1/2 rounded-md" variant="rectangle" />
                            </div>
                        </div>
                    ))
                ) : visibleResources.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                            <LucideVideo className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">Nenhum recurso disponível</h3>
                        <p className="text-sm text-slate-500 mt-1 max-w-sm">
                            Novos tutoriais e vídeos informativos serão disponibilizados em breve.
                        </p>
                    </div>
                ) : (
                    visibleResources.map((item) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col gap-3 group cursor-pointer"
                            onClick={() => handleSelectVideo(item.videoSrc!)}
                        >
                            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-sm group-hover:shadow-md transition-all duration-300">
                                <video
                                    src={item.videoSrc}
                                    className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
                                    muted
                                    playsInline
                                />

                                {/* Subtle gradient vignette */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none z-10" />

                                {/* Play Overlay */}
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 backdrop-blur-[1px] pointer-events-none">
                                    <div className="w-12 h-12 bg-white text-slate-900 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
                                        <LucidePlay className="h-5 w-5 fill-current text-slate-900 ml-0.5" />
                                    </div>
                                </div>

                                {/* Badge */}
                                {item.badge && (
                                    <div className="absolute top-3 left-3 z-20 pointer-events-none">
                                        <span className="bg-amber-500 text-white px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide shadow-sm">
                                            {item.badge}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="px-0.5">
                                <h3 className="text-sm font-semibold text-slate-900 group-hover:text-amber-600 transition-colors leading-snug">
                                    {item.title}
                                </h3>
                                <p className="text-xs text-slate-500 font-normal mt-0.5 line-clamp-2">
                                    {item.description}
                                </p>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Immersive Video Modal */}
            {isMounted && createPortal(
                <AnimatePresence>
                    {selectedVideo && (
                        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                            {/* Dark Background + Subtle Blur */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                                onClick={handleClose}
                            />

                            {/* Video Container */}
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 16 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 16 }}
                                transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                                className="relative z-[10001] w-full max-w-sm h-[85vh] max-h-[720px] aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
                            >
                                <video
                                    src={selectedVideo}
                                    className="w-full h-full object-cover"
                                    controls
                                    autoPlay
                                    playsInline
                                />

                                <button
                                    onClick={handleClose}
                                    aria-label="Fechar"
                                    className="absolute top-4 right-4 z-50 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors"
                                >
                                    <LucideX className="h-4 w-4" />
                                </button>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
