CREATE POLICY "agendamentos_aula_avulsa_self_select"
  ON public.agendamentos_aula_avulsa
  FOR SELECT
  TO authenticated
  USING (
    lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  );
