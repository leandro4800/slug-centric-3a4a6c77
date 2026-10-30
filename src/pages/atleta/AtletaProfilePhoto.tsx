import { useRef, useState } from "react";
import { Camera, Loader2, UserRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { saveAthleteProfilePhoto } from "@/lib/athlete-profile-photo";

export default function AtletaProfilePhoto({ url }: { url?: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const { tenant } = useBranding();
  const client = useQueryClient();
  return <div className="relative shrink-0">
    <Button variant="ghost" size="icon" className="h-20 w-20 rounded-full border border-border bg-card p-0 shadow-none" aria-label="Alterar foto de perfil" title="Alterar foto de perfil" disabled={busy} onClick={() => input.current?.click()}>
      {busy ? <Loader2 className="animate-spin" /> : url ? <img src={url} alt="Foto de perfil" className="h-full w-full object-cover" /> : <UserRound />}
    </Button>
    <Camera className="pointer-events-none absolute bottom-0 right-0 h-6 w-6 rounded-full border border-border bg-background p-1 text-primary" />
    <input ref={input} type="file" accept="image/*" className="hidden" aria-label="Enviar foto de perfil" onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = "";
      if (!file || !user || !tenant || busy) return;
      setBusy(true);
      try {
        await saveAthleteProfilePhoto(user.id, tenant.id, file);
        await client.invalidateQueries({ queryKey: ["athlete-panel-monitoring", user.id, tenant.id] });
        toast.success("Foto de perfil atualizada.");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a foto."); }
      finally { setBusy(false); }
    }} />
  </div>;
}