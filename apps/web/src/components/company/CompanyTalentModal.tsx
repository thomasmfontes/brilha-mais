import React, { useState } from "react";
import {
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Download,
  ExternalLink,
  MessageCircle,
  Clock,
  CheckCircle2,
  Bookmark,
  Users,
  Award,
  ShieldCheck,
  GraduationCap,
  StickyNote,
  Flag,
  FileText,
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
  onStageChange: (
    talentId: string,
    newStage: string,
    notes?: string,
    hiredRole?: string,
  ) => void;
}

// ClickUp Stage Definitions (Solid Pill colors matching Kanban board)
const CLICKUP_STAGES = [
  {
    key: "SAVED",
    label: "TRIAGEM / RADAR",
    icon: Bookmark,
    pillClass: "bg-sky-500 text-white hover:bg-sky-600",
    activeClass: "bg-sky-500 text-white shadow-xs ring-2 ring-sky-300",
  },
  {
    key: "INTERVIEW",
    label: "EM ENTREVISTA",
    icon: Clock,
    pillClass: "bg-amber-500 text-white hover:bg-amber-600",
    activeClass: "bg-amber-500 text-white shadow-xs ring-2 ring-amber-300",
  },
  {
    key: "HIRED",
    label: "CONTRATADO",
    icon: CheckCircle2,
    pillClass: "bg-emerald-600 text-white hover:bg-emerald-700",
    activeClass: "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300",
  },
  {
    key: "ARCHIVED",
    label: "BANCO DE RESERVA",
    icon: Bookmark,
    pillClass: "bg-slate-600 text-white hover:bg-slate-700",
    activeClass: "bg-slate-600 text-white shadow-xs ring-2 ring-slate-400",
  },
] as const;

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
    setStage(newStage);
    onStageChange(talent.id, newStage, notes);

    try {
      await api.put(`/company/talents/${talent.id}/stage`, {
        stage: newStage,
        notes,
      });
      const stageConfig = CLICKUP_STAGES.find((s) => s.key === newStage);
      toast.success(
        `Candidato movido para ${stageConfig?.label || newStage}!`,
      );
    } catch (err: any) {
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
      toast.success("Anotações salvas com sucesso.");
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-left">
        {/* ClickUp-Style Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
              {talent.user?.avatarUrl ? (
                <img
                  src={talent.user.avatarUrl}
                  alt={talent.user.name}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-100 text-slate-700 font-bold text-lg sm:text-xl flex items-center justify-center border border-slate-200 shrink-0 shadow-2xs">
                  {talent.user?.name ? talent.user.name.charAt(0).toUpperCase() : "A"}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug truncate">
                    {talent.user?.name || "Aluno"}
                  </h3>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Disponível
                  </span>
                </div>

                {talent.headline && (
                  <p
                    className="text-xs sm:text-sm font-medium text-slate-600 leading-snug line-clamp-2 mt-0.5"
                    title={talent.headline}
                  >
                    {talent.headline}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 pt-1">
                  {talent.user?.email && (
                    <span className="text-slate-500 font-normal">{talent.user.email}</span>
                  )}
                  {talent.phone && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500">{formatPhoneDisplay(talent.phone)}</span>
                    </>
                  )}
                  {talent.city && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500">
                        {talent.city}
                        {talent.state ? `/${talent.state}` : ""}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Contact & CV Actions */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 flex-wrap">
            {talent.resumeUrl ? (
              <button
                type="button"
                onClick={handleDownloadResume}
                disabled={isDownloading}
                className="h-8 px-3.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDownloading ? (
                  <LoadingSpinner size="sm" variant="white" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Baixar Currículo PDF</span>
              </button>
            ) : (
              <span className="h-8 px-3 rounded-lg text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-300" />
                <span>Sem currículo anexado</span>
              </span>
            )}

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="h-8 px-3 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Conversar no WhatsApp</span>
              </a>
            )}

            {talent.linkedinUrl && (
              <a
                href={talent.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="h-8 px-3 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>Perfil LinkedIn</span>
              </a>
            )}
          </div>
        </div>

        {/* ClickUp-Style Status Bar */}
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Status no Processo:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {CLICKUP_STAGES.map((s) => {
                const isSelected = stage === s.key;
                const isPending = pendingStage === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => handleStageSelect(s.key)}
                    disabled={pendingStage !== null}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wider uppercase inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? s.activeClass
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                    } ${pendingStage !== null && !isPending ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {isPending ? (
                      <LoadingSpinner size="xs" variant="current" />
                    ) : (
                      <s.icon className="w-3 h-3" />
                    )}
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {stage === "HIRED" && (talent.hiredRole || hiredRole) && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1 text-xs text-emerald-800 font-medium shrink-0 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cargo: <strong>{hiredRole || talent.hiredRole}</strong></span>
            </div>
          )}
        </div>

        {/* Dialog for Hiring details */}
        {showHiredDialog && (
          <div className="p-4 sm:p-5 bg-amber-50/80 border-b border-amber-200 space-y-3">
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
                placeholder="Ex: Jovem Aprendiz Administrativo, Estagiário de RH..."
                className="w-full sm:flex-1 h-9 px-3 rounded-lg border border-amber-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowHiredDialog(false)}
                  className="flex-1 sm:flex-initial h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmHired}
                  disabled={pendingStage === "HIRED"}
                  className="flex-1 sm:flex-initial h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
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

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {/* ClickUp-Style Clean Attributes Table / Grid */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl divide-y divide-slate-200/70">
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/70">
              <div className="p-3.5 flex items-start gap-3">
                <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <GraduationCap className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
                    Turma / Formação
                  </span>
                  <p className="text-xs font-medium text-slate-800 mt-0.5 truncate" title={turmasText}>
                    {turmasText}
                  </p>
                </div>
              </div>

              <div className="p-3.5 flex items-start gap-3">
                <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <MapPin className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
                    Localidade
                  </span>
                  <p className="text-xs font-medium text-slate-800 mt-0.5 truncate">
                    {talent.city ? `${talent.city}${talent.state ? ` - ${talent.state}` : ""}` : "Não informado"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/70">
              <div className="p-3.5 flex items-start gap-3">
                <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <Clock className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
                    Disponibilidade / Turno
                  </span>
                  <p className="text-xs font-medium text-slate-800 mt-0.5 truncate">
                    {formatAvailability(talent.availability) || "Não informado"}
                  </p>
                </div>
              </div>

              <div className="p-3.5 flex items-start gap-3">
                <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                  <Calendar className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
                    Idade / Nascimento
                  </span>
                  <p className="text-xs font-medium text-slate-800 mt-0.5 truncate">
                    {talent.birthDate ? (
                      <>
                        {age !== null ? `${age} anos` : ""}
                        <span className="text-slate-400 ml-1">
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
          </div>

          {/* ClickUp Style Tags (Áreas de Interesse) */}
          {talent.areasOfInterest && talent.areasOfInterest.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Áreas de Interesse / Competências
              </span>
              <div className="flex flex-wrap gap-1.5">
                {talent.areasOfInterest.map((tag, idx) => {
                  const bgColors = [
                    "bg-indigo-600 text-white",
                    "bg-blue-600 text-white",
                    "bg-violet-600 text-white",
                    "bg-sky-600 text-white",
                  ];
                  return (
                    <span
                      key={idx}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold shadow-2xs ${
                        bgColors[idx % bgColors.length]
                      }`}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sobre o Aluno (Bio) */}
          {talent.bio && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Sobre o Aluno / Apresentação
              </span>
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {talent.bio}
              </div>
            </div>
          )}

          {/* Recruiter Internal Notes (ClickUp Task Notes) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Anotações da sua Equipe (Privado da Empresa)
                </span>
              </div>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="h-7 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-xs font-medium transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingNotes ? (
                  <LoadingSpinner size="sm" variant="white" />
                ) : (
                  <CheckCircle2 className="w-3 h-3" />
                )}
                <span>Salvar Anotações</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Entrevista agendada para quarta às 14h. Demonstrou ótima desenvoltura e interesse..."
              className="w-full p-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-colors resize-none shadow-2xs"
            />
          </div>

          {/* LGPD Compliance Footer Box */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Acesso corporativo auditado nominalmente com autorização formal sob as diretrizes da LGPD.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end p-4 px-6 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shadow-2xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </PortalModal>
  );
}
