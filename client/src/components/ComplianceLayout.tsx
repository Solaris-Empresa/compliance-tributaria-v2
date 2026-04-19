import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import {
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  X,
  BookOpen,
  Plus,
  Cpu,
  Shield,
  Activity,
  Database,
  Upload,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ROLES } from "@shared/translations";
import RealtimeNotifications from "./RealtimeNotifications";
import OnboardingTour, { useOnboardingTour } from "./OnboardingTour";

interface ComplianceLayoutProps {
  children: React.ReactNode;
}

export default function ComplianceLayout({ children }: ComplianceLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const { data: activeCountData } = trpc.projects.getActiveCount.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebar_open");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try { localStorage.setItem("sidebar_open", String(next)); } catch {}
      return next;
    });
  };
  const [showTour, setShowTour] = useState(false);

  const { shouldShowTour, canResumeTour, isLoading: tourLoading, refetch } =
    useOnboardingTour();

  // Disparar tour automaticamente no primeiro login
  // (shouldShowTour só é true quando isNew === true)
  // Fix: useEffect evita setState durante render — causa do crash ErrorBoundary
  useEffect(() => {
    if (!tourLoading && shouldShowTour && !showTour) {
      setShowTour(true);
    }
  }, [tourLoading, shouldShowTour, showTour]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold mb-4">IA SOLARIS</h1>
          <p className="text-muted-foreground mb-6">
            Plataforma de Assessment, Matriz de Riscos e Plano de Ação para Compliance Tributário
          </p>
          <Button asChild size="lg">
            <a href={getLoginUrl()}>Entrar</a>
          </Button>
        </div>
      </div>
    );
  }

  const navItems: Array<{
    href: string;
    icon: typeof LayoutDashboard;
    label: string;
    testId?: string;
  }> = [
    { href: "/", icon: LayoutDashboard, label: "Painel" },
    { href: "/projetos", icon: FolderKanban, label: "Projetos" },
    { href: "/clientes", icon: Users, label: "Clientes" },
    // fix(z22): item "Dashboard Compliance" removido do sidebar global — acesso via botão contextual em ProjetoDetalhesV2 (#731)
  ];

  if (user?.role === "equipe_solaris") {
    navItems.push({ href: "/usuarios", icon: Users, label: "Usuários" });
    navItems.push({ href: "/admin/embeddings", icon: Cpu, label: "Embeddings" });
    navItems.push({ href: "/admin/consistencia", icon: Shield, label: "Consistência" });
    // fix(z22): item "Dashboard CPIE" admin removido — legado CPIE-B (ADR-0023 · 0/2367 analisados). Página será deletada em PR #2 Wave B.
    navItems.push({ href: "/admin/shadow-monitor", icon: Activity, label: "Shadow Monitor" });
    navItems.push({ href: "/admin/rag-cockpit", icon: Database, label: "RAG Cockpit" });
    navItems.push({ href: "/admin/solaris-questions", icon: Upload, label: "Upload Perguntas SOLARIS" }); // Sprint L — DEC-002
    navItems.push({ href: "/admin/categorias", icon: Database, label: "Categorias de Risco" }); // Sprint Z-09 — ADR-0025
  }

  if (user?.role === "cliente") {
    navItems.push({ href: "/gerenciar-equipe", icon: Users, label: "Minha Equipe" });
  }

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Tour de onboarding */}
      {showTour && (
        <OnboardingTour
          onComplete={() => {
            setShowTour(false);
            refetch();
          }}
          onSkip={() => {
            setShowTour(false);
            refetch();
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-card border-r border-border flex flex-col transition-all duration-300`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {sidebarOpen && (
            <div>
              <h1 className="text-xl font-bold">IA SOLARIS</h1>
              <p className="text-xs text-muted-foreground">Compliance Tributário</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Botão Novo Projeto — destaque principal da sidebar */}
        <div className="px-4 py-3 border-b border-border">
          <Link href="/projetos/novo">
            <button
              className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all ${
                sidebarOpen ? "justify-start" : "justify-center"
              }`}
              title="Novo Projeto"
            >
              <Plus className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span>Novo Projeto</span>}
            </button>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isProjects = item.href === "/projetos";
            const activeCount = activeCountData?.count ?? 0;
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                data-testid={item.testId}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="flex-1">{item.label}</span>
                )}
                {isProjects && activeCount > 0 && (
                  <span
                    className={`text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                      isActive(item.href)
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                    title={`${activeCount} projeto${activeCount !== 1 ? "s" : ""} ativo${activeCount !== 1 ? "s" : ""}`}
                  >
                    {activeCount}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Botão Retomar Tour — visível apenas quando há progresso parcial */}
          {canResumeTour && !showTour && (
            <button
              onClick={() => setShowTour(true)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer w-full text-left hover:bg-accent text-foreground border border-dashed border-border mt-2"
              title="Retomar tour de onboarding"
            >
              <div className="relative flex-shrink-0">
                <BookOpen className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
              </div>
              {sidebarOpen && (
                <span className="flex items-center gap-2 text-sm">
                  Retomar Tour
                  <Badge variant="secondary" className="text-xs py-0 px-1.5">Novo</Badge>
                </span>
              )}
            </button>
          )}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-border">
          {sidebarOpen ? (
            <div className="space-y-2">
              <div className="text-sm">
                <p className="font-medium">{user?.name || "Usuário"}</p>
                <p className="text-xs text-muted-foreground">
                  {ROLES[user?.role as keyof typeof ROLES] || user?.role}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logout()}
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Notificações em tempo real */}
        <div className="fixed top-4 right-4 z-50">
          <RealtimeNotifications />
        </div>
        {children}
      </main>
    </div>
  );
}
