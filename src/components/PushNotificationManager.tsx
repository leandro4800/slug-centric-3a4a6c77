import { useEffect } from 'react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useAuth } from '@/hooks/use-auth';
import { FIREBASE_VAPID_KEY } from '@/lib/firebase';

const PushNotificationManager = () => {
  const { initPushNotifications } = usePushNotifications();
  const { user } = useAuth();

  useEffect(() => {
    if (user && FIREBASE_VAPID_KEY) {
      initPushNotifications(FIREBASE_VAPID_KEY);
    }
  }, [user]);

  return null;
};

export default PushNotificationManager;
