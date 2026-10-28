import React, { useEffect, useState } from "react";
import { PortalModal } from "./PortalModal";
import { 
    LucideFingerprint, 
    LucideTrash2, 
    LucidePlus, 
    LucideX, 
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

            // Garantir compatibilidade com o hostname atual da aplicação
            if (options.rp && window.location.hostname) {
                options.rp.id = window.location.hostname;
            }

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
            console.warn("Registro WebAuthn:", error);
            if (error.name === "NotAllowedError") {
                toast.error("Registro cancelado ou não permitido pelo Windows Hello / PIN.");
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
        <PortalModal isOpen={isOpen} onClose={onClose} className="relative z-[100000] w-full max-w-md">
            <div className="relative w-full bg-white border border-slate-200/80 rounded-2xl p-6 md:p-7 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-left">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-20"
                    aria-label="Fechar"
                >
                    <LucideX className="h-5 w-5" />
                </button>

                {/* Header */}
                <div className="flex items-start gap-3.5 mb-6 pr-8">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                        <LucideFingerprint className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight text-slate-900 leading-tight">
                            Biometria & Face ID
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Dispositivos autorizados para login instantâneo.
                        </p>
                    </div>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-6">
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Dispositivos Salvos
                            </h3>
                            {credentials.length > 0 && (
                                <span className="text-xs text-slate-400">
                                    {credentials.length} {credentials.length === 1 ? 'dispositivo' : 'dispositivos'}
                                </span>
                            )}
                        </div>
                        
                        {isLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-2">
                                <LucideLoader2 className="h-5 w-5 text-amber-500 animate-spin" />
                                <p className="text-xs text-slate-400">Carregando credenciais...</p>
                            </div>
                        ) : credentials.length === 0 ? (
                            <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/50">
                                <div className="h-10 w-10 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-400 mx-auto mb-2.5 shadow-sm">
                                    <LucideFingerprint className="h-5 w-5 text-slate-300" />
                                </div>
                                <p className="text-xs font-medium text-slate-700">
                                    Nenhum dispositivo cadastrado
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                                    Cadastre a biometria deste dispositivo para acessar a plataforma sem digitar senhas.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <AnimatePresence initial={false}>
                                    {credentials.map((cred) => (
                                        <motion.div 
                                            layout
                                            key={cred.id} 
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="p-3 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-9 w-9 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-500 group-hover:text-amber-600 group-hover:bg-amber-50 group-hover:border-amber-200/60 transition-colors shrink-0">
                                                    <LucideFingerprint className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm text-slate-900 truncate">
                                                        {cred.name || cred.deviceName || "Chave de Acesso"}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {cred.createdAt 
                                                            ? `Adicionado em ${new Date(cred.createdAt).toLocaleDateString("pt-BR", {
                                                                day: "2-digit",
                                                                month: "2-digit",
                                                                year: "numeric"
                                                              })}`
                                                            : "Ativo"
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(cred.id)}
                                                disabled={deletingId !== null}
                                                className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors active:scale-95 disabled:opacity-50"
                                                title="Excluir Chave"
                                            >
                                                {deletingId === cred.id ? (
                                                    <LucideLoader2 className="h-4 w-4 animate-spin text-amber-500" />
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
                <div className="mt-auto pt-2">
                    {isWebAuthnSupported ? (
                        <button
                            onClick={handleRegister}
                            disabled={isRegistering}
                            className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <div className="w-full py-3 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs text-center font-medium">
                            Dispositivo incompatível com WebAuthn
                        </div>
                    )}
                </div>
            </div>
        </PortalModal>
    );
}