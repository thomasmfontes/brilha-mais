import React, { useEffect, useState, useMemo } from "react";
import {
  X,
  Bookmark,
  UserCheck,
  Award,
  Archive,
  Building2,
  Users,
} from "lucide-react";
import api from "../../utils/api";
import { toast } from "react-hot-toast";
import { PortalModal } from "../PortalModal";
import LoadingSpinner from "../LoadingSpinner";
import Tooltip from "../Tooltip";

interface CandidateInteraction {
  id: string;
  stage: "SAVED" | "INTERVIEW" | "HIRED" | "ARCHIVED";
  notes?: string | null;
  hiredRole?: string | null;
  hiredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  talent: {
    id: string;
    headline?: string | null;
    city?: string | null;
    state?: string | null;
    availability?: string | null;
    phone?: string | null;
    resumeUrl?: string | null;
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string | null;
    };
  };
}

interface CompanyDetails {
  id: string;
  name: string;
  tradeName?: string | null;
  cnpj?: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  interactions: CandidateInteraction[];
}

interface CompanyPipelineModalProps {
  companyId: string | null;
  companyName?: string;
  isOpen: boolean;
  onClose: () => void;
}

const STAGE_CONFIG: Record<
  "SAVED" | "INTERVIEW" | "HIRED" | "ARCHIVED",
  {
    label: string;
    icon: React.ElementType;
    badgeClass: string;
  }
> = {
  SAVED: {
    label: "Triagem",
    icon: Bookmark,
    badgeClass: "bg-sky-50 text-sky-700 border border-sky-200",
  },
  INTERVIEW: {
    label: "Entrevista",
    icon: UserCheck,
    badgeClass: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  HIRED: {
    label: "Contratado",
    icon: Award,
    badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold",
  },
  ARCHIVED: {
    label: "Arquivado",
    icon: Archive,
    badgeClass: "bg-slate-100 text-slate-600 border border-slate-200",
  },
};

export function CompanyPipelineModal({
  companyId,
  companyName,
  isOpen,
  onClose,
}: CompanyPipelineModalProps) {
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<
    "ALL" | "SAVED" | "INTERVIEW" | "HIRED" | "ARCHIVED"
  >("ALL");

  useEffect(() => {
    if (!isOpen || !companyId) {
      setCompany(null);
      return;
    }

    const fetchCompanyData = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/companies/${companyId}`);
        setCompany(res.data);
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Erro ao carregar dados da empresa.");
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [isOpen, companyId]);

  const interactions = company?.interactions || [];

  const counts = useMemo(() => {
    return {
      ALL: interactions.length,
      SAVED: interactions.filter((i) => i.stage === "SAVED").length,
      INTERVIEW: interactions.filter((i) => i.stage === "INTERVIEW").length,
      HIRED: interactions.filter((i) => i.stage === "HIRED").length,
      ARCHIVED: interactions.filter((i) => i.stage === "ARCHIVED").length,
    };
  }, [interactions]);

  const filteredInteractions = useMemo(() => {
    if (selectedFilter === "ALL") return interactions;
    return interactions.filter((i) => i.stage === selectedFilter);
  }, [interactions, selectedFilter]);

  const fantasyName = company?.name || companyName || "Empresa Parceira";

  return (
    <PortalModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200/80 overflow-hidden text-slate-900">
        {/* Header Moderno, Limpo e Direto */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4 bg-white">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                {fantasyName}
              </h2>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                RH: <strong>{company?.contactName || "Não informado"}</strong>
                <span className="mx-1.5 text-slate-300">•</span>
                <span>{counts.ALL} candidato{counts.ALL === 1 ? "" : "s"}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills with hidden scrollbar (Apenas Ícones para as Etapas) */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <Tooltip content="Todos os candidatos">
            <button
              type="button"
              onClick={() => setSelectedFilter("ALL")}
              className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                selectedFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Todos</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedFilter === "ALL" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {counts.ALL}
              </span>
            </button>
          </Tooltip>

          {(["SAVED", "INTERVIEW", "HIRED", "ARCHIVED"] as const).map((stageKey) => {
            const cfg = STAGE_CONFIG[stageKey];
            const isSelected = selectedFilter === stageKey;
            const count = counts[stageKey];

            return (
              <Tooltip key={stageKey} content={`${cfg.label} (${count})`}>
                <button
                  type="button"
                  onClick={() => setSelectedFilter(stageKey)}
                  className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60"
                  }`}
                  title={`${cfg.label} (${count})`}
                >
                  <cfg.icon className="w-3.5 h-3.5" />
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              </Tooltip>
            );
          })}
        </div>

        {/* Content Body: Clean Modern List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2.5 text-slate-400">
              <LoadingSpinner size="md" />
              <p className="text-xs font-medium">Carregando candidatos...</p>
            </div>
          ) : filteredInteractions.length === 0 ? (
            <div className="py-14 flex flex-col items-center justify-center text-center p-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2.5">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                Nenhum aluno nesta etapa
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Não há candidatos registrados com esse status.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredInteractions.map((item) => {
                const { talent } = item;
                const cfg = STAGE_CONFIG[item.stage];

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200/70 bg-white hover:border-slate-300 hover:shadow-2xs transition-all flex items-center justify-between gap-3 text-left"
                  >
                    {/* Student Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {talent.user.avatarUrl ? (
                        <img
                          src={talent.user.avatarUrl}
                          alt={talent.user.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                          {talent.user.name?.charAt(0) || "A"}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                            {talent.user.name}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {talent.headline || "Jovem Aprendiz / Aluno"}
                          {talent.city ? ` • ${talent.city}` : ""}
                        </p>
                        {item.stage === "HIRED" && item.hiredRole && (
                          <p className="text-[11px] font-semibold text-emerald-700 truncate mt-0.5">
                            Cargo: {item.hiredRole}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-[10px] text-slate-400 italic line-clamp-1 mt-0.5">
                            "{item.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stage Badge (Apenas Ícone) */}
                    <div className="shrink-0">
                      <Tooltip content={cfg.label}>
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${cfg.badgeClass}`}
                          title={cfg.label}
                        >
                          <cfg.icon className="w-4 h-4" />
                        </div>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
          <span>
            {filteredInteractions.length} aluno(s) listado(s)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </PortalModal>
  );
}
