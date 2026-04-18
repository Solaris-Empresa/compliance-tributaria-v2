import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { lazy, Suspense } from "react";

// ─── Fallback de carregamento ─────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    </div>
  );
}

// ─── Lazy imports — code splitting por rota ───────────────────────────────────
const Painel = lazy(() => import("./pages/Painel"));
const Projetos = lazy(() => import("./pages/Projetos"));
const NovoProjeto = lazy(() => import("./pages/NovoProjeto"));
const Clientes = lazy(() => import("./pages/Clientes"));
const NovoCliente = lazy(() => import("./pages/NovoCliente"));
const AvaliacaoFase1 = lazy(() => import("./pages/AssessmentFase1"));
const AvaliacaoFase2 = lazy(() => import("./pages/AssessmentFase2"));
const LevantamentoInicial = lazy(() => import("./pages/Briefing"));
const PlanoAcao = lazy(() => import("./pages/PlanoAcao"));
const DashboardExecutivo = lazy(() => import("./pages/DashboardExecutivo"));
const DashboardTarefas = lazy(() => import("./pages/DashboardTarefas"));
const PlanosAcao = lazy(() => import("./pages/PlanosAcao"));
const QuestionarioCorporativo = lazy(() => import("./pages/QuestionarioCorporativo"));
const QuestionariosPorRamo = lazy(() => import("./pages/QuestionariosPorRamo"));
const VisualizarPlanoCorporativo = lazy(() => import("./pages/VisualizarPlanoCorporativo"));
const VisualizarPlanosPorRamo = lazy(() => import("./pages/VisualizarPlanosPorRamo"));
const AprovacaoPlanos = lazy(() => import("./pages/AprovacaoPlanos"));
const ExportarRelatorios = lazy(() => import("./pages/ExportarRelatorios"));
const GestaoPermissoes = lazy(() => import("./pages/GestaoPermissoes"));
const QuadroKanban = lazy(() => import("./pages/QuadroKanban"));
const BibliotecaModelos = lazy(() => import("./pages/BibliotecaTemplates"));
const EditarTemplate = lazy(() => import("./pages/EditarTemplate"));
const MatrizRiscos = lazy(() => import("./pages/MatrizRiscos"));
const MatrizRiscosGlobal = lazy(() => import("./pages/MatrizRiscosGlobal"));
const ProjetoDetalhes = lazy(() => import("./pages/ProjetoDetalhes"));
const ProjetoDetalhesV2 = lazy(() => import("./pages/ProjetoDetalhesV2"));
const GerenciarAcoes = lazy(() => import("./pages/GerenciarAcoes"));
const VisualizadorAuditoria = lazy(() => import("./pages/VisualizadorAuditoria"));
const NotFound = lazy(() => import("./pages/NotFound"));
// Novo Fluxo v2.0
const ModoUso = lazy(() => import("./pages/ModoUso"));
const BriefingInteligente = lazy(() => import("./pages/BriefingInteligente"));
const QuestionarioRamos = lazy(() => import("./pages/QuestionarioRamos"));
const PlanoAcaoSession = lazy(() => import("./pages/PlanoAcaoSession"));
const MatrizRiscosSession = lazy(() => import("./pages/MatrizRiscosSession"));
const Consolidacao = lazy(() => import("./pages/Consolidacao"));
const QuestionarioV3 = lazy(() => import("./pages/QuestionarioV3"));
const QuestionarioCorporativoV2 = lazy(() => import("./pages/QuestionarioCorporativoV2"));
const QuestionarioOperacional = lazy(() => import("./pages/QuestionarioOperacional"));
const QuestionarioCNAE = lazy(() => import("./pages/QuestionarioCNAE"));
const BriefingV3 = lazy(() => import("./pages/BriefingV3"));
const MatrizesV3 = lazy(() => import("./pages/MatrizesV3"));
const PlanoAcaoV3 = lazy(() => import("./pages/PlanoAcaoV3"));
const GerenciarEquipe = lazy(() => import("./pages/GerenciarEquipe"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const AdminEmbeddings = lazy(() => import("./pages/AdminEmbeddings"));
const FormularioProjeto = lazy(() => import("./pages/FormularioProjeto"));
// Compliance Engine v3
const ComplianceDashboardV3 = lazy(() => import("./pages/compliance-v3/ComplianceDashboardV3"));
const GapsV3 = lazy(() => import("./pages/compliance-v3/GapsV3"));
const RisksV3 = lazy(() => import("./pages/compliance-v3/RisksV3"));
const ActionsV3 = lazy(() => import("./pages/compliance-v3/ActionsV3"));
const TasksV3 = lazy(() => import("./pages/compliance-v3/TasksV3"));
const ExportsV3 = lazy(() => import("./pages/compliance-v3/ExportsV3"));
const BriefingEngineView = lazy(() => import("./pages/compliance-v3/BriefingEngineView"));
const ScoreView = lazy(() => import("./pages/compliance-v3/ScoreView"));
// Demo standalone
const DemoLanding = lazy(() => import("./pages/demo/DemoLanding"));
const DemoAssessment = lazy(() => import("./pages/demo/DemoAssessment"));
const DemoDashboard = lazy(() => import("./pages/demo/DemoDashboard"));
const DemoGaps = lazy(() => import("./pages/demo/DemoGaps"));
const DemoRiscos = lazy(() => import("./pages/demo/DemoRiscos"));
const DemoAcoes = lazy(() => import("./pages/demo/DemoAcoes"));
const DemoTarefas = lazy(() => import("./pages/demo/DemoTarefas"));
const GapDiagnostic = lazy(() => import("./pages/GapDiagnostic"));
const RiskDashboard = lazy(() => import("./pages/RiskDashboard"));
const RiskDashboardV4Page = lazy(() => import("./pages/RiskDashboardV4Page")); // Sprint Z-07 PR #C (ADR-0022)
const ActionPlanPage = lazy(() => import("./pages/ActionPlanPage")); // Sprint Z-07 PR #C (ADR-0022)
const ConsolidacaoV4 = lazy(() => import("./pages/ConsolidacaoV4")); // Sprint Z-16 #624
const ConsistencyGate = lazy(() => import("./pages/ConsistencyGate"));
const DiagnosticoStepper = lazy(() => import("./pages/DiagnosticoStepper"));
const AdminConsistencia = lazy(() => import("./pages/AdminConsistencia"));
const AdminCpieDashboard = lazy(() => import("./pages/AdminCpieDashboard"));
const ShadowMonitor = lazy(() => import("./pages/ShadowMonitor"));
const RagCockpit = lazy(() => import("./pages/RagCockpit"));
const TaskBoard = lazy(() => import("./pages/TaskBoard")); // Sprint K — Taskboard P.O. ao vivo (Issue #151)
const QuestionarioSolaris = lazy(() => import("./pages/QuestionarioSolaris")); // K-4-B: Onda 1 SOLARIS
const QuestionarioIaGen = lazy(() => import("./pages/QuestionarioIaGen")); // K-4-C: Onda 2 IA Generativa
const AdminSolarisQuestions = lazy(() => import("./pages/AdminSolarisQuestions")); // Sprint L — DEC-002 Issue #191
const AdminCategorias = lazy(() => import("./pages/AdminCategorias")); // Sprint Z-09 — Categorias configuráveis (ADR-0025)
const QuestionarioProduto = lazy(() => import("./pages/QuestionarioProduto")); // Z-02: DEC-M3-05 v3 · ADR-0010
const QuestionarioServico = lazy(() => import("./pages/QuestionarioServico")); // Z-02: DEC-M3-05 v3 · ADR-0010

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
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
        <Route path="/admin/cpie-dashboard" component={AdminCpieDashboard} />
        <Route path="/admin/shadow-monitor" component={ShadowMonitor} />
        <Route path="/admin/rag-cockpit" component={RagCockpit} />
        <Route path="/admin/taskboard" component={TaskBoard} /> {/* Sprint K — Issue #151 */}
        <Route path="/admin/solaris-questions" component={AdminSolarisQuestions} /> {/* Sprint L — DEC-002 Issue #191 */}
        <Route path="/admin/categorias" component={AdminCategorias} /> {/* Sprint Z-09 — ADR-0025 */}
        {/* Compliance Engine v3 */}
        <Route path="/projetos/:id/compliance-v3" component={ComplianceDashboardV3} />
        <Route path="/projetos/:id/compliance-v3/gaps" component={GapsV3} />
        <Route path="/projetos/:id/compliance-v3/risks" component={RisksV3} />
        <Route path="/projetos/:id/compliance-v3/actions" component={ActionsV3} />
        <Route path="/projetos/:id/compliance-v3/tasks" component={TasksV3} />
        <Route path="/projetos/:id/compliance-v3/exports" component={ExportsV3} />
        {/* Briefing Engine B7 */}
        <Route path="/projetos/:id/compliance-v3/briefing" component={BriefingEngineView} />
        {/* Scoring Engine B8 */}
        <Route path="/projetos/:id/compliance-v3/score" component={ScoreView} />
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
        {/* v2.2 — Consistency Engine */}
        <Route path="/consistencia" component={ConsistencyGate} />
        <Route path="/projetos/:projectId/consistencia" component={ConsistencyGate} />
        {/* v2.2 — Diagnóstico Stepper (orquestrador do fluxo) */}
        <Route path="/projetos/:id/diagnostico-stepper" component={DiagnosticoStepper} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
