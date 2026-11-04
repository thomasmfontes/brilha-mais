import React, { useState, useRef, useEffect } from "react";
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
  ChevronDown,
  FileText,
  Briefcase,
  Archive,
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
    bg: "bg-sky-500",
    dot: "bg-sky-400",
    text: "text-white",
  },
  {
    key: "INTERVIEW",
    label: "EM ENTREVISTA",
    icon: Clock,
    bg: "bg-amber-500",
    dot: "bg-amber-400",
    text: "text-white",
  },
  {
    key: "HIRED",
    label: "CONTRATADO",
    icon: CheckCircle2,
    bg: "bg-emerald-600",
    dot: "bg-emerald-400",
    text: "text-white",
  },
  {
    key: "ARCHIVED",
    label: "BANCO DE RESERVA",
    icon: Archive,
    bg: "bg-slate-600",
    dot: "bg-slate-400",
    text: "text-white",
  },
] as const;

export default function CompanyTalentModal({
  talent,
  onClose,
  onStageChange,
}: CompanyTalentModalProps) {
  const [stage, setStage] = useState<string>(talent.currentStage || "SAVED");
  const [pendingStage, setPendingStage] = useState<string | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [notes, setNotes] = useState<string>(talent.interactionNotes || "");
  const [hiredRole, setHiredRole] = useState<string>(talent.hiredRole || "");
  const [showHiredDialog, setShowHiredDialog] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Close status dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(e.target as Node)
      ) {
        setIsStatusOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cleanPhone = talent.phone ? talent.phone.replace(/\D/g, "") : "";
  const whatsappUrl = cleanPhone
    ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(
        talent.user.name || "Aluno",
      )}!%20Vi%20seu%20perfil%20no%20Banco%20de%20Talentos%20do%20Brilha%20Mais.`
    : null;

  const currentStageConfig =
    CLICKUP_STAGES.find((s) => s.key === stage) || CLICKUP_STAGES[0];

  const handleStageSelect = async (newStage: string) => {
    setIsStatusOpen(false);
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
      onStageChange(talent.id, previousStage, notes);
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
      onStageChange(talent.id, previousStage, notes);
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
      onStageChange(talent.id, stage, notes, hiredRole);
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
    <PortalModal isOpen={true} onClose={onClose} className="relative z-[100000] w-full max-w-4xl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] text-left">
        {/* ClickUp Task Top Bar */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-600">Portal Corporativo</span>
            <span>/</span>
            <span>Funil de Contratação</span>
            <span>/</span>
            <span className="text-slate-900 font-medium truncate max-w-[180px]">
              {talent.user?.name || "Candidato"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {talent.linkedinUrl && (
              <a
                href={talent.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="h-7 px-2.5 rounded-md border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Abrir perfil no LinkedIn"
              >
                <ExternalLink className="w-3 h-3 text-blue-600" />
                <span className="hidden sm:inline">LinkedIn</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dialog for Hiring details (Modal overlay or header callout) */}
        {showHiredDialog && (
          <div className="p-4 sm:p-5 bg-emerald-50 border-b border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Confirmar Efetivação / Contratação</span>
            </div>
            <p className="text-xs text-emerald-800">
              Parabéns pela contratação! Informe o cargo acertado com o aluno para arquivamento no histórico de efetivação.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <input
                type="text"
                value={hiredRole}
                onChange={(e) => setHiredRole(e.target.value)}
                placeholder="Ex: Jovem Aprendiz Administrativo, Estagiário de RH..."
                className="w-full sm:flex-1 h-9 px-3 rounded-lg border border-emerald-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowHiredDialog(false)}
                  className="flex-1 sm:flex-initial h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
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
                  <span>Celebrar Contratação</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2-Column ClickUp Task Layout */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 custom-scrollbar">
          {/* LEFT COLUMN: Main Candidate Narrative (7 cols ~60%) */}
          <div className="lg:col-span-7 p-6 sm:p-7 space-y-6">
            {/* Candidate Title Section */}
            <div className="flex items-start gap-4">
              {talent.user?.avatarUrl ? (
                <img
                  src={talent.user.avatarUrl}
                  alt={talent.user.name}
                  className="w-14 h-14 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-700 font-bold text-xl flex items-center justify-center border border-slate-200 shrink-0 shadow-2xs">
                  {talent.user?.name ? talent.user.name.charAt(0).toUpperCase() : "A"}
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                    {talent.user?.name || "Aluno"}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Disponível
                  </span>
                </div>

                <p className="text-sm font-medium text-slate-600 leading-snug">
                  {talent.headline || "Jovem Aprendiz / Primeiro Emprego"}
                </p>
              </div>
            </div>

            {/* ClickUp Tags / Áreas de Interesse */}
            {talent.areasOfInterest && talent.areasOfInterest.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tags & Competências
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
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide shadow-2xs ${
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

            {/* Sobre o Aluno (Description) */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Sobre o Aluno / Apresentação
              </span>
              {talent.bio ? (
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {talent.bio}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  O aluno ainda não preencheu o resumo de apresentação pessoal.
                </p>
              )}
            </div>

            {/* Anotações do Recrutador (ClickUp Notes Card) */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Anotações Internas da Empresa
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Privado do seu RH</span>
              </div>

              <div className="relative">
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Escreva impressões de entrevista, alinhamentos salariais, disponibilidade ou observações confidenciais..."
                  className="w-full p-3.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-colors resize-none shadow-2xs"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={isSavingNotes}
                    className="h-8 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingNotes ? (
                      <LoadingSpinner size="sm" variant="white" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>Salvar Anotações</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: ClickUp Status, Direct Actions & Properties (5 cols ~40%) */}
          <div className="lg:col-span-5 bg-slate-50/50 p-6 sm:p-7 space-y-6">
            {/* Status Selector (Single ClickUp Pill with Dropdown) */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Status no Processo
              </span>

              <div className="relative" ref={statusDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsStatusOpen(!isStatusOpen)}
                  className={`w-full px-3.5 py-2 rounded-lg text-xs font-bold tracking-wider uppercase flex items-center justify-between transition-all cursor-pointer shadow-2xs ${currentStageConfig.bg} ${currentStageConfig.text}`}
                >
                  <div className="flex items-center gap-2">
                    <currentStageConfig.icon className="w-3.5 h-3.5" />
                    <span>{currentStageConfig.label}</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isStatusOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* ClickUp Dropdown Menu */}
                {isStatusOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 z-50 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    {CLICKUP_STAGES.map((s) => {
                      const isSelected = stage === s.key;
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => handleStageSelect(s.key)}
                          className={`w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-slate-100 text-slate-900 font-bold"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${s.bg}`} />
                            <span className="text-[11px] uppercase tracking-wider">
                              {s.label}
                            </span>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {stage === "HIRED" && (talent.hiredRole || hiredRole) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-800 font-medium flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    Cargo: <strong>{hiredRole || talent.hiredRole}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Direct Contact Actions */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Ações Rápidas
              </span>

              <div className="space-y-2">
                {talent.resumeUrl ? (
                  <button
                    type="button"
                    onClick={handleDownloadResume}
                    disabled={isDownloading}
                    className="w-full h-9 px-3.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 shadow-2xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <LoadingSpinner size="sm" variant="current" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-slate-700" />
                    )}
                    <span>Baixar Currículo PDF</span>
                  </button>
                ) : (
                  <div className="w-full h-9 px-3.5 rounded-lg text-xs font-medium text-slate-400 bg-white border border-slate-200 flex items-center justify-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-300" />
                    <span>Currículo não anexado</span>
                  </div>
                )}

                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full h-9 px-3.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Conversar no WhatsApp</span>
                  </a>
                )}
              </div>
            </div>

            {/* ClickUp Properties Table (Compact Meta List) */}
            <div className="space-y-2 pt-2 border-t border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Propriedades do Candidato
              </span>

              <div className="space-y-2.5 text-xs">
                {/* Localidade */}
                <div className="flex items-start justify-between gap-2 py-1 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Localidade</span>
                  </div>
                  <span className="font-semibold text-slate-800 text-right truncate">
                    {talent.city
                      ? `${talent.city}${talent.state ? `/${talent.state}` : ""}`
                      : "Não informado"}
                  </span>
                </div>

                {/* Disponibilidade */}
                <div className="flex items-start justify-between gap-2 py-1 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Disponibilidade</span>
                  </div>
                  <span className="font-semibold text-slate-800 text-right">
                    {formatAvailability(talent.availability) || "Não informado"}
                  </span>
                </div>

                {/* Idade */}
                <div className="flex items-start justify-between gap-2 py-1 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Idade / Nasc.</span>
                  </div>
                  <span className="font-semibold text-slate-800 text-right">
                    {talent.birthDate ? (
                      <>
                        {age !== null ? `${age} anos` : ""}
                        <span className="text-slate-400 font-normal ml-1">
                          ({new Date(talent.birthDate).toLocaleDateString("pt-BR")})
                        </span>
                      </>
                    ) : (
                      "Não informado"
                    )}
                  </span>
                </div>

                {/* Turma / Formação */}
                <div className="flex items-start justify-between gap-2 py-1 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-400 shrink-0">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Turma / Trilha</span>
                  </div>
                  <span
                    className="font-semibold text-slate-800 text-right truncate max-w-[170px]"
                    title={turmasText}
                  >
                    {turmasText}
                  </span>
                </div>

                {/* E-mail */}
                {talent.user?.email && (
                  <div className="flex items-start justify-between gap-2 py-1 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400 shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                      <span>E-mail</span>
                    </div>
                    <span
                      className="font-medium text-slate-800 text-right truncate max-w-[170px]"
                      title={talent.user.email}
                    >
                      {talent.user.email}
                    </span>
                  </div>
                )}

                {/* Telefone */}
                {talent.phone && (
                  <div className="flex items-start justify-between gap-2 py-1 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400 shrink-0">
                      <Phone className="w-3.5 h-3.5" />
                      <span>Telefone</span>
                    </div>
                    <span className="font-semibold text-slate-800 text-right">
                      {formatPhoneDisplay(talent.phone)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* LGPD Audit Badge */}
            <div className="p-3 rounded-xl bg-white border border-slate-200/90 flex items-start gap-2.5 text-[11px] text-slate-500 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                Currículo compartilhado sob consentimento expresso LGPD com auditoria nominal de acesso.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="h-8.5 px-5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shadow-2xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </PortalModal>
  );
}
