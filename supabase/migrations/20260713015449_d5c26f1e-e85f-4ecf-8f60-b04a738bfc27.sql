
DROP POLICY IF EXISTS slots_select_public ON public.agenda_aula_avulsa_slots;
CREATE POLICY slots_select_public ON public.agenda_aula_avulsa_slots
  FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS hc_insert_own ON public.historico_cargas;
CREATE POLICY hc_insert_own ON public.historico_cargas
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = public.current_user_tenant()
  );
