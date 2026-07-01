import { useEffect, useState } from "react";
import { Bell, BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { toast } from "sonner";

/**
 * Banner visível que solicita permissão de notificação via gesto direto do usuário.
 * Obrigatório para iOS PWA e maioria dos navegadores mobile, que bloqueiam
 * Notification.requestPermission() fora de um clique/toque.
 *
 * Fallback: se o servidor FCM falhar, dispara uma notificação local para
 * confirmar se o navegador aceita comandos de alerta.
 */
const DISMISS_KEY = "push-banner-dismissed-at";

const EnablePushBanner = () => {
  const { permission, enable, token } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem(DISMISS_KEY);
    if (v && Date.now() - Number(v) < 1000 * 60 * 60 * 24 * 3) {
      setDismissed(true);
    }
  }, []);

  // Já permitido e token salvo: não mostra
  if (permission === "granted" && token) return null;
  if (permission === "unsupported") return null;
  if (permission === "denied") return null;
  if (dismissed) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await enable(false);
      if (!result.ok) {
        // Fallback local — confirma se o navegador aceita alertas
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification("Teste", { body: "Funciona localmente!" });
          } catch {
            /* iOS Safari não suporta Notification() direto */
          }
        }
      } else {
        toast.success("Dispositivo registrado com sucesso!");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent p-4 mb-4">
      <button
        onClick={handleDismiss}
        aria-label="Fechar"
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="shrink-0 w-10 h-10 rounded-full bg-primary/20 grid place-items-center">
          <BellRing className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Ative as notificações no celular</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Receba lembretes de treino, refeições e novidades direto no seu aparelho.
          </p>
          <Button
            size="sm"
            onClick={handleClick}
            disabled={loading}
            className="mt-3 gap-2 text-xs"
          >
            <Bell className="h-3.5 w-3.5" />
            {loading ? "Ativando..." : "Ativar Notificações"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EnablePushBanner;