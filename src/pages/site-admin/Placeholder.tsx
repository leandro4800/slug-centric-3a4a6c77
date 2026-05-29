import { LucideIcon, Construction } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
}

const Placeholder = ({ icon: Icon = Construction, title, description }: Props) => (
  <div className="p-4 md:p-8">
    <div className="mb-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Painel</p>
      <h1 className="font-display text-3xl md:text-4xl uppercase italic tracking-tighter flex items-center gap-3">
        <Icon className="h-7 w-7 text-primary" /> {title}
      </h1>
    </div>
    <div className="rounded-2xl border border-dashed border-border p-12 text-center max-w-2xl mx-auto">
      <Construction className="h-12 w-12 text-primary mx-auto mb-4" />
      <h2 className="font-display text-xl uppercase tracking-wider mb-2">Em breve</h2>
      <p className="text-sm text-muted-foreground">
        {description || "Esta tela faz parte do painel do site e está sendo construída para você gerenciar tudo direto daqui, sem precisar abrir o aplicativo."}
      </p>
    </div>
  </div>
);

export default Placeholder;
