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
    const triggerRef = useRef<HTMLDivElement>(null);
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
                                style={{
                                    position: 'fixed',
                                    top: coords.top,
                                    left: coords.left,
                                    transform: actualPosition === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
                                    zIndex: 999999,
                                    pointerEvents: 'none',
                                }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.96, y: actualPosition === 'top' ? 3 : -3 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.96 }}
                                    transition={{ duration: 0.12, ease: 'easeOut' }}
                                >
                                    <div className="relative px-3 py-2 bg-slate-900/95 text-white text-xs rounded-xl shadow-xl border border-slate-700/60 backdrop-blur-md max-w-xs text-left">
                                        {content}
                                        {/* Seta apontando exatamente para o ícone */}
                                        {actualPosition === 'top' && (
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                                        )}
                                        {actualPosition === 'bottom' && (
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900/95" />
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
