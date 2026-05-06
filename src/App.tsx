import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { BrandingProvider } from "@/contexts/BrandingProvider";
import { RequireAuth } from "@/components/RequireAuth";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";
import { SplashScreen } from "@/components/SplashScreen";

import Landing from "./pages/Landing";
import Marketplace from "./pages/Marketplace";
import TenantLanding from "./pages/TenantLanding";
import SejaCoach from "./pages/SejaCoach";
import CheckoutSucesso from "./pages/CheckoutSucesso";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
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
import DrIA from "./pages/aluno/DrIA";
import Anamnese from "./pages/aluno/Anamnese";
import AdminPanel from "./pages/admin/AdminPanel";
import AdminVlogs from "./pages/admin/AdminVlogs";
import AdminMontarTreino from "./pages/admin/AdminMontarTreino";
import AdminMontarDieta from "./pages/admin/AdminMontarDieta";
import MeusAtletas from "./pages/admin/MeusAtletas";
import AtletaDetalhe from "./pages/admin/AtletaDetalhe";
import AdminCoaches from "./pages/admin/AdminCoaches";
import AdminPlanos from "./pages/admin/AdminPlanos";
import AdminFaturamento from "./pages/admin/AdminFaturamento";
import AdminBaseConhecimento from "./pages/admin/AdminBaseConhecimento";
import AdminVideosTecnicos from "./pages/admin/AdminVideosTecnicos";
import NotFound from "./pages/NotFound";
import Unsubscribe from "./pages/Unsubscribe";
import AgendarAulaAvulsa from "./pages/AgendarAulaAvulsa";
import AdminAgendaAvulsa from "./pages/admin/AdminAgendaAvulsa";

const queryClient = new QueryClient();

const SlugRedirect = ({ to }: { to: string }) => {
  const { slug } = useParams();
  return <Navigate to={`/${slug}/${to}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BrandingProvider>
            <SplashScreen />
            <Routes>
            {/* Marketplace público */}
            <Route path="/" element={<Landing />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/seja-coach" element={<SejaCoach />} />
            <Route path="/login" element={<Login />} />
            <Route path="/:slug/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Pós-checkout */}
            <Route path="/checkout/sucesso" element={<CheckoutSucesso />} />

            {/* Onboarding obrigatório */}
            <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />

            {/* Admin AlphaCoach (super admin) */}
            <Route path="/admin/coaches" element={<RequireAuth><AdminCoaches /></RequireAuth>} />
            <Route path="/admin/faturamento" element={<RequireAuth><AdminFaturamento /></RequireAuth>} />

            {/* Landing pública do tenant */}
            <Route path="/:slug" element={<TenantLanding />} />

            {/* App do aluno */}
            <Route
              path="/:slug/app"
              element={
                <RequireAuth>
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
            </Route>

            {/* Painel do coach */}
            <Route path="/:slug/admin" element={<SlugRedirect to="app" />} />
            <Route path="/:slug/admin/controle" element={<SlugRedirect to="app/controle" />} />
            <Route path="/:slug/admin/atletas" element={<RequireAuth><MeusAtletas /></RequireAuth>} />
            <Route path="/:slug/admin/aparencia" element={<RequireAuth><AdminPanel /></RequireAuth>} />
            <Route path="/:slug/admin/montar-treino" element={<RequireAuth><AdminMontarTreino /></RequireAuth>} />
            <Route path="/:slug/admin/montar-dieta" element={<RequireAuth><AdminMontarDieta /></RequireAuth>} />
            <Route path="/:slug/admin/atleta/:atletaId" element={<RequireAuth><AtletaDetalhe /></RequireAuth>} />
            <Route path="/:slug/admin/planos" element={<RequireAuth><AdminPlanos /></RequireAuth>} />
            <Route path="/:slug/admin/faturamento" element={<RequireAuth><AdminFaturamento /></RequireAuth>} />
            <Route path="/:slug/admin/base-conhecimento" element={<RequireAuth><AdminBaseConhecimento /></RequireAuth>} />
            <Route path="/:slug/admin/vlogs" element={<RequireAuth><AdminVlogs /></RequireAuth>} />
            <Route path="/:slug/admin/videos-tecnicos" element={<RequireAuth><AdminVideosTecnicos /></RequireAuth>} />
            <Route path="/:slug/admin/agenda-avulsa" element={<RequireAuth><AdminAgendaAvulsa /></RequireAuth>} />

            {/* Agendamento pós-pagamento (público, via token) */}
            <Route path="/:slug/agendar-aula/:token" element={<AgendarAulaAvulsa />} />

            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrandingProvider>
      </AuthProvider>
    </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
