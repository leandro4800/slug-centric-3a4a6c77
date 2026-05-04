import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { BrandingProvider } from "@/contexts/BrandingProvider";
import { RequireAuth } from "@/components/RequireAuth";
import { SubscriptionGuard } from "@/components/SubscriptionGuard";

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
import AdminMontarTreino from "./pages/admin/AdminMontarTreino";
import AdminMontarDieta from "./pages/admin/AdminMontarDieta";
import MeusAtletas from "./pages/admin/MeusAtletas";
import AtletaDetalhe from "./pages/admin/AtletaDetalhe";
import AdminCoaches from "./pages/admin/AdminCoaches";
import AdminPlanos from "./pages/admin/AdminPlanos";
import AdminFaturamento from "./pages/admin/AdminFaturamento";
import AdminBaseConhecimento from "./pages/admin/AdminBaseConhecimento";
import NotFound from "./pages/NotFound";
import Unsubscribe from "./pages/Unsubscribe";

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
          <Routes>
            {/* Marketplace público */}
            <Route path="/" element={<BrandingProvider><Landing /></BrandingProvider>} />
            <Route path="/marketplace" element={<BrandingProvider><Marketplace /></BrandingProvider>} />
            <Route path="/seja-coach" element={<BrandingProvider><SejaCoach /></BrandingProvider>} />
            <Route path="/login" element={<BrandingProvider><Login /></BrandingProvider>} />
            <Route path="/forgot-password" element={<BrandingProvider><ForgotPassword /></BrandingProvider>} />
            <Route path="/reset-password" element={<BrandingProvider><ResetPassword /></BrandingProvider>} />

            {/* Pós-checkout */}
            <Route path="/checkout/sucesso" element={<BrandingProvider><CheckoutSucesso /></BrandingProvider>} />

            {/* Onboarding obrigatório */}
            <Route path="/onboarding" element={<BrandingProvider><RequireAuth><Onboarding /></RequireAuth></BrandingProvider>} />

            {/* Admin AlphaCoach (super admin) */}
            <Route path="/admin/coaches" element={<BrandingProvider><RequireAuth><AdminCoaches /></RequireAuth></BrandingProvider>} />
            <Route path="/admin/faturamento" element={<BrandingProvider><RequireAuth><AdminFaturamento /></RequireAuth></BrandingProvider>} />


            {/* Landing pública do tenant */}
            <Route path="/:slug" element={<BrandingProvider><TenantLanding /></BrandingProvider>} />

            {/* App do aluno */}
            <Route
              path="/:slug/app"
              element={
                <BrandingProvider>
                  <RequireAuth>
                    <SubscriptionGuard>
                      <AlunoLayout />
                    </SubscriptionGuard>
                  </RequireAuth>
                </BrandingProvider>
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
            <Route path="/:slug/admin/aparencia" element={
              <BrandingProvider><RequireAuth><AdminPanel /></RequireAuth></BrandingProvider>
            } />
            <Route path="/:slug/admin/montar-treino" element={
              <BrandingProvider><RequireAuth><AdminMontarTreino /></RequireAuth></BrandingProvider>
            } />
            <Route path="/:slug/admin/montar-dieta" element={
              <BrandingProvider><RequireAuth><AdminMontarDieta /></RequireAuth></BrandingProvider>
            } />
            <Route path="/:slug/admin/atletas" element={
              <BrandingProvider><RequireAuth><MeusAtletas /></RequireAuth></BrandingProvider>
            } />
            <Route path="/:slug/admin/atleta/:atletaId" element={
              <BrandingProvider><RequireAuth><AtletaDetalhe /></RequireAuth></BrandingProvider>
            } />
            <Route path="/:slug/admin/planos" element={
              <BrandingProvider><RequireAuth><AdminPlanos /></RequireAuth></BrandingProvider>
            } />
            <Route path="/:slug/admin/faturamento" element={
              <BrandingProvider><RequireAuth><AdminFaturamento /></RequireAuth></BrandingProvider>
            } />
            <Route path="/:slug/admin/base-conhecimento" element={
              <BrandingProvider><RequireAuth><AdminBaseConhecimento /></RequireAuth></BrandingProvider>
            } />

            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
