import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import api from "../utils/api";
import { ChevronLeft, QrCode, CheckCircle2, XCircle, Info, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingSpinner from "../components/LoadingSpinner";

export default function MeetingScanner() {
    const navigate = useNavigate();
    const [isScanning, setIsScanning] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<'success' | 'error' | null>(null);
    const [message, setMessage] = useState("");

    const playScanSound = () => {
        try {
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(50);
            }
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.02);
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.1);
        } catch (e) {}
    };

    const playSuccessSound = () => {
        try {
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(100);
            }
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.3);
        } catch (e) {}
    };

    const playErrorSound = () => {
        try {
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate([100, 50, 100]);
            }
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
            gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.2);
        } catch (e) {}
    };

    const handleDecode = async (token: string) => {
        if (!isScanning) return;
        setIsScanning(false);
        setIsLoading(true);
        playScanSound();

        try {
            const { data } = await api.post('/in-person-meetings/scan', { token });
            setMessage(data.message);
            setResult('success');
            playSuccessSound();
        } catch (error: any) {
            setResult('error');
            setMessage(error.response?.data?.message || "Invalid QR Code");
            playErrorSound();
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
        <div className="max-w-lg mx-auto space-y-6 pb-16">
            {/* Header */}
            <div className="flex items-center gap-3.5">
                <Link
                    to="/dashboard"
                    className="p-2.5 rounded-xl bg-white border border-zinc-200/80 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors shadow-2xs"
                    title="Voltar ao início"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
                        Marcar Presença
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                        Aponte a câmera para o QR Code projetado pelo instrutor
                    </p>
                </div>
            </div>

            {/* Main Scanner Container */}
            <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
                <AnimatePresence mode="wait">
                    {isLoading ? (
                        <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-24 flex flex-col items-center justify-center gap-4 text-center px-6"
                        >
                            <LoadingSpinner size="lg" />
                            <div>
                                <p className="text-sm font-semibold text-zinc-900">Validando presença...</p>
                                <p className="text-xs text-zinc-500 mt-0.5">Aguarde um instante enquanto confirmamos seu registro.</p>
                            </div>
                        </motion.div>
                    ) : result === 'success' ? (
                        <motion.div 
                            key="success"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-14 px-6 sm:px-10 flex flex-col items-center text-center"
                        >
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-5 border border-emerald-200/60 shadow-2xs">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-2">Presença Confirmada!</h2>
                            <p className="text-xs sm:text-sm text-zinc-500 max-w-sm leading-relaxed mb-8">
                                {(() => {
                                    const translations: Record<string, string> = {
                                        'Presence confirmed successfully': 'Sua presença foi registrada com sucesso nesta aula. Bom aprendizado!'
                                    };
                                    return translations[message] || 'Sua presença foi registrada com sucesso nesta aula. Bom aprendizado!';
                                })()}
                            </p>
                            <Link
                                to="/dashboard"
                                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 rounded-xl text-sm font-semibold text-white bg-[#F19B0A] hover:bg-[#D98B08] active:scale-[0.98] transition-all shadow-2xs"
                            >
                                Voltar ao Painel
                            </Link>
                        </motion.div>
                    ) : result === 'error' ? (
                        <motion.div 
                            key="error"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-14 px-6 sm:px-10 flex flex-col items-center text-center"
                        >
                            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-5 border border-red-200/60 shadow-2xs">
                                <XCircle className="h-8 w-8" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 mb-2">Não foi possível validar</h2>
                            <p className="text-xs sm:text-sm text-zinc-500 max-w-sm leading-relaxed mb-8">
                                {(() => {
                                    const translations: Record<string, string> = {
                                        'Invalid QR Code': 'Este QR Code não é válido ou já expirou.',
                                        'User does not belong to this class': 'Você não pertence a esta turma e não pode marcar presença.',
                                        'Presence already recorded': 'Sua presença já foi registrada nesta aula.',
                                        'QR Code expired. Please scan again.': 'O QR Code expirou. Por favor, aponte para o código atualizado do instrutor.',
                                        'Meeting not found': 'Aula não encontrada no sistema.',
                                        'Invalid token type': 'Código de autenticação inválido.',
                                        'Presence confirmed successfully': 'Sua presença foi registrada com sucesso.'
                                    };
                                    return translations[message] || 'Ocorreu um erro ao validar sua presença. Tente novamente ou fale com o instrutor.';
                                })()}
                            </p>
                            <button 
                                onClick={handleRetry} 
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span>Tentar novamente</span>
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="scanner"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full flex flex-col"
                        >
                            <div className="bg-zinc-900 px-5 py-3.5 flex items-center justify-between text-white">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-xs font-semibold">Câmera Ativa</span>
                                </div>
                                <span className="text-xs text-zinc-400">Leitor QR Code</span>
                            </div>
                            
                            <div className="aspect-square relative w-full overflow-hidden bg-black">
                                <Scanner
                                    onScan={(result) => { if (result.length > 0) handleDecode(result[0].rawValue); }}
                                    onError={(error: unknown) => console.log((error as Error)?.message || error)}
                                    components={{ finder: false }}
                                    sound={false}
                                    styles={{ container: { width: '100%', height: '100%' } }}
                                />
                                
                                {/* Target Viewfinder Frame */}
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className="w-56 h-56 relative">
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-[#F19B0A] rounded-tl-lg" />
                                        <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-[#F19B0A] rounded-tr-lg" />
                                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-[#F19B0A] rounded-bl-lg" />
                                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-[#F19B0A] rounded-br-lg" />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-zinc-50 border-t border-zinc-200/70 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-white border border-zinc-200/80 flex items-center justify-center text-zinc-500 shrink-0">
                                    <Info className="h-4 w-4" />
                                </div>
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    Mantenha o código centralizado dentro do quadrado para leitura instantânea.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
