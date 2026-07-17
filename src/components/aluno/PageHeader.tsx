import { ArrowLeft, LucideIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";


interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  back?: boolean;
}


export const PageHeader = ({ icon: Icon, title, subtitle, back = true }: PageHeaderProps) => {
  const navigate = useNavigate();
  const { slug } = useParams();
  
  return (
    <div className="flex items-center gap-3 px-5 pt-6 pb-3">
      {back && (
        <button
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
      
    </div>
  );
};
