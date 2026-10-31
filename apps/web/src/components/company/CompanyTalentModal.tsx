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
    FLEXIVEL: "Flexível",
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

  return (
    <PortalModal isOpen={true} onClose={onClose} className="relative z-[100000] w-full max-w-4xl">
      <div className="bg-white rounded-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200/80 overflow-hidden text-left">
        
        {/* Header do Aluno */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-white">
          <div className="flex items-center gap-4 min-w-0">
            {talent.user.avatarUrl ? (
              <img
                src={talent.user.avatarUrl}
                alt={talent.user.name}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200/80 shadow-2xs shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 font-bold text-xl flex items-center justify-center border border-amber-200/80 shadow-2xs shrink-0">
                {talent.user.name?.charAt(0) || "A"}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight truncate">
                  {talent.user.name}
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Disponível para Contratação
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-600 truncate mt-0.5">
                {talent.headline || "Aluno em Formação Profissional"}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                {talent.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {talent.city}{talent.state ? ` - ${talent.state}` : ""}
                  </span>
                )}
                {talent.availability && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Turno: {formatAvailability(talent.availability)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Funnel Stage Selector Bar */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-700">
              Status no Processo:
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
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
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
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-lg px-3 py-1 text-xs text-emerald-800 font-medium shrink-0 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cargo: <strong>{hiredRole || talent.hiredRole}</strong></span>
            </div>
          )}
        </div>

        {/* Dialog for Hiring details */}
        {showHiredDialog && (
          <div className="px-6 py-4 bg-amber-50/70 border-b border-amber-200/80 space-y-3">
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

        {/* Content Body: 2-Column High-End Layout */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Coluna Principal: Perfil, Formação e Anotações (8 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Apresentação Pessoal & Objetivo */}
              {talent.bio && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-800 tracking-wider uppercase">
                    Apresentação & Perfil
                  </h3>
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {talent.bio}
                  </div>
                </div>
              )}

              {/* Formação Pedagógica no Brilha Mais */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-800 tracking-wider uppercase">
                  Formação Pedagógica
                </h3>
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-900 block">
                      Aluno em Formação Cidadã e Habilidades para o Trabalho
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Turma: {talent.user.turmas && talent.user.turmas.length > 0 ? talent.user.turmas.map((t) => t.name).join(", ") : "Turma Geral Institucional"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Áreas de Interesse */}
              {talent.areasOfInterest && talent.areasOfInterest.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-800 tracking-wider uppercase">
                    Áreas de Interesse Profissional
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {talent.areasOfInterest.map((area, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Anotações Privadas do RH */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-800 tracking-wider uppercase">
                      Anotações da sua Equipe (Privado)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Visível exclusivamente para os recrutadores da sua organização.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="h-7 px-3 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-lg text-xs font-medium transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
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
                  placeholder="Ex: Entrevista agendada para terça às 14h. Perfil comunicativo, interessado em área administrativa..."
                  className="w-full p-3.5 rounded-2xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none"
                />
              </div>
            </div>

            {/* Coluna Lateral: Currículo, Contato Direto e Auditoria (4 cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Card de Currículo PDF */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-slate-900">
                      Currículo do Aluno
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate">
                      {talent.resumeUrl ? "Documento em PDF disponível" : "Nenhum currículo anexado"}
                    </p>
                  </div>
                </div>

                {talent.resumeUrl ? (
                  <button
                    type="button"
                    onClick={handleDownloadResume}
                    disabled={isDownloading}
                    className="w-full h-10 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-xl font-medium text-xs shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isDownloading ? (
                      <LoadingSpinner size="sm" variant="white" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span>Baixar Currículo PDF</span>
                  </button>
                ) : (
                  <div className="text-xs text-slate-400 italic text-center py-2 bg-white/60 rounded-xl border border-dashed border-slate-200">
                    Currículo ainda não disponibilizado
                  </div>
                )}
              </div>

              {/* Card de Canais de Contato */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 space-y-3">
                <h4 className="text-xs font-semibold text-slate-800 tracking-wider uppercase text-[11px]">
                  Canais de Contato Direto
                </h4>

                <div className="space-y-2">
                  {/* WhatsApp */}
                  {whatsappUrl ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 text-emerald-800 transition-colors text-xs font-medium cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate">WhatsApp</span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-700 font-semibold shrink-0">
                        {formatPhoneDisplay(cleanPhone)}
                      </span>
                    </a>
                  ) : (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>Telefone não informado</span>
                    </div>
                  )}

                  {/* Email */}
                  <a
                    href={`mailto:${talent.user.email}`}
                    className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-xs text-slate-700"
                  >
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{talent.user.email}</span>
                  </a>

                  {/* LinkedIn */}
                  {talent.linkedinUrl && (
                    <a
                      href={talent.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 text-blue-800 transition-colors text-xs font-medium"
                    >
                      <ExternalLink className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate">Ver Perfil no LinkedIn</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Card de Auditoria & LGPD */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  <strong className="text-slate-700 block mb-0.5">Conformidade LGPD</strong>
                  O acesso aos dados e currículo deste aluno foi autorizado formalmente e está registrado para fins de auditoria.
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 rounded-b-2xl flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </PortalModal>
  );
}
