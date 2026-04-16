import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface PortalModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    preventCloseOnOverlayClick?: boolean;
}

export function PortalModal({ isOpen, onClose, children, preventCloseOnOverlayClick }: PortalModalProps) {
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
                <div className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden">
                    {/* Fundo com efeito de vidro simplificado */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => !preventCloseOnOverlayClick && onClose()}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        style={{ WebkitBackdropFilter: 'blur(8px)' }}
                    />
                    
                    {/* Conteúdo do Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative z-[100000] w-full max-w-lg mx-4"
                    >
                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
