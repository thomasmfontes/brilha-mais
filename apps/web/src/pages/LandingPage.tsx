import { motion } from "framer-motion";
import { Navbar } from "../components/Navbar";
import { Link } from "react-router-dom";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
            <Navbar />

            {/* Cinematic Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-40 px-6 overflow-hidden bg-[#FFFCF8]">
                {/* Abstract background effects */}
                <div className="absolute top-[-10%] left-[-5%] w-[100%] h-[100%] bg-[#F19B0A]/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col items-center text-center">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-amber-50/80 border border-amber-100 mb-10 backdrop-blur-sm shadow-sm"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">Plataforma aberta ao público</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-[2.25rem] sm:text-6xl md:text-8xl font-black tracking-tight mb-8 leading-[1.1] sm:leading-[1] text-slate-900"
                        >
                            Sua Jornada para o <br />
                            <span className="text-[#F19B0A]">Próximo Nível</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-sm sm:text-lg md:text-2xl text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed font-medium"
                        >
                            Acesse gratuitamente a maior plataforma de vídeo-aulas premium. Aprenda com os maiores especialistas do mercado, sem assinaturas.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="w-full max-w-xs sm:max-w-md px-4"
                        >
                            <Link to="/login" className="w-full bg-[#F19B0A] text-white px-8 py-4 sm:py-5 rounded-2xl font-black text-lg sm:text-xl hover:bg-[#D98B08] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-[#F19B0A]/30 active:scale-95 group uppercase tracking-widest overflow-hidden">
                                Começar Agora
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="group-hover:translate-x-1 transition-transform h-5 w-5 sm:h-6 sm:w-6">
                                    <path d="M8 5V19L19 12L8 5Z" />
                                </svg>
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </section>
        </div>
    );
}
