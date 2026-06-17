
-- 1) agendamentos_aula_avulsa (legado): bloqueia INSERT/DELETE público
DROP POLICY IF EXISTS agend_deny_public_insert ON public.agendamentos_aula_avulsa;
CREATE POLICY agend_deny_public_insert ON public.agendamentos_aula_avulsa
  FOR INSERT TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS agend_deny_public_delete ON public.agendamentos_aula_avulsa;
CREATE POLICY agend_deny_public_delete ON public.agendamentos_aula_avulsa
  FOR DELETE TO anon, authenticated
  USING (false);

-- 2) perfis: remove SELECT tenant-wide que expõe PII
DROP POLICY IF EXISTS perfis_select_same_tenant ON public.perfis;

-- 3) historico_cargas: UPDATE/DELETE do próprio dono
DROP POLICY IF EXISTS hc_update_own ON public.historico_cargas;
CREATE POLICY hc_update_own ON public.historico_cargas
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS hc_delete_own ON public.historico_cargas;
CREATE POLICY hc_delete_own ON public.historico_cargas
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 4) coach_qualification_leads: DELETE do próprio lead
DROP POLICY IF EXISTS owner_delete_quiz ON public.coach_qualification_leads;
CREATE POLICY owner_delete_quiz ON public.coach_qualification_leads
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
