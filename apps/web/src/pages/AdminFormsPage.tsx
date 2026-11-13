import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ClipboardList,
    Copy,
    Download,
    Edit3,
    ExternalLink,
    FileSpreadsheet,
    Globe,
    Loader2,
    MapPin,
    Plus,
    Power,
    QrCode,
    Search,
    Sparkles,
    Trash2,
    Users,
    Check,
    X,
    Clock,
    CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { FormModel } from '../utils/formTypes';
import { PortalModal } from '../components/PortalModal';
import { ConfirmModal } from '../components/ConfirmModal';
import Skeleton from '../components/Skeleton';
import CountUp from '../components/CountUp';
import Tooltip from '../components/Tooltip';

// Standard Stat Card matching AdminDashboard / CompanyManagementTab
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

const StatSkeleton = () => (
    <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div className="space-y-2">
            <Skeleton className="h-3 w-20" variant="rectangle" />
            <Skeleton className="h-7 w-16" variant="rounded" />
        </div>
        <Skeleton className="h-10 w-10" variant="rounded" />
    </div>
);

const FormCardSkeleton = () => (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 space-y-3 md:space-y-0 md:flex md:items-start md:justify-between md:gap-4">
            <div className="flex items-center justify-between gap-2.5 md:hidden">
                <Skeleton className="h-10 w-10 shrink-0" variant="rounded" />
                <div className="flex items-center gap-1.5">
                    <Skeleton className="h-5 w-16" variant="rounded" />
                    <Skeleton className="h-5 w-16" variant="rounded" />
                </div>
            </div>
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <Skeleton className="hidden md:block h-10 w-10 shrink-0" variant="rounded" />
                <div className="space-y-2 flex-1 min-w-0">
                    <Skeleton className="h-5 w-3/4 sm:w-56" variant="rectangle" />
                    <Skeleton className="h-4 w-44 md:w-72" variant="rectangle" />
                    <Skeleton className="h-9 w-full md:hidden" variant="rounded" />
                </div>
            </div>
            <Skeleton className="hidden md:block h-6 w-20 shrink-0" variant="rounded" />
        </div>
        <div className="px-4 py-3 md:px-5 bg-slate-50/50 border-t border-slate-100">
            <div className="md:hidden space-y-2">
                <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-9 w-full" variant="rounded" />
                    <Skeleton className="h-9 w-full" variant="rounded" />
                </div>
                <div className="flex items-center gap-1.5">
                    <Skeleton className="h-9 flex-1" variant="rounded" />
                    <Skeleton className="h-9 w-9 shrink-0" variant="rounded" />
                    <Skeleton className="h-9 w-9 shrink-0" variant="rounded" />
                    <Skeleton className="h-9 w-9 shrink-0" variant="rounded" />
                </div>
            </div>
            <div className="hidden md:flex items-center justify-between gap-3">
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-28" variant="rounded" />
                    <Skeleton className="h-8 w-20" variant="rounded" />
                    <Skeleton className="h-8 w-28" variant="rounded" />
                </div>
                <div className="flex gap-1.5">
                    <Skeleton className="h-8 w-8" variant="rounded" />
                    <Skeleton className="h-8 w-8" variant="rounded" />
                    <Skeleton className="h-8 w-8" variant="rounded" />
                </div>
            </div>
        </div>
    </div>
);

