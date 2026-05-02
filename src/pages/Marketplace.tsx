import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Search, Sparkles, MapPin, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";

interface CoachCard {
  id: string;
  slug: string;
  nome: string;
  tagline: string | null;
  bio: string | null;
  foto_url: string | null;
  hero_url: string | null;
  especialidades: string[] | null;
  cidade: string | null;
  estado: string | null;
  permite_aula_avulsa: boolean | null;
  preco_aula_avulsa: number | null;
}

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [coaches, setCoaches] = useState<CoachCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [region, setRegion] = useState(searchParams.get("region") || "");

  const stateMap: Record<string, string> = {
    "acre": "AC", "alagoas": "AL", "amapa": "AP", "amazonas": "AM", "bahia": "BA", "ceara": "CE",
    "distrito federal": "DF", "espirito santo": "ES", "espírito santo": "ES", "goias": "GO", "goiás": "GO",
    "maranhao": "MA", "maranhão": "MA", "mato grosso": "MT", "mato grosso do sul": "MS", 
    "minas gerais": "MG", "para": "PA", "pará": "PA", "paraiba": "PB", "paraíba": "PB", 
    "parana": "PR", "paraná": "PR", "pernambuco": "PE", "piaui": "PI", "piauí": "PI", 
    "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS", 
    "rondonia": "RO", "rondônia": "RO", "roraima": "RR", "santa catarina": "SC",
    "sao paulo": "SP", "são paulo": "SP", "sergipe": "SE", "tocantins": "TO"
  };

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tenants")
      .select("id, slug, nome, tagline, bio, foto_url, hero_url, especialidades, cidade, estado, permite_aula_avulsa, preco_aula_avulsa")
      .eq("status", "approved")
      .order("nome");
    setCoaches((data as any[]) ?? []);
    setLoading(false);
  };

  const filtered = coaches.filter(
    (c) => {
      const qLower = q.toLowerCase().trim();
      const regionLower = region.toLowerCase().trim();
      
      const queryMatch = !qLower || 
        c.nome.toLowerCase().includes(qLower) ||
        (c.especialidades ?? []).some((e) => e.toLowerCase().includes(qLower));
      
      // Enhanced region filtering
      let regionMatch = !regionLower;
      
      if (regionLower) {
        const terms = regionLower.split(/[\s,.-]+/).filter(t => t.length > 0);
        
        regionMatch = terms.every(term => {
          const termStateAbbr = stateMap[term] || term;
          return (
            c.cidade?.toLowerCase().includes(term) ||
            c.estado?.toLowerCase().includes(term) ||
            c.estado?.toLowerCase() === termStateAbbr.toLowerCase()
          );
        });

        // Also check if the whole string matches state name or city
        const stateAbbrFromFull = stateMap[regionLower];
        if (!regionMatch && (stateAbbrFromFull || regionLower.length > 2)) {
          regionMatch = 
            (c.cidade?.toLowerCase().includes(regionLower)) ||
            (c.estado?.toLowerCase().includes(regionLower)) ||
            (c.estado?.toLowerCase() === stateAbbrFromFull?.toLowerCase());
        }
      }

      return queryMatch && regionMatch;
    }
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-2">
            <Link to="/seja-coach">
              <Button variant="ghost" className="text-foreground/80 hover:text-foreground">Seja um coach</Button>
            </Link>
            <Link to="/login">
              <Button className="bg-primary hover:bg-primary/90">Entrar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, hsl(var(--primary) / 0.4), transparent 50%), radial-gradient(circle at 70% 80%, hsl(var(--primary-glow) / 0.3), transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center md:px-8 md:py-28">
          <Badge className="mb-6 bg-primary/10 text-primary border border-primary/30">
            <Sparkles className="mr-1 h-3 w-3" /> Marketplace de coaches Elite
          </Badge>
          <h1 className="font-display text-5xl uppercase tracking-tight md:text-7xl">
            Escolha seu <span className="text-gradient-primary">coach</span>.<br />
            Transforme seu corpo.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Treinadores verificados, planos sob medida, IA pra acelerar seu resultado. Cinematográfico como Netflix.
          </p>

          <div className="mx-auto mt-8 flex flex-col md:flex-row max-w-3xl items-center gap-4">
            <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card/60 p-2 backdrop-blur-md w-full">
              <Search className="ml-3 h-5 w-5 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSearchParams(prev => {
                    if (e.target.value) prev.set("q", e.target.value);
                    else prev.delete("q");
                    return prev;
                  });
                }}
                placeholder="Buscar por nome ou especialidade..."
                className="border-0 bg-transparent focus-visible:ring-0"
              />
            </div>
            <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card/60 p-2 backdrop-blur-md w-full">
              <MapPin className="ml-3 h-5 w-5 text-muted-foreground" />
              <Input
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setSearchParams(prev => {
                    if (e.target.value) prev.set("region", e.target.value);
                    else prev.delete("region");
                    return prev;
                  });
                }}
                placeholder="Cidade ou Estado..."
                className="border-0 bg-transparent focus-visible:ring-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Grid de coaches */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
        <h2 className="mb-8 font-display text-3xl uppercase">Coaches em destaque</h2>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-card/60" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card/40 p-12 text-center">
            <p className="text-muted-foreground">Nenhum coach disponível ainda.</p>
            <Link to="/seja-coach">
              <Button className="mt-4 bg-primary hover:bg-primary/90">Seja o primeiro</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link
                to={`/${c.slug}`}
                key={c.id}
                className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card transition-all hover:border-primary/60 hover:shadow-glow"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
                  {c.hero_url || c.foto_url ? (
                    <img
                      src={c.hero_url || c.foto_url || ""}
                      alt={c.nome}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 to-zinc-900">
                      <span className="font-display text-6xl text-white/30">{c.nome.charAt(0)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display text-2xl uppercase text-white leading-none">{c.nome}</h3>
                      {c.permite_aula_avulsa && (
                        <Badge className="bg-primary text-[10px] font-bold uppercase px-1.5 py-0 h-4">Aula Avulsa</Badge>
                      )}
                    </div>
                    {c.tagline && <p className="mt-1 text-sm text-white/70 line-clamp-1">{c.tagline}</p>}
                    
                    <div className="mt-2 flex items-center gap-2 text-xs text-white/60">
                      {c.cidade && (
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          {c.cidade}{c.estado ? `, ${c.estado}` : ''}
                        </div>
                      )}
                    </div>

                    {c.especialidades && c.especialidades.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {c.especialidades.slice(0, 2).map((e) => (
                          <Badge key={e} variant="outline" className="border-primary/40 bg-primary/10 text-[10px] text-white py-0">
                            {e}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Consultoria</span>
                    <span className="text-sm font-bold">Ver planos</span>
                  </div>
                  {c.permite_aula_avulsa && c.preco_aula_avulsa && (
                    <div className="flex flex-col items-end border-l border-border/50 pl-4">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Aula Avulsa</span>
                      <span className="text-sm font-bold text-primary">R$ {c.preco_aula_avulsa}</span>
                    </div>
                  )}
                  <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
