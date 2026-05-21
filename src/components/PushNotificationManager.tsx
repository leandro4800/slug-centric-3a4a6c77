import { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useAuth } from '@/hooks/use-auth';

const PushNotificationManager = () => {
  const { initPushNotifications } = usePushNotifications();
  const { user } = useAuth();
  
  const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  useEffect(() => {
    // Só tenta inicializar se o usuário estiver logado e houver uma VAPID KEY
    if (user && VAPID_KEY) {
      initPushNotifications(VAPID_KEY);
    }
  }, [user, VAPID_KEY]);

  return null;
};

export default PushNotificationManager;
