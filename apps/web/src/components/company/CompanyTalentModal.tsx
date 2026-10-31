import React, { useState } from "react";
import {
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  FileText,
  Download,
  ExternalLink,
  MessageCircle,
  Clock,
  Sparkles,
  Building2,
  CheckCircle2,
  Bookmark,
  Users,
  Award,
  ChevronDown,
  Info,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";
import api from "../../utils/api";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../LoadingSpinner";
import { PortalModal } from "../PortalModal";

// Helpers
function formatAvailability(avail?: string | null) {
  if (!avail) return "";
  const map: Record<string, string> = {
    MANHA: "Manhã",
    TARDE: "Tarde",
    NOITE: "Noite",
    INTEGRAL: "Integral",
    FLEXIVEL: "Horário Flexível",
  };
  return map[avail.toUpperCase()] || avail;
}

function formatPhoneDisplay(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function calculateAge(dateStr?: string | null) {
  if (!dateStr) return null;
  const birth = new Date(dateStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export interface CompanyTalent {
  id: string;
  userId: string;
  phone?: string | null;
  birthDate?: string | null;
  city?: string | null;
  state?: string | null;
  headline?: string | null;
  bio?: string | null;
  areasOfInterest?: string[];
  availability?: string | null;
  linkedinUrl?: string | null;
  resumeUrl?: string | null;
  resumeFileName?: string | null;
  currentStage?: "SAVED" | "INTERVIEW" | "HIRED" | "ARCHIVED" | null;
  interactionNotes?: string | null;
  hiredRole?: string | null;
  hiredAt?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    turmas?: Array<{ id: string; name: string }>;
  };
}

interface CompanyTalentModalProps {
  talent: CompanyTalent;
  onClose: () => void;
  onStageChange: (talentId: string, newStage: string, notes?: string, hiredRole?: string) => void;
}

const STAGE_CONFIG = {
  SAVED: {
    label: "Salvo no Radar",
    bg: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Bookmark,
  },
  INTERVIEW: {
    label: "Em Entrevista",
    bg: "bg-amber-50 text-amber-800 border-amber-200",
    icon: Users,
  },
  HIRED: {
    label: "Contratado",
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Award,
  },
  ARCHIVED: {
    label: "Arquivado",
    bg: "bg-slate-100 text-slate-600 border-slate-200",
    icon: Clock,
  },
};

export default function CompanyTalentModal({
  talent,
  onClose,
  onStageChange,
}: CompanyTalentModalProps) {
  const [stage, setStage] = useState<string | null>(talent.currentStage || null);
  const [pendingStage, setPendingStage] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>(talent.interactionNotes || "");
  const [hiredRole, setHiredRole] = useState<string>(talent.hiredRole || "");
  const [showHiredDialog, setShowHiredDialog] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const cleanPhone = talent.phone ? talent.phone.replace(/\D/g, "") : "";
  const whatsappUrl = cleanPhone
    ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(
        talent.user.name || "Aluno",
      )}!%20Vi%20seu%20perfil%20no%20Banco%20de%20Talentos%20do%20Brilha%20Mais.`
    : null;

  const handleStageSelect = async (newStage: string) => {
    if (newStage === stage) return;

    if (newStage === "HIRED") {
      setShowHiredDialog(true);
      return;
    }

    const previousStage = stage;
    setPendingStage(newStage);
    // Optimistic UI update: instantly reflect selection and update parent lists/counts
    setStage(newStage);
    onStageChange(talent.id, newStage, notes);

    try {
      await api.put(`/company/talents/${talent.id}/stage`, {
        stage: newStage,
        notes,
      });
      toast.success(
        `Candidato movido para ${STAGE_CONFIG[newStage as keyof typeof STAGE_CONFIG]?.label || newStage}!`,
      );
    } catch (err: any) {
      // Revert upon error
      setStage(previousStage);
      onStageChange(talent.id, previousStage || "", notes);
      toast.error(
        err.response?.data?.message || "Erro ao atualizar etapa do candidato.",
      );
    } finally {
      setPendingStage(null);
    }
  };

  const handleConfirmHired = async () => {
    if (!hiredRole.trim()) {
      toast.error("Por favor, informe o cargo da contratação.");
      return;
    }

    const previousStage = stage;
    setPendingStage("HIRED");
    setStage("HIRED");
    setShowHiredDialog(false);
    onStageChange(talent.id, "HIRED", notes, hiredRole.trim());

    try {
      await api.put(`/company/talents/${talent.id}/stage`, {
        stage: "HIRED",
        hiredRole: hiredRole.trim(),
        notes,
      });
      toast.success("Parabéns pela contratação! Evento registrado com sucesso.");
    } catch (err: any) {
      setStage(previousStage);
      onStageChange(talent.id, previousStage || "", notes);
      toast.error(
        err.response?.data?.message || "Erro ao confirmar contratação.",
      );
    } finally {
      setPendingStage(null);
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await api.put(`/company/talents/${talent.id}/stage`, {
        stage: stage || undefined,
        notes,
        hiredRole: stage === "HIRED" ? hiredRole : undefined,
      });
      onStageChange(talent.id, stage || "", notes, hiredRole);
      toast.success("Anotações da empresa salvas.");
    } catch (err: any) {
      toast.error("Erro ao salvar anotações.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDownloadResume = async () => {
    if (!talent.resumeUrl) {
      toast.error("Este aluno ainda não anexou arquivo de currículo.");
      return;
    }

    setIsDownloading(true);
    try {
      // Nominal audit download call
      const res = await api.get(`/company/talents/${talent.id}/resume`);
      const url = res.data?.resumeUrl || talent.resumeUrl;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error("Não foi possível carregar o currículo.");
    } finally {
      setIsDownloading(false);
    }
  };

  const age = calculateAge(talent.birthDate);
  const turmasText =
    talent.user?.turmas && talent.user.turmas.length > 0
      ? talent.user.turmas.map((t) => t.name).join(", ")
      : "Turma Geral Institucional";

  return (
    <PortalModal isOpen={true} onClose={onClose} className="relative z-[100000] w-full max-w-2xl">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200/80 overflow-hidden flex flex-col max-h-[90vh] text-left">
        {/* Header do Perfil */}
        <div className="p-4 sm:p-6 pb-3.5 sm:pb-4 border-b border-zinc-100 bg-white relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1 pr-8 sm:pr-0">
              {talent.user?.avatarUrl ? (
                <img
                  src={talent.user.avatarUrl}
                  alt={talent.user.name}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border border-zinc-200/80 shrink-0 shadow-2xs mt-0.5 sm:mt-0"
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-50 text-[#F19B0A] font-semibold text-lg sm:text-xl flex items-center justify-center border border-amber-200/60 shrink-0 shadow-2xs mt-0.5 sm:mt-0">
                  {talent.user?.name ? talent.user.name.charAt(0).toUpperCase() : "A"}
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight leading-snug truncate">
                    {talent.user?.name || "Aluno"}
                  </h3>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Disponível
                  </span>
                </div>

                {talent.headline && (
                  <p
                    className="text-xs sm:text-sm font-medium text-zinc-700 leading-snug line-clamp-2"
                    title={talent.headline}
                  >
                    {talent.headline}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500 pt-0.5">
                  {talent.user?.email && (
                    <span className="break-all">{talent.user.email}</span>
                  )}
                  {(talent.phone || talent.city) && (
                    <div className="flex items-center gap-1.5 shrink-0 text-zinc-500">
                      {talent.user?.email && <span className="text-zinc-300 hidden sm:inline">•</span>}
                      {talent.phone && <span>{formatPhoneDisplay(talent.phone)}</span>}
                      {talent.phone && talent.city && <span className="text-zinc-300">•</span>}
                      {talent.city && (
                        <span>
                          {talent.city}
                          {talent.state ? `/${talent.state}` : ""}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0 absolute top-3.5 right-3.5 sm:relative sm:top-auto sm:right-auto"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Ações Rápidas */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-4 pt-3.5 border-t border-zinc-100">
            {talent.resumeUrl ? (
              <button
                type="button"
                onClick={handleDownloadResume}
                disabled={isDownloading}
                className="h-9 sm:h-8 px-4 rounded-xl text-xs font-semibold bg-[#F19B0A] hover:bg-[#D98B08] active:scale-[0.98] text-white shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer w-full sm:w-auto disabled:opacity-50"
              >
                {isDownloading ? (
                  <LoadingSpinner size="sm" variant="white" />
                ) : (
                  <Download className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>Baixar Currículo</span>
              </button>
            ) : (
              <span className="h-9 sm:h-8 px-4 rounded-xl text-xs font-medium text-zinc-400 bg-zinc-50 border border-zinc-200/80 flex items-center justify-center gap-2 w-full sm:w-auto">
                <FileText className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                <span>Sem currículo anexado</span>
              </span>
            )}

            {(whatsappUrl || talent.linkedinUrl) && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 sm:h-8 px-3.5 rounded-xl text-xs font-semibold bg-white hover:bg-emerald-50 text-zinc-800 hover:text-emerald-700 border border-zinc-200/80 hover:border-emerald-300 shadow-2xs flex-1 sm:flex-none flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>WhatsApp</span>
                  </a>
                )}

                {talent.linkedinUrl && (
                  <a
                    href={talent.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="h-9 sm:h-8 px-3.5 rounded-xl text-xs font-semibold bg-white hover:bg-blue-50 text-zinc-800 hover:text-blue-700 border border-zinc-200/80 hover:border-blue-300 shadow-2xs flex-1 sm:flex-none flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>LinkedIn</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Barra de Status no Processo Seletivo da Empresa */}
        <div className="p-4 sm:p-5 bg-zinc-50/70 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-900 block">
              Etapa no seu Processo
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(["SAVED", "INTERVIEW", "HIRED", "ARCHIVED"] as const).map((s) => {
                const cfg = STAGE_CONFIG[s];
                const isSelected = stage === s;
                const isPending = pendingStage === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStageSelect(s)}
                    disabled={pendingStage !== null}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${
                      isSelected
                        ? `${cfg.bg} shadow-2xs font-semibold ring-1 ring-amber-500/30`
                        : "bg-white text-zinc-600 border-zinc-200/80 hover:bg-zinc-50 hover:text-zinc-900"
                    } ${pendingStage !== null && !isPending ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {isPending ? (
                      <LoadingSpinner size="xs" variant="current" />
                    ) : (
                      <cfg.icon className="w-3.5 h-3.5" />
                    )}
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {stage === "HIRED" && (talent.hiredRole || hiredRole) && (
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-lg px-3 py-1.5 text-xs text-emerald-800 font-medium shrink-0 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cargo: <strong>{hiredRole || talent.hiredRole}</strong></span>
            </div>
          )}
        </div>

        {/* Dialog for Hiring details */}
        {showHiredDialog && (
          <div className="p-4 sm:p-5 bg-amber-50/70 border-b border-amber-200/80 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs sm:text-sm">
              <Award className="w-4 h-4 text-amber-600" />
              <span>Registrar Contratação Efetivada</span>
            </div>
            <p className="text-xs text-amber-800">
              Ao celebrar a contratação, informe o cargo acertado com o aluno para fins estatísticos e acompanhamento da coordenação.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={hiredRole}
                onChange={(e) => setHiredRole(e.target.value)}
                placeholder="Ex: Jovem Aprendiz Administrativo, Estagiário de TI..."
                className="w-full sm:flex-1 h-9.5 px-3.5 rounded-xl border border-amber-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowHiredDialog(false)}
                  className="flex-1 sm:flex-initial h-9.5 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmHired}
                  disabled={pendingStage === "HIRED"}
                  className="flex-1 sm:flex-initial h-9.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  {pendingStage === "HIRED" ? (
                    <LoadingSpinner size="sm" variant="white" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Confirmar Contratação</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo do Modal (Seguindo rigorosamente o TalentDetailsModal) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 custom-scrollbar">
          {/* Grid de Informações Chave */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-50/60 border border-zinc-200/60 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200/70 flex items-center justify-center text-zinc-500 shrink-0 shadow-2xs">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-zinc-500 font-medium block">Turma(s)</span>
                <p className="text-sm font-semibold text-zinc-900 mt-0.5 truncate" title={turmasText}>
                  {turmasText}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50/60 border border-zinc-200/60 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200/70 flex items-center justify-center text-zinc-500 shrink-0 shadow-2xs">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-zinc-500 font-medium block">Localidade</span>
                <p className="text-sm font-semibold text-zinc-900 mt-0.5 truncate">
                  {talent.city ? `${talent.city}${talent.state ? ` - ${talent.state}` : ""}` : "Não informado"}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50/60 border border-zinc-200/60 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200/70 flex items-center justify-center text-zinc-500 shrink-0 shadow-2xs">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-zinc-500 font-medium block">Disponibilidade</span>
                <p className="text-sm font-semibold text-zinc-900 mt-0.5 truncate">
                  {formatAvailability(talent.availability) || "Não informado"}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50/60 border border-zinc-200/60 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200/70 flex items-center justify-center text-zinc-500 shrink-0 shadow-2xs">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-zinc-500 font-medium block">Idade / Nascimento</span>
                <p className="text-sm font-semibold text-zinc-900 mt-0.5 truncate">
                  {talent.birthDate ? (
                    <>
                      {age !== null ? `${age} anos` : ""}
                      <span className="text-xs font-normal text-zinc-500 ml-1">
                        ({new Date(talent.birthDate).toLocaleDateString("pt-BR")})
                      </span>
                    </>
                  ) : (
                    "Não informado"
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Áreas de Interesse */}
          {talent.areasOfInterest && talent.areasOfInterest.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-100">
              <h4 className="text-xs font-semibold text-zinc-900">Áreas de Interesse</h4>
              <div className="flex flex-wrap gap-2">
                {talent.areasOfInterest.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sobre o Aluno (Bio) */}
          {talent.bio && (
            <div className="space-y-2 pt-2 border-t border-zinc-100">
              <h4 className="text-xs font-semibold text-zinc-900">Sobre o Aluno</h4>
              <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line bg-zinc-50/50 rounded-xl p-4 border border-zinc-200/50">
                {talent.bio}
              </p>
            </div>
          )}

          {/* Anotações Internas do seu RH (Privado) */}
          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-zinc-900">
                  Anotações da sua Equipe (Privado)
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Visível apenas para recrutadores credenciados da sua empresa.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="h-7 px-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-lg text-xs font-medium transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingNotes ? (
                  <LoadingSpinner size="sm" variant="white" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Salvar</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Entrevista agendada para terça às 14h. Perfil com boa comunicação e domínio do Pacote Office..."
              className="w-full p-3.5 rounded-xl border border-zinc-200/80 bg-white text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none"
            />
          </div>

          {/* Conformidade LGPD */}
          <div className="pt-2 border-t border-zinc-100">
            <div className="p-3.5 rounded-xl bg-zinc-50/60 border border-zinc-200/70 flex items-center gap-2.5 text-xs text-zinc-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Acesso auditado nominalmente. Currículo e dados compartilhados sob estrito termo de consentimento LGPD.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-3.5 sm:p-4 px-4 sm:px-6 border-t border-zinc-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-10 px-5 rounded-xl text-xs font-semibold bg-white border border-zinc-200/80 hover:bg-zinc-50 text-zinc-700 active:scale-[0.98] shadow-2xs transition-all cursor-pointer flex items-center justify-center"
          >
            Fechar
          </button>
        </div>
      </div>
    </PortalModal>
  );
}
