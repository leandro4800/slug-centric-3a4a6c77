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
import AlunoHome from "./pages/aluno/AlunoHome";
import AdminPanel from "./pages/admin/AdminPanel";
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
            {/* Global / neutral */}
            <Route path="/" element={<BrandingProvider><Landing /></BrandingProvider>} />
            <Route path="/login" element={<BrandingProvider><Login /></BrandingProvider>} />

            {/* Tenant-scoped */}
            <Route path="/:slug/app/*" element={
              <BrandingProvider>
                <RequireAuth><AlunoHome /></RequireAuth>
              </BrandingProvider>
            } />
            <Route path="/:slug/admin/*" element={
              <BrandingProvider>
                <RequireAuth><AdminPanel /></RequireAuth>
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
