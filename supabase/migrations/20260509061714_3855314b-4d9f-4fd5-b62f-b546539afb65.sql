DROP POLICY IF EXISTS "Coach gerencia slots do seu tenant" ON public.agenda_presencial_slots;
CREATE POLICY "Coaches gerenciam slots do seu tenant"
  ON public.agenda_presencial_slots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenants t
      WHERE t.id = tenant_id
        AND (
          t.owner_user_id = auth.uid()
          OR public.has_role(auth.uid(), 'coach'::public.app_role, tenant_id)
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tenants t
      WHERE t.id = tenant_id
        AND (
          t.owner_user_id = auth.uid()
          OR public.has_role(auth.uid(), 'coach'::public.app_role, tenant_id)
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
        )
    )
  );

DROP POLICY IF EXISTS "Coach gerencia agendamentos do seu tenant" ON public.agendamentos_presenciais;
CREATE POLICY "Coaches gerenciam agendamentos do seu tenant"
  ON public.agendamentos_presenciais
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.tenants t
      WHERE t.id = tenant_id
        AND (
          t.owner_user_id = auth.uid()
          OR public.has_role(auth.uid(), 'coach'::public.app_role, tenant_id)
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tenants t
      WHERE t.id = tenant_id
        AND (
          t.owner_user_id = auth.uid()
          OR public.has_role(auth.uid(), 'coach'::public.app_role, tenant_id)
          OR public.has_role(auth.uid(), 'admin'::public.app_role)
        )
    )
  );