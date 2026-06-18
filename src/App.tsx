import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { BrandingProvider, useBranding } from "@/contexts/BrandingProvider";
import { RequireAuth } from "@/components/RequireAuth";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { SplashScreen } from "@/components/SplashScreen";
import InstallPwaPrompt from "@/components/InstallPwaPrompt";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import PushNotificationManager from "@/components/PushNotificationManager";

import Landing from "./pages/Landing";
import IndexRedirect from "./pages/IndexRedirect";
import Marketplace from "./pages/Marketplace";
import TenantLanding from "./pages/TenantLanding";
import SejaCoach from "./pages/SejaCoach";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import SiteLogin from "./pages/SiteLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AlunoLayout from "./pages/aluno/AlunoLayout";
import AlunoHome from "./pages/aluno/AlunoHome";
import Treino from "./pages/aluno/Treino";
import Dieta from "./pages/aluno/Dieta";
import Evolucao from "./pages/aluno/Evolucao";
import CompararEvolucao from "./pages/aluno/CompararEvolucao";
import Clinica from "./pages/aluno/Clinica";
import Comunidade from "./pages/aluno/Comunidade";
import Perfil from "./pages/aluno/Perfil";
import ControleCentral from "./pages/aluno/ControleCentral";
import Parceiros from "./pages/aluno/Parceiros";
import DrIA from "./pages/aluno/DrIA";
import Anamnese from "./pages/aluno/Anamnese";
import AdminPanel from "./pages/admin/AdminPanel";
import AdminVlogs from "./pages/admin/AdminVlogs";
import AdminMontarTreino from "./pages/admin/AdminMontarTreino";
import AdminMontarDieta from "./pages/admin/AdminMontarDieta";
import MeusAtletas from "./pages/admin/MeusAtletas";
import AtletaDetalhe from "./pages/admin/AtletaDetalhe";
import AtletaCarta from "./pages/admin/AtletaCarta";
import Carta from "./pages/aluno/Carta";
import Scheduling from "./pages/aluno/Scheduling";
import AdminCoaches from "./pages/admin/AdminCoaches";
import AdminDebugPush from "./pages/admin/AdminDebugPush";
import AdminBaseConhecimento from "./pages/admin/AdminBaseConhecimento";
import AdminVideosTecnicos from "./pages/admin/AdminVideosTecnicos";
import NotFound from "./pages/NotFound";
import AdminAgendaPresencial from "./pages/admin/AdminAgendaPresencial";
import AdminFaturamento from "./pages/admin/AdminFaturamento";
import Hub from "./pages/coach/Hub";
import CoachDashboard from "./pages/coach/CoachDashboard";
import RedeemPlan from "./pages/coach/RedeemPlan";
import SiteAdminLayout from "./pages/site-admin/SiteAdminLayout";
import SiteAdminDashboard from "./pages/site-admin/Dashboard";
import SiteAdminAlunos from "./pages/site-admin/Alunos";
import SiteAdminNovoAluno from "./pages/site-admin/NovoAluno";
import SiteAdminPlaceholder from "./pages/site-admin/Placeholder";
import SiteAdminAparencia from "./pages/site-admin/Aparencia";
import SiteAdminFinanceiro from "./pages/site-admin/Financeiro";
import SiteAdminMontarTreino from "./pages/site-admin/MontarTreino";
import SiteAdminMontarDieta from "./pages/site-admin/MontarDieta";
import SiteAdminAvaliacaoFisica from "./pages/site-admin/AvaliacaoFisica";
import SiteAdminFerramentas from "./pages/site-admin/Ferramentas";
import SiteAdminMinhaConta from "./pages/site-admin/MinhaConta";
import SiteAdminSuporte from "./pages/site-admin/Suporte";
import { Calendar as CalendarIcon, Loader2, Palette, Wallet } from "lucide-react";

const queryClient = new QueryClient();

const SlugRedirect = ({ to }: { to: string }) => {
  const { slug } = useParams();
  return <Navigate to={`/${slug}/${to}`} replace />;
};

const IndexTenantRedirect = ({ children }: { children: JSX.Element }) => {
  const { tenant, loading } = useBranding();
  const { user, isLoading: authLoading } = useAuth();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || !tenant?.id) { setIsOwner(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("tenants")
        .select("id")
        .eq("id", tenant.id)
        .eq("owner_user_id", user.id)
        .maybeSingle();
      if (!cancelled) setIsOwner(!!data);
    })();
    return () => { cancelled = true; };
  }, [user?.id, tenant?.id]);

  if (loading || authLoading || (tenant?.id && isOwner === null)) return null;
  if (tenant?.slug) {
    const target = isOwner ? `/${tenant.slug}/app` : `/${tenant.slug}/app`;
    return <Navigate to={target} replace />;
  }
  return children;
};

