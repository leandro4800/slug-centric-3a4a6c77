import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Essas são as credenciais que você deve obter no Console do Firebase
// Configurações do Projeto > Seus aplicativos > SDK setup and configuration
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_AUTH_DOMAIN",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_STORAGE_BUCKET",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId: "SEU_APP_ID",
  measurementId: "SEU_MEASUREMENT_ID"
};

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
