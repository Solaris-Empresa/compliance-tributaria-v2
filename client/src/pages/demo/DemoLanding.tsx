import { Link } from "wouter";
import {
  LayoutDashboard,
  AlertCircle,
  ShieldAlert,
  ClipboardList,
  CheckSquare,
  ArrowRight,
  Beaker,
  Zap,
  Database,
  GitBranch,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEMO } from "@/lib/demo-engine";

const FEATURES = [
  {
    href: "/demo",
    icon: LayoutDashboard,
    title: "Dashboard Executivo",
    desc: "Radar de compliance por domínio, KPIs, matriz de risco 4×4 e score geral.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    href: "/demo/gaps",
    icon: AlertCircle,
    title: "Gaps de Compliance",
    desc: "Requisitos não atendidos, critérios faltantes, evidências e ações recomendadas.",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    href: "/demo/riscos",
    icon: ShieldAlert,
    title: "Matriz de Riscos",
    desc: "Análise probabilidade × impacto com impacto financeiro estimado por requisito.",
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    href: "/demo/acoes",
    icon: ClipboardList,
    title: "Plano de Ação",
    desc: "Ações estruturadas por prioridade (imediata → planejamento) com cronograma.",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    href: "/demo/tarefas",
    icon: CheckSquare,
    title: "Tarefas Atômicas",
    desc: "Tarefas granulares por tipo de gap com responsável, prazo e ordem de execução.",
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

const ENGINE_FEATURES = [
  { icon: Database, text: "138 requisitos regulatórios em 12 domínios" },
  { icon: GitBranch, text: "Motor determinístico com blend IA 85/15" },
  { icon: TrendingDown, text: "Gap engine com priorityScore composto" },
  { icon: ShieldAlert, text: "Matriz de risco 4×4 com 5 regras determinísticas" },
  { icon: ClipboardList, text: "Plano de ação atômico por tipo de gap" },
  { icon: Zap, text: "Tarefas com ordem de execução global" },
];

export default function DemoLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
      {/* Header */}
      <header className="border-b border-white/10 px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center">
              <Beaker className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Compliance Engine v3</p>
              <p className="text-slate-400 text-xs">Reforma Tributária · LC 214/2023</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
              DEMONSTRAÇÃO
            </Badge>
            <a href="/" className="text-xs text-slate-400 hover:text-white transition-colors">
              Sistema completo →
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-8 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full px-4 py-1.5 text-xs font-medium mb-6">
            <Zap className="w-3.5 h-3.5" />
            Motor v3 · 205/205 testes passando · Dados gerados em tempo real
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Compliance Engine v3<br />
            <span className="text-blue-400">para a Reforma Tributária</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Demonstração com dados de exemplo realistas gerados pelo motor determinístico real.
            Empresa fictícia em situação crítica de adequação à LC 214/2023.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Score Geral", value: `${DEMO.overallScore}/100`, color: "text-red-400", sub: "Crítico" },
            { label: "Riscos Críticos", value: DEMO.criticalRisks, color: "text-red-400", sub: "Ação imediata" },
            { label: "Ações Imediatas", value: DEMO.immediateActions, color: "text-orange-400", sub: "≤ 15 dias" },
            { label: "Requisitos", value: DEMO.totalRequirements, color: "text-blue-400", sub: "Avaliados" },
          ].map(stat => (
            <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-white text-sm font-medium mt-1">{stat.label}</p>
              <p className="text-slate-400 text-xs mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {FEATURES.map(feature => (
            <Link key={feature.href} href={feature.href}>
              <a className="block bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-white/20 transition-all group">
                <div className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center mb-3`}>
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <h3 className="text-white font-semibold text-sm mb-1.5">{feature.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{feature.desc}</p>
                <div className="flex items-center gap-1 mt-3 text-blue-400 text-xs font-medium">
                  Explorar <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </a>
            </Link>
          ))}
        </div>

        {/* Engine features */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-white font-bold text-base mb-4">Sobre o Motor v3</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ENGINE_FEATURES.map(f => (
              <div key={f.text} className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center shrink-0">
                  <f.icon className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="text-slate-300 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <p className="text-slate-400 text-xs">
              Fórmula: <code className="text-blue-300 font-mono">baseScore = criteria×0.50 + evidence×0.30 + operational×0.20</code>
            </p>
            <Link href="/demo">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                Iniciar Demo <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
