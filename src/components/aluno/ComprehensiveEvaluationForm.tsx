import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Ruler, Upload, Sparkles, ChevronRight, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alunoId: string;
  tenantId?: string | null;
  sexo?: string | null;
  onSaved?: () => void;
  initialData?: any;
  triggerImportOnInit?: boolean;
}

export const ComprehensiveEvaluationForm = ({
  open,
  onOpenChange,
  alunoId,
  tenantId,
  sexo,
  onSaved,
  initialData,
  triggerImportOnInit
}: Props) => {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    peso: "",
    altura: "",
    idade: "",
    dobras: {
      peitoral: "",
      axiliar_media: "",
      triceps: "",
      subescapular: "",
      abdominal: "",
      suprailiaca: "",
      coxa: "",
      panturrilha: "",
    },
    perimetros: {
      pescoco: "",
      torax: "",
      cintura: "",
      abdomen: "",
      quadril: "",
      braco_relaxado_dir: "",
      braco_relaxado_esq: "",
      braco_contraido_dir: "",
      braco_contraido_esq: "",
      antebraco_dir: "",
      antebraco_esq: "",
      coxa_proximal_dir: "",
      coxa_proximal_esq: "",
      coxa_media_dir: "",
      coxa_media_esq: "",
      coxa_distal_dir: "",
      coxa_distal_esq: "",
      panturrilha_dir: "",
      panturrilha_esq: "",
    }
  });

  useEffect(() => {
    if (initialData) {
      // Map initial data if provided (e.g. from PDF import)
      setForm(prev => ({
        ...prev,
        ...initialData,
        dobras: { ...prev.dobras, ...initialData.dobras },
        perimetros: { ...prev.perimetros, ...initialData.perimetros }
      }));
    }
  }, [initialData]);

  useEffect(() => {
    if (open && triggerImportOnInit && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [open, triggerImportOnInit]);

  const num = (v: any) => {
    if (typeof v === "number") return v;
    const n = parseFloat(String(v || "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const toastId = toast.loading("Dr. IA analisando seu relatório...");

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const base64 = await base64Promise;

      const { data, error } = await supabase.functions.invoke("import-with-ai", {
        body: {
          file: base64,
          fileType: file.type,
          importType: "avaliacao",
          alunoId,
          tenantId: tenantId || "any"
        },
      });

      if (error) throw error;

      if (data?.data) {
        const ext = data.data;
        setForm({
          peso: ext.peso ? String(ext.peso) : form.peso,
          altura: ext.altura ? String(ext.altura) : form.altura,
          idade: ext.idade ? String(ext.idade) : form.idade,
          dobras: {
            peitoral: ext.dobras?.peitoral ? String(ext.dobras.peitoral) : form.dobras.peitoral,
            axiliar_media: ext.dobras?.axiliar_media ? String(ext.dobras.axiliar_media) : form.dobras.axiliar_media,
            triceps: ext.dobras?.triceps ? String(ext.dobras.triceps) : form.dobras.triceps,
            subescapular: ext.dobras?.subescapular ? String(ext.dobras.subescapular) : form.dobras.subescapular,
            abdominal: ext.dobras?.abdominal ? String(ext.dobras.abdominal) : form.dobras.abdominal,
            suprailiaca: ext.dobras?.suprailiaca ? String(ext.dobras.suprailiaca) : form.dobras.suprailiaca,
            coxa: ext.dobras?.coxa ? String(ext.dobras.coxa) : form.dobras.coxa,
            panturrilha: ext.dobras?.panturrilha ? String(ext.dobras.panturrilha) : form.dobras.panturrilha,
          },
          perimetros: {
            pescoco: ext.perimetros?.pescoco ? String(ext.perimetros.pescoco) : form.perimetros.pescoco,
            torax: ext.perimetros?.torax ? String(ext.perimetros.torax) : form.perimetros.torax,
            cintura: ext.perimetros?.cintura ? String(ext.perimetros.cintura) : form.perimetros.cintura,
            abdomen: ext.perimetros?.abdomen ? String(ext.perimetros.abdomen) : form.perimetros.abdomen,
            quadril: ext.perimetros?.quadril ? String(ext.perimetros.quadril) : form.perimetros.quadril,
            braco_relaxado_dir: ext.perimetros?.braco_relaxado_dir ? String(ext.perimetros.braco_relaxado_dir) : form.perimetros.braco_relaxado_dir,
            braco_relaxado_esq: ext.perimetros?.braco_relaxado_esq ? String(ext.perimetros.braco_relaxado_esq) : form.perimetros.braco_relaxado_esq,
            braco_contraido_dir: ext.perimetros?.braco_contraido_dir ? String(ext.perimetros.braco_contraido_dir) : form.perimetros.braco_contraido_dir,
            braco_contraido_esq: ext.perimetros?.braco_contraido_esq ? String(ext.perimetros.braco_contraido_esq) : form.perimetros.braco_contraido_esq,
            antebraco_dir: ext.perimetros?.antebraco_dir ? String(ext.perimetros.antebraco_dir) : form.perimetros.antebraco_dir,
            antebraco_esq: ext.perimetros?.antebraco_esq ? String(ext.perimetros.antebraco_esq) : form.perimetros.antebraco_esq,
            coxa_proximal_dir: ext.perimetros?.coxa_proximal_dir ? String(ext.perimetros.coxa_proximal_dir) : form.perimetros.coxa_proximal_dir,
            coxa_proximal_esq: ext.perimetros?.coxa_proximal_esq ? String(ext.perimetros.coxa_proximal_esq) : form.perimetros.coxa_proximal_esq,
            coxa_media_dir: ext.perimetros?.coxa_media_dir ? String(ext.perimetros.coxa_media_dir) : form.perimetros.coxa_media_dir,
            coxa_media_esq: ext.perimetros?.coxa_media_esq ? String(ext.perimetros.coxa_media_esq) : form.perimetros.coxa_media_esq,
            coxa_distal_dir: ext.perimetros?.coxa_distal_dir ? String(ext.perimetros.coxa_distal_dir) : form.perimetros.coxa_distal_dir,
            coxa_distal_esq: ext.perimetros?.coxa_distal_esq ? String(ext.perimetros.coxa_distal_esq) : form.perimetros.coxa_distal_esq,
            panturrilha_dir: ext.perimetros?.panturrilha_dir ? String(ext.perimetros.panturrilha_dir) : form.perimetros.panturrilha_dir,
            panturrilha_esq: ext.perimetros?.panturrilha_esq ? String(ext.perimetros.panturrilha_esq) : form.perimetros.panturrilha_esq,
          }
        });
        toast.success("Dados extraídos com sucesso!", { id: toastId });
      }
    } catch (err: any) {
      toast.error("Erro ao processar PDF: " + err.message, { id: toastId });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Cálculo básico de BF 7 dobras (Jackson & Pollock)
      const soma = Object.values(form.dobras).reduce((acc, v) => acc + (num(v) || 0), 0);
      const idadeN = num(form.idade) || 0;
      const pesoN = num(form.peso) || 0;
      const sexoN = sexo?.toUpperCase().startsWith("F") ? "F" : "M";

      let bf = null;
      if (soma > 0 && idadeN > 0) {
        const BD = sexoN === "M"
          ? 1.112 - 0.00043499 * soma + 0.00000055 * soma * soma - 0.00028826 * idadeN
          : 1.097 - 0.00046971 * soma + 0.00000056 * soma * soma - 0.00012828 * idadeN;
        bf = 495 / BD - 450;
      }

      const { error } = await supabase.from("avaliacoes_fisicas").insert({
        aluno_id: alunoId,
        tenant_id: tenantId || null,
        peso_kg: num(form.peso),
        altura_cm: num(form.altura),
        idade: idadeN,
        sexo: sexoN,
        data: new Date().toISOString(),
        metodo: "7_dobras_completo",
        bf_pct_calculado: bf ? Number(bf.toFixed(2)) : null,
        massa_gorda_kg: bf && pesoN ? Number((pesoN * (bf / 100)).toFixed(2)) : null,
        massa_magra_kg: bf && pesoN ? Number((pesoN - (pesoN * (bf / 100))).toFixed(2)) : null,
        dobra_peitoral: num(form.dobras.peitoral),
        dobra_axilar_media: num(form.dobras.axiliar_media),
        dobra_triceps: num(form.dobras.triceps),
        dobra_subescapular: num(form.dobras.subescapular),
        dobra_abdominal: num(form.dobras.abdominal),
        dobra_suprailiaca: num(form.dobras.suprailiaca),
        dobra_coxa: num(form.dobras.coxa),
        dobra_panturrilha: num(form.dobras.panturrilha),
        pescoco_cm: num(form.perimetros.pescoco),
        cintura_cm: num(form.perimetros.cintura),
        quadril_cm: num(form.perimetros.quadril),
        perimetro_torax: num(form.perimetros.torax),
        perimetro_abdomen: num(form.perimetros.abdomen),
        perimetro_braco_relaxado_dir: num(form.perimetros.braco_relaxado_dir),
        perimetro_braco_relaxado_esq: num(form.perimetros.braco_relaxado_esq),
        perimetro_braco_contraido_dir: num(form.perimetros.braco_contraido_dir),
        perimetro_braco_contraido_esq: num(form.perimetros.braco_contraido_esq),
        perimetro_antebraco_dir: num(form.perimetros.antebraco_dir),
        perimetro_antebraco_esq: num(form.perimetros.antebraco_esq),
        perimetro_coxa_proximal_dir: num(form.perimetros.coxa_proximal_dir),
        perimetro_coxa_proximal_esq: num(form.perimetros.coxa_proximal_esq),
        perimetro_coxa_media_dir: num(form.perimetros.coxa_media_dir),
        perimetro_coxa_media_esq: num(form.perimetros.coxa_media_esq),
        perimetro_coxa_distal_dir: num(form.perimetros.coxa_distal_dir),
        perimetro_coxa_distal_esq: num(form.perimetros.coxa_distal_esq),
        perimetro_panturrilha_dir: num(form.perimetros.panturrilha_dir),
        perimetro_panturrilha_esq: num(form.perimetros.panturrilha_esq),
      });

      if (error) throw error;
      toast.success("Avaliação salva com sucesso!");
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Peso (kg)</Label>
          <Input type="number" step="0.1" value={form.peso} onChange={e => setForm({...form, peso: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Altura (cm)</Label>
          <Input type="number" value={form.altura} onChange={e => setForm({...form, altura: e.target.value})} />
        </div>
        <div className="space-y-2">
          <Label>Idade</Label>
          <Input type="number" value={form.idade} onChange={e => setForm({...form, idade: e.target.value})} />
        </div>
      </div>
      <div className="pt-4 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
          <span className="w-1 h-3 bg-primary rounded-full" />
          Dobras Cutâneas (mm)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(form.dobras).map(([key, value]) => (
            <div key={key} className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider">{key.replace("_", " ")}</Label>
              <Input 
                type="number" 
                step="0.1" 
                className="h-9 text-xs" 
                value={value} 
                onChange={e => setForm({...form, dobras: {...form.dobras, [key]: e.target.value}})} 
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4 py-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
        <span className="w-1 h-3 bg-primary rounded-full" />
        Perímetros (cm)
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(form.perimetros).map(([key, value]) => (
          <div key={key} className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider">{key.replace(/_/g, " ")}</Label>
            <Input 
              type="number" 
              step="0.1" 
              className="h-9 text-xs" 
              value={value} 
              onChange={e => setForm({...form, perimetros: {...form.perimetros, [key]: e.target.value}})} 
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <div>
              <DialogTitle className="font-display text-2xl uppercase tracking-tight flex items-center gap-2">
                <Ruler className="h-6 w-6 text-primary" />
                Avaliação Completa
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs uppercase tracking-wider">
                Protocolo 7 Dobras + Medidas Antropométricas
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={handleImport} />
              <Button
                variant="outline"
                size="sm"
                className="border-primary/40 text-primary font-bold uppercase tracking-widest text-[10px]"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Importar PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ x: 10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -10, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 ? renderStep1() : renderStep2()}
          </motion.div>
        </AnimatePresence>

        <DialogFooter className="flex justify-between sm:justify-between items-center gap-2 pt-4 border-t border-border/50">
          <div className="flex gap-2">
            {step > 1 && (
              <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            {step === 1 ? (
              <Button size="sm" onClick={() => setStep(2)}>
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : "Salvar Avaliação"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
