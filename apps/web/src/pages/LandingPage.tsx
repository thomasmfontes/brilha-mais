import { ArrowRight } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Link } from "react-router-dom";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#FAFAF9] text-zinc-900 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900">
            <Navbar />

            {/* Clean Hero Section */}
            <main className="flex-1 flex items-center justify-center px-6 pt-36 pb-20 sm:pt-44 sm:pb-28">
                <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
                    
                    {/* Status Pill */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-medium mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F19B0A]" />
                        <span>Plataforma aberta ao público</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-zinc-950 leading-[1.1] max-w-3xl">
                        Sua jornada para o <br className="hidden sm:inline" />
                        <span className="text-[#F19B0A]">próximo nível.</span>
                    </h1>

                    {/* Subtitle Description */}
                    <p className="text-base sm:text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto leading-relaxed mt-6 mb-10 font-normal">
                        Ilumine o seu futuro com conhecimento de ponta. Vídeo-aulas exclusivas para você se desenvolver e brilhar em qualquer área.
                    </p>

                    {/* Primary CTA */}
                    <div>
                        <Link
                            id="btn-hero-cta"
                            to="/login"
                            className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 sm:px-8 sm:py-4 rounded-xl text-base font-semibold text-white bg-[#F19B0A] hover:bg-[#D98B08] active:scale-[0.98] transition-all shadow-sm hover:shadow"
                        >
                            <span>Começar agora</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                </div>
            </main>
        </div>
    );
}