export default function AdminFormsPage() {
    const navigate = useNavigate();
    const [forms, setForms] = useState<FormModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

    const [shareForm, setShareForm] = useState<FormModel | null>(null);
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
    const qrWrapperRef = useRef<HTMLDivElement>(null);

    const [deleteTarget, setDeleteTarget] = useState<FormModel | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const loadForms = async () => {
        setLoading(true);
        try {
            const res = await api.get('/forms');
            setForms(res.data || []);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao carregar formulários.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadForms();
    }, []);

    const filteredForms = useMemo(() => {
        return forms.filter((form) => {
            if (statusFilter === 'ACTIVE' && !form.isActive) return false;
            if (statusFilter === 'INACTIVE' && form.isActive) return false;
            if (search.trim()) {
                const q = search.trim().toLowerCase();
                return (
                    form.title.toLowerCase().includes(q) ||
                    form.slug.toLowerCase().includes(q) ||
                    form.location?.name?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [forms, search, statusFilter]);

    const stats = useMemo(() => {
        const total = forms.length;
        const active = forms.filter((f) => f.isActive).length;
        const totalSubmissions = forms.reduce(
            (acc, f) => acc + (f._count?.submissions || 0),
            0,
        );
        const pendingTriage = forms.reduce(
            (acc, f) => acc + (f.statusCounts?.PENDING || 0),
            0,
        );
        return { total, active, totalSubmissions, pendingTriage };
    }, [forms]);

    const handleCreateFromTemplate = async () => {
        setIsCreatingTemplate(true);
        try {
            const res = await api.post('/forms/from-template', {
                templateKey: 'brilha-mais-2027',
            });
            toast.success('Formulário criado a partir do modelo Brilha Mais 2027!');
            setIsNewModalOpen(false);
            navigate(`/admin/formularios/${res.data.id}/editar`);
        } catch (err: any) {
            toast.error(
                err.response?.data?.message || 'Erro ao criar formulário a partir do modelo.',
            );
        } finally {
            setIsCreatingTemplate(false);
        }
    };

    const handleToggleActive = async (form: FormModel) => {
        setBusyId(form.id);
        try {
            await api.patch(`/forms/${form.id}/toggle-active`);
            toast.success(
                form.isActive ? 'Formulário desativado.' : 'Formulário ativado!',
            );
            await loadForms();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao alterar status.');
        } finally {
            setBusyId(null);
        }
    };

    const handleDuplicate = async (form: FormModel) => {
        setBusyId(form.id);
        try {
            const res = await api.post(`/forms/${form.id}/duplicate`);
            toast.success('Formulário duplicado como rascunho inativo.');
            navigate(`/admin/formularios/${res.data.id}/editar`);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao duplicar formulário.');
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await api.delete(`/forms/${deleteTarget.id}`);
            toast.success('Formulário excluído com sucesso.');
            setDeleteTarget(null);
            await loadForms();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao excluir formulário.');
        } finally {
            setIsDeleting(false);
        }
    };

    const getPublicUrl = (slug: string) =>
        `${window.location.origin}/inscricao/${slug}`;

    const handleCopyPublicUrl = async (slug: string) => {
        try {
            await navigator.clipboard.writeText(getPublicUrl(slug));
            setCopiedSlug(slug);
            toast.success('Link público copiado para a área de transferência!');
            setTimeout(() => setCopiedSlug(null), 2500);
        } catch {
            toast.error('Não foi possível copiar o link.');
        }
    };

    const handleDownloadQr = (slug: string) => {
        const canvas = qrWrapperRef.current?.querySelector('canvas');
        if (!canvas) return;
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = url;
        link.download = `qrcode-${slug}.png`;
        link.click();
    };

    const renderAvailabilityBadge = (form: FormModel) => {
        const status = form.availabilityStatus;
        if (status === 'OPEN') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Aberto
                </span>
            );
        }
        if (status === 'NOT_STARTED') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Agendado
                </span>
            );
        }
        if (status === 'CLOSED') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    Encerrado
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200/80">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                Inativo
            </span>
        );
    };

    const renderLocationBadge = (form: FormModel) =>
        form.location?.name ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200/60">
                <MapPin className="h-3 w-3 text-amber-500" />
                {form.location.name}
            </span>
        ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200/60">
                <Globe className="h-3 w-3 text-slate-400" />
                Global
            </span>
        );

    const formatStructureSummary = (form: FormModel) => {
        const sectionsCount = form._count?.sections || 0;
        const fieldsCount = form._count?.fields || 0;
        return `${sectionsCount} ${sectionsCount === 1 ? 'bloco' : 'blocos'} · ${fieldsCount} ${fieldsCount === 1 ? 'pergunta' : 'perguntas'}`;
    };

    return (
        <div className="space-y-8 w-full pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                        Formulários de Inscrição
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Gerencie formulários dinâmicos, links públicos para candidatos e o funil de triagem de matrículas.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setIsNewModalOpen(true)}
                    className="w-full sm:w-auto h-10 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    <span>Novo Formulário</span>
                </button>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
            >
                {/* KPI Cards Strip */}
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
                                icon={<ClipboardList className="h-5 w-5" />}
                                label="Formulários"
                                value={stats.total}
                            />
                            <AdminStat
                                icon={<CheckCircle2 className="h-5 w-5" />}
                                label="Ativos Agora"
                                value={stats.active}
                            />
                            <AdminStat
                                icon={<Users className="h-5 w-5" />}
                                label="Inscrições Recebidas"
                                value={stats.totalSubmissions}
                            />
                            <AdminStat
                                icon={<Clock className="h-5 w-5" />}
                                label="Pendentes de Triagem"
                                value={stats.pendingTriage}
                            />
                        </>
                    )}
                </div>

                {/* Search & Filter Toolbar */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por título, slug ou polo..."
                                className="w-full h-9 bg-white border border-slate-200/80 rounded-lg pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none focus:outline-none focus-visible:outline-none transition-colors"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-3 sm:inline-flex w-full sm:w-auto p-1 bg-slate-100 rounded-xl border border-slate-200/60">
                            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => setStatusFilter(st)}
                                    className={`px-3 py-1.5 rounded-lg text-xs text-center flex items-center justify-center transition-all whitespace-nowrap cursor-pointer ${
                                        statusFilter === st
                                            ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900 font-medium'
                                    }`}
                                >
                                    {st === 'ALL' ? 'Todos' : st === 'ACTIVE' ? 'Ativos' : 'Inativos'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <span className="text-xs text-slate-500">
                            Total:{' '}
                            <strong className="text-slate-900 font-semibold">
                                {filteredForms.length}
                            </strong>{' '}
                            {filteredForms.length === 1 ? 'formulário' : 'formulários'}
                        </span>
                    </div>
                </div>

                {/* Forms List */}
                {loading ? (
                    <div className="space-y-4">
                        <FormCardSkeleton />
                        <FormCardSkeleton />
                        <FormCardSkeleton />
                    </div>
                ) : filteredForms.length === 0 ? (
                    <div className="py-12 px-4 text-center bg-white border border-slate-200/80 rounded-2xl shadow-2xs">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400 mx-auto mb-3">
                            <ClipboardList className="h-6 w-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900">
                            {forms.length === 0
                                ? 'Nenhum formulário criado ainda'
                                : 'Nenhum formulário corresponde aos filtros'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            {forms.length === 0
                                ? 'Comece rapidamente usando o modelo pronto da Turma 2027 em formato de Ficha Única ou crie um novo formulário em branco.'
                                : 'Tente buscar com outros termos ou selecione o filtro "Todos".'}
                        </p>
                        {forms.length === 0 && (
                            <div className="pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsNewModalOpen(true)}
                                    className="h-10 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs inline-flex items-center gap-2 active:scale-[0.98] transition-all shadow-xs cursor-pointer"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Criar Primeiro Formulário</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredForms.map((form) => {
                            const totalSubs = form._count?.submissions || 0;
                            const isBusy = busyId === form.id;
                            const isCopied = copiedSlug === form.slug;

                            return (
                                <div
                                    key={form.id}
                                    className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl shadow-2xs transition-all overflow-hidden group"
                                >
                                    {/* Mobile Top Content Area */}
                                    <div className="md:hidden p-4 space-y-3">
                                        {/* Top Row: Icon + Status & Scope Badges */}
                                        <div className="flex items-center justify-between gap-2.5">
                                            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                                                <ClipboardList className="h-5 w-5" />
                                            </div>

                                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                                                {renderLocationBadge(form)}
                                                {form.showOnLandingPage && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
                                                        <Sparkles className="h-3 w-3 text-amber-600" />
                                                        Destaque
                                                    </span>
                                                )}
                                                {renderAvailabilityBadge(form)}
                                            </div>
                                        </div>

                                        {/* Full-width Title & Structure Summary */}
                                        <div className="space-y-0.5">
                                            <Link
                                                to={`/admin/formularios/${form.id}/editar`}
                                                className="block text-[15px] font-semibold text-slate-900 active:text-amber-600 transition-colors leading-snug line-clamp-2"
                                            >
                                                {form.title}
                                            </Link>
                                            <p className="text-xs text-slate-500">
                                                {formatStructureSummary(form)}
                                            </p>
                                        </div>

                                        {/* Full-width Public URL Copy Bar */}
                                        <button
                                            type="button"
                                            onClick={() => handleCopyPublicUrl(form.slug)}
                                            className="w-full px-3 py-2 rounded-xl bg-slate-50 active:bg-slate-100 border border-slate-200/80 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                                        >
                                            <span className="font-mono text-xs text-slate-700 truncate">
                                                /inscricao/{form.slug}
                                            </span>
                                            <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                                {isCopied ? (
                                                    <>
                                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                        <span className="text-emerald-700 font-semibold">Copiado</span>
                                                    </>
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                                                )}
                                            </span>
                                        </button>
                                    </div>

                                    {/* Mobile Bottom Action Toolbar */}
                                    <div className="md:hidden px-4 py-3 bg-slate-50/60 border-t border-slate-100 space-y-2">
                                        {/* Row 1: 50/50 Primary Workflow Actions */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <Link
                                                to={`/admin/formularios/${form.id}/respostas`}
                                                className="h-9 px-3 rounded-xl bg-amber-50 active:bg-amber-100/80 text-amber-900 border border-amber-200/80 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-2xs"
                                            >
                                                <Users className="h-3.5 w-3.5 text-amber-600" />
                                                <span>Respostas ({totalSubs})</span>
                                            </Link>

                                            <Link
                                                to={`/admin/formularios/${form.id}/editar`}
                                                className="h-9 px-3 rounded-xl border border-slate-200/80 bg-white active:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-2xs"
                                            >
                                                <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                                                <span>Editar</span>
                                            </Link>
                                        </div>

                                        {/* Row 2: Share + Management Utilities */}
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setShareForm(form)}
                                                className="flex-1 h-9 px-3 rounded-xl border border-slate-200/80 bg-white active:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-2xs cursor-pointer"
                                            >
                                                <QrCode className="h-3.5 w-3.5 text-amber-600" />
                                                <span>Compartilhar</span>
                                            </button>

                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => handleDuplicate(form)}
                                                aria-label="Duplicar formulário"
                                                className="w-9 h-9 rounded-xl bg-white active:bg-amber-50 text-slate-500 border border-slate-200/80 flex items-center justify-center transition-all active:scale-[0.98] shadow-2xs shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>

                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => handleToggleActive(form)}
                                                aria-label={form.isActive ? 'Desativar formulário' : 'Ativar formulário'}
                                                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all active:scale-[0.98] shadow-2xs shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                                    form.isActive
                                                        ? 'border-emerald-200/80 bg-emerald-50 text-emerald-600 active:bg-emerald-100'
                                                        : 'border-slate-200/80 bg-white text-slate-400 active:bg-slate-50'
                                                }`}
                                            >
                                                <Power className="w-4 h-4" />
                                            </button>

                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={() => setDeleteTarget(form)}
                                                aria-label="Excluir formulário"
                                                className="w-9 h-9 rounded-xl bg-white active:bg-red-50 border border-slate-200/80 text-slate-500 flex items-center justify-center transition-all active:scale-[0.98] shadow-2xs shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Desktop Top Content Area */}
                                    <div className="hidden md:block p-5">
                                        <div className="flex items-start gap-3.5">
                                            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                                                <ClipboardList className="h-5 w-5" />
                                            </div>

                                            <div className="min-w-0 flex-1 space-y-2">
                                                {/* Header row */}
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                                                        <Link
                                                            to={`/admin/formularios/${form.id}/editar`}
                                                            className="text-base font-semibold text-slate-900 group-hover:text-amber-600 transition-colors truncate leading-snug"
                                                        >
                                                            {form.title}
                                                        </Link>
                                                        {renderAvailabilityBadge(form)}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                                        {renderLocationBadge(form)}
                                                        {form.showOnLandingPage && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
                                                                <Sparkles className="h-3 w-3 text-amber-600" />
                                                                Destaque na Home
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Metadata row */}
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyPublicUrl(form.slug)}
                                                        className="font-mono bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg text-slate-700 transition-colors inline-flex items-center gap-1.5 group/slug cursor-pointer"
                                                        title="Clique para copiar o link público"
                                                    >
                                                        {isCopied ? (
                                                            <Check className="h-3 w-3 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="h-3 w-3 text-slate-400 group-hover/slug:text-slate-600" />
                                                        )}
                                                        <span>/inscricao/{form.slug}</span>
                                                    </button>

                                                    <span className="text-slate-300">·</span>

                                                    <span>
                                                        {formatStructureSummary(form)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop Bottom Action Toolbar */}
                                    <div className="hidden md:flex px-5 py-3 bg-slate-50/50 border-t border-slate-100 items-center justify-between gap-3">
                                        {/* Left: Primary workflow actions */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Link
                                                to={`/admin/formularios/${form.id}/respostas`}
                                                className="h-8 px-3 rounded-lg bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200/80 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                                            >
                                                <Users className="h-3.5 w-3.5 text-amber-600" />
                                                <span>Respostas ({totalSubs})</span>
                                            </Link>

                                            <Link
                                                to={`/admin/formularios/${form.id}/editar`}
                                                className="h-8 px-3 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                                            >
                                                <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                                                <span>Editar</span>
                                            </Link>

                                            <Tooltip content="Compartilhar Link e QR Code">
                                                <button
                                                    type="button"
                                                    onClick={() => setShareForm(form)}
                                                    className="h-8 px-3 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                                                >
                                                    <QrCode className="h-3.5 w-3.5 text-amber-600" />
                                                    <span>Compartilhar</span>
                                                </button>
                                            </Tooltip>
                                        </div>

                                        {/* Right: Management tools */}
                                        <div className="flex items-center gap-1.5 ml-auto">
                                            <Tooltip content="Duplicar formulário">
                                                <button
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => handleDuplicate(form)}
                                                    className="w-8 h-8 rounded-xl bg-white hover:bg-amber-50 text-slate-500 hover:text-amber-600 border border-slate-200/80 hover:border-amber-300 flex items-center justify-center transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </Tooltip>

                                            <Tooltip content={form.isActive ? 'Desativar formulário' : 'Ativar formulário'}>
                                                <button
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => handleToggleActive(form)}
                                                    className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                                        form.isActive
                                                            ? 'border-emerald-200/80 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-300'
                                                            : 'border-slate-200/80 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <Power className="w-4 h-4" />
                                                </button>
                                            </Tooltip>

                                            <Tooltip content="Excluir formulário">
                                                <button
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => setDeleteTarget(form)}
                                                    className="w-8 h-8 rounded-xl bg-white hover:bg-red-50 border border-slate-200/80 hover:border-red-300 text-slate-500 hover:text-red-600 flex items-center justify-center transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </motion.div>

            {/* Modal: Novo Formulário */}
            <PortalModal
                isOpen={isNewModalOpen}
                onClose={() => !isCreatingTemplate && setIsNewModalOpen(false)}
                className="relative z-[100000] w-full max-w-xl"
            >
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-6 sm:p-7 space-y-6">
                    <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                                <Plus className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Criar Novo Formulário
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Selecione como prefere começar a criação do formulário.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsNewModalOpen(false)}
                            className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3.5">
                        {/* Option 1: Template */}
                        <button
                            type="button"
                            disabled={isCreatingTemplate}
                            onClick={handleCreateFromTemplate}
                            className="text-left p-5 rounded-2xl border-2 border-amber-400/80 bg-amber-50/30 hover:bg-amber-50/70 transition-all flex items-start gap-4 group disabled:opacity-60 relative overflow-hidden"
                        >
                            <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                                {isCreatingTemplate ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Sparkles className="h-5 w-5" />
                                )}
                            </div>
                            <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                                        Modelo Oficial: Inscrição Brilha Mais 2027
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200/80">
                                        Recomendado
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Ficha única pronta para a Trilha de Conhecimento: 4 blocos temáticos na mesma tela, 15 campos cadastrais, infraestrutura, experiência profissional condicional e considerações finais.
                                </p>
                            </div>
                        </button>

                        {/* Option 2: Blank */}
                        <button
                            type="button"
                            disabled={isCreatingTemplate}
                            onClick={() => {
                                setIsNewModalOpen(false);
                                navigate('/admin/formularios/novo');
                            }}
                            className="text-left p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/60 transition-all flex items-start gap-4 group"
                        >
                            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                                <FileSpreadsheet className="h-5 w-5" />
                            </div>
                            <div className="space-y-1.5 flex-1">
                                <span className="text-sm font-bold text-slate-900 group-hover:text-slate-800 transition-colors block">
                                    Formulário em Branco
                                </span>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Crie uma ficha única do zero, organizando blocos temáticos, campos lado a lado, múltipla escolha e regras condicionais inline.
                                </p>
                            </div>
                        </button>
                    </div>
                </div>
            </PortalModal>

            {/* Modal: Compartilhar Link & QR Code */}
            <PortalModal
                isOpen={!!shareForm}
                onClose={() => setShareForm(null)}
                className="relative z-[100000] w-full max-w-md"
            >
                {shareForm && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-6 sm:p-7 space-y-6">
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Compartilhar Formulário
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[280px]">
                                    {shareForm.title}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShareForm(null)}
                                className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* QR Code Container */}
                        <div className="flex flex-col items-center gap-3.5 p-5 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                            <div
                                ref={qrWrapperRef}
                                className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs"
                            >
                                <QRCodeCanvas
                                    value={getPublicUrl(shareForm.slug)}
                                    size={180}
                                    level="M"
                                    includeMargin={false}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => handleDownloadQr(shareForm.slug)}
                                className="h-9 px-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 shadow-2xs"
                            >
                                <Download className="h-3.5 w-3.5 text-slate-500" />
                                <span>Baixar Imagem QR Code (PNG)</span>
                            </button>
                        </div>

                        {/* URL copy bar */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Link de Acesso Público (Sem login)
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    readOnly
                                    value={getPublicUrl(shareForm.slug)}
                                    className="flex-1 min-w-0 h-10 px-3.5 rounded-xl border border-slate-200/90 bg-slate-50 text-xs font-mono text-slate-700 focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleCopyPublicUrl(shareForm.slug)}
                                    className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium inline-flex items-center gap-1.5 shrink-0 active:scale-[0.98] transition-all shadow-xs cursor-pointer"
                                >
                                    {copiedSlug === shareForm.slug ? (
                                        <>
                                            <Check className="h-3.5 w-3.5" />
                                            <span>Copiado!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3.5 w-3.5" />
                                            <span>Copiar</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Open in new tab link */}
                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                            <a
                                href={getPublicUrl(shareForm.slug)}
                                target="_blank"
                                rel="noreferrer"
                                className="h-10 px-4 rounded-xl border border-slate-200/90 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                            >
                                <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                                <span>Abrir Formulário no Navegador</span>
                            </a>
                        </div>
                    </div>
                )}
            </PortalModal>

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                isLoading={isDeleting}
                title="Excluir Formulário?"
                description={`Tem certeza que deseja excluir "${deleteTarget?.title}"? Todas as respostas recebidas de candidatos neste formulário também serão removidas permanentemente.`}
                confirmText="Excluir Permanentemente"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
}
