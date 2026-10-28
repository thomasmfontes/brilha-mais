import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, ExternalLink } from 'lucide-react';
import logo from "../assets/logo.png";

const TermosPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#FAFAF9] text-zinc-900 flex flex-col justify-between selection:bg-amber-100 selection:text-amber-900">
            {/* Top Navigation */}
            <header className="w-full max-w-4xl mx-auto px-6 py-6 sm:py-8 flex items-center justify-between">
                <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200/80 bg-white text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors shadow-2xs"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar ao início</span>
                </Link>

                <Link to="/" className="inline-block">
                    <img src={logo} alt="Brilha Mais" className="h-8 w-auto object-contain" />
                </Link>

                <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#F19B0A] hover:bg-[#D98B08] transition-colors shadow-2xs"
                >
                    <span>Entrar</span>
                </Link>
            </header>

            {/* Main Content Reader Card */}
            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 pb-16">
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-12 shadow-2xs">
                    
                    {/* Header Info */}
                    <div className="border-b border-zinc-100 pb-8 mb-8">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200/60 text-amber-800 text-[11px] font-medium mb-4">
                            <FileText className="w-3.5 h-3.5 text-amber-600" />
                            <span>Documento Legal Oficial</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
                            Termos de Uso
                        </h1>
                        <p className="text-xs text-zinc-400 mt-2">
                            Última atualização: 24 de março de 2026 · Versão 2.1
                        </p>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-8 text-sm leading-relaxed text-zinc-600">
                        <section className="space-y-2">
                            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                                <span className="h-5 w-5 rounded-md bg-zinc-100 text-zinc-600 text-xs flex items-center justify-center font-medium">1</span>
                                Aceitação dos Termos
                            </h2>
                            <p>
                                Ao acessar e utilizar a plataforma Brilha Mais, você declara ter lido, compreendido e concordado integralmente com estes Termos de Uso. Caso não concorde com qualquer uma das condições estabelecidas, solicitamos que não utilize os serviços da plataforma.
                            </p>
                        </section>

                        <section className="space-y-2">
                            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                                <span className="h-5 w-5 rounded-md bg-zinc-100 text-zinc-600 text-xs flex items-center justify-center font-medium">2</span>
                                Descrição do Serviço
                            </h2>
                            <p>
                                O Brilha Mais é uma plataforma de aprendizado (LMS) focada em desenvolvimento profissional, oferecendo cursos em vídeo, materiais de apoio em PDF, testes práticos (quizzes), desafios dissertativos com correção individual e emissão de certificados com validação de autenticidade.
                            </p>
                        </section>

                        <section className="space-y-2">
                            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                                <span className="h-5 w-5 rounded-md bg-zinc-100 text-zinc-600 text-xs flex items-center justify-center font-medium">3</span>
                                Contas de Usuário e Autenticação
                            </h2>
                            <p>
                                Para acessar os cursos e registrar seu progresso, é necessário autenticar-se através dos provedores autorizados (Google, Microsoft ou Biometria/Passkey). O usuário é o único responsável pela guarda e confidencialidade de suas credenciais de acesso, sendo vedado o compartilhamento de contas.
                            </p>
                        </section>

                        <section className="space-y-2">
                            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                                <span className="h-5 w-5 rounded-md bg-zinc-100 text-zinc-600 text-xs flex items-center justify-center font-medium">4</span>
                                Propriedade Intelectual
                            </h2>
                            <p>
                                Todos os materiais pedagógicos, textos, identidades visuais, vídeos, códigos, marcas e demais ativos disponíveis na plataforma são protegidos pela legislação de direitos autorais e propriedade industrial, pertencendo exclusivamente ao Brilha Mais ou aos seus parceiros autorizados.
                            </p>
                        </section>

                        <section className="space-y-2">
                            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                                <span className="h-5 w-5 rounded-md bg-zinc-100 text-zinc-600 text-xs flex items-center justify-center font-medium">5</span>
                                Limitação de Responsabilidade
                            </h2>
                            <p>
                                Nos empenhamos para manter o serviço disponível de forma contínua e segura. Todavia, a plataforma não se responsabiliza por eventuais interrupções temporárias decorrentes de manutenção técnica, falhas de telecomunicações de terceiros ou eventos de força maior.
                            </p>
                        </section>

                        <section className="space-y-2">
                            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                                <span className="h-5 w-5 rounded-md bg-zinc-100 text-zinc-600 text-xs flex items-center justify-center font-medium">6</span>
                                Alterações nos Termos
                            </h2>
                            <p>
                                O Brilha Mais reserva-se o direito de atualizar estes termos periodicamente. Avisos sobre modificações relevantes serão divulgados com antecedência na plataforma. A continuidade no uso dos serviços após as atualizações implica na aceitação das novas condições.
                            </p>
                        </section>
                    </div>

                    {/* Bottom Links */}
                    <div className="mt-12 pt-8 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <Link
                            to="/privacidade"
                            className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 font-medium transition-colors"
                        >
                            <Shield className="w-3.5 h-3.5 text-amber-500" />
                            <span>Consultar Política de Privacidade</span>
                            <ExternalLink className="w-3 h-3 text-zinc-400" />
                        </Link>

                        <Link
                            to="/"
                            className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
                        >
                            Voltar para a página inicial
                        </Link>
                    </div>

                </div>
            </main>

            {/* Clean Footer */}
            <footer className="w-full max-w-4xl mx-auto px-6 py-6 text-center text-xs text-zinc-400 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-zinc-200/60">
                <p>&copy; 2026 Brilha Mais</p>
                <div className="flex gap-4">
                    <span className="text-zinc-600 font-medium">Termos de Uso</span>
                    <span>·</span>
                    <Link to="/privacidade" className="hover:text-zinc-600 transition-colors">Privacidade</Link>
                </div>
            </footer>
        </div>
    );
};

export default TermosPage;
