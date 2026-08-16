import { auth, defineMcp } from "@lovable.dev/mcp-js";
import echoTool from "./tools/echo";
import listAthletes from "./tools/list_athletes";
import getAthleteWorkout from "./tools/get_athlete_workout";
import getAthleteDiet from "./tools/get_athlete_diet";
import getAthleteProgress from "./tools/get_athlete_progress";
import getAthleteAnamnesis from "./tools/get_athlete_anamnesis";
import addAthlete from "./tools/add_athlete";
import setAthleteWorkout from "./tools/set_athlete_workout";
import updateWorkoutExercise from "./tools/update_workout_exercise";
import deleteWorkoutExercise from "./tools/delete_workout_exercise";
import setAthleteDiet from "./tools/set_athlete_diet";
import listExerciseLibrary from "./tools/list_exercise_library";
import updateAthleteWorkout from "./tools/update_athlete_workout";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "alpha-coach-mcp",
  title: "Alpha Coach MCP",
  version: "0.3.0",
  instructions:
    "Servidor MCP do Alpha Coach. O coach conecta com a própria conta do painel (login OAuth); as ferramentas já operam no tenant dele. Leitura: list_athletes, list_exercise_library (biblioteca de exercícios e vídeos técnicos), get_athlete_workout, get_athlete_diet, get_athlete_progress, get_athlete_anamnesis. Escrita: add_athlete (cadastrar aluno), set_athlete_workout (definir/substituir treino de um dia), update_athlete_workout (criar, editar ou remover um exercício individual via action upsert/delete), update_workout_exercise (editar séries/reps/observação), delete_workout_exercise (remover exercício), set_athlete_diet (montar e publicar dieta). Use echo para testar conectividade.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    echoTool,
    listAthletes,
    getAthleteWorkout,
    getAthleteDiet,
    getAthleteProgress,
    getAthleteAnamnesis,
    addAthlete,
    setAthleteWorkout,
    updateWorkoutExercise,
    deleteWorkoutExercise,
    setAthleteDiet,
    listExerciseLibrary,
  ],
});

