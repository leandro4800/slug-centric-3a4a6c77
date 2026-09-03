import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { GraduationCap, Plus, Loader2, Trash2, Save, Play, Pencil, Upload, Link2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { buildVlogEmbedUrl, normalizeVideoUrl } from "@/lib/video-embed";
import { isDirectVideo } from "@/lib/utils";
import { FIGHT_MODALIDADES, FIGHT_NIVEIS, modalidadeLabel } from "@/lib/fightModalidades";
import { dojoThumb } from "@/lib/dojo-thumb";

type Conteudo = {
  id: string;
  tenant_id: string;
  modalidade: string;
  titulo: string;
  descricao: string | null;
  video_url: string;
  capa_url: string | null;
  categoria: string | null;
  nivel: string | null;
  ordem: number;
};

const STORAGE_BUCKET = "comunidade_uploads";

/** Sugestões de "posições"/trilhas por modalidade — o coach pode digitar qualquer outra. */
const CATEGORIAS_SUGERIDAS: Record<string, string[]> = {
  bjj: ["Guarda fechada", "Guarda aberta", "Passagem de guarda", "Raspagens", "Finalizações", "Montada", "Costas", "Defesa pessoal"],
  muay_thai: ["Socos", "Chutes", "Joelhos", "Cotoveladas", "Clinch", "Esquivas & defesas", "Combinações"],
  boxe: ["Jab & direto", "Ganchos & uppercuts", "Footwork", "Defesa & esquiva", "Combinações", "Sparring"],
  mma: ["Trocação", "Wrestling / quedas", "Ground and pound", "Jogo de grade", "Finalizações", "Defesa de quedas"],
};

const emptyForm = {
  modalidade: "bjj",
  titulo: "",
  descricao: "",
  video_url: "",
  capa_url: "",
  categoria: "",
  nivel: "",
  ordem: "0",
};

const DojoVirtual = () => {
  const { tenant } = useSiteTenant();
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Conteudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>("bjj");
  const [filtroNivel, setFiltroNivel] = useState<string>("todos");
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
      .select("id, tenant_id, modalidade, titulo, descricao, video_url, capa_url, categoria, nivel, ordem")
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

  const filtrados = useMemo(
    () =>
      rows
        .filter((r) => r.modalidade === filtro)
        .filter((r) => filtroNivel === "todos" || (r.nivel || "") === filtroNivel),
    [rows, filtro, filtroNivel],
  );

  /** Agrupa por categoria (posição) para o coach ver as trilhas como o aluno verá. */
  const grupos = useMemo(() => {
    const map = new Map<string, Conteudo[]>();
    filtrados.forEach((r) => {
      const k = (r.categoria || "Sem posição").trim();
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    for (const [, itens] of map)
      itens.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.titulo.localeCompare(b.titulo));
    return Array.from(map.entries());
  }, [filtrados]);

  const uploadArquivo = async (file: File, pasta: "dojo" | "dojo-capas") => {
    if (!userId) throw new Error("Usuário não autenticado");
    const ext = file.name.split(".").pop() || "mp4";
    const path = `${userId}/${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
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

  const abrirNovo = () => {
    setForm({ ...emptyForm, modalidade: filtro });
    setArquivo(null);
    setModo("link");
    setEditId(null);
    setShowForm(true);
  };

  const salvar = async () => {
    if (!tenant?.id || !userId) return;
    if (!form.titulo.trim()) return toast.error("Informe o título da aula");
    if (modo === "link" && !form.video_url.trim() && !editId) return toast.error("Informe a URL do vídeo");
    if (modo === "upload" && !arquivo && !editId) return toast.error("Selecione um arquivo");

    try {
      setSaving(true);
      let url = form.video_url.trim();
      if (modo === "upload" && arquivo) url = await uploadArquivo(arquivo, "dojo");
      if (!url) return toast.error("Vídeo obrigatório");

      const payload = {
        tenant_id: tenant.id,
        modalidade: form.modalidade,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        video_url: url,
        capa_url: form.capa_url.trim() || null,
        categoria: form.categoria.trim() || null,
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

  const enviarCapa = async (file: File) => {
    try {
      const url = await uploadArquivo(file, "dojo-capas");
      setForm((f) => ({ ...f, capa_url: url }));
      toast.success("Capa enviada");
    } catch (e: any) {
      toast.error("Erro no upload da capa: " + e.message);
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
      capa_url: c.capa_url ?? "",
      categoria: c.categoria ?? "",
      nivel: c.nivel ?? "",
      ordem: String(c.ordem ?? 0),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const sugestoes = CATEGORIAS_SUGERIDAS[form.modalidade] ?? [];

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      <div className="flex items-center gap-2 text-primary/80">
        <GraduationCap className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Luta</span>
      </div>
      <h1 className="font-display text-2xl md:text-3xl mt-1">Dojo Virtual</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Publique vídeo-aulas do seu CT organizadas por modalidade, nível e posição. O aluno vê tudo como uma área de
        membros.
      </p>

      <Button className="mt-4 w-full md:w-auto" onClick={() => (showForm ? resetForm() : abrirNovo())}>
        <Plus className="h-4 w-4 mr-2" /> {showForm ? "Fechar" : "Nova aula"}
      </Button>

      <div className="mt-4 flex flex-wrap gap-2">
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
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {["todos", ...FIGHT_NIVEIS].map((n) => (
          <button
            key={n}
            onClick={() => setFiltroNivel(n)}
            className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold border transition-all ${
              filtroNivel === n
                ? "border-primary text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {n === "todos" ? "Todos os níveis" : n}
          </button>
        ))}
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
              <Label className="text-xs">Nível</Label>
              <select
                value={form.nivel}
                onChange={(e) => setForm((f) => ({ ...f, nivel: e.target.value }))}
                className="w-full bg-card border border-border px-3 py-2 text-sm mt-1"
              >
                <option value="">Visível para todos os níveis</option>
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
            <Label className="text-xs">Posição / categoria</Label>
            <Input
              list="dojo-categorias"
              value={form.categoria}
              onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
              placeholder="Ex: Guarda fechada, Clinch, Passagem de guarda"
              className="mt-1"
            />
            <datalist id="dojo-categorias">
              {sugestoes.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {sugestoes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, categoria: s }))}
                  className="px-2 py-1 text-[10px] uppercase tracking-widest border border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Título da aula</Label>
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

          <div>
            <Label className="text-xs flex items-center gap-1">
              <ImageIcon className="h-3 w-3" /> Capa (opcional)
            </Label>
            <div className="grid md:grid-cols-[1fr_auto] gap-2 mt-1">
              <Input
                placeholder="URL da imagem de capa"
                value={form.capa_url}
                onChange={(e) => setForm((f) => ({ ...f, capa_url: e.target.value }))}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void enviarCapa(f);
                }}
                className="text-xs"
              />
            </div>
            {dojoThumb(form.capa_url, form.video_url) && (
              <img
                src={dojoThumb(form.capa_url, form.video_url)!}
                alt="Prévia da capa"
                className="mt-2 h-24 w-40 object-cover border border-border"
              />
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              Deixe em branco para usar automaticamente a miniatura do YouTube do vídeo.
            </p>
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

      <div className="mt-6 space-y-6">
        {loading ? (
          <p className="text-muted-foreground animate-pulse">Carregando Dojo...</p>
        ) : filtrados.length === 0 ? (
          <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhuma aula em {modalidadeLabel(filtro)} ainda. Clique em “Nova aula” para publicar a primeira.
          </div>
        ) : (
          grupos.map(([categoria, itens]) => (
            <div key={categoria}>
              <h2 className="font-display text-lg uppercase tracking-tight mb-2">
                {categoria} <span className="text-xs text-muted-foreground">({itens.length})</span>
              </h2>
              <div className="space-y-3">
                {itens.map((c) => (
                  <div key={c.id} className="border border-border bg-card/30 p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      {dojoThumb(c.capa_url, c.video_url) && (
                        <img
                          src={dojoThumb(c.capa_url, c.video_url)!}
                          alt={c.titulo}
                          loading="lazy"
                          className="h-16 w-28 object-cover border border-border shrink-0"
                        />
                      )}
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
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DojoVirtual;
