import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  tipo: "treino" | "dieta";
  tenantId: string | null | undefined;
  alunoId?: string | null;
  disabled?: boolean;
  onExtracted: (data: any) => void;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result || "");
      resolve(s.includes(",") ? s.split(",")[1] : s);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const ImportPlanoIA = ({ tipo, tenantId, alunoId, disabled, onExtracted }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    if (!tenantId) {
      toast.error("Tenant não identificado.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 15MB).");
      return;
    }
    setLoading(true);
    const toastId = toast.loading(`Analisando ${tipo} com IA...`);
    try {
      const base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("import-with-ai", {
        body: {
          file: base64,
          fileType: file.type || "application/octet-stream",
          importType: tipo,
          alunoId: alunoId || null,
          tenantId,
          dryRun: true,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha ao interpretar arquivo");
      onExtracted(data.extractedData || data.data || {});
      toast.success("Campos preenchidos pela IA. Revise antes de enviar.", { id: toastId });
    } catch (e: any) {
      console.error("Import IA erro:", e);
      toast.error(e?.message || "Erro ao processar arquivo", { id: toastId });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,image/*,text/plain,.md"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || loading}
        className="border-primary/40 text-primary hover:bg-primary/10"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
        Importar PDF/Word
      </Button>
    </>
  );
};

export default ImportPlanoIA;
