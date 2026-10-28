import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface PortalModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    preventCloseOnOverlayClick?: boolean;
    className?: string;
}

export function PortalModal({ isOpen, onClose, children, preventCloseOnOverlayClick, className }: PortalModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 md:p-6 overflow-hidden">
                    {/* Fundo suave sem flicker de GPU/blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        onClick={() => !preventCloseOnOverlayClick && onClose()}
                        className="fixed inset-0 bg-slate-950/60 will-change-[opacity]"
                    />
                    
                    {/* Conteúdo do Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 10 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        className={className || "relative z-[100000] w-full max-w-lg"}
                    >
                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}