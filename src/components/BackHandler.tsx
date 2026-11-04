import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useHasOwnBackButton } from "@/hooks/use-own-back-button";

/**
 * Botão Voltar flutuante para uso em apps nativos (Capacitor) onde não há
 * barra do navegador. Aparece em todas as rotas de aluno EXCETO na home.
 * Também escuta o botão "voltar" físico do Android.
 */
const BackHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();

  const hasOwnBack = useHasOwnBackButton();

  const homePath = slug ? `/${slug}/app` : "/";
  const isHome =
    location.pathname === homePath ||
    location.pathname === `${homePath}/` ||
    location.pathname === "/";

  // Android hardware back button (Capacitor)
  useEffect(() => {
    let remove: (() => void) | undefined;
    (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("backButton", () => {
          if (isHome) {
            App.exitApp();
          } else if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate(homePath);
          }
        });
        remove = () => handle.remove();
      } catch {
        // Web — ignora
      }
    })();
    return () => {
      remove?.();
    };
  }, [isHome, homePath, navigate]);

  if (isHome) return null;
  // A tela já mostra a própria seta: não sobe outra por cima do título dela.
  if (hasOwnBack) return null;

  return (
    <>
      {/* Espaço reservado: a seta flutuante nunca fica em cima da escrita. */}
      <div
        aria-hidden
        className="h-14"
        style={{ height: "max(3.5rem, calc(env(safe-area-inset-top) + 3rem))" }}
      />
      <button
      onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(homePath))}
      aria-label="Voltar"
      className="fixed top-6 left-3 z-50 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white shadow-lg active:scale-95 transition"
      style={{ top: "max(1.5rem, env(safe-area-inset-top) + 0.75rem)" }}
    >
        <ArrowLeft className="h-5 w-5" />
      </button>
    </>
  );
};

export default BackHandler;
