import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Building2,
  Link2,
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
  ChevronDown,
  Check,
  ShieldCheck,
  Bookmark,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../utils/api";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../LoadingSpinner";
import Skeleton from "../Skeleton";
import CountUp from "../CountUp";
import Tooltip from "../Tooltip";
import { PortalModal } from "../PortalModal";
import { ConfirmModal } from "../ConfirmModal";
import { formatPhoneMask, formatCnpjMask } from "../../utils/formatters";

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

// Skeletons matching AdminDashboard pattern
const StatSkeleton = () => (
  <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
    <div className="space-y-2">
      <Skeleton className="h-3 w-20" variant="rectangle" />
      <Skeleton className="h-7 w-16" variant="rounded" />
    </div>
    <Skeleton className="h-10 w-10" variant="rounded" />
  </div>
);

const CompanyRowSkeleton = () => (
  <tr className="border-b border-slate-100 last:border-0">
    <td className="px-5 py-3.5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9" variant="rounded" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-36" variant="rectangle" />
          <Skeleton className="h-3 w-48" variant="rectangle" />
        </div>
      </div>
    </td>
    <td className="px-5 py-3.5">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-28" variant="rectangle" />
        <Skeleton className="h-3 w-36" variant="rectangle" />
      </div>
    </td>
    <td className="px-5 py-3.5 text-center">
      <Skeleton className="h-8 w-8 mx-auto" variant="rounded" />
    </td>
    <td className="px-5 py-3.5 text-center">
      <div className="flex justify-center gap-1.5">
        <Skeleton className="h-6 w-10" variant="rounded" />
        <Skeleton className="h-6 w-10" variant="rounded" />
        <Skeleton className="h-6 w-10" variant="rounded" />
      </div>
    </td>
    <td className="px-5 py-3.5 text-right">
      <div className="flex items-center justify-end gap-1.5">
        <Skeleton className="h-8 w-8" variant="rounded" />
        <Skeleton className="h-8 w-8" variant="rounded" />
        <Skeleton className="h-8 w-8" variant="rounded" />
      </div>
    </td>
  </tr>
);

const CompanyCardSkeleton = () => (
  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 overflow-hidden">
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1.5 flex-1 min-w-0">
        <Skeleton className="h-4 w-40" variant="rectangle" />
        <Skeleton className="h-3 w-32" variant="rectangle" />
      </div>
      <Skeleton className="h-6 w-16 shrink-0" variant="rounded" />
    </div>
    <div className="space-y-2 pt-3 border-t border-slate-100">
      <Skeleton className="h-3 w-36" variant="rectangle" />
      <Skeleton className="h-3 w-48" variant="rectangle" />
    </div>
    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
      <Skeleton className="h-4 w-28" variant="rectangle" />
      <div className="flex gap-1.5">
        <Skeleton className="h-7 w-7" variant="rounded" />
        <Skeleton className="h-7 w-7" variant="rounded" />
      </div>
    </div>
  </div>
);

// Standard Stat Card with CountUp
function AdminStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="p-5 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors shadow-2xs flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
          <CountUp value={value} />
        </p>
      </div>
      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
        {icon}
      </div>
    </div>
  );
}

