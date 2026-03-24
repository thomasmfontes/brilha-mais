import React from 'react';
import { Link } from 'react-router-dom';
import logo from "../assets/logo.png";

const TermosPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img src={logo} alt="Brilha Mais" className="h-12 w-auto" />
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-8 text-center">Termos de Uso</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e usar a plataforma Brilha Mais, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá acessar o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Descrição do Serviço</h2>
            <p>
              O Brilha Mais é uma plataforma de aprendizado (LMS) que oferece cursos, materiais e certificados. O acesso pode ser feito via login social (Google e Microsoft) para facilitar a experiência do usuário.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Contas de Usuário</h2>
            <p>
              Para acessar certas funcionalidades, você deve se registrar. Você é responsável por manter a confidencialidade de sua conta e senha. O uso de IDs do Google ou Microsoft transfere a responsabilidade de autenticação para esses provedores, mas o uso da nossa plataforma continua sujeito a estes termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo disponível no Brilha Mais, incluindo textos, gráficos, logotipos, ícones e vídeos, é de propriedade exclusiva do Brilha Mais ou de seus licenciadores e está protegido por leis de direitos autorais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Limitação de Responsabilidade</h2>
            <p>
              O Brilha Mais não garante que o serviço será ininterrupto ou livre de erros. Em nenhuma circunstância seremos responsáveis por quaisquer danos diretos, indiretos ou consequentes resultantes do uso ou da incapacidade de usar o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Alterações nos Termos</h2>
            <p>
              Reservamo-nos o direito de modificar estes termos a qualquer momento. O uso continuado da plataforma após tais alterações constitui sua aceitação dos novos Termos de Uso.
            </p>
          </section>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border text-center">
          <Link to="/" className="text-primary hover:underline font-medium">
            Voltar para o Início
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TermosPage;
