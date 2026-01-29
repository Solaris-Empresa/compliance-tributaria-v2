import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { 
  BarChart3,
  FileText, 
  FolderKanban, 
  LayoutDashboard, 
  LogOut, 
  Menu,
  Users,
  X,
  Library
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ROLES } from "@shared/translations";

interface ComplianceLayoutProps {
  children: React.ReactNode;
}

export default function ComplianceLayout({ children }: ComplianceLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Painel" },
    { href: "/projetos", icon: FolderKanban, label: "Projetos" },
    { href: "/clientes", icon: Users, label: "Clientes" },
    { href: "/templates", icon: Library, label: "Templates" },
    { href: "/dashboard-executivo", icon: BarChart3, label: "Dashboard Executivo" },
  ];

  // Adicionar item de usuários apenas para equipe SOLARIS
  if (user?.role === "equipe_solaris") {
    navItems.push({ href: "/usuarios", icon: Users, label: "Usuários" });
  }

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  return (
    <div className="min-h-screen flex bg-background">
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
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </div>
            </Link>
          ))}
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
        {children}
      </main>
    </div>
  );
}
