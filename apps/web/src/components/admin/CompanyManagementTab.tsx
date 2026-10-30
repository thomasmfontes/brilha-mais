import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Edit2,
  Trash2,
  RefreshCw,
  Mail,
  Phone,
  UserCheck,
  Clock,
  Award,
  Users,
  Briefcase,
  X,
  Share2,
  MessageCircle,
} from "lucide-react";
import api from "../../utils/api";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../LoadingSpinner";

interface PartnerCompany {
  id: string;
  name: string;
  tradeName?: string | null;
  cnpj?: string | null;
  segment?: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  notes?: string | null;
  isActive: boolean;
  termsAccepted: boolean;
  termsAcceptedAt?: string | null;
  termsAcceptedBy?: string | null;
  inviteToken?: string | null;
  inviteExpiresAt?: string | null;
  isInviteExpired?: boolean;
  pipelineStats?: {
    saved: number;
    interview: number;
    hired: number;
  };
  createdAt: string;
}

export default function CompanyManagementTab() {
  const [companies, setCompanies] = useState<PartnerCompany[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<PartnerCompany | null>(
    null,
  );
  const [createdInviteData, setCreatedInviteData] = useState<{
    companyName: string;
    contactName: string;
    contactEmail: string;
    inviteToken: string;
    phone?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    tradeName: "",
    cnpj: "",
    segment: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [companiesRes, statsRes] = await Promise.all([
        api.get("/companies"),
        api.get("/companies/stats"),
      ]);
      setCompanies(companiesRes.data || []);
      setStats(statsRes.data);
    } catch (err) {
      toast.error("Erro ao carregar lista de empresas parceiras.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.contactName.trim() || !formData.contactEmail.trim()) {
      toast.error("Preencha o Nome da Empresa, Contato e E-mail.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post("/companies", formData);
      toast.success("Empresa parceira cadastrada com sucesso!");
      setShowCreateModal(false);

      if (res.data.inviteToken) {
        setCreatedInviteData({
          companyName: res.data.name,
          contactName: res.data.contactName,
          contactEmail: res.data.contactEmail,
          inviteToken: res.data.inviteToken,
          phone: res.data.contactPhone || undefined,
        });
      }

      setFormData({
        name: "",
        tradeName: "",
        cnpj: "",
        segment: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        notes: "",
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erro ao cadastrar empresa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    setIsSubmitting(true);
    try {
      await api.patch(`/companies/${editingCompany.id}`, formData);
      toast.success("Dados da empresa atualizados com sucesso!");
      setEditingCompany(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erro ao atualizar empresa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReissueInvite = async (company: PartnerCompany) => {
    try {
      const res = await api.post(`/companies/${company.id}/reissue-invite`);
      toast.success("Novo convite gerado!");
      setCreatedInviteData({
        companyName: company.name,
        contactName: company.contactName,
        contactEmail: company.contactEmail,
        inviteToken: res.data.inviteToken,
        phone: company.contactPhone || undefined,
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erro ao reemitir convite.");
    }
  };

  const handleToggleActive = async (company: PartnerCompany) => {
    const action = company.isActive ? "desativar" : "reativar";
    if (!window.confirm(`Deseja realmente ${action} o convênio com ${company.name}?`)) {
      return;
    }

    try {
      await api.patch(`/companies/${company.id}`, { isActive: !company.isActive });
      toast.success(`Empresa ${company.isActive ? "desativada" : "reativada"} com sucesso.`);
      fetchData();
    } catch (err: any) {
      toast.error("Erro ao alterar status da empresa.");
    }
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/empresa/ativar?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link oficial de ativação copiado para a área de transferência!");
  };

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchTrade = c.tradeName?.toLowerCase().includes(q);
        const matchContact = c.contactName.toLowerCase().includes(q);
        const matchEmail = c.contactEmail.toLowerCase().includes(q);
        const matchCnpj = c.cnpj?.includes(q);
        if (!matchName && !matchTrade && !matchContact && !matchEmail && !matchCnpj) {
          return false;
        }
      }

      if (statusFilter === "active" && (!c.isActive || !c.termsAccepted)) return false;
      if (statusFilter === "pending" && (c.termsAccepted || !c.isActive)) return false;
      if (statusFilter === "inactive" && c.isActive) return false;

      return true;
    });
  }, [companies, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Empresas Parceiras
            </span>
            <Building2 className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-zinc-900">
            {stats?.totalCompanies ?? companies.length}
          </div>
          <span className="text-[11px] text-zinc-400">cadastradas no programa</span>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Empresas Ativas
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600">
            {stats?.activeCompanies ?? 0}
          </div>
          <span className="text-[11px] text-zinc-400">com termo LGPD aceito</span>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Em Entrevista
            </span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-600">
            {stats?.totalInterview ?? 0}
          </div>
          <span className="text-[11px] text-zinc-400">processos seletivos</span>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Contratações
            </span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600">
            {stats?.totalHired ?? 0}
          </div>
          <span className="text-[11px] text-zinc-400">alunos empregados</span>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Action Button */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por empresa, contato, e-mail..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativas (LGPD Aceito)</option>
            <option value="pending">Convite Pendente</option>
            <option value="inactive">Inativas</option>
          </select>
        </div>

        <button
          onClick={() => {
            setFormData({
              name: "",
              tradeName: "",
              cnpj: "",
              segment: "",
              contactName: "",
              contactEmail: "",
              contactPhone: "",
              notes: "",
            });
            setShowCreateModal(true);
          }}
          className="w-full sm:w-auto h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-zinc-900 font-semibold text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Empresa Parceira</span>
        </button>
      </div>

      {/* Table / List */}
      {loading ? (
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center">
          <LoadingSpinner size="lg" />
          <p className="text-xs text-zinc-500 mt-2">Carregando empresas parceiras...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center">
          <Building2 className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-zinc-900">
            Nenhuma empresa parceira cadastrada
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Cadastre empresas conveniadas para emitir convites e abrir o acesso ao Banco de Talentos.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white border border-zinc-200/80 rounded-2xl shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/70 border-b border-zinc-200 text-zinc-600 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Empresa</th>
                  <th className="py-3.5 px-4">Contato RH</th>
                  <th className="py-3.5 px-4">Status & LGPD</th>
                  <th className="py-3.5 px-4 text-center">Funil de Talentos</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {filteredCompanies.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors">
                    {/* Empresa */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-900 text-sm">
                        {c.name}
                      </div>
                      {c.tradeName && (
                        <div className="text-[11px] text-zinc-400 truncate max-w-xs">
                          {c.tradeName}
                        </div>
                      )}
                      {c.cnpj && (
                        <div className="text-[10px] text-zinc-400 font-mono">
                          CNPJ: {c.cnpj}
                        </div>
                      )}
                    </td>

                    {/* Contato RH */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-800 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{c.contactName}</span>
                      </div>
                      <div className="text-zinc-500 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{c.contactEmail}</span>
                      </div>
                      {c.contactPhone && (
                        <div className="text-zinc-500 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{c.contactPhone}</span>
                        </div>
                      )}
                    </td>

                    {/* Status & LGPD */}
                    <td className="py-3.5 px-4">
                      {!c.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                          Inativa
                        </span>
                      ) : c.termsAccepted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Ativa (LGPD Aceito)
                        </span>
                      ) : c.isInviteExpired ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                          Convite Expirado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Convite Pendente
                        </span>
                      )}
                    </td>

                    {/* Funil de Talentos */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold"
                          title="Salvos no radar"
                        >
                          📌 {c.pipelineStats?.saved || 0}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold"
                          title="Em entrevista"
                        >
                          💬 {c.pipelineStats?.interview || 0}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold"
                          title="Contratados"
                        >
                          🎉 {c.pipelineStats?.hired || 0}
                        </span>
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.inviteToken && !c.termsAccepted && (
                          <button
                            onClick={() => copyInviteLink(c.inviteToken!)}
                            className="p-1.5 rounded-lg border border-zinc-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-zinc-600 transition-colors cursor-pointer"
                            title="Copiar Link de Convite"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleReissueInvite(c)}
                          className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer"
                          title="Gerar / Reemitir Link de Convite"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setFormData({
                              name: c.name,
                              tradeName: c.tradeName || "",
                              cnpj: c.cnpj || "",
                              segment: c.segment || "",
                              contactName: c.contactName,
                              contactEmail: c.contactEmail,
                              contactPhone: c.contactPhone || "",
                              notes: c.notes || "",
                            });
                            setEditingCompany(c);
                          }}
                          className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 transition-colors cursor-pointer"
                          title="Editar Dados da Empresa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleActive(c)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            c.isActive
                              ? "border-zinc-200 text-zinc-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200"
                              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={c.isActive ? "Desativar Empresa" : "Reativar Empresa"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards List (Matching Users tab pattern) */}
          <div className="md:hidden space-y-3">
            {filteredCompanies.map((c) => (
              <div
                key={c.id}
                className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-zinc-900 text-sm">{c.name}</h4>
                    {c.tradeName && (
                      <p className="text-xs text-zinc-500">{c.tradeName}</p>
                    )}
                  </div>

                  {!c.isActive ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                      Inativa
                    </span>
                  ) : c.termsAccepted ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Ativa
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      Pendente
                    </span>
                  )}
                </div>

                <div className="text-xs text-zinc-600 space-y-1 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/60">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{c.contactName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="truncate">{c.contactEmail}</span>
                  </div>
                  {c.contactPhone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{c.contactPhone}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-zinc-500">
                      Funil:
                    </span>
                    <span className="font-bold text-blue-600">
                      📌 {c.pipelineStats?.saved || 0}
                    </span>
                    <span className="font-bold text-amber-600">
                      💬 {c.pipelineStats?.interview || 0}
                    </span>
                    <span className="font-bold text-emerald-600">
                      🎉 {c.pipelineStats?.hired || 0}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {c.inviteToken && !c.termsAccepted && (
                      <button
                        onClick={() => copyInviteLink(c.inviteToken!)}
                        className="p-1.5 rounded-lg border border-zinc-200 hover:bg-amber-50 text-zinc-600"
                        title="Copiar Link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleReissueInvite(c)}
                      className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600"
                      title="Reemitir Convite"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setFormData({
                          name: c.name,
                          tradeName: c.tradeName || "",
                          cnpj: c.cnpj || "",
                          segment: c.segment || "",
                          contactName: c.contactName,
                          contactEmail: c.contactEmail,
                          contactPhone: c.contactPhone || "",
                          notes: c.notes || "",
                        });
                        setEditingCompany(c);
                      }}
                      className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal: Cadastrar Empresa Parceira */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-zinc-200/80 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-zinc-900">
                  Cadastrar Empresa Parceira
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Nome Fantasia / Como a empresa é conhecida *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ex: Magazine Luiza, Nubank, Grupo Ultra..."
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Razão Social Oficial
                  </label>
                  <input
                    type="text"
                    value={formData.tradeName}
                    onChange={(e) =>
                      setFormData({ ...formData, tradeName: e.target.value })
                    }
                    placeholder="Ex: Magazine Luiza S.A."
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) =>
                      setFormData({ ...formData, cnpj: e.target.value })
                    }
                    placeholder="00.000.000/0000-00"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Setor de Atuação / Ramo
                  </label>
                  <input
                    type="text"
                    value={formData.segment}
                    onChange={(e) =>
                      setFormData({ ...formData, segment: e.target.value })
                    }
                    placeholder="Ex: Tecnologia, Varejo, Jurídico..."
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Nome do Responsável no RH *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactName}
                    onChange={(e) =>
                      setFormData({ ...formData, contactName: e.target.value })
                    }
                    placeholder="Ex: Ana Paula Ribeiro"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 mb-1">
                    E-mail Corporativo do Contato *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.contactEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, contactEmail: e.target.value })
                    }
                    placeholder="rh@empresa.com.br"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Telefone / WhatsApp do RH
                  </label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPhone: e.target.value })
                    }
                    placeholder="(11) 98765-4321"
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Anotações Internas da Coordenação
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Notas internas sobre perfil de vagas, convênio ou requisitos..."
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-900 text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? <LoadingSpinner size="sm" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Cadastrar e Gerar Convite</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Empresa */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-zinc-200/80 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-zinc-900">
                  Editar Empresa Parceira
                </h3>
              </div>
              <button
                onClick={() => setEditingCompany(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCompany} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Nome Fantasia *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Razão Social
                  </label>
                  <input
                    type="text"
                    value={formData.tradeName}
                    onChange={(e) =>
                      setFormData({ ...formData, tradeName: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) =>
                      setFormData({ ...formData, cnpj: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Responsável no RH *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contactName}
                    onChange={(e) =>
                      setFormData({ ...formData, contactName: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    E-mail de Contato *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.contactEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, contactEmail: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, contactPhone: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Setor de Atuação
                  </label>
                  <input
                    type="text"
                    value={formData.segment}
                    onChange={(e) =>
                      setFormData({ ...formData, segment: e.target.value })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Observações Internas
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-900 text-xs font-semibold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? <LoadingSpinner size="sm" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Convite Gerado com Sucesso */}
      {createdInviteData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-amber-300 animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Link de Ativação Corporativa Gerado!
                </h3>
                <p className="text-xs text-zinc-500">
                  Envie este link para {createdInviteData.contactName} ({createdInviteData.companyName})
                </p>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 space-y-2">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Link Oficial Temporário (7 dias)
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/empresa/ativar?token=${createdInviteData.inviteToken}`}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-xs font-mono text-zinc-800 focus:outline-none"
                />
                <button
                  onClick={() => copyInviteLink(createdInviteData.inviteToken)}
                  className="h-9 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Ao abrir o link, o recrutador aceitará o <strong>Termo de Compromisso e Confidencialidade LGPD</strong> e definirá a senha para acessar o banco de talentos.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              {createdInviteData.phone && (
                <a
                  href={`https://wa.me/55${createdInviteData.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Olá ${createdInviteData.contactName}! Segue o link exclusivo para ativação do acesso corporativo da ${createdInviteData.companyName} ao Banco de Talentos do Instituto Brilha Mais: ${window.location.origin}/empresa/ativar?token=${createdInviteData.inviteToken}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar pelo WhatsApp</span>
                </a>
              )}

              <button
                onClick={() => setCreatedInviteData(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
