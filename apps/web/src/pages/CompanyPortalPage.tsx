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

// AdminStat matching AdminDashboard
function AdminStat({
  icon,
  label,
  value,
  color = "text-zinc-700",
  bg = "bg-zinc-50 border-zinc-200/70",
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color?: string;
  bg?: string;
  subtitle?: string;
}) {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 transition-colors shadow-2xs flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          {label}
        </p>
        <p className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 leading-tight">
          {value}
        </p>
        {subtitle && (
          <p className="text-[11px] text-zinc-500 font-medium">{subtitle}</p>
        )}
      </div>
      <div
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${bg} border flex items-center justify-center ${color} shrink-0`}
      >
        {icon}
      </div>
    </div>
  );
}

// Custom FilterSelect matching AdminDashboard
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
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full sm:w-auto min-w-[160px] h-9 flex items-center justify-between px-3 rounded-lg text-xs font-medium outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-colors select-none cursor-pointer
          ${
            isActive
              ? "bg-amber-50/80 border border-amber-300 text-amber-900 shadow-2xs"
              : isOpen
                ? "bg-slate-100 border border-slate-300 text-slate-900"
                : "bg-white border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 text-slate-600"
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
        if (!matchName && !matchHeadline && !matchBio && !matchCity)
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

      return true;
    });
  }, [talents, search, selectedArea, selectedAvailability, selectedCity]);

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
    newStage: "SAVED" | "INTERVIEW",
  ) => {
    setMovingTalent({ id: talentId, stage: newStage });
    // Optimistic UI update: candidate card reflects the new stage immediately
    handleStageChange(talentId, newStage);

    try {
      await api.put(`/company/talents/${talentId}/stage`, { stage: newStage });
      toast.success(
        newStage === "SAVED"
          ? "Candidato salvo no seu radar!"
          : "Candidato movido para etapa de entrevista!",
      );
    } catch (err: any) {
      handleStageChange(talentId, "");
      toast.error(err.response?.data?.message || "Erro ao atualizar etapa.");
    } finally {
      setMovingTalent(null);
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
    <div className="min-h-screen bg-[#FAFAF9] text-zinc-900 flex flex-col selection:bg-amber-100 selection:text-amber-900">
      {/* Top Corporate Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/empresa" className="flex items-center gap-3 focus:outline-none">
              <img src={logo} alt="Brilha Mais" className="h-8 sm:h-9 w-auto object-contain" />
              <div className="hidden sm:block border-l border-zinc-200 pl-3">
                <span className="text-[10px] font-bold text-amber-700 tracking-wider uppercase bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                  Portal Corporativo
                </span>
                <span className="text-sm font-semibold text-zinc-900 leading-snug block mt-0.5">
                  {companyProfile?.name || "Empresa Conveniada"}
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs">
              <div className="w-5 h-5 rounded-md bg-zinc-200/80 text-zinc-700 flex items-center justify-center text-[10px] font-bold">
                RH
              </div>
              <span className="text-zinc-500 font-normal">Contato:</span>
              <strong className="text-zinc-800 font-semibold">{companyProfile?.contactName || "Gestor de RH"}</strong>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 hover:text-red-600 hover:bg-red-50 border border-zinc-200/80 hover:border-red-200 transition-colors cursor-pointer"
              title="Encerrar sessão corporativa"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4 border-t border-zinc-100">
          <div className="inline-flex p-1 bg-zinc-100/90 rounded-xl border border-zinc-200/70">
            <button
              type="button"
              onClick={() => setActiveTab("catalog")}
              className={`px-3.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "catalog"
                  ? "bg-white text-zinc-900 font-semibold shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900 font-medium hover:bg-zinc-200/50"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Banco de Talentos</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  activeTab === "catalog"
                    ? "bg-amber-100 text-amber-900"
                    : "bg-zinc-200/70 text-zinc-600"
                }`}
              >
                {talents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("pipeline")}
              className={`px-3.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "pipeline"
                  ? "bg-white text-zinc-900 font-semibold shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900 font-medium hover:bg-zinc-200/50"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Nossos Processos</span>
              {pipelineData?.counts?.total > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-zinc-900 text-white text-[10px] font-bold">
                  {pipelineData.counts.total}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {activeTab === "catalog" ? (
          <div className="space-y-6">
            {/* Executive Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-zinc-200/60">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                    Banco de Talentos
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Auditado LGPD
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-2xl leading-relaxed">
                  Alunos capacitados e certificados pelo Instituto Brilha Mais com autorização formal para recrutamento corporativo.
                </p>
              </div>

              <div className="inline-flex items-center gap-2.5 self-start sm:self-auto px-3.5 py-2 rounded-xl bg-white border border-zinc-200/80 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block leading-tight">
                    Disponíveis
                  </span>
                  <span className="text-sm font-bold text-zinc-900 leading-tight">
                    {talents.length} {talents.length === 1 ? "candidato" : "candidatos"}
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome, cargo, cidade..."
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-zinc-200/80 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  />
                </div>

                {/* Area filter */}
                <FilterSelect
                  icon={Briefcase}
                  value={selectedArea}
                  onChange={setSelectedArea}
                  placeholder="Todas as Áreas de Atuação"
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
                  placeholder="Qualquer Disponibilidade / Turno"
                  options={[
                    { id: "", name: "Qualquer Disponibilidade / Turno" },
                    { id: "MANHA", name: "Manhã" },
                    { id: "TARDE", name: "Tarde" },
                    { id: "NOITE", name: "Noite" },
                    { id: "INTEGRAL", name: "Integral" },
                    { id: "FLEXIVEL", name: "Flexível" },
                  ]}
                />

                {/* Clear filters */}
                {(search || selectedArea || selectedAvailability || selectedCity) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setSelectedArea("");
                      setSelectedAvailability("");
                      setSelectedCity("");
                    }}
                    className="h-9 px-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs font-medium text-zinc-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Limpar Filtros</span>
                  </button>
                )}
              </div>
            </div>

            {/* Talent Grid */}
            {filteredTalents.length === 0 ? (
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center shadow-2xs">
                <Users className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-zinc-900">
                  Nenhum aluno encontrado com esses filtros
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Tente ajustar a busca por nome ou limpar os filtros de área e turno.
                </p>
              </div>
            ) : (
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
                      className="bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Header: Circular Avatar, Name & Stage Badge */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {talent.user.avatarUrl ? (
                              <img
                                src={talent.user.avatarUrl}
                                alt={talent.user.name}
                                className="w-12 h-12 rounded-full object-cover border border-zinc-200 shadow-2xs shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-800 font-bold text-base flex items-center justify-center border border-amber-200/80 shadow-2xs shrink-0">
                                {talent.user.name?.charAt(0) || "A"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-zinc-900 truncate group-hover:text-amber-700 transition-colors">
                                {talent.user.name}
                              </h3>
                              <p className="text-xs font-medium text-zinc-500 truncate mt-0.5">
                                {talent.headline || "Jovem Aprendiz / Aluno"}
                              </p>
                            </div>
                          </div>

                          {/* Stage Pill */}
                          {talent.currentStage && (
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 whitespace-nowrap ${
                                talent.currentStage === "HIRED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : talent.currentStage === "INTERVIEW"
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : talent.currentStage === "SAVED"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-zinc-100 text-zinc-600 border-zinc-200"
                              }`}
                            >
                              {talent.currentStage === "HIRED"
                                ? "Contratado"
                                : talent.currentStage === "INTERVIEW"
                                  ? "Em Entrevista"
                                  : talent.currentStage === "SAVED"
                                    ? "Salvo no Radar"
                                    : "Arquivado"}
                            </span>
                          )}
                        </div>

                        {/* Location & Turno */}
                        <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3 flex-wrap">
                          {talent.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                              {talent.city}
                              {talent.state ? `/${talent.state}` : ""}
                            </span>
                          )}
                          {talent.availability && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-zinc-400" />
                              {formatAvailability(talent.availability)}
                            </span>
                          )}
                        </div>

                        {/* Bio snippet */}
                        {talent.bio && (
                          <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed mb-3">
                            {talent.bio}
                          </p>
                        )}

                        {/* Areas tags */}
                        {talent.areasOfInterest &&
                          talent.areasOfInterest.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {talent.areasOfInterest.slice(0, 3).map((area, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-50 text-zinc-600 border border-zinc-200/80"
                                >
                                  {area}
                                </span>
                              ))}
                              {talent.areasOfInterest.length > 3 && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] text-zinc-400">
                                  +{talent.areasOfInterest.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                      </div>

                      {/* Card Actions */}
                      <div className="pt-3 border-t border-zinc-100 space-y-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTalent(talent)}
                            className="flex-1 h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white font-medium text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>Ver Perfil Completo</span>
                          </button>

                          {talent.resumeUrl && (
                            <button
                              type="button"
                              onClick={() => handleDownloadResume(talent)}
                              className="h-9 px-2.5 rounded-xl border border-zinc-200/80 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-700 transition-colors flex items-center justify-center cursor-pointer"
                              title="Baixar Currículo PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}

                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-9 px-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/60 hover:bg-emerald-100/80 text-emerald-700 transition-colors flex items-center justify-center cursor-pointer"
                              title="Contato via WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                        </div>

                        {/* Quick action: Save or Move to Interview */}
                        {!talent.currentStage && (
                          <div className="flex items-center gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleQuickMove(talent.id, "SAVED")}
                              disabled={movingTalent?.id === talent.id}
                              className="flex-1 h-7.5 px-2 rounded-lg border border-zinc-200/80 bg-zinc-50/70 hover:bg-zinc-100 text-[11px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {movingTalent?.id === talent.id && movingTalent.stage === "SAVED" ? (
                                <LoadingSpinner size="xs" variant="current" />
                              ) : (
                                <Bookmark className="w-3 h-3 text-zinc-400 group-hover:text-blue-600" />
                              )}
                              <span>Salvar no Radar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickMove(talent.id, "INTERVIEW")}
                              disabled={movingTalent?.id === talent.id}
                              className="flex-1 h-7.5 px-2 rounded-lg border border-zinc-200/80 bg-zinc-50/70 hover:bg-amber-50 hover:border-amber-200 text-[11px] font-medium text-zinc-600 hover:text-amber-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {movingTalent?.id === talent.id && movingTalent.stage === "INTERVIEW" ? (
                                <LoadingSpinner size="xs" variant="current" />
                              ) : (
                                <Users className="w-3 h-3 text-zinc-400 group-hover:text-amber-600" />
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
          /* NOSSOS PROCESSOS (MINI ATS / FUNIL) */
          <div className="space-y-6">
            {/* Header & Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <AdminStat
                icon={<Bookmark className="w-5 h-5" />}
                label="Salvos no Radar"
                value={pipelineData?.counts?.saved || 0}
                color="text-zinc-800"
                bg="bg-zinc-100 border-zinc-200/80"
                subtitle="Candidatos sob análise"
              />

              <AdminStat
                icon={<Users className="w-5 h-5" />}
                label="Em Entrevista"
                value={pipelineData?.counts?.interview || 0}
                color="text-amber-800"
                bg="bg-amber-50 border-amber-200/80"
                subtitle="Contato agendado"
              />

              <AdminStat
                icon={<Award className="w-5 h-5" />}
                label="Contratados"
                value={pipelineData?.counts?.hired || 0}
                color="text-emerald-800"
                bg="bg-emerald-50 border-emerald-200/80"
                subtitle="Efetivações celebradas"
              />

              <AdminStat
                icon={<Archive className="w-5 h-5" />}
                label="Arquivados"
                value={pipelineData?.counts?.archived || 0}
                color="text-zinc-600"
                bg="bg-zinc-100 border-zinc-200/80"
                subtitle="Banco de reserva"
              />
            </div>

            {/* Funnel Stage Filter Bar */}
            <div className="inline-flex p-1 bg-zinc-100/90 rounded-xl border border-zinc-200/70 overflow-x-auto max-w-full">
              {[
                { key: "ALL", label: `Todos (${pipelineData?.counts?.total || 0})` },
                {
                  key: "SAVED",
                  label: `Salvos no Radar (${pipelineData?.counts?.saved || 0})`,
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
                  label: `Arquivados (${pipelineData?.counts?.archived || 0})`,
                },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setPipelineFilter(item.key as any)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                    pipelineFilter === item.key
                      ? "bg-white text-zinc-900 font-semibold shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Pipeline Candidate List */}
            {pipelineCandidates.length === 0 ? (
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center shadow-2xs">
                <Briefcase className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-zinc-900">
                  Nenhum candidato nesta etapa
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Navegue pelo Banco de Talentos para salvar alunos no radar ou agendar entrevistas.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("catalog")}
                  className="mt-4 h-9 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white font-medium text-xs shadow-2xs transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Explorar Banco de Talentos</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pipelineCandidates.map((item: any) => {
                  const talent = item.talent;
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
                      key={item.interactionId}
                      className="bg-white border border-zinc-200/80 hover:border-zinc-300 rounded-2xl p-5 shadow-2xs transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Top: Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {talent.user.avatarUrl ? (
                              <img
                                src={talent.user.avatarUrl}
                                alt={talent.user.name}
                                className="w-11 h-11 rounded-full object-cover border border-zinc-200 shadow-2xs shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-amber-50 text-amber-800 font-bold text-sm flex items-center justify-center border border-amber-200/80 shadow-2xs shrink-0">
                                {talent.user.name?.charAt(0) || "A"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-zinc-900 truncate">
                                {talent.user.name}
                              </h4>
                              <p className="text-xs text-zinc-500 truncate">
                                {talent.headline || "Jovem Aprendiz"}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold border shrink-0 whitespace-nowrap ${
                              item.stage === "HIRED"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : item.stage === "INTERVIEW"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : item.stage === "SAVED"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-zinc-100 text-zinc-600 border-zinc-200"
                            }`}
                          >
                            {item.stage === "HIRED"
                              ? "Contratado"
                              : item.stage === "INTERVIEW"
                                ? "Em Entrevista"
                                : item.stage === "SAVED"
                                  ? "Salvo no Radar"
                                  : "Arquivado"}
                          </span>
                        </div>

                        {/* Hired role badge */}
                        {item.stage === "HIRED" && item.hiredRole && (
                          <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-2.5 mb-3 text-xs text-emerald-900 flex items-center gap-2">
                            <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              Cargo: <strong>{item.hiredRole}</strong>
                            </span>
                          </div>
                        )}

                        {/* Recruiter Notes */}
                        {item.notes ? (
                          <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200/70 text-xs text-zinc-700 mb-3 leading-relaxed">
                            <span className="font-semibold text-zinc-500 block mb-0.5 text-[11px] uppercase tracking-wider">
                              Anotação Interna:
                            </span>
                            {item.notes}
                          </div>
                        ) : null}

                        <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3 flex-wrap">
                          {talent.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                              {talent.city}
                            </span>
                          )}
                          {talent.availability && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-zinc-400" />
                              {formatAvailability(talent.availability)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            // Find full talent
                            const full = talents.find((t) => t.id === talent.id);
                            if (full) {
                              setSelectedTalent(full);
                            } else {
                              setSelectedTalent({
                                ...talent,
                                currentStage: item.stage,
                                interactionNotes: item.notes,
                                hiredRole: item.hiredRole,
                              });
                            }
                          }}
                          className="flex-1 h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white font-medium text-xs shadow-2xs transition-all flex items-center justify-center cursor-pointer"
                        >
                          Gerenciar Candidato
                        </button>

                        {talent.resumeUrl && (
                          <button
                            type="button"
                            onClick={() => handleDownloadResume(talent)}
                            className="h-9 px-2.5 rounded-xl border border-zinc-200/80 hover:bg-zinc-100 text-zinc-700 transition-colors flex items-center justify-center cursor-pointer"
                            title="Baixar Currículo"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}

                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-9 px-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center cursor-pointer"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
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
      </main>

      {/* Institutional Corporate Footer */}
      <footer className="w-full border-t border-zinc-200/70 bg-white/70 backdrop-blur-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div>
            &copy; 2026 Brilha Mais. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-4 text-zinc-500">
            <span className="hover:text-zinc-700 transition-colors cursor-pointer">
              Termos de Uso
            </span>
            <span>&middot;</span>
            <span className="hover:text-zinc-700 transition-colors cursor-pointer">
              Privacidade
            </span>
          </div>
        </div>
      </footer>

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
