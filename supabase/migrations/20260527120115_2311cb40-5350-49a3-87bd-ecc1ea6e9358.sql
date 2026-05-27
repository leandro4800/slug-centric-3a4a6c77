-- Update default status to 'Ocupado'
ALTER TABLE public.agendamentos_presenciais ALTER COLUMN status SET DEFAULT 'Ocupado';

-- Function to update reservados count
CREATE OR REPLACE FUNCTION public.update_slot_reservados_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.agenda_presencial_slots
        SET reservados = reservados + 1
        WHERE id = NEW.slot_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.agenda_presencial_slots
        SET reservados = GREATEST(0, reservados - 1)
        WHERE id = OLD.slot_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for increment/decrement
CREATE TRIGGER tr_update_slot_reservados
AFTER INSERT OR DELETE ON public.agendamentos_presenciais
FOR EACH ROW
EXECUTE FUNCTION public.update_slot_reservados_count();