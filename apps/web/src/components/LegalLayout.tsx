import React, { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Shield, ArrowLeft } from 'lucide-react';
import logo from '../assets/logo.png';

interface TocItem {
    id: string;
    label: string;
}

interface LegalLayoutProps {
    title: string;
    subtitle: string;
    lastUpdated: string;
    version: string;
    activeTab: 'termos' | 'privacidade';
    toc: TocItem[];
    children: ReactNode;
}

export default function LegalLayout({
    title,
    subtitle,
    lastUpdated,
    version,
    activeTab,
    toc,
    children
}: LegalLayoutProps) {
    const navigate = useNavigate();

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFAF9] text-zinc-900 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900">
            {/* Minimal Distraction-free Header */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-zinc-200/70">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
                    <Link to="/" aria-label="Brilha Mais" className="flex items-center gap-2 focus:outline-none">
                        <img src={logo} alt="Brilha Mais" className="h-7 w-auto hover:opacity-85 transition-opacity" />
                    </Link>

                    <button
                        type="button"
                        onClick={handleBack}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200/80 bg-white text-xs font-medium text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Voltar</span>
                    </button>
                </div>
            </header>

            {/* Document Hero */}
            <section className="bg-white border-b border-zinc-200/70 pt-8 pb-8 sm:pt-12 sm:pb-10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Title & Metadata */}
                    <div className="max-w-3xl">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mb-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 font-medium">
                                Versão {version}
                            </span>
                            <span>·</span>
                            <span>Última atualização: {lastUpdated}</span>
                        </div>

                        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-950 mb-2">
                            {title}
                        </h1>
                        <p className="text-sm sm:text-base text-zinc-500 leading-relaxed">
                            {subtitle}
                        </p>
                    </div>

                    {/* Segmented Tabs (Termos / Privacidade) */}
                    <div className="mt-8 flex border-b border-zinc-200">
                        <Link
                            to="/termos"
                            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                                activeTab === 'termos'
                                    ? 'border-amber-500 text-zinc-950 font-semibold'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                            }`}
                        >
                            <FileText className={`w-4 h-4 ${activeTab === 'termos' ? 'text-amber-600' : 'text-zinc-400'}`} />
                            <span>Termos de Uso</span>
                        </Link>
                        <Link
                            to="/privacidade"
                            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                                activeTab === 'privacidade'
                                    ? 'border-amber-500 text-zinc-950 font-semibold'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                            }`}
                        >
                            <Shield className={`w-4 h-4 ${activeTab === 'privacidade' ? 'text-amber-600' : 'text-zinc-400'}`} />
                            <span>Política de Privacidade</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Main Reading Section with Sticky TOC */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
                    {/* Sticky Table of Contents (Desktop) */}
                    <aside className="hidden lg:block lg:col-span-4 sticky top-20 space-y-4">
                        <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
                                Índice do documento
                            </h2>
                            <ul className="space-y-2">
                                {toc.map((item, index) => (
                                    <li key={item.id}>
                                        <a
                                            href={`#${item.id}`}
                                            className="group flex items-start gap-2 text-xs text-zinc-600 hover:text-zinc-950 transition-colors py-1"
                                        >
                                            <span className="text-zinc-400 font-mono text-[11px] mt-0.5 group-hover:text-amber-600 transition-colors">
                                                {String(index + 1).padStart(2, '0')}.
                                            </span>
                                            <span className="leading-snug">{item.label}</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Quick Contact Card */}
                        <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/70 p-5 text-xs text-zinc-500 space-y-2">
                            <p className="font-semibold text-zinc-900">Dúvidas jurídicas?</p>
                            <p className="leading-relaxed">
                                Para esclarecimentos sobre direitos autorais ou tratamento de dados, contate nosso time de conformidade.
                            </p>
                        </div>
                    </aside>

                    {/* Reader Document Body */}
                    <div className="lg:col-span-8">
                        <article className="bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-10 shadow-xs">
                            {children}
                        </article>
                    </div>
                </div>
            </main>

            {/* Minimal Single-line Footer */}
            <footer className="w-full border-t border-zinc-200/70 bg-white py-6 px-4 text-center text-xs text-zinc-400 mt-auto">
                <p>&copy; 2026 Brilha Mais. Todos os direitos reservados.</p>
            </footer>
        </div>
    );
}
