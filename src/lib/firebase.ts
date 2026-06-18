import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyD1Wlvqsle1TGs0xOq9d1tCuUzMA0E72zs",
  authDomain: "alpha-coach-a3811.firebaseapp.com",
  projectId: "alpha-coach-a3811",
  storageBucket: "alpha-coach-a3811.firebasestorage.app",
  messagingSenderId: "82597349006",
  appId: "1:82597349006:web:588b59c8fc001d41752bdf",
  measurementId: "G-Y33D91J3MQ"
};

export const FIREBASE_VAPID_KEY = "BL833evNURyCcRNoGtMB2A2R_IhPFVpQoKBODsbqtCkHnG-m2swqO6-EY6VJiYkMH3J6EvgRWrx5BtWpAzqeYUg";

const app = initializeApp(firebaseConfig);

let _messaging: ReturnType<typeof getMessaging> | null = null;
const getMessagingSafe = async () => {
  if (_messaging) return _messaging;
  if (typeof window === "undefined") return null;
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("[push] Firebase Messaging não suportado neste navegador");
      return null;
    }
    _messaging = getMessaging(app);
    return _messaging;
  } catch (e) {
    console.warn("[push] erro ao inicializar messaging", e);
    return null;
  }
};

export const messaging = typeof window !== "undefined" ? (() => { void getMessagingSafe(); return null; })() : null;

/**
 * Solicita permissão e obtém o token FCM.
 * IMPORTANTE: deve ser chamado a partir de um clique/toque do usuário (gesto),
 * principalmente no iOS (instalado como PWA) e em alguns navegadores Android.
 */
export const requestForToken = async (vapidKey: string): Promise<{ token: string | null; reason?: string }> => {
  if (typeof window === "undefined") return { token: null, reason: "ssr" };
  if (!("Notification" in window)) {
    return { token: null, reason: "Navegador não suporta notificações" };
  }
  if (!("serviceWorker" in navigator)) {
    return { token: null, reason: "Navegador não suporta Service Worker" };
  }

  const msg = await getMessagingSafe();
  if (!msg) return { token: null, reason: "Firebase Messaging não disponível (iOS exige PWA instalado)" };

  try {
    // Registra o SW explicitamente para evitar race condition no getToken
    const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { token: null, reason: `Permissão ${permission}` };
    }

    const token = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      return { token: null, reason: "Token vazio retornado pelo FCM" };
    }
    return { token };
  } catch (err: any) {
    console.error("[push] erro getToken", err);
    return { token: null, reason: err?.message || String(err) };
  }
};

export const onMessageListener = () =>
  new Promise(async (resolve) => {
    const msg = await getMessagingSafe();
    if (!msg) return;
    onMessage(msg, (payload) => resolve(payload));
  });
