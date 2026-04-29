import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Search, Users, Mail } from "lucide-react";

interface Aluno {
  id: string;
  nome_completo: string | null;
  email: string | null;
  avatar_url: string | null;
}

// Paleta inspirada na referência (cada inicial em uma cor neon)
const NEON_COLORS = [
  "#F5C518", // amarelo
  "#22D3EE", // ciano
  "#A78BFA", // roxo claro
  "#F472B6", // rosa
  "#34D399", // verde
  "#60A5FA", // azul
  "#FB923C", // laranja
  "#E11D48", // vermelho/rosa
];

const colorFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return NEON_COLORS[h % NEON_COLORS.length];
};

const getInitials = (a: Aluno) => {
  const src = (a.nome_completo || a.email || "?").trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
};

const MeusAtletas = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { tenant } = useBranding();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!tenant) return;
    void load(tenant.id);
  }, [tenant]);

  const load = async (tenantId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("perfis")
      .select("id, nome_completo, email, avatar_url")
      .eq("tenant_id", tenantId)
      .order("nome_completo", { ascending: true });
    setAlunos((data as Aluno[]) || []);
    setLoading(false);
  };

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return alunos;
    return alunos.filter(
      (a) =>
        (a.nome_completo || "").toLowerCase().includes(t) ||
        (a.email || "").toLowerCase().includes(t),
    );
  }, [alunos, q]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center gap-3 sticky top-0 bg-background/95 backdrop-blur z-10">
        <button
          onClick={() => navigate(`/${slug}/app`)}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="w-11 h-11 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl leading-none truncate">MEUS ATLETAS</h1>
          <p className="text-[10px] uppercase tracking-widest text-primary mt-1">
            {filtrados.length} {filtrados.length === 1 ? "atleta" : "atletas"}
          </p>
        </div>
      </header>

      {/* Search */}
      <div className="px-5 pb-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar atleta..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 bg-secondary/60 border-border"
          />
        </div>
      </div>

      <main className="px-5 pb-16">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">Nenhum atleta encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtrados.map((a) => {
              const color = colorFor(a.id);
              const initials = getInitials(a);
              const hasPhoto = !!a.avatar_url;
              return (
                <Link
                  key={a.id}
                  to={`/${slug}/admin/atleta/${a.id}`}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-secondary/40 border border-border hover:border-primary/60 transition-colors"
                >
                  {/* Badge AGENDADO */}
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                      Agendado
                    </span>
                    <span className="w-5 h-5 rounded-full bg-primary/90 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                    </span>
                  </div>

                  {/* Conteúdo central: foto ou iniciais */}
                  {hasPhoto ? (
                    <img
                      src={a.avatar_url!}
                      alt={a.nome_completo || ""}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="font-display text-6xl md:text-7xl tracking-tight"
                        style={{
                          color,
                          textShadow: `0 0 18px ${color}55`,
                        }}
                      >
                        {initials}
                      </span>
                    </div>
                  )}

                  {/* Overlay inferior com nome */}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {a.nome_completo || "Sem nome"}
                    </p>
                    {a.email && (
                      <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <Mail className="h-2.5 w-2.5" /> {a.email}
                      </p>
                    )}
                  </div>

                  {/* Indicador inferior direito */}
                  <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-background/70 backdrop-blur flex items-center justify-center border border-border/60">
                    <span className="block w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!loading && (
          <div className="mt-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => tenant && load(tenant.id)}
            >
              Atualizar lista
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default MeusAtletas;
