import { useEffect, useRef, useState } from "react";
import { Check, Copy, Link as LinkIcon, Loader2, MessageCircle } from "lucide-react";
import { useLocation, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { SiteTenantProvider, useSiteTenant } from "@/hooks/use-site-tenant";
import { copyCoachPublicLink, getCoachPublicLink, sendCoachPublicLink } from "@/lib/coach-public-link";

export function LinkDivulgacaoContent() {
  const { tenant, loading, error, reload } = useSiteTenant();
  const { slug } = useParams();
  const { pathname } = useLocation();
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();
  // Use the owner-resolved tenant, exactly like the web panel, never URL/cache slug.
  const link = !loading && !error ? getCoachPublicLink(tenant) : "";

  useEffect(() => {
    setCopied(false);
    return () => { if (resetTimer.current) clearTimeout(resetTimer.current); };
  }, [link]);

  const copy = async () => {
    if (!link) return;
    try {
      await copyCoachPublicLink(link);
      setCopied(true);
      toast.success("Link copiado!");
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Não foi possível copiar", { description: link });
    }
  };

  const send = async () => {
    if (!link || sharing) return;
    setSharing(true);
    try {
      await sendCoachPublicLink(link);
    } catch {
      toast.error("Não foi possível compartilhar. Copie o link e envie pela conversa.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-5 pt-6 pb-24 md:px-8">
      <div className="mx-auto max-w-lg space-y-8">
        <AdminBackButton
          to={pathname.startsWith("/site/admin") ? "/site/admin/dashboard" : `/${slug}/app/controle`}
          showLabel size="sm" className="tracking-normal"
        />
        <header className="space-y-3 border-b border-border pb-6">
          <LinkIcon className="h-8 w-8 text-primary" aria-hidden="true" />
          <h1 className="font-display text-3xl tracking-normal">Link de divulgação</h1>
          {link && <p className="text-sm text-muted-foreground break-words">{tenant?.nome}</p>}
        </header>
        {loading ? (
          <div role="status" className="flex justify-center py-8">
            <Loader2 className="h-7 w-7 animate-spin text-primary" /><span className="sr-only">Carregando link</span>
          </div>
        ) : !link ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Não foi possível carregar o seu link.</p>
            <Button variant="outline" onClick={reload} className="tracking-normal">Tentar novamente</Button>
          </div>
        ) : (
          <section className="space-y-6" aria-label="Link do meu site">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Link do meu site</p>
              <p className="border border-border bg-card p-4 font-mono text-sm break-all select-all">{link}</p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={copy} className="w-full tracking-normal px-3">
                {copied ? <Check /> : <Copy />}{copied ? "Copiado" : "Copiar link"}
              </Button>
              <Button variant="whatsapp" onClick={send} disabled={sharing} className="w-full tracking-normal px-3">
                {sharing ? <Loader2 className="animate-spin" /> : <MessageCircle />}Enviar pelo WhatsApp
              </Button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function LinkDivulgacao() {
  return <SiteTenantProvider><LinkDivulgacaoContent /></SiteTenantProvider>;
}