import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { requestForToken, FIREBASE_VAPID_KEY } from "@/lib/firebase";
import { Loader2, RefreshCw, Send, BellRing } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PushLog {
  id: string;
  user_id: string | null;
  has_token: boolean;
  status: string;
  error_message: string | null;
  fcm_response: any;
  title: string | null;
  body: string | null;
  created_at: string;
}

const AdminDebugPush = () => {
  const [logs, setLogs] = useState<PushLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [myToken, setMyToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
  const [sending, setSending] = useState(false);
  const [host, setHost] = useState<string>("");
  const [isSecure, setIsSecure] = useState<boolean>(false);
  const [swStatus, setSwStatus] = useState<string>("desconhecido");
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("push_send_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error("Erro ao carregar logs", { description: error.message });
    setLogs((data as PushLog[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    setHost(window.location.hostname);
    setIsSecure(window.isSecureContext);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        const fcm = regs.find((r) => r.active?.scriptURL.includes("firebase-messaging-sw"));
        setSwStatus(fcm ? `registrado (${fcm.active?.state})` : `nenhum SW FCM (${regs.length} outros)`);
      });
    } else {
      setSwStatus("Service Worker não suportado");
    }
  }, []);

  const handleRequestAndTest = async () => {
    setSending(true);
    setLastResponse(null);
    setLastError(null);
    try {
      console.log("[debug-push] isSecureContext:", window.isSecureContext, "host:", window.location.hostname);
      const result = await requestForToken(FIREBASE_VAPID_KEY);
      console.log("[debug-push] requestForToken result:", result);
      if (typeof window !== "undefined" && "Notification" in window) {
        setPermission(Notification.permission);
      }
      if (!result.token) {
        const msg = `Token não obtido: ${result.reason || "desconhecido"}`;
        setLastError(msg);
        toast.error("Falha ao obter token", { description: result.reason || "desconhecido" });
        return;
      }
      setMyToken(result.token);
      console.log("[debug-push] FCM token completo:", result.token);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("perfis").update({ push_token: result.token }).eq("id", user.id);
      }

      const { data, error } = await supabase.functions.invoke("fcm-notifications", {
        body: {
          token: result.token,
          title: "🔔 Teste Alpha Coach",
          body: `Disparo manual em ${new Date().toLocaleTimeString("pt-BR")}`,
        },
      });
      console.log("[debug-push] edge function response:", { data, error });
      if (error) {
        setLastError(error.message || String(error));
        throw error;
      }
      setLastResponse(data);
      if (data?.success === false) {
        const fcmErr =
          data?.error?.error?.message ||
          data?.error?.error?.status ||
          data?.error?.message ||
          data?.reason ||
          "FCM rejeitou";
        setLastError(`FCM: ${fcmErr}`);
        toast.error("FCM rejeitou", { description: fcmErr });
      } else {
        toast.success("Requisição aceita pelo FCM");
      }
      setTimeout(fetchLogs, 1500);
    } catch (e: any) {
      const msg = e?.message || String(e);
      setLastError(msg);
      toast.error("Erro no disparo", { description: msg });
    } finally {
      setSending(false);
    }
  };

  const statusBadge = (s: string) => {
    if (s === "success") return <Badge className="bg-green-600 hover:bg-green-600">success</Badge>;
    if (s === "skipped") return <Badge className="bg-yellow-600 hover:bg-yellow-600">skipped</Badge>;
    return <Badge variant="destructive">{s}</Badge>;
  };

  const isPreview = host.includes("lovableproject") || host.includes("id-preview") || host === "localhost";

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Debug Push Notifications</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Diagnóstico de ponta a ponta da infraestrutura FCM / Web Push.
      </p>

      <Card className="p-4 mb-6 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="text-sm">
              <strong>Host:</strong> {host}{" "}
              {isPreview && (
                <Badge variant="outline" className="ml-2 text-yellow-500 border-yellow-500">
                  Ambiente de preview (use o domínio publicado para teste real)
                </Badge>
              )}
            </div>
            <div className="text-sm">
              <strong>HTTPS (isSecureContext):</strong>{" "}
              <Badge variant={isSecure ? "default" : "destructive"}>{isSecure ? "sim" : "NÃO — push bloqueado"}</Badge>
            </div>
            <div className="text-sm">
              <strong>Service Worker FCM:</strong> <code className="text-xs">{swStatus}</code>
            </div>
            <div className="text-sm">
              <strong>Permissão:</strong>{" "}
              <Badge variant={permission === "granted" ? "default" : "destructive"}>{permission}</Badge>
            </div>
            <div className="text-sm break-all">
              <strong>Meu token FCM:</strong>{" "}
              {myToken ? <code className="text-xs">{myToken.slice(0, 60)}…</code> : <span className="opacity-50">— (clique no botão)</span>}
            </div>
          </div>
          <Button onClick={handleRequestAndTest} disabled={sending} size="lg">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BellRing className="h-4 w-4 mr-2" />}
            Solicitar Permissão e Enviar Teste Agora
          </Button>
        </div>

        {lastError && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3">
            <div className="text-sm font-semibold text-red-400 mb-1">Último erro:</div>
            <code className="text-xs text-red-300 break-all whitespace-pre-wrap">{lastError}</code>
          </div>
        )}
        {lastResponse && (
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <div className="text-sm font-semibold mb-1">Resposta completa do FCM (via edge function):</div>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(lastResponse, null, 2)}</pre>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Últimos disparos ({logs.length})</h2>
        <Button onClick={fetchLogs} variant="outline" size="sm" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Atualizar</span>
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left">
              <th className="p-3">Quando</th>
              <th className="p-3">Usuário</th>
              <th className="p-3">Token</th>
              <th className="p-3">Status</th>
              <th className="p-3">Mensagem / Erro do FCM</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center opacity-50">Nenhum log ainda</td></tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="border-b hover:bg-muted/30">
                <td className="p-3 whitespace-nowrap text-xs">
                  {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}
                </td>
                <td className="p-3 font-mono text-xs">{l.user_id ? l.user_id.slice(0, 8) : "—"}</td>
                <td className="p-3">{l.has_token ? "Sim" : "Não"}</td>
                <td className="p-3">{statusBadge(l.status)}</td>
                <td className="p-3 text-xs max-w-md">
                  {l.error_message ? (
                    <span className="text-red-500">{l.error_message}</span>
                  ) : (
                    <code className="opacity-70">{JSON.stringify(l.fcm_response)?.slice(0, 160)}</code>
                  )}
                  {l.title && <div className="opacity-50 mt-1">"{l.title}" — {l.body}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default AdminDebugPush;
