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
} from "lucide-react";
import api from "../../utils/api";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../LoadingSpinner";
import { PortalModal } from "../PortalModal";

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
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Users,
  },
  HIRED: {
    label: "Contratado(a)!",
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Award,
  },
  ARCHIVED: {
    label: "Arquivado",
    bg: "bg-zinc-100 text-zinc-600 border-zinc-200",
    icon: Clock,
  },
};

export default function CompanyTalentModal({
  talent,
  onClose,
  onStageChange,
}: CompanyTalentModalProps) {
  const [stage, setStage] = useState<string>(talent.currentStage || "SAVED");
  const [notes, setNotes] = useState<string>(talent.interactionNotes || "");
  const [hiredRole, setHiredRole] = useState<string>(talent.hiredRole || "");
  const [showHiredDialog, setShowHiredDialog] = useState(false);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const cleanPhone = talent.phone ? talent.phone.replace(/\D/g, "") : "";
  const whatsappUrl = cleanPhone
    ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(
        talent.user.name || "Aluno",
      )}!%20Vi%20seu%20perfil%20no%20Banco%20de%20Talentos%20do%20Brilha%20Mais.`
    : null;

  const handleStageSelect = async (newStage: string) => {
    if (newStage === "HIRED") {
      setShowHiredDialog(true);
      return;
    }

    setIsUpdatingStage(true);
    try {
      await api.put(`/company/talents/${talent.id}/stage`, {
        stage: newStage,
        notes,
      });
      setStage(newStage);
      onStageChange(talent.id, newStage, notes);
      toast.success(`Candidato movido para ${STAGE_CONFIG[newStage as keyof typeof STAGE_CONFIG]?.label || newStage}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erro ao atualizar etapa do candidato.");
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handleConfirmHired = async () => {
    if (!hiredRole.trim()) {
      toast.error("Por favor, informe o cargo da contratação.");
      return;
    }

    setIsUpdatingStage(true);
    try {
      await api.put(`/company/talents/${talent.id}/stage`, {
        stage: "HIRED",
        hiredRole: hiredRole.trim(),
        notes,
      });
      setStage("HIRED");
      setShowHiredDialog(false);
      onStageChange(talent.id, "HIRED", notes, hiredRole.trim());
      toast.success("Parabéns pela contratação! Evento registrado com sucesso.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erro ao confirmar contratação.");
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsUpdatingStage(true);
    try {
      await api.put(`/company/talents/${talent.id}/stage`, {
        stage,
        notes,
        hiredRole: stage === "HIRED" ? hiredRole : undefined,
      });
      onStageChange(talent.id, stage, notes, hiredRole);
      toast.success("Anotações da empresa salvas.");
    } catch (err: any) {
      toast.error("Erro ao salvar anotações.");
    } finally {
      setIsUpdatingStage(false);
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
    <PortalModal isOpen={true} onClose={onClose} className="relative z-[100000] w-full max-w-3xl">
      <div className="bg-white rounded-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200/80 overflow-hidden text-left">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {talent.user.avatarUrl ? (
              <img
                src={talent.user.avatarUrl}
                alt={talent.user.name}
                className="w-14 h-14 rounded-2xl object-cover border border-zinc-200 shadow-xs flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 font-bold text-xl flex items-center justify-center border border-amber-200 shadow-xs flex-shrink-0">
                {talent.user.name?.charAt(0) || "A"}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-zinc-900 truncate">
                  {talent.user.name}
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Disponível para Contratação
                </span>
              </div>
              <p className="text-sm font-medium text-zinc-600 truncate mt-0.5">
                {talent.headline || "Aluno em Formação Profissional"}
              </p>
              <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1 flex-wrap">
                {talent.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {talent.city}{talent.state ? ` - ${talent.state}` : ""}
                  </span>
                )}
                {talent.availability && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Turno: {talent.availability}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 text-sm">
          
          {/* Funnel Stage Selector Bar */}
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Etapa do Processo Seletivo
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-medium text-zinc-700">Mover para:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(["SAVED", "INTERVIEW", "HIRED", "ARCHIVED"] as const).map((s) => {
                    const cfg = STAGE_CONFIG[s];
                    const isSelected = stage === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleStageSelect(s)}
                        disabled={isUpdatingStage}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? `${cfg.bg} ring-2 ring-amber-500/20 shadow-xs font-bold`
                            : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900"
                        }`}
                      >
                        <cfg.icon className="w-3.5 h-3.5" />
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {stage === "HIRED" && talent.hiredRole && (
              <div className="bg-emerald-100/70 border border-emerald-300 rounded-lg px-3 py-1.5 text-xs text-emerald-900 font-medium">
                Cargo: <strong>{talent.hiredRole}</strong>
              </div>
            )}
          </div>

          {/* Dialog for Hiring details */}
          {showHiredDialog && (
            <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Registrar Contratação Efetivada</span>
              </div>
              <p className="text-xs text-amber-800">
                Parabéns! Ao celebrar a contratação, registre o cargo acertado com o aluno para as métricas da coordenação.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  value={hiredRole}
                  onChange={(e) => setHiredRole(e.target.value)}
                  placeholder="Ex: Jovem Aprendiz Administrativo, Estagiário de TI..."
                  className="w-full sm:flex-1 h-10 px-3 rounded-lg border border-amber-300 bg-white text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowHiredDialog(false)}
                    className="flex-1 sm:flex-initial h-10 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmHired}
                    disabled={isUpdatingStage}
                    className="flex-1 sm:flex-initial h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isUpdatingStage ? <LoadingSpinner size="sm" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Confirmar Contratação</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Resumo & Apresentação */}
          {talent.bio && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Apresentação Pessoal & Objetivo
              </h3>
              <p className="text-zinc-700 leading-relaxed bg-zinc-50/70 p-4 rounded-xl border border-zinc-200/70">
                {talent.bio}
              </p>
            </div>
          )}

          {/* Áreas de Interesse */}
          {talent.areasOfInterest && talent.areasOfInterest.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Áreas de Interesse Profissional
              </h3>
              <div className="flex flex-wrap gap-2">
                {talent.areasOfInterest.map((area, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Formação & Turmas no Brilha Mais */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Formação Pedagógica no Brilha Mais
            </h3>
            <div className="bg-amber-50/40 border border-amber-200/70 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <span className="text-xs font-semibold text-amber-900 block">
                  Aluno em Formação Cidadã e Habilidades para o Trabalho
                </span>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Turma: {talent.user.turmas && talent.user.turmas.length > 0 ? talent.user.turmas.map((t) => t.name).join(", ") : "Turma Regular Geral"}
                </p>
              </div>
            </div>
          </div>

          {/* Contato Direto */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Canais de Contato com o Aluno
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={`mailto:${talent.user.email}`}
                className="flex items-center gap-2 p-3 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-colors text-xs text-zinc-700"
              >
                <Mail className="w-4 h-4 text-zinc-400" />
                <span className="truncate">{talent.user.email}</span>
              </a>

              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 text-emerald-800 transition-colors text-xs font-medium"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Conversar no WhatsApp ({talent.phone})</span>
                </a>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-400">
                  <Phone className="w-4 h-4 text-zinc-400" />
                  <span>Telefone não informado</span>
                </div>
              )}

              {talent.linkedinUrl && (
                <a
                  href={talent.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 text-blue-800 transition-colors text-xs font-medium sm:col-span-2"
                >
                  <ExternalLink className="w-4 h-4 text-blue-600" />
                  <span>Ver Perfil no LinkedIn</span>
                </a>
              )}
            </div>
          </div>

          {/* Private Recruiter Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Anotações Internas do seu RH (Privado)
              </h3>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isUpdatingStage}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 cursor-pointer"
              >
                Salvar Anotação
              </button>
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Entrevista agendada para terça às 14h via Google Meet. Perfil com boa comunicação e domínio do Pacote Office..."
              className="w-full p-3 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 rounded-b-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Info className="w-3.5 h-3.5" />
            <span>Acesso auditado nominalmente em conformidade com a LGPD.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Fechar
            </button>

            {talent.resumeUrl ? (
              <button
                type="button"
                onClick={handleDownloadResume}
                disabled={isDownloading}
                className="h-10 px-5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isDownloading ? (
                  <LoadingSpinner size="sm" variant="white" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Baixar Currículo PDF</span>
              </button>
            ) : (
              <span className="text-xs text-zinc-400 italic">
                Currículo não anexado
              </span>
            )}
          </div>
        </div>
      </div>
    </PortalModal>
  );
}
