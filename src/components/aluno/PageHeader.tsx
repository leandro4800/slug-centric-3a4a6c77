import { ArrowLeft, LucideIcon } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingProvider";
import { isAthletePanelPath } from "@/lib/athlete-panel";
import { useOwnBackButton } from "@/hooks/use-own-back-button";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  back?: boolean;
  /** Exibe o nome do time/metodologia como badge estático (sem menu). */
  showTeam?: boolean;
}

export const PageHeader = ({
  icon: Icon,
  title,
  subtitle,
  back = true,
  showTeam = true,
}: PageHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { slug } = useParams();
  const { tenant } = useBranding();

  // Esta tela já tem a própria seta: o botão flutuante não deve subir nela.
  useOwnBackButton(back);

  const team = showTeam ? tenant?.nome : null;

  return (
    <div className="px-5 pt-6 pb-3">
      {(back || team) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {back ? (
            <button
              type="button"
              onClick={() => navigate(`/${slug}/${isAthletePanelPath(location.pathname) ? "atleta" : "app"}`)}
              aria-label="Voltar"
              className="w-10 h-10 shrink-0 rounded-none bg-primary flex items-center justify-center shadow-glow"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <span />
          )}
          {team ? (
            <div
              className="min-w-0 max-w-[60%] truncate px-3 py-2 rounded-none bg-primary/15 border border-primary/40 text-primary text-[10px] font-bold uppercase tracking-[0.15em] shadow-sm"
              title={team}
            >
              {team}
            </div>
          ) : (
            <span />
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 shrink-0 rounded-none bg-primary/20 border border-primary/40 flex items-center justify-center shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl leading-tight break-words">{title}</h1>
          {subtitle && (
            <p className="text-[10px] uppercase tracking-widest text-primary mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};
