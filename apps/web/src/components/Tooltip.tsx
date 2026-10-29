import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
    delay?: number;
}

export function Tooltip({
    content,
    children,
    position = 'top',
    className = '',
    delay = 80,
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<any>(null);

    const updateCoords = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();

        let top = 0;
        let left = 0;

        if (position === 'top') {
            top = rect.top - 8;
            left = rect.left + rect.width / 2;
        } else if (position === 'bottom') {
            top = rect.bottom + 8;
            left = rect.left + rect.width / 2;
        } else if (position === 'left') {
            top = rect.top + rect.height / 2;
            left = rect.left - 8;
        } else if (position === 'right') {
            top = rect.top + rect.height / 2;
            left = rect.right + 8;
        }

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

    const transformStyle =
        position === 'top'
            ? 'translate(-50%, -100%)'
            : position === 'bottom'
            ? 'translate(-50%, 0)'
            : position === 'left'
            ? 'translate(-100%, -50%)'
            : 'translate(0, -50%)';

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
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: position === 'top' ? 2 : -2 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.12, ease: 'easeOut' }}
                                style={{
                                    top: coords.top,
                                    left: coords.left,
                                    transform: transformStyle,
                                }}
                                className="fixed z-[999999] pointer-events-none"
                            >
                                <div className="relative px-3 py-2 bg-slate-900/95 text-white text-xs rounded-xl shadow-xl border border-slate-700/60 backdrop-blur-md max-w-xs text-left">
                                    {content}
                                    {position === 'top' && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
                                    )}
                                    {position === 'bottom' && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900/95" />
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
        </div>
    );
}

export default Tooltip;
