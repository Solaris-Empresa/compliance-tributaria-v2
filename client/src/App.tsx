import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Painel from "./pages/Painel";
import Projetos from "./pages/Projetos";
import NovoProjeto from "./pages/NovoProjeto";
import Clientes from "./pages/Clientes";
import NovoCliente from "./pages/NovoCliente";
import AssessmentFase1 from "./pages/AssessmentFase1";
import AssessmentFase2 from "./pages/AssessmentFase2";
import Briefing from "@/pages/Briefing";
import PlanoAcao from "@/pages/PlanoAcao";
import MatrizRiscos from "@/pages/MatrizRiscos";
import DashboardExecutivo from "@/pages/DashboardExecutivo";
import ProjetoDetalhes from "./pages/ProjetoDetalhes";
import NotFound from "./pages/NotFound";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Painel} />
      <Route path="/projetos" component={Projetos} />
      <Route path="/projetos/novo" component={NovoProjeto} />
      <Route path="/projetos/:id" component={ProjetoDetalhes} />
      <Route path="/clientes" component={Clientes} />
      <Route path="/clientes/novo" component={NovoCliente} />
      <Route path="/projetos/:id/assessment/fase1" component={AssessmentFase1} />
      <Route path="/projetos/:id/assessment/fase2" component={AssessmentFase2} />
      <Route path="/projetos/:id/briefing" component={Briefing} />
      <Route path="/projetos/:id/plano-acao" component={PlanoAcao} />
      <Route path="/projetos/:id/matriz-riscos" component={MatrizRiscos} />
      <Route path="/dashboard-executivo" component={DashboardExecutivo} />
      {/* Outras rotas serão adicionadas conforme implementação */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
