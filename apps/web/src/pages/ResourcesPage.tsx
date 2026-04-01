import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LucidePlay, LucideVideo, LucideX } from "lucide-react";
import api from "../utils/api";

const RESOURCES = [
    {
        id: "welcome",
        title: "Boas-vindas",
        description: "Assista ao vídeo de Boas-Vindas.",
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
        <div className="space-y-10 w-full min-h-screen">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-[28px] md:text-5xl font-black tracking-tighter text-slate-900 uppercase italic leading-none">Recursos</h1>
                <p className="text-slate-400 text-xs md:text-lg font-bold uppercase tracking-[0.2em] italic">Biblioteca de conteúdos e tutoriais.</p>
            </div>

            {/* Grid for 9:16 Vertical Content */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {isLoading ? (
                    // Skeleton Loading
                    [...Array(4)].map((_, i) => (
                        <div key={i} className="flex flex-col gap-4 animate-pulse">
                            <div className="aspect-[9/16] rounded-[2rem] bg-slate-100 border-4 border-white shadow-sm" />
                            <div className="px-2 space-y-2">
                                <div className="h-4 bg-slate-100 rounded-md w-3/4" />
                                <div className="h-3 bg-slate-50 rounded-md w-1/2" />
                            </div>
                        </div>
                    ))
                ) : (
                    visibleResources.map((item) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -8 }}
                            className="flex flex-col gap-4 group cursor-pointer relative z-0"
                            onClick={() => handleSelectVideo(item.videoSrc!)}
                        >
                            <div className="relative aspect-[9/16] rounded-[2rem] overflow-hidden bg-slate-100 shadow-md border-4 border-white group-hover:border-primary transition-[border-color,transform] duration-500 shadow-slate-200/30">
                                <div className="absolute inset-0 bg-slate-100" />
                                <video
                                    src={item.videoSrc}
                                    className="absolute inset-0 w-full h-full object-contain scale-[1.1] z-10 pointer-events-none"
                                    muted
                                    playsInline
                                />

                                {/* Play Overlay */}
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px] pointer-events-none">
                                    <div className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-500">
                                        <LucidePlay className="h-6 w-6 fill-current ml-1" />
                                    </div>
                                </div>

                                <div className="absolute top-4 left-4 z-30 pointer-events-none">
                                    <span className="bg-primary text-white px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg">
                                        {item.badge}
                                    </span>
                                </div>
                            </div>

                            <div className="px-2">
                                <h3 className="text-sm md:text-base font-black uppercase italic tracking-tighter text-slate-900 group-hover:text-primary transition-colors">{item.title}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">{item.description}</p>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Immersive Video Modal */}
            {isMounted && createPortal(
                <AnimatePresence>
                    {selectedVideo && (
                        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
                            {/* Dark Background + Blur */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/80 backdrop-blur-lg"
                                onClick={handleClose}
                            />

                            {/* Video Container */}
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                                className="relative z-[10001] w-full max-w-sm h-[90dvh] max-h-[700px] aspect-[9/16] bg-black rounded-[2.5rem] overflow-hidden border-[6px] border-white/20 shadow-[0_40px_100px_rgba(0,0,0,0.8)] mx-4"
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
                                    className="absolute top-5 right-5 z-50 w-11 h-11 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors active:scale-90"
                                >
                                    <LucideX className="h-5 w-5 stroke-[3]" />
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