// Standard FilterSelect matching AdminDashboard
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
  const isActive = value !== "ALL" && value !== "all";
  const selectedOption =
    value === "ALL" || value === "all"
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
          w-full sm:w-auto min-w-[150px] h-9 flex items-center justify-between px-3 rounded-lg text-xs font-medium outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-colors select-none cursor-pointer
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

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 top-full left-0 mt-1.5 w-[200px] bg-white border border-slate-200/90 rounded-xl shadow-lg overflow-hidden"
          >
            <div className="max-h-[260px] overflow-y-auto custom-scrollbar p-1 flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => {
                  onChange("all");
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                  value === "all" || value === "ALL"
                    ? "bg-amber-50 text-amber-800 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>Todos os Status</span>
                {(value === "all" || value === "ALL") && (
                  <Check className="h-3.5 w-3.5 text-amber-600 shrink-0 ml-1" />
                )}
              </button>
              {options
                .filter((opt) => opt.id !== "all" && opt.id !== "ALL")
                .map((opt) => {
                  const isSelected = value === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onChange(opt.id);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? "bg-amber-50 text-amber-800 font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className="truncate">{opt.name}</span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-amber-600 shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 20.16C10.57 20.16 9.12 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67C14.25 3.67 16.32 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.16 12.05 20.16ZM16.57 14.39C16.32 14.26 15.1 13.66 14.87 13.58C14.64 13.5 14.47 13.46 14.3 13.71C14.13 13.96 13.65 14.52 13.5 14.69C13.35 14.86 13.2 14.88 12.95 14.76C12.7 14.63 11.89 14.37 10.93 13.51C10.18 12.84 9.67 12.02 9.52 11.77C9.37 11.52 9.5 11.38 9.63 11.26C9.74 11.15 9.88 10.96 10.01 10.81C10.14 10.66 10.18 10.56 10.27 10.39C10.35 10.22 10.31 10.07 10.25 9.95C10.18 9.82 9.67 8.57 9.46 8.06C9.25 7.56 9.04 7.63 8.89 7.62C8.74 7.61 8.57 7.61 8.4 7.61C8.23 7.61 7.95 7.67 7.72 7.92C7.49 8.17 6.84 8.78 6.84 10.03C6.84 11.28 7.75 12.49 7.88 12.66C8.01 12.83 9.67 15.39 12.21 16.49C12.81 16.75 13.28 16.91 13.65 17.03C14.26 17.22 14.81 17.19 15.25 17.13C15.74 17.06 16.75 16.52 16.96 15.93C17.17 15.34 17.17 14.84 17.11 14.73C17.04 14.63 16.82 14.51 16.57 14.39Z" />
    </svg>
  );
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);
  const [reissuingId, setReissuingId] = useState<string | null>(null);
  const inviteInputRef = useRef<HTMLInputElement>(null);

  // Confirm Modal state (no window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: "danger" | "primary" | "warning";
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

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
    if (
      !formData.name.trim() ||
      !formData.contactName.trim() ||
      !formData.contactEmail.trim()
    ) {
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
    if (reissuingId) return;
    setReissuingId(company.id);
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
    } finally {
      setReissuingId(null);
    }
  };

  const handleToggleActive = (company: PartnerCompany) => {
    const isDeactivating = company.isActive;
    setConfirmModal({
      isOpen: true,
      title: isDeactivating
        ? "Desativar Empresa Parceira"
        : "Reativar Empresa Parceira",
      description: isDeactivating
        ? `Tem certeza que deseja suspender o convênio com ${company.name}? Os recrutadores desta empresa não conseguirão acessar o Banco de Talentos.`
        : `Deseja reativar o convênio e restaurar o acesso corporativo de ${company.name}?`,
      confirmText: isDeactivating ? "Sim, Desativar" : "Sim, Reativar",
      variant: isDeactivating ? "danger" : "primary",
      onConfirm: async () => {
        setIsConfirmLoading(true);
        try {
          await api.patch(`/companies/${company.id}`, {
            isActive: !company.isActive,
          });
          toast.success(
            `Empresa ${
              company.isActive ? "desativada" : "reativada"
            } com sucesso.`,
          );
          fetchData();
        } catch (err: any) {
          toast.error("Erro ao alterar status da empresa.");
        } finally {
          setIsConfirmLoading(false);
          setConfirmModal(null);
        }
      },
    });
  };

  const copyInviteLink = (token: string, rowId?: string) => {
    const url = `${window.location.origin}/empresa/ativar?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    if (rowId) {
      setCopiedRowId(rowId);
      setTimeout(() => setCopiedRowId(null), 2000);
    }
    toast.success(
      "Link oficial copiado para a área de transferência!",
    );
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyInviteInput = () => {
    if (!createdInviteData) return;
    const url = `${window.location.origin}/empresa/ativar?token=${createdInviteData.inviteToken}`;
    navigator.clipboard.writeText(url);
    inviteInputRef.current?.select();
    setCopiedLink(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedLink(false), 2000);
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
        if (
          !matchName &&
          !matchTrade &&
          !matchContact &&
          !matchEmail &&
          !matchCnpj
        ) {
          return false;
        }
      }

      if (statusFilter === "active" && (!c.isActive || !c.termsAccepted))
        return false;
      if (statusFilter === "pending" && (c.termsAccepted || !c.isActive))
        return false;
      if (statusFilter === "inactive" && c.isActive) return false;

      return true;
    });
  }, [companies, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <AdminStat
              icon={<Building2 className="h-5 w-5" />}
              label="Empresas Parceiras"
              value={stats?.totalCompanies ?? companies.length}
            />
            <AdminStat
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Empresas Ativas"
              value={stats?.activeCompanies ?? 0}
            />
            <AdminStat
              icon={<Users className="h-5 w-5" />}
              label="Em Entrevista"
              value={stats?.totalInterview ?? 0}
            />
            <AdminStat
              icon={<Award className="h-5 w-5" />}
              label="Contratações"
              value={stats?.totalHired ?? 0}
            />
          </>
        )}
      </div>

      {/* Desktop Table View (Matching Banco de Talentos unified pattern) */}
      <div className="hidden xl:block bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden relative z-20">
        {/* Header Interno com Filtros */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row gap-2.5 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-2.5 items-center flex-1 w-full md:w-auto">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por empresa, contato, e-mail..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 bg-white border border-slate-200/80 rounded-lg pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                <FilterSelect
                  icon={CheckCircle2}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="Status"
                  options={[
                    { id: "all", name: "Todos os Status" },
                    { id: "active", name: "Ativas (LGPD Aceito)" },
                    { id: "pending", name: "Convite Pendente" },
                    { id: "inactive", name: "Inativas" },
                  ]}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-slate-500 hidden sm:inline">
                Total:{" "}
                <strong className="text-slate-900 font-semibold">
                  {filteredCompanies.length}
                </strong>{" "}
                {filteredCompanies.length === 1 ? "empresa" : "empresas"}
              </span>

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
                className="h-10 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs transition-all active:scale-[0.98] shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Empresa Parceira</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Empresas */}
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200/80 text-xs font-semibold text-slate-600 bg-slate-50/75">
                <th className="px-5 py-3 w-[28%]">Empresa</th>
                <th className="px-5 py-3 w-[26%]">Contato RH</th>
                <th className="px-5 py-3 w-[12%] text-center">Status / LGPD</th>
                <th className="px-5 py-3 w-[20%] text-center">Funil de Talentos</th>
                <th className="px-5 py-3 w-[14%] text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <>
                  <CompanyRowSkeleton />
                  <CompanyRowSkeleton />
                  <CompanyRowSkeleton />
                </>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {search || statusFilter !== "all"
                        ? "Nenhuma empresa encontrada"
                        : "Nenhuma empresa parceira cadastrada"}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      {search || statusFilter !== "all"
                        ? "A busca atual não retornou resultados com os filtros selecionados."
                        : "Cadastre empresas conveniadas para emitir convites e abrir o acesso ao Banco de Talentos."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Empresa */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0 font-bold text-xs shadow-2xs">
                          <Building2 className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate text-xs sm:text-sm">
                            {c.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate mt-0.5">
                            <span className="truncate">
                              {c.tradeName || c.segment || "Empresa Parceira"}
                            </span>
                            {c.cnpj && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="font-mono text-slate-500 font-medium shrink-0">
                                  {formatCnpjMask(c.cnpj)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contato RH */}
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800 text-xs truncate leading-snug">
                        {c.contactName}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate mt-0.5">
                        <span className="truncate">{c.contactEmail}</span>
                        {c.contactPhone && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 font-medium shrink-0">
                              {formatPhoneMask(c.contactPhone)}
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Status & LGPD */}
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center">
                        {!c.isActive ? (
                          <Tooltip
                            content={
                              <div className="space-y-0.5">
                                <p className="font-semibold text-slate-300 text-xs flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                                  Empresa Inativa
                                </p>
                                <p className="text-[11px] text-slate-400 leading-snug">
                                  O acesso desta empresa parceira está desativado no sistema.
                                </p>
                              </div>
                            }
                          >
                            <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 border border-slate-200/80 flex items-center justify-center cursor-help transition-all hover:bg-slate-100 hover:border-slate-300 shadow-2xs">
                              <AlertCircle className="w-4 h-4 text-slate-400" />
                            </div>
                          </Tooltip>
                        ) : c.termsAccepted ? (
                          <Tooltip
                            content={
                              <div className="space-y-0.5">
                                <p className="font-semibold text-emerald-400 text-xs flex items-center gap-1.5">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                  Ativa (Termo LGPD Aceito)
                                </p>
                                <p className="text-[11px] text-slate-300 leading-snug">
                                  Termo de Compromisso e Confidencialidade LGPD assinado digitalmente. Acesso liberado ao banco.
                                </p>
                              </div>
                            }
                          >
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center cursor-help transition-all hover:bg-emerald-100 hover:border-emerald-300 shadow-2xs">
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            </div>
                          </Tooltip>
                        ) : c.isInviteExpired ? (
                          <Tooltip
                            content={
                              <div className="space-y-0.5">
                                <p className="font-semibold text-red-400 text-xs flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                  Convite Expirado
                                </p>
                                <p className="text-[11px] text-slate-300 leading-snug">
                                  O link de convite expirou (validade de 7 dias). Clique em reemitir para gerar um novo.
                                </p>
                              </div>
                            }
                          >
                            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 border border-red-200/80 flex items-center justify-center cursor-help transition-all hover:bg-red-100 hover:border-red-300 shadow-2xs">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            </div>
                          </Tooltip>
                        ) : (
                          <Tooltip
                            content={
                              <div className="space-y-0.5">
                                <p className="font-semibold text-amber-400 text-xs flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                                  Convite Pendente
                                </p>
                                <p className="text-[11px] text-slate-300 leading-snug">
                                  Aguardando primeiro acesso do recrutador para aceite do termo LGPD e criação de senha.
                                </p>
                              </div>
                            }
                          >
                            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center cursor-help transition-all hover:bg-amber-100 hover:border-amber-300 shadow-2xs">
                              <Clock className="w-4 h-4 text-amber-600" />
                            </div>
                          </Tooltip>
                        )}
                      </div>
                    </td>

                    {/* Funil de Talentos */}
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Tooltip content={`${c.pipelineStats?.saved || 0} alunos salvos no radar`}>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60 text-xs font-medium">
                            <Bookmark className="w-3 h-3 text-slate-500" />
                            <span>{c.pipelineStats?.saved || 0}</span>
                          </span>
                        </Tooltip>
                        <Tooltip content={`${c.pipelineStats?.interview || 0} em processo seletivo`}>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 text-xs font-medium">
                            <UserCheck className="w-3 h-3 text-amber-600" />
                            <span>{c.pipelineStats?.interview || 0}</span>
                          </span>
                        </Tooltip>
                        <Tooltip content={`${c.pipelineStats?.hired || 0} contratações efetivadas`}>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-medium">
                            <Award className="w-3 h-3 text-emerald-600" />
                            <span>{c.pipelineStats?.hired || 0}</span>
                          </span>
                        </Tooltip>
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.inviteToken && !c.termsAccepted && (
                          <Tooltip content={copiedRowId === c.id ? "Link copiado!" : "Copiar link de convite"}>
                            <button
                              type="button"
                              onClick={() => copyInviteLink(c.inviteToken!, c.id)}
                              className="w-8 h-8 rounded-xl bg-white hover:bg-amber-50 text-slate-500 hover:text-amber-600 border border-zinc-200/80 hover:border-amber-300 flex items-center justify-center transition-all shadow-2xs cursor-pointer group"
                            >
                              {copiedRowId === c.id ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4 group-hover:scale-105 transition-transform" />
                              )}
                            </button>
                          </Tooltip>
                        )}

                        <Tooltip content="Gerar / Reemitir Link de Convite">
                          <button
                            type="button"
                            onClick={() => handleReissueInvite(c)}
                            disabled={reissuingId === c.id}
                            className="w-8 h-8 rounded-xl bg-white hover:bg-amber-50 text-slate-500 hover:text-amber-600 border border-zinc-200/80 hover:border-amber-300 flex items-center justify-center transition-all shadow-2xs cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <RefreshCw
                              className={`w-4 h-4 group-hover:scale-105 transition-transform ${
                                reissuingId === c.id
                                  ? "animate-spin text-amber-600"
                                  : ""
                              }`}
                            />
                          </button>
                        </Tooltip>

                        <Tooltip content="Editar Dados da Empresa">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                name: c.name,
                                tradeName: c.tradeName || "",
                                cnpj: formatCnpjMask(c.cnpj) || "",
                                segment: c.segment || "",
                                contactName: c.contactName,
                                contactEmail: c.contactEmail,
                                contactPhone: formatPhoneMask(c.contactPhone) || "",
                                notes: c.notes || "",
                              });
                              setEditingCompany(c);
                            }}
                            className="w-8 h-8 rounded-xl bg-white hover:bg-amber-50 text-slate-500 hover:text-amber-600 border border-zinc-200/80 hover:border-amber-300 flex items-center justify-center transition-all shadow-2xs cursor-pointer group"
                          >
                            <Edit2 className="w-4 h-4 group-hover:scale-105 transition-transform" />
                          </button>
                        </Tooltip>

                        <Tooltip content={c.isActive ? "Desativar Empresa" : "Reativar Empresa"}>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(c)}
                            className={`w-8 h-8 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-center transition-all shadow-2xs cursor-pointer group ${
                              c.isActive
                                ? "hover:bg-red-50 text-slate-500 hover:text-red-600 hover:border-red-300"
                                : "hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 hover:border-emerald-300"
                            }`}
                          >
                            <Trash2 className="w-4 h-4 group-hover:scale-105 transition-transform" />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List (Matching Banco de Talentos mobile pattern) */}
      <div className="xl:hidden space-y-4">
        {/* Mobile Filter & Action Header */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por empresa, contato, e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 bg-white border border-slate-200/80 rounded-lg pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none transition-all"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <FilterSelect
                icon={CheckCircle2}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Status"
                options={[
                  { id: "all", name: "Todos os Status" },
                  { id: "active", name: "Ativas" },
                  { id: "pending", name: "Pendentes" },
                  { id: "inactive", name: "Inativas" },
                ]}
              />
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
              className="h-9 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-xs transition-all active:scale-[0.98] shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar</span>
            </button>
          </div>
        </div>

        {loading ? (
          <>
            <CompanyCardSkeleton />
            <CompanyCardSkeleton />
          </>
        ) : filteredCompanies.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center shadow-2xs">
            <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-900">
              Nenhuma empresa encontrada
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              A busca atual não retornou resultados.
            </p>
          </div>
        ) : (
          filteredCompanies.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0 font-bold text-sm shadow-2xs">
                    <Building2 className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm text-slate-900 truncate leading-snug">
                      {c.name}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {c.tradeName || c.segment || "Empresa Parceira"}
                      {c.cnpj && ` • ${formatCnpjMask(c.cnpj)}`}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {!c.isActive ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      Inativa
                    </span>
                  ) : c.termsAccepted ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      Ativa
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Pendente
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Contato:</span>
                  <span className="font-medium text-slate-800">
                    {c.contactName}
                  </span>
                </div>
                <div className="flex items-center justify-between truncate">
                  <span className="text-slate-400 font-medium">E-mail:</span>
                  <span className="text-slate-600 truncate">{c.contactEmail}</span>
                </div>
                {c.contactPhone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">
                      Telefone / Whats:
                    </span>
                    <span className="text-slate-600 font-medium">
                      {formatPhoneMask(c.contactPhone)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-slate-400 font-medium">
                  Funil de Vagas:
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/60 text-[11px] font-medium"
                    title="Radar"
                  >
                    <Bookmark className="w-3 h-3 text-slate-500" />{" "}
                    {c.pipelineStats?.saved || 0}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 text-[11px] font-medium"
                    title="Entrevista"
                  >
                    <UserCheck className="w-3 h-3 text-amber-600" />{" "}
                    {c.pipelineStats?.interview || 0}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-medium"
                    title="Contratados"
                  >
                    <Award className="w-3 h-3 text-emerald-600" />{" "}
                    {c.pipelineStats?.hired || 0}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                {c.inviteToken && !c.termsAccepted && (
                  <button
                    type="button"
                    onClick={() => copyInviteLink(c.inviteToken!, c.id)}
                    className="h-8 px-3 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedRowId === c.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleReissueInvite(c)}
                  disabled={reissuingId === c.id}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      reissuingId === c.id ? "animate-spin text-amber-600" : ""
                    }`}
                  />
                  <span>Reemitir</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      name: c.name,
                      tradeName: c.tradeName || "",
                      cnpj: formatCnpjMask(c.cnpj) || "",
                      segment: c.segment || "",
                      contactName: c.contactName,
                      contactEmail: c.contactEmail,
                      contactPhone: formatPhoneMask(c.contactPhone) || "",
                      notes: c.notes || "",
                    });
                    setEditingCompany(c);
                  }}
                  className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal V2: Cadastrar Empresa Parceira */}
      <PortalModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      >
        <div className="relative w-full max-w-xl bg-white border border-slate-200/80 rounded-2xl p-6 md:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-slate-900 leading-tight">
                Cadastrar Empresa Parceira
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cadastre uma nova organização para conceder acesso corporativo ao Banco de Talentos.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form
            onSubmit={handleCreateCompany}
            className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs custom-scrollbar"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                  className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Razão Social Oficial
                </label>
                <input
                  type="text"
                  value={formData.tradeName}
                  onChange={(e) =>
                    setFormData({ ...formData, tradeName: e.target.value })
                  }
                  placeholder="Ex: Magazine Luiza S.A."
                  className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={formData.cnpj}
                  maxLength={18}
                  onChange={(e) =>
                    setFormData({ ...formData, cnpj: formatCnpjMask(e.target.value) })
                  }
                  placeholder="00.000.000/0000-00"
                  className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Setor de Atuação / Ramo
                </label>
                <input
                  type="text"
                  value={formData.segment}
                  onChange={(e) =>
                    setFormData({ ...formData, segment: e.target.value })
                  }
                  placeholder="Ex: Tecnologia, Varejo, Jurídico..."
                  className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                  className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  E-mail Corporativo do Contato *
                </label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contactEmail: e.target.value,
                    })
                  }
                  placeholder="rh@empresa.com.br"
                  className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Telefone / WhatsApp do RH
                </label>
                <input
                  type="text"
                  value={formData.contactPhone}
                  maxLength={15}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contactPhone: formatPhoneMask(e.target.value),
                    })
                  }
                  placeholder="(11) 98765-4321"
                  className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Anotações Internas da Coordenação
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Notas internas sobre perfil de vagas, convênio ou requisitos..."
                  className="w-full p-3 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none resize-none transition-colors"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" variant="white" />
                    <span>Cadastrando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar e Gerar Convite</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </PortalModal>

      {/* Modal V2: Editar Empresa */}
      <PortalModal
        isOpen={!!editingCompany}
        onClose={() => setEditingCompany(null)}
      >
        <div className="relative w-full max-w-xl bg-white border border-slate-200/80 rounded-2xl p-6 md:p-7 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-slate-900 leading-tight">
                Editar Empresa Parceira
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Atualize as informações cadastrais e contatos da organização conveniada.
              </p>
            </div>
            <button
              onClick={() => setEditingCompany(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form
            onSubmit={handleUpdateCompany}
            className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs custom-scrollbar"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                  className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Razão Social Oficial
                </label>
                <input
                  type="text"
                  value={formData.tradeName}
                  onChange={(e) =>
                    setFormData({ ...formData, tradeName: e.target.value })
                  }
                  placeholder="Ex: Magazine Luiza S.A."
                  className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  CNPJ
                </label>
                <input
                  type="text"
                  value={formData.cnpj}
                  maxLength={18}
                  onChange={(e) =>
                    setFormData({ ...formData, cnpj: formatCnpjMask(e.target.value) })
                  }
                  placeholder="00.000.000/0000-00"
                  className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Setor de Atuação / Ramo
                </label>
                <input
                  type="text"
                  value={formData.segment}
                  onChange={(e) =>
                    setFormData({ ...formData, segment: e.target.value })
                  }
                  placeholder="Ex: Tecnologia, Varejo, Jurídico..."
                  className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                  className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  E-mail Corporativo do Contato *
                </label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contactEmail: e.target.value,
                    })
                  }
                  placeholder="rh@empresa.com.br"
                  className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Telefone / WhatsApp do RH
                </label>
                <input
                  type="text"
                  value={formData.contactPhone}
                  maxLength={15}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contactPhone: formatPhoneMask(e.target.value),
                    })
                  }
                  placeholder="(11) 98765-4321"
                  className="w-full h-10 bg-white border border-slate-200/80 rounded-xl px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Anotações Internas da Coordenação
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Notas internas sobre perfil de vagas, convênio ou requisitos..."
                  className="w-full p-3 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none resize-none transition-colors"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingCompany(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" variant="white" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </PortalModal>

      {/* Modal: Convite Gerado */}
      <PortalModal
        isOpen={!!createdInviteData}
        onClose={() => setCreatedInviteData(null)}
      >
        <div className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xl text-left space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                <Link2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  Link de Ativação
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {createdInviteData?.contactName} • {createdInviteData?.companyName}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCreatedInviteData(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Link de acesso exclusivo
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={inviteInputRef}
                type="text"
                readOnly
                value={`${window.location.origin}/empresa/ativar?token=${createdInviteData?.inviteToken}`}
                onFocus={(e) => e.target.select()}
                className="flex-1 h-10 px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-mono text-slate-700 outline-none focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors cursor-text select-all"
              />
              <button
                type="button"
                onClick={handleCopyInviteInput}
                className={`h-10 px-4 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  copiedLink
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs"
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Válido por 7 dias. O recrutador aceitará o termo da LGPD no primeiro acesso.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setCreatedInviteData(null)}
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Concluir
            </button>

            {createdInviteData?.phone && (
              <a
                href={`https://wa.me/55${createdInviteData.phone.replace(
                  /\D/g,
                  "",
                )}?text=${encodeURIComponent(
                  `Olá ${createdInviteData.contactName}! Segue o link de ativação da ${createdInviteData.companyName} no Banco de Talentos do Instituto Brilha Mais: ${window.location.origin}/empresa/ativar?token=${createdInviteData.inviteToken}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] active:scale-[0.98] text-white text-xs font-medium flex items-center gap-2 cursor-pointer shadow-xs transition-all"
              >
                <WhatsAppIcon className="w-4 h-4 fill-white" />
                <span>Enviar pelo WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </PortalModal>

      {/* Confirm Modal V2 (substituindo window.confirm) */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => !isConfirmLoading && setConfirmModal(null)}
          onConfirm={confirmModal.onConfirm}
          isLoading={isConfirmLoading}
          title={confirmModal.title}
          description={confirmModal.description}
          confirmText={confirmModal.confirmText}
          variant={confirmModal.variant}
        />
      )}
    </div>
  );
}
