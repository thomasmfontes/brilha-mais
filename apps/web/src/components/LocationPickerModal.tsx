import { useState, useEffect } from "react";
import { PortalModal } from "./PortalModal";
import { MapPin, Loader2, CheckCircle2, Building2 } from "lucide-react";
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
            <div className="bg-white rounded-2xl shadow-2xl relative max-w-md w-full border border-zinc-200/80 p-6 sm:p-7 text-left space-y-6">
                {/* Header */}
                <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                        <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-950">
                            Selecione sua Localidade
                        </h2>
                        <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 leading-relaxed">
                            Identifique a sua unidade ou cidade para liberar os cursos e turmas adequados.
                        </p>
                    </div>
                </div>

                {/* Location List */}
                <div className="w-full">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <Loader2 className="h-6 w-6 text-amber-600 animate-spin" />
                            <p className="text-xs text-zinc-400 font-medium">Carregando localidades...</p>
                        </div>
                    ) : locations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                            <Building2 className="h-8 w-8 text-zinc-300" />
                            <p className="text-sm font-semibold text-zinc-800">Nenhuma localidade cadastrada</p>
                            <p className="text-xs text-zinc-500">Contate o administrador do sistema.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                            {locations.map((loc) => {
                                const isSelected = selectedId === loc.id;
                                return (
                                    <button
                                        key={loc.id}
                                        type="button"
                                        onClick={() => setSelectedId(loc.id)}
                                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all active:scale-[0.99] border cursor-pointer ${
                                            isSelected
                                                ? "bg-amber-50/70 border-[#F19B0A] shadow-2xs"
                                                : "bg-zinc-50/70 border-zinc-200/80 hover:bg-zinc-100/70 hover:border-zinc-300"
                                        }`}
                                    >
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                            isSelected ? "bg-amber-100 text-amber-800" : "bg-white border border-zinc-200 text-zinc-400"
                                        }`}>
                                            <MapPin className="h-4 w-4" />
                                        </div>
                                        <span className={`flex-1 text-sm font-medium ${
                                            isSelected ? "text-zinc-950 font-semibold" : "text-zinc-700"
                                        }`}>
                                            {loc.name}
                                        </span>
                                        {isSelected && (
                                            <CheckCircle2 className="h-4 w-4 text-[#F19B0A] shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Confirm Button */}
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!selectedId || isSaving || isLoading}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-2xs ${
                        selectedId && !isSaving
                            ? "bg-[#F19B0A] hover:bg-[#D98B08] text-white active:scale-[0.98] cursor-pointer"
                            : "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200/60"
                    }`}
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Salvando localidade...</span>
                        </>
                    ) : (
                        <span>Confirmar Localidade</span>
                    )}
                </button>
            </div>
        </PortalModal>
    );
}
