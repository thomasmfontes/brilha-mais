import React from "react";
import { LucideAlertCircle, LucideLoader2 } from "lucide-react";
import { PortalModal } from "./PortalModal";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
    variant?: "danger" | "primary" | "warning";
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    isLoading = false,
    variant = "danger"
}: ConfirmModalProps) {
    const variantStyles = {
        danger: "bg-red-50 text-red-500 border-red-100",
        primary: "bg-primary/5 text-primary border-primary/10",
        warning: "bg-amber-50 text-amber-500 border-amber-100"
    };

    const buttonStyles = {
        danger: "bg-primary shadow-primary/20 hover:bg-primary/90",
        primary: "bg-primary shadow-primary/20 hover:bg-primary/90",
        warning: "bg-amber-500 shadow-amber-500/20 hover:bg-amber-600"
    };

    return (
        <PortalModal isOpen={isOpen} onClose={onClose}>
            <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-slate-100 text-center space-y-6 relative overflow-hidden">
                <div className="flex flex-col items-center space-y-4">
                    <div className={`h-16 w-16 rounded-2xl flex items-center justify-center border shadow-sm ${variantStyles[variant]}`}>
                        <LucideAlertCircle className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-tight">{title}</h2>
                        <p className="text-sm font-bold text-slate-400 max-w-[280px] mx-auto leading-relaxed">
                            {description}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="py-4 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all active:scale-95 border border-slate-100 disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        disabled={isLoading}
                        onClick={onConfirm}
                        className={`py-4 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${buttonStyles[variant]}`}
                    >
                        {isLoading ? (
                            <>
                                <LucideLoader2 className="h-4 w-4 animate-spin" />
                                <span>Processando...</span>
                            </>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </PortalModal>
    );
}
