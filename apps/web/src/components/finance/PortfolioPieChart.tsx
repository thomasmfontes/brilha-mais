import React from 'react';
import { PortfolioAllocationItem, formatBRL } from './types';

interface PortfolioPieChartProps {
    allocations: PortfolioAllocationItem[];
    totalAmount: number;
    activeId: string | null;
    onSelect: (id: string | null) => void;
    onToggle?: (id: string) => void;
}

const canHover = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover)').matches;

export const PortfolioPieChart: React.FC<PortfolioPieChartProps> = ({
    allocations,
    totalAmount,
    activeId,
    onSelect,
    onToggle,
}) => {
    const validAllocations = allocations.filter(
        (item) => Number(item.percentage) > 0,
    );
    const totalPct = validAllocations.reduce(
        (sum, item) => sum + Number(item.percentage),
        0,
    );

    const size = 220;
    const center = size / 2;
    const radius = 84;
    const circumference = 2 * Math.PI * radius;

    let accumulatedAngle = -90;
    const segments = validAllocations.map((item) => {
        const pct = Number(item.percentage);
        const fraction = totalPct > 0 ? pct / totalPct : 0;
        const sweepAngle = fraction * 360;
        const rawArcLength = fraction * circumference;
        const gapLength =
            validAllocations.length > 1 && rawArcLength > 8 ? 2.5 : 0;
        const gapAngle = (gapLength / circumference) * 360;
        const startAngle = accumulatedAngle + gapAngle / 2;
        accumulatedAngle += sweepAngle;

        return {
            ...item,
            startAngle,
            dashLength: Math.max(0, rawArcLength - gapLength),
        };
    });

    const activeItem = activeId
        ? validAllocations.find((item) => item.id === activeId) ?? null
        : null;

    const handleSliceActivate = (id: string) => {
        if (onToggle) {
            onToggle(id);
            return;
        }
        onSelect(activeId === id ? null : id);
    };

    return (
        <div className="relative mx-auto w-48 h-48 sm:w-56 sm:h-56 select-none">
            <svg
                viewBox={`0 0 ${size} ${size}`}
                className="w-full h-full overflow-visible"
                role="img"
                aria-label="Distribuição sugerida da carteira de investimentos"
            >
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#F4F4F5"
                    strokeWidth={18}
                />

                {segments.map((segment) => {
                    const isActive = activeId === segment.id;
                    const isDimmed = Boolean(activeId && !isActive);
                    const amount = (totalAmount * Number(segment.percentage)) / 100;

                    return (
                        <circle
                            key={segment.id}
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="none"
                            stroke={segment.color || '#F19B0A'}
                            strokeWidth={isActive ? 24 : 18}
                            strokeDasharray={`${segment.dashLength} ${circumference}`}
                            strokeLinecap="butt"
                            transform={`rotate(${segment.startAngle} ${center} ${center})`}
                            opacity={isDimmed ? 0.3 : 1}
                            className="cursor-pointer transition-all duration-200 focus:outline-none"
                            role="button"
                            tabIndex={0}
                            aria-label={`${segment.label}: ${segment.percentage}% (${formatBRL(amount)})`}
                            onMouseEnter={() => {
                                if (canHover()) onSelect(segment.id);
                            }}
                            onMouseLeave={() => {
                                if (canHover()) onSelect(null);
                            }}
                            onClick={() => handleSliceActivate(segment.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleSliceActivate(segment.id);
                                }
                            }}
                        />
                    );
                })}
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                {activeItem ? (
                    <>
                        <span className="text-[11px] font-medium text-zinc-500">
                            {activeItem.percentage}% da carteira
                        </span>
                        <span className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 mt-0.5 tabular-nums">
                            {formatBRL(
                                (totalAmount * Number(activeItem.percentage)) / 100,
                            )}
                        </span>
                        <span className="text-[11px] font-medium text-zinc-600 mt-0.5 line-clamp-2 max-w-[116px] sm:max-w-[136px] leading-tight">
                            {activeItem.label}
                        </span>
                    </>
                ) : (
                    <>
                        <span className="text-[11px] font-medium text-zinc-500">
                            Aporte simulado
                        </span>
                        <span className="text-base sm:text-xl font-bold tracking-tight text-zinc-900 mt-0.5 tabular-nums">
                            {formatBRL(totalAmount)}
                        </span>
                        <span className="text-[11px] text-zinc-400 mt-0.5">
                            {validAllocations.length}{' '}
                            {validAllocations.length === 1 ? 'classe' : 'classes'}
                        </span>
                    </>
                )}
            </div>
        </div>
    );
};
