import React, { useEffect, useMemo, useState } from 'react';
import {
    LucideAlertCircle,
    LucideCheck,
    LucideLoader2,
    LucidePlus,
    LucideRotateCcw,
    LucideTrash2,
    LucideX,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PortalModal } from '../PortalModal';
import api from '../../utils/api';
import { InvestmentPortfolio, PortfolioAllocationItem } from './types';

const COLOR_PRESETS = [
    '#F19B0A',
    '#0EA5E9',
    '#10B981',
    '#6366F1',
    '#EC4899',
    '#8B5CF6',
    '#14B8A6',
    '#F97316',
];

interface PortfolioEditorModalProps {
    isOpen: boolean;
    portfolio: InvestmentPortfolio | null;
    onClose: () => void;
    onSaved: (updated: InvestmentPortfolio) => void;
}

export function PortfolioEditorModal({
    isOpen,
    portfolio,
    onClose,
    onSaved,
}: PortfolioEditorModalProps) {
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [description, setDescription] = useState('');
    const [riskLevel, setRiskLevel] = useState('');
    const [recommendedHorizon, setRecommendedHorizon] = useState('');
    const [expectedAnnualPct, setExpectedAnnualPct] = useState('11.5');
    const [benchmarkNote, setBenchmarkNote] = useState('');
    const [allocations, setAllocations] = useState<PortfolioAllocationItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);

    useEffect(() => {
        if (!portfolio || !isOpen) return;
        setTitle(portfolio.title || '');
        setSubtitle(portfolio.subtitle || '');
        setDescription(portfolio.description || '');
        setRiskLevel(portfolio.riskLevel || '');
        setRecommendedHorizon(portfolio.recommendedHorizon || '');
        setExpectedAnnualPct(String(portfolio.expectedAnnualPct ?? 11.5));
        setBenchmarkNote(portfolio.benchmarkNote || '');
        setAllocations(
            (portfolio.allocations || []).map((item) => ({ ...item })),
        );
        setConfirmReset(false);
    }, [portfolio, isOpen]);

    const totalPercentage = useMemo(
        () =>
            allocations.reduce(
                (acc, item) => acc + (Number(item.percentage) || 0),
                0,
            ),
        [allocations],
    );

    const isSumValid = Math.abs(totalPercentage - 100) <= 0.01;

    const handleUpdateAllocation = (
        index: number,
        field: keyof PortfolioAllocationItem,
        value: string | number | undefined,
    ) => {
        setAllocations((prev) =>
            prev.map((item, idx) =>
                idx === index ? { ...item, [field]: value } : item,
            ),
        );
    };

    const handleAddAllocation = () => {
        if (allocations.length >= 8) {
            toast.error('Máximo de 8 classes por carteira.');
            return;
        }
        const nextColor =
            COLOR_PRESETS[allocations.length % COLOR_PRESETS.length];
        setAllocations((prev) => [
            ...prev,
            {
                id: `item-${Date.now()}`,
                label: 'Nova Classe de Ativo',
                percentage: Math.max(1, Number((100 - totalPercentage).toFixed(1)) || 5),
                color: nextColor,
                category: 'Renda Fixa',
                examples: 'Ex.: Tesouro Direto, CDB ou ETF',
                rationale: 'Explique ao aluno o papel desta fatia na carteira.',
                liquidity: 'Diária',
                minSuggestedAmount: 10,
            },
        ]);
    };

    const handleRemoveAllocation = (index: number) => {
        if (allocations.length <= 1) return;
        setAllocations((prev) => prev.filter((_, idx) => idx !== index));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!portfolio) return;

        if (!isSumValid) {
            toast.error('A soma dos percentuais precisa ser exatamente 100%.');
            return;
        }

        const hasEmptyFields = allocations.some(
            (a) =>
                !a.label.trim() ||
                !a.category.trim() ||
                !a.examples.trim() ||
                !a.rationale.trim() ||
                !a.liquidity.trim() ||
                Number(a.percentage) <= 0,
        );
        if (hasEmptyFields) {
            toast.error('Preencha todos os campos e percentuais maiores que zero.');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                title: title.trim(),
                subtitle: subtitle.trim(),
                description: description.trim(),
                riskLevel: riskLevel.trim(),
                recommendedHorizon: recommendedHorizon.trim(),
                expectedAnnualPct: Number(expectedAnnualPct) || 0,
                benchmarkNote: benchmarkNote.trim() || undefined,
                allocations: allocations.map((item) => ({
                    id: item.id,
                    label: item.label.trim(),
                    percentage: Number(item.percentage),
                    color: item.color,
                    category: item.category.trim(),
                    examples: item.examples.trim(),
                    rationale: item.rationale.trim(),
                    liquidity: item.liquidity.trim(),
                    minSuggestedAmount:
                        item.minSuggestedAmount !== undefined &&
                        item.minSuggestedAmount !== null &&
                        String(item.minSuggestedAmount) !== ''
                            ? Number(item.minSuggestedAmount)
                            : undefined,
                })),
            };

            const { data } = await api.put(
                `/finance-lab/portfolios/${portfolio.slug}`,
                payload,
            );
            toast.success('Carteira atualizada com sucesso!');
            onSaved(data);
            onClose();
        } catch (error: any) {
            const message =
                error?.response?.data?.message ||
                'Não foi possível salvar as alterações da carteira.';
            toast.error(Array.isArray(message) ? message[0] : message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = async () => {
        if (!portfolio) return;
        if (!confirmReset) {
            setConfirmReset(true);
            return;
        }

        setIsResetting(true);
        try {
            const { data } = await api.post(
                `/finance-lab/portfolios/${portfolio.slug}/reset`,
            );
            toast.success('Carteira restaurada para o padrão original.');
            onSaved(data);
            onClose();
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ||
                    'Não foi possível restaurar o modelo padrão.',
            );
        } finally {
            setIsResetting(false);
            setConfirmReset(false);
        }
    };

    return (
        <PortalModal
            isOpen={isOpen}
            onClose={onClose}
            className="relative z-[100000] w-full max-w-3xl"
        >
            <form
                onSubmit={handleSave}
                className="bg-white rounded-2xl border border-zinc-200/80 shadow-xl max-h-[88dvh] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="px-4 sm:px-6 py-4 border-b border-zinc-100 flex items-center justify-between gap-4 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-zinc-900">
                            Editar Carteira: {portfolio?.title}
                        </h2>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            Mantenha os percentuais e recomendações alinhados ao cenário atual do mercado.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar modal"
                        className="h-9 w-9 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-colors shrink-0"
                    >
                        <LucideX className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                                Nome do Momento
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-base sm:text-sm text-zinc-900 focus:outline-none focus:border-[#F19B0A]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                                Subtítulo Curto
                            </label>
                            <input
                                type="text"
                                value={subtitle}
                                onChange={(e) => setSubtitle(e.target.value)}
                                required
                                className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-base sm:text-sm text-zinc-900 focus:outline-none focus:border-[#F19B0A]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                                Perfil de Risco
                            </label>
                            <input
                                type="text"
                                value={riskLevel}
                                onChange={(e) => setRiskLevel(e.target.value)}
                                required
                                className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-base sm:text-sm text-zinc-900 focus:outline-none focus:border-[#F19B0A]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                                Horizonte Recomendado
                            </label>
                            <input
                                type="text"
                                value={recommendedHorizon}
                                onChange={(e) =>
                                    setRecommendedHorizon(e.target.value)
                                }
                                required
                                className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-base sm:text-sm text-zinc-900 focus:outline-none focus:border-[#F19B0A]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                                Rentabilidade Didática Estimada (% ao ano)
                            </label>
                            <input
                                type="number"
                                step="0.05"
                                min="0"
                                max="40"
                                value={expectedAnnualPct}
                                onChange={(e) =>
                                    setExpectedAnnualPct(e.target.value)
                                }
                                required
                                className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-base sm:text-sm text-zinc-900 focus:outline-none focus:border-[#F19B0A]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                                Nota de Referência de Mercado
                            </label>
                            <input
                                type="text"
                                value={benchmarkNote}
                                onChange={(e) =>
                                    setBenchmarkNote(e.target.value)
                                }
                                placeholder="Ex.: CDI ~11,15% a.a. • Selic ~11,25% a.a."
                                className="w-full h-10 px-3 rounded-xl border border-zinc-200 text-base sm:text-sm text-zinc-900 focus:outline-none focus:border-[#F19B0A]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                            Orientação Geral para o Aluno
                        </label>
                        <textarea
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            className="w-full p-3 rounded-xl border border-zinc-200 text-base sm:text-sm text-zinc-900 focus:outline-none focus:border-[#F19B0A] resize-none"
                        />
                    </div>

                    {/* Allocations Editor */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-900">
                                    Fatias da Carteira ({allocations.length}/8)
                                </h3>
                                <p className="text-xs text-zinc-500">
                                    Os percentuais precisam fechar exatamente em 100%.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddAllocation}
                                disabled={allocations.length >= 8}
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 disabled:opacity-40 transition-colors"
                            >
                                <LucidePlus className="w-3.5 h-3.5" />
                                <span>Adicionar fatia</span>
                            </button>
                        </div>

                        <div className="space-y-3">
                            {allocations.map((item, idx) => (
                                <div
                                    key={item.id}
                                    className="p-4 rounded-xl bg-[#FAFAF9] border border-zinc-200/80 space-y-3"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            {COLOR_PRESETS.map((preset) => (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() =>
                                                        handleUpdateAllocation(
                                                            idx,
                                                            'color',
                                                            preset,
                                                        )
                                                    }
                                                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                                                        item.color === preset
                                                            ? 'border-zinc-900 scale-110'
                                                            : 'border-transparent hover:scale-105'
                                                    }`}
                                                    style={{
                                                        backgroundColor: preset,
                                                    }}
                                                    aria-label={`Selecionar cor ${preset}`}
                                                />
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemoveAllocation(idx)
                                            }
                                            disabled={allocations.length <= 1}
                                            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                                        >
                                            <LucideTrash2 className="w-3.5 h-3.5" />
                                            <span>Remover</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                        <div className="sm:col-span-5">
                                            <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                                                Nome da Fatia
                                            </label>
                                            <input
                                                type="text"
                                                value={item.label}
                                                onChange={(e) =>
                                                    handleUpdateAllocation(
                                                        idx,
                                                        'label',
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                                className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-base sm:text-sm text-zinc-900 focus:outline-none focus:border-[#F19B0A]"
                                            />
                                        </div>
                                        <div className="sm:col-span-4">
                                            <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                                                Categoria
                                            </label>
                                            <input
                                                type="text"
                                                value={item.category}
                                                onChange={(e) =>
                                                    handleUpdateAllocation(
                                                        idx,
                                                        'category',
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                                className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-base sm:text-sm text-zinc-900 focus:outline-none focus:border-[#F19B0A]"
                                            />
                                        </div>
                                        <div className="sm:col-span-3">
                                            <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                                                Peso (%)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.5"
                                                min="0.5"
                                                max="100"
                                                value={item.percentage}
                                                onChange={(e) =>
                                                    handleUpdateAllocation(
                                                        idx,
                                                        'percentage',
                                                        Number(e.target.value),
                                                    )
                                                }
                                                required
                                                className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-sm font-semibold text-zinc-900 focus:outline-none focus:border-[#F19B0A]"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                                                Liquidez
                                            </label>
                                            <input
                                                type="text"
                                                value={item.liquidity}
                                                onChange={(e) =>
                                                    handleUpdateAllocation(
                                                        idx,
                                                        'liquidity',
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                                className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-base sm:text-sm text-zinc-900 focus:outline-none focus:border-[#F19B0A]"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                                                Ticket Mínimo Sugerido (R$)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={
                                                    item.minSuggestedAmount ?? ''
                                                }
                                                onChange={(e) =>
                                                    handleUpdateAllocation(
                                                        idx,
                                                        'minSuggestedAmount',
                                                        e.target.value === ''
                                                            ? undefined
                                                            : Number(
                                                                  e.target.value,
                                                              ),
                                                    )
                                                }
                                                placeholder="Ex.: 35"
                                                className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-base sm:text-sm text-zinc-900 focus:outline-none focus:border-[#F19B0A]"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                                            Onde investir (exemplos práticos)
                                        </label>
                                        <input
                                            type="text"
                                            value={item.examples}
                                            onChange={(e) =>
                                                handleUpdateAllocation(
                                                    idx,
                                                    'examples',
                                                    e.target.value,
                                                )
                                            }
                                            required
                                            className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white text-base sm:text-sm text-zinc-900 focus:outline-none focus:border-[#F19B0A]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                                            Por que faz parte da carteira?
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={item.rationale}
                                            onChange={(e) =>
                                                handleUpdateAllocation(
                                                    idx,
                                                    'rationale',
                                                    e.target.value,
                                                )
                                            }
                                            required
                                            className="w-full p-2.5 rounded-lg border border-zinc-200 bg-white text-base sm:text-sm text-zinc-900 focus:outline-none focus:border-[#F19B0A] resize-none"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-zinc-100 bg-zinc-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap w-full sm:w-auto">
                        <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                                isSumValid
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                        >
                            {isSumValid ? (
                                <LucideCheck className="w-3.5 h-3.5" />
                            ) : (
                                <LucideAlertCircle className="w-3.5 h-3.5" />
                            )}
                            <span>
                                Soma atual:{' '}
                                {totalPercentage.toFixed(
                                    Number.isInteger(totalPercentage) ? 0 : 1,
                                )}
                                %
                            </span>
                            {!isSumValid && (
                                <span className="font-normal">
                                    (falta{' '}
                                    {(100 - totalPercentage).toFixed(1)}%)
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={isResetting || isSaving}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors"
                        >
                            <LucideRotateCcw className="w-3.5 h-3.5" />
                            <span>
                                {confirmReset
                                    ? 'Clique novamente para confirmar'
                                    : 'Restaurar padrão'}
                            </span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-sm font-medium text-zinc-700 transition-colors flex items-center justify-center"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!isSumValid || isSaving || isResetting}
                            className="h-10 px-5 rounded-xl bg-[#F19B0A] hover:bg-[#D98B08] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {isSaving && (
                                <LucideLoader2 className="w-4 h-4 animate-spin" />
                            )}
                            <span>Salvar Alterações</span>
                        </button>
                    </div>
                </div>
            </form>
        </PortalModal>
    );
}
