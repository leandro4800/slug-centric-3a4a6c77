import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Upload, Trash2, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ChunkRow {
  id: string;
  titulo: string;
  fonte: string | null;
  created_at: string;
  metadata: any;
}

interface DocGroup {
  sourcePath: string;
  fonte: string;
  chunks: number;
  createdAt: string;
}

const BaseConhecimento = () => {
  const { tenant } = useSiteTenant();
  const [rows, setRows] = useState<ChunkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("base_conhecimento_treino")
      .select("id, titulo, fonte, created_at, metadata")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) toast.error(error.message);
    setRows((data as ChunkRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  const docs: DocGroup[] = useMemo(() => {
    const map = new Map<string, DocGroup>();
    for (const r of rows) {
      const path = r.metadata?.source_path || r.fonte || r.id;
      const existing = map.get(path);
      if (existing) {
        existing.chunks += 1;
        if (r.created_at > existing.createdAt) existing.createdAt = r.created_at;
      } else {
        map.set(path, {
          sourcePath: path,
          fonte: r.fonte || r.metadata?.file || path.split("/").pop() || path,
          chunks: 1,
          createdAt: r.created_at,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [rows]);

  const handleFile = async (file: File | null) => {
    if (!file || !tenant?.id) return;
    const ok = /\.(pdf|txt|md|markdown|zip)$/i.test(file.name);
    if (!ok) {
      toast.error("Formato não suportado. Use .pdf, .txt, .md ou .zip");
      return;
    }
    setUploading(true);
    try {
      const path = `${tenant.id}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("base-conhecimento").upload(path, file);
      if (upErr) throw upErr;

      toast.info("Arquivo enviado. Processando conteúdo...");
      const { data, error } = await supabase.functions.invoke("ingest-knowledge", {
        body: { file_path: path, tenant_id: tenant.id, fonte: file.name },
      });
      if (error) throw error;
      toast.success(`Indexado! ${data?.chunks_created ?? 0} trechos de ${data?.files_processed ?? 1} arquivo(s).`);
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao enviar o documento");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (doc: DocGroup) => {
    if (!tenant?.id) return;
    if (!confirm(`Remover "${doc.fonte}" da base de conhecimento?`)) return;
    setDeleting(doc.sourcePath);
    try {
      const { error } = await (supabase as any)
        .from("base_conhecimento_treino")
        .delete()
        .eq("tenant_id", tenant.id)
        .filter("metadata->>source_path", "eq", doc.sourcePath);
      if (error) throw error;
      if (doc.sourcePath.includes("/")) {
        await supabase.storage.from("base-conhecimento").remove([doc.sourcePath]);
      }
      toast.success("Documento removido");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao remover");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <AdminBackButton to="/site/admin/dashboard" />
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Programação</p>
        <h1 className="font-display text-3xl md:text-4xl uppercase italic tracking-tighter flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" /> Base de Conhecimento
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Envie documentos com suas próprias regras, metodologia e preferências de treino/dieta.
          A IA vai priorizar essas orientações ao montar treinos e dietas para seus alunos.
        </p>
      </div>

      <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider">Enviar documento</p>
          <p className="text-xs text-muted-foreground mt-1">
            Formatos aceitos: <b>.pdf, .txt, .md, .zip</b> (o .zip pode conter vários arquivos).
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.md,.markdown,.zip"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />
        <Button onClick={() => fileRef.current?.click()} disabled={uploading || !tenant?.id} className="gap-2">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Processando..." : "Escolher arquivo"}
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-bold uppercase tracking-wider">
          Documentos enviados ({docs.length})
        </p>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center rounded-2xl border border-border/40 bg-card">
            Nenhum documento enviado ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div
                key={d.sourcePath}
                className="flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-card"
              >
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{d.fonte}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.chunks} trecho{d.chunks > 1 ? "s" : ""} • {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={deleting === d.sourcePath}
                  onClick={() => handleDelete(d)}
                >
                  {deleting === d.sourcePath
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4 text-destructive" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseConhecimento;
