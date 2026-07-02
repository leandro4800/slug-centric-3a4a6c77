import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PoliticaPrivacidade = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
          <Link to="/" className="p-2 -ml-2 rounded-md hover:bg-secondary transition-colors" aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-lg tracking-widest">POLÍTICA DE PRIVACIDADE</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p className="text-xs uppercase tracking-widest text-primary font-bold">
          Última atualização: 02 de julho de 2026
        </p>

        <section className="space-y-2">
          <p>
            Esta Política de Privacidade descreve como o AlphaCoach ("nós", "aplicativo" ou
            "plataforma") coleta, usa, armazena e protege as informações pessoais dos usuários
            ("você", "aluno" ou "coach") que utilizam nossos serviços.
          </p>
          <p>
            Ao utilizar o AlphaCoach, você concorda com as práticas descritas neste documento.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base text-foreground tracking-wider">1. Informações que coletamos</h2>
<ul className="list-disc pl-5 space-y-1">
            <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone, data de nascimento.</li>
            <li><strong>Dados de saúde e treino:</strong> anamnese, medidas corporais, avaliações físicas, treinos e dietas.</li>
            <li><strong>Dados de uso:</strong> páginas visitadas, ações realizadas no app e dispositivos utilizados.</li>
            <li><strong>Fotos e mídias:</strong> quando enviadas voluntariamente por você para acompanhamento de evolução.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base text-foreground tracking-wider">2. Como usamos suas informações</h2>
<ul className="list-disc pl-5 space-y-1">
            <li>Personalizar treinos, dietas e acompanhamento com seu coach.</li>
            <li>Enviar notificações relevantes (lembretes, mensagens do coach).</li>
            <li>Melhorar continuamente a plataforma e a experiência do usuário.</li>
            <li>Cumprir obrigações legais e regulatórias.</li>
          </ul>
        </section>

<section className="space-y-2">
          <h2 className="font-display text-base text-foreground tracking-wider">3. Compartilhamento de dados</h2>
          <p>
            Seus dados são compartilhados apenas com o coach responsável pelo seu acompanhamento
            e com prestadores de serviço essenciais (hospedagem, envio de e-mail).
            Não vendemos seus dados a terceiros.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base text-foreground tracking-wider">4. Armazenamento e segurança</h2>
          <p>
            Utilizamos infraestrutura em nuvem com criptografia em trânsito (HTTPS) e políticas
            de acesso restrito (Row Level Security). Apenas você e seu coach têm acesso aos seus
            dados de treino e saúde.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base text-foreground tracking-wider">5. Seus direitos (LGPD)</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Acessar, corrigir ou atualizar seus dados pessoais.</li>
            <li>Solicitar a exclusão da sua conta e dados a qualquer momento pelo botão "Excluir Conta" na tela de Perfil.</li>
            <li>Revogar consentimentos previamente concedidos.</li>
            <li>Solicitar a portabilidade dos seus dados.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base text-foreground tracking-wider">6. Retenção</h2>
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Após a exclusão da conta, os
            dados são removidos em até 30 dias, exceto quando a retenção for exigida por lei.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base text-foreground tracking-wider">7. Cookies</h2>
          <p>
            Usamos cookies e tecnologias similares para manter sua sessão ativa e melhorar a
            experiência. Você pode desativá-los nas configurações do navegador.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base text-foreground tracking-wider">8. Menores de idade</h2>
          <p>
            O AlphaCoach não é destinado a menores de 16 anos sem consentimento dos pais ou
            responsáveis legais.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base text-foreground tracking-wider">9. Alterações nesta política</h2>
          <p>
            Podemos atualizar esta política periodicamente. Alterações significativas serão
            comunicadas por e-mail ou dentro do aplicativo.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base text-foreground tracking-wider">10. Contato</h2>
          <p>
            Para dúvidas, solicitações ou reclamações sobre privacidade, entre em contato pelo
            e-mail: <a href="mailto:contato@alpha-coach.app" className="text-primary hover:underline">contato@alpha-coach.app</a>
          </p>
        </section>

        <div className="pt-6 border-t border-border/40">
          <Link to="/" className="text-primary hover:underline text-sm">← Voltar para o início</Link>
        </div>
      </main>
    </div>
  );
};

export default PoliticaPrivacidade;
