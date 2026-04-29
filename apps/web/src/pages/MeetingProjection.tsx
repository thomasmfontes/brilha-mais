import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { QRCodeSVG } from "qrcode.react";
import { LucideMaximize, LucideX, LucideUsers, LucideAlertCircle } from "lucide-react";
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
            <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
                {/* Header Skeleton */}
                <div className="p-8 md:p-12 flex justify-between items-center border-b border-slate-200 bg-white">
                    <div className="space-y-3">
                        <Skeleton className="h-8 w-64" variant="rounded" />
                        <Skeleton className="h-3 w-40" variant="rectangle" />
                    </div>
                    <div className="flex gap-3">
                        <Skeleton className="h-12 w-12" variant="rounded" />
                        <Skeleton className="h-12 w-12" variant="rounded" />
                    </div>
                </div>

                {/* Content Skeleton */}
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                        <div className="flex flex-col items-center gap-8">
                            <div className="h-80 w-80 bg-white rounded-[3rem] shadow-sm border border-slate-100 flex items-center justify-center">
                                <Skeleton className="h-64 w-64" variant="rounded" />
                            </div>
                            <Skeleton className="h-10 w-48" variant="rounded" />
                        </div>
                        <div className="space-y-6">
                            <Skeleton className="h-32 w-full" variant="rounded" />
                            <Skeleton className="h-64 w-full" variant="rounded" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen flex flex-col relative overflow-hidden font-sans">
            <div className="p-8 md:p-12 flex justify-between items-center border-b border-slate-200 bg-white">
                <div>
                    <h1 className="text-slate-900 text-3xl font-black uppercase tracking-tight">{meeting.title}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Chamada em tempo real</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={toggleFullScreen} className="h-12 w-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl flex items-center justify-center transition-all">
                        <LucideMaximize className="h-5 w-5" />
                    </button>
                    <button onClick={() => navigate(-1)} className="h-12 w-12 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl flex items-center justify-center transition-all">
                        <LucideX className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    
                    {/* QR Code Section */}
                    <div className="flex flex-col items-center">
                        <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-xl border border-slate-100 relative">
                            {token ? (
                                <QRCodeSVG value={token} size={320} level="H" includeMargin={false} />
                            ) : (
                                <div className="w-[320px] h-[320px] bg-slate-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-200">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px] animate-pulse">Gerando código seguro...</span>
                                </div>
                            )}
                            
                            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-2.5 rounded-full shadow-lg flex items-center gap-2">
                                <LucideAlertCircle className="h-4 w-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">QR Code Rotativo</span>
                            </div>
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="space-y-10">
                        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm flex items-center gap-8">
                            <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center text-primary">
                                <LucideUsers className="h-10 w-10" />
                            </div>
                            <div>
                                <h2 className="text-5xl font-black text-slate-900 leading-none">{attendancesCount}</h2>
                                <p className="text-slate-500 font-black uppercase tracking-widest text-xs mt-2">Alunos Presentes</p>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm space-y-8">
                            <h3 className="text-slate-900 text-2xl font-black uppercase tracking-tight">Passo a Passo</h3>
                            <div className="space-y-6">
                                {[
                                    "Abra o app Brilha Mais no seu celular.",
                                    "No menu, clique em 'Ler QR Code'.",
                                    "Aponte a câmera para este QR Code."
                                ].map((step, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                                            {i + 1}
                                        </div>
                                        <p className="text-slate-600 font-bold text-lg leading-tight">{step}</p>
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