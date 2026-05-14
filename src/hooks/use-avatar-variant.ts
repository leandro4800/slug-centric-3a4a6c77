import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Variant = "treinando" | "celebracao";

const FIELD: Record<Variant, "avatar_treinando_url" | "avatar_celebracao_url"> = {
  treinando: "avatar_treinando_url",
  celebracao: "avatar_celebracao_url",
};

/**
 * Busca o avatar da variante (treinando/celebracao) do perfil.
 * Se ainda não existir, gera via edge function `gerar-avatar-carta` UMA ÚNICA VEZ
 * (cache em perfis), evitando gasto repetido de IA.
 */
export function useAvatarVariant(variant: Variant, opts: { enabled?: boolean } = {}) {
  const { enabled = true } = opts;
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !user) return;
    let cancel = false;
    const field = FIELD[variant];

    (async () => {
      setLoading(true);
      try {
        const { data: perfil } = await supabase
          .from("perfis")
          .select(`${field}, avatar_url, sexo`)
          .eq("id", user.id)
          .maybeSingle<any>();

        if (cancel) return;

        const cached = perfil?.[field];
        if (cached) {
          setUrl(cached);
          setLoading(false);
          return;
        }

        // Tenta usar a foto original da carta (mais fiel ao rosto); fallback avatar_url
        const { data: carta } = await supabase
          .from("cartas_atleta")
          .select("foto_original_url, avatar_carta_url")
          .eq("aluno_id", user.id)
          .maybeSingle();

        const foto =
          carta?.foto_original_url ||
          carta?.avatar_carta_url ||
          perfil?.avatar_url;

        if (!foto) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke("gerar-avatar-carta", {
          body: { foto_url: foto, sexo: perfil?.sexo, variant, user_id: user.id },
        });
        if (cancel) return;
        if (!error && (data as any)?.avatar_url) {
          setUrl((data as any).avatar_url);
        }
      } catch (e) {
        console.warn(`useAvatarVariant(${variant}) falhou`, e);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, [user, variant, enabled]);

  return { url, loading };
}
