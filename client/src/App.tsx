import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Projetos from "./pages/Projetos";
import NovoProjeto from "./pages/NovoProjeto";
import ProjetoDetalhes from "./pages/ProjetoDetalhes";
import AssessmentFase1 from "./pages/AssessmentFase1";
import AssessmentFase2 from "./pages/AssessmentFase2";
import Briefing from "./pages/Briefing";
import PlanoAcao from "./pages/PlanoAcao";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projetos" component={Projetos} />
      <Route path="/projetos/novo" component={NovoProjeto} />
      <Route path="/projetos/:id/assessment/fase1" component={AssessmentFase1} />
      <Route path="/projetos/:id/assessment/fase2" component={AssessmentFase2} />
      <Route path="/projetos/:id/briefing" component={Briefing} />
      <Route path="/projetos/:id/plano" component={PlanoAcao} />
      <Route path="/projetos/:id" component={ProjetoDetalhes} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
