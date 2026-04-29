import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import api from "../utils/api";
import toast from "react-hot-toast";
import { LucideChevronLeft, LucideQrCode, LucideCheckCircle2, LucideXCircle, LucideShieldCheck, LucideInfo } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
            {/* Header seguindo o padrão das outras telas */}
            <div className="flex items-center gap-4">
                <Link to="/dashboard" className="p-2 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-primary transition-all shadow-sm active:scale-95">
                    <LucideChevronLeft className="h-6 w-6" />
                </Link>
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Ler QR Code</h1>
                    <p className="text-slate-500 text-sm font-bold">Marque sua presença na aula</p>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col items-center">
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-24 flex flex-col items-center justify-center gap-6"
                        >
                            <LoadingSpinner size="lg" />
                            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">Verificando...</p>
                        </motion.div>
                    ) : result === 'success' ? (
                        <motion.div 
                            key="success"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-16 px-8 flex flex-col items-center text-center w-full"
                        >
                            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner border border-emerald-100">
                                <LucideCheckCircle2 className="h-12 w-12" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight leading-tight">Tudo Certo!</h2>
                            <p className="text-slate-500 font-bold text-sm mb-12">
                                {message === 'Presence confirmed successfully' ? 'Sua presença foi registrada com sucesso. Boa aula!' : message}
                            </p>
                            <Link to="/dashboard" className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] hover:bg-black transition-all shadow-xl active:scale-95 flex items-center justify-center">
                                Voltar ao Início
                            </Link>
                        </motion.div>
                    ) : result === 'error' ? (
                        <motion.div 
                            key="error"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-16 px-8 flex flex-col items-center text-center w-full"
                        >
                            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mb-8 shadow-inner border border-red-100">
                                <LucideXCircle className="h-12 w-12" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight leading-tight">Não foi possível validar</h2>
                            <p className="text-slate-500 font-bold text-sm mb-12 leading-relaxed">
                                {message === 'Invalid QR Code' ? 'Este QR Code não é válido para você ou já expirou.' : 
                                 message === 'User does not belong to this class' ? 'Você não pertence a esta turma e não pode marcar presença.' : 
                                 message === 'Presence already recorded' ? 'Sua presença já foi registrada nesta aula.' :
                                 message}
                            </p>
                            <button 
                                onClick={handleRetry} 
                                className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] hover:bg-black transition-all shadow-xl active:scale-95"
                            >
                                Tentar Novamente
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="scanner"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full"
                        >
                            <div className="bg-slate-900 p-6 text-center">
                                <div className="inline-flex items-center gap-2 mb-1">
                                    <LucideQrCode className="h-4 w-4 text-primary" />
                                    <p className="text-white font-black uppercase tracking-widest text-[10px]">Câmera Ativa</p>
                                </div>
                                <p className="text-white/60 font-bold text-[11px]">Aponte para o QR Code do instrutor</p>
                            </div>
                            
                            <div className="aspect-square relative w-full overflow-hidden">
                                <Scanner
                                    onScan={(result) => { if (result.length > 0) handleDecode(result[0].rawValue); }}
                                    onError={(error: unknown) => console.log((error as Error)?.message || error)}
                                    components={{ finder: false }}
                                    styles={{ container: { width: '100%', height: '100%' } }}
                                />
                                
                                {/* Apenas cantos sutis para guia, sem overlay escuro */}
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className="w-56 h-56 relative">
                                        <div className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-primary rounded-tl-lg"></div>
                                        <div className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-primary rounded-tr-lg"></div>
                                        <div className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-primary rounded-bl-lg"></div>
                                        <div className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-primary rounded-br-lg"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50 flex items-center justify-center gap-3">
                                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                                    <LucideInfo className="h-5 w-5" />
                                </div>
                                <p className="text-[11px] text-slate-500 font-bold leading-relaxed max-w-[200px]">
                                    Mantenha o QR Code centralizado para uma leitura rápida.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );


}
