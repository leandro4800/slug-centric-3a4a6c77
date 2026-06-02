import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useBranding } from "@/contexts/BrandingProvider";
import { 
  Plus, 
  Trash2, 
  Save, 
  Layout, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Loader2,
  CreditCard
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface Plan {
  id: string;
  nome: string;
  descricao: string | null;
  preco_centavos: number;
  intervalo: "mensal" | "trimestral" | "semestral" | "anual";
  ativo: boolean;
  ordem: number;
  stripe_product_id?: string | null;
  stripe_price_id?: string | null;
}

export const PlanConfig = () => {
  const { tenant } = useBranding();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [newPlan, setNewPlan] = useState<Partial<Plan>>({
    nome: "",
    descricao: "",
    preco_centavos: 0,
    intervalo: "mensal",
    ativo: true,
    ordem: 0
  });

  const fetchPlans = async () => {
    if (!tenant?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("planos")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("ordem", { ascending: true });

      if (error) throw error;
      setPlans(data as Plan[]);
    } catch (error: any) {
      toast({
        title: "Erro ao buscar planos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [tenant?.id]);

  const handleAddPlan = async () => {
    if (!tenant?.id) return;
    if (!newPlan.nome || !newPlan.preco_centavos) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o nome e o preço do plano.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("planos")
        .insert({
          nome: newPlan.nome!,
          descricao: newPlan.descricao,
          preco_centavos: newPlan.preco_centavos!,
          intervalo: newPlan.intervalo as any,
          ativo: newPlan.ativo,
          tenant_id: tenant.id,
          ordem: plans.length
        });

      if (error) throw error;

      toast({ title: "Plano criado com sucesso!" });
      setShowAddForm(false);
      setNewPlan({
        nome: "",
        descricao: "",
        preco_centavos: 0,
        intervalo: "mensal",
        ativo: true,
        ordem: 0
      });
      fetchPlans();
    } catch (error: any) {
      toast({
        title: "Erro ao criar plano",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePlan = async (plan: Plan) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("planos")
        .update({
          nome: plan.nome,
          descricao: plan.descricao,
          preco_centavos: plan.preco_centavos,
          intervalo: plan.intervalo,
          ativo: plan.ativo,
          ordem: plan.ordem
        })
        .eq("id", plan.id);

      if (error) throw error;

      toast({ title: "Plano atualizado!" });
      fetchPlans();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar plano",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este plano?")) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("planos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Plano excluído!" });
      fetchPlans();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir plano",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Meus Planos e Valores</h3>
          <p className="text-sm text-muted-foreground">Configure os planos que seus alunos podem assinar.</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
          {showAddForm ? <XCircle className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? "Cancelar" : "Novo Plano"}
        </Button>
      </div>

      {showAddForm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Adicionar Novo Plano</CardTitle>
            <CardDescription>Defina os detalhes da sua nova oferta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Plano</Label>
                <Input 
                  placeholder="Ex: Consultoria Premium" 
                  value={newPlan.nome}
                  onChange={(e) => setNewPlan({ ...newPlan, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input 
                  type="number" 
                  placeholder="299.90" 
                  onChange={(e) => setNewPlan({ ...newPlan, preco_centavos: Math.round(parseFloat(e.target.value) * 100) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Intervalo</Label>
                <Select 
                  value={newPlan.intervalo} 
                  onValueChange={(v: any) => setNewPlan({ ...newPlan, intervalo: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch 
                  checked={newPlan.ativo} 
                  onCheckedChange={(checked) => setNewPlan({ ...newPlan, ativo: checked })} 
                />
                <Label>Plano Ativo</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição / Benefícios</Label>
              <Textarea 
                placeholder="Descreva o que está incluso no plano..." 
                value={newPlan.descricao || ""}
                onChange={(e) => setNewPlan({ ...newPlan, descricao: e.target.value })}
              />
            </div>
            <Button onClick={handleAddPlan} disabled={isSaving} className="w-full gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Novo Plano
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {plans.length === 0 && !showAddForm && (
          <div className="text-center py-12 border border-dashed rounded-xl">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-4" />
            <p className="text-muted-foreground">Você ainda não configurou nenhum plano.</p>
          </div>
        )}
        
        {plans.map((plan) => (
          <Card key={plan.id} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {plan.ativo ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-zinc-500" />
                  )}
                  <CardTitle className="text-lg">{plan.nome}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive/80"
                    onClick={() => handleDeletePlan(plan.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Preço</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">R$</span>
                    <Input 
                      type="number" 
                      className="h-8 font-bold"
                      value={(plan.preco_centavos / 100).toFixed(2)}
                      onChange={(e) => {
                        const val = Math.round(parseFloat(e.target.value) * 100);
                        const updated = plans.map(p => p.id === plan.id ? { ...p, preco_centavos: val } : p);
                        setPlans(updated);
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Intervalo</Label>
                  <Select 
                    value={plan.intervalo} 
                    onValueChange={(v: any) => {
                      const updated = plans.map(p => p.id === plan.id ? { ...p, intervalo: v } : p);
                      setPlans(updated);
                    }}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="semestral">Semestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch 
                    checked={plan.ativo} 
                    onCheckedChange={(checked) => {
                      const updated = plans.map(p => p.id === plan.id ? { ...p, ativo: checked } : p);
                      setPlans(updated);
                    }} 
                  />
                  <Label className="text-xs">Ativo</Label>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Descrição</Label>
                <Textarea 
                  className="min-h-[60px] text-sm"
                  value={plan.descricao || ""}
                  onChange={(e) => {
                    const updated = plans.map(p => p.id === plan.id ? { ...p, descricao: e.target.value } : p);
                    setPlans(updated);
                  }}
                />
              </div>
              <Button 
                onClick={() => handleUpdatePlan(plan)} 
                disabled={isSaving}
                className="w-full h-8 text-xs gap-2"
                variant="secondary"
              >
                <Save className="h-3 w-3" /> Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};