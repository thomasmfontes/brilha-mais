import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Building2,
  LogOut,
  Search,
  Filter,
  Users,
  Bookmark,
  Award,
  Clock,
  MapPin,
  FileText,
  Download,
  ExternalLink,
  MessageCircle,
  Sparkles,
  ChevronDown,
  X,
  CheckCircle2,
  Briefcase,
  AlertCircle,
  Phone,
  Mail,
  ShieldCheck,
  Eye,
  UserCheck,
  Archive,
  Kanban,
  LayoutGrid,
  List,
  ArrowRight,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import api from "../utils/api";
import { toast } from "react-hot-toast";
import logo from "../assets/logo.png";
import LoadingSpinner from "../components/LoadingSpinner";
import CompanyTalentModal, {
  CompanyTalent,
} from "../components/company/CompanyTalentModal";

// Helper to format uppercase availability to title case
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

// Custom FilterSelect matching Enterprise SaaS
function FilterSelect({
  icon: Icon,
  value,
  onChange,
  options,
  placeholder,
}: {
  icon: React.ElementType;
  value: string;
  onChange: (val: string) => void;
  options: { id: string; name: string }[];
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isActive = value !== "ALL" && value !== "all" && value !== "";
  const selectedOption =
    value === "ALL" || value === "all" || value === ""
      ? null
      : options.find((o) => o.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full h-9 flex items-center justify-between px-3 rounded-lg text-xs font-medium outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-colors select-none cursor-pointer
          ${
            isActive
              ? "bg-amber-50/80 border border-amber-300 text-amber-900 shadow-2xs"
              : isOpen
                ? "bg-slate-100 border border-slate-300 text-slate-900"
                : "bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700"
          }
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
          <div
            className={`shrink-0 transition-colors ${
              isActive ? "text-amber-600" : "text-slate-400"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="truncate text-left flex-1">
            {isActive && selectedOption ? selectedOption.name : placeholder}
          </span>
        </div>
        <div
          className={`shrink-0 transition-transform duration-200 ${
            isOpen
              ? "rotate-180 text-slate-900"
              : isActive
                ? "text-amber-600"
                : "text-slate-400"
          }`}
        >
          <ChevronDown className="h-3 w-3" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[200px] bg-white border border-slate-200/90 rounded-xl shadow-lg z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="max-h-56 overflow-y-auto custom-scrollbar">
            {options.map((opt) => {
              const isItemActive =
                (opt.id === "" && (!value || value === "ALL")) ||
                opt.id === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isItemActive
                      ? "bg-amber-50 text-amber-900 font-semibold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="truncate">{opt.name}</span>
                  {isItemActive && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompanyPortalPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"catalog" | "pipeline">("catalog");
  const [catalogView, setCatalogView] = useState<"grid" | "table">("grid");
  const [pipelineView, setPipelineView] = useState<"kanban" | "list">("kanban");
  const [pipelineFilter, setPipelineFilter] = useState<
    "ALL" | "SAVED" | "INTERVIEW" | "HIRED" | "ARCHIVED"
  >("ALL");

  const [companyProfile, setCompanyProfile] = useState<{
    id: string;
    name: string;
    tradeName?: string;
    contactName: string;
    contactEmail: string;
  } | null>(null);

  const [talents, setTalents] = useState<CompanyTalent[]>([]);
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters for catalog
  const [search, setSearch] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedStage, setSelectedStage] = useState("");

  // Modal
  const [selectedTalent, setSelectedTalent] = useState<CompanyTalent | null>(
    null,
  );
  const [movingTalent, setMovingTalent] = useState<{ id: string; stage: string } | null>(null);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      const [profileRes, talentsRes, pipelineRes] = await Promise.all([
        api.get("/company/me"),
        api.get("/company/talents"),
        api.get("/company/pipeline"),
      ]);

      setCompanyProfile(profileRes.data);
      setTalents(talentsRes.data || []);
      setPipelineData(pipelineRes.data);
    } catch (err: any) {
      console.error("Failed to load company portal data:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast.error("Sessão expirada ou acesso restrito a empresas parceiras.");
        localStorage.removeItem("auth_token");
        navigate("/login", { replace: true });
      } else {
        toast.error("Erro ao carregar dados do portal corporativo.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    toast.success("Desconectado com sucesso.");
    navigate("/login", { replace: true });
  };

  // Filtered talents in catalog
  const filteredTalents = useMemo(() => {
    return talents.filter((t) => {
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchName = t.user.name?.toLowerCase().includes(query);
        const matchHeadline = t.headline?.toLowerCase().includes(query);
        const matchBio = t.bio?.toLowerCase().includes(query);
        const matchCity = t.city?.toLowerCase().includes(query);
        const matchArea = t.areasOfInterest?.some((a) => a.toLowerCase().includes(query));
        if (!matchName && !matchHeadline && !matchBio && !matchCity && !matchArea)
          return false;
      }

      if (selectedArea && (!t.areasOfInterest || !t.areasOfInterest.includes(selectedArea))) {
        return false;
      }

      if (selectedAvailability && t.availability !== selectedAvailability) {
        return false;
      }

      if (selectedCity && (!t.city || !t.city.toLowerCase().includes(selectedCity.toLowerCase()))) {
        return false;
      }

      if (selectedStage) {
        if (selectedStage === "NONE") {
          if (t.currentStage) return false;
        } else if (t.currentStage !== selectedStage) {
          return false;
        }
      }

      return true;
    });
  }, [talents, search, selectedArea, selectedAvailability, selectedCity, selectedStage]);

  // Available unique areas from loaded talents
  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    talents.forEach((t) => {
      t.areasOfInterest?.forEach((a) => set.add(a));
    });
    return Array.from(set).sort();
  }, [talents]);

  const handleStageChange = (
    talentId: string,
    newStage: string,
    notes?: string,
    hiredRole?: string,
  ) => {
    // Update local talents array
    setTalents((prev) =>
      prev.map((t) =>
        t.id === talentId
          ? {
              ...t,
              currentStage: newStage as any,
              interactionNotes: notes !== undefined ? notes : t.interactionNotes,
              hiredRole: hiredRole !== undefined ? hiredRole : t.hiredRole,
            }
          : t,
      ),
    );

    // Refresh pipeline data in background
    api
      .get("/company/pipeline")
      .then((res) => setPipelineData(res.data))
      .catch(() => {});
  };

  const handleDownloadResume = async (talent: CompanyTalent) => {
    if (!talent.resumeUrl) {
      toast.error("Este candidato ainda não anexou currículo.");
      return;
    }

    try {
      const res = await api.get(`/company/talents/${talent.id}/resume`);
      const url = res.data?.resumeUrl || talent.resumeUrl;
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Download do currículo registrado.");
    } catch {
      toast.error("Erro ao baixar currículo.");
    }
  };

  const handleQuickMove = async (
    talentId: string,
    newStage: "SAVED" | "INTERVIEW" | "HIRED" | "ARCHIVED",
  ) => {
    setMovingTalent({ id: talentId, stage: newStage });
    // Optimistic UI update: candidate card reflects the new stage immediately
    handleStageChange(talentId, newStage);

    try {
      await api.put(`/company/talents/${talentId}/stage`, { stage: newStage });
      const stageMessages: Record<string, string> = {
        SAVED: "Candidato salvo no seu Radar!",
        INTERVIEW: "Candidato movido para etapa de Entrevista!",
        HIRED: "Candidato registrado como Contratado! Parabéns!",
        ARCHIVED: "Candidato arquivado no Banco de Reserva.",
      };
      toast.success(stageMessages[newStage] || "Etapa atualizada com sucesso!");
    } catch (err: any) {
      handleStageChange(talentId, "");
      toast.error(err.response?.data?.message || "Erro ao atualizar etapa.");
    } finally {
      setMovingTalent(null);
    }
  };

  const openTalent = (talent: CompanyTalent, interaction?: any) => {
    const full = talents.find((t) => t.id === talent.id);
    if (full) {
      setSelectedTalent(full);
    } else {
      setSelectedTalent({
        ...talent,
        currentStage: interaction?.stage || talent.currentStage,
        interactionNotes: interaction?.notes || talent.interactionNotes,
        hiredRole: interaction?.hiredRole || talent.hiredRole,
      });
    }
  };

  // Pipeline flat list according to filter
  const pipelineCandidates = useMemo(() => {
    if (!pipelineData?.pipeline) return [];
    const p = pipelineData.pipeline;
    if (pipelineFilter === "SAVED") return p.SAVED || [];
    if (pipelineFilter === "INTERVIEW") return p.INTERVIEW || [];
    if (pipelineFilter === "HIRED") return p.HIRED || [];
    if (pipelineFilter === "ARCHIVED") return p.ARCHIVED || [];
    return [
      ...(p.SAVED || []),
      ...(p.INTERVIEW || []),
      ...(p.HIRED || []),
      ...(p.ARCHIVED || []),
    ];
  }, [pipelineData, pipelineFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm font-medium text-zinc-600">
            Carregando Portal Corporativo...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-slate-900 flex flex-col selection:bg-amber-100 selection:text-amber-900">
      {/* Top Corporate Header - Grounded Enterprise SaaS style */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top row: Brand & Recruiter profile */}
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/empresa" className="flex items-center gap-3">
                <img src={logo} alt="Brilha Mais" className="h-8 w-auto object-contain" />
                <div className="h-5 w-px bg-slate-200" />
                <div className="leading-tight">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Recrutamento &amp; Seleção
                  </span>
                  <span className="text-sm font-bold text-slate-900 block">
                    {companyProfile?.name || "Empresa Parceira"}
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2.5 pl-3 py-1 text-xs">
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold flex items-center justify-center text-xs">
                  {companyProfile?.contactName?.charAt(0) || "R"}
                </div>
                <div className="text-left leading-tight">
                  <span className="font-semibold text-slate-900 block">
                    {companyProfile?.contactName || "Gestor de RH"}
                  </span>
                  <span className="text-[11px] text-slate-500">Recrutador(a)</span>
                </div>
              </div>

              <div className="h-5 w-px bg-slate-200 hidden sm:block" />

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition-colors cursor-pointer"
                title="Sair do Portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>
          </div>

          {/* Nav Tab Strip (Underline Tabs - Real SaaS standard) */}
          <div className="flex items-center justify-between border-t border-slate-100">
            <nav className="flex space-x-8 -mb-px">
              <button
                type="button"
                onClick={() => setActiveTab("catalog")}
                className={`py-3.5 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === "catalog"
                    ? "border-amber-600 text-amber-900 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Banco de Talentos</span>
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    activeTab === "catalog"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {talents.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("pipeline")}
                className={`py-3.5 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors cursor-pointer ${
                  activeTab === "pipeline"
                    ? "border-amber-600 text-amber-900 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Kanban className="w-4 h-4" />
                <span>Processos Seletivos (Funil)</span>
                {pipelineData?.counts?.total > 0 && (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      activeTab === "pipeline"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {pipelineData.counts.total}
                  </span>
                )}
              </button>
            </nav>

            {/* View Mode Toggle Controls */}
            <div className="py-2 flex items-center gap-2">
              {activeTab === "catalog" && (
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setCatalogView("table")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      catalogView === "table"
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Tabela</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogView("grid")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      catalogView === "grid"
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>
                </div>
              )}

              {activeTab === "pipeline" && (
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPipelineView("kanban")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      pipelineView === "kanban"
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Kanban className="w-3.5 h-3.5" />
                    <span>Quadro Kanban</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPipelineView("list")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      pipelineView === "list"
                        ? "bg-white text-slate-900 shadow-2xs font-semibold"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Lista por Etapa</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {activeTab === "catalog" ? (
          /* TAB 1: BANCO DE TALENTOS */
          <div className="space-y-5">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                    Banco de Talentos
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {talents.length} disponíveis
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Auditado LGPD
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Estudantes capacitados e avaliados pelo Instituto Brilha Mais disponíveis para recrutamento corporativo.
                </p>
              </div>
            </div>

            {/* Filter Bar - Clean Toolbar */}
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* Search */}
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome, cargo, habilidades..."
                    className="w-full h-9 pl-9 pr-7 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors bg-white"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Area filter */}
                <FilterSelect
                  icon={Briefcase}
                  value={selectedArea}
                  onChange={setSelectedArea}
                  placeholder="Área de Atuação"
                  options={[
                    { id: "", name: "Todas as Áreas de Atuação" },
                    ...availableAreas.map((area) => ({ id: area, name: area })),
                  ]}
                />

                {/* Availability filter */}
                <FilterSelect
                  icon={Clock}
                  value={selectedAvailability}
                  onChange={setSelectedAvailability}
                  placeholder="Disponibilidade / Turno"
                  options={[
                    { id: "", name: "Qualquer Disponibilidade" },
                    { id: "MANHA", name: "Manhã" },
                    { id: "TARDE", name: "Tarde" },
                    { id: "NOITE", name: "Noite" },
                    { id: "INTEGRAL", name: "Integral" },
                    { id: "FLEXIVEL", name: "Flexível" },
                  ]}
                />

                {/* Status no Funil filter */}
                <FilterSelect
                  icon={Bookmark}
                  value={selectedStage}
                  onChange={setSelectedStage}
                  placeholder="Status no Funil"
                  options={[
                    { id: "", name: "Todos os Status" },
                    { id: "NONE", name: "Sem Etapa / Novos" },
                    { id: "SAVED", name: "Salvos no Radar" },
                    { id: "INTERVIEW", name: "Em Entrevista" },
                    { id: "HIRED", name: "Contratados" },
                    { id: "ARCHIVED", name: "Banco de Reserva" },
                  ]}
                />
              </div>
            </div>

            {/* Filter active feedback & count */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-0.5">
              <span>
                Exibindo <strong>{filteredTalents.length}</strong> de{" "}
                <strong>{talents.length}</strong> candidatos
              </span>

              {(search || selectedArea || selectedAvailability || selectedCity || selectedStage) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedArea("");
                    setSelectedAvailability("");
                    setSelectedCity("");
                    setSelectedStage("");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-medium hover:underline cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar Filtros</span>
                </button>
              )}
            </div>

            {/* Talent Presentation (Grid or Table View) */}
            {filteredTalents.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-2xs">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Nenhum aluno encontrado com esses filtros
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Tente ajustar os termos de busca ou limpar os filtros de turno e área.
                </p>
              </div>
            ) : catalogView === "table" ? (
              /* Enterprise Data Table */
              <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Candidato</th>
                        <th className="py-3 px-4">Localização &amp; Turno</th>
                        <th className="py-3 px-4">Áreas de Interesse</th>
                        <th className="py-3 px-4">Status no Funil</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTalents.map((talent) => {
                        const cleanPhone = talent.phone ? talent.phone.replace(/\D/g, "") : "";
                        const whatsappUrl = cleanPhone
                          ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(
                              talent.user.name || "Aluno",
                            )}!%20Vi%20seu%20perfil%20no%20Banco%20de%20Talentos%20do%20Brilha%20Mais.`
                          : null;

                        return (
                          <tr
                            key={talent.id}
                            className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                            onClick={() => setSelectedTalent(talent)}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {talent.user.avatarUrl ? (
                                  <img
                                    src={talent.user.avatarUrl}
                                    alt={talent.user.name}
                                    className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                                    {talent.user.name?.charAt(0) || "A"}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <span className="font-semibold text-slate-900 group-hover:text-amber-700 block truncate max-w-[220px]">
                                    {talent.user.name}
                                  </span>
                                  <span className="text-[11px] text-slate-500 block truncate max-w-[220px]">
                                    {talent.headline || "Jovem Aprendiz / Aluno"}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              <div className="flex items-center gap-1 font-medium">
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{talent.city ? `${talent.city}${talent.state ? `/${talent.state}` : ""}` : "São Paulo/SP"}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{formatAvailability(talent.availability) || "Flexível"}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {talent.areasOfInterest?.slice(0, 2).map((area, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
                                  >
                                    {area}
                                  </span>
                                ))}
                                {talent.areasOfInterest && talent.areasOfInterest.length > 2 && (
                                  <span className="text-[10px] text-slate-400 px-1 py-0.5">
                                    +{talent.areasOfInterest.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                              {talent.currentStage ? (
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border inline-block whitespace-nowrap ${
                                    talent.currentStage === "HIRED"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : talent.currentStage === "INTERVIEW"
                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                        : talent.currentStage === "SAVED"
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  {talent.currentStage === "HIRED"
                                    ? "Contratado"
                                    : talent.currentStage === "INTERVIEW"
                                      ? "Em Entrevista"
                                      : talent.currentStage === "SAVED"
                                        ? "Salvo no Radar"
                                        : "Banco de Reserva"}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleQuickMove(talent.id, "SAVED")}
                                  disabled={movingTalent?.id === talent.id}
                                  className="h-6.5 px-2.5 rounded border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-[11px] font-medium text-slate-600 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                  <Bookmark className="w-3 h-3 text-slate-400" />
                                  <span>Salvar no Radar</span>
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedTalent(talent)}
                                  className="h-7 px-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-medium text-[11px] transition-colors cursor-pointer"
                                >
                                  Ver Perfil
                                </button>

                                {talent.resumeUrl && (
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadResume(talent)}
                                    className="h-7 px-2 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                                    title="Baixar Currículo PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {whatsappUrl && (
                                  <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-7 px-2 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center cursor-pointer"
                                    title="WhatsApp Direto"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Grid View (Clean Enterprise Cards) */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTalents.map((talent) => {
                  const cleanPhone = talent.phone
                    ? talent.phone.replace(/\D/g, "")
                    : "";
                  const whatsappUrl = cleanPhone
                    ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(
                        talent.user.name || "Aluno",
                      )}!%20Vi%20seu%20perfil%20no%20Banco%20de%20Talentos%20do%20Brilha%20Mais.`
                    : null;

                  return (
                    <div
                      key={talent.id}
                      onClick={() => setSelectedTalent(talent)}
                      className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group cursor-pointer"
                    >
                      <div>
                        {/* Header: Circular Avatar, Name & Stage Badge */}
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            {talent.user.avatarUrl ? (
                              <img
                                src={talent.user.avatarUrl}
                                alt={talent.user.name}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                                {talent.user.name?.charAt(0) || "A"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-amber-700 transition-colors">
                                {talent.user.name}
                              </h3>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {talent.headline || "Jovem Aprendiz / Aluno"}
                              </p>
                            </div>
                          </div>

                          {/* Stage Pill */}
                          {talent.currentStage && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 whitespace-nowrap ${
                                talent.currentStage === "HIRED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : talent.currentStage === "INTERVIEW"
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : talent.currentStage === "SAVED"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {talent.currentStage === "HIRED"
                                ? "Contratado"
                                : talent.currentStage === "INTERVIEW"
                                  ? "Em Entrevista"
                                  : talent.currentStage === "SAVED"
                                    ? "Salvo no Radar"
                                    : "Banco de Reserva"}
                            </span>
                          )}
                        </div>

                        {/* Location & Turno */}
                        <div className="flex items-center gap-3 text-xs text-slate-500 mb-2.5 flex-wrap">
                          {talent.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {talent.city}
                              {talent.state ? `/${talent.state}` : ""}
                            </span>
                          )}
                          {talent.availability && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {formatAvailability(talent.availability)}
                            </span>
                          )}
                        </div>

                        {/* Bio snippet */}
                        {talent.bio && (
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                            {talent.bio}
                          </p>
                        )}

                        {/* Areas tags */}
                        {talent.areasOfInterest && talent.areasOfInterest.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {talent.areasOfInterest.slice(0, 3).map((area, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
                              >
                                {area}
                              </span>
                            ))}
                            {talent.areasOfInterest.length > 3 && (
                              <span className="px-1.5 py-0.5 text-[10px] text-slate-400">
                                +{talent.areasOfInterest.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="pt-2.5 border-t border-slate-100 space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedTalent(talent)}
                            className="flex-1 h-8 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors flex items-center justify-center cursor-pointer"
                          >
                            <span>Ver Perfil</span>
                          </button>

                          {talent.resumeUrl && (
                            <button
                              type="button"
                              onClick={() => handleDownloadResume(talent)}
                              className="h-8 px-2 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors flex items-center justify-center cursor-pointer"
                              title="Baixar Currículo PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-8 px-2 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center cursor-pointer"
                              title="Contato via WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        {/* Quick action: Save to Radar */}
                        {!talent.currentStage && (
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleQuickMove(talent.id, "SAVED")}
                              disabled={movingTalent?.id === talent.id}
                              className="flex-1 h-7 px-2 rounded border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-[11px] font-medium text-slate-600 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {movingTalent?.id === talent.id && movingTalent.stage === "SAVED" ? (
                                <LoadingSpinner size="xs" variant="current" />
                              ) : (
                                <Bookmark className="w-3 h-3 text-slate-400" />
                              )}
                              <span>Salvar no Radar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickMove(talent.id, "INTERVIEW")}
                              disabled={movingTalent?.id === talent.id}
                              className="flex-1 h-7 px-2 rounded border border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-[11px] font-medium text-amber-900 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {movingTalent?.id === talent.id && movingTalent.stage === "INTERVIEW" ? (
                                <LoadingSpinner size="xs" variant="current" />
                              ) : (
                                <Users className="w-3 h-3 text-amber-600" />
                              )}
                              <span>Chamar p/ Entrevista</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: PROCESSOS SELETIVOS (KANBAN PIPELINE - GUPY ATS STANDARD) */
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Funil de Contratação
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Acompanhe e movimente os candidatos pelas etapas do processo seletivo da sua empresa.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto text-xs text-slate-600">
                <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-semibold text-slate-800">
                  {pipelineData?.counts?.total || 0} candidatos em processo
                </span>
              </div>
            </div>

            {/* Kanban or List View */}
            {pipelineView === "kanban" ? (
              /* REAL GUPY KANBAN LANES */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                {[
                  {
                    key: "SAVED",
                    title: "Triagem / Radar",
                    dotColor: "bg-blue-500",
                    candidates: pipelineData?.pipeline?.SAVED || [],
                  },
                  {
                    key: "INTERVIEW",
                    title: "Em Entrevista",
                    dotColor: "bg-amber-500",
                    candidates: pipelineData?.pipeline?.INTERVIEW || [],
                  },
                  {
                    key: "HIRED",
                    title: "Contratados",
                    dotColor: "bg-emerald-500",
                    candidates: pipelineData?.pipeline?.HIRED || [],
                  },
                  {
                    key: "ARCHIVED",
                    title: "Banco de Reserva",
                    dotColor: "bg-slate-400",
                    candidates: pipelineData?.pipeline?.ARCHIVED || [],
                  },
                ].map((column) => (
                  <div
                    key={column.key}
                    className="bg-slate-200/60 border border-slate-200/80 rounded-xl p-3 flex flex-col min-h-[580px]"
                  >
                    {/* Lane Header */}
                    <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200 px-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${column.dotColor}`} />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          {column.title}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-200">
                        {column.candidates.length}
                      </span>
                    </div>

                    {/* Lane Cards Container */}
                    <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[720px] pr-0.5 custom-scrollbar">
                      {column.candidates.length === 0 ? (
                        <div className="h-32 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center text-center p-3 text-slate-400">
                          <p className="text-xs font-medium text-slate-500">Nenhum candidato</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">nesta etapa</p>
                        </div>
                      ) : (
                        column.candidates.map((item: any) => {
                          const talent = item.talent;
                          const cleanPhone = talent.phone ? talent.phone.replace(/\D/g, "") : "";
                          const whatsappUrl = cleanPhone
                            ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(
                                talent.user.name || "Aluno",
                              )}!%20Vi%20seu%20perfil%20no%20Banco%20de%20Talentos%20do%20Brilha%20Mais.`
                            : null;

                          return (
                            <div
                              key={item.interactionId || talent.id}
                              onClick={() => openTalent(talent, item)}
                              className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs hover:shadow-xs transition-all space-y-2.5 cursor-pointer group"
                            >
                              {/* Top row: Avatar & Info */}
                              <div className="flex items-start gap-2.5">
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
                                  <span className="text-xs font-bold text-slate-900 truncate block group-hover:text-amber-700 transition-colors">
                                    {talent.user.name}
                                  </span>
                                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                    {talent.headline || "Jovem Aprendiz"}
                                  </p>
                                </div>
                              </div>

                              {/* Meta details */}
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                                {talent.city && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate max-w-[110px]">{talent.city}</span>
                                  </span>
                                )}
                                {talent.availability && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{formatAvailability(talent.availability)}</span>
                                  </span>
                                )}
                              </div>

                              {/* Recruiter Notes */}
                              {item.notes && (
                                <div className="bg-amber-50/60 border border-amber-200/60 rounded p-2 text-[11px] text-amber-900/90 line-clamp-2">
                                  <span className="font-semibold text-amber-800 text-[10px] uppercase tracking-wider block mb-0.5">
                                    Anotação Interna:
                                  </span>
                                  {item.notes}
                                </div>
                              )}

                              {/* Hired role badge */}
                              {item.stage === "HIRED" && item.hiredRole && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded p-1.5 text-[11px] text-emerald-900 flex items-center gap-1.5 font-medium">
                                  <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="truncate">Cargo: {item.hiredRole}</span>
                                </div>
                              )}

                              {/* Bottom Action Strip */}
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
                                {/* Stage advance action */}
                                {item.stage === "SAVED" && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickMove(talent.id, "INTERVIEW")}
                                    disabled={movingTalent?.id === talent.id}
                                    className="flex-1 h-7 px-2 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[11px] font-medium text-amber-900 transition-colors flex items-center justify-between cursor-pointer disabled:opacity-50"
                                    title="Avançar para entrevista"
                                  >
                                    <span>Chamar p/ Entrevista</span>
                                    <ArrowRight className="w-3 h-3 text-amber-700" />
                                  </button>
                                )}

                                {item.stage === "INTERVIEW" && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickMove(talent.id, "HIRED")}
                                    disabled={movingTalent?.id === talent.id}
                                    className="flex-1 h-7 px-2 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-medium text-emerald-900 transition-colors flex items-center justify-between cursor-pointer disabled:opacity-50"
                                    title="Efetivar contratação"
                                  >
                                    <span>Efetivar Contratação</span>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  </button>
                                )}

                                {item.stage === "ARCHIVED" && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickMove(talent.id, "SAVED")}
                                    disabled={movingTalent?.id === talent.id}
                                    className="flex-1 h-7 px-2 rounded bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[11px] font-medium text-slate-700 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                  >
                                    <RotateCcw className="w-3 h-3 text-slate-500" />
                                    <span>Reativar no Radar</span>
                                  </button>
                                )}

                                {item.stage === "HIRED" && (
                                  <span className="flex-1 text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Contratação Realizada</span>
                                  </span>
                                )}

                                {/* Archive shortcut for SAVED or INTERVIEW */}
                                {(item.stage === "SAVED" || item.stage === "INTERVIEW") && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickMove(talent.id, "ARCHIVED")}
                                    className="h-7 w-7 rounded border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                                    title="Arquivar no Banco de Reserva"
                                  >
                                    <Archive className="w-3 h-3" />
                                  </button>
                                )}

                                {/* CV and WhatsApp quick buttons */}
                                {talent.resumeUrl && (
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadResume(talent)}
                                    className="h-7 w-7 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                                    title="Baixar Currículo PDF"
                                  >
                                    <Download className="w-3 h-3" />
                                  </button>
                                )}

                                {whatsappUrl && (
                                  <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-7 w-7 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                                    title="WhatsApp Direto"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* LIST VIEW MODE BY STAGE */
              <div className="space-y-4">
                {/* Stage Filter Tabs */}
                <div className="flex border-b border-slate-200 space-x-6">
                  {[
                    { key: "ALL", label: `Todos (${pipelineData?.counts?.total || 0})` },
                    {
                      key: "SAVED",
                      label: `Triagem / Radar (${pipelineData?.counts?.saved || 0})`,
                    },
                    {
                      key: "INTERVIEW",
                      label: `Em Entrevista (${pipelineData?.counts?.interview || 0})`,
                    },
                    {
                      key: "HIRED",
                      label: `Contratados (${pipelineData?.counts?.hired || 0})`,
                    },
                    {
                      key: "ARCHIVED",
                      label: `Banco de Reserva (${pipelineData?.counts?.archived || 0})`,
                    },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setPipelineFilter(item.key as any)}
                      className={`pb-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                        pipelineFilter === item.key
                          ? "border-amber-600 text-slate-900 font-semibold"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Candidate List Cards */}
                {pipelineCandidates.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-lg p-12 text-center shadow-2xs">
                    <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Nenhum candidato nesta etapa
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Navegue pelo Banco de Talentos para adicionar alunos ao seu radar.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pipelineCandidates.map((item: any) => {
                      const talent = item.talent;
                      const cleanPhone = talent.phone ? talent.phone.replace(/\D/g, "") : "";
                      const whatsappUrl = cleanPhone
                        ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(
                            talent.user.name || "Aluno",
                          )}!%20Vi%20seu%20perfil%20no%20Banco%20de%20Talentos%20do%20Brilha%20Mais.`
                        : null;

                      return (
                        <div
                          key={item.interactionId}
                          onClick={() => openTalent(talent, item)}
                          className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-4 shadow-2xs transition-all flex flex-col justify-between cursor-pointer group"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-2.5">
                              <div className="flex items-center gap-3 min-w-0">
                                {talent.user.avatarUrl ? (
                                  <img
                                    src={talent.user.avatarUrl}
                                    alt={talent.user.name}
                                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                                    {talent.user.name?.charAt(0) || "A"}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h4 className="text-sm font-semibold text-slate-900 truncate group-hover:text-amber-700">
                                    {talent.user.name}
                                  </h4>
                                  <p className="text-xs text-slate-500 truncate mt-0.5">
                                    {talent.headline || "Jovem Aprendiz"}
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 whitespace-nowrap ${
                                  item.stage === "HIRED"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : item.stage === "INTERVIEW"
                                      ? "bg-amber-50 text-amber-800 border-amber-200"
                                      : item.stage === "SAVED"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                {item.stage === "HIRED"
                                  ? "Contratado"
                                  : item.stage === "INTERVIEW"
                                    ? "Em Entrevista"
                                    : item.stage === "SAVED"
                                      ? "Salvo no Radar"
                                      : "Banco de Reserva"}
                              </span>
                            </div>

                            {item.stage === "HIRED" && item.hiredRole && (
                              <div className="bg-emerald-50 border border-emerald-200 rounded p-1.5 mb-2 text-xs text-emerald-900 flex items-center gap-1.5 font-medium">
                                <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Cargo: <strong>{item.hiredRole}</strong></span>
                              </div>
                            )}

                            {item.notes ? (
                              <div className="bg-slate-50 rounded p-2 border border-slate-200 text-xs text-slate-600 mb-2 leading-relaxed">
                                <span className="font-semibold text-slate-500 block mb-0.5 text-[10px] uppercase tracking-wider">
                                  Anotação Interna:
                                </span>
                                {item.notes}
                              </div>
                            ) : null}

                            <div className="flex items-center gap-3 text-xs text-slate-500 mb-3 flex-wrap">
                              {talent.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  {talent.city}
                                </span>
                              )}
                              {talent.availability && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {formatAvailability(talent.availability)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => openTalent(talent, item)}
                              className="flex-1 h-8 px-3 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors flex items-center justify-center cursor-pointer"
                            >
                              Gerenciar Candidato
                            </button>

                            {talent.resumeUrl && (
                              <button
                                type="button"
                                onClick={() => handleDownloadResume(talent)}
                                className="h-8 px-2 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors flex items-center justify-center cursor-pointer"
                                title="Baixar Currículo"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {whatsappUrl && (
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-8 px-2 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center cursor-pointer"
                                title="Conversar no WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Talent Full Details Modal */}
      {selectedTalent && (
        <CompanyTalentModal
          talent={selectedTalent}
          onClose={() => setSelectedTalent(null)}
          onStageChange={handleStageChange}
        />
      )}
    </div>
  );
}
