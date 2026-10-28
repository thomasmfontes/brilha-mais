import React, { useState, useRef } from "react";
import { PortalModal } from "./PortalModal";
import { Trophy, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WelcomeVideoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

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
            <div className="bg-white rounded-2xl shadow-2xl relative max-w-sm w-full border border-zinc-200/80 p-6 sm:p-7 flex flex-col items-center text-center overflow-hidden">
                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-medium mb-3 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F19B0A]" />
                    <span>Boas-vindas</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 mb-1">
                    Prepare-se para Brilhar Mais!
                </h2>
                <p className="text-xs text-zinc-500 mb-5">
                    Assista a esta mensagem especial para iniciar sua jornada.
                </p>

                {/* Video Container */}
                <div className="relative w-full mb-6">
                    <div
                        onClick={hasStarted ? togglePlay : handleStart}
                        style={{ height: '48dvh', maxHeight: '460px', aspectRatio: '9/16' }}
                        className="rounded-xl overflow-hidden bg-black border border-zinc-200/80 shadow-sm relative mx-auto cursor-pointer group"
                    >
                        <video
                            ref={videoRef}
                            src={VIDEO_SRC}
                            className={`absolute inset-0 w-full h-full object-contain z-10 transition-opacity duration-500 ${hasStarted ? 'opacity-100' : 'opacity-40'}`}
                            playsInline
                            preload="auto"
                            disablePictureInPicture
                            disableRemotePlayback
                            onContextMenu={(e) => e.preventDefault()}
                            onEnded={handleVideoEnd}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                        />

                        {/* Playback Feedback Overlay */}
                        <div className="absolute inset-0 bg-transparent flex items-center justify-center z-20">
                            <AnimatePresence mode="wait">
                                {!hasStarted ? (
                                    <motion.div
                                        key="initial-play"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 1.2, opacity: 0 }}
                                        className="w-16 h-16 bg-[#F19B0A] hover:bg-[#D98B08] text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
                                    >
                                        <Play className="h-8 w-8 ml-1 fill-current" />
                                    </motion.div>
                                ) : !isPlaying && (
                                    <motion.div
                                        key="pause-play"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 1.2, opacity: 0 }}
                                        className="w-14 h-14 bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-xs shadow-md"
                                    >
                                        <Play className="h-6 w-6 ml-1 fill-current" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="w-full min-h-[44px] flex items-center justify-center">
                    <AnimatePresence mode="wait">
                        {videoEnded ? (
                            <motion.button
                                key="start-button"
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                onClick={onClose}
                                className="w-full bg-[#F19B0A] hover:bg-[#D98B08] text-white py-3 px-5 rounded-xl font-semibold text-sm shadow-2xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                            >
                                <Trophy className="h-4 w-4" />
                                <span>Começar Jornada</span>
                            </motion.button>
                        ) : (
                            <motion.div
                                key="waiting-msg"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center gap-2"
                            >
                                <div className="flex gap-1.5">
                                    {[0, 1, 2].map((i) => (
                                        <motion.div
                                            key={i}
                                            animate={{
                                                scale: [1, 1.4, 1],
                                                opacity: [0.3, 1, 0.3]
                                            }}
                                            transition={{
                                                repeat: Infinity,
                                                duration: 1.2,
                                                delay: i * 0.2
                                            }}
                                            className="w-1.5 h-1.5 bg-[#F19B0A] rounded-full"
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-zinc-400 font-medium">
                                    Assista ao vídeo para liberar o acesso ao portal
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </PortalModal>
    );
}
