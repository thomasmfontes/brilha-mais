import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LucideGraduationCap, LucideDownload, LucideAward } from "lucide-react";
import Skeleton from "../components/Skeleton";

export default function CertificatesPage() {
    const [isLoading, setIsLoading] = useState(true);
    const certificates: any[] = [];

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="space-y-8 md:space-y-10 md:px-0">
            <div>
                <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2 uppercase italic leading-none">Certificados</h1>
                <p className="text-muted-foreground text-[10px] md:text-lg font-bold uppercase tracking-[0.2em] md:tracking-widest mt-2 italic">Suas conquistas oficiais.</p>
            </div>

            {isLoading ? (
                <div className="grid md:grid-cols-2 gap-6">
                    {[...Array(2)].map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full" variant="rounded" />
                    ))}
                </div>
            ) : certificates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {certificates.map((cert, idx) => (
                        <div key={idx} className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-border bg-card shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-4 md:gap-6">
                                <div className="h-14 w-14 md:h-16 md:w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner shrink-0">
                                    <LucideAward className="h-7 w-7 md:h-8 md:w-8" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-lg md:text-xl font-black truncate uppercase tracking-tight">{cert.title}</h3>
                                    <p className="text-[10px] md:text-sm text-muted-foreground font-bold uppercase tracking-widest truncate">Concluído em {cert.date}</p>
                                </div>
                            </div>
                            <button className="p-3.5 md:p-4 rounded-xl md:rounded-2xl bg-muted hover:bg-primary hover:text-primary-foreground transition-all group-hover:scale-110 shadow-sm shrink-0">
                                <LucideDownload className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-[350px] md:h-[400px] flex flex-col items-center justify-center text-center p-6 md:p-12 space-y-6 bg-card rounded-[2.5rem] md:rounded-[3rem] border border-dashed border-border shadow-inner">
                    <div className="h-20 w-20 md:h-24 md:w-24 bg-primary/5 rounded-full flex items-center justify-center">
                        <LucideAward className="h-10 w-10 md:h-12 md:w-12 text-primary/30" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground/80 uppercase">Nenhum certificado</h2>
                        <p className="text-muted-foreground text-xs md:text-sm font-bold uppercase tracking-widest max-w-[240px] md:max-w-xs mx-auto leading-relaxed">Conclua seus conteúdos para desbloquear suas conquistas.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
