import { useEffect, useMemo, useState } from "react";
import { Video, Plus, Trash2, Save, Search, Play, Pencil, X, Globe, Upload, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { buildVlogEmbedUrl, normalizeVideoUrl } from "@/lib/video-embed";
import { isDirectVideo } from "@/lib/utils";

interface VideoRow {
  id: string;
  nome_exercicio: string;
  url_video: string | null;
  tenant_id: string | null;
  origem: string | null;
  storage_path: string | null;
}

const STORAGE_BUCKET = "comunidade_uploads";

const VideosTecnicos = () => {
  const { tenant } = useSiteTenant();
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "app" | "meus">("todos");
  const [onlyMine, setOnlyMine] = useState(false);
  const [savingPref, setSavingPref] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [modo, setModo] = useState<"link" | "upload">("link");
  const [novoNome, setNovoNome] = useState("");
  const [novoUrl, setNovoUrl] = useState("");
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const load = async () => {
    if (!tenant?.id) return;
    try {
      setLoading(true);
      const { data: t } = await supabase
        .from("tenants")
        .select("usar_apenas_meus_videos")
        .eq("id", tenant.id)
        .maybeSingle();
      setOnlyMine(Boolean((t as any)?.usar_apenas_meus_videos));

      const { data, error } = await supabase
        .from("referencia_exercicios")
        .select("id, nome_exercicio, url_video, tenant_id, origem, storage_path")
        .or(`tenant_id.is.null,tenant_id.eq.${tenant.id}`)
        .order("nome_exercicio", { ascending: true });
      if (error) throw error;
      setRows((data || []) as VideoRow[]);
    } catch (e: any) {
      toast.error("Erro ao carregar vídeos: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  const toggleOnlyMine = async () => {
    if (!tenant?.id) return;
    const next = !onlyMine;
    try {
      setSavingPref(true);
      const { error } = await supabase
        .from("tenants")
        .update({ usar_apenas_meus_videos: next } as any)
        .eq("id", tenant.id);
      if (error) throw error;
      setOnlyMine(next);
      toast.success(next ? "Seus alunos verão apenas os SEUS vídeos" : "Vídeos do app reativados para seus alunos");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSavingPref(false);
    }
  };

  const uploadArquivo = async (file: File) => {
    if (!userId) throw new Error("Usuário não autenticado");
    const ext = file.name.split(".").pop() || "mp4";
    const path = `${userId}/videos-tecnicos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "video/mp4",
    });
    if (error) throw error;
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, path };
  };

  const handleAdd = async () => {
    if (!tenant?.id) return toast.error("Tenant não identificado");
    if (!novoNome.trim()) return toast.error("Informe o nome do exercício");
    if (modo === "link" && !novoUrl.trim()) return toast.error("Informe a URL do vídeo");
    if (modo === "upload" && !novoArquivo) return toast.error("Selecione um arquivo");

    try {
      setUploading(true);
      let url = novoUrl.trim();
      let storagePath: string | null = null;
      let origem = "youtube";
      if (modo === "upload" && novoArquivo) {
        const up = await uploadArquivo(novoArquivo);
        url = up.url;
        storagePath = up.path;
        origem = "upload";
      } else if (url.includes("drive.google.com")) {
        origem = "drive";
      }

      const { error } = await supabase.from("referencia_exercicios").insert({
        nome_exercicio: novoNome.trim(),
        url_video: url,
        tenant_id: tenant.id,
        profissional_id: userId,
        origem,
        storage_path: storagePath,
      } as any);
      if (error) throw error;
      toast.success("Vídeo adicionado!");
      setNovoNome("");
      setNovoUrl("");
      setNovoArquivo(null);
      setIsAdding(false);
      load();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (v: VideoRow) => {
    setEditId(v.id);
    setEditNome(v.nome_exercicio);
    setEditUrl(v.url_video || "");
  };

  const saveEdit = async () => {
    if (!editId) return;
    if (!editNome.trim() || !editUrl.trim()) return toast.error("Preencha nome e URL");
    try {
      const { error } = await supabase
        .from("referencia_exercicios")
        .update({ nome_exercicio: editNome.trim(), url_video: editUrl.trim() } as any)
        .eq("id", editId);
      if (error) throw error;
      toast.success("Vídeo atualizado");
      setEditId(null);
      load();
    } catch (e: any) {
      toast.error("Erro ao atualizar: " + e.message);
    }
  };

  const handleDelete = async (v: VideoRow) => {
    if (v.tenant_id === null) return toast.error("Vídeos do app não podem ser removidos");
    if (!confirm(`Remover "${v.nome_exercicio}"?`)) return;
    try {
      if (v.storage_path) await supabase.storage.from(STORAGE_BUCKET).remove([v.storage_path]);
      const { error } = await supabase.from("referencia_exercicios").delete().eq("id", v.id);
      if (error) throw error;
      toast.success("Vídeo removido");
      load();
    } catch (e: any) {
      toast.error("Erro ao remover: " + e.message);
    }
  };

  const filtered = useMemo(
    () =>
      rows
        .filter((v) => v.nome_exercicio.toLowerCase().includes(search.toLowerCase()))
        .filter((v) =>
          filter === "app" ? v.tenant_id === null : filter === "meus" ? v.tenant_id !== null : true,
        ),
    [rows, search, filter],
  );

  const renderPlayer = (v: VideoRow) => {
    const url = normalizeVideoUrl(v.url_video);
    if (!url) return <p className="text-sm text-muted-foreground">Sem URL de vídeo.</p>;
    if (isDirectVideo(url)) {
      return <video src={url} controls playsInline className="w-full max-h-[360px] bg-black" />;
    }
    const embed = buildVlogEmbedUrl(url, { userInitiated: true, autoplay: false });
    if (!embed) {
      return (
        <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
          Abrir vídeo em nova aba
        </a>
      );
    }
    return (
      <iframe
        src={embed}
        title={v.nome_exercicio}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full aspect-video bg-black"
      />
    );
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-2 text-primary/80">
        <Video className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Programação</span>
      </div>
      <h1 className="font-display text-3xl mt-1">Exercícios & Vídeos Técnicos</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Cadastre, edite, visualize e remova os vídeos que o aluno vê em cada exercício do treino.
      </p>

      <div className="mt-5 flex flex-wrap gap-2 items-center">
        {(["todos", "meus", "app"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold border transition-all ${
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card/40 text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {f === "todos" ? "Todos" : f === "meus" ? "Meus vídeos" : "Do App"}
          </button>
        ))}
        <button
          onClick={toggleOnlyMine}
          disabled={savingPref}
          className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold border transition-all ${
            onlyMine
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card/40 text-muted-foreground border-border hover:border-primary/40"
          }`}
        >
          Meus {onlyMine ? "(ativo)" : ""}
        </button>
        <span className="text-[11px] text-muted-foreground">
          {onlyMine
            ? "Alunos veem somente os seus vídeos."
            : "Alunos veem vídeos do app + os seus (os seus têm prioridade)."}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar exercício..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setIsAdding((v) => !v)} variant={isAdding ? "default" : "outline"}>
          <Plus className="h-4 w-4 mr-2" /> Novo vídeo
        </Button>
      </div>

      {isAdding && (
        <div className="mt-4 border border-primary/30 bg-card/40 p-4 space-y-3">
          <div className="flex gap-2">
            <Button size="sm" variant={modo === "link" ? "default" : "outline"} onClick={() => setModo("link")}>
              <Link2 className="h-3 w-3 mr-1" /> Link
            </Button>
            <Button size="sm" variant={modo === "upload" ? "default" : "outline"} onClick={() => setModo("upload")}>
              <Upload className="h-3 w-3 mr-1" /> Upload
            </Button>
          </div>
          <Input placeholder="Nome do exercício" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
          {modo === "link" ? (
            <Input
              placeholder="https://youtube.com/... ou https://drive.google.com/..."
              value={novoUrl}
              onChange={(e) => setNovoUrl(e.target.value)}
            />
          ) : (
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setNovoArquivo(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          )}
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={uploading}>
              <Save className="h-4 w-4 mr-2" /> {uploading ? "Enviando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={() => setIsAdding(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-muted-foreground animate-pulse">Carregando biblioteca...</p>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum exercício encontrado.
          </div>
        ) : (
          filtered.map((v) => {
            const isGlobal = v.tenant_id === null;
            const isEditing = editId === v.id;
            return (
              <div key={v.id} className="border border-border bg-card/30 p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <span
                      className={`text-[9px] px-2 py-0.5 uppercase tracking-widest font-bold border ${
                        isGlobal ? "text-muted-foreground border-border" : "text-primary border-primary/40"
                      }`}
                    >
                      {isGlobal ? (
                        <>
                          <Globe className="h-2.5 w-2.5 inline mr-1" />App
                        </>
                      ) : (
                        v.origem || "meu"
                      )}
                    </span>
                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                        <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
                      </div>
                    ) : (
                      <>
                        <h3 className="font-semibold mt-1 truncate">{v.nome_exercicio}</h3>
                        <p className="text-[11px] text-muted-foreground truncate">{v.url_video}</p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewId(previewId === v.id ? null : v.id)}
                    >
                      <Play className="h-4 w-4 mr-1" /> {previewId === v.id ? "Fechar" : "Ver"}
                    </Button>
                    {!isGlobal &&
                      (isEditing ? (
                        <>
                          <Button size="sm" onClick={saveEdit}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => startEdit(v)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(v)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ))}
                  </div>
                </div>
                {previewId === v.id && <div className="mt-3">{renderPlayer(v)}</div>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default VideosTecnicos;
