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
import DashboardExecutivo from "./pages/DashboardExecutivo";
import DashboardTarefas from "./pages/DashboardTarefas";
import PlanosAcao from "./pages/PlanosAcao";
import QuestionarioCorporativo from "./pages/QuestionarioCorporativo";
import QuestionariosPorRamo from "./pages/QuestionariosPorRamo";
import VisualizarPlanoCorporativo from "./pages/VisualizarPlanoCorporativo";
import VisualizarPlanosPorRamo from "./pages/VisualizarPlanosPorRamo";
import AprovacaoPlanos from "./pages/AprovacaoPlanos";
import ExportarRelatorios from "./pages/ExportarRelatorios";
import GestaoPermissoes from "./pages/GestaoPermissoes";
import QuadroKanban from "@/pages/QuadroKanban";
import BibliotecaModelos from "@/pages/BibliotecaTemplates";
import EditarTemplate from "@/pages/EditarTemplate";
import MatrizRiscos from "@/pages/MatrizRiscos";
import MatrizRiscosGlobal from "@/pages/MatrizRiscosGlobal";
import ProjetoDetalhes from "./pages/ProjetoDetalhes";
import ProjetoDetalhesV2 from "./pages/ProjetoDetalhesV2";
import GerenciarAcoes from "./pages/GerenciarAcoes";
import VisualizadorAuditoria from "./pages/VisualizadorAuditoria";
import NotFound from "./pages/NotFound";
// Novo Fluxo v2.0
import ModoUso from "./pages/ModoUso";
import BriefingInteligente from "./pages/BriefingInteligente";
import QuestionarioRamos from "./pages/QuestionarioRamos";
import PlanoAcaoSession from "./pages/PlanoAcaoSession";
import MatrizRiscosSession from "./pages/MatrizRiscosSession";
import Consolidacao from "./pages/Consolidacao";
import QuestionarioV3 from "./pages/QuestionarioV3";
import BriefingV3 from "./pages/BriefingV3";
import MatrizesV3 from "./pages/MatrizesV3";
import PlanoAcaoV3 from "./pages/PlanoAcaoV3";
import GerenciarEquipe from "./pages/GerenciarEquipe";
import Usuarios from "./pages/Usuarios";
import FormularioProjeto from "./pages/FormularioProjeto";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Painel} />
      <Route path="/projetos" component={Projetos} />
      <Route path="/projetos/novo" component={NovoProjeto} />
      <Route path="/projetos/:id" component={ProjetoDetalhesV2} />
      <Route path="/clientes" component={Clientes} />
      <Route path="/clientes/novo" component={NovoCliente} />
      <Route path="/projetos/:id/avaliacao/fase1" component={AvaliacaoFase1} />
      <Route path="/projetos/:id/avaliacao/fase2" component={AvaliacaoFase2} />
      <Route path="/projetos/:id/levantamento-inicial" component={LevantamentoInicial} />
      <Route path="/matriz-riscos" component={MatrizRiscosGlobal} />
      <Route path="/projetos/:id/matriz-riscos" component={MatrizRiscos} />
      <Route path="/projetos/:id/plano-acao" component={PlanoAcao} />
      <Route path="/projetos/:id/quadro-kanban" component={QuadroKanban} />
      <Route path="/painel-indicadores" component={DashboardExecutivo} />
          <Route path="/dashboard-tarefas" component={DashboardTarefas} />
          <Route path="/projetos/:id/planos-acao" component={PlanosAcao} />
      <Route path="/projetos/:id/questionario-corporativo" component={QuestionarioCorporativo} />
      <Route path="/projetos/:id/questionarios-ramo" component={QuestionariosPorRamo} />
      <Route path="/planos-acao/visualizar-plano-corporativo" component={VisualizarPlanoCorporativo} />
      <Route path="/planos-acao/visualizar-planos-por-ramo" component={VisualizarPlanosPorRamo} />
      <Route path="/planos-acao/gerenciar-acoes" component={GerenciarAcoes} />
      <Route path="/auditoria" component={VisualizadorAuditoria} />
      <Route path="/aprovacao-planos" component={AprovacaoPlanos} />
      <Route path="/exportar-relatorios" component={ExportarRelatorios} />
      <Route path="/gestao-permissoes" component={GestaoPermissoes} />
      <Route path="/modelos-padroes" component={BibliotecaModelos} />
      <Route path="/modelos-padroes/:id/editar" component={EditarTemplate} />
      {/* Outras rotas serão adicionadas conforme implementação */}
      {/* Novo Fluxo v2.0 */}
      <Route path="/modo-uso" component={ModoUso} />
      <Route path="/briefing" component={BriefingInteligente} />
      <Route path="/questionario-ramos" component={QuestionarioRamos} />
      <Route path="/plano-acao-session" component={PlanoAcaoSession} />
      <Route path="/matriz-riscos-session" component={MatrizRiscosSession} />
      <Route path="/consolidacao" component={Consolidacao} />
      {/* Novo Fluxo v3.0 */}
      <Route path="/projetos/:id/formulario" component={FormularioProjeto} />
      <Route path="/projetos/:id/questionario-v3" component={QuestionarioV3} />
      <Route path="/projetos/:id/briefing-v3" component={BriefingV3} />
      <Route path="/projetos/:id/matrizes-v3" component={MatrizesV3} />
      <Route path="/projetos/:id/plano-v3" component={PlanoAcaoV3} />
      <Route path="/gerenciar-equipe" component={GerenciarEquipe} />
      <Route path="/usuarios" component={Usuarios} />
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
