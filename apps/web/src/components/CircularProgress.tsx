interface CircularProgressProps {
    pct: number;
    size?: number;
}

export default function CircularProgress({ pct, size = 64 }: CircularProgressProps) {
    const r = (size - 10) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return (
        <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" className="text-muted/20" strokeWidth={4} fill="none" />
            <circle
                cx={size / 2} cy={size / 2} r={r}
                stroke="currentColor" className="text-primary" strokeWidth={4} fill="none"
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
            <text
                x={size / 2} y={size / 2}
                textAnchor="middle" dominantBaseline="central"
                className="fill-foreground font-bold"
                style={{ fontSize: size <= 48 ? 9 : 10, transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
            >
                {pct}%
            </text>
        </svg>
    );
}
