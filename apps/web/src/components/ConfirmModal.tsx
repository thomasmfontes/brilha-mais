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
        danger: "bg-red-50 text-red-600 border-red-200/60",
        primary: "bg-amber-50 text-amber-600 border-amber-200/60",
        warning: "bg-amber-50 text-amber-600 border-amber-200/60"
    };

    const buttonStyles = {
        danger: "bg-red-600 hover:bg-red-700 shadow-red-500/10",
        primary: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/10",
        warning: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/10"
    };

    return (
        <PortalModal isOpen={isOpen} onClose={onClose}>
            <div className="bg-white rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200/80 text-left space-y-5 relative">
                <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${variantStyles[variant]}`}>
                        <LucideAlertCircle className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                        <h2 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">
                            {title}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                            {description}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="h-10 px-4 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={onConfirm}
                        className={`h-10 px-4 rounded-xl text-xs font-medium text-white shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${buttonStyles[variant]}`}
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
