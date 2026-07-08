import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MessageCircle, Shield, HelpCircle, Clock } from "lucide-react";

const Suporte = () => {
  const EMAIL = "alphacoachapp@gmail.com";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
          <Link to="/" className="p-2 -ml-2 rounded-md hover:bg-secondary transition-colors" aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-lg tracking-widest">SUPORTE</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-primary font-bold">Central de ajuda AlphaCoach</p>
          <p>
            Precisa de ajuda com o AlphaCoach? Nossa equipe responde dúvidas sobre acesso, treinos,
            dietas, pagamentos, exclusão de conta e problemas técnicos.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-secondary/30 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-base text-foreground tracking-wider">Fale conosco</h2>
              <p className="text-xs">Respondemos em até 48 horas úteis.</p>
            </div>
          </div>
          <a
            href={`mailto:${EMAIL}?subject=Suporte%20AlphaCoach`}
            className="inline-flex items-center gap-2 text-primary font-bold underline underline-offset-4 break-all"
          >
            {EMAIL}
          </a>
          <p className="flex items-center gap-2 text-xs">
            <Clock className="h-3.5 w-3.5" /> Atendimento de segunda a sexta, das 9h às 18h (horário de Brasília).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-base text-foreground tracking-wider flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" /> Perguntas frequentes
          </h2>

          <div className="space-y-3">
            <div className="rounded-xl border border-border/60 p-4">
              <h3 className="font-semibold text-foreground mb-1">Esqueci minha senha</h3>
              <p>
                Na tela de login, toque em "Esqueci a senha" e siga as instruções enviadas para seu
                e-mail. Se não receber o e-mail em alguns minutos, verifique a caixa de spam.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 p-4">
              <h3 className="font-semibold text-foreground mb-1">Como funciona o treino e a dieta?</h3>
              <p>
                Seu coach monta seu plano com apoio da IA. Após publicado, ele fica disponível nas
                telas "Treino" e "Dieta" do app. Ajustes são feitos pelo seu coach.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 p-4">
              <h3 className="font-semibold text-foreground mb-1">Problemas com a conta</h3>
              <p>
                Não consegue entrar, e-mail não confirmado, dados desatualizados ou conta duplicada?
                Envie um e-mail para{" "}
                <a href={`mailto:${EMAIL}?subject=Problema%20com%20a%20conta`} className="text-primary underline">{EMAIL}</a>{" "}
                a partir do endereço cadastrado e nossa equipe resolve para você.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 p-4">
              <h3 className="font-semibold text-foreground mb-1">Como excluir minha conta e meus dados?</h3>
              <p>
                Envie um e-mail para <a href={`mailto:${EMAIL}?subject=Exclus%C3%A3o%20de%20conta`} className="text-primary underline">{EMAIL}</a> {" "}
                com o assunto "Exclusão de conta" a partir do endereço cadastrado. Concluímos a
                exclusão em até 7 dias úteis.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 p-4">
              <h3 className="font-semibold text-foreground mb-1">Problemas técnicos ou bugs</h3>
              <p>
                Descreva o problema, envie prints se possível e informe o modelo do aparelho e a
                versão do sistema. Isso acelera muito a resolução.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base text-foreground tracking-wider flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Privacidade e segurança
          </h2>
          <p>
            Consulte nossa{" "}
            <Link to="/politica-de-privacidade" className="text-primary underline">
              Política de Privacidade
            </Link>{" "}
            para saber como tratamos seus dados. Para solicitações relacionadas à LGPD (acesso,
            correção, portabilidade ou exclusão), utilize o mesmo e-mail de suporte.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-base text-foreground tracking-wider flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" /> Sugestões e feedback
          </h2>
          <p>
            Sua opinião ajuda a melhorar o AlphaCoach. Envie ideias, elogios ou críticas para{" "}
            <a href={`mailto:${EMAIL}?subject=Feedback`} className="text-primary underline">{EMAIL}</a>.
          </p>
        </section>

        <footer className="pt-4 border-t border-border/40 text-xs">
          <p>AlphaCoach — Suporte oficial. Última atualização: 08 de julho de 2026.</p>
        </footer>
      </main>
    </div>
  );
};

export default Suporte;
