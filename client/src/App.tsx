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
import ProjectHistoryTimeline from "./pages/ProjectHistoryTimeline";
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
import QuestionarioCorporativoV2 from "./pages/QuestionarioCorporativoV2";
import QuestionarioOperacional from "./pages/QuestionarioOperacional";
import QuestionarioCNAE from "./pages/QuestionarioCNAE";
import BriefingV3 from "./pages/BriefingV3";
import MatrizesV3 from "./pages/MatrizesV3";
import PlanoAcaoV3 from "./pages/PlanoAcaoV3";
import GerenciarEquipe from "./pages/GerenciarEquipe";
import Usuarios from "./pages/Usuarios";
import AdminEmbeddings from "./pages/AdminEmbeddings";
import FormularioProjeto from "./pages/FormularioProjeto";
// fix(z22) UAT B-02b: imports compliance-v3 removidos (rota /compliance-v3 retirada — legado com gaps=0).
// Demo standalone
import DemoLanding from "./pages/demo/DemoLanding";
import DemoAssessment from "./pages/demo/DemoAssessment";
import DemoDashboard from "./pages/demo/DemoDashboard";
import DemoGaps from "./pages/demo/DemoGaps";
import DemoRiscos from "./pages/demo/DemoRiscos";
import DemoAcoes from "./pages/demo/DemoAcoes";
import DemoTarefas from "./pages/demo/DemoTarefas";
import GapDiagnostic from "./pages/GapDiagnostic";
import RiskDashboard from "./pages/RiskDashboard";
import RiskDashboardV4Page from "./pages/RiskDashboardV4Page"; // Sprint Z-07 PR #C (ADR-0022)
import ActionPlanPage from "./pages/ActionPlanPage"; // Sprint Z-07 PR #C (ADR-0022)
import ConsolidacaoV4 from "./pages/ConsolidacaoV4"; // Sprint Z-16 #624
import ComplianceDashboard from "./pages/ComplianceDashboard"; // Sprint Z-22 CPIE v3 (#725)
import ConsistencyGate from "./pages/ConsistencyGate";
import DiagnosticoStepper from "./pages/DiagnosticoStepper";
import AdminConsistencia from "./pages/AdminConsistencia";
import ShadowMonitor from "./pages/ShadowMonitor";
import RagCockpit from "./pages/RagCockpit";
import TaskBoard from "./pages/TaskBoard"; // Sprint K — Taskboard P.O. ao vivo (Issue #151)
import QuestionarioSolaris from "./pages/QuestionarioSolaris"; // K-4-B: Onda 1 SOLARIS
import QuestionarioIaGen from "./pages/QuestionarioIaGen"; // K-4-C: Onda 2 IA Generativa
import AdminSolarisQuestions from "./pages/AdminSolarisQuestions"; // Sprint L — DEC-002 Issue #191
import AdminCategorias from "./pages/AdminCategorias"; // Sprint Z-09 — Categorias configuráveis (ADR-0025)
import M1PerfilEntidade from "./pages/M1PerfilEntidade"; // M1 — Runner v3 Perfil da Entidade (feat/m1-archetype-runner-v3)
import QuestionarioProduto from "./pages/QuestionarioProduto"; // Z-02: DEC-M3-05 v3 · ADR-0010
import QuestionarioServico from "./pages/QuestionarioServico"; // Z-02: DEC-M3-05 v3 · ADR-0010

