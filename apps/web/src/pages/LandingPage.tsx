import { ArrowRight, BookOpen, CheckCircle2, Award, Sparkles } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-[#FAFAF9] text-zinc-900 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900">
            <Navbar />

            {/* Clean Hero Section */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-16 sm:pt-40 sm:pb-24">
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

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <Link
                            id="btn-hero-cta"
                            to="/login"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 sm:px-8 sm:py-3.5 rounded-xl text-sm sm:text-base font-semibold text-white bg-[#F19B0A] hover:bg-[#D98B08] active:scale-[0.98] transition-all shadow-2xs"
                        >
                            <span>Começar agora</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            to="/explore"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm sm:text-base font-medium text-zinc-700 bg-white border border-zinc-200/80 hover:bg-zinc-50 transition-colors shadow-2xs"
                        >
                            <span>Explorar cursos</span>
                        </Link>
                    </div>

                </div>

                {/* 3 Value Pillars */}
                <div className="w-full max-w-5xl mx-auto mt-20 sm:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-7 shadow-2xs transition-shadow hover:shadow-xs">
                        <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 mb-4">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-semibold text-zinc-900 mb-1.5">
                            Trilhas Estruturadas
                        </h3>
                        <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
                            Módulos práticos organizados passo a passo com videoaulas dinâmicas e materiais de apoio em PDF.
                        </p>
                    </div>

                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-7 shadow-2xs transition-shadow hover:shadow-xs">
                        <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 mb-4">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-semibold text-zinc-900 mb-1.5">
                            Avaliação & Feedback
                        </h3>
                        <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
                            Quizzes de fixação e desafios dissertativos com correção individual e notas atribuídas por instrutores.
                        </p>
                    </div>

                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-7 shadow-2xs transition-shadow hover:shadow-xs">
                        <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 mb-4">
                            <Award className="w-5 h-5" />
                        </div>
                        <h3 className="text-base font-semibold text-zinc-900 mb-1.5">
                            Certificação Oficial
                        </h3>
                        <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
                            Emissão instantânea de certificados com validação de autenticidade para enriquecer seu currículo.
                        </p>
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
