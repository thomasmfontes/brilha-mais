import React, { useEffect, useState } from "react";
import { PortalModal } from "./PortalModal";
import { 
    LucideFingerprint, 
    LucideTrash2, 
    LucidePlus, 
    LucideX, 
    LucideCalendar, 
    LucideLoader2 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../utils/api";
import { toast } from "react-hot-toast";
import { startRegistration } from "@simplewebauthn/browser";

interface Credential {
    id: string;
    name?: string;
    deviceName?: string;
    createdAt: string;
}

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const isWebAuthnSupported = typeof window !== "undefined" && !!window.PublicKeyCredential;

    const fetchCredentials = async () => {
        setIsLoading(true);
        try {
            const response = await api.get<Credential[]>("/auth/webauthn/credentials");
            const list = response.data || [];
            setCredentials(list);
            if (list.length > 0) {
                localStorage.setItem("has_biometrics", "true");
            } else {
                localStorage.removeItem("has_biometrics");
            }
        } catch (error: any) {
            console.error("Erro ao buscar biometrias:", error);
            toast.error("Não foi possível carregar as biometrias cadastradas.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchCredentials();
        }
    }, [isOpen]);

    // Helper to auto-generate a clean, recognizable device name based on OS & Browser
    const detectDeviceName = () => {
        const userAgent = navigator.userAgent;
        let os = "Dispositivo";
        if (userAgent.indexOf("Win") !== -1) os = "Windows";
        else if (userAgent.indexOf("Mac") !== -1) os = "Mac";
        else if (userAgent.indexOf("iPhone") !== -1) os = "iPhone";
        else if (userAgent.indexOf("iPad") !== -1) os = "iPad";
        else if (userAgent.indexOf("Android") !== -1) os = "Android";
        else if (userAgent.indexOf("Linux") !== -1) os = "Linux";
        
        let browser = "Navegador";
        if (userAgent.indexOf("Chrome") !== -1) browser = "Chrome";
        else if (userAgent.indexOf("Safari") !== -1) browser = "Safari";
        else if (userAgent.indexOf("Firefox") !== -1) browser = "Firefox";
        else if (userAgent.indexOf("Edge") !== -1) browser = "Edge";

        return `${os} (${browser})`;
    };

    const handleRegister = async () => {
        if (!isWebAuthnSupported) {
            toast.error("Este dispositivo não suporta autenticação biométrica.");
            return;
        }

        const autoDeviceName = detectDeviceName();
        setIsRegistering(true);

        try {
            // 1. Obter opções de registro do backend
            const optionsResponse = await api.post("/auth/webauthn/register/options", {
                name: autoDeviceName,
                deviceName: autoDeviceName
            });
            const options = optionsResponse.data;

            // 2. Chamar o navegador para criar a credencial
            const registrationResult = await startRegistration({ optionsJSON: options });

            // 3. Enviar o resultado da verificação para o backend
            await api.post("/auth/webauthn/register/verify", {
                ...registrationResult,
                name: autoDeviceName,
                deviceName: autoDeviceName
            });

            localStorage.setItem("has_biometrics", "true");
            toast.success("Biometria cadastrada com sucesso!");
            fetchCredentials();
        } catch (error: any) {
            console.error("Erro no registro WebAuthn:", error);
            if (error.name === "NotAllowedError") {
                toast.error("Registro cancelado pelo usuário.");
            } else {
                toast.error(
                    error.response?.data?.message || 
                    "Falha ao registrar biometria."
                );
            }
        } finally {
            setIsRegistering(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await api.delete(`/auth/webauthn/credentials/${id}`);
            toast.success("Biometria removida com sucesso!");
            fetchCredentials();
        } catch (error: any) {
            console.error("Erro ao excluir biometria:", error);
            toast.error("Não foi possível excluir a biometria.");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <PortalModal isOpen={isOpen} onClose={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-md bg-card border border-border rounded-[2.5rem] p-8 md:p-10 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
                {/* Border Top Gradient Line */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
                
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground z-20"
                >
                    <LucideX className="h-5 w-5" />
                </button>

                {/* Header */}
                <div className="mb-6 flex flex-col items-start text-left">
                    <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                            <LucideFingerprint className="h-6 w-6" />
                        </div>
                        Biometria & Face ID
                    </h2>
                    <p className="text-muted-foreground font-medium text-xs pl-1">
                        Gerencie seus dispositivos cadastrados para login rápido.
                    </p>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4 mb-6">
                    <div className="space-y-3 pt-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                            Dispositivos Salvos
                        </h3>
                        
                        {isLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-3">
                                <LucideLoader2 className="h-6 w-6 text-primary animate-spin" />
                                <p className="text-xs font-bold text-slate-400">Buscando chaves...</p>
                            </div>
                        ) : credentials.length === 0 ? (
                            <div className="border border-dashed border-border rounded-3xl p-8 text-center bg-slate-50/50">
                                <div className="h-12 w-12 rounded-2xl bg-white border border-border flex items-center justify-center text-slate-300 mx-auto mb-3 shadow-sm">
                                    <LucideFingerprint className="h-6 w-6" />
                                </div>
                                <p className="text-xs font-black uppercase text-slate-400 tracking-wider">
                                    Nenhum dispositivo salvo
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1 max-w-[220px] mx-auto font-medium leading-relaxed">
                                    Cadastre a biometria deste dispositivo para acessar sem precisar de senhas.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                <AnimatePresence initial={false}>
                                    {credentials.map((cred) => (
                                        <motion.div 
                                            layout
                                            key={cred.id} 
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="relative p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between hover:border-primary/20 transition-all group/file"
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/file:bg-primary/5 group-hover/file:text-primary transition-colors shrink-0">
                                                    <LucideFingerprint className="h-6 w-6" />
                                                </div>
                                                <div className="min-w-0 text-left">
                                                    <p className="font-bold text-sm truncate text-slate-900">
                                                        {cred.name || cred.deviceName || "Chave de Acesso"}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                                                        {cred.createdAt 
                                                            ? new Date(cred.createdAt).toLocaleDateString("pt-BR", {
                                                                day: "2-digit",
                                                                month: "2-digit",
                                                                year: "numeric"
                                                              })
                                                            : "Cadastrado"
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(cred.id)}
                                                disabled={deletingId !== null}
                                                className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 disabled:opacity-50"
                                                title="Excluir Chave"
                                            >
                                                {deletingId === cred.id ? (
                                                    <LucideLoader2 className="h-4 w-4 animate-spin text-primary" />
                                                ) : (
                                                    <LucideTrash2 className="h-4 w-4" />
                                                )}
                                            </button>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Action */}
                <div className="mt-auto">
                    {isWebAuthnSupported ? (
                        <button
                            onClick={handleRegister}
                            disabled={isRegistering}
                            className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isRegistering ? (
                                <>
                                    <LucideLoader2 className="h-4 w-4 animate-spin" />
                                    <span>Registrando...</span>
                                </>
                            ) : (
                                <>
                                    <LucidePlus className="h-4 w-4" />
                                    <span>Adicionar Biometria</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="w-full p-4 rounded-2xl bg-red-50 border border-red-100 text-red-500 text-[10px] font-black uppercase tracking-widest text-center">
                            Dispositivo incompatível
                        </div>
                    )}
                </div>
            </motion.div>
        </PortalModal>
    );
}
