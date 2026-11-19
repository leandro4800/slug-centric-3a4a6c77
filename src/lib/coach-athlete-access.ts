/**
 * O coach só abre a evolução de um aluno que está no próprio time.
 * Mesma regra da lista do Gerenciar Elenco (perfis.tenant_id = time do coach).
 */
export function alunoPertenceAoTime(
  perfil: { tenant_id?: string | null } | null | undefined,
  tenantId: string | null | undefined,
): boolean {
  if (!perfil || !tenantId) return false;
  return perfil.tenant_id === tenantId;
}
