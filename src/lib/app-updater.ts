// Detecta novas versões do app comparando o hash do bundle principal entre
// a página carregada agora e o /index.html atual servido pelo servidor.
// Quando detecta diferença, limpa caches e recarrega. Essencial para PWAs
// instalados (Android/iOS) que tendem a reter a "shell" antiga.

const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

const isPreviewHost =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("lovableproject.com") ||
    window.location.hostname.includes("lovable.app") && window.location.hostname.includes("id-preview"));

let currentScriptHash: string | null = null;

const extractMainScript = (html: string): string | null => {
  // Captura o primeiro <script type="module" src="/assets/index-XXXX.js"></script>
  const m = html.match(/<script[^>]+src=["']([^"']*\/assets\/[^"']+\.js)["'][^>]*>/i);
  if (m) return m[1];
  // Fallback: qualquer script com src dentro de /assets/
  const m2 = html.match(/src=["'](\/assets\/[^"']+\.js)["']/i);
  return m2 ? m2[1] : null;
};

const getLoadedMainScript = (): string | null => {
  const scripts = Array.from(document.querySelectorAll("script[src]")) as HTMLScriptElement[];
  for (const s of scripts) {
    if (s.src.includes("/assets/") && s.src.endsWith(".js")) {
      return new URL(s.src).pathname;
    }
  }
  return null;
};

const clearAllCachesAndReload = async () => {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.update().catch(() => null)));
    }
  } catch (e) {
    console.warn("[updater] erro limpando caches", e);
  }
  // Bust de URL para forçar revalidação na navegação
  const url = new URL(window.location.href);
  url.searchParams.set("_v", Date.now().toString());
  window.location.replace(url.toString());
};

const checkForUpdate = async () => {
  try {
    const res = await fetch(`/index.html?_=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return;
    const html = await res.text();
    const remoteScript = extractMainScript(html);
    if (!remoteScript) return;
    if (!currentScriptHash) currentScriptHash = getLoadedMainScript();
    if (currentScriptHash && remoteScript !== currentScriptHash) {
      console.log("[updater] Nova versão detectada:", remoteScript, "≠", currentScriptHash);
      await clearAllCachesAndReload();
    }
  } catch (e) {
    // offline ou rede ruim — ignora
  }
};

export const startUpdateChecker = () => {
  if (isPreviewHost || isInIframe) return; // não rodar no editor Lovable
  if (typeof window === "undefined") return;

  currentScriptHash = getLoadedMainScript();

  // Checa quando a aba volta a ficar visível (PWA voltando do background)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkForUpdate();
  });
  window.addEventListener("focus", () => void checkForUpdate());

  // Checa a cada 2 minutos com a aba aberta
  setInterval(() => void checkForUpdate(), 2 * 60 * 1000);

  // Primeira checagem 5s após o load
  setTimeout(() => void checkForUpdate(), 5000);
};
