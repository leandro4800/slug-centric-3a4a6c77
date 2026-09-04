import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { CloudOff, RefreshCw } from "lucide-react";
import {
  flushAthleteWriteQueue,
  subscribeAthleteWriteQueue,
  type AthleteWriteJob,
} from "@/lib/athlete-write-queue";
import { toast } from "sonner";

/**
 * Escuta online/resume e esvazia a fila de escritas do aluno.
 * Banner discreto quando ainda houver pendências.
 */
export default function AthleteWriteSync() {
  const [jobs, setJobs] = useState<AthleteWriteJob[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsub = subscribeAthleteWriteQueue(setJobs);

    const runFlush = () => {
      void flushAthleteWriteQueue().then(({ flushed, remaining }) => {
        if (flushed > 0 && remaining === 0) {
          toast.success("Dados pendentes sincronizados com o coach.");
        }
      });
    };

    runFlush();

    const onOnline = () => runFlush();
    window.addEventListener("online", onOnline);

    let appHandle: { remove: () => Promise<void> } | null = null;
    if (Capacitor.isNativePlatform()) {
      void App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) runFlush();
      }).then((h) => {
        appHandle = h;
      });
    }

    return () => {
      unsub();
      window.removeEventListener("online", onOnline);
      void appHandle?.remove();
    };
  }, []);

  if (jobs.length === 0) return null;

  const retry = async () => {
    setSyncing(true);
    try {
      const { flushed, remaining } = await flushAthleteWriteQueue();
      if (flushed > 0 && remaining === 0) {
        toast.success("Tudo sincronizado.");
      } else if (remaining > 0) {
        toast.message(`${remaining} item(ns) ainda pendente(s). Sem sinal estável.`);
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-3 right-3 z-[60] pointer-events-none">
      <button
        type="button"
        onClick={() => void retry()}
        className="pointer-events-auto mx-auto flex max-w-md items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/90 px-3 py-2 text-left text-[11px] text-amber-100 shadow-lg backdrop-blur"
      >
        <CloudOff className="h-4 w-4 shrink-0 text-amber-400" />
        <span className="flex-1">
          {jobs.length} dado(s) do treino/avaliação aguardando rede para chegar ao coach.
        </span>
        <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${syncing ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
