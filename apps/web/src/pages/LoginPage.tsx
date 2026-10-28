import { useEffect, useState } from "react";
import { ArrowLeft, Fingerprint, Lock } from "lucide-react";
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
    const [showBiometricButton, setShowBiometricButton] = useState(false);

    useEffect(() => {
        const hasBiometrics = localStorage.getItem("has_biometrics") === "true";
        setShowBiometricButton(hasBiometrics);
    }, []);

    const handleBiometricLogin = async () => {
        setIsRedirecting('biometric');
        try {
            const optionsResponse = await api.post("/auth/webauthn/authenticate/options", {});
            const options = optionsResponse.data;

            const authResult = await startAuthentication({ optionsJSON: options });

            const verifyResponse = await api.post("/auth/webauthn/authenticate/verify", {
                ...authResult,
                challenge: options.challenge
            });

            const { access_token } = verifyResponse.data;
            if (access_token) {
                localStorage.setItem("auth_token", access_token);
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
        window.location.href = `${apiUrl}/auth/${provider}`;
    };

    return (
        <div className="min-h-screen bg-[#FAFAF9] text-zinc-900 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900">
            {/* Top Navigation */}
            <header className="w-full max-w-5xl mx-auto px-6 py-6">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200/80 bg-white text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors shadow-xs"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar ao início</span>
                </Link>
            </header>

            {/* Central Minimalist Card */}
            <main className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-[390px] bg-white border border-zinc-200/80 rounded-2xl p-7 sm:p-9 shadow-sm">
                    
                    {/* Header: Logo & Title */}
                    <div className="flex flex-col items-center text-center mb-8">
                        <Link to="/" className="mb-5 inline-block focus:outline-none">
                            <img src={logo} alt="Brilha Mais" className="h-11 w-auto object-contain mx-auto" />
                        </Link>
                        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
                            Entrar na plataforma
                        </h1>
                        <p className="text-xs text-zinc-500 mt-1">
                            Acesse com seu provedor institucional autorizado
                        </p>
                    </div>

                    {/* Providers */}
                    <div className="space-y-3">
                        {/* Google Button */}
                        <button
                            type="button"
                            onClick={() => handleSocialLogin('google')}
                            disabled={!!isRedirecting}
                            className="w-full h-11 px-4 rounded-xl border border-zinc-200/90 bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 hover:text-zinc-900 text-sm font-medium flex items-center justify-center gap-3 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {isRedirecting === 'google' ? (
                                <LoadingSpinner size="sm" />
                            ) : (
                                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                                </svg>
                            )}
                            <span>{isRedirecting === 'google' ? 'Conectando...' : 'Continuar com Google'}</span>
                        </button>

                        {/* Microsoft Button */}
                        <button
                            type="button"
                            onClick={() => handleSocialLogin('microsoft')}
                            disabled={!!isRedirecting}
                            className="w-full h-11 px-4 rounded-xl border border-zinc-200/90 bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 hover:text-zinc-900 text-sm font-medium flex items-center justify-center gap-3 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {isRedirecting === 'microsoft' ? (
                                <LoadingSpinner size="sm" />
                            ) : (
                                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 21 21">
                                    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                                    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                                </svg>
                            )}
                            <span>{isRedirecting === 'microsoft' ? 'Conectando...' : 'Continuar com Microsoft'}</span>
                        </button>

                        {/* Biometrics (Optional) */}
                        {showBiometricButton && (
                            <>
                                <div className="relative py-1.5 flex items-center">
                                    <div className="flex-grow border-t border-zinc-100" />
                                    <span className="flex-shrink mx-3 text-[11px] font-medium text-zinc-400">ou</span>
                                    <div className="flex-grow border-t border-zinc-100" />
                                </div>

                                <button
                                    type="button"
                                    onClick={handleBiometricLogin}
                                    disabled={!!isRedirecting}
                                    className="w-full h-11 px-4 rounded-xl border border-zinc-200/90 bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 hover:text-zinc-900 text-sm font-medium flex items-center justify-center gap-2.5 transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isRedirecting === 'biometric' ? (
                                        <LoadingSpinner size="sm" />
                                    ) : (
                                        <Fingerprint className="w-4 h-4 text-amber-500" />
                                    )}
                                    <span>{isRedirecting === 'biometric' ? 'Aguardando biometria...' : 'Acessar com Biometria / Passkey'}</span>
                                </button>
                            </>
                        )}
                    </div>

                    {/* Security Subnote */}
                    <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center justify-center gap-1.5 text-zinc-400 text-xs">
                        <Lock className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Autenticação criptografada de ponta a ponta</span>
                    </div>
                </div>
            </main>

            {/* Clean, Muted Footer */}
            <footer className="w-full max-w-5xl mx-auto px-6 py-6 text-center text-xs text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p>&copy; 2026 Brilha Mais. Todos os direitos reservados.</p>
                <div className="flex items-center gap-4">
                    <Link to="/termos" className="hover:text-zinc-600 transition-colors">Termos de Uso</Link>
                    <span>·</span>
                    <Link to="/privacidade" className="hover:text-zinc-600 transition-colors">Privacidade</Link>
                </div>
            </footer>
        </div>
    );
}
