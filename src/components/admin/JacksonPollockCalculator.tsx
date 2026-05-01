import { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Ruler } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  alunoId: string;
  tenantId?: string | null;
  pesoInicial?: number | null;
  idadeInicial?: number | null;
  sexoInicial?: string | null;
  alturaInicial?: number | null;
  onSaved?: () => void;
}

type Sexo = "M" | "F";

const DOBRAS = [
  { key: "peitoral", label: "Peitoral" },
  { key: "axilarMedia", label: "Axilar Média" },
  { key: "triceps", label: "Tríceps" },
  { key: "subescapular", label: "Subescapular" },
  { key: "abdominal", label: "Abdominal" },
  { key: "suprailiaca", label: "Suprailíaca" },
  { key: "coxa", label: "Coxa" },
] as const;

type DobraKey = (typeof DOBRAS)[number]["key"];

const num = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export default function JacksonPollockCalculator({
  open,
  onOpenChange,
  alunoId,
  tenantId,
  pesoInicial,
  idadeInicial,
  sexoInicial,
  alturaInicial,
  onSaved,
}: Props) {
  const [dobras, setDobras] = useState<Record<DobraKey, string>>({
    peitoral: "",
    axilarMedia: "",
    triceps: "",
    subescapular: "",
    abdominal: "",
    suprailiaca: "",
    coxa: "",
  });
  const [idade, setIdade] = useState<string>(idadeInicial ? String(idadeInicial) : "");
  const [peso, setPeso] = useState<string>(pesoInicial ? String(pesoInicial) : "");
  const [sexo, setSexo] = useState<Sexo>(
    (sexoInicial?.toUpperCase().startsWith("F") ? "F" : "M") as Sexo,
  );
  const [saving, setSaving] = useState(false);

  const calc = useMemo(() => {
    const soma = DOBRAS.reduce((acc, d) => acc + num(dobras[d.key]), 0);
    const idadeN = num(idade);
    const pesoN = num(peso);
    if (soma <= 0 || idadeN <= 0 || pesoN <= 0) return null;

    const BD =
      sexo === "M"
        ? 1.112 - 0.00043499 * soma + 0.00000055 * soma * soma - 0.00028826 * idadeN
        : 1.097 - 0.00046971 * soma + 0.00000056 * soma * soma - 0.00012828 * idadeN;
    const bf = 495 / BD - 450;
    const massaGorda = pesoN * (bf / 100);
    const massaMagra = pesoN - massaGorda;
    return { soma, bf, massaGorda, massaMagra };
  }, [dobras, idade, peso, sexo]);

  const handleSave = async () => {
    if (!calc) {
      toast.error("Preencha todas as dobras, idade e peso.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("avaliacoes_fisicas").insert({
        aluno_id: alunoId,
        tenant_id: tenantId ?? null,
        peso_kg: num(peso),
        altura_cm: alturaInicial ?? 0,
        idade: num(idade),
        sexo,
        metodo: "jackson_pollock_7",
        bf_pct_calculado: Number(calc.bf.toFixed(2)),
        massa_gorda_kg: Number(calc.massaGorda.toFixed(2)),
        massa_magra_kg: Number(calc.massaMagra.toFixed(2)),
        dobra_peitoral: num(dobras.peitoral),
        dobra_axilar_media: num(dobras.axilarMedia),
        dobra_triceps: num(dobras.triceps),
        dobra_subescapular: num(dobras.subescapular),
        dobra_abdominal: num(dobras.abdominal),
        dobra_suprailiaca: num(dobras.suprailiaca),
        dobra_coxa: num(dobras.coxa),
      });
      if (error) throw error;
      toast.success("Protocolo 7 Dobras salvo!");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-2 text-primary">
            <Ruler className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">
              Jackson & Pollock
            </span>
          </div>
          <DialogTitle className="font-display text-2xl uppercase tracking-tight text-primary">
            Protocolo 7 Dobras
          </DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-wider text-muted-foreground">
            Insira as medidas em milímetros (mm)
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-5">
          {/* Dados base */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Idade
              </Label>
              <Input
                type="number"
                inputMode="numeric"
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Peso (kg)
              </Label>
              <Input
                type="number"
                inputMode="decimal"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Sexo
              </Label>
              <Select value={sexo} onValueChange={(v) => setSexo(v as Sexo)}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 7 dobras */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Dobras Cutâneas (mm)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {DOBRAS.map((d) => (
                <div key={d.key} className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {d.label}
                  </Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={dobras[d.key]}
                    onChange={(e) =>
                      setDobras((prev) => ({ ...prev, [d.key]: e.target.value }))
                    }
                    className="bg-input border-border"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Resultado */}
          <div className="rounded-xl border border-primary/30 bg-background p-5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
              Resultado
            </p>
            {calc ? (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    BF %
                  </p>
                  <p className="font-display text-3xl font-bold text-primary">
                    {calc.bf.toFixed(1)}
                    <span className="text-base text-muted-foreground">%</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Massa Magra
                  </p>
                  <p className="font-display text-3xl font-bold text-primary">
                    {calc.massaMagra.toFixed(1)}
                    <span className="text-base text-muted-foreground">kg</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Massa Gorda
                  </p>
                  <p className="font-display text-3xl font-bold text-primary">
                    {calc.massaGorda.toFixed(1)}
                    <span className="text-base text-muted-foreground">kg</span>
                  </p>
                </div>
                <div className="col-span-3 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Soma das 7 dobras: {calc.soma.toFixed(1)} mm
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Preencha todas as dobras + idade e peso para calcular.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border/50 pt-4 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 uppercase text-[10px] font-bold tracking-widest"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !calc}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 uppercase text-[10px] font-bold tracking-widest"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Calcular e Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
