import { ArrowLeft, ChevronDown, LucideIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingProvider";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  showTeam?: boolean;
  back?: boolean;
}

export const PageHeader = ({ icon: Icon, title, subtitle, showTeam = true, back = true }: PageHeaderProps) => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { tenant } = useBranding();
  return (
    <div className="flex items-center gap-3 px-5 pt-6 pb-3">
      {back && (
        <button
          onClick={() => navigate(`/${slug}/app`)}
          className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
      <div className="w-11 h-11 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-2xl leading-none truncate">{title}</h1>
        {subtitle && (
          <p className="text-[10px] uppercase tracking-widest text-accent mt-1 truncate">{subtitle}</p>
        )}
      </div>
      {showTeam && (
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-secondary text-xs font-semibold uppercase tracking-wider shrink-0">
          {tenant?.nome || "Time"} <ChevronDown className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};
