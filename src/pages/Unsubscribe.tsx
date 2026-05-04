import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Loader2 } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "already" | "invalid" | "submitting" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON } }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setState("invalid");
          setErrorMsg(data?.error ?? "Token inválido.");
          return;
        }
        if (data?.already_unsubscribed || data?.used) {
          setState("already");
        } else {
          setState("valid");
        }
        setEmail(data?.email ?? null);
      } catch (e: any) {
        setState("invalid");
        setErrorMsg(e?.message ?? "Erro ao validar token.");
      }
    })();
  }, [token]);

  const confirm = async () => {
    setState("submitting");
    const { error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    if (error) {
      setState("error");
      setErrorMsg(error.message);
    } else {
      setState("done");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-8"><Logo /></div>
        <div className="bg-background/90 border border-white/10 p-8">
          {state === "loading" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm text-muted-foreground">Validando link…</p>
            </div>
          )}
          {state === "valid" && (
            <>
              <h1 className="text-2xl font-black uppercase mb-3">Cancelar inscrição</h1>
              <p className="text-sm text-muted-foreground mb-6">
                {email ? <>Confirme para parar de receber e-mails em <strong>{email}</strong>.</> : "Confirme para parar de receber e-mails."}
              </p>
              <Button onClick={confirm} className="w-full h-12 font-black uppercase">Confirmar cancelamento</Button>
            </>
          )}
          {state === "submitting" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm text-muted-foreground">Cancelando…</p>
            </div>
          )}
          {state === "done" && (
            <>
              <h1 className="text-2xl font-black uppercase mb-3">Pronto!</h1>
              <p className="text-sm text-muted-foreground">Você não receberá mais nossos e-mails.</p>
            </>
          )}
          {state === "already" && (
            <>
              <h1 className="text-2xl font-black uppercase mb-3">Já cancelado</h1>
              <p className="text-sm text-muted-foreground">Este e-mail já foi removido da nossa lista.</p>
            </>
          )}
          {(state === "invalid" || state === "error") && (
            <>
              <h1 className="text-2xl font-black uppercase mb-3">Link inválido</h1>
              <p className="text-sm text-muted-foreground">{errorMsg || "O link de cancelamento expirou ou é inválido."}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
