import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { BrandingProvider } from "@/contexts/BrandingProvider";
import { RequireAuth } from "@/components/RequireAuth";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AlunoLayout from "./pages/aluno/AlunoLayout";
import AlunoHome from "./pages/aluno/AlunoHome";
import Treino from "./pages/aluno/Treino";
import Dieta from "./pages/aluno/Dieta";
import Evolucao from "./pages/aluno/Evolucao";
import Clinica from "./pages/aluno/Clinica";
import Comunidade from "./pages/aluno/Comunidade";
import Perfil from "./pages/aluno/Perfil";
import ControleCentral from "./pages/aluno/ControleCentral";
import AdminPanel from "./pages/admin/AdminPanel";
import AdminMontarTreino from "./pages/admin/AdminMontarTreino";
import MeusAtletas from "./pages/admin/MeusAtletas";
import AtletaDetalhe from "./pages/admin/AtletaDetalhe";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<BrandingProvider><Landing /></BrandingProvider>} />
            <Route path="/login" element={<BrandingProvider><Login /></BrandingProvider>} />
            <Route path="/forgot-password" element={<BrandingProvider><ForgotPassword /></BrandingProvider>} />
            <Route path="/reset-password" element={<BrandingProvider><ResetPassword /></BrandingProvider>} />

            <Route
              path="/:slug/app"
              element={
                <BrandingProvider>
                  <RequireAuth><AlunoLayout /></RequireAuth>
                </BrandingProvider>
              }
            >
              <Route index element={<AlunoHome />} />
              <Route path="treino" element={<Treino />} />
              <Route path="dieta" element={<Dieta />} />
              <Route path="evolucao" element={<Evolucao />} />
              <Route path="clinica" element={<Clinica />} />
              <Route path="comunidade" element={<Comunidade />} />
              <Route path="perfil" element={<Perfil />} />
              <Route path="controle" element={<ControleCentral />} />
            </Route>

            <Route path="/:slug/admin" element={
              <BrandingProvider>
                <RequireAuth><AdminPanel /></RequireAuth>
              </BrandingProvider>
            } />
            <Route path="/:slug/admin/montar-treino" element={
              <BrandingProvider>
                <RequireAuth><AdminMontarTreino /></RequireAuth>
              </BrandingProvider>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
