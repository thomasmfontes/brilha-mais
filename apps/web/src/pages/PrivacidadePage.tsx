import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, CheckCircle2, ExternalLink } from 'lucide-react';
import logo from "../assets/logo.png";

const PrivacidadePage: React.FC = () => {
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
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-[11px] font-medium mb-4">
                            <Shield className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Privacidade e Proteção de Dados (LGPD)</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
                            Política de Privacidade
                        </h1>
                        <p className="text-xs text-zinc-400 mt-2">
                            Última atualização: 24 de março de 2026 · Em conformidade com a Lei Geral de Proteção de Dados
                        </p>
                    </div>

                    {/* Content Sections */}
                    <div className="space-y-8 text-sm leading-relaxed text-zinc-600">
                        <section className="space-y-2">
                            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                                <span className="h-5 w-5 rounded-md bg-zinc-100 text-zinc-600 text-xs flex items-center justify-center font-medium">1</span>
                                Coleta e Origem de Dados
                            </h2>
                            <p>
                                Coletamos exclusivamente informações essenciais para a prestação do serviço educacional. Ao autenticar-se por meio do Google ou Microsoft, recebemos apenas seu nome, endereço de e-mail institucional e foto de perfil autorizados por você.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                                <span className="h-5 w-5 rounded-md bg-zinc-100 text-zinc-600 text-xs flex items-center justify-center font-medium">2</span>
                                Finalidade do Tratamento
                            </h2>
                            <p>
                                Seus dados são utilizados estritamente para as seguintes finalidades legítimas:
                            </p>
                            <ul className="space-y-2 pl-2">
                                <li className="flex items-start gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                    <span>Personalizar sua experiência e manter histórico de progresso em aulas e cursos.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                    <span>Corrigir avaliações dissertativas e registrar notas emitidas pelos instrutores.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                    <span>Emitir certificados oficiais de conclusão com chave de validação pública.</span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                    <span>Garantir a integridade, segurança cibernética e autenticidade da conta.</span>
                                </li>
                            </ul>
                        </section>

                        <section className="space-y-2">
                            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                                <span className="h-5 w-5 rounded-md bg-zinc-100 text-zinc-600 text-xs flex items-center justify-center font-medium">3</span>
                                Segurança e Sigilo
                            </h2>
                            <p>
                                Adotamos padrões rigorosos de segurança técnica, incluindo criptografia de dados em trânsito (HTTPS/TLS) e repouso, políticas de controle de acesso restrito e armazenamento seguro. Nós <strong>não vendemos, não alugamos e não compartilhamos</strong> seus dados pessoais com terceiros para fins comerciais.
                            </p>
                        </section>

                        <section className="space-y-2">
                            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                                <span className="h-5 w-5 rounded-md bg-zinc-100 text-zinc-600 text-xs flex items-center justify-center font-medium">4</span>
                                Direitos do Titular (LGPD)
                            </h2>
                            <p>
                                Em consonância com a legislação brasileira, você possui o direito de confirmar a existência de tratamento, solicitar o acesso, correção ou a exclusão definitiva dos seus dados através das configurações de perfil da plataforma ou entrando em contato com a equipe de privacidade.
                            </p>
                        </section>

                        <section className="space-y-2">
                            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                                <span className="h-5 w-5 rounded-md bg-zinc-100 text-zinc-600 text-xs flex items-center justify-center font-medium">5</span>
                                Cookies e Sessão
                            </h2>
                            <p>
                                Utilizamos cookies estritamente necessários para manter sua autenticação ativa durante o uso e registrar suas preferências de interface. Não utilizamos cookies de rastreamento para redes de publicidade de terceiros.
                            </p>
                        </section>

                        <section className="space-y-2">
                            <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                                <span className="h-5 w-5 rounded-md bg-zinc-100 text-zinc-600 text-xs flex items-center justify-center font-medium">6</span>
                                Contato e DPO
                            </h2>
                            <p>
                                Caso tenha quaisquer dúvidas, comentários ou requisições relativas aos seus dados pessoais e a esta Política de Privacidade, envie uma mensagem através do canal de suporte oficial da plataforma.
                            </p>
                        </section>
                    </div>

                    {/* Bottom Links */}
                    <div className="mt-12 pt-8 border-t border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <Link
                            to="/termos"
                            className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 font-medium transition-colors"
                        >
                            <span>Consultar Termos de Uso</span>
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
                    <Link to="/termos" className="hover:text-zinc-600 transition-colors">Termos de Uso</Link>
                    <span>·</span>
                    <span className="text-zinc-600 font-medium">Privacidade</span>
                </div>
            </footer>
        </div>
    );
};

export default PrivacidadePage;
