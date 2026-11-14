import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LucideAlertCircle,
    LucideArrowLeft,
    LucideChevronDown,
    LucideEdit3,
    LucideLock,
    LucideRefreshCw,
} from 'lucide-react';
import api from '../utils/api';
import { PortfolioPieChart } from '../components/finance/PortfolioPieChart';
import { PortfolioEditorModal } from '../components/finance/PortfolioEditorModal';
import {
    FinanceInstructor,
    InvestmentPortfolio,
    formatBRL,
} from '../components/finance/types';

const AMOUNT_PRESETS = [50, 100, 250, 500, 1000, 2500];
const PROJECTION_YEARS = [1, 3, 5] as const;

const canHover = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover)').matches;

function parseAmountInput(raw: string): number {
    const trimmed = raw.trim();
    if (!trimmed) return 0;

    const hasComma = trimmed.includes(',');
    const hasDot = trimmed.includes('.');

    let normalized = trimmed;
    if (hasComma && hasDot) {
        normalized = trimmed.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
        normalized = trimmed.replace(',', '.');
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.min(parsed, 100_000_000);
}

function getRiskStyle(riskLevel: string): string {
    const norm = (riskLevel || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

    if (
        norm.includes('conserv') ||
        norm.includes('baixo') ||
        norm.includes('segur')
    ) {
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    }
    if (
        norm.includes('arroj') ||
        norm.includes('alto') ||
        norm.includes('cresc') ||
        norm.includes('agress')
    ) {
        return 'bg-sky-50 text-sky-700 border-sky-200/80';
    }
    return 'bg-amber-50 text-amber-800 border-amber-200/80';
}

function computeProjection(
    amount: number,
    annualPct: number,
    years: number,
    mode: 'single' | 'monthly',
) {
    if (amount <= 0) {
        return { invested: 0, futureValue: 0, earnings: 0 };
    }

    const annualRate = Math.max(0, Number(annualPct) || 0) / 100;
    const months = years * 12;
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

    if (mode === 'single') {
        const invested = amount;
        const futureValue = amount * Math.pow(1 + annualRate, years);
        return {
            invested,
            futureValue,
            earnings: Math.max(0, futureValue - invested),
        };
    }

    const invested = amount * months;
    const futureValue =
        monthlyRate > 0
            ? amount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
            : invested;

    return {
        invested,
        futureValue,
        earnings: Math.max(0, futureValue - invested),
    };
}

function formatCuratedLine(
    portfolio: InvestmentPortfolio,
    instructors: FinanceInstructor[],
): string {
    if (portfolio.updatedBy?.name) {
        const dateLabel = portfolio.updatedAt
            ? new Date(portfolio.updatedAt).toLocaleDateString('pt-BR')
            : null;
        return dateLabel
            ? `Curadoria: ${portfolio.updatedBy.name} • ${dateLabel}`
            : `Curadoria: ${portfolio.updatedBy.name}`;
    }

    const names = instructors
        .map((inst) => (inst.name || '').trim().split(/\s+/)[0])
        .filter(Boolean);

    if (names.length > 0) {
        return `Curadoria: Prof. ${names.slice(0, 3).join(', ')}`;
    }

    return 'Curadoria: Professores de Finanças Brilha Mais';
}

export function FinanceCalculatorPage() {
    const navigate = useNavigate();

    const [portfolios, setPortfolios] = useState<InvestmentPortfolio[]>([]);
    const [instructors, setInstructors] = useState<FinanceInstructor[]>([]);
    const [canEdit, setCanEdit] = useState(false);

    const [selectedSlug, setSelectedSlug] = useState<string>('reserva');
    const [amountInput, setAmountInput] = useState<string>('500');
    const [projectionMode, setProjectionMode] = useState<'single' | 'monthly'>(
        'single',
    );
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const fetchPortfolios = useCallback(async () => {
        setLoading(true);
        setAccessDenied(false);
        setLoadError(null);
        try {
            const { data } = await api.get('/finance-lab/portfolios');
            const list: InvestmentPortfolio[] = Array.isArray(data?.portfolios)
                ? data.portfolios
                : [];
            setPortfolios(list);
            setInstructors(
                Array.isArray(data?.instructors) ? data.instructors : [],
            );
            setCanEdit(Boolean(data?.canEdit));

            if (list.length > 0) {
                setSelectedSlug((prev) =>
                    list.some((p) => p.slug === prev) ? prev : list[0].slug,
                );
            }
        } catch (err: any) {
            if (err?.response?.status === 403) {
                setAccessDenied(true);
            } else {
                setLoadError(
                    err?.response?.data?.message ||
                        'Não foi possível carregar as carteiras no momento.',
                );
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPortfolios();
    }, [fetchPortfolios]);

    const activePortfolio = useMemo(
        () =>
            portfolios.find((p) => p.slug === selectedSlug) ||
            portfolios[0] ||
            null,
        [portfolios, selectedSlug],
    );

    const parsedAmount = useMemo(
        () => parseAmountInput(amountInput),
        [amountInput],
    );

    const activeChartId = hoveredId ?? expandedId;

    const handleSelectPortfolio = (slug: string) => {
        setSelectedSlug(slug);
        setHoveredId(null);
        setExpandedId(null);
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sanitized = e.target.value.replace(/[^0-9.,]/g, '');
        setAmountInput(sanitized);
    };

    const handleAmountBlur = () => {
        if (!amountInput.trim()) {
            setAmountInput('0');
        }
    };

    const handleToggleItem = (id: string) => {
        setExpandedId((prev) => (prev === id ? null : id));
        setHoveredId(null);
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto w-full space-y-5 sm:space-y-6 pb-8 animate-pulse">
                <div className="space-y-2">
                    <div className="h-8 w-44 bg-zinc-200 rounded-xl" />
                    <div className="h-4 w-72 max-w-full bg-zinc-200/70 rounded-lg" />
                </div>
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-6 space-y-4">
                    <div className="h-11 bg-zinc-100 rounded-xl" />
                    <div className="h-11 bg-zinc-100 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
                    <div className="lg:col-span-5 h-80 bg-white border border-zinc-200/80 rounded-2xl" />
                    <div className="lg:col-span-7 h-80 bg-white border border-zinc-200/80 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div className="max-w-xl mx-auto py-8 sm:py-14">
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-8 text-center shadow-sm space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/70 text-[#D98B08] flex items-center justify-center mx-auto">
                        <LucideLock className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5">
                        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                            Acesso exclusivo de Finanças
                        </h1>
                        <p className="text-sm text-zinc-500 leading-relaxed">
                            A Carteira Ideal e Calculadora de Investimentos está
                            disponível apenas para alunos e professores da trilha
                            de Educação Financeira.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/recursos')}
                        className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-sm font-medium text-zinc-700 transition-colors"
                    >
                        <LucideArrowLeft className="w-4 h-4" />
                        <span>Voltar para Recursos</span>
                    </button>
                </div>
            </div>
        );
    }

    if (loadError || !activePortfolio) {
        return (
            <div className="max-w-xl mx-auto py-8 sm:py-14">
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-8 text-center shadow-sm space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto">
                        <LucideAlertCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5">
                        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
                            Não foi possível carregar a calculadora
                        </h1>
                        <p className="text-sm text-zinc-500">
                            {loadError || 'Nenhuma carteira-modelo encontrada.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={fetchPortfolios}
                        className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#F19B0A] hover:bg-[#D98B08] text-white text-sm font-semibold transition-colors"
                    >
                        <LucideRefreshCw className="w-4 h-4" />
                        <span>Tentar novamente</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto w-full space-y-5 sm:space-y-6 pb-8">
            {/* Zone 1: Pure Page Header */}
            <header>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                    Carteira Ideal
                </h1>
                <p className="text-sm text-zinc-500 mt-1">
                    Simule quanto investir e veja como dividir seu dinheiro em cada
                    momento financeiro.
                </p>
            </header>

            {/* Zone 2: Unified Simulation Control Card */}
            <section
                aria-label="Controles da simulação"
                className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5"
            >
                {/* Momento Financeiro Segmented Bar */}
                <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-medium text-zinc-500">
                            Momento financeiro
                        </span>
                        <span className="hidden sm:inline text-xs text-zinc-400">
                            Horizonte: {activePortfolio.recommendedHorizon}
                        </span>
                    </div>

                    <div
                        role="tablist"
                        aria-label="Selecione o momento financeiro"
                        className="grid grid-cols-3 p-1 bg-zinc-100 rounded-xl border border-zinc-200/70 w-full gap-1"
                    >
                        {portfolios.map((portfolio) => {
                            const isSelected =
                                portfolio.slug === activePortfolio.slug;
                            const useCompactMobileLabel =
                                portfolio.slug === 'reserva' &&
                                portfolio.title === 'Primeiros Passos';

                            return (
                                <button
                                    key={portfolio.slug}
                                    type="button"
                                    role="tab"
                                    aria-selected={isSelected}
                                    onClick={() =>
                                        handleSelectPortfolio(portfolio.slug)
                                    }
                                    className={`px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm transition-all text-center truncate ${
                                        isSelected
                                            ? 'bg-white text-zinc-900 font-semibold shadow-sm border border-zinc-200/60'
                                            : 'text-zinc-600 hover:text-zinc-900 font-medium border border-transparent'
                                    }`}
                                >
                                    {useCompactMobileLabel ? (
                                        <>
                                            <span className="sm:hidden">
                                                Reserva
                                            </span>
                                            <span className="hidden sm:inline">
                                                {portfolio.title}
                                            </span>
                                        </>
                                    ) : (
                                        portfolio.title
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="border-t border-zinc-100" />

                {/* Amount Input & Presets */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3.5 lg:gap-4">
                    <div className="w-full lg:w-60 shrink-0">
                        <label
                            htmlFor="finance-aporte-input"
                            className="block text-xs font-medium text-zinc-500 mb-1.5"
                        >
                            Quanto investir
                        </label>
                        <div className="relative flex items-center">
                            <span className="absolute left-3.5 text-sm font-semibold text-zinc-400 pointer-events-none select-none">
                                R$
                            </span>
                            <input
                                id="finance-aporte-input"
                                type="text"
                                inputMode="decimal"
                                value={amountInput}
                                onChange={handleAmountChange}
                                onBlur={handleAmountBlur}
                                placeholder="500"
                                className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-zinc-200 bg-white text-base sm:text-sm font-semibold text-zinc-900 tabular-nums focus:outline-none focus:border-[#F19B0A] transition-colors"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
                        {AMOUNT_PRESETS.map((preset) => {
                            const isActivePreset =
                                Math.abs(parsedAmount - preset) < 0.01;
                            return (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => setAmountInput(String(preset))}
                                    className={`h-9 lg:h-11 px-3 rounded-xl border text-xs sm:text-sm tabular-nums transition-colors whitespace-nowrap ${
                                        isActivePreset
                                            ? 'border-[#F19B0A] bg-[#F19B0A]/10 text-[#B45309] font-semibold'
                                            : 'border-zinc-200/80 bg-zinc-50/70 hover:bg-zinc-100/80 text-zinc-700 font-medium'
                                    }`}
                                >
                                    R$ {preset.toLocaleString('pt-BR')}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Zone 3: Chart + Allocations Split */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
                {/* Left Card: Visual Pie + Portfolio Context */}
                <div className="lg:col-span-5 bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-2 pb-4 border-b border-zinc-100">
                        <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-medium ${getRiskStyle(
                                activePortfolio.riskLevel,
                            )}`}
                        >
                            {activePortfolio.riskLevel}
                        </span>

                        {canEdit && (
                            <button
                                type="button"
                                onClick={() => setIsEditorOpen(true)}
                                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-zinc-200/80 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors shrink-0"
                            >
                                <LucideEdit3 className="w-3.5 h-3.5 text-zinc-500" />
                                <span>Editar</span>
                            </button>
                        )}
                    </div>

                    <div className="py-5 sm:py-6 flex justify-center">
                        <PortfolioPieChart
                            allocations={activePortfolio.allocations}
                            totalAmount={parsedAmount}
                            activeId={activeChartId}
                            onSelect={setHoveredId}
                            onToggle={handleToggleItem}
                        />
                    </div>

                    <div className="space-y-2 pt-3 border-t border-zinc-100">
                        <h2 className="text-sm font-semibold text-zinc-900">
                            {activePortfolio.subtitle}
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                            {activePortfolio.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 pt-1">
                            <span>
                                Horizonte: {activePortfolio.recommendedHorizon}
                            </span>
                            {activePortfolio.benchmarkNote && (
                                <>
                                    <span className="text-zinc-300">•</span>
                                    <span>{activePortfolio.benchmarkNote}</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400 truncate">
                        {formatCuratedLine(activePortfolio, instructors)}
                    </div>
                </div>

                {/* Right Card: Allocation Breakdown List */}
                <div className="lg:col-span-7 bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-4 sm:px-6 py-4 border-b border-zinc-100 flex items-center justify-between gap-3">
                        <h2 className="text-sm sm:text-base font-semibold text-zinc-900">
                            Divisão sugerida
                        </h2>
                        <span className="text-xs text-zinc-400">
                            Toque para detalhes
                        </span>
                    </div>

                    <div className="divide-y divide-zinc-100">
                        {activePortfolio.allocations.map((item) => {
                            const allocatedAmount =
                                (parsedAmount * Number(item.percentage)) / 100;
                            const isExpanded = expandedId === item.id;
                            const isHighlighted = activeChartId === item.id;
                            const needsMinimumTip = Boolean(
                                item.minSuggestedAmount &&
                                    parsedAmount > 0 &&
                                    allocatedAmount < item.minSuggestedAmount,
                            );

                            return (
                                <div key={item.id}>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleItem(item.id)}
                                        onMouseEnter={() => {
                                            if (canHover()) setHoveredId(item.id);
                                        }}
                                        onMouseLeave={() => {
                                            if (canHover()) setHoveredId(null);
                                        }}
                                        aria-expanded={isExpanded}
                                        className={`w-full text-left px-4 sm:px-6 py-3.5 sm:py-4 transition-colors flex items-start sm:items-center justify-between gap-3 ${
                                            isHighlighted || isExpanded
                                                ? 'bg-zinc-50/80'
                                                : 'hover:bg-zinc-50/50'
                                        }`}
                                    >
                                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                                            <span
                                                className="mt-1 sm:mt-0 w-2.5 h-2.5 rounded-full shrink-0"
                                                style={{
                                                    backgroundColor:
                                                        item.color || '#F19B0A',
                                                }}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-zinc-900 line-clamp-2 sm:truncate">
                                                    {item.label}
                                                </p>
                                                {!isExpanded && (
                                                    <p className="text-xs text-zinc-500 mt-0.5 truncate">
                                                        {item.category}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                                            <div className="text-right">
                                                <p className="text-sm font-semibold text-zinc-900 tabular-nums">
                                                    {formatBRL(allocatedAmount)}
                                                </p>
                                                <p className="text-xs text-zinc-500 tabular-nums">
                                                    {item.percentage}%
                                                </p>
                                            </div>
                                            <LucideChevronDown
                                                className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                                                    isExpanded
                                                        ? 'rotate-180 text-zinc-700'
                                                        : ''
                                                }`}
                                            />
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="px-4 sm:px-6 pb-4 pt-2.5 bg-zinc-50/50 border-t border-zinc-100/80 space-y-2 text-xs sm:text-sm">
                                            <p className="text-zinc-700">
                                                <span className="font-medium text-zinc-500">
                                                    Liquidez:{' '}
                                                </span>
                                                <span className="text-zinc-900 font-medium">
                                                    {item.liquidity}
                                                </span>
                                            </p>
                                            <p className="text-zinc-700">
                                                <span className="font-medium text-zinc-500">
                                                    Onde encontrar:{' '}
                                                </span>
                                                <span className="text-zinc-900">
                                                    {item.examples}
                                                </span>
                                            </p>
                                            <p className="text-zinc-700 leading-relaxed">
                                                <span className="font-medium text-zinc-500">
                                                    Por que investir:{' '}
                                                </span>
                                                {item.rationale}
                                            </p>

                                            {needsMinimumTip &&
                                                item.minSuggestedAmount && (
                                                    <div className="mt-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 leading-relaxed">
                                                        Para esta fatia (
                                                        {formatBRL(
                                                            allocatedAmount,
                                                        )}
                                                        ), alguns ativos pedem
                                                        aplicação a partir de{' '}
                                                        {formatBRL(
                                                            item.minSuggestedAmount,
                                                        )}
                                                        . Você pode acumular em
                                                        liquidez diária até
                                                        completar o valor mínimo.
                                                    </div>
                                                )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {activePortfolio.slug !== 'reserva' && (
                        <div className="px-4 sm:px-6 py-3.5 bg-[#FAFAF9] border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <p className="text-xs text-zinc-600 leading-relaxed">
                                Ainda sem reserva de emergência? Vale montar um
                                colchão em liquidez diária antes de buscar mais
                                risco.
                            </p>
                            <button
                                type="button"
                                onClick={() => handleSelectPortfolio('reserva')}
                                className="inline-flex items-center justify-center h-8 px-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-800 transition-colors shrink-0 self-start sm:self-auto"
                            >
                                Ver Primeiros Passos
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Zone 4: Projection Card + Quiet Footnote */}
            <section className="space-y-3">
                <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm sm:text-base font-semibold text-zinc-900">
                                Projeção didática no tempo
                            </h2>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                Simulação ilustrativa com taxa média estimada de{' '}
                                {activePortfolio.expectedAnnualPct.toLocaleString(
                                    'pt-BR',
                                    {
                                        minimumFractionDigits: 1,
                                        maximumFractionDigits: 2,
                                    },
                                )}
                                % ao ano.
                            </p>
                        </div>

                        <div
                            role="group"
                            aria-label="Frequência do aporte"
                            className="grid grid-cols-2 sm:inline-flex w-full sm:w-auto p-1 bg-zinc-100 rounded-xl border border-zinc-200/70 gap-1"
                        >
                            <button
                                type="button"
                                onClick={() => setProjectionMode('single')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    projectionMode === 'single'
                                        ? 'bg-white text-zinc-900 font-semibold shadow-sm'
                                        : 'text-zinc-600 hover:text-zinc-900'
                                }`}
                            >
                                Aporte único
                            </button>
                            <button
                                type="button"
                                onClick={() => setProjectionMode('monthly')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    projectionMode === 'monthly'
                                        ? 'bg-white text-zinc-900 font-semibold shadow-sm'
                                        : 'text-zinc-600 hover:text-zinc-900'
                                }`}
                            >
                                Todo mês
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100">
                        {PROJECTION_YEARS.map((years) => {
                            const { invested, futureValue, earnings } =
                                computeProjection(
                                    parsedAmount,
                                    activePortfolio.expectedAnnualPct,
                                    years,
                                    projectionMode,
                                );

                            return (
                                <div
                                    key={years}
                                    className="px-4 py-3.5 sm:px-6 sm:py-5 flex items-center justify-between sm:block gap-3"
                                >
                                    <div>
                                        <p className="text-xs sm:text-sm font-semibold text-zinc-900">
                                            Em {years}{' '}
                                            {years === 1 ? 'ano' : 'anos'}
                                        </p>
                                        <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
                                            Investido: {formatBRL(invested)}
                                        </p>
                                    </div>

                                    <div className="text-right sm:text-left sm:mt-3">
                                        <p className="text-base sm:text-xl font-bold tracking-tight text-zinc-900 tabular-nums">
                                            {formatBRL(futureValue)}
                                        </p>
                                        <p className="text-xs font-medium text-emerald-700 mt-0.5 tabular-nums">
                                            +{formatBRL(earnings)} de rendimento
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <p className="px-1 text-[11px] sm:text-xs text-zinc-400 leading-relaxed">
                    Simulação exclusivamente educacional com base em taxas
                    teóricas de referência. Retornos reais variam conforme o
                    mercado e não constituem recomendação individual de compra
                    ou venda.
                </p>
            </section>

            {canEdit && (
                <PortfolioEditorModal
                    isOpen={isEditorOpen}
                    portfolio={activePortfolio}
                    onClose={() => setIsEditorOpen(false)}
                    onSaved={(updated) => {
                        setPortfolios((prev) =>
                            prev.map((p) =>
                                p.slug === updated.slug ? updated : p,
                            ),
                        );
                        setIsEditorOpen(false);
                    }}
                />
            )}
        </div>
    );
}

export default FinanceCalculatorPage;
