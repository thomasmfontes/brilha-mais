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
  Linkedin,
  Plus,
  AlertCircle,
} from "lucide-react";
import api from "../../utils/api";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../LoadingSpinner";
import { PortalModal } from "../PortalModal";
import { ConfirmModal } from "../ConfirmModal";
import WhatsAppIcon from "../WhatsAppIcon";

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
    newStage: string | null,
    notes?: string,
    hiredRole?: string,
  ) => void;
}

// ClickUp / Linear Stage Definitions (Clean soft pills matching modern ATS design)
const CLICKUP_STAGES = [
  {
    key: "SAVED",
    label: "TRIAGEM",
    icon: Bookmark,
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-800",
    dot: "bg-sky-500",
  },
  {
    key: "INTERVIEW",
    label: "ENTREVISTA",
    icon: Clock,
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  {
    key: "HIRED",
    label: "CONTRATADO",
    icon: CheckCircle2,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    dot: "bg-emerald-500",
  },
  {
    key: "ARCHIVED",
    label: "ARQUIVADO",
    icon: Archive,
    bg: "bg-slate-100",
    border: "border-slate-200",
    text: "text-slate-700",
    dot: "bg-slate-400",
  },
] as const;

export default function CompanyTalentModal({
  talent,
  onClose,
  onStageChange,
}: CompanyTalentModalProps) {
  const [stage, setStage] = useState<string | null>(talent.currentStage || null);
  const [pendingStage, setPendingStage] = useState<string | null>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [notes, setNotes] = useState<string>(talent.interactionNotes || "");
  const [hiredRole, setHiredRole] = useState<string>(talent.hiredRole || "");
  const [showHiredDialog, setShowHiredDialog] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Synchronize state whenever a talent is opened or changed
  useEffect(() => {
    setStage(talent.currentStage || null);
    if (talent.interactionNotes !== undefined) {
      setNotes(talent.interactionNotes || "");
    }
    if (talent.hiredRole !== undefined) {
      setHiredRole(talent.hiredRole || "");
    }
  }, [talent.id, talent.currentStage, talent.interactionNotes, talent.hiredRole]);

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

  const isInPipeline = Boolean(stage);
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

  const handleConfirmRemove = async () => {
    const previousStage = stage;
    setIsRemoving(true);
    try {
      await api.delete(`/company/talents/${talent.id}/stage`);
      setStage(null);
      setShowRemoveConfirm(false);
      onStageChange(talent.id, null);
      toast.success("Candidato removido do seu processo seletivo.");
    } catch (err: any) {
      setStage(previousStage);
      toast.error(
        err.response?.data?.message || "Erro ao remover candidato do processo.",
      );
    } finally {
      setIsRemoving(false);
    }
  };

  const handleConfirmHired = async () => {
    if (!hiredRole.trim()) {
      toast.error("O cargo da contratação é obrigatório.");
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
    const targetStage = stage || "SAVED";
    try {
      await api.put(`/company/talents/${talent.id}/stage`, {
        stage: targetStage,
        notes,
        hiredRole: targetStage === "HIRED" ? hiredRole : undefined,
      });
      if (!stage) {
        setStage("SAVED");
        onStageChange(talent.id, "SAVED", notes, hiredRole);
        toast.success("Anotações salvas e candidato adicionado à Triagem!");
      } else {
        onStageChange(talent.id, stage, notes, hiredRole);
        toast.success("Anotações salvas com sucesso.");
      }
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
    <>
      <PortalModal isOpen={true} onClose={onClose} className="relative z-[100000] w-full max-w-4xl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[88vh] max-h-[92vh] text-left">
        {/* ClickUp Task Top Bar */}
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-600">Portal Corporativo</span>
            <span>/</span>
            <span>{isInPipeline ? "Funil de Contratação" : "Banco de Talentos"}</span>
            <span>/</span>
            <span className="text-slate-900 font-medium truncate max-w-[180px]">
              {talent.user?.name || "Candidato"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-2.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-semibold shadow-2xs"
              title="Fechar (Esc)"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Fechar</span>
            </button>
          </div>
        </div>

        {/* 2-Column ClickUp Task Layout with Independent Scrolling */}
        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-100 custom-scrollbar">
          {/* LEFT COLUMN: Main Candidate Narrative (7 cols ~58.3%) */}
          <div className="w-full lg:w-7/12 shrink-0 lg:h-full lg:overflow-y-auto custom-scrollbar p-6 sm:p-7 space-y-6 min-h-0">
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
                <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                  {!isInPipeline ? (
                    <span className="text-[11px] text-slate-400">
                      Ao salvar anotações, o aluno entrará em Triagem.
                    </span>
                  ) : (
                    <span />
                  )}
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

          {/* RIGHT SIDEBAR: ClickUp Status, Direct Actions & Properties (5 cols ~41.7%) */}
          <div className="w-full lg:w-5/12 shrink-0 lg:h-full lg:overflow-y-auto custom-scrollbar bg-slate-50/50 p-6 sm:p-7 space-y-6 min-h-0">
            {/* Status Selector */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Status no Processo
              </span>

              {!isInPipeline ? (
                /* When talent is not yet in the pipeline: Single sleek CTA */
                <div className="relative" ref={statusDropdownRef}>
                  <div className="flex rounded-xl shadow-2xs overflow-hidden border border-sky-600">
                    <button
                      type="button"
                      onClick={() => handleStageSelect("SAVED")}
                      disabled={pendingStage === "SAVED"}
                      className="flex-1 h-9 px-3.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {pendingStage === "SAVED" ? (
                        <LoadingSpinner size="xs" variant="current" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <span>Adicionar ao Processo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsStatusOpen(!isStatusOpen)}
                      className="h-9 px-2.5 bg-sky-700 hover:bg-sky-800 text-white transition-colors cursor-pointer border-l border-sky-500/60 flex items-center justify-center"
                      title="Escolher etapa inicial"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isStatusOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* Dropdown to pick initial stage directly */}
                  {isStatusOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 z-50 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Adicionar na etapa:
                      </div>
                      {CLICKUP_STAGES.map((s) => (
                        <button
                          key={s.key}
                          type="button"
                          onClick={() => handleStageSelect(s.key)}
                          className="w-full px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                            <span className="text-[11px] uppercase tracking-wider">
                              {s.label}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* When talent IS in the pipeline: Sleek Unified Status Selector (Linear/Notion style) */
                <>
                  <div className="relative" ref={statusDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsStatusOpen(!isStatusOpen)}
                      className={`w-full h-10 px-3.5 rounded-xl text-xs font-bold tracking-wider uppercase border flex items-center justify-between transition-all cursor-pointer shadow-2xs hover:opacity-90 ${currentStageConfig.bg} ${currentStageConfig.border} ${currentStageConfig.text}`}
                    >
                      <div className="flex items-center gap-2">
                        <currentStageConfig.icon className="w-4 h-4" />
                        <span>{currentStageConfig.label}</span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isStatusOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Unified Dropdown Menu (Stages + Integrated Removal) */}
                    {isStatusOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 z-50 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Mover para a etapa:
                        </div>
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
                              <div className="flex items-center gap-2.5">
                                <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
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

                        {/* Divider */}
                        <div className="my-1 border-t border-slate-100" />

                        {/* Integrated Removal Action */}
                        <button
                          type="button"
                          onClick={() => {
                            setIsStatusOpen(false);
                            setShowRemoveConfirm(true);
                          }}
                          disabled={isRemoving}
                          className="w-full px-3 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer flex items-center gap-2 group"
                        >
                          <X className="w-3.5 h-3.5 text-rose-500 group-hover:text-rose-600" />
                          <span>Remover do Processo Seletivo</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {stage === "HIRED" && (talent.hiredRole || hiredRole) && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-800 font-medium flex items-center gap-2 mt-2">
                      <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        Cargo: <strong>{hiredRole || talent.hiredRole}</strong>
                      </span>
                    </div>
                  )}
                </>
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
                    <WhatsAppIcon className="w-3.5 h-3.5" />
                    <span>Conversar no WhatsApp</span>
                  </a>
                )}

                {talent.linkedinUrl && (
                  <a
                    href={talent.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full h-9 px-3.5 rounded-lg text-xs font-semibold bg-white hover:bg-blue-50/70 border border-slate-300 hover:border-blue-400 text-slate-800 hover:text-blue-700 shadow-2xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Linkedin className="w-3.5 h-3.5 text-[#0A66C2]" />
                    <span>Ver Perfil no LinkedIn</span>
                    <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
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
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
          >
            <span>Fechar Detalhes</span>
          </button>
        </div>
      </div>
    </PortalModal>

    <ConfirmModal
      isOpen={showRemoveConfirm}
      onClose={() => !isRemoving && setShowRemoveConfirm(false)}
      onConfirm={handleConfirmRemove}
      isLoading={isRemoving}
      title="Remover do Processo Seletivo?"
      description={`Tem certeza de que deseja remover ${talent.user?.name || "este candidato"} do seu processo seletivo? O aluno voltará a ficar disponível para recrutamento no catálogo geral.`}
      confirmText="Sim, Remover"
      cancelText="Cancelar"
      variant="danger"
    />

    {/* Confirmation Modal for Hiring */}
    <PortalModal
      isOpen={showHiredDialog}
      onClose={() => !isSavingNotes && setShowHiredDialog(false)}
    >
      <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200/80 text-left space-y-5 relative">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-emerald-50 text-emerald-600 border-emerald-200/60">
            <Award className="h-5 w-5" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">
              Confirmar Contratação
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Parabéns pela contratação! Informe o cargo de <strong>{talent.user?.name}</strong> para registrar no histórico da sua empresa.
            </p>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Cargo Contratado <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            autoFocus
            value={hiredRole}
            onChange={(e) => setHiredRole(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hiredRole.trim() && pendingStage !== "HIRED") {
                handleConfirmHired();
              }
            }}
            placeholder="Ex: Jovem Aprendiz Administrativo"
            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowHiredDialog(false)}
            disabled={pendingStage === "HIRED"}
            className="h-10 px-4 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pendingStage === "HIRED" || !hiredRole.trim()}
            onClick={handleConfirmHired}
            className="h-10 px-5 rounded-xl text-xs font-medium text-white shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
          >
            {pendingStage === "HIRED" ? (
              <>
                <LoadingSpinner size="xs" variant="white" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirmar Contratação</span>
              </>
            )}
          </button>
        </div>
      </div>
    </PortalModal>
  </>
);
}
