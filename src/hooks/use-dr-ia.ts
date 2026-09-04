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
        // Tenta extrair payload de erro estruturado da Edge Function
        const ctx: any = (functionError as any).context;
        let payload: any = null;
        try {
          if (ctx?.json) payload = await ctx.json();
          else if (ctx?.body) payload = JSON.parse(await new Response(ctx.body).text());
        } catch (_) {}

        if (functionError.status === 429) {
          if (payload?.error === "limite_mensal_atingido") {
            const proxima = payload.proxima_disponivel_em
              ? new Date(payload.proxima_disponivel_em).toLocaleDateString("pt-BR", {
                  day: "2-digit", month: "long",
                })
              : "o próximo mês";
            toast.info(payload.message || "Você já fez sua leitura deste mês.", {
              description: `Sua próxima análise estará liberada em ${proxima}.`,
              duration: 8000,
            });
            return null;
          }
          throw new Error("Muitas requisições. Tente novamente em instantes.");
        }
        if (functionError.status === 402) {
          throw new Error("Créditos de IA insuficientes para esta análise.");
        }
        if (payload?.error) throw new Error(payload.message || payload.error);
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

  const listarAnalises = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("analises_clinicas")
      .select(`
        *,
        exames_biomarcadores (*)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  };

  const getHistoricoMarcador = async (codigo: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("exames_biomarcadores")
      .select("*")
      .eq("user_id", user.id)
      .eq("codigo", codigo)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
  };

  return {
    uploadExame,
    listarAnalises,
    getHistoricoMarcador,
    isAnalyzing
  };
};

