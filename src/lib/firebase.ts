import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Essas são as credenciais que você deve obter no Console do Firebase
// Configurações do Projeto > Seus aplicativos > SDK setup and configuration
const firebaseConfig = {
  apiKey: "AIzaSyD1Wlvqsle1TGs0xOq9d1tCuUzMA0E72zs",
  authDomain: "alpha-coach-a3811.firebaseapp.com",
  projectId: "alpha-coach-a3811",
  storageBucket: "alpha-coach-a3811.firebasestorage.app",
  messagingSenderId: "82597349006",
  appId: "1:82597349006:web:588b59c8fc001d41752bdf",
  measurementId: "G-Y33D91J3MQ"
};

export const FIREBASE_VAPID_KEY = "BL833evNURyCcRNoGtMB2A2R_lhPFVpQoKBODsbqtCkHnG-m2swqO6-EY6VJiYkMH3J6EvgRWrx5BtWpAzqeYUg";

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

export const requestForToken = async (vapidKey: string) => {
  if (!messaging) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const currentToken = await getToken(messaging, {
        vapidKey: vapidKey,
      });
      if (currentToken) {
        return currentToken;
      } else {
        console.log("Nenhum token de registro disponível. Solicite permissão para gerar um.");
        return null;
      }
    } else {
      console.log("Permissão de notificação negada.");
      return null;
    }
  } catch (err) {
    console.log("Ocorreu um erro ao recuperar o token.", err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
