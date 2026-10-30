import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Activity, ArrowUpRight, Camera, Dumbbell, Loader2, RefreshCw, Scale, UserRound, Utensils } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EvolutionChart } from "@/components/aluno/evolucao/EvolutionChart";
import workoutImage from "@/assets/card-treino.jpg";
import dietImage from "@/assets/card-dieta.jpg";
import evolutionImage from "@/assets/card-evolucao.jpg";

const features = [
  { title: "Minha evolução", path: "evolucao", image: evolutionImage, icon: Activity },
  { title: "Meu treino", path: "treino", image: workoutImage, icon: Dumbbell },
  { title: "Minha dieta", path: "dieta", image: dietImage, icon: Utensils },
];

export default function AtletaDashboard() {
  const { user } = useAuth();
  const { tenant } = useBranding();
  const { slug } = useParams();
  const base = `/${slug}/atleta`;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["athlete-panel", user?.id, tenant?.id],
    enabled: !!user?.id && !!tenant?.id,
    queryFn: async () => {
      if (!user) throw new Error("Sessão indisponível");
      const [profile, checkins] = await Promise.all([
        supabase.from("perfis").select("nome_completo, avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("evolucao_checkins").select("id, data_checkin, peso_kg, bf_percentual, foto_frente_url, foto_costas_url, foto_lado_url").eq("user_id", user.id).order("data_checkin", { ascending: true }),
      ]);
      if (profile.error) throw profile.error;
      if (checkins.error) throw checkins.error;
      return { profile: profile.data, checkins: checkins.data || [] };
    },
  });
  const rows = data?.checkins || [];
  const latestWeight = [...rows].reverse().find(row => row.peso_kg != null)?.peso_kg;
  const latestBf = [...rows].reverse().find(row => row.bf_percentual != null)?.bf_percentual;
  const photoCount = rows.reduce((count, row) => count + [row.foto_frente_url, row.foto_costas_url, row.foto_lado_url].filter(Boolean).length, 0);
  const chart = rows.filter(row => row.peso_kg != null).map(row => ({ date: new Date(row.data_checkin).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), value: Number(row.peso_kg) }));
  const name = data?.profile?.nome_completo?.split(" ")[0] || "Atleta";

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex min-w-0 items-center gap-4">
          {data?.profile?.avatar_url ? <img src={data.profile.avatar_url} alt="Minha foto" className="h-16 w-16 shrink-0 rounded-full object-cover" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-card"><UserRound className="h-7 w-7 text-primary" /></div>}
          <div className="min-w-0"><p className="mb-1 text-xs text-primary">{tenant?.nome}</p><h1 className="break-words font-display text-3xl tracking-normal">Olá, {name}</h1><p className="mt-1 text-sm text-muted-foreground">Minha jornada</p></div>
        </div>
        <Button asChild variant="outline" size="sm" className="text-xs tracking-normal"><Link to={`${base}/perfil`}><UserRound /> Editar perfil e foto</Link></Button>
      </section>

      {isLoading ? <div className="flex items-center gap-3 py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Carregando sua evolução…</div> : error ? <div role="alert" className="flex flex-wrap items-center gap-4 border border-destructive p-4"><p className="text-sm">Não foi possível carregar seus dados.</p><Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw /> Tentar novamente</Button></div> : (
        <>
          <section aria-label="Resumo da evolução" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Último peso", value: latestWeight != null ? `${Number(latestWeight).toLocaleString("pt-BR")} kg` : "—", icon: Scale },
              { label: "Gordura corporal", value: latestBf != null ? `${Number(latestBf).toLocaleString("pt-BR")}%` : "—", icon: Activity },
              { label: "Check-ins", value: rows.length, icon: Activity },
              { label: "Fotos registradas", value: photoCount, icon: Camera },
            ].map(({ label, value, icon: Icon }) => <div key={label} className="min-w-0 border border-border bg-card p-4"><Icon className="mb-4 h-5 w-5 text-primary" /><p className="break-words text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{label}</p></div>)}
          </section>
          <section className="border-b border-border pb-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-2xl tracking-normal">Evolução do peso</h2><Button asChild variant="ghost" size="sm" className="text-xs tracking-normal"><Link to={`${base}/evolucao`}>Ver evolução <ArrowUpRight /></Link></Button></div>
            {chart.length ? <EvolutionChart data={chart} type="PESO" /> : <p className="py-8 text-center text-sm text-muted-foreground">Nenhum peso registrado ainda.</p>}
          </section>
        </>
      )}

      <section className="grid gap-5 sm:grid-cols-3">
        {features.map(({ title, path, image, icon: Icon }) => <Link key={path} to={`${base}/${path}`} className="group min-w-0 overflow-hidden border border-border bg-card transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><img src={image} alt={title} className="aspect-[4/3] w-full object-cover" /><div className="flex items-center gap-3 p-4"><Icon className="h-5 w-5 shrink-0 text-primary" /><h2 className="font-display text-xl tracking-normal">{title}</h2><ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" /></div></Link>)}
      </section>
      <section className="flex flex-wrap gap-3 border-t border-border pt-6">
        <Button asChild variant="outline" className="text-xs tracking-normal"><Link to={`${base}/evolucao`}><Camera /> Registrar fotos e medidas</Link></Button>
        <Button asChild variant="ghost" className="text-xs tracking-normal"><Link to={`${base}/carta`}>Minha carta <ArrowUpRight /></Link></Button>
      </section>
    </div>
  );
}