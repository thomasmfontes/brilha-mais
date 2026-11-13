import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    BarChart3,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Download,
    Eye,
    FileSpreadsheet,
    GraduationCap,
    Loader2,
    Mail,
    MessageCircle,
    Search,
    Trash2,
    Users,
    X,
    XCircle,
    RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import {
    FormModel,
    FormSubmissionModel,
    FormTriageStatus,
    TRIAGE_STATUS_META,
    formatAnswerPreview,
} from '../utils/formTypes';
import { formatPhoneMask } from '../utils/formatters';
import { PortalModal } from '../components/PortalModal';
import { ConfirmModal } from '../components/ConfirmModal';
import Skeleton from '../components/Skeleton';
import CountUp from '../components/CountUp';
import Tooltip from '../components/Tooltip';

interface FieldSummary {
    fieldId: string;
    fieldKey: string;
    label: string;
    type: string;
    totalResponses: number;
    options: { option: string; count: number; percentage: number }[];
}

interface TurmaOption {
    id: string;
    name: string;
    location?: { id: string; name: string } | null;
}

export default function AdminFormSubmissionsPage() {
    const { id } = useParams<{ id: string }>();

    const [form, setForm] = useState<FormModel | null>(null);
    const [submissions, setSubmissions] = useState<FormSubmissionModel[]>([]);
    const [statusCounts, setStatusCounts] = useState<Record<FormTriageStatus, number>>({
        PENDING: 0,
        APPROVED: 0,
        REJECTED: 0,
    });
    const [totalCount, setTotalCount] = useState(0);
    const [fieldSummaries, setFieldSummaries] = useState<FieldSummary[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<'list' | 'summary'>('list');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | FormTriageStatus>('ALL');
    const [filterFieldKey, setFilterFieldKey] = useState('');
    const [filterFieldValue, setFilterFieldValue] = useState('');

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [exportingFormat, setExportingFormat] = useState<'xlsx' | 'csv' | null>(null);

    // Detail modal
    const [activeSubmission, setActiveSubmission] = useState<FormSubmissionModel | null>(null);
    const [modalNotes, setModalNotes] = useState('');
    const [modalStatus, setModalStatus] = useState<FormTriageStatus>('PENDING');
    const [savingTriage, setSavingTriage] = useState(false);

    // Delete submission
    const [deleteTarget, setDeleteTarget] = useState<FormSubmissionModel | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Pre-enroll modal
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [enrollTargetIds, setEnrollTargetIds] = useState<string[]>([]);
    const [turmas, setTurmas] = useState<TurmaOption[]>([]);
    const [selectedTurmaId, setSelectedTurmaId] = useState('');
    const [isEnrolling, setIsEnrolling] = useState(false);

    const loadSubmissions = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (search.trim()) params.search = search.trim();
            if (statusFilter !== 'ALL') params.status = statusFilter;
            if (filterFieldKey && filterFieldValue) {
                params.fieldKey = filterFieldKey;
                params.fieldValue = filterFieldValue;
            }
            const res = await api.get(`/forms/${id}/submissions`, { params });
            setForm(res.data.form);
            setSubmissions(res.data.submissions || []);
            setStatusCounts(
                res.data.statusCounts || {
                    PENDING: 0,
                    APPROVED: 0,
                    REJECTED: 0,
                },
            );
            setTotalCount(res.data.totalCount || 0);
            setFieldSummaries(res.data.fieldSummaries || []);
        } catch (err: any) {
            toast.error(
                err.response?.data?.message || 'Erro ao carregar inscrições.',
            );
        } finally {
            setLoading(false);
        }
    }, [id, search, statusFilter, filterFieldKey, filterFieldValue]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadSubmissions();
        }, 200);
        return () => clearTimeout(timer);
    }, [loadSubmissions]);

    useEffect(() => {
        api.get('/turmas')
            .then((res) => setTurmas(res.data || []))
            .catch(() => {});
    }, []);

    const choiceFields = useMemo(() => {
        if (!form) return [];
        return form.sections
            .flatMap((s) => s.fields)
            .filter(
                (f) =>
                    f.type === 'SINGLE_CHOICE' ||
                    f.type === 'MULTIPLE_CHOICE' ||
                    f.type === 'SELECT',
            );
    }, [form]);

    const selectedFilterField = choiceFields.find((f) => f.key === filterFieldKey);

    const openDetailModal = (sub: FormSubmissionModel) => {
        const safeStatus: FormTriageStatus = TRIAGE_STATUS_META[sub.status]
            ? sub.status
            : 'PENDING';
        setActiveSubmission(sub);
        setModalNotes(sub.adminNotes || '');
        setModalStatus(safeStatus);
    };

    const activeIndex = activeSubmission
        ? submissions.findIndex((s) => s.id === activeSubmission.id)
        : -1;

    const handleSaveTriage = async (
        submissionId: string,
        nextStatus: FormTriageStatus,
        nextNotes?: string,
    ) => {
        if (!id) return;
        setSavingTriage(true);
        try {
            const res = await api.patch(`/forms/${id}/submissions/${submissionId}`, {
                status: nextStatus,
                ...(nextNotes !== undefined ? { adminNotes: nextNotes } : {}),
            });
            const updated: FormSubmissionModel = res.data;
            setSubmissions((prev) =>
                prev.map((s) => (s.id === submissionId ? updated : s)),
            );
            if (activeSubmission?.id === submissionId) {
                setActiveSubmission(updated);
            }
            toast.success('Triagem atualizada com sucesso!');
            await loadSubmissions();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao salvar triagem.');
        } finally {
            setSavingTriage(false);
        }
    };

    const handleExport = async (format: 'xlsx' | 'csv') => {
        if (!id) return;
        setExportingFormat(format);
        try {
            const params: Record<string, string> = { format };
            if (search.trim()) params.search = search.trim();
            if (statusFilter !== 'ALL') params.status = statusFilter;
            if (filterFieldKey && filterFieldValue) {
                params.fieldKey = filterFieldKey;
                params.fieldValue = filterFieldValue;
            }
            const res = await api.get(`/forms/${id}/submissions/export`, {
                params,
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `${form?.slug || 'respostas'}-respostas.${format}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success(`Arquivo ${format.toUpperCase()} exportado com sucesso!`);
        } catch {
            toast.error('Erro ao exportar respostas.');
        } finally {
            setExportingFormat(null);
        }
    };

    const handleDeleteSubmission = async () => {
        if (!id || !deleteTarget) return;
        setIsDeleting(true);
        try {
            await api.delete(`/forms/${id}/submissions/${deleteTarget.id}`);
            toast.success('Inscrição removida com sucesso.');
            if (activeSubmission?.id === deleteTarget.id) {
                setActiveSubmission(null);
            }
            setDeleteTarget(null);
            setSelectedIds((prev) => prev.filter((sid) => sid !== deleteTarget.id));
            await loadSubmissions();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao remover inscrição.');
        } finally {
            setIsDeleting(false);
        }
    };

    const openEnrollModal = (ids: string[]) => {
        if (ids.length === 0) {
            toast.error('Selecione pelo menos uma inscrição para pré-matrícula.');
            return;
        }
        setEnrollTargetIds(ids);
        setIsEnrollModalOpen(true);
    };

    const handleConfirmEnroll = async () => {
        if (!id || enrollTargetIds.length === 0) return;
        setIsEnrolling(true);
        try {
            const res = await api.post(`/forms/${id}/submissions/enroll`, {
                submissionIds: enrollTargetIds,
                turmaId: selectedTurmaId || null,
            });
            const { enrolledCount, skippedCount } = res.data;
            if (enrolledCount > 0) {
                toast.success(
                    `${enrolledCount} ${
                        enrolledCount === 1 ? 'aluno pré-matriculado' : 'alunos pré-matriculados'
                    } com sucesso!`,
                );
            }
            if (skippedCount > 0) {
                toast(
                    `${skippedCount} já constavam como pré-matriculados ou sem e-mail.`,
                    { icon: 'ℹ️' },
                );
            }
            setIsEnrollModalOpen(false);
            setSelectedIds([]);
            await loadSubmissions();
        } catch (err: any) {
            toast.error(
                err.response?.data?.message || 'Erro ao realizar pré-matrícula.',
            );
        } finally {
            setIsEnrolling(false);
        }
    };

    const allVisibleSelected =
        submissions.length > 0 &&
        submissions.every((s) => selectedIds.includes(s.id));

    const toggleSelectAll = () => {
        if (allVisibleSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(submissions.map((s) => s.id));
        }
    };

    const toggleSelectOne = (sid: string) => {
        setSelectedIds((prev) =>
            prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid],
        );
    };

    const hasActiveFilters = Boolean(
        search.trim() || statusFilter !== 'ALL' || filterFieldKey || filterFieldValue,
    );

    const resetFilters = () => {
        setSearch('');
        setStatusFilter('ALL');
        setFilterFieldKey('');
        setFilterFieldValue('');
    };

    const getInitials = (name?: string | null) => {
        if (!name) return 'C';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    };

    const triageStatStyleMap: Record<
        FormTriageStatus,
        { icon: React.ReactNode; boxClass: string }
    > = {
        PENDING: {
            icon: <Clock className="h-5 w-5" />,
            boxClass: 'bg-amber-50 border-amber-200/60 text-amber-600',
        },
        APPROVED: {
            icon: <CheckCircle2 className="h-5 w-5" />,
            boxClass: 'bg-emerald-50 border-emerald-200/60 text-emerald-600',
        },
        REJECTED: {
            icon: <XCircle className="h-5 w-5" />,
            boxClass: 'bg-rose-50 border-rose-200/60 text-rose-600',
        },
    };

    return (
        <div className="space-y-8 w-full pb-10">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div className="flex items-start gap-3.5">
                    <Link
                        to="/admin/formularios"
                        className="h-10 w-10 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shrink-0 mt-0.5 shadow-2xs"
                        title="Voltar aos Formulários"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                                {form?.title || 'Respostas do Formulário'}
                            </h1>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Acompanhe as submissões em tempo real, avalie candidatos no funil de triagem e matricule alunos.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                        type="button"
                        disabled={exportingFormat !== null || submissions.length === 0}
                        onClick={() => handleExport('csv')}
                        className="h-10 px-3.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-2 disabled:opacity-50 transition-all shadow-2xs cursor-pointer"
                    >
                        {exportingFormat === 'csv' ? (
                            <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                        ) : (
                            <Download className="h-4 w-4 text-slate-400" />
                        )}
                        <span>Exportar CSV</span>
                    </button>

                    <button
                        type="button"
                        disabled={exportingFormat !== null || submissions.length === 0}
                        onClick={() => handleExport('xlsx')}
                        className="h-10 px-3.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-2 disabled:opacity-50 transition-all shadow-2xs cursor-pointer"
                    >
                        {exportingFormat === 'xlsx' ? (
                            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                        ) : (
                            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        )}
                        <span>Exportar Excel (.xlsx)</span>
                    </button>

                    <button
                        type="button"
                        disabled={selectedIds.length === 0}
                        onClick={() => openEnrollModal(selectedIds)}
                        className="h-10 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs transition-all active:scale-[0.98] shadow-xs inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                        <GraduationCap className="h-4 w-4" />
                        <span>
                            Pré-matricular ({selectedIds.length})
                        </span>
                    </button>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
            >
                {/* KPI Cards Strip matching AdminStat */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <button
                        type="button"
                        onClick={() => setStatusFilter('ALL')}
                        className={`p-5 rounded-xl bg-white border shadow-2xs flex items-center justify-between text-left transition-all cursor-pointer ${
                            statusFilter === 'ALL'
                                ? 'border-amber-400 ring-2 ring-amber-500/15'
                                : 'border-slate-200/80 hover:border-slate-300'
                        }`}
                    >
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                Total de Inscrições
                            </p>
                            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
                                <CountUp value={totalCount} />
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                            <Users className="h-5 w-5" />
                        </div>
                    </button>

                    {(Object.keys(TRIAGE_STATUS_META) as FormTriageStatus[]).map((st) => {
                        const meta = TRIAGE_STATUS_META[st];
                        const statVisual = triageStatStyleMap[st];
                        const isSelected = statusFilter === st;
                        return (
                            <button
                                key={st}
                                type="button"
                                onClick={() =>
                                    setStatusFilter((prev) => (prev === st ? 'ALL' : st))
                                }
                                className={`p-5 rounded-xl bg-white border shadow-2xs flex items-center justify-between text-left transition-all cursor-pointer ${
                                    isSelected
                                        ? 'border-amber-400 ring-2 ring-amber-500/15'
                                        : 'border-slate-200/80 hover:border-slate-300'
                                }`}
                            >
                                <div className="space-y-1 min-w-0 pr-2">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 truncate">
                                        {meta.label}
                                    </p>
                                    <p className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
                                        <CountUp value={statusCounts[st] || 0} />
                                    </p>
                                </div>
                                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${statVisual.boxClass}`}>
                                    {statVisual.icon}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Segmented Tab Switcher */}
                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60">
                    <button
                        type="button"
                        onClick={() => setActiveTab('list')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                            activeTab === 'list'
                                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 font-medium'
                        }`}
                    >
                        <Users className="h-3.5 w-3.5 text-amber-600" />
                        <span>Inscritos & Triagem</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('summary')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                            activeTab === 'summary'
                                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 font-medium'
                        }`}
                    >
                        <BarChart3 className="h-3.5 w-3.5 text-amber-600" />
                        <span>Resumo por Pergunta</span>
                    </button>
                </div>

                {activeTab === 'list' ? (
                    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
                        {/* Internal Filter Header */}
                        <div className="p-3.5 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex flex-col lg:flex-row gap-2.5 lg:items-center justify-between">
                                <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center flex-1">
                                    <div className="relative w-full md:w-72">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Buscar por candidato, e-mail, telefone..."
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

                                    <select
                                        value={filterFieldKey}
                                        onChange={(e) => {
                                            setFilterFieldKey(e.target.value);
                                            setFilterFieldValue('');
                                        }}
                                        className="w-full md:w-56 h-9 bg-white border border-slate-200/80 rounded-lg px-3 text-xs font-medium text-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                                    >
                                        <option value="">Filtrar por pergunta de escolha...</option>
                                        {choiceFields.map((cf) => (
                                            <option key={cf.key} value={cf.key}>
                                                {cf.label}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        value={filterFieldValue}
                                        disabled={!filterFieldKey}
                                        onChange={(e) => setFilterFieldValue(e.target.value)}
                                        className="w-full md:w-48 h-9 bg-white border border-slate-200/80 rounded-lg px-3 text-xs font-medium text-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-40 outline-none transition-colors"
                                    >
                                        <option value="">Todas as respostas</option>
                                        {(selectedFilterField?.options || []).map((opt) => (
                                            <option key={opt} value={opt}>
                                                {opt}
                                            </option>
                                        ))}
                                        {selectedFilterField?.allowOther && (
                                            <option value="__OTHER__">Outro</option>
                                        )}
                                    </select>

                                    {hasActiveFilters && (
                                        <button
                                            type="button"
                                            onClick={resetFilters}
                                            className="h-9 px-3 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                                            title="Limpar todos os filtros"
                                        >
                                            <RotateCcw className="h-3.5 w-3.5" />
                                            <span>Limpar</span>
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center justify-end shrink-0">
                                    <span className="text-xs text-slate-500">
                                        Total:{' '}
                                        <strong className="text-slate-900 font-semibold">
                                            {submissions.length}
                                        </strong>{' '}
                                        {submissions.length === 1 ? 'inscrição' : 'inscrições'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Submissions Table */}
                        <div className="w-full overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left min-w-[920px]">
                                <thead>
                                    <tr className="border-b border-slate-200/80 text-xs font-semibold text-slate-600 bg-slate-50/75">
                                        <th className="px-5 py-3 w-10">
                                            <input
                                                type="checkbox"
                                                checked={allVisibleSelected}
                                                onChange={toggleSelectAll}
                                                className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                                            />
                                        </th>
                                        <th className="px-5 py-3">Candidato</th>
                                        <th className="px-5 py-3">Contato</th>
                                        <th className="px-5 py-3">Enviado em</th>
                                        <th className="px-5 py-3">Triagem</th>
                                        <th className="px-5 py-3">Matrícula</th>
                                        <th className="px-5 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        [0, 1, 2].map((idx) => (
                                            <tr
                                                key={`sub-skeleton-${idx}`}
                                                className="border-b border-slate-100 last:border-0"
                                            >
                                                <td className="px-5 py-3.5">
                                                    <Skeleton className="h-4 w-4" variant="rounded" />
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                                                        <div className="space-y-1.5">
                                                            <Skeleton className="h-4 w-36" variant="rectangle" />
                                                            <Skeleton className="h-3 w-44" variant="rectangle" />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <Skeleton className="h-3.5 w-28" variant="rectangle" />
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <Skeleton className="h-3.5 w-28" variant="rectangle" />
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <Skeleton className="h-7 w-24" variant="rounded" />
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <Skeleton className="h-5 w-24" variant="rounded" />
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <Skeleton className="h-8 w-16" variant="rounded" />
                                                        <Skeleton className="h-8 w-8" variant="rounded" />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : submissions.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center">
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                                                    <Users className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-sm font-semibold text-slate-900">
                                                    Nenhuma inscrição encontrada
                                                </h3>
                                                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                                                    {totalCount === 0
                                                        ? 'Compartilhe o link público do formulário com os candidatos para começar a receber respostas.'
                                                        : 'Nenhuma resposta encontrada para os filtros selecionados. Tente limpar os filtros.'}
                                                </p>
                                                {hasActiveFilters && (
                                                    <button
                                                        type="button"
                                                        onClick={resetFilters}
                                                        className="mt-4 h-9 px-4 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer transition-colors"
                                                    >
                                                        Limpar filtros
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ) : (
                                        submissions.map((sub) => {
                                            const checked = selectedIds.includes(sub.id);
                                            const safeStatus: FormTriageStatus =
                                                TRIAGE_STATUS_META[sub.status]
                                                    ? sub.status
                                                    : 'PENDING';
                                            const statusMeta = TRIAGE_STATUS_META[safeStatus];
                                            const phoneDigits = sub.respondentPhone?.replace(/\D/g, '') || '';
                                            return (
                                                <tr
                                                    key={sub.id}
                                                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors"
                                                >
                                                    <td className="px-5 py-3.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => toggleSelectOne(sub.id)}
                                                            className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                                                        />
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => openDetailModal(sub)}
                                                            className="text-left flex items-center gap-3 group cursor-pointer"
                                                        >
                                                            <div className="h-9 w-9 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center font-medium text-xs text-slate-600 shrink-0 shadow-2xs group-hover:border-amber-400 transition-colors">
                                                                {getInitials(sub.respondentName)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-slate-900 group-hover:text-amber-600 transition-colors truncate text-xs sm:text-sm">
                                                                    {sub.respondentName || 'Candidato sem nome'}
                                                                </p>
                                                                {sub.respondentEmail && (
                                                                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                                                                        <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                                                        <span>{sub.respondentEmail}</span>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </button>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-xs text-slate-600">
                                                        {sub.respondentPhone ? (
                                                            <div className="flex items-center gap-2">
                                                                <span>{formatPhoneMask(sub.respondentPhone)}</span>
                                                                {phoneDigits.length >= 10 && (
                                                                    <a
                                                                        href={`https://wa.me/55${phoneDigits}`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="p-1 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                                                                        title="Abrir conversa no WhatsApp"
                                                                    >
                                                                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                                                        {new Date(sub.createdAt).toLocaleDateString('pt-BR', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <select
                                                            value={safeStatus}
                                                            onChange={(e) =>
                                                                handleSaveTriage(
                                                                    sub.id,
                                                                    e.target.value as FormTriageStatus,
                                                                )
                                                            }
                                                            className={`h-8 px-2.5 rounded-full border text-xs font-semibold focus:outline-none cursor-pointer shadow-2xs ${statusMeta.badgeClass}`}
                                                        >
                                                            {(
                                                                Object.keys(
                                                                    TRIAGE_STATUS_META,
                                                                ) as FormTriageStatus[]
                                                            ).map((st) => (
                                                                <option key={st} value={st}>
                                                                    {TRIAGE_STATUS_META[st].label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-xs">
                                                        {sub.enrolledAt ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 font-semibold shadow-2xs">
                                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                                <span>{sub.enrolledTurma?.name || 'Pré-matriculado'}</span>
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => openEnrollModal([sub.id])}
                                                                className="text-xs text-slate-500 hover:text-amber-700 font-semibold hover:underline cursor-pointer"
                                                            >
                                                                + Matricular
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <div className="inline-flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => openDetailModal(sub)}
                                                                className="h-8 px-3 rounded-xl border border-slate-200/80 bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-700 hover:border-amber-300 text-xs font-medium inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                                                            >
                                                                <Eye className="h-3.5 w-3.5" />
                                                                <span>Ver</span>
                                                            </button>
                                                            <Tooltip content="Excluir resposta">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setDeleteTarget(sub)}
                                                                    className="w-8 h-8 rounded-xl bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200/80 hover:border-red-300 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </Tooltip>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Summary Tab */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                        {fieldSummaries.length === 0 ? (
                            <div className="col-span-full bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-sm text-slate-500 shadow-2xs">
                                Este formulário ainda não possui perguntas de múltipla escolha com respostas para compor gráficos.
                            </div>
                        ) : (
                            fieldSummaries.map((summary) => (
                                <div
                                    key={summary.fieldId}
                                    className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4"
                                >
                                    <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-900">
                                            {summary.label}
                                        </h3>
                                        <span className="text-xs font-semibold text-slate-500 shrink-0 bg-slate-100 px-2 py-0.5 rounded-md">
                                            {summary.totalResponses} {summary.totalResponses === 1 ? 'resposta' : 'respostas'}
                                        </span>
                                    </div>

                                    <div className="space-y-3 pt-1">
                                        {summary.options.map((opt) => (
                                            <div key={opt.option} className="space-y-1.5">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-semibold text-slate-700 truncate pr-3">
                                                        {opt.option}
                                                    </span>
                                                    <span className="text-slate-500 shrink-0 tabular-nums font-mono">
                                                        {opt.count} ({opt.percentage}%)
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-amber-500 transition-all duration-300"
                                                        style={{ width: `${opt.percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </motion.div>

            {/* Modal: Submission Details & Triage */}
            <PortalModal
                isOpen={!!activeSubmission}
                onClose={() => setActiveSubmission(null)}
                className="relative z-[100000] w-full max-w-3xl max-h-[92vh] flex flex-col"
            >
                {activeSubmission && form && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0 bg-slate-50/70">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center font-bold text-sm text-amber-700 shrink-0">
                                    {getInitials(activeSubmission.respondentName)}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                                        {activeSubmission.respondentName || 'Candidato sem nome'}
                                    </h2>
                                    <p className="text-xs text-slate-500 truncate">
                                        {activeSubmission.respondentEmail || 'Sem e-mail'} · Enviado em{' '}
                                        {new Date(activeSubmission.createdAt).toLocaleString('pt-BR')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    type="button"
                                    disabled={activeIndex <= 0}
                                    onClick={() =>
                                        activeIndex > 0 &&
                                        openDetailModal(submissions[activeIndex - 1])
                                    }
                                    className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-40 transition-colors"
                                    title="Inscrição anterior"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    disabled={
                                        activeIndex === -1 ||
                                        activeIndex >= submissions.length - 1
                                    }
                                    onClick={() =>
                                        activeIndex < submissions.length - 1 &&
                                        openDetailModal(submissions[activeIndex + 1])
                                    }
                                    className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 disabled:opacity-40 transition-colors"
                                    title="Próxima inscrição"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveSubmission(null)}
                                    className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center ml-1 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto space-y-6 bg-[#FAFAF9]">
                            {/* Triage Decision Card */}
                            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                                            Status no Funil de Triagem
                                        </label>
                                        <select
                                            value={modalStatus}
                                            onChange={(e) =>
                                                setModalStatus(e.target.value as FormTriageStatus)
                                            }
                                            className="h-10 px-3.5 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#F19B0A] shadow-2xs"
                                        >
                                            {(
                                                Object.keys(
                                                    TRIAGE_STATUS_META,
                                                ) as FormTriageStatus[]
                                            ).map((st) => (
                                                <option key={st} value={st}>
                                                    {TRIAGE_STATUS_META[st].label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {activeSubmission.enrolledAt ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs font-semibold text-emerald-700 shadow-2xs">
                                                <CheckCircle2 className="h-4 w-4" />
                                                Pré-matriculado
                                                {activeSubmission.enrolledTurma?.name
                                                    ? ` · ${activeSubmission.enrolledTurma.name}`
                                                    : ''}
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openEnrollModal([activeSubmission.id])
                                                }
                                                className="h-10 px-4 rounded-xl border border-slate-200/80 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 hover:border-amber-300 text-xs font-medium inline-flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
                                            >
                                                <GraduationCap className="h-4 w-4" />
                                                <span>Pré-matricular Aluno</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                                        Anotações Internas da Coordenação
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={modalNotes}
                                        onChange={(e) => setModalNotes(e.target.value)}
                                        placeholder="Registre observações da entrevista, alinhamento vocacional ou motivos da decisão..."
                                        className="w-full rounded-xl border border-slate-200/90 px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#F19B0A] shadow-2xs"
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        disabled={savingTriage}
                                        onClick={() =>
                                            handleSaveTriage(
                                                activeSubmission.id,
                                                modalStatus,
                                                modalNotes,
                                            )
                                        }
                                        className="h-9 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium inline-flex items-center gap-2 active:scale-[0.98] transition-all shadow-xs disabled:opacity-60 cursor-pointer"
                                    >
                                        {savingTriage && (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        )}
                                        <span>Salvar Decisão de Triagem</span>
                                    </button>
                                </div>
                            </div>

                            {/* All Form Sections & Candidate Answers */}
                            {form.sections.map((sec) => {
                                const nonInfoFields = sec.fields.filter(
                                    (f) => f.type !== 'INFO_BLOCK',
                                );
                                if (nonInfoFields.length === 0) return null;

                                const hasAnyAnswer = nonInfoFields.some(
                                    (f) => activeSubmission.answers?.[f.key],
                                );
                                if (!hasAnyAnswer) return null;

                                return (
                                    <div
                                        key={sec.id || sec.title}
                                        className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs"
                                    >
                                        <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100 text-xs font-bold text-slate-800">
                                            {sec.title}
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            {nonInfoFields.map((field) => {
                                                const entry =
                                                    activeSubmission.answers?.[field.key];
                                                if (!entry) return null;
                                                return (
                                                    <div
                                                        key={field.key}
                                                        className="px-5 py-3.5 space-y-1"
                                                    >
                                                        <p className="text-xs font-medium text-slate-500">
                                                            {field.label}
                                                        </p>
                                                        <p className="text-sm font-semibold text-slate-900 whitespace-pre-wrap leading-relaxed">
                                                            {formatAnswerPreview(
                                                                entry,
                                                                field.type,
                                                            )}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </PortalModal>

            {/* Modal: Pre-Enroll into Turma */}
            <PortalModal
                isOpen={isEnrollModalOpen}
                onClose={() => !isEnrolling && setIsEnrollModalOpen(false)}
                className="relative z-[100000] w-full max-w-md"
            >
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-6 sm:p-7 space-y-6">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                                <GraduationCap className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Pré-matricular Alunos
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {enrollTargetIds.length}{' '}
                                    {enrollTargetIds.length === 1
                                        ? 'inscrição selecionada'
                                        : 'inscrições selecionadas'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsEnrollModalOpen(false)}
                            className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Vincular à Turma (Opcional)
                        </label>
                        <select
                            value={selectedTurmaId}
                            onChange={(e) => setSelectedTurmaId(e.target.value)}
                            className="w-full h-11 px-3.5 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#F19B0A] shadow-2xs"
                        >
                            <option value="">Sem vínculo imediato de Turma</option>
                            {turmas.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                    {t.location?.name ? ` (${t.location.name})` : ''}
                                </option>
                            ))}
                        </select>
                        <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                            Ao confirmar, o status será marcado como <strong>Aprovado</strong>. Quando o aluno fizer login na plataforma com seu e-mail, ele já encontrará seu perfil vinculado à Turma e ao Polo selecionados.
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            disabled={isEnrolling}
                            onClick={() => setIsEnrollModalOpen(false)}
                            className="h-10 px-4 rounded-xl border border-slate-200/90 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={isEnrolling}
                            onClick={handleConfirmEnroll}
                            className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium inline-flex items-center gap-2 active:scale-[0.98] transition-all shadow-xs disabled:opacity-60 cursor-pointer"
                        >
                            {isEnrolling && <Loader2 className="h-4 w-4 animate-spin" />}
                            <span>Confirmar Pré-matrícula</span>
                        </button>
                    </div>
                </div>
            </PortalModal>

            {/* Confirm Delete Single Submission Modal */}
            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteSubmission}
                isLoading={isDeleting}
                title="Excluir Inscrição?"
                description={`Tem certeza que deseja remover permanentemente a inscrição de ${deleteTarget?.respondentName || deleteTarget?.respondentEmail || 'este candidato'}? Esta ação não pode ser desfeita.`}
                confirmText="Excluir Inscrição"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
}
