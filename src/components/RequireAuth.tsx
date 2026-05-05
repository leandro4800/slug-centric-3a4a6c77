import { ReactNode } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  requireRole?: "coach" | "admin" | "aluno";
}

export const RequireAuth = ({ children }: Props) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const { slug } = useParams();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to={slug ? `/${slug}/login` : "/login"} state={{ from: location, slug }} replace />;
  }
  return <>{children}</>;
};
