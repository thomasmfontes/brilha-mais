import { ArrowRight } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#FAFAF9] text-zinc-900 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900">
            <Navbar />

            {/* Clean Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 sm:py-28">
                <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
                    
                    {/* Status Pill */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-medium mb-8 shadow-2xs">
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

                    {/* Action Button */}
                    <div className="flex items-center justify-center w-full sm:w-auto">
                        <Link
                            id="btn-hero-cta"
                            to="/login"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl text-sm sm:text-base font-semibold text-white bg-[#F19B0A] hover:bg-[#D98B08] active:scale-[0.98] transition-all shadow-2xs"
                        >
                            <span>Começar agora</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                </div>
            </main>

            {/* Seamless Minimalist Footer */}
            <footer className="w-full border-t border-zinc-200/70 bg-white py-8 px-6 sm:px-8 mt-auto">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Link to="/" aria-label="Brilha Mais" className="flex items-center gap-2 focus:outline-none">
                        <img src={logo} alt="Brilha Mais" className="h-8 w-auto hover:opacity-85 transition-opacity" />
                    </Link>

                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-xs text-zinc-500">
                        <span>&copy; 2026 Brilha Mais</span>
                        <div className="flex items-center gap-4">
                            <Link to="/termos" className="hover:text-zinc-900 transition-colors">Termos de Uso</Link>
                            <span className="text-zinc-300">·</span>
                            <Link to="/privacidade" className="hover:text-zinc-900 transition-colors">Privacidade</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
