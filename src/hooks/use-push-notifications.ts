import { useState, useEffect, useCallback } from "react";
import { requestForToken, onMessageListener, FIREBASE_VAPID_KEY } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const usePushNotifications = () => {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );

  const saveTokenToSupabase = async (newToken: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("perfis")
      .update({ push_token: newToken })
      .eq("id", user.id);
    if (error) console.error("Erro ao salvar token:", error);
  };

  const enable = useCallback(async (silent = false) => {
    const result = await requestForToken(FIREBASE_VAPID_KEY);
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
    if (result.token) {
      setToken(result.token);
      await saveTokenToSupabase(result.token);
      if (!silent) toast.success("Notificações ativadas! 🔔");
      return { ok: true as const };
    }
    if (!silent) {
      toast.error(`Não foi possível ativar notificações`, {
        description: result.reason || "Verifique as permissões do seu navegador/aparelho.",
      });
    }
    return { ok: false as const, reason: result.reason };
  }, []);

  // Auto-ativa SE o usuário já concedeu permissão antes (apenas atualiza token)
  useEffect(() => {
    if (permission === "granted") {
      void enable(true);
    }
  }, [permission, enable]);

  // Listener de mensagens em primeiro plano
  useEffect(() => {
    onMessageListener()
      .then((payload: any) => {
        toast(payload?.notification?.title || "Nova notificação", {
          description: payload?.notification?.body || "",
        });
      })
      .catch(() => {});
  }, []);

  return { token, permission, enable };
};
