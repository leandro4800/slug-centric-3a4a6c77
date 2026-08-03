import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Share, Plus, X } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed-at-v3";
const DISMISS_DAYS = 3;

const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
const isAndroid = () => /Android/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;

const InstallPwaPrompt = () => {
  const isNativeApp = Capacitor.isNativePlatform();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const ios = isIOS();
  const android = isAndroid();

  useEffect(() => {
    if (isNativeApp) return;
    if (!isMobile() || isStandalone()) return;
    // Não mostrar em landing pages públicas
    const path = location.pathname;
    if (path === "/" || path === "/site" || path === "/marketplace" || path === "/seja-coach" || /^\/[^/]+\/site$/.test(path)) return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400000) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS não dispara beforeinstallprompt. Em Android, se o navegador não disparar
    // o evento nativo, ainda mostramos a orientação manual para adicionar à tela inicial.
    const t = setTimeout(() => setOpen(true), 1500);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", onBIP);
    };
  }, [location.pathname, isNativeApp]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  };

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setOpen(false);
  };

  if (isNativeApp) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleDismiss()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Download className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center">Instalar o AlphaCoach</DialogTitle>
          <DialogDescription className="text-center">
            Tenha acesso rápido pelo seu celular como um aplicativo nativo.
          </DialogDescription>
        </DialogHeader>

        {ios ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">No Safari, toque em:</p>
            <div className="flex items-center gap-2 rounded-lg border border-border p-3">
              <Share className="h-5 w-5 text-primary" />
              <span>1. Toque em <strong>Compartilhar</strong></span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border p-3">
              <Plus className="h-5 w-5 text-primary" />
              <span>2. Selecione <strong>Adicionar à Tela de Início</strong></span>
            </div>
          </div>
        ) : deferred ? (
          <p className="text-center text-sm text-muted-foreground">
            Toque em "Instalar" para adicionar o app à sua tela inicial.
          </p>
        ) : android ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">No Chrome, toque em:</p>
            <div className="flex items-center gap-2 rounded-lg border border-border p-3">
              <Plus className="h-5 w-5 text-primary" />
              <span>Menu do navegador</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border p-3">
              <Download className="h-5 w-5 text-primary" />
              <span><strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong></span>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            Adicione o AlphaCoach à tela inicial pelo menu do navegador.
          </p>
        )}

        <DialogFooter className="flex-row gap-2 sm:justify-center">
          <Button variant="ghost" onClick={handleDismiss} className="flex-1">
            <X className="mr-1 h-4 w-4" /> Agora não
          </Button>
          {!ios && deferred && (
            <Button onClick={handleInstall} className="flex-1">
              <Download className="mr-1 h-4 w-4" /> Instalar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InstallPwaPrompt;
