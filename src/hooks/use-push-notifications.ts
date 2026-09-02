import { useState, useEffect, useCallback } from "react";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { requestForToken, onMessageListener, FIREBASE_VAPID_KEY } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp } from "@/lib/native-platform";
import { toast } from "sonner";

type PushPermission = NotificationPermission | "unsupported" | "prompt";

const saveTokenToSupabase = async (newToken: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from("perfis")
    .update({ push_token: newToken })
    .eq("id", user.id);
  if (error) console.error("Erro ao salvar token:", error);
};

const enableNative = async (): Promise<{ token: string | null; reason?: string; permission: PushPermission }> => {
  try {
    const perm = await FirebaseMessaging.requestPermissions();
    const receive = perm.receive as PushPermission;
    if (receive !== "granted") {
      return { token: null, reason: `Permissão ${receive}`, permission: receive };
    }

    const { token } = await FirebaseMessaging.getToken();
    if (!token) {
      return { token: null, reason: "Token FCM nativo vazio", permission: "granted" };
    }
    return { token, permission: "granted" };
  } catch (err: any) {
    console.error("[push] native enable", err);
    return {
      token: null,
      reason: err?.message || String(err),
      permission: "unsupported",
    };
  }
};

const enableWeb = async (): Promise<{ token: string | null; reason?: string; permission: PushPermission }> => {
  const result = await requestForToken(FIREBASE_VAPID_KEY);
  const permission: PushPermission =
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported";
  return { ...result, permission };
};

export const usePushNotifications = () => {
  const native = isNativeApp();
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<PushPermission>(() => {
    if (native) return "prompt";
    if (typeof window !== "undefined" && "Notification" in window) return Notification.permission;
    return "unsupported";
  });

  const enable = useCallback(async (silent = false) => {
    const result = native ? await enableNative() : await enableWeb();
    setPermission(result.permission);

    if (result.token) {
      setToken(result.token);
      await saveTokenToSupabase(result.token);
      if (!silent) toast.success("Notificações ativadas! 🔔");
      return { ok: true as const };
    }

    if (!silent) {
      toast.error("Não foi possível ativar notificações", {
        description: result.reason || "Verifique as permissões do seu navegador/aparelho.",
      });
    }
    return { ok: false as const, reason: result.reason };
  }, [native]);

  useEffect(() => {
    if (!native) return;

    let cancelled = false;
    (async () => {
      try {
        const perm = await FirebaseMessaging.checkPermissions();
        if (cancelled) return;
        setPermission(perm.receive as PushPermission);
        if (perm.receive === "granted") {
          void enable(true);
        }
      } catch {
        /* plugin indisponível */
      }
    })();

    const tokenSub = FirebaseMessaging.addListener("tokenReceived", ({ token: next }) => {
      setToken(next);
      void saveTokenToSupabase(next);
    });

    const msgSub = FirebaseMessaging.addListener("notificationReceived", (event) => {
      toast(event.notification?.title || "Nova notificação", {
        description: event.notification?.body || "",
      });
    });

    return () => {
      cancelled = true;
      void tokenSub.then((h) => h.remove());
      void msgSub.then((h) => h.remove());
    };
  }, [native, enable]);

  useEffect(() => {
    if (native) return;
    if (permission === "granted") {
      void enable(true);
    }
  }, [native, permission, enable]);

  useEffect(() => {
    if (native) return;
    onMessageListener()
      .then((payload: any) => {
        toast(payload?.notification?.title || "Nova notificação", {
          description: payload?.notification?.body || "",
        });
      })
      .catch(() => {});
  }, [native]);

  return { token, permission, enable };
};
