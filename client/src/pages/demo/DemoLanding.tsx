import { useLocation } from "wouter";
import { SCENARIO_META, SCENARIOS, type ScenarioKey } from "@/lib/demo-engine";
import { Zap, ArrowRight } from "lucide-react";

export default function DemoLanding() {
  const [, navigate] = useLocation();

  const scenarios: ScenarioKey[] = ["simples", "medio", "complexo"];

  function handleSelect(key: ScenarioKey) {
    navigate(`/demo/dashboard?scenario=${key}`);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm select-none">
          CE
        </div>
        <div>
          <div className="font-semibold text-sm leading-tight">Compliance Engine</div>
          <div className="text-xs text-slate-400">v3 · Demonstração</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs bg-blue-900/50 text-blue-300 border border-blue-800 rounded-full px-3 py-1">
            DEMO · Motor v3 real · 205 testes
          </span>
          <a href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Sistema completo →
          </a>
        </div>
      </header>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-900/30 border border-blue-800 rounded-full px-4 py-2 text-sm text-blue-300 mb-8">
            <Zap className="w-3.5 h-3.5" />
            Reforma Tributária 2026 · LC 214/2023 · IBS/CBS/IS
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Compliance Engine v3
          </h1>
          <p className="text-xl text-slate-300 mb-3">
            Diagnóstico de conformidade tributária com IA
          </p>
          <p className="text-slate-400 mb-12 max-w-xl mx-auto text-sm leading-relaxed">
            Escolha um perfil de empresa para explorar o diagnóstico completo gerado pelo motor v3:
            radar de compliance, matriz de riscos 4×4, plano de ação e tarefas atômicas.
          </p>

          {/* Scenario cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {scenarios.map((key) => {
              const meta = SCENARIO_META[key];
              const data = SCENARIOS[key];
              const borderClass =
                key === "simples" ? "border-emerald-800 hover:border-emerald-500" :
                key === "medio" ? "border-amber-800 hover:border-amber-500" :
                "border-red-900 hover:border-red-600";
              const badgeClass =
                key === "simples" ? "bg-emerald-900/50 text-emerald-300" :
                key === "medio" ? "bg-amber-900/50 text-amber-300" :
                "bg-red-900/50 text-red-300";
              const scoreClass =
                key === "simples" ? "text-emerald-400" :
                key === "medio" ? "text-amber-400" : "text-red-400";
              const btnClass =
                key === "simples" ? "bg-emerald-700 hover:bg-emerald-600" :
                key === "medio" ? "bg-amber-700 hover:bg-amber-600" :
                "bg-red-800 hover:bg-red-700";

              return (
                <button
                  key={key}
                  onClick={() => handleSelect(key)}
                  className={`group text-left rounded-xl border-2 p-6 transition-all duration-200 bg-slate-900 hover:bg-slate-800 ${borderClass}`}
                >
                  {/* Badge */}
                  <div className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 mb-4 ${badgeClass}`}>
                    <span>{meta.icon}</span>
                    {meta.badge}
                  </div>

                  <h3 className="font-bold text-lg mb-1 text-white">{meta.label}</h3>
                  <p className="text-sm text-slate-400 mb-3">{meta.subtitle}</p>
                  <p className="text-xs text-slate-500 mb-5 leading-relaxed text-left">{meta.description}</p>

                  {/* Score + stats */}
                  <div className="flex items-end gap-3 mb-5">
                    <div>
                      <div className={`text-3xl font-bold ${scoreClass}`}>{data.overallScore}</div>
                      <div className="text-xs text-slate-500">score /100</div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-800 rounded-lg p-2 text-center">
                        <div className="font-bold text-red-400">{data.criticalRisks}</div>
                        <div className="text-slate-500">críticos</div>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-2 text-center">
                        <div className="font-bold text-orange-400">{data.immediateActions}</div>
                        <div className="text-slate-500">imediatas</div>
                      </div>
                    </div>
                  </div>

                  <div className={`w-full py-2.5 rounded-lg text-sm font-semibold text-center transition-all text-white flex items-center justify-center gap-2 ${btnClass}`}>
                    Explorar cenário <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation guide */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-left max-w-lg mx-auto">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Fluxo de navegação</h4>
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
              {["Dashboard", "Gaps", "Riscos", "Plano de Ação", "Tarefas"].map((step, i, arr) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-slate-300">{step}</span>
                  {i < arr.length - 1 && <span className="text-slate-600">→</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-4 text-center text-xs text-slate-600">
        IA Solaris · Compliance Engine v3 · Dados fictícios gerados pelo motor real para fins de demonstração
      </footer>
    </div>
  );
}