const NativeStartupRedirect = () => {
  const location = useLocation();
  const { user, sessionReady } = useAuth();
  const search = location.search || window.location.search;

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Carregando...</span>
      </div>
    );
  }

  if (user) return <IndexRedirect />;

  return <Navigate to={`/login${search}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GlobalErrorBoundary>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BrandingProvider>
            <SplashScreen />
            <InstallPwaPrompt />
            <PushNotificationManager />
            <Routes>
            {/* Redirecionamentos de Raiz */}
             <Route path="/" element={<IndexRedirect />} />
             <Route path="/site" element={<Navigate to="/" replace />} />
             <Route path="/marketplace" element={<Navigate to="/" replace />} />

            <Route path="/seja-coach" element={<SejaCoach />} />
            <Route path="/login" element={<Login />} />
            <Route path="/site/login" element={<SiteLogin />} />

            {/* Site admin (painel do coach, isolado do app) */}
            <Route path="/site/admin" element={<SiteAdminLayout />}>
              <Route index element={<Navigate to="/site/admin/dashboard" replace />} />
              <Route path="dashboard" element={<SiteAdminDashboard />} />
              <Route path="alunos" element={<SiteAdminAlunos />} />
              <Route path="alunos/novo" element={<SiteAdminNovoAluno />} />
              <Route path="treinos" element={<SiteAdminMontarTreino />} />
              <Route path="dieta" element={<SiteAdminMontarDieta />} />
              <Route path="avaliacao-fisica" element={<SiteAdminAvaliacaoFisica />} />
              <Route path="agenda" element={<SiteAdminPlaceholder icon={CalendarIcon} title="Agenda" description="Em breve: agenda de aulas presenciais e online." />} />
              <Route path="ferramentas" element={<SiteAdminFerramentas />} />
              <Route path="aparencia" element={<SiteAdminAparencia />} />
              <Route path="faturamento" element={<SiteAdminFinanceiro />} />
              <Route path="minha-conta" element={<SiteAdminMinhaConta />} />
              <Route path="suporte" element={<SiteAdminSuporte />} />
              <Route path="resumo" element={<Navigate to="/site/admin/dashboard" replace />} />
            </Route>
            <Route path="/:slug/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/join/:token" element={<RedeemPlan />} />
            <Route path="/:slug/join/:token" element={<RedeemPlan />} />

            {/* Onboarding obrigatório */}
            <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
            <Route path="/:slug/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />

            {/* Admin AlphaCoach (super admin) */}
            <Route path="/admin/coaches" element={<RequireAuth requireRole="admin"><AdminCoaches /></RequireAuth>} />
            <Route path="/admin/debug-push" element={<RequireAuth requireRole="admin"><AdminDebugPush /></RequireAuth>} />

            {/* Landing pública do coach (Vendas) */}
            <Route path="/:slug" element={<TenantLanding />} />
            <Route path="/:slug/site" element={<TenantLanding />} />


            {/* App do aluno */}
            <Route path="/index.html" element={<NativeStartupRedirect />} />
            <Route path="/index" element={<NativeStartupRedirect />} />
            <Route path="/:slug/index" element={<NativeStartupRedirect />} />

            <Route
              path="/:slug/app"
              element={
                <RequireAuth checkTenant>
                  <SubscriptionGuard>
                    <AlunoLayout />
                  </SubscriptionGuard>
                </RequireAuth>
              }
            >
              <Route index element={<AlunoHome />} />
              <Route path="treino" element={<Treino />} />
              <Route path="dieta" element={<Dieta />} />
              <Route path="evolucao" element={<Evolucao />} />
              <Route path="evolucao/comparar" element={<CompararEvolucao />} />
              <Route path="clinica" element={<Clinica />} />
              <Route path="dr-ia" element={<DrIA />} />
              <Route path="comunidade" element={<Comunidade />} />
              <Route path="perfil" element={<Perfil />} />
              <Route path="anamnese" element={<Anamnese />} />
              <Route path="controle" element={<ControleCentral />} />
              <Route path="parceiros" element={<Parceiros />} />
              <Route path="carta" element={<Carta />} />
              <Route path="presencial" element={<Scheduling />} />
            </Route>


            {/* Painel do coach */}
            <Route path="/:slug/admin" element={<SlugRedirect to="app/controle" />} />
            <Route path="/:slug/admin/controle" element={<SlugRedirect to="app/controle" />} />
            <Route path="/:slug/admin/atletas" element={<RequireAuth requireRole="coach" checkTenant><MeusAtletas /></RequireAuth>} />
            <Route path="/:slug/admin/aparencia" element={<RequireAuth requireRole="coach" checkTenant><AdminPanel /></RequireAuth>} />
            <Route path="/:slug/admin/montar-treino" element={<RequireAuth requireRole="coach" checkTenant><AdminMontarTreino /></RequireAuth>} />
            <Route path="/:slug/admin/montar-dieta" element={<RequireAuth requireRole="coach" checkTenant><AdminMontarDieta /></RequireAuth>} />
            <Route path="/:slug/admin/atleta/:atletaId" element={<RequireAuth requireRole="coach" checkTenant><AtletaDetalhe /></RequireAuth>} />
            <Route path="/:slug/admin/atleta/:atletaId/carta" element={<RequireAuth requireRole="coach" checkTenant><AtletaCarta /></RequireAuth>} />
            <Route path="/:slug/admin/base-conhecimento" element={<RequireAuth requireRole="coach" checkTenant><AdminBaseConhecimento /></RequireAuth>} />
            <Route path="/:slug/admin/vlogs" element={<RequireAuth requireRole="coach" checkTenant><AdminVlogs /></RequireAuth>} />
            <Route path="/:slug/admin/videos-tecnicos" element={<RequireAuth requireRole="coach" checkTenant><AdminVideosTecnicos /></RequireAuth>} />
            <Route path="/:slug/admin/agenda-presencial" element={<RequireAuth requireRole="coach" checkTenant><AdminAgendaPresencial /></RequireAuth>} />
            <Route path="/:slug/admin/faturamento" element={<RequireAuth requireRole="coach" checkTenant><AdminFaturamento /></RequireAuth>} />
            <Route path="/:slug/admin/hub" element={<RequireAuth requireRole="coach" checkTenant><Hub /></RequireAuth>} />
            <Route path="/:slug/admin/dashboard" element={<RequireAuth requireRole="coach" checkTenant><CoachDashboard /></RequireAuth>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrandingProvider>
      </AuthProvider>
      </BrowserRouter>
      </TooltipProvider>
    </GlobalErrorBoundary>
  </QueryClientProvider>
);

export default App;
