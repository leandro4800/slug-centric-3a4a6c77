import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Assinatura, Evento, Pagamento, Plano } from "@/lib/meu-negocio-metrics";

export type AlunoInfo = { id: string; nome: string; avatar_url: string | null; ultimo_treino: string | null };

export type MeuNegocioData = {
  assinaturas: Assinatura[];
  pagamentos: Pagamento[];
  eventos: Evento[];
  planos: Plano[];
  alunos: Map<string, AlunoInfo>;
};

const PAGE = 1000;

/** Busca todas as linhas em páginas de 1000 (limite padrão do banco). */
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 20000; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data as T[]) ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

const chunk = <T,>(arr: T[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

async function loadMeuNegocio(tenantId: string): Promise<MeuNegocioData> {
  // Toda consulta filtra tenant_id explicitamente: admins gerais também têm leitura ampla.
  const [assinaturas, pagamentos, eventos, planosRes] = await Promise.all([
    fetchAll<Assinatura>((f, t) =>
      supabase
        .from("assinaturas")
        .select("id, aluno_id, plano_id, status, origem, current_period_end, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at")
        .range(f, t),
    ),
    fetchAll<Pagamento>((f, t) =>
      supabase
        .from("pagamentos")
        .select("id, aluno_id, aluno_nome, produto_tipo, produto_nome, valor_bruto_centavos, valor_liquido_centavos, status, data_vencimento, data_pagamento, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at")
        .range(f, t),
    ),
    fetchAll<Evento>((f, t) =>
      supabase
        .from("assinatura_eventos")
        .select("aluno_id, aluno_nome, tipo, ocorreu_em")
        .eq("tenant_id", tenantId)
        .order("ocorreu_em")
        .range(f, t),
    ),
    supabase.from("planos").select("id, nome, preco_centavos, intervalo").eq("tenant_id", tenantId),
  ]);
  if (planosRes.error) throw planosRes.error;

  const ids = [
    ...new Set(
      [
        ...assinaturas.map((a) => a.aluno_id),
        ...eventos.map((e) => e.aluno_id),
        ...pagamentos.map((p) => p.aluno_id),
      ].filter((x): x is string => !!x),
    ),
  ];

  const alunos = new Map<string, AlunoInfo>();
  // Nome de quem já foi excluído vem do próprio evento/pagamento.
  for (const e of eventos) if (e.aluno_id && e.aluno_nome) alunos.set(e.aluno_id, { id: e.aluno_id, nome: e.aluno_nome, avatar_url: null, ultimo_treino: null });
  for (const p of pagamentos) if (p.aluno_id && p.aluno_nome && !alunos.has(p.aluno_id)) alunos.set(p.aluno_id, { id: p.aluno_id, nome: p.aluno_nome, avatar_url: null, ultimo_treino: null });

  for (const part of chunk(ids, 150)) {
    const [perfis, stats] = await Promise.all([
      supabase.from("perfis").select("id, nome_completo, avatar_url").in("id", part),
      supabase.from("stats_treino_aluno").select("aluno_id, ultimo_treino").in("aluno_id", part),
    ]);
    if (perfis.error) console.error("[meu-negocio] perfis", perfis.error);
    if (stats.error) console.error("[meu-negocio] stats", stats.error);
    for (const p of perfis.data ?? []) {
      const prev = alunos.get(p.id);
      alunos.set(p.id, {
        id: p.id,
        nome: p.nome_completo || prev?.nome || "Aluno",
        avatar_url: p.avatar_url ?? null,
        ultimo_treino: prev?.ultimo_treino ?? null,
      });
    }
    for (const s of stats.data ?? []) {
      const prev = alunos.get(s.aluno_id) ?? { id: s.aluno_id, nome: "Aluno", avatar_url: null, ultimo_treino: null };
      alunos.set(s.aluno_id, { ...prev, ultimo_treino: s.ultimo_treino ?? null });
    }
  }
  for (const id of ids) if (!alunos.has(id)) alunos.set(id, { id, nome: "Aluno", avatar_url: null, ultimo_treino: null });

  return {
    assinaturas,
    pagamentos: pagamentos.map((p) => ({
      ...p,
      valor_bruto_centavos: Number(p.valor_bruto_centavos) || 0,
      valor_liquido_centavos: p.valor_liquido_centavos === null || p.valor_liquido_centavos === undefined ? null : Number(p.valor_liquido_centavos),
    })),
    eventos,
    planos: (planosRes.data ?? []) as Plano[],
    alunos,
  };
}

export function useMeuNegocio(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["meu-negocio", tenantId],
    queryFn: () => loadMeuNegocio(tenantId!),
    enabled: !!tenantId,
    staleTime: 60_000,
  });
}
