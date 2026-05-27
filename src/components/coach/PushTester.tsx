import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bell, Loader2, Send } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export const PushTester = () => {
  const { user } = useAuth();
  const { permission, token, enable } = usePushNotifications();
  const [loading, setLoading] = useState(false);

  const testNotification = async () => {
    if (!user) return;
    if (!token) {
      toast.error("Token FCM não encontrado. Tente ativar as notificações primeiro.");
      return;
    }

    setLoading(true);
    try {
      console.log("Iniciando teste de push para token:", token);
      
      const { data, error } = await supabase.functions.invoke("fcm-notifications", {
        body: {
          user_id: user.id,
          title: "Teste de Notificação 🔔",
          body: "Esta é uma notificação de teste enviada do seu painel.",
          data: {
            test: "true",
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) throw error;

      toast.success("Comando de push enviado com sucesso!");
      console.log("Resultado do push:", data);
    } catch (err: any) {
      console.error("Erro no teste de push:", err);
      toast.error("Erro ao enviar push", {
        description: err.message || "Verifique os logs da Edge Function."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border/40 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-bold">Testar Notificação Push</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Use esta ferramenta para validar se as notificações estão chegando corretamente no seu dispositivo.
      </p>

      <div className="flex flex-wrap gap-3">
        {permission !== "granted" ? (
          <Button onClick={() => enable()} variant="outline" className="gap-2">
            <Bell className="h-4 w-4" />
            Ativar Notificações neste Dispositivo
          </Button>
        ) : (
          <Button 
            onClick={testNotification} 
            disabled={loading || !token}
            className="gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar Notificação de Teste
          </Button>
        )}
      </div>

      {token && (
        <div className="mt-4 p-3 bg-muted rounded-lg overflow-hidden">
          <p className="text-[10px] font-mono break-all opacity-50">
            <strong>FCM Token:</strong> {token}
          </p>
        </div>
      )}
    </div>
  );
};
