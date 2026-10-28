import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAF9]/80 backdrop-blur-md border-b border-zinc-200/70 h-20 flex items-center transition-all">
            <div className="max-w-6xl mx-auto px-6 lg:px-8 w-full flex justify-between items-center">
                {/* Brand Logo */}
                <Link to="/" aria-label="Brilha Mais - Página Inicial" className="flex items-center gap-3 focus:outline-none">
                    <img src={logo} alt="Brilha Mais" className="h-11 sm:h-12 w-auto object-contain transition-opacity hover:opacity-90" />
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-6">
                    <Link
                        to="/login"
                        className="text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors px-2 py-1"
                    >
                        Entrar
                    </Link>
                    <Link
                        to="/login"
                        className="inline-flex items-center justify-center px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-sm font-semibold text-white bg-[#F19B0A] hover:bg-[#D98B08] active:scale-[0.98] transition-all shadow-xs"
                    >
                        Começar agora
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <div className="flex items-center md:hidden">
                    <button
                        id="btn-mobile-menu"
                        aria-expanded={isMenuOpen}
                        aria-label={isMenuOpen ? "Fechar Menu" : "Abrir Menu"}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors focus:outline-none"
                    >
                        {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMenuOpen && (
                <div
                    id="mobile-menu-dropdown"
                    className="absolute top-20 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-lg px-6 py-6 flex flex-col gap-3 md:hidden"
                >
                    <Link
                        to="/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="text-sm font-medium text-zinc-700 hover:text-zinc-950 transition-colors py-2 text-center"
                    >
                        Entrar
                    </Link>
                    <Link
                        to="/login"
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full inline-flex items-center justify-center px-5 py-3 text-sm font-semibold text-white rounded-xl bg-[#F19B0A] hover:bg-[#D98B08] shadow-xs text-center"
                    >
                        Começar agora
                    </Link>
                </div>
            )}
        </header>
    );
}
