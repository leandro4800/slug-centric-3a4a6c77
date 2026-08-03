/** Resolves Supabase URL for web, PWA and Capacitor (Vite inlines env at build time). */
export const getSupabaseUrl = (): string => {
  const direct = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (direct?.trim()) return direct.trim();

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
  if (projectId?.trim()) return `https://${projectId.trim()}.supabase.co`;

  return "";
};

export const getSupabaseAnonKey = (): string =>
  ((import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ?? "").trim();
