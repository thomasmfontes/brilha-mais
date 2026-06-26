import React, { useEffect, useState } from "react";
import { PortalModal } from "./PortalModal";
import { 
    LucideFingerprint, 
    LucideTrash2, 
    LucidePlus, 
    LucideX, 
    LucideShieldCheck, 
    LucideCalendar, 
    LucideLoader2 
} from "lucide-react";
import api from "../utils/api";
import { toast } from "react-hot-toast";
import LoadingSpinner from "./LoadingSpinner";
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
    const [deviceName, setDeviceName] = useState("");

    const isWebAuthnSupported = typeof window !== "undefined" && !!window.PublicKeyCredential;

    const fetchCredentials = async () => {
        setIsLoading(true);
        try {
            const response = await api.get<Credential[]>("/auth/webauthn/credentials");
            setCredentials(response.data || []);
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
            setDeviceName("");
        }
    }, [isOpen]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isWebAuthnSupported) {
            toast.error("Este navegador ou dispositivo não suporta autenticação biométrica.");
            return;
        }

        const nameToUse = deviceName.trim() || "Meu Dispositivo";
        setIsRegistering(true);

        try {
            // 1. Obter opções de registro do backend
            const optionsResponse = await api.post("/auth/webauthn/register/options", {
                name: nameToUse,
                deviceName: nameToUse
            });
            const options = optionsResponse.data;

            // 2. Chamar o navegador para criar a credencial
            const registrationResult = await startRegistration({ optionsJSON: options });

            // 3. Enviar o resultado da verificação para o backend
            await api.post("/auth/webauthn/register/verify", {
                ...registrationResult,
                name: nameToUse,
                deviceName: nameToUse
            });

            toast.success("Biometria cadastrada com sucesso!");
            setDeviceName("");
            fetchCredentials();
        } catch (error: any) {
            console.error("Erro no registro WebAuthn:", error);
            // Evitar exibir erro se o usuário cancelou o prompt
            if (error.name === "NotAllowedError") {
                toast.error("Registro cancelado pelo usuário.");
            } else {
                toast.error(
                    error.response?.data?.message || 
                    "Falha ao registrar biometria. Verifique se o dispositivo já está cadastrado."
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
            <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 max-w-lg w-full shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-sm">
                            <LucideFingerprint className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Biometria & Passkeys</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Segurança Premium</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors active:scale-95"
                    >
                        <LucideX className="h-5 w-5" />
                    </button>
                </div>

                <div className="overflow-y-auto pr-1 flex-1 space-y-6 scrollbar-thin">
                    <p className="text-sm font-bold text-slate-500 leading-relaxed">
                        Gerencie suas chaves de acesso biométricas. Uma vez cadastrada, você poderá entrar na sua conta rapidamente usando Face ID, Touch ID ou a biometria do seu dispositivo.
                    </p>

                    {/* Cadastrar Nova Biometria */}
                    <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                            <LucideShieldCheck className="h-4 w-4 text-primary" />
                            Cadastrar Novo Dispositivo
                        </h3>
                        
                        {!isWebAuthnSupported ? (
                            <div className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 rounded-xl p-3">
                                Seu navegador ou dispositivo atual não oferece suporte para WebAuthn/Biometria.
                            </div>
                        ) : (
                            <form onSubmit={handleRegister} className="space-y-3">
                                <div>
                                    <label htmlFor="device-name" className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                                        Nome da Biometria / Dispositivo
                                    </label>
                                    <input 
                                        id="device-name"
                                        type="text" 
                                        value={deviceName}
                                        onChange={(e) => setDeviceName(e.target.value)}
                                        placeholder="Ex: Meu iPhone, TouchID Notebook"
                                        required
                                        disabled={isRegistering}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isRegistering}
                                    className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all active:scale-95 shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isRegistering ? (
                                        <>
                                            <LucideLoader2 className="h-4 w-4 animate-spin" />
                                            <span>Registrando no Dispositivo...</span>
                                        </>
                                    ) : (
                                        <>
                                            <LucidePlus className="h-4 w-4" />
                                            <span>Cadastrar Biometria</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Lista de Biometrias Cadastradas */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                            Dispositivos Cadastrados ({credentials.length})
                        </h3>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-8">
                                <LoadingSpinner size="md" />
                                <span className="text-xs font-bold text-slate-400 mt-2">Carregando dispositivos...</span>
                            </div>
                        ) : credentials.length === 0 ? (
                            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center">
                                <LucideFingerprint className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm font-black uppercase text-slate-400 tracking-tight">Nenhuma biometria cadastrada</p>
                                <p className="text-xs text-slate-400 mt-1">Cadastre seu dispositivo acima para login rápido.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {credentials.map((cred) => (
                                    <div 
                                        key={cred.id} 
                                        className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-300 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                                                <LucideFingerprint className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-black uppercase tracking-tight text-slate-800 truncate">
                                                    {cred.name || cred.deviceName || "Chave de Acesso"}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <LucideCalendar className="h-3 w-3" />
                                                    {cred.createdAt 
                                                        ? new Date(cred.createdAt).toLocaleDateString("pt-BR", {
                                                            day: "2-digit",
                                                            month: "2-digit",
                                                            year: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit"
                                                          })
                                                        : "Data desconhecida"
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(cred.id)}
                                            disabled={deletingId !== null}
                                            className="h-9 w-9 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 text-red-500 flex items-center justify-center transition-colors disabled:opacity-50 active:scale-95"
                                            title="Excluir Biometria"
                                        >
                                            {deletingId === cred.id ? (
                                                <LucideLoader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <LucideTrash2 className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PortalModal>
    );
}
