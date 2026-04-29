import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import api from "../utils/api";
import toast from "react-hot-toast";
import { LucideChevronLeft, LucideQrCode, LucideCheckCircle2, LucideXCircle } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";

export default function MeetingScanner() {
    const navigate = useNavigate();
    const [isScanning, setIsScanning] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<'success' | 'error' | null>(null);
    const [message, setMessage] = useState("");

    const handleDecode = async (token: string) => {
        if (!isScanning) return;
        setIsScanning(false);
        setIsLoading(true);

        try {
            const { data } = await api.post('/in-person-meetings/scan', { token });
            setResult('success');
            setMessage(data.message || "Presença confirmada com sucesso!");
        } catch (error: any) {
            setResult('error');
            setMessage(error.response?.data?.message || "QR Code inválido ou expirado.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRetry = () => {
        setResult(null);
        setMessage("");
        setIsScanning(true);
    };

    return (
        <div className="max-w-md mx-auto space-y-8 pb-20">
            <div className="flex items-center gap-4">
                <Link to="/dashboard" className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-primary transition-all shadow-sm">
                    <LucideChevronLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Ler QR Code</h1>
                    <p className="text-slate-500 text-sm font-bold">Marque sua presença na aula</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col items-center">
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <LoadingSpinner size="lg" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Verificando...</p>
                    </div>
                ) : result === 'success' ? (
                    <div className="py-16 px-8 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <LucideCheckCircle2 className="h-10 w-10" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Presença Confirmada!</h2>
                        <p className="text-slate-500 font-medium mb-8">{message}</p>
                        <Link to="/dashboard" className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-black transition-all shadow-md">
                            Voltar ao Início
                        </Link>
                    </div>
                ) : result === 'error' ? (
                    <div className="py-16 px-8 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <LucideXCircle className="h-10 w-10" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Ops, algo deu errado.</h2>
                        <p className="text-slate-500 font-medium mb-8">{message}</p>
                        <button onClick={handleRetry} className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-primary/90 transition-all shadow-md">
                            Tentar Novamente
                        </button>
                    </div>
                ) : (
                    <div className="w-full">
                        <div className="bg-slate-900 p-6 text-center">
                            <LucideQrCode className="h-8 w-8 text-white/50 mx-auto mb-2" />
                            <p className="text-white font-bold text-sm">Aponte a câmera para a tela do professor</p>
                        </div>
                        <div className="aspect-square bg-black relative w-full overflow-hidden">
                            <Scanner
                                onScan={(result) => { if (result.length > 0) handleDecode(result[0].rawValue); }}
                                onError={(error: unknown) => console.log((error as Error)?.message || error)}
                                styles={{ container: { width: '100%', height: '100%' } }}
                            />
                            {/* Scanning Guide Overlay */}
                            <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
                                <div className="w-full h-full border-2 border-primary/50 relative">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary"></div>
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary"></div>
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary"></div>
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary"></div>
                                    
                                    {/* Scanning laser animation */}
                                    <div className="w-full h-0.5 bg-primary absolute top-1/2 -translate-y-1/2 shadow-[0_0_8px_2px_rgba(var(--primary-rgb),0.5)] animate-scan"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
