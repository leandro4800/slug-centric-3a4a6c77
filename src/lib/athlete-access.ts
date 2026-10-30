import { PRODUCTION_APP_ORIGIN } from "@/lib/app-url";

export const ATHLETE_PANEL_URL = `${PRODUCTION_APP_ORIGIN}/atleta`;

export const formatVipAccess = (email: string, password: string) =>
  `Login: ${email}\nSenha: ${password}\nLink do app: ${PRODUCTION_APP_ORIGIN}/alphateam\nPainel do atleta: ${ATHLETE_PANEL_URL}`;