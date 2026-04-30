import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const useDrIA = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const uploadExame = async (file: File) => {
    try {
      setIsAnalyzing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Upload to storage
      const timestamp = Date.now();
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${timestamp}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("exames_pdfs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Call Edge Function
      const { data, error: functionError } = await supabase.functions.invoke("analyze-exams", {
        body: { file_path: fileName }
      });

      if (functionError) {
        // Handle specific error codes
        if (functionError.status === 429) {
          throw new Error("Muitas requisições. O Dr. IA está descansando um pouco, tente em instantes.");
        }
        if (functionError.status === 402) {
          throw new Error("Créditos de IA insuficientes para esta análise.");
        }
        throw functionError;
      }

      queryClient.invalidateQueries({ queryKey: ["analises_clinicas"] });
      queryClient.invalidateQueries({ queryKey: ["exames_biomarcadores"] });
      
      toast.success("Análise concluída com sucesso!");
      return data;
    } catch (error: any) {
      console.error("Erro na análise:", error);
      toast.error(error.message || "Erro ao processar análise. Tente novamente.");
      throw error;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getHistoricoMarcador = async (codigo: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("exames_biomarcadores")
      .select("*")
      .eq("user_id", user.id)
      .eq("codigo", codigo)
      .order("data_exame", { ascending: true });

    if (error) throw error;
    return data;
  };

  return {
    uploadExame,
    getHistoricoMarcador,
    isAnalyzing
  };
};
