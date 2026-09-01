import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GraduationCap, Loader2, Play, Search } from "lucide-react";
import ExercisePlayer from "@/components/aluno/ExercisePlayer";
import { modalidadeLabel } from "@/lib/fightModalidades";

type Conteudo = {
  id: string;
  titulo: string;
  descricao: string | null;
  video_url: string;
  capa_url: string | null;
  categoria: string | null;
  nivel: string | null;
  ordem: number;
};

/** Área de membros do CT (estilo Netflix): trilhas por posição, filtro por nível. */
const FightDojoView = ({ modalidade }: { modalidade: string }) => {
  const [rows, setRows] = useState<Conteudo[]>([]);
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<Conteudo | null>(null);
  const [nivelFiltro, setNivelFiltro] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("dojo_conteudos")
        .select("id, titulo, descricao, video_url, capa_url, categoria, nivel, ordem")
        .eq("modalidade", modalidade)
        .order("ordem");
      setRows((data as Conteudo[]) ?? []);
      setLoading(false);
    })();
  }, [modalidade]);

  const niveis = useMemo(
    () => Array.from(new Set(rows.map((r) => r.nivel).filter(Boolean) as string[])),
    [rows],
  );

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows
      .filter((r) => (nivelFiltro === "todos" ? true : (r.nivel ?? "") === nivelFiltro || !r.nivel))
      .filter((r) =>
        !q
          ? true
          : `${r.titulo} ${r.descricao ?? ""} ${r.categoria ?? ""}`.toLowerCase().includes(q),
      );
  }, [rows, nivelFiltro, busca]);

  const trilhas = useMemo(() => {
    const map = new Map<string, Conteudo[]>();
    visiveis.forEach((r) => {
      const k = (r.categoria || "Aulas do CT").trim();
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    return Array.from(map.entries());
  }, [visiveis]);

  const destaque = visiveis[0] ?? null;

  return (
    <div className="space-y-5">
      <div className="px-1">
        <h2 className="font-display text-lg uppercase italic tracking-tight flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          Dojo Virtual · {modalidadeLabel(modalidade)}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Sua área de membros: técnica e metodologia do seu CT, por posição e nível.
        </p>
      </div>

      {/* Destaque */}
      {destaque && (
        <button
          onClick={() => setVideo(destaque)}
          className="w-full relative overflow-hidden rounded-2xl border border-white/10 text-left group"
        >
          <div className="aspect-[16/9] w-full bg-gradient-to-br from-zinc-900 via-black to-red-950/40">
            {destaque.capa_url && (
              <img
                src={destaque.capa_url}
                alt={destaque.titulo}
                loading="lazy"
                className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">
              {destaque.categoria || "Em destaque"}
            </p>
            <h3 className="font-display text-xl uppercase italic tracking-tight leading-tight">{destaque.titulo}</h3>
            <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-primary-foreground">
              <Play className="h-3.5 w-3.5 fill-current" /> Assistir
            </span>
          </div>
        </button>
      )}

      {/* Filtros */}
      <div className="space-y-2 px-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar posição ou técnica"
            className="w-full rounded-full border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/50"
          />
        </div>
        {niveis.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {["todos", ...niveis].map((n) => (
              <button
                key={n}
                onClick={() => setNivelFiltro(n)}
                className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  nivelFiltro === n
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-white/10 bg-black/40 text-muted-foreground"
                }`}
              >
                {n === "todos" ? "Todos os níveis" : n}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : visiveis.length === 0 ? (
        <Card className="p-8 text-center bg-card/60 backdrop-blur border-white/5">
          <GraduationCap className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhuma aula publicada para {modalidadeLabel(modalidade)} ainda.
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">Seu técnico logo publicará conteúdo aqui.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {trilhas.map(([trilha, itens]) => (
            <section key={trilha}>
              <h3 className="px-1 font-display text-base uppercase italic tracking-tight mb-2">
                {trilha} <span className="text-[10px] not-italic text-muted-foreground">{itens.length} aulas</span>
              </h3>
              <div className="-mx-4 px-4 overflow-x-auto scrollbar-none">
                <div className="flex gap-3 min-w-max pb-2">
                  {itens.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setVideo(c)}
                      className="w-40 shrink-0 text-left group"
                    >
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black">
                        {c.capa_url ? (
                          <img
                            src={c.capa_url}
                            alt={c.titulo}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Play className="h-8 w-8 text-primary/70 fill-primary/70" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black to-transparent p-2">
                          {c.nivel && (
                            <span className="text-[8px] uppercase tracking-widest text-primary font-bold">{c.nivel}</span>
                          )}
                          <p className="text-[11px] font-bold uppercase leading-tight line-clamp-2">{c.titulo}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      <Dialog open={!!video} onOpenChange={(o) => !o && setVideo(null)}>
        <DialogContent className="max-w-2xl p-0 bg-black border-white/10">
          <div className="relative w-full aspect-video">
            {video && <ExercisePlayer videoUrl={video.video_url} exerciseName={video.titulo} showPlayButton={false} />}
          </div>
          {video && (
            <div className="p-4 pt-0">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">
                {video.categoria || "Dojo"} {video.nivel ? `· ${video.nivel}` : ""}
              </p>
              <h3 className="font-display text-lg uppercase italic tracking-tight">{video.titulo}</h3>
              {video.descricao && (
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{video.descricao}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FightDojoView;
