import { useEffect } from "react";
import { PRIVACY_POLICY_URL, PRODUCTION_APP_ORIGIN } from "@/lib/app-url";

const shouldRedirectToCanonical = () => {
  if (typeof window === "undefined") return false;

  const { protocol, hostname, origin } = window.location;
  const isCanonicalOrigin = origin === PRODUCTION_APP_ORIGIN;

  return (
    protocol === "capacitor:" ||
    protocol === "ionic:" ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".lovable.app") ||
    hostname.endsWith(".lovable.dev") ||
    hostname.endsWith(".lovableproject.com") ||
    !isCanonicalOrigin
  );
};

const PoliticaPrivacidade = () => {
  useEffect(() => {
    if (shouldRedirectToCanonical()) {
      window.location.replace(PRIVACY_POLICY_URL);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <p className="text-sm text-muted-foreground text-center max-w-md">
        Consulte nossa{" "}
        <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline">
          Política de Privacidade
        </a>{" "}
        em {PRIVACY_POLICY_URL}.
      </p>
    </div>
  );
};

export default PoliticaPrivacidade;
