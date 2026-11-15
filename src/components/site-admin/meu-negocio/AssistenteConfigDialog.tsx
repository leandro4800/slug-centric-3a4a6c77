import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAssistenteConfig, useSalvarAssistenteConfig } from "@/hooks/use-assistente";
import { CONFIG_INICIAL, TIPOS_CONFIG, type AssistenteConfig } from "@/lib/assistente";

const HORAS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h–20h: nada entre 21h e 7h

export const AssistenteConfigDialog = ({ tenantId, open, onOpenChange }: { tenantId: string; open: boolean; onOpenChange: (o: boolean) => void }) => {
  const { data } = useAssistenteConfig(tenantId);
  const salvar = useSalvarAssistenteConfig(tenantId);
  const [cfg, setCfg] = useState<AssistenteConfig>(CONFIG_INICIAL);

  useEffect(() => {
    if (open && data) setCfg({ ...data, tipos: { ...data.tipos } });
  }, [open, data]);

  const set = (patch: Partial<AssistenteConfig>) => setCfg((c) => ({ ...c, ...patch }));

  const onSalvar = async () => {
    if (cfg.resumo_ativo && !cfg.canal_email && !cfg.canal_push) return toast.error("Escolha e-mail, notificação ou os dois.");
    try {
      await salvar.mutateAsync(cfg);
      toast.success("Configuração salva.");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar agora.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar assistente</DialogTitle>
          <DialogDescription>No máximo um resumo por dia, só quando houver novidade, nunca entre 21h e 7h.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="resumo-ativo" className="font-bold">Resumo da manhã</Label>
              <p className="text-xs text-muted-foreground">Até 5 itens por ordem de prioridade; o resto fica no painel.</p>
            </div>
            <Switch id="resumo-ativo" checked={cfg.resumo_ativo} onCheckedChange={(v) => set({ resumo_ativo: v })} />
          </div>

          <div className={cfg.resumo_ativo ? "space-y-4" : "pointer-events-none space-y-4 opacity-50"}>
            <div className="flex items-center justify-between gap-4">
              <Label>Horário</Label>
              <Select value={String(cfg.resumo_hora)} onValueChange={(v) => set({ resumo_hora: Number(v) })}>
                <SelectTrigger className="w-32" aria-label="Horário do resumo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HORAS.map((h) => <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}:00</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="canal-push">Notificação no celular</Label>
              <Switch id="canal-push" checked={cfg.canal_push} onCheckedChange={(v) => set({ canal_push: v })} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="canal-email">E-mail</Label>
              <Switch id="canal-email" checked={cfg.canal_email} onCheckedChange={(v) => set({ canal_email: v })} />
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tipos de alerta</p>
            {TIPOS_CONFIG.map((t) => (
              <div key={t.key} className="flex items-center justify-between gap-4">
                <div>
                  <Label htmlFor={`tipo-${t.key}`}>{t.label}</Label>
                  <p className="text-xs text-muted-foreground">{t.descricao}</p>
                </div>
                <Switch
                  id={`tipo-${t.key}`}
                  checked={cfg.tipos[t.key] !== false}
                  onCheckedChange={(v) => set({ tipos: { ...cfg.tipos, [t.key]: v } })}
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSalvar} disabled={salvar.isPending}>
            {salvar.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
