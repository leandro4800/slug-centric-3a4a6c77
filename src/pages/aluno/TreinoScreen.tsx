import { useBranding } from "@/contexts/BrandingProvider";
import PersonalTreino from "@/pages/aluno/Treino";
import FightTrainingView from "@/pages/aluno/fight/FightTrainingView";

/** Roteia a tela de treino conforme o segmento do tenant. */
const TreinoScreen = () => {
  const { tenant } = useBranding();
  if (tenant?.vertical === "fight") return <FightTrainingView />;
  return <PersonalTreino />;
};

export default TreinoScreen;
