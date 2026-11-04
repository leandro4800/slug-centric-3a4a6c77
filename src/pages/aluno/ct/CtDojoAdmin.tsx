import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SiteTenantProvider } from "@/hooks/use-site-tenant";
import { useOwnBackButton } from "@/hooks/use-own-back-button";
import DojoVirtual from "@/pages/site-admin/ct/DojoVirtual";

const CtDojoAdminContent = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const voltarAoAppCt = () => {
    navigate(slug ? `/${slug}/app/controle` : "/", { replace: true });
  };

  useOwnBackButton();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Button type="button" variant="ghost" size="sm" onClick={voltarAoAppCt} aria-label="Voltar ao app" className="h-10 w-10 p-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </header>
      <DojoVirtual />
    </div>
  );
};

const CtDojoAdmin = () => (
  <SiteTenantProvider>
    <CtDojoAdminContent />
  </SiteTenantProvider>
);

export default CtDojoAdmin;