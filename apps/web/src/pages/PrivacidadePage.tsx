import React from 'react';
import LegalLayout from '../components/LegalLayout';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

const toc = [
    { id: 'coleta', label: 'Coleta e Origem de Dados' },
    { id: 'finalidade', label: 'Finalidade do Tratamento' },
    { id: 'seguranca', label: 'Segurança e Sigilo de Dados' },
    { id: 'direitos', label: 'Direitos do Titular (LGPD)' },
    { id: 'cookies', label: 'Cookies e Armazenamento Local' },
    { id: 'contato', label: 'Contato e Encarregado (DPO)' },
];

const PrivacidadePage: React.FC = () => {
    return (
        <LegalLayout
            title="Política de Privacidade"
            subtitle="Nosso compromisso com a proteção, sigilo e transparência no tratamento dos seus dados pessoais em total conformidade com a LGPD."
            lastUpdated="24 de março de 2026"
            version="2.1"
            activeTab="privacidade"
            toc={toc}
        >
            {/* LGPD Compliance Badge Callout */}
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 sm:p-5 mb-8 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="text-xs text-emerald-950 leading-relaxed">
                    <p className="font-semibold text-emerald-900 mb-1">Privacidade em primeiro lugar (LGPD)</p>
                    <p>
                        Seus dados são tratados exclusivamente para viabilizar seu aprendizado e emissão de certificados. Nós <strong>não vendemos, não alugamos e não compartilhamos</strong> suas informações pessoais com terceiros para fins publicitários.
                    </p>
                </div>
            </div>

            <div className="space-y-10 text-sm leading-relaxed text-zinc-600">
                <section id="coleta" className="scroll-mt-32 space-y-3">
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-950 flex items-center gap-2.5 border-b border-zinc-100 pb-2">
                        <span className="h-6 w-6 rounded-md bg-zinc-100 text-zinc-700 text-xs flex items-center justify-center font-mono font-medium">01</span>
                        Coleta e Origem de Dados
                    </h2>
                    <p>
                        Coletamos tão somente os dados estritamente necessários para a correta identificação do estudante e registro de seu histórico educacional.
                    </p>
                    <p>
                        Ao efetuar o login institucional com Google ou Microsoft, recebemos exclusivamente:
                    </p>
                    <ul className="space-y-1.5 pl-4 list-disc marker:text-amber-500">
                        <li>Nome completo para emissão do certificado;</li>
                        <li>Endereço de e-mail institucional para comunicação e recuperação de acesso;</li>
                        <li>Foto de perfil pública (opcional, para personalização visual).</li>
                    </ul>
                </section>

                <section id="finalidade" className="scroll-mt-32 space-y-3">
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-950 flex items-center gap-2.5 border-b border-zinc-100 pb-2">
                        <span className="h-6 w-6 rounded-md bg-zinc-100 text-zinc-700 text-xs flex items-center justify-center font-mono font-medium">02</span>
                        Finalidade do Tratamento
                    </h2>
                    <p>
                        Os dados coletados são tratados exclusivamente com base nas hipóteses legais da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), para:
                    </p>
                    <div className="grid gap-2.5 pt-1">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            <span className="text-xs text-zinc-700">Manutenção do progresso acadêmico em videoaulas, quizzes e materiais.</span>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            <span className="text-xs text-zinc-700">Avaliação pedagógica de desafios dissertativos por instrutores responsáveis.</span>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            <span className="text-xs text-zinc-700">Emissão de certificados oficiais com chave de verificação pública de autenticidade.</span>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            <span className="text-xs text-zinc-700">Garantia da segurança cibernética e prevenção contra fraudes em avaliações.</span>
                        </div>
                    </div>
                </section>

                <section id="seguranca" className="scroll-mt-32 space-y-3">
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-950 flex items-center gap-2.5 border-b border-zinc-100 pb-2">
                        <span className="h-6 w-6 rounded-md bg-zinc-100 text-zinc-700 text-xs flex items-center justify-center font-mono font-medium">03</span>
                        Segurança e Sigilo de Dados
                    </h2>
                    <p>
                        Aplicamos práticas técnicas alinhadas aos mais altos padrões do setor:
                    </p>
                    <ul className="space-y-1.5 pl-4 list-disc marker:text-amber-500">
                        <li>Criptografia completa em trânsito com protocolos modernos TLS 1.3;</li>
                        <li>Controle restrito de acessos baseado em privilégios mínimos (Least Privilege);</li>
                        <li>Autenticação sem senhas (Passkey FIDO2) para eliminar riscos de sequestro de credenciais.</li>
                    </ul>
                </section>

                <section id="direitos" className="scroll-mt-32 space-y-3">
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-950 flex items-center gap-2.5 border-b border-zinc-100 pb-2">
                        <span className="h-6 w-6 rounded-md bg-zinc-100 text-zinc-700 text-xs flex items-center justify-center font-mono font-medium">04</span>
                        Direitos do Titular (LGPD)
                    </h2>
                    <p>
                        Em conformidade com o Artigo 18 da LGPD, você possui a qualquer momento o direito de:
                    </p>
                    <ul className="space-y-1.5 pl-4 list-disc marker:text-amber-500">
                        <li>Confirmar a existência e requerer acesso aos seus dados;</li>
                        <li>Solicitar a correção de dados incompletos ou inexatos;</li>
                        <li>Requerer a anonimização, bloqueio ou eliminação de dados excessivos;</li>
                        <li>Solicitar a portabilidade ou revogar consentimentos previamente concedidos.</li>
                    </ul>
                </section>

                <section id="cookies" className="scroll-mt-32 space-y-3">
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-950 flex items-center gap-2.5 border-b border-zinc-100 pb-2">
                        <span className="h-6 w-6 rounded-md bg-zinc-100 text-zinc-700 text-xs flex items-center justify-center font-mono font-medium">05</span>
                        Cookies e Armazenamento Local
                    </h2>
                    <p>
                        Utilizamos somente cookies e tokens de sessão estritamente funcionais, destinados a manter sua sessão autenticada com segurança e persistir preferências de navegação. Não utilizamos rastreadores para redes de anúncios nem pixels de terceiros.
                    </p>
                </section>

                <section id="contato" className="scroll-mt-32 space-y-3">
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-950 flex items-center gap-2.5 border-b border-zinc-100 pb-2">
                        <span className="h-6 w-6 rounded-md bg-zinc-100 text-zinc-700 text-xs flex items-center justify-center font-mono font-medium">06</span>
                        Contato e Encarregado (DPO)
                    </h2>
                    <p>
                        Para exercer seus direitos de titular ou sanar qualquer dúvida referente a esta política, entre em contato diretamente com o nosso Encarregado pelo Tratamento de Dados Pessoais (DPO) através dos canais de suporte da plataforma.
                    </p>
                </section>
            </div>
        </LegalLayout>
    );
};

export default PrivacidadePage;
