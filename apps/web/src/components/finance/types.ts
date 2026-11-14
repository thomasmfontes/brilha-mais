export interface PortfolioAllocationItem {
    id: string;
    label: string;
    percentage: number;
    color: string;
    category: string;
    examples: string;
    rationale: string;
    liquidity: string;
    minSuggestedAmount?: number;
}

export interface PortfolioUpdater {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    role?: string;
}

export interface FinanceInstructor {
    id: string;
    name: string | null;
    avatarUrl: string | null;
}

export interface InvestmentPortfolio {
    id: string;
    slug: string;
    title: string;
    subtitle: string;
    description: string;
    riskLevel: string;
    recommendedHorizon: string;
    expectedAnnualPct: number;
    benchmarkNote?: string | null;
    order: number;
    allocations: PortfolioAllocationItem[];
    updatedById?: string | null;
    updatedBy?: PortfolioUpdater | null;
    createdAt?: string;
    updatedAt?: string;
}

export function formatBRL(value: number): string {
    const safeValue = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(safeValue);
}
