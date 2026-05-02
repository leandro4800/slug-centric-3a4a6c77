import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Upload, Loader2, FileText, Trash2, Brain, Globe } from "lucide-react";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { toast } from "sonner";

interface KnowledgeRow {
  id: string;
  titulo: string;
  fonte: string | null;
  tenant_id: string | null;
  created_at: string;
}

const AdminBaseConhecimento = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scope, setScope] = useState<"tenant" | "global">("tenant");
  const [file, setFile] = useState<File | null>(null);
  const [fonte, setFonte] = useState("");
  const [uploading, setUploading] = useState(false);
  const [rows, setRows] = useState<KnowledgeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user || !slug) return;
      const { data: t } = await supabase.from("tenants").select("id, owner_user_id").eq("slug", slug).maybeSingle();
      if (t) setTenantId(t.id);
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setIsAdmin((roles || []).some((r: any) => r.role === "admin"));
      await loadRows(t?.id || null);
    })();
  }, [user, slug]);

  const loadRows = async (tid: string | null) => {
    setLoading(true);
    let query = (supabase as any)
      .from("base_conhecimento_treino")
      .select("id, titulo, fonte, tenant_id, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (scope === "tenant" && tid) query = query.eq("tenant_id", tid);
    if (scope === "global") query = query.is("tenant_id", null);
    const { data } = await query;
    setRows((data as KnowledgeRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadRows(tenantId); }, [scope, tenantId]);

  const handleUpload = async () => {
    if (!file || !user) return;
    if (scope === "global" && !isAdmin) {
      toast.error("Apenas admin pode subir base global");
      return;
    }
    if (scope === "tenant" && !tenantId) {
      toast.error("Tenant não encontrado");
      return;
    }
    setUploading(true);
    try {
      const folder = scope === "global" ? "global" : `tenant-${tenantId}`;
      const path = `${folder}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("base-conhecimento").upload(path, file);
      if (upErr) throw upErr;

      toast.info("Arquivo enviado. Processando conteúdo...");

      const { data, error } = await supabase.functions.invoke("ingest-knowledge", {
        body: {
          file_path: path,
          tenant_id: scope === "global" ? null : tenantId,
          fonte: fonte || file.name,
        },
      });
      if (error) throw error;
      toast.success(`Indexado! ${data.chunks_created} trechos de ${data.files_processed} arquivo(s).`);
      setFile(null);
      setFonte("");
      await loadRows(tenantId);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este trecho da base?")) return;
    const { error } = await (supabase as any).from("base_conhecimento_treino").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    await loadRows(tenantId);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6 bg-black/95 backdrop-blur p-4 rounded-2xl border border-white/10 sticky top-4 z-20">
        <AdminBackButton 
          className="h-5 w-5" 
        />
        <Brain className="h-6 w-6 text-accent" />
        <h1 className="font-display text-2xl">Base de Conhecimento da IA</h1>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Envie ZIPs ou PDFs com seu material (livros, apostilas, metodologia). A IA usará todo o conteúdo
        ao montar treinos. Suportado: <b>.zip, .pdf, .txt, .md</b>.
      </p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setScope("tenant")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold ${scope === "tenant" ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}
        >
          Minha base (tenant)
        </button>
        {isAdmin && (
          <button
            onClick={() => setScope("global")}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 ${scope === "global" ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            <Globe className="h-4 w-4" /> Base global
          </button>
        )}
      </div>

      <Card className="p-5 mb-6 space-y-4 bg-black/40 border-white/10 shadow-2xl backdrop-blur-sm">
        <div>
          <Label>Arquivo (.zip, .pdf, .txt, .md)</Label>
          <Input
            type="file"
            accept=".zip,.pdf,.txt,.md,.markdown"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={uploading}
          />
        </div>
        <div>
          <Label>Fonte / Nome de referência (opcional)</Label>
          <Input
            placeholder="Ex: Metodologia Pacholok 2024"
            value={fonte}
            onChange={(e) => setFonte(e.target.value)}
            disabled={uploading}
          />
        </div>
        <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {uploading ? "Processando..." : "Enviar e indexar"}
        </Button>
      </Card>

      <h2 className="font-display text-lg mb-3">Trechos indexados ({rows.length})</h2>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nenhum material indexado ainda.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-black/40 border border-white/10 rounded-lg backdrop-blur-sm">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{r.titulo}</p>
                <p className="text-xs text-muted-foreground truncate">{r.fonte}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBaseConhecimento;
