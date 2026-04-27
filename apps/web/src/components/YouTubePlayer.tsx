import { useEffect, useRef, useState, useCallback } from "react";
import {
    LucidePlay, LucidePause, LucideMaximize, LucideSettings,
    LucideVolume2, LucideVolume1, LucideVolumeX, LucideSkipBack,
    LucideSkipForward, LucideCheckCircle, LucideChevronDown, LucideMinimize, LucideMonitor
} from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady?: () => void;
    }
}

interface YouTubePlayerProps {
    videoId: string;
    onProgress?: (progress: { playedSeconds: number; played: number }) => void;
    onEnded?: () => void;
    initialSeconds?: number;
    isPrivileged?: boolean;
    isCompleted?: boolean;
    allowSeeking?: boolean;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
    videoId,
    onProgress,
    onEnded,
    initialSeconds = 0,
    isPrivileged = false,
    isCompleted = false,
    allowSeeking = true
}) => {
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [playerId, setPlayerId] = useState(() => `yt-player-${Math.random().toString(36).substr(2, 9)}`);
    const intervalRef = useRef<any>(null);
    const maxReachedRef = useRef(0);
    const hideTimerRef = useRef<any>(null);
    const prevIdRef = useRef<string>("");

    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(() => Number(localStorage.getItem("yt-player-volume") || "100"));
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [ended, setEnded] = useState(false);
    const [showSpeed, setShowSpeed] = useState(false);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [availableQualities, setAvailableQualities] = useState<string[]>([]);
    const [currentQuality, setCurrentQuality] = useState<string>("auto");
    const [showQuality, setShowQuality] = useState(false);
    const [qualityPreference, setQualityPreference] = useState<'sd' | 'hd'>('hd');
    const [startFromTime, setStartFromTime] = useState<number>(initialSeconds);

    const qualityLabels: Record<string, string> = {
        highres: "4K+",
        hd2160: "4K",
        hd1440: "2K",
        hd1080: "1080p HD",
        hd720: "720p HD",
        large: "480p",
        medium: "360p",
        small: "240p",
        tiny: "144p",
        auto: "Auto"
    };

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const resetHideTimer = useCallback(() => {
        setShowControls(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }, []);

    const onPlayerReady = (event: any) => {
        setDuration(event.target.getDuration());
        setIsLoading(false);
        event.target.setVolume(volume);
        
        const resumeTime = startFromTime || initialSeconds;
        if (resumeTime > 0) {
            event.target.seekTo(resumeTime, true);
        }
        
        // Auto-play if we are reloading for quality
        if (startFromTime > 0) {
            event.target.playVideo();
        }
        
        if (event.target.getAvailableQualityLevels) {
            const levels = event.target.getAvailableQualityLevels();
            setAvailableQualities(levels);
        }

        // Force preferred quality immediately
        const targetQ = qualityPreference === 'hd' ? 'hd1080' : 'medium';
        if (event.target.setPlaybackQuality) {
            event.target.setPlaybackQuality(targetQ);
        }

        if (event.target.getPlaybackQuality) {
            setCurrentQuality(event.target.getPlaybackQuality());
        }
    };

    const onPlayerStateChange = (event: any) => {
        // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
        // Any state change means the player is alive — clear loading
        setIsLoading(false);
        if (event.data === 1) {
            setIsPlaying(true);
            resetHideTimer();
            
            // Quality info usually populates better once playing
            if (event.target.getAvailableQualityLevels) {
                setAvailableQualities(event.target.getAvailableQualityLevels());
            }
            if (event.target.getPlaybackQuality) {
                setCurrentQuality(event.target.getPlaybackQuality());
            }
        } else if (event.data === 0) {
            setIsPlaying(false);
            setEnded(true);
            setCurrentTime(0); // Reset bar to 0 immediately
            playerRef.current?.seekTo(0, true);
            playerRef.current?.pauseVideo();
            onEnded?.();
        } else if (event.data === 2) {
            // Explicitly paused by user
            setIsPlaying(false);
            setShowControls(true);
        }
        // state 3 (buffering), -1 (unstarted), 5 (cued): don't touch isPlaying to avoid flicker
    };

    const onPlaybackQualityChange = (event: any) => {
        if (event.data) {
            setCurrentQuality(event.data);
            
            // Refresh qualities list just in case
            if (playerRef.current?.getAvailableQualityLevels) {
                setAvailableQualities(playerRef.current.getAvailableQualityLevels());
            }
        }
    };

    const attachPlayer = () => {
        if (window.YT && window.YT.Player) {
            if (playerRef.current) {
                try { playerRef.current.destroy(); } catch (e) { }
            }

            playerRef.current = new window.YT.Player(playerId, {
                events: {
                    onReady: onPlayerReady,
                    onStateChange: onPlayerStateChange,
                    onPlaybackQualityChange: onPlaybackQualityChange,
                },
            });
        }
    };

    useEffect(() => {
        setIsLoading(true);
        setIsPlaying(false);
        setEnded(false);
        
        // Only reset progress if the video itself changed
        const isNewVideo = prevIdRef.current !== videoId;
        if (isNewVideo) {
            setCurrentTime(0);
            maxReachedRef.current = 0;
            prevIdRef.current = videoId;
            setStartFromTime(initialSeconds);
            // Force a new unique ID for the new video
            setPlayerId(`yt-player-${Math.random().toString(36).substr(2, 9)}`);
        }

        let attachTimeout: any;
        if (!window.YT) {
            // API not loaded yet — inject script and register callback
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
            window.onYouTubeIframeAPIReady = attachPlayer;
        } else {
            // API already loaded — wait a bit longer so the iframe DOM is fully mounted with new ID
            attachTimeout = setTimeout(attachPlayer, 250);
        }

        // Hard fallback: if player never fires onReady/onStateChange, clear loading after 8s
        const fallback = setTimeout(() => setIsLoading(false), 8000);

        intervalRef.current = setInterval(() => {
            if (playerRef.current && playerRef.current.getCurrentTime) {
                const time = playerRef.current.getCurrentTime();
                const dur = playerRef.current.getDuration();
                
                if (dur > 0) {
                    setDuration(dur);
                    setCurrentTime(time);
                    if (time > maxReachedRef.current) maxReachedRef.current = time;
                    onProgress?.({ playedSeconds: time, played: time / dur });
                }
            }
        }, 500);

        return () => {
            if (attachTimeout) clearTimeout(attachTimeout);
            clearTimeout(fallback);
            clearInterval(intervalRef.current);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            if (playerRef.current?.destroy) {
                try { playerRef.current.destroy(); } catch (e) { }
            }
            playerRef.current = null;
        };
    }, [videoId, qualityPreference, playerId]);

    const togglePlay = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!playerRef.current) return;
        if (isPlaying) {
            playerRef.current.pauseVideo();
        } else {
            if (ended) setEnded(false);
            playerRef.current.playVideo();
        }
    };

    const handleSeekBar = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        if (!playerRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const targetTime = pct * duration;

        if (!canSeekFreely && targetTime > maxReachedRef.current + 1) {
            playerRef.current.seekTo(maxReachedRef.current, true);
            return;
        }

        playerRef.current.seekTo(targetTime, true);
        setCurrentTime(targetTime);
    };

    const handleSeekHover = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setHoverTime(pct * duration);
    };

    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = Number(e.target.value);
        setVolume(v);
        setIsMuted(v === 0);
        localStorage.setItem("yt-player-volume", String(v));
        playerRef.current?.setVolume(v);
        if (v > 0) playerRef.current?.unMute();
    };

    const toggleMute = () => {
        if (!playerRef.current) return;
        if (isMuted) {
            playerRef.current.unMute();
            playerRef.current.setVolume(volume || 100);
            setIsMuted(false);
        } else {
            playerRef.current.mute();
            setIsMuted(true);
        }
    };

    const changeSpeed = (rate: number) => {
        const max = isPrivileged || isCompleted ? 2 : 1.5;
        const capped = Math.min(rate, max);
        setPlaybackRate(capped);
        playerRef.current?.setPlaybackRate(capped);
        setShowSpeed(false);
    };

    const changeQuality = (q: 'sd' | 'hd') => {
        if (!playerRef.current) return;
        
        // Capture current time to resume after reload
        const time = playerRef.current.getCurrentTime() || 0;
        setStartFromTime(time);
        
        // Force a new unique ID for the quality change remount
        setPlayerId(`yt-player-${Math.random().toString(36).substr(2, 9)}`);
        setQualityPreference(q);
        setShowQuality(false);
        setIsLoading(true);
    };

    const toggleFullscreen = async () => {
        if (!containerRef.current) return;
        const container = containerRef.current as any;
        
        try {
            if (!document.fullscreenElement && !(document as any).webkitFullscreenElement && !(document as any).msFullscreenElement) {
                // Try native fullscreen first
                let success = false;
                if (container.requestFullscreen) {
                    await container.requestFullscreen();
                    success = true;
                } else if (container.webkitRequestFullscreen) {
                    await container.webkitRequestFullscreen();
                    success = true;
                } else if (container.msRequestFullscreen) {
                    await container.msRequestFullscreen();
                    success = true;
                }

                // Try to lock orientation to landscape on mobile if in fullscreen
                if (success && (window.screen as any)?.orientation?.lock) {
                    try {
                        await (window.screen.orientation as any).lock('landscape').catch(() => {});
                    } catch (e) {}
                }
                
                // Even if native fails (like iOS Safari on Divs), we set our state to true 
                // and handle with CSS "fixed" fallback
                setIsFullscreen(true);
            } else {
                // Exit fullscreen
                if (document.exitFullscreen) {
                    await document.exitFullscreen().catch(() => {});
                } else if ((document as any).webkitExitFullscreen) {
                    (document as any).webkitExitFullscreen();
                }
                
                if ((window.screen as any)?.orientation?.unlock) {
                    try { (window.screen.orientation as any).unlock(); } catch(e) {}
                }
                setIsFullscreen(false);
            }
        } catch (err) {
            // If anything fails, toggle our local state to use CSS fallback
            setIsFullscreen(!isFullscreen);
        }
    };

    // Listen for escape key or browser-level fullscreen changes to keep state in sync
    useEffect(() => {
        const handleFsChange = () => {
            const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement);
            setIsFullscreen(isFs);
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        document.addEventListener('webkitfullscreenchange', handleFsChange);
        document.addEventListener('msfullscreenchange', handleFsChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFsChange);
            document.removeEventListener('webkitfullscreenchange', handleFsChange);
            document.removeEventListener('msfullscreenchange', handleFsChange);
        };
    }, []);

    const progress = duration ? (currentTime / duration) * 100 : 0;
    const maxProgress = duration ? (maxReachedRef.current / duration) * 100 : 0;
    const canSeekFreely = isPrivileged || isCompleted || allowSeeking;
    const speeds = canSeekFreely ? [0.5, 0.75, 1, 1.25, 1.5, 2] : [0.5, 0.75, 1, 1.25, 1.5];

    const VolumeIcon = isMuted || volume === 0 ? LucideVolumeX : volume < 50 ? LucideVolume1 : LucideVolume2;

    return (
        <div 
            ref={containerRef} 
            className={`relative w-full bg-black select-none overflow-hidden group transition-all duration-300 ${
                isFullscreen 
                    ? 'fixed inset-0 z-[9999] h-screen w-screen' 
                    : 'h-full aspect-video'
            }`}
        >
            <iframe
                key={playerId}
                id={playerId}
                src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&controls=0&rel=0&modestbranding=1&iv_load_policy=3&disablekb=1&playsinline=1&high_res=1&vq=${qualityPreference === 'hd' ? 'hd1080' : 'medium'}${startFromTime > 0 ? `&start=${Math.floor(startFromTime)}` : ''}`}
                className="absolute inset-0 w-full h-full border-0"
                allow="autoplay; encrypted-media; fullscreen; gyroscope"
                allowFullScreen
                title="player"
            />

            {isLoading && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20">
                    <LoadingSpinner size="xl" variant="primary" />
                    <p className="text-white/40 text-[10px] font-black tracking-[0.2em] uppercase">Carregando</p>
                </div>
            )}

            {!isLoading && (
                <div
                    className="absolute inset-0 z-10"
                    onMouseMove={resetHideTimer}
                    onMouseLeave={() => isPlaying && setShowControls(false)}
                    onClick={() => togglePlay()}
                >
                    {/* Ended overlay */}
                    {ended && (
                        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-4 z-30">
                            <div className="h-16 w-16 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center">
                                <LucideCheckCircle className="h-8 w-8 text-green-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-white text-lg font-black">Aula Concluída!</p>
                                <p className="text-white/50 text-sm mt-1">Ótimo progresso 🎉</p>
                            </div>
                        </div>
                    )}

                    {/* Center button — play/pause toggle, shows with controls or when paused */}
                    {!ended && (showControls || !isPlaying) && (
                        <div
                            className="absolute inset-0 flex items-center justify-center cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                        >
                            <div className={`h-16 w-16 rounded-full bg-black/50 border border-white/20 flex items-center justify-center shadow-2xl transition-all duration-200 hover:scale-110 hover:bg-black/70`}>
                                {isPlaying
                                    ? <LucidePause className="h-7 w-7 text-white fill-current" />
                                    : <LucidePlay className="h-7 w-7 text-white fill-current ml-0.5" />
                                }
                            </div>
                        </div>
                    )}

                    {/* Controls bar */}
                    <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pt-8 pb-2 md:px-5 md:pb-3 transition-all duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

                        {/* Seekbar */}
                        <div
                            className="relative h-1 w-full bg-white/25 rounded-full mb-3 cursor-pointer group/seek hover:h-1.5 transition-all duration-150"
                            onClick={handleSeekBar}
                            onMouseMove={handleSeekHover}
                            onMouseLeave={() => setHoverTime(null)}
                        >
                            {hoverTime !== null && (
                                <div
                                    className="absolute bottom-4 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-0.5 rounded font-bold"
                                    style={{ left: `${(hoverTime / duration) * 100}%` }}
                                >
                                    {formatTime(hoverTime)}
                                </div>
                            )}
                            {!canSeekFreely && (
                                <div className="absolute inset-0 bg-white/10 rounded-full" style={{ width: `${maxProgress}%` }} />
                            )}
                            <div className="absolute inset-0 bg-primary rounded-full" style={{ width: `${progress}%` }} />
                            <div
                                className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-primary rounded-full shadow border border-white/60 opacity-0 group-hover/seek:opacity-100 transition-opacity"
                                style={{ left: `${progress}%`, marginLeft: '-6px' }}
                            />
                        </div>

                        {/* Controls row */}
                        <div className="flex items-center justify-between">
                            {/* Left */}
                            <div className="flex items-center gap-3">
                                <button onClick={(e) => togglePlay(e)} className="text-white hover:text-primary transition-colors">
                                    {isPlaying
                                        ? <LucidePause className="h-5 w-5 md:h-6 md:w-6 fill-current" />
                                        : <LucidePlay className="h-5 w-5 md:h-6 md:w-6 fill-current" />}
                                </button>

                                <div className="flex items-center gap-2 group/volume">
                                    <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="text-white/70 hover:text-white transition-colors">
                                        <VolumeIcon className="h-4 w-4 md:h-5 md:w-5" />
                                    </button>
                                    <input
                                        type="range" min="0" max="100" value={isMuted ? 0 : volume}
                                        onChange={handleVolume} onClick={e => e.stopPropagation()}
                                        className="hidden md:block w-0 group-hover/volume:w-16 opacity-0 group-hover/volume:opacity-100 transition-all duration-300 accent-primary h-1"
                                    />
                                </div>

                                <span className="text-white/70 text-[11px] font-bold tabular-nums">
                                    <span className="text-white">{formatTime(currentTime)}</span>
                                    <span className="text-white/40 mx-1">/</span>
                                    {formatTime(duration)}
                                </span>
                            </div>

                            {/* Right */}
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <button
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setShowQuality(!showQuality); 
                                            setShowSpeed(false);
                                        }}
                                        className={`flex items-center gap-1 font-black text-[10px] tracking-wider uppercase transition-colors ${showQuality ? 'text-primary' : 'text-white/60 hover:text-white'}`}
                                    >
                                        <LucideMonitor className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                        <span>{qualityPreference.toUpperCase()}</span>
                                    </button>
                                    {showQuality && (
                                        <div className="absolute bottom-8 right-0 bg-black/95 border border-white/10 rounded-xl py-1 w-28 shadow-2xl overflow-hidden z-40">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-white/30 px-3 py-1">Qualidade</p>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); changeQuality('hd'); }}
                                                className={`w-full px-3 py-2 text-left text-[11px] font-bold hover:bg-white/10 transition-colors flex items-center justify-between ${qualityPreference === 'hd' ? 'text-primary' : 'text-white/60'}`}
                                            >
                                                <span>HD</span>
                                                {qualityPreference === 'hd' && <LucideCheckCircle className="h-3 w-3" />}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); changeQuality('sd'); }}
                                                className={`w-full px-3 py-2 text-left text-[11px] font-bold hover:bg-white/10 transition-colors flex items-center justify-between ${qualityPreference === 'sd' ? 'text-primary' : 'text-white/60'}`}
                                            >
                                                <span>SD</span>
                                                {qualityPreference === 'sd' && <LucideCheckCircle className="h-3 w-3" />}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="relative">
                                    <button
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setShowSpeed(!showSpeed); 
                                            setShowQuality(false);
                                        }}
                                        className={`flex items-center gap-1 font-black text-[10px] tracking-wider uppercase transition-colors ${showSpeed ? 'text-primary' : 'text-white/60 hover:text-white'}`}
                                    >
                                        <LucideSettings className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                        <span>{playbackRate}x</span>
                                    </button>
                                    {showSpeed && (
                                        <div className="absolute bottom-8 right-0 bg-black/95 border border-white/10 rounded-xl py-1 w-24 shadow-2xl overflow-hidden">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-white/30 px-3 py-1">Velocidade</p>
                                            {speeds.map(s => (
                                                <button
                                                    key={s} onClick={(e) => { e.stopPropagation(); changeSpeed(s); }}
                                                    className={`w-full px-3 py-1.5 text-left text-[11px] font-bold hover:bg-white/10 transition-colors ${playbackRate === s ? 'text-primary' : 'text-white/60'}`}
                                                >
                                                    {s}x
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="text-white/60 hover:text-white transition-colors">
                                    {isFullscreen ? <LucideMinimize className="h-4 w-4 md:h-5 md:w-5" /> : <LucideMaximize className="h-4 w-4 md:h-5 md:w-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default YouTubePlayer;
