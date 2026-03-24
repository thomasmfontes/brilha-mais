import { Menu } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/logo.png";
import icon from "../assets/icon.png";

export function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-2xl border-b border-border h-20 flex items-center">
            <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full flex justify-between items-center">
                <Link to="/" className="flex items-center gap-3 group">
                    <img src={logo} alt="Brilha Mais" className="h-16 w-auto group-hover:scale-105 transition-transform" />
                </Link>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-10">

                    <div className="flex items-center gap-4 border-l border-border pl-8">
                        <Link to="/login" className="text-xs font-black uppercase tracking-[0.2em] hover:text-primary transition-colors">
                            Entrar
                        </Link>
                        <Link to="/login" className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-xl shadow-primary/20 active:scale-95">
                            Começar Agora
                        </Link>
                    </div>
                </div>

                {/* Mobile Toggle */}
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="md:hidden h-10 w-10 flex items-center justify-center rounded-xl bg-primary/5 border border-primary/10 active:scale-95 transition-transform"
                >
                    <Menu className="h-5 w-5 text-primary" />
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-20 left-0 right-0 bg-white border-b border-slate-100 z-40 p-12 md:hidden shadow-2xl"
                    >
                        <div className="flex flex-col gap-10">
                            <Link to="/login" onClick={() => setIsMenuOpen(false)} className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-colors text-center">
                                Entrar na Plataforma
                            </Link>
                            <Link to="/login" onClick={() => setIsMenuOpen(false)} className="bg-[#F19B0A] text-white py-5 rounded-2xl text-sm font-black uppercase tracking-[0.2em] text-center shadow-xl shadow-[#F19B0A]/20">
                                Começar Agora
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
