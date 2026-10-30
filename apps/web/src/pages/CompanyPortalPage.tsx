import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import api from "../utils/api";
import { toast } from "react-hot-toast";
import logo from "../assets/logo.png";
import LoadingSpinner from "../components/LoadingSpinner";
import CompanyTalentModal, {
  CompanyTalent,
} from "../components/company/CompanyTalentModal";

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
    try {
      await api.put(`/company/talents/${talentId}/stage`, { stage: newStage });
      handleStageChange(talentId, newStage);
      toast.success(
        newStage === "SAVED"
          ? "Candidato salvo no seu radar!"
          : "Candidato movido para etapa de entrevista!",
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erro ao atualizar etapa.");
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
              <img src={logo} alt="Brilha Mais" className="h-9 w-auto object-contain" />
              <div className="hidden sm:block border-l border-zinc-200 pl-3">
                <span className="text-xs font-bold text-amber-600 tracking-wide uppercase block">
                  Portal Corporativo
                </span>
                <span className="text-sm font-semibold text-zinc-900 leading-none">
                  {companyProfile?.name || "Empresa Conveniada"}
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs">
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-zinc-600">RH:</span>
              <strong className="text-zinc-900">{companyProfile?.contactName}</strong>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-600 hover:text-red-600 hover:bg-red-50 border border-zinc-200/80 hover:border-red-200 transition-colors cursor-pointer"
              title="Encerrar sessão corporativa"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 border-t border-zinc-100 pt-2 pb-2">
          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "catalog"
                ? "bg-zinc-900 text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Banco de Talentos</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-bold">
              {talents.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("pipeline")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "pipeline"
                ? "bg-zinc-900 text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Nossos Processos (Funil)</span>
            {pipelineData?.counts?.total > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-md bg-amber-400 text-zinc-900 text-[10px] font-bold">
                {pipelineData.counts.total}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {activeTab === "catalog" ? (
          <div className="space-y-6">
            {/* Banner / Intro */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/70 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300/80 mb-2">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  Alunos Aptos e Auditados LGPD
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">
                  Encontre os melhores jovens talentos para sua empresa
                </h1>
                <p className="text-xs sm:text-sm text-zinc-600 mt-1 max-w-2xl leading-relaxed">
                  Todos os alunos abaixo autorizaram formalmente o compartilhamento de currículo para vagas de Jovem Aprendiz, Estágio e Primeiro Emprego.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-zinc-200/80 shadow-xs text-xs">
                <span className="text-zinc-500">Disponíveis:</span>
                <span className="text-zinc-900 font-bold text-base">
                  {talents.length}
                </span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome, cargo, cidade..."
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Area filter */}
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="">Todas as Áreas de Atuação</option>
                  {availableAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>

                {/* Availability filter */}
                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  <option value="">Qualquer Disponibilidade / Turno</option>
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noite">Noite</option>
                  <option value="Integral">Integral</option>
                </select>

                {/* Clear filters */}
                {(search || selectedArea || selectedAvailability || selectedCity) && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setSelectedArea("");
                      setSelectedAvailability("");
                      setSelectedCity("");
                    }}
                    className="h-10 px-3 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-xs font-semibold text-zinc-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Limpar Filtros</span>
                  </button>
                )}
              </div>
            </div>

            {/* Talent Grid */}
            {filteredTalents.length === 0 ? (
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center">
                <Users className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-zinc-900">
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
                      className="bg-white border border-zinc-200/80 hover:border-amber-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Header: Avatar, Name & Stage Badge */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {talent.user.avatarUrl ? (
                              <img
                                src={talent.user.avatarUrl}
                                alt={talent.user.name}
                                className="w-12 h-12 rounded-xl object-cover border border-zinc-200 shadow-2xs flex-shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 font-bold text-base flex items-center justify-center border border-amber-200 shadow-2xs flex-shrink-0">
                                {talent.user.name?.charAt(0) || "A"}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h3 className="text-sm font-bold text-zinc-900 truncate group-hover:text-amber-700 transition-colors">
                                {talent.user.name}
                              </h3>
                              <p className="text-xs font-medium text-zinc-600 truncate mt-0.5">
                                {talent.headline || "Jovem Aprendiz / Aluno"}
                              </p>
                            </div>
                          </div>

                          {/* Stage Pill */}
                          {talent.currentStage && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex-shrink-0 ${
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
                                    ? "Salvo"
                                    : "Arquivado"}
                            </span>
                          )}
                        </div>

                        {/* Location & Turno */}
                        <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3 flex-wrap">
                          {talent.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {talent.city}
                              {talent.state ? `/${talent.state}` : ""}
                            </span>
                          )}
                          {talent.availability && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {talent.availability}
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
                                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200"
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
                            onClick={() => setSelectedTalent(talent)}
                            className="flex-1 h-9 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>Ver Perfil Completo</span>
                          </button>

                          {talent.resumeUrl && (
                            <button
                              onClick={() => handleDownloadResume(talent)}
                              className="h-9 px-2.5 rounded-xl border border-zinc-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-zinc-600 transition-colors flex items-center justify-center cursor-pointer"
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
                              className="h-9 px-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-700 transition-colors flex items-center justify-center cursor-pointer"
                              title="Contato via WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          )}
                        </div>

                        {/* Quick action: Save or Move to Interview */}
                        {!talent.currentStage && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleQuickMove(talent.id, "SAVED")}
                              className="flex-1 py-1 rounded-lg border border-dashed border-zinc-200 hover:border-blue-300 hover:bg-blue-50 text-[11px] font-medium text-zinc-600 hover:text-blue-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Bookmark className="w-3 h-3" />
                              <span>Salvar no Radar</span>
                            </button>
                            <button
                              onClick={() => handleQuickMove(talent.id, "INTERVIEW")}
                              className="flex-1 py-1 rounded-lg border border-dashed border-zinc-200 hover:border-amber-300 hover:bg-amber-50 text-[11px] font-medium text-zinc-600 hover:text-amber-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Users className="w-3 h-3" />
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
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                  📌 Salvos no Radar
                </span>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  {pipelineData?.counts?.saved || 0}
                </div>
                <span className="text-[11px] text-zinc-400">candidatos sob análise</span>
              </div>

              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                  💬 Em Entrevista
                </span>
                <div className="text-2xl font-bold text-amber-600 mt-1">
                  {pipelineData?.counts?.interview || 0}
                </div>
                <span className="text-[11px] text-zinc-400">contato agendado</span>
              </div>

              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                  🎉 Contratados!
                </span>
                <div className="text-2xl font-bold text-emerald-600 mt-1">
                  {pipelineData?.counts?.hired || 0}
                </div>
                <span className="text-[11px] text-zinc-400">efetivações celebradas</span>
              </div>

              <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                  🗄️ Arquivados
                </span>
                <div className="text-2xl font-bold text-zinc-600 mt-1">
                  {pipelineData?.counts?.archived || 0}
                </div>
                <span className="text-[11px] text-zinc-400">banco de reserva</span>
              </div>
            </div>

            {/* Funnel Stage Filter Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
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
                  onClick={() => setPipelineFilter(item.key as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                    pipelineFilter === item.key
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                      : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Pipeline Candidate List */}
            {pipelineCandidates.length === 0 ? (
              <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center">
                <Briefcase className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-zinc-900">
                  Nenhum candidato nesta etapa
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Navegue pelo Banco de Talentos para salvar alunos no radar ou agendar entrevistas.
                </p>
                <button
                  onClick={() => setActiveTab("catalog")}
                  className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-900 font-semibold text-xs transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
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
                      className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
                    >
                      <div>
                        {/* Top: Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {talent.user.avatarUrl ? (
                              <img
                                src={talent.user.avatarUrl}
                                alt={talent.user.name}
                                className="w-11 h-11 rounded-xl object-cover border border-zinc-200 shadow-2xs flex-shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center border border-amber-200 shadow-2xs flex-shrink-0">
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
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
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
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 mb-3 text-xs text-emerald-900 flex items-center gap-2">
                            <Award className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span>
                              Cargo: <strong>{item.hiredRole}</strong>
                            </span>
                          </div>
                        )}

                        {/* Recruiter Notes */}
                        {item.notes ? (
                          <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200/70 text-xs text-zinc-700 mb-3 leading-relaxed">
                            <span className="font-semibold text-zinc-500 block mb-0.5">
                              Anotação Interna:
                            </span>
                            {item.notes}
                          </div>
                        ) : null}

                        <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3">
                          {talent.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {talent.city}
                            </span>
                          )}
                          {talent.availability && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {talent.availability}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                        <button
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
                          className="flex-1 h-8 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition-colors flex items-center justify-center cursor-pointer"
                        >
                          Gerenciar Candidato
                        </button>

                        {talent.resumeUrl && (
                          <button
                            onClick={() => handleDownloadResume(talent)}
                            className="h-8 px-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition-colors flex items-center justify-center cursor-pointer"
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
                            className="h-8 px-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center justify-center cursor-pointer"
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
