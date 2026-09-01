import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { GraduationCap, Plus, Loader2, Trash2, Save, Play, Pencil, X, Upload, Link2 } from "lucide-react";
import { toast } from "sonner";
import { buildVlogEmbedUrl, normalizeVideoUrl } from "@/lib/video-embed";
import { isDirectVideo } from "@/lib/utils";
import { FIGHT_MODALIDADES, FIGHT_NIVEIS, modalidadeLabel } from "@/lib/fightModalidades";

type Conteudo = {
  id: string;
  tenant_id: string;
  modalidade: string;
  titulo: string;
  descricao: string | null;
  video_url: string;
  nivel: string | null;
  ordem: number;
};

const STORAGE_BUCKET = "comunidade_uploads";

const emptyForm = {
  modalidade: "bjj",
  titulo: "",
  descricao: "",
  video_url: "",
  nivel: "",
  ordem: "0",
};

const DojoVirtual = () => {
  const { tenant } = useSiteTenant();
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Conteudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>("bjj");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [modo, setModo] = useState<"link" | "upload">("link");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const load = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("dojo_conteudos")
      .select("id, tenant_id, modalidade, titulo, descricao, video_url, nivel, ordem")
      .eq("tenant_id", tenant.id)
      .order("modalidade")
      .order("ordem");
    setLoading(false);
    if (error) return toast.error("Erro ao carregar: " + error.message);
    setRows((data as Conteudo[]) ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  const filtrados = useMemo(() => rows.filter((r) => r.modalidade === filtro), [rows, filtro]);

  const uploadArquivo = async (file: File) => {
    if (!userId) throw new Error("Usuário não autenticado");
    const ext = file.name.split(".").pop() || "mp4";
    const path = `${userId}/dojo/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "video/mp4",
    });
    if (error) throw error;
    return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  };

  const resetForm = () => {
    setForm({ ...emptyForm, modalidade: filtro });
    setArquivo(null);
    setModo("link");
    setEditId(null);
    setShowForm(false);
  };

  const salvar = async () => {
    if (!tenant?.id || !userId) return;
    if (!form.titulo.trim()) return toast.error("Informe o título da aula");
    if (modo === "link" && !form.video_url.trim() && !editId) return toast.error("Informe a URL do vídeo");
    if (modo === "upload" && !arquivo && !editId) return toast.error("Selecione um arquivo");

    try {
      setSaving(true);
      let url = form.video_url.trim();
      if (modo === "upload" && arquivo) url = await uploadArquivo(arquivo);
      if (!url) return toast.error("Vídeo obrigatório");

      const payload = {
        tenant_id: tenant.id,
        modalidade: form.modalidade,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        video_url: url,
        nivel: form.nivel || null,
        ordem: Number(form.ordem) || 0,
        created_by: userId,
      };

      const { error } = editId
        ? await supabase.from("dojo_conteudos").update(payload).eq("id", editId)
        : await supabase.from("dojo_conteudos").insert(payload);
      if (error) throw error;
      toast.success(editId ? "Aula atualizada" : "Aula publicada no Dojo");
      resetForm();
      load();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const editar = (c: Conteudo) => {
    setEditId(c.id);
    setShowForm(true);
    setModo("link");
    setArquivo(null);
    setForm({
      modalidade: c.modalidade,
      titulo: c.titulo,
      descricao: c.descricao ?? "",
      video_url: c.video_url,
      nivel: c.nivel ?? "",
      ordem: String(c.ordem ?? 0),
    });
  };

  const remover = async (c: Conteudo) => {
    if (!confirm(`Remover "${c.titulo}"?`)) return;
    const { error } = await supabase.from("dojo_conteudos").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Aula removida");
    load();
  };

  const renderVideo = (rawUrl: string, title: string) => {
    const url = normalizeVideoUrl(rawUrl);
    if (!url) return <p className="text-sm text-muted-foreground">Sem URL de vídeo.</p>;
    if (isDirectVideo(url)) return <video src={url} controls playsInline className="w-full max-h-[360px] bg-black" />;
    const embed = buildVlogEmbedUrl(url, { userInitiated: true, autoplay: false });
    if (!embed)
      return (
        <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
          Abrir vídeo em nova aba
        </a>
      );
    return <iframe src={embed} title={title} allowFullScreen className="w-full aspect-video bg-black" />;
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-2 text-primary/80">
        <GraduationCap className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Luta</span>
      </div>
      <h1 className="font-display text-3xl mt-1">Dojo Virtual</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Publique vídeo-aulas de técnica e metodologia do seu CT, organizadas por modalidade e nível.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {FIGHT_MODALIDADES.map((m) => (
          <button
            key={m.slug}
            onClick={() => setFiltro(m.slug)}
            className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold border transition-all ${
              filtro === m.slug
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card/40 text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {m.label}
          </button>
        ))}
        <Button
          className="ml-auto"
          variant={showForm ? "default" : "outline"}
          onClick={() => (showForm ? resetForm() : (setForm({ ...emptyForm, modalidade: filtro }), setShowForm(true)))}
        >
          <Plus className="h-4 w-4 mr-2" /> Nova aula
        </Button>
      </div>

      {showForm && (
        <Card className="mt-4 p-4 space-y-3 border-primary/30">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Modalidade</Label>
              <select
                value={form.modalidade}
                onChange={(e) => setForm((f) => ({ ...f, modalidade: e.target.value }))}
                className="w-full bg-card border border-border px-3 py-2 text-sm mt-1"
              >
                {FIGHT_MODALIDADES.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Nível (opcional)</Label>
              <select
                value={form.nivel}
                onChange={(e) => setForm((f) => ({ ...f, nivel: e.target.value }))}
                className="w-full bg-card border border-border px-3 py-2 text-sm mt-1"
              >
                <option value="">Todos os níveis</option>
                {FIGHT_NIVEIS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Ordem</Label>
              <Input
                type="number"
                value={form.ordem}
                onChange={(e) => setForm((f) => ({ ...f, ordem: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Título</Label>
            <Input
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex: Passagem de guarda — pressão no quadril"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant={modo === "link" ? "default" : "outline"} onClick={() => setModo("link")}>
              <Link2 className="h-3 w-3 mr-1" /> Link
            </Button>
            <Button size="sm" variant={modo === "upload" ? "default" : "outline"} onClick={() => setModo("upload")}>
              <Upload className="h-3 w-3 mr-1" /> Upload
            </Button>
          </div>
          {modo === "link" ? (
            <Input
              placeholder="https://youtube.com/... ou link direto do vídeo"
              value={form.video_url}
              onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
            />
          ) : (
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
          )}

          <div className="flex gap-2">
            <Button onClick={salvar} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-muted-foreground animate-pulse">Carregando Dojo...</p>
        ) : filtrados.length === 0 ? (
          <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhuma aula em {modalidadeLabel(filtro)} ainda.
          </div>
        ) : (
          filtrados.map((c) => (
            <div key={c.id} className="border border-border bg-card/30 p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[9px] px-2 py-0.5 uppercase tracking-widest font-bold border text-primary border-primary/40">
                      {modalidadeLabel(c.modalidade)}
                    </span>
                    {c.nivel && (
                      <span className="text-[9px] px-2 py-0.5 uppercase tracking-widest font-bold border text-muted-foreground border-border">
                        {c.nivel}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">#{c.ordem}</span>
                  </div>
                  <h3 className="font-semibold mt-1 truncate">{c.titulo}</h3>
                  {c.descricao && <p className="text-[11px] text-muted-foreground line-clamp-2">{c.descricao}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setPreviewId(previewId === c.id ? null : c.id)}>
                    <Play className="h-4 w-4 mr-1" /> {previewId === c.id ? "Fechar" : "Ver"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => editar(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remover(c)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {previewId === c.id && <div className="mt-3">{renderVideo(c.video_url, c.titulo)}</div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DojoVirtual;
