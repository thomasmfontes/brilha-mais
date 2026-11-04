import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  UserCheck,
  Mail,
  Check,
} from "lucide-react";
import api from "../utils/api";
import { toast } from "react-hot-toast";
import logo from "../assets/logo.png";
import LoadingSpinner from "../components/LoadingSpinner";

export default function CompanyActivationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<{
    valid: boolean;
    companyId: string;
    name: string;
    tradeName?: string;
    cnpj?: string;
    contactName: string;
    contactEmail: string;
    termsAccepted: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Token de convite não encontrado no link.");
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await api.get(`/company/invitation/${token}`);
        setInvitation(res.data);
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            "Convite corporativo inválido ou expirado. Entre em contato com a coordenação do Brilha Mais.",
        );
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted) {
      toast.error("Você deve aceitar o Termo de Compromisso e Confidencialidade LGPD para prosseguir.");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas informadas não coincidem.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post("/company/activate", {
        inviteToken: token,
        password,
        termsAccepted,
      });

      if (res.data.access_token) {
        localStorage.setItem("auth_token", res.data.access_token);
        toast.success("Conta corporativa ativada com sucesso! Bem-vindo(a).");
        navigate("/empresa", { replace: true });
      } else {
        toast.success("Conta ativada com sucesso!");
        navigate("/login", { replace: true });
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ||
          "Não foi possível ativar sua conta. Verifique os dados e tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm font-medium text-zinc-600">
            Validando convite corporativo...
          </p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] text-zinc-900 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900">
        <header className="w-full max-w-5xl mx-auto px-6 py-6">
          <Link to="/" className="inline-block focus:outline-none">
            <img src={logo} alt="Brilha Mais" className="h-10 w-auto object-contain" />
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md bg-white border border-red-200/80 rounded-2xl p-7 sm:p-9 shadow-sm text-center">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 mb-2">Convite Indisponível</h1>
            <p className="text-sm text-zinc-600 leading-relaxed mb-6">{error}</p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-sm transition-all shadow-xs"
            >
              Ir para o Login
            </Link>
          </div>
        </main>

        <footer className="w-full max-w-5xl mx-auto px-6 py-6 text-center text-xs text-zinc-400">
          <p>&copy; 2026 Instituto Brilha Mais. Todos os direitos reservados.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-zinc-900 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900">
      {/* Central Document Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-2xl bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-9 shadow-sm">
          {/* Header with Centered Logo & Title */}
          <div className="flex flex-col items-center text-center mb-7 pb-6 border-b border-zinc-100">
            <Link to="/" className="mb-4 inline-block focus:outline-none">
              <img src={logo} alt="Brilha Mais" className="h-11 w-auto object-contain mx-auto" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              Ativação de Convênio Corporativo
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-md">
              Complete seu credenciamento e defina sua senha para acessar o Banco de Talentos da Rede Brilha Mais.
            </p>
          </div>

          {/* Company Details Box */}
          <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-4 sm:p-5 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
                  Empresa Conveniada
                </span>
                <h3 className="text-base font-semibold text-zinc-900 mt-0.5">
                  {invitation.name}
                </h3>
                {invitation.tradeName && (
                  <p className="text-xs text-zinc-500">{invitation.tradeName}</p>
                )}
              </div>
              {invitation.cnpj && (
                <div className="self-start">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-zinc-200/80 text-xs font-mono font-medium text-zinc-700 shadow-2xs">
                    CNPJ: {invitation.cnpj}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3.5 border-t border-zinc-200/60 text-xs">
              <div className="flex items-center gap-2 text-zinc-600">
                <UserCheck className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="truncate">
                  <strong className="text-zinc-800 font-medium">Responsável RH:</strong> {invitation.contactName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-zinc-600">
                <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="truncate">
                  <strong className="text-zinc-800 font-medium">E-mail:</strong> {invitation.contactEmail}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* LGPD / DPA Legal Agreement Box */}
            <div className="bg-white border border-zinc-200/80 rounded-xl p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center gap-2 text-zinc-900 font-semibold text-sm mb-3">
                <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Termo de Compromisso e Confidencialidade LGPD (DPA)</span>
              </div>

              <div className="text-xs text-zinc-600 space-y-2.5 max-h-36 overflow-y-auto pr-3 bg-zinc-50/80 p-3.5 rounded-lg border border-zinc-200/60 leading-relaxed font-sans custom-scrollbar mb-3.5">
                <p>
                  <strong className="text-zinc-800">1. Finalidade Estrita:</strong> A empresa conveniada declara que os dados pessoais e currículos disponibilizados na plataforma Brilha Mais serão utilizados única e exclusivamente para fins de processos de recrutamento e seleção de jovens alunos e aprendizes.
                </p>
                <p>
                  <strong className="text-zinc-800">2. Sigilo e Confidencialidade:</strong> É expressamente vedado transferir, ceder, alugar, sublicenciar ou compartilhar dados pessoais com quaisquer terceiros alheios ao processo seletivo institucional.
                </p>
                <p>
                  <strong className="text-zinc-800">3. Proteção aos Alunos e Menores:</strong> Em estrito cumprimento ao Estatuto da Criança e do Adolescente (ECA) e à LGPD (Lei nº 13.709/2018), os perfis de alunos menores de idade são submetidos a consentimento prévio dos responsáveis legais e curadoria pedagógica.
                </p>
                <p>
                  <strong className="text-zinc-800">4. Rastreabilidade e Auditoria:</strong> A empresa está ciente de que toda visualização e download de currículo é nominalmente registrada em log de auditoria técnica para salvaguarda dos direitos dos titulares de dados.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer select-none group">
                <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="sr-only peer"
                    required
                  />
                  <div
                    className={`w-4 h-4 rounded-md border transition-all flex items-center justify-center ${
                      termsAccepted
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "bg-white border-zinc-300 group-hover:border-zinc-400"
                    } peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500/30`}
                  >
                    {termsAccepted && (
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    )}
                  </div>
                </div>
                <span className="text-xs font-medium text-zinc-700 group-hover:text-zinc-900 transition-colors leading-relaxed">
                  Declaro que li e concordo integralmente com os <strong>Termos de Compromisso, Confidencialidade e LGPD</strong> em nome da empresa parceira.
                </span>
              </label>
            </div>

            {/* Password Setup */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-zinc-500" />
                Definição de Senha de Acesso Corporativo
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                      required
                      className="w-full h-11 px-3.5 pr-10 rounded-xl border border-zinc-200/90 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Confirmação de Senha
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a senha"
                    minLength={6}
                    required
                    className="w-full h-11 px-3.5 rounded-xl border border-zinc-200/90 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !termsAccepted}
                className="w-full h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-medium text-sm transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" variant="white" />
                    <span>Ativando Acesso...</span>
                  </>
                ) : (
                  <>
                    <span>Concluir e Acessar Banco de Talentos</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Professional Anchored Footer Bar */}
      <footer className="w-full border-t border-zinc-200/70 bg-white/70 backdrop-blur-xs mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <p>&copy; 2026 Instituto Brilha Mais. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link to="/termos" className="hover:text-zinc-600 transition-colors">Termos de Uso</Link>
            <span>·</span>
            <Link to="/privacidade" className="hover:text-zinc-600 transition-colors">Política de Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
