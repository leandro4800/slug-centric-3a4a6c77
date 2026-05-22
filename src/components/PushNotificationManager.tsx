import { useEffect } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useAuth } from "@/hooks/use-auth";

/**
 * Atualiza silenciosamente o push token se o usuário já permitiu notificações.
 * NÃO solicita permissão automaticamente (precisa de gesto do usuário no iOS).
 * Use o botão "Ativar notificações" no perfil para o primeiro opt-in.
 */
const PushNotificationManager = () => {
  const { permission } = usePushNotifications();
  const { user } = useAuth();

  useEffect(() => {
    // Apenas log para debug — a ativação real fica em um botão visível ao usuário
    if (user) {
      console.log("[push] permissão atual:", permission);
    }
  }, [user, permission]);

  return null;
};

export default PushNotificationManager;
