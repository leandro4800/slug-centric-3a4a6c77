import { Utensils, Play, Coffee, Sun, Apple, Moon } from "lucide-react";
import { PageHeader } from "@/components/aluno/PageHeader";

const macros = [
  { label: "CALORIAS", value: "522", unit: "kcal", color: "text-accent", border: "border-accent/40" },
  { label: "PROTEÍNA", value: "17", unit: "g", color: "text-[hsl(142_70%_55%)]", border: "border-[hsl(142_70%_55%)]/40" },
  { label: "CARBO", value: "92", unit: "g", color: "text-accent", border: "border-accent/40" },
  { label: "GORDURA", value: "9", unit: "g", color: "text-[hsl(0_80%_60%)]", border: "border-[hsl(0_80%_60%)]/40" },
];

const refeicoes = [
  { hora: "07:00", nome: "Café da Manhã", icon: Coffee, img: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80" },
  { hora: "12:00", nome: "Almoço", icon: Sun, img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80" },
  { hora: "16:00", nome: "Lanche", icon: Apple, img: "https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=800&q=80" },
  { hora: "20:00", nome: "Jantar", icon: Moon, img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80" },
];

const Dieta = () => (
  <>
    <PageHeader icon={Utensils} title="MINHA DIE…" subtitle={undefined} />
    <div className="px-5">
      <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 text-center text-xs text-accent mb-5">
        ⚡ Prévia — Sua dieta personalizada será montada pelo coach
      </div>

      <h2 className="font-display text-base flex items-center gap-2 mb-3">
        <span className="text-accent">⚡</span> RESUMO NUTRICIONAL DO DIA
      </h2>

      <div className="grid grid-cols-4 gap-2">
        {macros.map((m) => (
          <div key={m.label} className={`bg-card/40 border ${m.border} rounded-xl p-3 text-center`}>
            <p className={`text-[10px] font-semibold ${m.color}`}>{m.label}</p>
            <p className={`font-display text-2xl mt-1 ${m.color}`}>{m.value}</p>
            <p className="text-[10px] text-muted-foreground">{m.unit}</p>
          </div>
        ))}
      </div>

      <h2 className="font-display text-base flex items-center gap-2 mt-7 mb-3">
        <span className="text-accent">▶</span> REFEIÇÕES DIÁRIAS
      </h2>

      <div className="space-y-4">
        {refeicoes.map((r) => (
          <div key={r.nome} className="relative aspect-[16/9] rounded-2xl overflow-hidden border border-border">
            <img src={r.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-accent">
                  <div className="w-7 h-7 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
                    <r.icon className="h-3.5 w-3.5" />
                  </div>
                  {r.hora}
                </div>
                <p className="font-display italic text-2xl mt-1 tracking-wide">{r.nome.toUpperCase()}</p>
              </div>
              <button className="w-11 h-11 rounded-full bg-background/40 backdrop-blur border border-white/20 flex items-center justify-center">
                <Play className="h-4 w-4 fill-white" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </>
);

export default Dieta;
