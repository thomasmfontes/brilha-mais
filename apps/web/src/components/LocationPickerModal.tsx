import { useState, useEffect } from "react";
import { PortalModal } from "./PortalModal";
import { LucideMapPin, LucideLoader2, LucideCheckCircle2, LucideBuilding2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../utils/api";
import { toast } from "react-hot-toast";

interface Location {
    id: string;
    name: string;
}

interface LocationPickerModalProps {
    isOpen: boolean;
    onLocationSelected: (locationId: string, locationName: string) => void;
}

export function LocationPickerModal({ isOpen, onLocationSelected }: LocationPickerModalProps) {
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const fetchLocations = async () => {
            setIsLoading(true);
            try {
                const res = await api.get("/locations");
                setLocations(res.data);
            } catch {
                toast.error("Não foi possível carregar as localidades.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchLocations();
    }, [isOpen]);

    const handleConfirm = async () => {
        if (!selectedId || isSaving) return;
        setIsSaving(true);
        try {
            await api.patch("/users/me", { locationId: selectedId });
            const location = locations.find((l) => l.id === selectedId);
            toast.success(`Localidade "${location?.name}" definida com sucesso!`);
            onLocationSelected(selectedId, location?.name ?? "");
        } catch {
            toast.error("Erro ao salvar a localidade. Tente novamente.");
            setIsSaving(false);
        }
    };

    return (
        <PortalModal isOpen={isOpen} onClose={() => {}} preventCloseOnOverlayClick={true}>
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] md:shadow-[0_48px_96px_-24px_rgba(0,0,0,0.3)] relative w-full border border-slate-100 overflow-hidden"
            >
                {/* Brand Background Pattern */}
                <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent pointer-events-none" />
                <div className="absolute top-8 right-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute top-20 -left-4 w-16 h-16 bg-primary/5 rounded-full blur-xl pointer-events-none" />

                <div className="p-7 md:p-10 flex flex-col items-center text-center relative z-10">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="flex items-center gap-2 mb-5"
                    >
                        <div className="h-4 w-1 bg-primary rounded-full shadow-[0_0_12px_rgba(var(--primary-rgb),0.5)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary italic">Brilha Mais</span>
                    </motion.div>

                    {/* Title */}
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter leading-[0.9] mb-3 italic">
                        Selecione sua<br />
                        <span className="text-primary drop-shadow-sm">Localidade</span>
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed max-w-xs">
                        Precisamos saber qual localidade você pertence para continuar.
                    </p>

                    {/* Location List */}
                    <div className="w-full mb-6">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-6 gap-3">
                                <LucideLoader2 className="h-7 w-7 text-primary animate-spin" />
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] italic">Carregando localidades...</p>
                            </div>
                        ) : locations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-6 gap-2">
                                <LucideBuilding2 className="h-10 w-10 text-slate-200" />
                                <p className="text-sm font-semibold text-slate-500">Nenhuma localidade cadastrada.</p>
                                <p className="text-xs text-slate-400">Contacte o administrador do sistema.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto no-scrollbar">
                                {locations.map((loc, i) => {
                                    const isSelected = selectedId === loc.id;
                                    return (
                                        <motion.button
                                            key={loc.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 + i * 0.06 }}
                                            onClick={() => setSelectedId(loc.id)}
                                            className={`
                                                w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left
                                                transition-all duration-150 group relative overflow-hidden
                                                ${isSelected
                                                    ? "bg-primary/5 border-2 border-primary shadow-sm shadow-primary/10"
                                                    : "bg-slate-50 border-2 border-transparent hover:border-slate-200"
                                                }
                                            `}
                                        >
                                            <div className={`
                                                h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors
                                                ${isSelected ? "bg-primary/15" : "bg-white border border-slate-200 group-hover:border-slate-300"}
                                            `}>
                                                <LucideMapPin className={`h-4 w-4 ${isSelected ? "text-primary" : "text-slate-400"}`} />
                                            </div>
                                            <span className={`flex-1 text-sm font-bold tracking-tight ${isSelected ? "text-slate-900" : "text-slate-600"}`}>
                                                {loc.name}
                                            </span>
                                            <AnimatePresence>
                                                {isSelected && (
                                                    <motion.div
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0, opacity: 0 }}
                                                    >
                                                        <LucideCheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Confirm Button */}
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedId || isSaving || isLoading}
                        className={`
                            w-full py-4 md:py-5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-[0.15em]
                            transition-all duration-200 flex items-center justify-center gap-3
                            shadow-2xl relative overflow-hidden group
                            ${selectedId && !isSaving
                                ? "bg-primary text-white shadow-primary/30"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                            }
                        `}
                    >
                        {selectedId && !isSaving && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        )}
                        {isSaving ? (
                            <>
                                <LucideLoader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                                <span className="relative">Salvando...</span>
                            </>
                        ) : (
                            <>
                                <LucideBuilding2 className="h-4 w-4 md:h-5 md:w-5 relative" />
                                <span className="relative">Confirmar Localidade</span>
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </PortalModal>
    );
}
