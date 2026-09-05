import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding, type Tenant } from "@/contexts/BrandingProvider";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Loader2,
  Plus,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  FileText,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { buildYouTubeEmbedUrl, YOUTUBE_IFRAME_ALLOW, YOUTUBE_IFRAME_REFERRER_POLICY } from "@/lib/youtube-embed";
import { extractYouTubeId } from "@/lib/utils";

interface Assunto {
  id: string;
  tenant_id: string;
  titulo: string;
  categoria: string;
  capa_url: string | null;
  descricao: string | null;
  conteudo_texto: string | null;
  pdf_url: string | null;
  youtube_url: string | null;
  video_url: string | null;
  ordem: number;
  publicado: boolean;
}

const emptyForm = {
  id: "",
  titulo: "",
  categoria: "",
  capa_url: "",
  descricao: "",
  conteudo_texto: "",
  pdf_url: "",
  youtube_url: "",
  video_url: "",
};

const Biblioteca = () => {
  const { tenant } = useBranding();
  const { user, hasRole } = useAuth();
  const [assuntos, setAssuntos] = useState<Assunto[]>([]);
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState<Assunto | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const capaRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const isCoach =
    !!tenant &&
    !!user &&
    (hasRole("admin") || hasRole("coach", tenant.id) || (tenant as any).owner_user_id === user.id);

  const load = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("biblioteca_assuntos")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("categoria")
      .order("ordem")
      .order("created_at");
    if (error) toast.error("Não foi possível carregar a biblioteca.");
    setAssuntos((data as Assunto[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  const categorias = useMemo(() => {
    const map = new Map<string, Assunto[]>();
    for (const a of assuntos) {
      const cat = a.categoria || "Geral";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(a);
    }
    return [...map.entries()];
  }, [assuntos]);

  const categoriasExistentes = useMemo(
    () => [...new Set(assuntos.map((a) => a.categoria).filter(Boolean))],
    [assuntos]
  );

  const upload = async (file: File, campo: "capa_url" | "pdf_url" | "video_url") => {
    if (!tenant?.id) return;
    setUploading(campo);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${tenant.id}/biblioteca/${campo}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("coaches").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("coaches").getPublicUrl(path);
      setForm((f) => ({ ...f, [campo]: data.publicUrl }));
      toast.success("Arquivo enviado.");
    } catch (e: any) {
      toast.error(e.message || "Falha ao enviar arquivo.");
    } finally {
      setUploading(null);
    }
  };

  const abrirNovo = () => {
    setForm({ ...emptyForm });
    setEditorOpen(true);
  };

  const abrirEdicao = (a: Assunto) => {
    setForm({
      id: a.id,
      titulo: a.titulo,
      categoria: a.categoria || "",
      capa_url: a.capa_url || "",
      descricao: a.descricao || "",
      conteudo_texto: a.conteudo_texto || "",
      pdf_url: a.pdf_url || "",
      youtube_url: a.youtube_url || "",
      video_url: a.video_url || "",
    });
    setEditorOpen(true);
  };

  const salvar = async () => {
    if (!tenant?.id) return;
    if (!form.titulo.trim()) {
      toast.error("Informe o título do assunto.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenant.id,
        titulo: form.titulo.trim(),
        categoria: form.categoria.trim() || "Geral",
        capa_url: form.capa_url || null,
        descricao: form.descricao || null,
        conteudo_texto: form.conteudo_texto || null,
        pdf_url: form.pdf_url || null,
        youtube_url: form.youtube_url || null,
        video_url: form.video_url || null,
      };
      if (form.id) {
        const { error } = await (supabase as any)
          .from("biblioteca_assuntos")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const ordem =
          assuntos.filter((a) => a.categoria === payload.categoria).length;
        const { error } = await (supabase as any)
          .from("biblioteca_assuntos")
          .insert({ ...payload, ordem });
        if (error) throw error;
      }
      toast.success("Assunto salvo.");
      setEditorOpen(false);
      void load();
    } catch (e: any) {
      toast.error(e.message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const excluir = async (a: Assunto) => {
    if (!confirm(`Excluir "${a.titulo}"?`)) return;
    const { error } = await (supabase as any).from("biblioteca_assuntos").delete().eq("id", a.id);
    if (error) return toast.error("Não foi possível excluir.");
    toast.success("Assunto excluído.");
    void load();
  };

  const mover = async (a: Assunto, dir: -1 | 1) => {
    const lista = assuntos.filter((x) => x.categoria === a.categoria);
    const idx = lista.findIndex((x) => x.id === a.id);
    const alvo = lista[idx + dir];
    if (!alvo) return;
    await Promise.all([
      (supabase as any).from("biblioteca_assuntos").update({ ordem: alvo.ordem ?? idx + dir }).eq("id", a.id),
      (supabase as any).from("biblioteca_assuntos").update({ ordem: a.ordem ?? idx }).eq("id", alvo.id),
    ]);
    void load();
  };

  return (
    <div className="pb-28">
      <div className="px-4 pt-6 pb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Conteúdo</p>
          <h1 className="font-display text-3xl uppercase italic tracking-tighter flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" /> Biblioteca
          </h1>
        </div>
        {isCoach && (
          <Button size="sm" onClick={abrirNovo} className="gap-1">
            <Plus className="h-4 w-4" /> Novo assunto
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : assuntos.length === 0 ? (
        <div className="mx-4 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {isCoach
              ? "Nenhum assunto criado ainda. Toque em “Novo assunto” para começar."
              : "Seu coach ainda não publicou conteúdos aqui."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {categorias.map(([cat, itens]) => (
            <section key={cat}>
              <h2 className="px-4 mb-3 font-display text-lg uppercase italic tracking-tight">{cat}</h2>
              <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x">
                {itens.map((a) => (
                  <div key={a.id} className="flex-shrink-0 w-44 snap-start">
                    <button
                      onClick={() => setAberto(a)}
                      className="group relative block w-44 h-60 overflow-hidden rounded-xl border border-border transition-transform hover:scale-[1.03] hover:border-primary/60 text-left"
                    >
                      {a.capa_url ? (
                        <img src={a.capa_url} alt={a.titulo} className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-zinc-700" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="font-display text-sm uppercase italic tracking-tight text-white leading-tight line-clamp-3">
                          {a.titulo}
                        </h3>
                      </div>
                    </button>
                    {isCoach && (
                      <div className="mt-1 flex items-center gap-0.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => mover(a, -1)}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => mover(a, 1)}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => abrirEdicao(a)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => excluir(a)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Leitura do assunto */}
      <Dialog open={!!aberto} onOpenChange={(o) => !o && setAberto(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wider text-base">
              {aberto?.titulo}
            </DialogTitle>
          </DialogHeader>
          {aberto?.descricao && <p className="text-sm text-muted-foreground">{aberto.descricao}</p>}
          {aberto?.youtube_url && extractYouTubeId(aberto.youtube_url) && (
            <div className="relative w-full overflow-hidden rounded-lg bg-black aspect-video">
              <iframe
                src={buildYouTubeEmbedUrl(extractYouTubeId(aberto.youtube_url)!)}
                title={aberto.titulo}
                className="absolute inset-0 h-full w-full"
                allow={YOUTUBE_IFRAME_ALLOW}
                referrerPolicy={YOUTUBE_IFRAME_REFERRER_POLICY}
                allowFullScreen
              />
            </div>
          )}
          {aberto?.video_url && (
            <video src={aberto.video_url} controls playsInline className="w-full rounded-lg bg-black" />
          )}
          {aberto?.conteudo_texto && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{aberto.conteudo_texto}</p>
          )}
          {aberto?.pdf_url && (
            <a
              href={aberto.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary"
            >
              <FileText className="h-4 w-4 text-primary" /> Abrir PDF
            </a>
          )}
        </DialogContent>
      </Dialog>

      {/* Editor do coach */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wider text-base">
              {form.id ? "Editar assunto" : "Novo assunto"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Imagem de capa</Label>
              <div className="mt-1 flex items-center gap-3">
                {form.capa_url ? (
                  <img src={form.capa_url} alt="Capa" className="h-20 w-14 rounded object-cover border border-border" />
                ) : (
                  <div className="h-20 w-14 rounded border border-dashed border-border flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <input
                  ref={capaRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "capa_url")}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => capaRef.current?.click()} disabled={uploading === "capa_url"}>
                  {uploading === "capa_url" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Escolher imagem"}
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Título</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="mt-1" />
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Categoria</Label>
              <Input
                list="biblioteca-categorias"
                placeholder="Ex: Técnicas, Nutrição, Mobilidade..."
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="mt-1"
              />
              <datalist id="biblioteca-categorias">
                {categoriasExistentes.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Texto</Label>
              <Textarea
                className="min-h-[120px] text-sm mt-1"
                placeholder="Explicação escrita..."
                value={form.conteudo_texto}
                onChange={(e) => setForm({ ...form, conteudo_texto: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Link do YouTube</Label>
              <Input
                placeholder="https://youtube.com/..."
                value={form.youtube_url}
                onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">PDF</Label>
                <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "pdf_url")} />
                <Button type="button" variant="outline" size="sm" className="mt-1 w-full" onClick={() => pdfRef.current?.click()} disabled={uploading === "pdf_url"}>
                  {uploading === "pdf_url" ? <Loader2 className="h-4 w-4 animate-spin" /> : form.pdf_url ? "Trocar PDF" : "Enviar PDF"}
                </Button>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Vídeo próprio</Label>
                <input ref={videoRef} type="file" accept="video/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "video_url")} />
                <Button type="button" variant="outline" size="sm" className="mt-1 w-full" onClick={() => videoRef.current?.click()} disabled={uploading === "video_url"}>
                  {uploading === "video_url" ? <Loader2 className="h-4 w-4 animate-spin" /> : form.video_url ? "Trocar vídeo" : "Enviar vídeo"}
                </Button>
              </div>
            </div>

            <Button onClick={salvar} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar assunto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Biblioteca;
