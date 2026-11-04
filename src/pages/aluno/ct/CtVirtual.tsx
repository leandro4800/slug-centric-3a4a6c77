import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GraduationCap, Loader2, Play, Swords, Settings2, Check } from "lucide-react";
import { toast } from "sonner";
import ExercisePlayer from "@/components/aluno/ExercisePlayer";
import { FIGHT_MODALIDADES, FIGHT_NIVEIS, modalidadeLabel } from "@/lib/fightModalidades";
import { dojoThumb } from "@/lib/dojo-thumb";
import CtHome from "./CtHome";

type Nivel = (typeof FIGHT_NIVEIS)[number];
type Escolha = { modalidade: string; nivel: Nivel };
type Conteudo = {
  id: string; titulo: string; descricao: string | null; video_url: string;
  capa_url: string | null; categoria: string | null; nivel: string | null; ordem: number;
};

const EMOJI: Record<string, string> = { bjj: "🥋", muay_thai: "🦵", kickboxing: "🥊", boxe: "🥊", mma: "🤼" };
const NIVEL_LABEL: Record<Nivel, string> = { iniciante: "Iniciante", intermediario: "Intermediário", avancado: "Avançado" };
const nivelRank = (n?: string | null) => {
  const v = (n || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const i = FIGHT_NIVEIS.indexOf(v as Nivel);
  return i;
};

const Seletor = ({ inicial, onSave, saving, primeiro }: {
  inicial: Escolha[]; onSave: (e: Escolha[]) => void; saving: boolean; primeiro: boolean;
}) => {
  const [sel, setSel] = useState<Record<string, Nivel>>(
    Object.fromEntries(inicial.map((e) => [e.modalidade, e.nivel])),
  );
  const toggle = (slug: string) =>
    setSel((s) => {
      const n = { ...s };
      if (n[slug]) delete n[slug]; else n[slug] = "iniciante";
      return n;
    });
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl uppercase italic tracking-tight">Quais lutas você treina?</h2>
        <p className="text-xs text-muted-foreground mt-1">Marque uma ou mais modalidades e escolha seu nível.</p>
      </div>
      <div className="space-y-2">
        {FIGHT_MODALIDADES.map((m) => {
          const ativo = !!sel[m.slug];
          return (
            <Card key={m.slug} className={`rounded-none p-3 border transition-colors ${ativo ? "border-primary bg-primary/10" : "border-border bg-card/60"}`}>
              <button type="button" onClick={() => toggle(m.slug)} className="w-full flex items-center gap-3 text-left">
                <span className="text-2xl">{EMOJI[m.slug] ?? "🥊"}</span>
                <span className="flex-1 font-display uppercase tracking-wide">{m.label}</span>
                <span className={`h-5 w-5 border flex items-center justify-center ${ativo ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"}`}>
                  {ativo && <Check className="h-3.5 w-3.5" />}
                </span>
              </button>
              {ativo && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {FIGHT_NIVEIS.map((n) => (
                    <Button key={n} type="button" size="sm" variant={sel[m.slug] === n ? "default" : "outline"}
                      className="rounded-none text-[10px] uppercase tracking-wider"
                      onClick={() => setSel((s) => ({ ...s, [m.slug]: n }))}>
                      {NIVEL_LABEL[n]}
                    </Button>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <Button className="w-full rounded-none font-bold uppercase tracking-widest"
        disabled={saving || Object.keys(sel).length === 0}
        onClick={() => onSave(Object.entries(sel).map(([modalidade, nivel]) => ({ modalidade, nivel })))}>
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {primeiro ? "Entrar no CT" : "Salvar"}
      </Button>
    </div>
  );
};

const AulasModalidade = ({ tenantId, modalidade, nivel }: { tenantId: string; modalidade: string; nivel: Nivel }) => {
  const [todos, setTodos] = useState(false);
  const [video, setVideo] = useState<Conteudo | null>(null);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["ct-virtual-aulas", tenantId, modalidade],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dojo_conteudos")
        .select("id, titulo, descricao, video_url, capa_url, categoria, nivel, ordem")
        .eq("tenant_id", tenantId)
        .eq("modalidade", modalidade)
        .order("ordem", { ascending: true })
        .order("titulo");
      if (error) throw error;
      return (data as Conteudo[]) ?? [];
    },
  });

  const trilhas = useMemo(() => {
    const max = FIGHT_NIVEIS.indexOf(nivel);
    const vis = todos ? rows : rows.filter((r) => !r.nivel || nivelRank(r.nivel) <= max);
    const map = new Map<string, Conteudo[]>();
    vis.forEach((r) => {
      const k = (r.categoria || "Aulas do CT").trim();
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    return Array.from(map.entries());
  }, [rows, todos, nivel]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Seu nível: <span className="text-primary font-bold">{NIVEL_LABEL[nivel]}</span></p>
        <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          Mostrar todos os níveis <Switch checked={todos} onCheckedChange={setTodos} />
        </label>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : trilhas.length === 0 ? (
        <Card className="rounded-none p-8 text-center bg-card/60 border-border">
          <GraduationCap className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Seu coach ainda não publicou aulas de {modalidadeLabel(modalidade)}.</p>
        </Card>
      ) : (
        trilhas.map(([trilha, itens]) => (
          <section key={trilha}>
            <h3 className="font-display text-base uppercase italic tracking-tight mb-2">
              {trilha} <span className="text-[10px] not-italic text-muted-foreground">{itens.length} aulas</span>
            </h3>
            <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
              <div className="flex gap-3 min-w-max pb-2">
                {itens.map((c) => {
                  const thumb = dojoThumb(c.capa_url, c.video_url);
                  return (
                    <button key={c.id} onClick={() => setVideo(c)} className="w-40 shrink-0 text-left group">
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-none border border-border bg-card">
                        {thumb ? (
                          <img src={thumb} alt={c.titulo} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center"><Play className="h-8 w-8 text-primary/70 fill-primary/70" /></div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent p-2">
                          {c.nivel && <span className="text-[8px] uppercase tracking-widest text-primary font-bold">{c.nivel}</span>}
                          <p className="text-[11px] font-bold uppercase leading-tight line-clamp-2">{c.titulo}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        ))
      )}
      <Dialog open={!!video} onOpenChange={(o) => !o && setVideo(null)}>
        <DialogContent className="max-w-2xl p-0 rounded-none bg-background border-border">
          <div className="relative w-full aspect-video">
            {video && <ExercisePlayer videoUrl={video.video_url} exerciseName={video.titulo} showPlayButton={false} />}
          </div>
          {video && (
            <div className="p-4 pt-0">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">
                {video.categoria || "CT Virtual"} {video.nivel ? `· ${video.nivel}` : ""}
              </p>
              <h3 className="font-display text-lg uppercase italic tracking-tight">{video.titulo}</h3>
              {video.descricao && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{video.descricao}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CtVirtual = () => {
  const { user } = useAuth();
  const { tenant } = useBranding();
  const qc = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [aba, setAba] = useState<string | null>(null);
  const tenantId = tenant?.id;

  const { data: escolhas = [], isLoading } = useQuery({
    queryKey: ["aluno-modalidades-luta", user?.id, tenantId],
    enabled: !!user?.id && !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aluno_modalidades_luta" as any)
        .select("modalidade, nivel")
        .eq("aluno_id", user!.id)
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      const order = FIGHT_MODALIDADES.map((m) => m.slug as string);
      return ((data as unknown as Escolha[]) ?? []).sort((a, b) => order.indexOf(a.modalidade) - order.indexOf(b.modalidade));
    },
  });

  const salvar = useMutation({
    mutationFn: async (novas: Escolha[]) => {
      const remover = escolhas.filter((e) => !novas.some((n) => n.modalidade === e.modalidade)).map((e) => e.modalidade);
      if (remover.length) {
        const { error } = await supabase.from("aluno_modalidades_luta" as any).delete()
          .eq("aluno_id", user!.id).in("modalidade", remover);
        if (error) throw error;
      }
      const { error } = await supabase.from("aluno_modalidades_luta" as any).upsert(
        novas.map((n) => ({ aluno_id: user!.id, tenant_id: tenantId!, modalidade: n.modalidade, nivel: n.nivel })) as any,
        { onConflict: "aluno_id,modalidade" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lutas salvas");
      setEditando(false);
      qc.invalidateQueries({ queryKey: ["aluno-modalidades-luta"] });
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível salvar"),
  });

  if (isLoading || !tenantId) {
    return <div className="flex justify-center pt-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (escolhas.length === 0 || editando) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl uppercase italic tracking-tight">CT Virtual</h1>
        </div>
        <Seletor inicial={escolhas} primeiro={escolhas.length === 0} saving={salvar.isPending} onSave={(e) => salvar.mutate(e)} />
        {editando && (
          <Button variant="ghost" className="w-full rounded-none" onClick={() => setEditando(false)}>Cancelar</Button>
        )}
      </div>
    );
  }

  const abaAtual = aba && (aba === "preparacao" || escolhas.some((e) => e.modalidade === aba)) ? aba : escolhas[0].modalidade;
  const escolhaAtual = escolhas.find((e) => e.modalidade === abaAtual);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="p-4 pb-2 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" />
            <h1 className="font-display text-2xl uppercase italic tracking-tight">CT Virtual</h1>
          </div>
          <Button size="sm" variant="ghost" className="rounded-none text-[10px] uppercase tracking-widest text-muted-foreground" onClick={() => setEditando(true)}>
            <Settings2 className="h-3.5 w-3.5 mr-1" /> Minhas lutas
          </Button>
        </div>
        <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 min-w-max pb-1">
            {[...escolhas.map((e) => ({ id: e.modalidade, label: modalidadeLabel(e.modalidade) })), { id: "preparacao", label: "Preparação" }].map((t) => (
              <Button key={t.id} size="sm" variant={abaAtual === t.id ? "default" : "outline"}
                className="rounded-none text-[11px] font-bold uppercase tracking-widest"
                onClick={() => setAba(t.id)}>
                {t.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      {abaAtual === "preparacao" ? (
        <CtHome />
      ) : (
        <div className="p-4 pt-2">
          <AulasModalidade key={abaAtual} tenantId={tenantId} modalidade={abaAtual} nivel={(escolhaAtual?.nivel as Nivel) ?? "iniciante"} />
        </div>
      )}
    </div>
  );
};

export default CtVirtual;
