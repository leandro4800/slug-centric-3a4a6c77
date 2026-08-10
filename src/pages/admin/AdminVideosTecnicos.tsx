import { useEffect, useState } from "react";
import { Save, Trash2, Plus, Video, Search, FileText, ClipboardList, Upload, Link2, Globe } from "lucide-react";
import { useParams } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AdminBackButton } from "@/components/admin/AdminBackButton";

interface VideoReferencia {
  id: string;
  nome_exercicio: string;
  url_video: string | null;
  tenant_id: string | null;
  origem: string | null;
  storage_path: string | null;
}

const STORAGE_BUCKET = "comunidade_uploads";

const AdminVideosTecnicos = () => {
  const { slug } = useParams();
  const { tenant } = useBranding();
  const [userId, setUserId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoReferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "meus" | "app">("todos");

  const isPlatformAdmin = tenant?.slug === "alphateam";
  const [publicarComoApp, setPublicarComoApp] = useState(false);

  const [novoNome, setNovoNome] = useState("");
  const [novoUrl, setNovoUrl] = useState("");
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null);
  const [modo, setModo] = useState<"link" | "upload">("link");
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkData, setBulkData] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("referencia_exercicios")
        .select("id, nome_exercicio, url_video, tenant_id, origem, storage_path")
        .order("nome_exercicio", { ascending: true });

      if (tenant?.id) {
        query = query.or(`tenant_id.is.null,tenant_id.eq.${tenant.id}`);
      } else {
        query = query.is("tenant_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setVideos((data || []) as VideoReferencia[]);
    } catch (error: any) {
      toast.error("Erro ao carregar vídeos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  const uploadArquivo = async (file: File): Promise<{ url: string; path: string }> => {
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
    if (!novoNome.trim()) {
      toast.error("Informe o nome do exercício");
      return;
    }
    if (!tenant?.id) {
      toast.error("Tenant não identificado");
      return;
    }
    if (modo === "link" && !novoUrl.trim()) {
      toast.error("Informe a URL do vídeo");
      return;
    }
    if (modo === "upload" && !novoArquivo) {
      toast.error("Selecione um arquivo de vídeo");
      return;
    }

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
        tenant_id: isPlatformAdmin && publicarComoApp ? null : tenant.id,
        profissional_id: userId,
        origem,
        storage_path: storagePath,
      } as any);

      if (error) throw error;

      toast.success("Vídeo adicionado!");
      setNovoNome("");
      setNovoUrl("");
      setNovoArquivo(null);
      setPublicarComoApp(false);
      setIsAdding(false);
      loadVideos();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkData.trim()) {
      toast.error("Cole os dados primeiro");
      return;
    }
    if (!tenant?.id) {
      toast.error("Tenant não identificado");
      return;
    }

    const lines = bulkData.split("\n").filter((line) => line.trim());
    const toInsert = lines
      .map((line) => {
        const parts = line.includes("\t") ? line.split("\t") : line.split(";");
        if (parts.length >= 2) {
          return {
            nome_exercicio: parts[0].trim(),
            url_video: parts[1].trim(),
            tenant_id: isPlatformAdmin && publicarComoApp ? null : tenant.id,
            profissional_id: userId,
            origem: parts[1].includes("drive.google.com") ? "drive" : "youtube",
          };
        }
        return null;
      })
      .filter((item) => item !== null);

    if (toInsert.length === 0) {
      toast.error("Formato inválido. Use: Nome do Exercício [TAB ou ;] URL");
      return;
    }

    try {
      const { error } = await supabase.from("referencia_exercicios").insert(toInsert as any);
      if (error) throw error;
      toast.success(`${toInsert.length} exercícios importados!`);
      setBulkData("");
      setPublicarComoApp(false);
      setIsBulkMode(false);
      loadVideos();
    } catch (error: any) {
      toast.error("Erro na importação: " + error.message);
    }
  };

  const handleDelete = async (video: VideoReferencia) => {
    if (video.tenant_id === null) {
      toast.error("Vídeos do app não podem ser removidos");
      return;
    }
    if (!confirm("Tem certeza que deseja remover este vídeo?")) return;

    try {
      if (video.storage_path) {
        await supabase.storage.from(STORAGE_BUCKET).remove([video.storage_path]);
      }
      const { error } = await supabase.from("referencia_exercicios").delete().eq("id", video.id);
      if (error) throw error;
      toast.success("Vídeo removido");
      loadVideos();
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  const filteredVideos = videos
    .filter((v) => v.nome_exercicio.toLowerCase().includes(search.toLowerCase()))
    .filter((v) => {
      if (filter === "meus") return v.tenant_id === tenant?.id;
      if (filter === "app") return v.tenant_id === null;
      return true;
    });

  return (
    <div className="px-5 pt-6 pb-32 bg-black min-h-screen">
      <AdminBackButton to={`/${slug}/app/controle`} className="mb-8" showLabel variant="ghost" />

      <div className="flex items-center gap-2 text-primary/80">
        <Video className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Biblioteca Técnica</span>
      </div>
      <h1 className="font-display text-4xl mt-2 text-white leading-tight">
        VÍDEOS <span className="text-primary">TECNICOS</span>
      </h1>
      <p className="text-muted-foreground text-sm mt-2 max-w-md">
        Os vídeos padrão do app estão sempre disponíveis. Adicione os seus para sobrescrever ou complementar a biblioteca do seu time.
      </p>

      <div className="h-px bg-primary/20 mt-6" />

      <div className="mt-6 flex gap-2">
        {(["todos", "meus", "app"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold border transition-all ${
              filter === f
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card/40 text-muted-foreground border-white/10 hover:border-primary/40"
            }`}
          >
            {f === "todos" ? "Todos" : f === "meus" ? "Meus" : "Do App"}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar exercício..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card/40 border border-white/10 rounded-none pl-10 pr-4 py-3 text-sm text-white focus:border-primary/50 outline-none transition-all"
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setIsAdding(!isAdding);
                setIsBulkMode(false);
                setPublicarComoApp(false);
              }}
              variant={isAdding ? "default" : "outline"}
              className="rounded-none h-auto px-4"
            >
              <Plus className="h-5 w-5 mr-2" /> NOVO
            </Button>
            <Button
              onClick={() => {
                setIsBulkMode(!isBulkMode);
                setIsAdding(false);
                setPublicarComoApp(false);
              }}
              variant={isBulkMode ? "default" : "outline"}
              className="rounded-none h-auto px-4"
            >
              <ClipboardList className="h-5 w-5 mr-2" /> COLAR LISTA
            </Button>
          </div>
        </div>

        {isAdding && (
          <div className="bg-card/40 border border-primary/30 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex gap-2">
              <button
                onClick={() => setModo("link")}
                className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-bold border ${
                  modo === "link" ? "bg-primary text-primary-foreground border-primary" : "bg-black text-muted-foreground border-white/10"
                }`}
              >
                <Link2 className="h-3 w-3 inline mr-1" /> YouTube / Drive
              </button>
              <button
                onClick={() => setModo("upload")}
                className={`flex-1 py-2 text-[10px] uppercase tracking-widest font-bold border ${
                  modo === "upload" ? "bg-primary text-primary-foreground border-primary" : "bg-black text-muted-foreground border-white/10"
                }`}
              >
                <Upload className="h-3 w-3 inline mr-1" /> Enviar do Celular
              </button>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-widest text-primary font-bold block mb-1">Nome do Exercício</label>
              <input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex: Supino Reto com Barra"
                className="w-full bg-black border border-white/10 rounded-none px-3 py-2 text-sm text-white focus:border-primary/50 outline-none"
              />
            </div>

            {modo === "link" ? (
              <div>
                <label className="text-[10px] uppercase tracking-widest text-primary font-bold block mb-1">URL do Vídeo (YouTube ou Google Drive)</label>
                <input
                  value={novoUrl}
                  onChange={(e) => setNovoUrl(e.target.value)}
                  placeholder="https://youtube.com/... ou https://drive.google.com/..."
                  className="w-full bg-black border border-white/10 rounded-none px-3 py-2 text-sm text-white focus:border-primary/50 outline-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Para vídeos do Drive, marque como "qualquer pessoa com o link pode ver".
                </p>
              </div>
            ) : (
              <div>
                <label className="text-[10px] uppercase tracking-widest text-primary font-bold block mb-1">Arquivo de Vídeo</label>
                <input
                  type="file"
                  accept="video/*"
                  capture="environment"
                  onChange={(e) => setNovoArquivo(e.target.files?.[0] ?? null)}
                  className="w-full bg-black border border-white/10 rounded-none px-3 py-2 text-sm text-white file:mr-3 file:bg-primary file:text-primary-foreground file:border-0 file:px-3 file:py-1 file:text-[10px] file:uppercase file:font-bold"
                />
                {novoArquivo && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {novoArquivo.name} ({(novoArquivo.size / 1024 / 1024).toFixed(1)} MB)
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={uploading} className="flex-1 rounded-none">
                <Save className="h-4 w-4 mr-2" /> {uploading ? "Enviando..." : "Salvar Exercício"}
              </Button>
              <Button onClick={() => setIsAdding(false)} variant="outline" className="rounded-none">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {isBulkMode && (
          <div className="bg-card/40 border border-primary/30 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-primary font-bold block mb-1">Importação em Massa</label>
              <p className="text-[10px] text-muted-foreground mb-2">Cole as linhas no formato: Nome [TAB] URL (YouTube ou Drive)</p>
              <textarea
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                placeholder={"Supino Reto\thttps://youtube.com/...\nAgachamento\thttps://drive.google.com/..."}
                rows={6}
                className="w-full bg-black border border-white/10 rounded-none px-3 py-2 text-xs text-white focus:border-primary/50 outline-none font-mono"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleBulkImport} className="flex-1 rounded-none">
                <FileText className="h-4 w-4 mr-2" /> Importar Tudo
              </Button>
              <Button onClick={() => setIsBulkMode(false)} variant="outline" className="rounded-none">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3 mt-6">
          {loading ? (
            <p className="text-center text-muted-foreground py-10 animate-pulse">Carregando biblioteca...</p>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-white/10">
              <p className="text-muted-foreground text-sm italic">Nenhum exercício encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredVideos.map((video) => {
                const isGlobal = video.tenant_id === null;
                return (
                  <div
                    key={video.id}
                    className="group flex flex-col md:flex-row md:items-center gap-4 bg-card/20 border border-white/5 p-4 hover:border-primary/30 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[9px] px-2 py-0.5 uppercase tracking-widest font-bold border ${
                            isGlobal
                              ? "text-muted-foreground border-white/10 bg-white/5"
                              : "text-primary border-primary/40 bg-primary/10"
                          }`}
                        >
                          {isGlobal ? (
                            <>
                              <Globe className="h-2.5 w-2.5 inline mr-1" />App
                            </>
                          ) : (
                            video.origem || "meu"
                          )}
                        </span>
                      </div>
                      <h3 className="font-display text-lg text-white group-hover:text-primary transition-all">
                        {video.nome_exercicio.toUpperCase()}
                      </h3>
                      <p className="text-[10px] text-muted-foreground truncate font-mono uppercase tracking-tighter mt-1 opacity-60">
                        {video.url_video}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {video.url_video && (
                        <a
                          href={video.url_video}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 md:flex-none h-10 px-4 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest flex items-center justify-center hover:bg-primary/20 transition-all"
                        >
                          Testar
                        </a>
                      )}
                      {!isGlobal && (
                        <button
                          onClick={() => handleDelete(video)}
                          className="w-10 h-10 flex items-center justify-center text-red-500/50 hover:text-red-500 transition-all border border-red-500/20 hover:border-red-500/50 bg-red-500/5"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminVideosTecnicos;
