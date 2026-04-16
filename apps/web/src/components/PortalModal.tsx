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
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
                    style={{ willChange: "opacity" }}
                >
                    <div
                        onClick={() => !preventCloseOnOverlayClick && onClose()}
                        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md transition-all"
                    />
                    {children}
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
