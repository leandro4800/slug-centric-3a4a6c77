import { Navigate } from "react-router-dom";

/**
 * Rota legada de confirmações antigas.
 * Não consulta auth/Supabase para evitar loop: só manda para /site ou para a landing do coach.
 */
const IndexRedirect = () => {
  const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const confirmed = params.get("confirmed") === "1" || params.get("type") === "signup";
  const safeSlug = slug && /^[a-z0-9-]+$/i.test(slug) ? slug : null;
  const target = safeSlug ? `/${safeSlug}${confirmed ? "?confirmed=1" : ""}` : `/site${confirmed ? "?confirmed=1" : ""}`;

  return <Navigate to={target} replace />;
};

export default IndexRedirect;
