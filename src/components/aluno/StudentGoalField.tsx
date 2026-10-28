import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TRAINING_GOALS } from "@/lib/training-goals";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/** Updates only the existing training profile, preserving the coach's other fields. */
export function StudentGoalField({ alunoId }: { alunoId: string }) {
  const [goal, setGoal] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    void (async () => {
      const { data, error } = await supabase.from("perfis_treino")
        .select("objetivo").eq("aluno_id", alunoId).maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        toast.error("Não foi possível carregar seu objetivo. Tente abrir o perfil novamente.");
        return;
      }
      setGoal(data.objetivo || "");
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [alunoId]);

  const saveGoal = async (value: string) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.from("perfis_treino")
        .update({ objetivo: value }).eq("aluno_id", alunoId)
        .select("objetivo").single();
      if (error || !data) throw error || new Error("Perfil não encontrado");
      setGoal(data.objetivo || "");
      toast.success("Objetivo atualizado!");
    } catch {
      toast.error("Não foi possível salvar seu objetivo. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      <Label htmlFor="student-goal">Objetivo</Label>
      <select id="student-goal" value={goal} disabled={!ready || saving}
        onChange={(event) => void saveGoal(event.target.value)}
        className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm disabled:opacity-50">
        <option value="" disabled>Selecione seu objetivo</option>
        {TRAINING_GOALS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}