import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Shield, ChevronRight } from 'lucide-react';
import { Navbar } from './Navbar';
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
    return (
        <div className="min-h-screen bg-[#FAFAF9] text-zinc-900 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900">
            {/* Standard Public Navbar */}
            <Navbar />

            {/* Hero Section */}
            <section className="bg-white border-b border-zinc-200/70 pt-28 pb-10 sm:pt-36 sm:pb-12">
                <div className="max-w-6xl mx-auto px-6 lg:px-8">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-1.5 text-xs text-zinc-400 mb-4">
                        <Link to="/" className="hover:text-zinc-700 transition-colors">Início</Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>Central Legal</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-zinc-700 font-medium">{title}</span>
                    </nav>

                    {/* Title & Metadata */}
                    <div className="max-w-3xl">
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-950 mb-3">
                            {title}
                        </h1>
                        <p className="text-sm sm:text-base text-zinc-500 leading-relaxed mb-6">
                            {subtitle}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 font-medium">
                                Versão {version}
                            </span>
                            <span>·</span>
                            <span>Última atualização: {lastUpdated}</span>
                        </div>
                    </div>

                    {/* Segmented Tabs (Termos / Privacidade) */}
                    <div className="mt-10 flex border-b border-zinc-200">
                        <Link
                            to="/termos"
                            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
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
                            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
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
            <main className="flex-1 max-w-6xl w-full mx-auto px-6 lg:px-8 py-10 sm:py-14">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    {/* Sticky Table of Contents (Desktop) */}
                    <aside className="hidden lg:block lg:col-span-4 sticky top-28 space-y-4">
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

            {/* Standard Minimalist Footer */}
            <footer className="w-full border-t border-zinc-200/70 bg-white py-8 px-6 sm:px-8 mt-auto">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Link to="/" aria-label="Brilha Mais" className="flex items-center gap-2 focus:outline-none">
                        <img src={logo} alt="Brilha Mais" className="h-8 w-auto hover:opacity-85 transition-opacity" />
                    </Link>

                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-xs text-zinc-500">
                        <span>&copy; 2026 Brilha Mais. Todos os direitos reservados.</span>
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
