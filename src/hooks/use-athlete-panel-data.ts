import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { supabase } from "@/integrations/supabase/client";
import type { AthleteSet } from "@/lib/athlete-training-metrics";

export function useAthletePanelData() {
  const { user } = useAuth();
  const { tenant } = useBranding();
  return useQuery({
    queryKey: ["athlete-panel-monitoring", user?.id, tenant?.id],
    enabled: !!user?.id && !!tenant?.id,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!user || !tenant) throw new Error("Sessão indisponível");
      const [profile, checkins, sessions, prescriptions, diet] = await Promise.all([
        supabase.from("perfis").select("nome_completo, avatar_url").eq("id", user.id).eq("tenant_id", tenant.id).maybeSingle(),
        supabase.from("evolucao_checkins").select("id, data_checkin, peso_kg, bf_percentual, foto_frente_url, foto_costas_url, foto_lado_url").eq("user_id", user.id).order("data_checkin", { ascending: true }),
        supabase.from("sessoes_treino").select("id, data_treino, dia_semana, duracao_min").eq("aluno_id", user.id).eq("tenant_id", tenant.id).order("data_treino", { ascending: false }),
        supabase.from("treinos_prescritos").select("id, exercicio, dia_semana, series, repeticoes, observacao, tempo_descanso_segundos").eq("aluno_id", user.id).eq("tenant_id", tenant.id).eq("status", "ativo").order("ordem_execucao"),
        supabase.from("dietas").select("id, objetivo, kcal_alvo, macros_alvo, created_at").eq("user_id", user.id).eq("is_published", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      for (const result of [profile, checkins, sessions, prescriptions, diet]) if (result.error) throw result.error;
      const sets: AthleteSet[] = [];
      // Supabase caps each response; paginate to avoid silently undercounting volume.
      for (let offset = 0; ; offset += 1000) {
        const result = await supabase.from("series_executadas")
          .select("sessao_id, treino_prescrito_id, exercicio_chave, peso_kg, reps, volume_kg, concluida_em, created_at")
          .eq("aluno_id", user.id).eq("tenant_id", tenant.id).order("id").range(offset, offset + 999);
        if (result.error) throw result.error;
        sets.push(...(result.data || []));
        if ((result.data?.length || 0) < 1000) break;
      }
      const photos = await Promise.all((checkins.data || []).flatMap(c =>
        (["frente", "costas", "lado"] as const).flatMap(side => {
          const path = c[`foto_${side}_url`];
          if (!path) return [];
          return [supabase.storage.from("evolucao-fotos").createSignedUrl(path, 3600).then(({ data }) => ({ id: `${c.id}-${side}`, date: c.data_checkin, side, url: data?.signedUrl }))];
        })
      ));
      return { profile: profile.data, checkins: checkins.data || [], sessions: sessions.data || [], prescriptions: prescriptions.data || [], diet: diet.data, sets, photos: photos.filter(p => p.url) };
    },
  });
}