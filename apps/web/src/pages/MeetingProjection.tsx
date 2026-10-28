import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { QRCodeSVG } from "qrcode.react";
import { LucideMaximize, LucideX, LucideUsers, LucideRefreshCw } from "lucide-react";
import toast from "react-hot-toast";

import LoadingSpinner from "../components/LoadingSpinner";
import Skeleton from "../components/Skeleton";

export default function MeetingProjection() {
    const { id: meetingId } = useParams();
    const navigate = useNavigate();
    const [meeting, setMeeting] = useState<any>(null);
    const [token, setToken] = useState<string>("");
    const [attendancesCount, setAttendancesCount] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadAll = async () => {
            setIsLoading(true);
            await Promise.all([fetchMeeting(), fetchToken(), fetchAttendanceCount()]);
            setIsLoading(false);
        };
        loadAll();

        // Rotate token every 15 seconds
        const tokenInterval = setInterval(fetchToken, 15000);
        
        // Update count every 2 seconds
        const countInterval = setInterval(fetchAttendanceCount, 2000);

        return () => {
            clearInterval(tokenInterval);
            clearInterval(countInterval);
        };
    }, [meetingId]);

    const fetchMeeting = async () => {
        try {
            const { data } = await api.get(`/in-person-meetings/${meetingId}`);
            setMeeting(data);
        } catch (error) {
            toast.error("Erro ao carregar encontro");
        }
    };

    const fetchToken = async () => {
        try {
            const { data } = await api.get(`/in-person-meetings/${meetingId}/qr-token`);
            setToken(data.token);
        } catch (error) {
            console.error("Token error", error);
        }
    };

    const fetchAttendanceCount = async () => {
        try {
            const { data } = await api.get(`/in-person-meetings/${meetingId}`);
            setAttendancesCount(data.attendances?.length || 0);
        } catch (error) {
            // silent fail
        }
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                toast.error(`Erro ao entrar em tela cheia: ${err.message}`);
            });
            setIsFullScreen(true);
        } else {
            document.exitFullscreen();
            setIsFullScreen(false);
        }
    };

    if (isLoading || !meeting) {
        return (
            <div className="min-h-screen bg-stone-50/50 flex flex-col relative overflow-hidden font-sans">
                {/* Header Skeleton */}
                <div className="px-6 py-4 md:px-8 md:py-5 flex justify-between items-center border-b border-slate-200/80 bg-white">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-64" variant="rounded" />
                        <Skeleton className="h-3.5 w-40" variant="rectangle" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-10" variant="rounded" />
                        <Skeleton className="h-10 w-10" variant="rounded" />
                    </div>
                </div>

                {/* Content Skeleton */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
                    <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                        <div className="flex flex-col items-center">
                            <div className="h-96 w-96 max-w-full bg-white rounded-3xl shadow-2xs border border-slate-200/80 flex items-center justify-center">
                                <Skeleton className="h-72 w-72" variant="rounded" />
                            </div>
                        </div>
                        <div className="space-y-6">
                            <Skeleton className="h-28 w-full" variant="rounded" />
                            <Skeleton className="h-56 w-full" variant="rounded" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#FAFAF9] min-h-screen flex flex-col relative overflow-hidden font-sans">
            {/* Top Bar */}
            <div className="px-6 py-4 md:px-8 md:py-5 flex justify-between items-center border-b border-slate-200/80 bg-white shadow-2xs">
                <div>
                    <h1 className="text-slate-900 text-lg md:text-xl font-bold tracking-tight leading-snug">{meeting.title}</h1>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="text-slate-500 text-xs font-medium">Chamada em tempo real</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={toggleFullScreen}
                        className="h-9 w-9 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 flex items-center justify-center transition-colors shadow-2xs"
                        title={isFullScreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                    >
                        <LucideMaximize className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => navigate(-1)}
                        className="h-9 w-9 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 flex items-center justify-center transition-colors shadow-2xs"
                        title="Fechar Projeção"
                    >
                        <LucideX className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Projection Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
                <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
                    
                    {/* QR Code Section */}
                    <div className="flex flex-col items-center">
                        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-slate-200/80 relative flex flex-col items-center">
                            {token ? (
                                <QRCodeSVG value={token} size={300} level="H" includeMargin={false} />
                            ) : (
                                <div className="w-[300px] h-[300px] bg-slate-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-200">
                                    <span className="text-slate-400 font-medium text-xs animate-pulse">Gerando código seguro...</span>
                                </div>
                            )}
                            
                            <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500 text-white shadow-xs text-xs font-medium whitespace-nowrap">
                                <LucideRefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: '4s' }} />
                                <span>QR Code Rotativo</span>
                            </div>
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="space-y-6">
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-7 shadow-2xs flex items-center gap-5">
                            <div className="h-14 w-14 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                                <LucideUsers className="h-7 w-7" />
                            </div>
                            <div>
                                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 leading-none">{attendancesCount}</h2>
                                <p className="text-slate-500 font-medium text-xs mt-1">Alunos Presentes</p>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-7 shadow-2xs space-y-4">
                            <h3 className="text-slate-900 text-sm md:text-base font-semibold tracking-tight">Passo a Passo</h3>
                            <div className="space-y-3.5">
                                {[
                                    "Abra o app Brilha Mais no seu celular.",
                                    "No menu, clique em 'Ler QR Code'.",
                                    "Aponte a câmera para este QR Code."
                                ].map((step, i) => (
                                    <div key={i} className="flex items-center gap-3.5">
                                        <div className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-semibold text-xs shrink-0 shadow-2xs">
                                            {i + 1}
                                        </div>
                                        <p className="text-slate-700 font-medium text-sm leading-snug">{step}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
