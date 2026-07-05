import { defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import listAthletes from "./tools/list_athletes";
import getAthleteWorkout from "./tools/get_athlete_workout";
import getAthleteDiet from "./tools/get_athlete_diet";
import getAthleteProgress from "./tools/get_athlete_progress";
import getAthleteAnamnesis from "./tools/get_athlete_anamnesis";
import addAthlete from "./tools/add_athlete";

export default defineMcp({
  name: "alpha-coach-mcp",
  title: "Alpha Coach MCP",
  version: "0.2.0",
  instructions:
    "Servidor MCP do Alpha Coach. Cada coach tem um `mcp_token` (obtenha em Minha Conta) que deve ser passado em todas as chamadas. Ferramentas: list_athletes, get_athlete_workout, get_athlete_diet, get_athlete_progress, get_athlete_anamnesis, add_athlete. Use echo para testar conectividade.",
  tools: [
    echoTool,
    listAthletes,
    getAthleteWorkout,
    getAthleteDiet,
    getAthleteProgress,
    getAthleteAnamnesis,
    addAthlete,
  ],
});
