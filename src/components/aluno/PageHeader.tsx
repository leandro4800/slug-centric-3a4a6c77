import { ArrowLeft, LucideIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingProvider";

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
  const { slug } = useParams();
  const { tenant } = useBranding();

  return (
    <div className="flex items-center gap-3 px-5 pt-6 pb-3">
      {back && (
        <button
          type="button"
          onClick={() => navigate(`/${slug}/app`)}
          className="w-10 h-10 rounded-none bg-primary flex items-center justify-center shrink-0 shadow-glow mt-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
      <div className="w-11 h-11 rounded-none bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-2xl leading-none truncate">{title}</h1>
        {subtitle && (
          <p className="text-[10px] uppercase tracking-widest text-primary mt-1 truncate">{subtitle}</p>
        )}
      </div>
      {showTeam && tenant?.nome && (
        <div
          className="px-3 py-2 rounded-none bg-primary/15 border border-primary/40 text-primary text-[10px] font-bold uppercase tracking-[0.15em] shrink-0 max-w-[9.5rem] truncate shadow-sm"
          title={tenant.nome}
        >
          {tenant.nome}
        </div>
      )}
    </div>
  );
};
