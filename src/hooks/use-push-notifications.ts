import { useState, useEffect } from 'react';
import { messaging, requestForToken, onMessageListener } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePushNotifications = () => {
  const [token, setToken] = useState<string | null>(null);
  const { toast } = useToast();

  const saveTokenToSupabase = async (newToken: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('perfis')
        .update({ push_token: newToken })
        .eq('id', user.id);

      if (error) throw error;
      
      console.log('Token salvo com sucesso no Supabase');
    } catch (error) {
      console.error('Erro ao salvar token no Supabase:', error);
    }
  };

  const initPushNotifications = async (vapidKey: string) => {
    const pushToken = await requestForToken(vapidKey);
    if (pushToken) {
      setToken(pushToken);
      await saveTokenToSupabase(pushToken);
    }
  };

  useEffect(() => {
    onMessageListener()
      .then((payload: any) => {
        console.log('Mensagem recebida em primeiro plano:', payload);
        toast({
          title: payload.notification?.title || 'Nova notificação',
          description: payload.notification?.body || '',
        });
      })
      .catch((err) => console.log('Erro no listener de mensagens:', err));
  }, [toast]);

  return { token, initPushNotifications };
};
