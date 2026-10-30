import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    position?: 'top' | 'bottom';
    className?: string;
    delay?: number;
}

export function Tooltip({
    content,
    children,
    position = 'top',
    className = '',
    delay = 60,
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
    const [actualPosition, setActualPosition] = useState<'top' | 'bottom'>(position);
    const [shiftX, setShiftX] = useState<number>(0);
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<any>(null);

    const updateCoords = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();

        // Check if there is enough space on top (at least 75px)
        const fitsOnTop = rect.top >= 75;
        const effPos: 'top' | 'bottom' = position === 'top' ? (fitsOnTop ? 'top' : 'bottom') : 'bottom';

        const top = effPos === 'top' ? rect.top - 8 : rect.bottom + 8;
        const left = rect.left + rect.width / 2;

        setActualPosition(effPos);
        setCoords({ top, left });
    };

    // Ajusta o tooltip para não vazar a tela e mantém a seta apontando para o gatilho
    useEffect(() => {
        if (isVisible && tooltipRef.current && coords) {
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            const padding = 12;
            let shift = 0;

            if (tooltipRect.right > window.innerWidth - padding) {
                shift = (window.innerWidth - padding) - tooltipRect.right;
            } else if (tooltipRect.left < padding) {
                shift = padding - tooltipRect.left;
            }

            setShiftX(shift);
        } else {
            setShiftX(0);
        }
    }, [isVisible, coords]);

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            updateCoords();
            setIsVisible(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    useEffect(() => {
        if (!isVisible) return;
        const handleScrollOrResize = () => {
            updateCoords();
        };
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);
        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isVisible]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const isStringContent = typeof content === 'string';

    return (
        <div
            ref={triggerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={handleMouseEnter}
            onBlur={handleMouseLeave}
            className={`inline-flex items-center justify-center ${className}`}
        >
            {children}
            {typeof document !== 'undefined' &&
                createPortal(
                    <AnimatePresence>
                        {isVisible && coords && (
                            <div
                                ref={tooltipRef}
                                style={{
                                    position: 'fixed',
                                    top: coords.top,
                                    left: coords.left + shiftX,
                                    transform: actualPosition === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
                                    zIndex: 999999,
                                    pointerEvents: 'none',
                                    width: 'max-content',
                                    maxWidth: 'calc(100vw - 24px)',
                                }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.96, y: actualPosition === 'top' ? 3 : -3 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={{ duration: 0.12, ease: 'easeOut' }}
                                >
                                    <div
                                        className={`relative px-3 py-1.5 bg-slate-900/95 text-white text-xs rounded-xl shadow-xl border border-slate-700/60 backdrop-blur-md max-w-xs text-left ${
                                            isStringContent ? 'whitespace-nowrap' : 'whitespace-normal'
                                        }`}
                                    >
                                        {content}
                                        {/* Seta apontando exatamente para o ícone (compensando o shiftX se houver) */}
                                        {actualPosition === 'top' && (
                                            <div
                                                className="absolute top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900/95"
                                                style={{ left: `calc(50% - ${shiftX}px)` }}
                                            />
                                        )}
                                        {actualPosition === 'bottom' && (
                                            <div
                                                className="absolute bottom-full -translate-x-1/2 border-4 border-transparent border-b-slate-900/95"
                                                style={{ left: `calc(50% - ${shiftX}px)` }}
                                            />
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </div>
    );
}

export default Tooltip;
