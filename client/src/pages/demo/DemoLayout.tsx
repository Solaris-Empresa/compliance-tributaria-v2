import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  AlertCircle,
  ShieldAlert,
  ClipboardList,
  CheckSquare,
  ExternalLink,
  ChevronRight,
  Beaker,
  Info,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SCENARIO_META, SCENARIOS, type ScenarioKey } from "@/lib/demo-engine";

function useScenario(): ScenarioKey {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);
  const s = params.get("scenario");
  if (s === "simples" || s === "medio" || s === "complexo") return s;
  return "complexo";
}

function navHref(base: string, scenario: ScenarioKey) {
  return `${base}?scenario=${scenario}`;
}

const NAV_ITEMS = [
  { base: "/demo/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { base: "/demo/gaps", label: "Gaps de Compliance", icon: AlertCircle },
  { base: "/demo/riscos", label: "Matriz de Riscos", icon: ShieldAlert },
  { base: "/demo/acoes", label: "Plano de Ação", icon: ClipboardList },
  { base: "/demo/tarefas", label: "Tarefas Atômicas", icon: CheckSquare },
];

type Props = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
};

export default function DemoLayout({ children, title, subtitle }: Props) {
  const [location] = useLocation();
  const scenario = useScenario();
  const meta = SCENARIO_META[scenario];
  const data = SCENARIOS[scenario];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 sticky top-0 h-screen overflow-y-auto">
        {/* Logo */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <Beaker className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">Compliance Engine</p>
              <p className="text-xs text-slate-500">v3 · Demonstração</p>
            </div>
          </div>
        </div>

        {/* Scenario badge */}
        <div className={`mx-3 mt-3 p-2.5 rounded-lg border ${
          scenario === "simples" ? "bg-emerald-50 border-emerald-200" :
          scenario === "medio" ? "bg-amber-50 border-amber-200" :
          "bg-red-50 border-red-200"
        }`}>
          <div className="flex items-start gap-1.5">
            <Info className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
              scenario === "simples" ? "text-emerald-600" :
              scenario === "medio" ? "text-amber-600" : "text-red-600"
            }`} />
            <div>
              <p className={`text-xs font-semibold leading-tight ${
                scenario === "simples" ? "text-emerald-700" :
                scenario === "medio" ? "text-amber-700" : "text-red-700"
              }`}>
                {meta.icon} {meta.badge}
              </p>
              <p className={`text-xs mt-0.5 leading-snug ${
                scenario === "simples" ? "text-emerald-600" :
                scenario === "medio" ? "text-amber-600" : "text-red-600"
              }`}>
                {meta.subtitle} · Score {data.overallScore}/100
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 mt-2">
          {NAV_ITEMS.map(({ base, label, icon: Icon }) => {
            const href = navHref(base, scenario);
            const isActive = location === base || location.startsWith(base);
            return (
              <Link key={base} href={href}>
                <a
                  className={[
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  ].join(" ")}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5" />}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 space-y-1">
          <Link href="/demo">
            <a className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-blue-600 hover:bg-blue-50 transition-colors font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              Trocar cenário
            </a>
          </Link>
          <a
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Ir para o sistema completo
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Page header */}
        <div className="bg-white border-b border-slate-200 px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 bg-blue-50">
                  DEMO
                </Badge>
                <span className="text-xs text-slate-400">{meta.subtitle} · Reforma Tributária 2026</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">{title}</h1>
              {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
