import React from 'react';
import { Link } from 'react-router-dom';
import logo from "../assets/logo.png";

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img src={logo} alt="Brilha Mais" className="h-12 w-auto" />
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-8 text-center">Política de Privacidade</h1>
        
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Coleta de Informações</h2>
            <p>
              Coletamos informações básicas quando você se registra, como nome, e-mail e foto de perfil. Ao usar o login social (Google/Microsoft), recebemos apenas os dados autorizados por você nesses provedores para criar sua conta em nossa plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Uso das Informações</h2>
            <p>
              As informações coletadas são usadas exclusivamente para:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Personalizar sua experiência na plataforma.</li>
              <li>Gerenciar seu progresso em cursos e emitir certificados.</li>
              <li>Enviar comunicações importantes sobre sua conta.</li>
              <li>Garantir a segurança e integridade do sistema.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Proteção de Dados</h2>
            <p>
              Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados pessoais contra acesso não autorizado, alteração ou destruição. Não vendemos seus dados para terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Seus Direitos</h2>
            <p>
              Você tem o direito de acessar, corrigir ou excluir seus dados pessoais a qualquer momento através das configurações de sua conta ou entrando em contato com nosso suporte.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Cookies</h2>
            <p>
              Usamos cookies e tecnologias semelhantes para manter sua sessão ativa e entender como você interage com nossa plataforma, visando melhorias contínuas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Contato</h2>
            <p>
              Se você tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco através do e-mail de suporte disponível na plataforma.
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

export default PrivacyPage;
