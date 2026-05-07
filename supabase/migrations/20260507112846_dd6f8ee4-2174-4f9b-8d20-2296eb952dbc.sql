
-- Trigger que impede deletar plano com assinaturas ativas/trialing
CREATE OR REPLACE FUNCTION public.prevent_plano_delete_if_active_subs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
    FROM public.assinaturas
   WHERE plano_id = OLD.id
     AND status IN ('active','trialing','past_due');
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Não é possível excluir o plano: existem % assinatura(s) ativa(s). Desative o plano em vez de excluir.', v_count
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_plano_delete ON public.planos;
CREATE TRIGGER trg_prevent_plano_delete
  BEFORE DELETE ON public.planos
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_plano_delete_if_active_subs();
