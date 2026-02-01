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
import AvaliacaoFase1 from "./pages/AssessmentFase1";
import AvaliacaoFase2 from "./pages/AssessmentFase2";
import LevantamentoInicial from "@/pages/Briefing";
import PlanoAcao from "@/pages/PlanoAcao";
import PainelIndicadores from "@/pages/DashboardExecutivo";
import DashboardTarefas from "./pages/DashboardTarefas";
import PlanosAcao from "./pages/PlanosAcao";
import QuestionarioCorporativo from "./pages/QuestionarioCorporativo";
import QuadroKanban from "@/pages/QuadroKanban";
import BibliotecaModelos from "@/pages/BibliotecaTemplates";
import EditarTemplate from "@/pages/EditarTemplate";
import MatrizRiscos from "@/pages/MatrizRiscos";
import MatrizRiscosGlobal from "@/pages/MatrizRiscosGlobal";
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
      <Route path="/projetos/:id/avaliacao/fase1" component={AvaliacaoFase1} />
      <Route path="/projetos/:id/avaliacao/fase2" component={AvaliacaoFase2} />
      <Route path="/projetos/:id/levantamento-inicial" component={LevantamentoInicial} />
      <Route path="/matriz-riscos" component={MatrizRiscosGlobal} />
      <Route path="/projetos/:id/matriz-riscos" component={MatrizRiscos} />
      <Route path="/projetos/:id/plano-acao" component={PlanoAcao} />
      <Route path="/projetos/:id/quadro-kanban" component={QuadroKanban} />
      <Route path="/painel-indicadores" component={PainelIndicadores} />
          <Route path="/dashboard-tarefas" component={DashboardTarefas} />
          <Route path="/projetos/:id/planos-acao" component={PlanosAcao} />
      <Route path="/projetos/:id/questionario-corporativo" component={QuestionarioCorporativo} />
      <Route path="/modelos-padroes" component={BibliotecaModelos} />
      <Route path="/modelos-padroes/:id/editar" component={EditarTemplate} />
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
