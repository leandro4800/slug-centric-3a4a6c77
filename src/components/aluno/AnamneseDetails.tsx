import { CheckCircle2, XCircle } from "lucide-react";

interface AnamneseData {
  doencas: string[];
  medicamentos: string | null;
  lesoes_atuais: string | null;
  horas_sono: number | null;
  qualidade_sono: number | null;
  nivel_estresse: number | null;
  tabagismo: boolean | null;
  alcool: string | null;
  suplementos: string[];
  restricoes_alimentares: string[];
  refeicoes_dia: number | null;
  agua_litros: number | null;
  anos_treino: number | null;
  disponibilidade_dias: string[];
  nivel_experiencia: string | null;
  faz_uso_ergogenicos: boolean | null;
  detalhes_ergogenicos: string | null;
  historico_familiar: string | null;
  cirurgias: string | null;
  alimentos_ama: string | null;
  alimentos_evita: string | null;
  modalidades_anteriores: string[];
  tempo_recuperacao: string | null;
}

export const AnamneseDetails = ({ data }: { data: AnamneseData }) => {
  return (
    <div className="space-y-6 text-sm">
      <section className="space-y-3">
        <h3 className="font-display text-sm uppercase text-primary tracking-widest border-b border-primary/20 pb-1">Saúde & Histórico</h3>
        <div className="grid gap-2">
          <DetailItem label="Doenças" value={data.doencas?.join(", ") || "Nenhuma"} />
          <DetailItem label="Medicamentos" value={data.medicamentos} />
          <DetailItem label="Cirurgias" value={data.cirurgias} />
          <DetailItem label="Lesões Atuais" value={data.lesoes_atuais} />
          <DetailItem label="Histórico Familiar" value={data.historico_familiar} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-sm uppercase text-primary tracking-widest border-b border-primary/20 pb-1">Hábitos</h3>
        <div className="grid grid-cols-2 gap-3">
          <DetailItem label="Horas de Sono" value={data.horas_sono ? `${data.horas_sono}h` : null} />
          <DetailItem label="Nível Estresse" value={data.nivel_estresse ? `${data.nivel_estresse}/10` : null} />
          <DetailItem label="Fumante" value={data.tabagismo ? "Sim" : "Não"} />
          <DetailItem label="Álcool" value={data.alcool} />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-sm uppercase text-primary tracking-widest border-b border-primary/20 pb-1">Nutrição</h3>
        <div className="grid grid-cols-2 gap-3">
          <DetailItem label="Refeições/Dia" value={data.refeicoes_dia} />
          <DetailItem label="Água/Dia" value={data.agua_litros ? `${data.agua_litros}L` : null} />
        </div>
        <DetailItem label="Suplementos" value={data.suplementos?.join(", ")} />
        <DetailItem label="Restrições" value={data.restricoes_alimentares?.join(", ")} />
        <DetailItem label="Ama" value={data.alimentos_ama} />
        <DetailItem label="Evita" value={data.alimentos_evita} />
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-sm uppercase text-primary tracking-widest border-b border-primary/20 pb-1">Treino</h3>
        <div className="grid grid-cols-2 gap-3">
          <DetailItem label="Anos de Treino" value={data.anos_treino} />
          <DetailItem label="Experiência" value={data.nivel_experiencia} />
        </div>
        <DetailItem label="Disponibilidade" value={data.disponibilidade_dias?.join(", ")} />
      </section>

      {data.faz_uso_ergogenicos && (
        <section className="space-y-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <h3 className="font-display text-sm uppercase text-primary tracking-widest">Recursos Ergogênicos</h3>
          <p className="text-xs text-foreground/90">{data.detalhes_ergogenicos || "Uso confirmado, sem detalhes."}</p>
        </section>
      )}
    </div>
  );
};

const DetailItem = ({ label, value }: { label: string; value: any }) => (
  <div>
    <p className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold">{label}</p>
    <p className="text-xs text-foreground/80 mt-0.5">{value || "—"}</p>
  </div>
);