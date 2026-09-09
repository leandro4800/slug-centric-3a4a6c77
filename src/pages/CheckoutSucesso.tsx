import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Mail, ArrowRight } from "lucide-react";

const CheckoutSucesso = () => {
  const [params] = useSearchParams();
  const slug = params.get("slug") || "";
  // session_id é lido apenas para registro; não há chamada de API nesta tela.
  // const sessionId = params.get("session_id");
  const loginPath = slug ? `/${slug}/login` : "/login";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-2xl tracking-wider">Pagamento confirmado!</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Seu pagamento foi processado com sucesso. Enviamos um e-mail para que o aluno
            defina a senha de acesso e entre no app.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/30 p-4 flex items-start gap-3 text-left">
          <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Verifique a caixa de entrada (e a de spam) do e-mail cadastrado. Caso não receba
            o link em alguns minutos, entre em contato com o suporte.
          </p>
        </div>

        <Link
          to={loginPath}
          className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-6 py-3 font-display tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Ir para o login
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

export default CheckoutSucesso;
