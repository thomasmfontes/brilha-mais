import React, { useState, useRef } from "react";
import { PortalModal } from "./PortalModal";
import { LucideTrophy, LucidePlay } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WelcomeVideoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Thomas, coloque o seu arquivo de vídeo na pasta 'apps/web/public' 
// e renomeie ele para 'welcome-video.mp4'
const VIDEO_SRC = "/brilha-mais-welcome.mp4";

export function WelcomeVideoModal({ isOpen, onClose }: WelcomeVideoModalProps) {
    const [videoEnded, setVideoEnded] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleStart = () => {
        if (!videoRef.current) return;
        videoRef.current.play().then(() => {
            setHasStarted(true);
            setIsPlaying(true);
        }).catch(err => {
            console.error("Erro ao iniciar vídeo:", err);
        });
    };

    const togglePlay = () => {
        if (!videoRef.current) return;

        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
        } else {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    const handleVideoEnd = () => {
        setVideoEnded(true);
    };

    return (
        <PortalModal isOpen={isOpen} onClose={onClose} preventCloseOnOverlayClick={true}>
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] md:shadow-[0_48px_96px_-24px_rgba(0,0,0,0.3)] relative max-w-[90vw] md:max-w-sm w-full border border-slate-100 overflow-hidden max-h-[96dvh] flex flex-col"
            >
                {/* Brand Background Pattern */}
                <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none" />

                {/* Decorative Elements */}
                <div className="absolute top-8 right-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute top-20 -left-4 w-16 h-16 bg-primary/5 rounded-full blur-xl pointer-events-none" />

                <div className="p-7 md:p-10 flex flex-col items-center text-center relative z-10 w-full h-full">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center gap-2 mb-4"
                    >
                        <div className="h-4 w-1 bg-primary rounded-full shadow-[0_0_12px_rgba(var(--primary-rgb),0.5)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary italic">Boas-vindas</span>
                    </motion.div>

                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-[0.9] mb-8 italic">
                        Prepare-se para<br />
                        <span className="text-primary drop-shadow-sm">Brilhar Mais!</span>
                    </h2>

                    {/* Video Container - Premium Frame */}
                    <div className="relative w-full group mb-8 shrink min-h-0">
                        <div
                            onClick={hasStarted ? togglePlay : handleStart}
                            style={{ height: '52dvh', maxHeight: '520px', aspectRatio: '9/16' }}
                            className="rounded-[2rem] overflow-hidden bg-slate-900 border-[6px] border-white shadow-2xl relative mx-auto transition-transform duration-500 group-hover:scale-[1.01] cursor-pointer"
                        >
                            <video
                                ref={videoRef}
                                src={VIDEO_SRC}
                                className={`absolute inset-0 w-full h-full object-contain z-10 transition-opacity duration-700 ${hasStarted ? 'opacity-100' : 'opacity-40'}`}
                                playsInline
                                disablePictureInPicture
                                disableRemotePlayback
                                onContextMenu={(e) => e.preventDefault()}
                                onEnded={handleVideoEnd}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                            />

                            {/* Playback Feedback Overlay */}
                            <div className="absolute inset-0 bg-transparent flex items-center justify-center group/player">
                                <AnimatePresence mode="wait">
                                    {!hasStarted ? (
                                        <motion.div
                                            key="initial-play"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 1.2, opacity: 0 }}
                                            className="flex flex-col items-center gap-4"
                                        >
                                            <div className="w-20 h-20 bg-primary text-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(var(--primary-rgb),0.5)] backdrop-blur-sm relative overflow-hidden group/btn">
                                                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                                                <LucidePlay className="h-10 w-10 ml-1 fill-current" />
                                            </div>
                                        </motion.div>
                                    ) : !isPlaying && (
                                        <motion.div
                                            key="pause-play"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 1.2, opacity: 0 }}
                                            className="w-16 h-16 bg-primary/90 text-white rounded-full flex items-center justify-center shadow-2xl backdrop-blur-sm"
                                        >
                                            <LucidePlay className="h-8 w-8 ml-1 fill-current" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Overlay reflect effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                        </div>

                        {/* Shadow decoration */}
                        <div className="absolute -inset-4 bg-primary/10 rounded-[2.5rem] blur-xl -z-10 opacity-40" />
                    </div>

                    <div className="w-full shrink-0 min-h-[40px] flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            {videoEnded ? (
                                <motion.button
                                    key="start-button"
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onClose}
                                    className="w-full bg-primary text-white py-4 md:py-5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-[0.15em] shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 group relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                    <LucideTrophy className="h-4 w-4 md:h-5 md:w-5 group-hover:rotate-12 transition-transform drop-shadow-md" />
                                    <span className="relative">Começar Jornada</span>
                                </motion.button>
                            ) : (
                                <motion.div
                                    key="waiting-msg"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center gap-3"
                                >
                                    <div className="flex gap-2">
                                        {[0, 1, 2].map((i) => (
                                            <motion.div
                                                key={i}
                                                animate={{
                                                    scale: [1, 1.5, 1],
                                                    opacity: [0.3, 1, 0.3]
                                                }}
                                                transition={{
                                                    repeat: Infinity,
                                                    duration: 1.5,
                                                    delay: i * 0.2
                                                }}
                                                className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]"
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] italic">
                                        Assista para liberar o portal
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </PortalModal>
    );
}
