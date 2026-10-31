import { useEffect, useState } from "react";
import { ArrowLeft, Fingerprint, Lock, Building2, Eye, EyeOff, Mail, KeyRound } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api from "../utils/api";
import { startAuthentication } from "@simplewebauthn/browser";
import { toast } from "react-hot-toast";
import logo from "../assets/logo.png";
import LoadingSpinner from "../components/LoadingSpinner";

export default function LoginPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const redirectUser = (token: string) => {
        try {
            const decoded: any = jwtDecode(token);
            if (decoded?.role === 'COMPANY') {
                navigate("/empresa", { replace: true });
                return;
            }
        } catch (e) {}
        navigate("/dashboard", { replace: true });
    };

    useEffect(() => {
        const tokenFromUrl = searchParams.get("token");
        const tokenFromStorage = localStorage.getItem("auth_token");

        if (tokenFromUrl) {
            localStorage.setItem("auth_token", tokenFromUrl);
            redirectUser(tokenFromUrl);
        } else if (tokenFromStorage) {
            redirectUser(tokenFromStorage);
        }
    }, [searchParams, navigate]);

    const [isRedirecting, setIsRedirecting] = useState<string | null>(null);
    const [showBiometricButton, setShowBiometricButton] = useState(false);

    // Company password login toggle & form state
    const [showCompanyLogin, setShowCompanyLogin] = useState(false);
    const [companyEmail, setCompanyEmail] = useState("");
    const [companyPassword, setCompanyPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isCompanySubmitting, setIsCompanySubmitting] = useState(false);

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
                redirectUser(access_token);
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

    const handleCompanyLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyEmail.trim() || !companyPassword.trim()) {
            toast.error("Informe seu e-mail corporativo e senha.");
            return;
        }

        setIsCompanySubmitting(true);
        try {
            const res = await api.post("/company/login", {
                email: companyEmail.trim(),
                password: companyPassword,
            });

            if (res.data.access_token) {
                localStorage.setItem("auth_token", res.data.access_token);
                toast.success("Acesso corporativo autenticado!");
                navigate("/empresa", { replace: true });
            } else {
                throw new Error("Token não retornado.");
            }
        } catch (err: any) {
            toast.error(
                err.response?.data?.message ||
                "Credenciais corporativas inválidas. Verifique seu e-mail e senha."
            );
        } finally {
            setIsCompanySubmitting(false);
        }
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
                <div className="w-full max-w-[420px] bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
                    
                    {/* Header: Logo & Title */}
                    <div className="flex flex-col items-center text-center mb-6">
                        <Link to="/" className="mb-4 inline-block focus:outline-none">
                            <img src={logo} alt="Brilha Mais" className="h-11 w-auto object-contain mx-auto" />
                        </Link>
                        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
                            {showCompanyLogin ? "Acesso Empresa Parceira" : "Entrar na plataforma"}
                        </h1>
                        <p className="text-xs text-zinc-500 mt-1">
                            {showCompanyLogin
                                ? "Recrutador credenciado na Rede Brilha Mais"
                                : "Acesse com seu provedor institucional autorizado"}
                        </p>
                    </div>

                    {!showCompanyLogin ? (
                        /* Standard Social / Passkey Login */
                        <div className="space-y-3">
                            {/* Google Button */}
                            <button
                                type="button"
                                onClick={() => handleSocialLogin('google')}
                                disabled={!!isRedirecting}
                                className="w-full h-11 px-4 rounded-xl border border-zinc-200/90 bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 hover:text-zinc-900 text-sm font-medium flex items-center justify-center gap-3 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                                className="w-full h-11 px-4 rounded-xl border border-zinc-200/90 bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 hover:text-zinc-900 text-sm font-medium flex items-center justify-center gap-3 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                                    <div className="relative py-1 flex items-center">
                                        <div className="flex-grow border-t border-zinc-100" />
                                        <span className="flex-shrink mx-3 text-[11px] font-medium text-zinc-400">ou</span>
                                        <div className="flex-grow border-t border-zinc-100" />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleBiometricLogin}
                                        disabled={!!isRedirecting}
                                        className="w-full h-11 px-4 rounded-xl border border-zinc-200/90 bg-white hover:bg-zinc-50 active:bg-zinc-100 text-zinc-700 hover:text-zinc-900 text-sm font-medium flex items-center justify-center gap-2.5 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

                            {/* Switch to Company Login */}
                            <div className="pt-2">
                                <div className="relative py-1.5 flex items-center">
                                    <div className="flex-grow border-t border-zinc-100" />
                                    <span className="flex-shrink mx-3 text-[11px] font-medium text-zinc-400">ou</span>
                                    <div className="flex-grow border-t border-zinc-100" />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowCompanyLogin(true)}
                                    className="w-full h-11 px-4 rounded-xl border border-zinc-200/90 hover:border-amber-400/80 bg-zinc-50/70 hover:bg-amber-50/40 text-zinc-700 hover:text-amber-950 text-sm font-medium flex items-center justify-center gap-2.5 transition-colors shadow-2xs cursor-pointer group"
                                >
                                    <Building2 className="w-4 h-4 text-amber-600 group-hover:text-amber-700 shrink-0 transition-colors" />
                                    <span>Entrar como Empresa Parceira</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Dedicated Company Password Form */
                        <form onSubmit={handleCompanyLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                    E-mail Corporativo
                                </label>
                                <div className="relative">
                                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="email"
                                        required
                                        value={companyEmail}
                                        onChange={(e) => setCompanyEmail(e.target.value)}
                                        placeholder="rh@empresa.com.br"
                                        className="w-full h-11 pl-9 pr-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                                    Senha Corporativa
                                </label>
                                <div className="relative">
                                    <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={companyPassword}
                                        onChange={(e) => setCompanyPassword(e.target.value)}
                                        placeholder="Sua senha corporativa"
                                        className="w-full h-11 pl-9 pr-10 rounded-xl border border-zinc-200 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isCompanySubmitting}
                                className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-medium text-sm transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isCompanySubmitting ? (
                                    <>
                                        <LoadingSpinner size="sm" variant="white" />
                                        <span>Autenticando...</span>
                                    </>
                                ) : (
                                    <span>Acessar Portal da Empresa</span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowCompanyLogin(false)}
                                className="w-full text-center text-xs text-zinc-500 hover:text-zinc-800 transition-colors pt-1 cursor-pointer"
                            >
                                ← Voltar para login institucional (Aluno / Instrutor)
                            </button>
                        </form>
                    )}

                    {/* Security Subnote */}
                    <div className="mt-7 pt-5 border-t border-zinc-100 flex items-center justify-center gap-2 text-zinc-400 text-[11.5px] sm:text-xs">
                        <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="text-center">Ambiente seguro e em conformidade com a LGPD</span>
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
