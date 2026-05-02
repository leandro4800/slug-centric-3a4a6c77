import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Trash2, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  refreshKey?: number;
  onChanged?: () => void;
}

export const HistoricoCheckins = ({ refreshKey, onChanged }: Props) => {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) load();
  }, [user, refreshKey]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("evolucao_checkins")
      .select("*")
      .eq("user_id", user?.id)
      .order("data_checkin", { ascending: false });
    if (error) toast.error(error.message);
    setCheckins(data || []);
    setLoading(false);
  };

  const handleDelete = async (checkin: any) => {
    setDeletingId(checkin.id);
    try {
      const paths = [checkin.foto_frente_url, checkin.foto_costas_url, checkin.foto_lado_url].filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from("evolucao-fotos").remove(paths);
      }
      const { error } = await supabase.from("evolucao_checkins").delete().eq("id", checkin.id);
      if (error) throw error;
      toast.success("Check-in excluído.");
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.error("Erro ao excluir: " + e.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="animate-spin h-4 w-4" />
      </div>
    );
  }

  if (checkins.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border">
        Nenhum check-in registrado ainda.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {checkins.map((c) => (
        <div
          key={c.id}
          className="flex items-center justify-between bg-card/40 border border-border p-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-white font-bold tracking-wider">
                {format(new Date(c.data_checkin), "dd 'de' MMM yyyy", { locale: ptBR })}
              </p>
              <p className="text-[10px] text-muted-foreground tracking-wider uppercase">
                {c.peso_kg ? `${c.peso_kg}kg` : "--"}
                {c.bf_percentual ? ` • ${c.bf_percentual}% BF` : ""}
                {[c.foto_frente_url, c.foto_costas_url, c.foto_lado_url].filter(Boolean).length > 0 &&
                  ` • ${[c.foto_frente_url, c.foto_costas_url, c.foto_lado_url].filter(Boolean).length} foto(s)`}
              </p>
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                disabled={deletingId === c.id}
                className="h-9 w-9 text-destructive hover:bg-destructive/10"
              >
                {deletingId === c.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-black border-primary/30 text-white rounded-none">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display tracking-widest uppercase">
                  Excluir check-in?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Esta ação removerá as métricas e fotos deste registro de evolução. Não poderá ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-none">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(c)}
                  className="rounded-none bg-destructive hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  );
};
