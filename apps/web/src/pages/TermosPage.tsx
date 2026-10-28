import React from 'react';
import LegalLayout from '../components/LegalLayout';
import { ShieldCheck, Info } from 'lucide-react';

const toc = [
    { id: 'aceitacao', label: 'Aceitação dos Termos' },
    { id: 'servico', label: 'Descrição do Serviço' },
    { id: 'contas', label: 'Contas de Usuário e Autenticação' },
    { id: 'propriedade', label: 'Propriedade Intelectual' },
    { id: 'responsabilidade', label: 'Limitação de Responsabilidade' },
    { id: 'alteracoes', label: 'Alterações nos Termos' },
];

const TermosPage: React.FC = () => {
    return (
        <LegalLayout
            title="Termos de Uso"
            subtitle="Condições gerais para acesso, navegação e utilização da plataforma educacional e cursos do Brilha Mais."
            lastUpdated="24 de março de 2026"
            version="2.1"
            activeTab="termos"
            toc={toc}
        >
            {/* Quick Summary Notice */}
            <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-4 sm:p-5 mb-8 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-900 leading-relaxed">
                    <p className="font-semibold text-amber-950 mb-1">Resumo em linguagem simples</p>
                    <p>
                        Ao utilizar o Brilha Mais, você concorda em respeitar os direitos autorais dos conteúdos, manter suas credenciais de acesso seguras e utilizar a plataforma para fins legítimos de estudo e capacitação.
                    </p>
                </div>
            </div>

            <div className="space-y-10 text-sm leading-relaxed text-zinc-600">
                <section id="aceitacao" className="scroll-mt-32 space-y-3">
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-950 flex items-center gap-2.5 border-b border-zinc-100 pb-2">
                        <span className="h-6 w-6 rounded-md bg-zinc-100 text-zinc-700 text-xs flex items-center justify-center font-mono font-medium">01</span>
                        Aceitação dos Termos
                    </h2>
                    <p>
                        Ao acessar, navegar ou utilizar a plataforma Brilha Mais, você expressamente declara ter lido, compreendido e concordado integralmente com todos os termos, condições e diretrizes aqui estipulados.
                    </p>
                    <p>
                        Caso discorde de qualquer disposição deste termo, recomendamos que interrompa imediatamente o uso dos serviços e recursos oferecidos pela plataforma.
                    </p>
                </section>

                <section id="servico" className="scroll-mt-32 space-y-3">
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-950 flex items-center gap-2.5 border-b border-zinc-100 pb-2">
                        <span className="h-6 w-6 rounded-md bg-zinc-100 text-zinc-700 text-xs flex items-center justify-center font-mono font-medium">02</span>
                        Descrição do Serviço
                    </h2>
                    <p>
                        O Brilha Mais é uma plataforma de aprendizado (LMS - Learning Management System) voltada ao desenvolvimento educacional e profissional. Nossos serviços englobam:
                    </p>
                    <ul className="space-y-2 pl-4 list-disc marker:text-amber-500">
                        <li>Acesso a videoaulas dinâmicas e materiais didáticos em PDF;</li>
                        <li>Quizzes de fixação com resolução orientada;</li>
                        <li>Desafios dissertativos submetidos para correção e nota de instrutores;</li>
                        <li>Emissão de certificados oficiais de conclusão com chave criptográfica pública de verificação.</li>
                    </ul>
                </section>

                <section id="contas" className="scroll-mt-32 space-y-3">
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-950 flex items-center gap-2.5 border-b border-zinc-100 pb-2">
                        <span className="h-6 w-6 rounded-md bg-zinc-100 text-zinc-700 text-xs flex items-center justify-center font-mono font-medium">03</span>
                        Contas de Usuário e Autenticação
                    </h2>
                    <p>
                        Para acompanhar o progresso dos cursos e registrar submissões de avaliações, o usuário deve autenticar-se exclusivamente por provedores institucionais e federados autorizados (Google, Microsoft ou Biometria FIDO2/Passkey).
                    </p>
                    <p>
                        A conta é de uso pessoal e intransferível. O titular é inteiramente responsável por manter o sigilo de seus acessos e dispositivos autenticados.
                    </p>
                </section>

                <section id="propriedade" className="scroll-mt-32 space-y-3">
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-950 flex items-center gap-2.5 border-b border-zinc-100 pb-2">
                        <span className="h-6 w-6 rounded-md bg-zinc-100 text-zinc-700 text-xs flex items-center justify-center font-mono font-medium">04</span>
                        Propriedade Intelectual
                    </h2>
                    <p>
                        Todos os materiais, gravações, apostilas, códigos, marcas e logotipos veiculados no Brilha Mais pertencem exclusivamente ao Brilha Mais ou aos seus respectivos licenciantes.
                    </p>
                    <p>
                        É estritamente vedada a reprodução, distribuição comercial, gravação de tela, engenharia reversa ou qualquer outro ato que viole os direitos de propriedade intelectual da plataforma.
                    </p>
                </section>

                <section id="responsabilidade" className="scroll-mt-32 space-y-3">
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-950 flex items-center gap-2.5 border-b border-zinc-100 pb-2">
                        <span className="h-6 w-6 rounded-md bg-zinc-100 text-zinc-700 text-xs flex items-center justify-center font-mono font-medium">05</span>
                        Limitação de Responsabilidade
                    </h2>
                    <p>
                        Operamos com altos padrões de segurança e estabilidade, visando garantir disponibilidade ininterrupta dos serviços. Contudo, não seremos responsabilizados por instabilidades originadas em redes públicas de telecomunicações, ataques cibernéticos externos de grande porte ou períodos de manutenção técnica programada.
                    </p>
                </section>

                <section id="alteracoes" className="scroll-mt-32 space-y-3">
                    <h2 className="text-base sm:text-lg font-semibold text-zinc-950 flex items-center gap-2.5 border-b border-zinc-100 pb-2">
                        <span className="h-6 w-6 rounded-md bg-zinc-100 text-zinc-700 text-xs flex items-center justify-center font-mono font-medium">06</span>
                        Alterações nos Termos
                    </h2>
                    <p>
                        Poderemos revisar e atualizar estes Termos de Uso a qualquer momento para refletir novas funcionalidades da plataforma ou exigências regulatórias. Notificações sobre alterações relevantes serão informadas nos canais oficiais da plataforma.
                    </p>
                </section>
            </div>
        </LegalLayout>
    );
};

export default TermosPage;
