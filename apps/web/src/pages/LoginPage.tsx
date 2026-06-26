import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LucideShield, LucideLock, LucideMail, LucideUser, LucideSparkles, LucideAlertCircle, LucideArrowLeft, LucideFingerprint } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../utils/api";
import { startAuthentication } from "@simplewebauthn/browser";
import { toast } from "react-hot-toast";
import logo from "../assets/logo.png";
import LoadingSpinner from "../components/LoadingSpinner";

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const tokenFromUrl = searchParams.get("token");
        const tokenFromStorage = localStorage.getItem("auth_token");

        if (tokenFromUrl) {
            localStorage.setItem("auth_token", tokenFromUrl);
            navigate("/dashboard", { replace: true });
        } else if (tokenFromStorage) {
            navigate("/dashboard", { replace: true });
        }
    }, [searchParams, navigate]);


    const [isRedirecting, setIsRedirecting] = useState<string | null>(null);

    const handleBiometricLogin = async () => {
        setIsRedirecting('biometric');
        try {
            // 1. Obter opções de autenticação do backend
            const optionsResponse = await api.post("/auth/webauthn/authenticate/options", {});
            const options = optionsResponse.data;

            // 2. Iniciar autenticação no navegador
            const authResult = await startAuthentication(options);

            // 3. Enviar o resultado da verificação para o backend
            const verifyResponse = await api.post("/auth/webauthn/authenticate/verify", authResult);

            const { token } = verifyResponse.data;
            if (token) {
                localStorage.setItem("auth_token", token);
                toast.success("Autenticação realizada com sucesso!");
                navigate("/dashboard", { replace: true });
            } else {
                throw new Error("Token não retornado pelo servidor.");
            }
        } catch (error: any) {
            console.error("Erro na autenticação biométrica:", error);
            if (error.name === "NotAllowedError") {
                toast.error("Autenticação cancelada.");
            } else {
                toast.error(
                    error.response?.data?.message || 
                    "Não foi possível autenticar com biometria. Registre seu dispositivo nas configurações primeiro."
                );
            }
        } finally {
            setIsRedirecting(null);
        }
    };

    const handleSocialLogin = (provider: 'google' | 'microsoft') => {
        setIsRedirecting(provider);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        // Redirect to backend OAuth endpoint
        window.location.href = `${apiUrl}/auth/${provider}`;
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground overflow-hidden relative">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/30 rounded-full blur-[120px]" />

            <Link
                to="/"
                className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors z-20 group"
            >
                <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:border-primary transition-colors">
                    <LucideArrowLeft className="h-4 w-4" />
                </div>
                <span>Voltar</span>
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-12 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
                    <div className="text-center mb-10">
                        <img src={logo} alt="Brilha Mais" className="h-24 mx-auto mb-6" />
                        <h1 className="text-3xl font-black tracking-tighter mb-2 uppercase italic text-slate-900">Acesso Restrito</h1>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Portal de Experiência Premium</p>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            <button
                                onClick={() => handleSocialLogin('google')}
                                disabled={!!isRedirecting}
                                className="flex items-center justify-center gap-4 px-6 py-5 rounded-2xl border border-border bg-white hover:bg-muted transition-all font-black text-lg shadow-sm group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isRedirecting === 'google' ? (
                                    <LoadingSpinner size="md" />
                                ) : (
                                    <svg viewBox="0 0 48 48" className="h-6 w-6">
                                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.13-.45-4.69H24v9.07h12.91c-.54 2.92-2.22 5.39-4.72 7.03l7.38 5.73c4.32-3.99 6.79-9.87 6.79-17.14z" />
                                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.38-5.73c-2.11 1.41-4.84 2.29-8.51 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                                        <path fill="none" d="M0 0h48v48H0z" />
                                    </svg>
                                )}
                                {isRedirecting === 'google' ? 'Conectando...' : 'Entrar com Google'}
                            </button>
                            <button
                                onClick={() => handleSocialLogin('microsoft')}
                                disabled={!!isRedirecting}
                                className="flex items-center justify-center gap-4 px-6 py-5 rounded-2xl border border-border bg-white hover:bg-muted transition-all font-black text-lg shadow-sm group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isRedirecting === 'microsoft' ? (
                                    <LoadingSpinner size="md" />
                                ) : (
                                    <svg viewBox="0 0 23 23" className="h-6 w-6">
                                        <path fill="#f35325" d="M11.5 0H0v11.5h11.5V0z" />
                                        <path fill="#81bc06" d="M23 0H11.5v11.5H23V0z" />
                                        <path fill="#05a6f0" d="M11.5 11.5H0V23h11.5V11.5z" />
                                        <path fill="#ffba08" d="M23 11.5H11.5V23H23V11.5z" />
                                    </svg>
                                )}
                                {isRedirecting === 'microsoft' ? 'Conectando...' : 'Entrar com Microsoft'}
                            </button>

                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-200"></div>
                                <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ou</span>
                                <div className="flex-grow border-t border-slate-200"></div>
                            </div>

                            <button
                                onClick={handleBiometricLogin}
                                disabled={!!isRedirecting}
                                className="flex items-center justify-center gap-4 px-6 py-5 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-all font-black text-lg shadow-md group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {isRedirecting === 'biometric' ? (
                                    <LoadingSpinner size="md" />
                                ) : (
                                    <LucideFingerprint className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                                )}
                                {isRedirecting === 'biometric' ? 'Aguardando Leitura...' : 'Entrar com Biometria'}
                            </button>
                        </div>
                    </div>

                    <p className="text-center text-xs font-bold text-muted-foreground mt-10 uppercase tracking-widest">
                        Acesso seguro via provedores oficiais
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