function Router() {
  return (
    <Switch>
      <Route path="/" component={Painel} />
      <Route path="/projetos" component={Projetos} />
      <Route path="/projetos/novo" component={NovoProjeto} />
      <Route path="/projetos/:id" component={ProjetoDetalhesV2} />
      <Route path="/projetos/:id/historico" component={ProjectHistoryTimeline} />
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
      {/* Diagnóstico v2.1 — 3 camadas sequenciais */}
      <Route path="/projetos/:id/questionario-solaris" component={QuestionarioSolaris} />
      <Route path="/projetos/:id/questionario-iagen" component={QuestionarioIaGen} /> {/* K-4-C: Onda 2 */}
      <Route path="/projetos/:id/questionario-corporativo-v2" component={QuestionarioCorporativoV2} />
      <Route path="/projetos/:id/questionario-operacional" component={QuestionarioOperacional} />
      <Route path="/projetos/:id/questionario-cnae" component={QuestionarioCNAE} />
      {/* Z-02 TO-BE: DEC-M3-05 v3 · ADR-0010 — Questionários NCM/NBS */}
      <Route path="/projetos/:id/questionario-produto" component={QuestionarioProduto} />
      <Route path="/projetos/:id/questionario-servico" component={QuestionarioServico} />
      {/* Novo Fluxo v3.0 */}
      <Route path="/projetos/:id/formulario" component={FormularioProjeto} />
      <Route path="/projetos/:id/questionario-v3" component={QuestionarioV3} />
      <Route path="/projetos/:id/briefing-v3" component={BriefingV3} />
      <Route path="/projetos/:id/matrizes-v3" component={MatrizesV3} />
      <Route path="/projetos/:id/plano-v3" component={PlanoAcaoV3} />
      <Route path="/gerenciar-equipe" component={GerenciarEquipe} />
      <Route path="/usuarios" component={Usuarios} />
      <Route path="/admin/embeddings" component={AdminEmbeddings} />
      <Route path="/admin/consistencia" component={AdminConsistencia} />
      <Route path="/admin/shadow-monitor" component={ShadowMonitor} />
      <Route path="/admin/rag-cockpit" component={RagCockpit} />
      <Route path="/admin/taskboard" component={TaskBoard} /> {/* Sprint K — Issue #151 */}
      <Route path="/admin/solaris-questions" component={AdminSolarisQuestions} /> {/* Sprint L — DEC-002 Issue #191 */}
      <Route path="/admin/categorias" component={AdminCategorias} /> {/* Sprint Z-09 — ADR-0025 */}
      <Route path="/admin/m1-perfil" component={M1PerfilEntidade} /> {/* M1 — Runner v3 Perfil da Entidade (feat/m1-archetype-runner-v3) */}
      {/* fix(z22) UAT B-02b: rotas /compliance-v3/* removidas — dashboard legado v3 lia agregados zerados (project_risks_v3 vazia pós hot swap ADR-0022). Substituído por /compliance-dashboard (v4). */}
      {/* Demo standalone — sem login */}
      <Route path="/demo" component={DemoLanding} />
      <Route path="/demo/assessment" component={DemoAssessment} />
      <Route path="/demo/dashboard" component={DemoDashboard} />
      <Route path="/demo/gaps" component={DemoGaps} />
      <Route path="/demo/riscos" component={DemoRiscos} />
      <Route path="/demo/acoes" component={DemoAcoes} />
      <Route path="/demo/tarefas" component={DemoTarefas} />
      <Route path="/diagnostico" component={GapDiagnostic} />
      <Route path="/projetos/:projectId/diagnostico" component={GapDiagnostic} />
      <Route path="/risk-engine" component={RiskDashboard} />
      <Route path="/projetos/:projectId/risk-engine" component={RiskDashboard} />
      {/* Sprint Z-07 — Sistema de Riscos v4 (ADR-0022) */}
      <Route path="/projetos/:projectId/risk-dashboard-v4" component={RiskDashboardV4Page} />
      <Route path="/projetos/:projectId/planos-v4" component={ActionPlanPage} />
      <Route path="/projetos/:projectId/consolidacao-v4" component={ConsolidacaoV4} />
      {/* Sprint Z-22 — CPIE v3 Dashboard on-demand (#725) */}
      <Route path="/projetos/:projectId/compliance-dashboard" component={ComplianceDashboard} />
      {/* v2.2 — Consistency Engine */}
      <Route path="/consistencia" component={ConsistencyGate} />
      <Route path="/projetos/:projectId/consistencia" component={ConsistencyGate} />
      {/* v2.2 — Diagnóstico Stepper (orquestrador do fluxo) */}
      <Route path="/projetos/:id/diagnostico-stepper" component={DiagnosticoStepper} />
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
