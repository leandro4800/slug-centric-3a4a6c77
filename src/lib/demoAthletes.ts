export const DEMO_TENANT_ID = "305ebb8b-bb49-4cc0-a4d8-c4af5455f363";

export const DEMO_ATHLETES = [
  {
    id: "2d2f5b51-c1c5-41ce-9acd-f18e33418bdd",
    nome_completo: "Samila Dias",
    email: "samila.demo@coach.app",
    avatar_url: null,
    tenant_id: DEMO_TENANT_ID,
  },
  {
    id: "2bd068e7-96fd-4600-a8ef-9ea1a7cadbda",
    nome_completo: "Marcus Silva",
    email: "marcus.demo@coach.app",
    avatar_url: null,
    tenant_id: DEMO_TENANT_ID,
  },
  {
    id: "18db004a-eefe-4525-8b46-573ae028029a",
    nome_completo: "Jonas Toek",
    email: "jonas.demo@coach.app",
    avatar_url: null,
    tenant_id: DEMO_TENANT_ID,
  },
  {
    id: "78849068-dc41-428f-a413-c46113c0c4fc",
    nome_completo: "Execution Mode",
    email: "execution.demo@coach.app",
    avatar_url: null,
    tenant_id: DEMO_TENANT_ID,
  },
] as const;

export const DEMO_ATHLETE_EMAILS = new Set(DEMO_ATHLETES.map((athlete) => athlete.email));