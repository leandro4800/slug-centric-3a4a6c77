import { useState, useEffect, useCallback } from "react";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { Capacitor } from "@capacitor/core";
import { requestForToken, onMessageListener, FIREBASE_VAPID_KEY } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp } from "@/lib/native-platform";
import { toast } from "sonner";

type PushPermission = NotificationPermission | "unsupported" | "prompt";

const ANDROID_CHANNEL_ID = "default";

/** Android 8+: sem channel criado, FCM "sucesso" mas a notificação não aparece. */
const ensureAndroidChannel = async () => {
  if (Capacitor.getPlatform() !== "android") return;
  try {
    await FirebaseMessaging.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: "Geral",
      description: "Treinos, dieta e avisos do coach",
      importance: 5,
      sound: "default",
      vibration: true,
      lights: true,
      lightColor: "#FF0000",
      visibility: 1,
    });
  } catch (err) {
    console.warn("[push] createChannel", err);
  }
};

const saveTokenToSupabase = async (newToken: string): Promise<{ ok: boolean; reason?: string }> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "Usuário não autenticado" };
  const { error } = await supabase
    .from("perfis")
    .update({ push_token: newToken })
    .eq("id", user.id);
  if (error) {
    console.error("Erro ao salvar token:", error);
    return { ok: false, reason: error.message };
  }

  // O mesmo aparelho pode ter sido usado por outra conta: garante que o token
  // fique só no perfil logado, evitando envios para o destino errado.
  await supabase
    .from("perfis")
    .update({ push_token: null })
    .eq("push_token", newToken)
    .neq("id", user.id);

  return { ok: true };
};

const enableNative = async (): Promise<{ token: string | null; reason?: string; permission: PushPermission }> => {
  try {
    await ensureAndroidChannel();
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
      const saved = await saveTokenToSupabase(result.token);
      if (!saved.ok) {
        if (!silent) {
          toast.error("Token obtido, mas não salvou no perfil", {
            description: saved.reason || "Sem push_token no servidor o coach não consegue te notificar.",
          });
        }
        return { ok: false as const, reason: saved.reason || "falha ao salvar push_token" };
      }
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
      void saveTokenToSupabase(next).then((saved) => {
        if (!saved.ok) console.error("[push] tokenReceived save failed:", saved.reason);
      });
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
