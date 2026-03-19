import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, ArrowLeft, Building2, FileText, CheckCircle2, Zap, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ScenarioKey } from "@/lib/demo-engine";

// ─── Dados do formulário ────────────────────────────────────────────────────

const SETORES = [
  { value: "comercio", label: "Comércio / Varejo" },
  { value: "industria", label: "Indústria / Manufatura" },
  { value: "servicos", label: "Serviços / Consultoria" },
  { value: "tecnologia", label: "Tecnologia / Software" },
  { value: "saude", label: "Saúde / Farmácia" },
  { value: "agro", label: "Agronegócio" },
  { value: "financeiro", label: "Financeiro / Seguros" },
  { value: "outro", label: "Outro" },
];

const PORTES = [
  { value: "mei", label: "MEI" },
  { value: "me", label: "ME (Microempresa)" },
  { value: "epp", label: "EPP (Pequeno Porte)" },
  { value: "medio", label: "Médio Porte" },
  { value: "grande", label: "Grande Empresa" },
];

const CNAES = [
  { code: "47.11-3", desc: "Comércio varejista de mercadorias em geral", setor: "comercio" },
  { code: "62.01-5", desc: "Desenvolvimento de programas de computador", setor: "tecnologia" },
  { code: "86.30-5", desc: "Atividades de atenção ambulatorial executadas por médicos", setor: "saude" },
  { code: "25.99-3", desc: "Fabricação de outros produtos de metal", setor: "industria" },
  { code: "69.20-6", desc: "Atividades de contabilidade, consultoria e auditoria", setor: "servicos" },
  { code: "01.11-3", desc: "Cultivo de trigo e de outros cereais", setor: "agro" },
  { code: "64.22-1", desc: "Bancos múltiplos com carteira comercial", setor: "financeiro" },
  { code: "43.30-4", desc: "Obras de acabamento em construções", setor: "outro" },
];

// ─── Perguntas do questionário (1 por domínio) ───────────────────────────────

type Answer = "sim" | "parcial" | "nao";

const QUESTIONS = [
  {
    id: "q1",
    domain: "Governança da Transição",
    question: "Sua empresa já formou um Comitê de Transição Tributária com responsáveis definidos para a Reforma?",
    sim: "Comitê formado, reuniões regulares, responsáveis definidos",
    parcial: "Discussões iniciadas mas sem estrutura formal",
    nao: "Ainda não foi discutido internamente",
  },
  {
    id: "q2",
    domain: "Sistemas ERP e Dados",
    question: "Seu ERP já está sendo atualizado para emitir NF-e com CBS/IBS e calcular os novos tributos?",
    sim: "ERP atualizado ou em processo formal com fornecedor",
    parcial: "Contato iniciado com fornecedor, sem prazo definido",
    nao: "ERP não foi avaliado para a Reforma",
  },
  {
    id: "q3",
    domain: "Gestão Fiscal Operacional",
    question: "Sua equipe fiscal já foi treinada nos novos regimes do IBS, CBS e Imposto Seletivo?",
    sim: "Treinamento concluído ou em andamento com cronograma",
    parcial: "Alguns colaboradores treinados, sem cobertura total",
    nao: "Nenhum treinamento realizado ainda",
  },
  {
    id: "q4",
    domain: "Planejamento Financeiro",
    question: "Já foi feita uma provisão financeira para cobrir os custos da transição tributária (2026–2033)?",
    sim: "Provisão calculada e aprovada pela diretoria",
    parcial: "Estimativas informais, sem aprovação formal",
    nao: "Nenhuma provisão foi calculada",
  },
  {
    id: "q5",
    domain: "Contratos e Fornecedores",
    question: "Os contratos com fornecedores e clientes já foram revisados para incluir cláusulas de reajuste tributário?",
    sim: "Revisão jurídica concluída ou em andamento",
    parcial: "Revisão iniciada para contratos principais",
    nao: "Contratos não foram revisados",
  },
  {
    id: "q6",
    domain: "Cadastros e Tabelas Fiscais",
    question: "O cadastro de produtos/serviços já foi revisado para classificação correta no novo regime (NCM, CEST)?",
    sim: "Revisão completa com nova classificação aplicada",
    parcial: "Revisão parcial dos itens mais relevantes",
    nao: "Cadastro não foi revisado",
  },
  {
    id: "q7",
    domain: "Jurídico e Regulatório",
    question: "Foi feita uma análise jurídica formal da LC 214/2023 e seus impactos no modelo de negócio?",
    sim: "Análise jurídica completa com parecer formal",
    parcial: "Leitura interna da lei, sem parecer formal",
    nao: "Nenhuma análise jurídica realizada",
  },
  {
    id: "q8",
    domain: "Gestão de Pessoas e Cultura",
    question: "Os colaboradores de áreas afetadas (financeiro, fiscal, jurídico, TI) foram comunicados sobre as mudanças?",
    sim: "Comunicação formal realizada com treinamento específico",
    parcial: "Comunicação informal ou parcial",
    nao: "Nenhuma comunicação realizada",
  },
];

// ─── Lógica de determinação do cenário ──────────────────────────────────────

function determineScenario(answers: Record<string, Answer>): ScenarioKey {
  let score = 0;
  for (const ans of Object.values(answers)) {
    if (ans === "sim") score += 2;
    else if (ans === "parcial") score += 1;
    // nao = 0
  }
  const maxScore = QUESTIONS.length * 2; // 16
  const pct = score / maxScore;
  if (pct >= 0.65) return "simples";
  if (pct >= 0.35) return "medio";
  return "complexo";
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function DemoAssessment() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [companyName, setCompanyName] = useState("");
  const [setor, setSetor] = useState("");
  const [porte, setPorte] = useState("");
  const [cnae, setCnae] = useState("");
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [processing, setProcessing] = useState(false);

  const totalQ = QUESTIONS.length;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === totalQ;

  function handleAnswer(qId: string, ans: Answer) {
    setAnswers(prev => ({ ...prev, [qId]: ans }));
    if (currentQ < totalQ - 1) {
      setTimeout(() => setCurrentQ(q => q + 1), 300);
    }
  }

  function handleStartDiagnosis() {
    setProcessing(true);
    const scenario = determineScenario(answers);
    // Simular processamento do motor
    setTimeout(() => {
      navigate(`/demo/dashboard?scenario=${scenario}&company=${encodeURIComponent(companyName || "Empresa Demo")}`);
    }, 2000);
  }

  const canAdvanceStep1 = companyName.trim().length >= 2 && setor && porte;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm select-none">
          CE
        </div>
        <div>
          <div className="font-semibold text-sm leading-tight">Compliance Engine</div>
          <div className="text-xs text-slate-400">v3 · Diagnóstico</div>
        </div>
        <button
          onClick={() => navigate("/demo")}
          className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
        >
          ← Voltar
        </button>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-slate-800">
        <div
          className="h-1 bg-blue-500 transition-all duration-500"
          style={{ width: step === 1 ? "33%" : step === 2 ? "66%" : "100%" }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">

          {/* ── PASSO 1: Dados da empresa ── */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-blue-400 font-medium uppercase tracking-wider">Passo 1 de 3</p>
                  <h2 className="text-xl font-bold">Dados da Empresa</h2>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <Label className="text-sm text-slate-300 mb-2 block">Nome da empresa *</Label>
                  <Input
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Ex: Comércio Digital Ltda."
                    className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <Label className="text-sm text-slate-300 mb-2 block">Setor de atuação *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SETORES.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setSetor(s.value)}
                        className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                          setor === s.value
                            ? "border-blue-500 bg-blue-900/30 text-blue-300"
                            : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-slate-300 mb-2 block">Porte da empresa *</Label>
                  <div className="flex flex-wrap gap-2">
                    {PORTES.map(p => (
                      <button
                        key={p.value}
                        onClick={() => setPorte(p.value)}
                        className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                          porte === p.value
                            ? "border-blue-500 bg-blue-900/30 text-blue-300"
                            : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-slate-300 mb-2 block">CNAE principal (opcional)</Label>
                  <div className="space-y-1.5">
                    {CNAES.map(c => (
                      <button
                        key={c.code}
                        onClick={() => setCnae(cnae === c.code ? "" : c.code)}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all flex items-center gap-2 ${
                          cnae === c.code
                            ? "border-blue-500 bg-blue-900/30 text-blue-300"
                            : "border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-600"
                        }`}
                      >
                        <span className="font-mono font-bold shrink-0">{c.code}</span>
                        <span>{c.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!canAdvanceStep1}
                className="w-full mt-8 bg-blue-600 hover:bg-blue-500 text-white gap-2"
              >
                Avançar para o Questionário <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* ── PASSO 2: Questionário ── */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-purple-400 font-medium uppercase tracking-wider">Passo 2 de 3</p>
                  <h2 className="text-xl font-bold">Questionário de Diagnóstico</h2>
                </div>
                <div className="ml-auto text-xs text-slate-400">
                  {answeredCount}/{totalQ} respondidas
                </div>
              </div>

              {/* Progress dots */}
              <div className="flex gap-1.5 mb-6">
                {QUESTIONS.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQ(i)}
                    className={`h-2 rounded-full transition-all ${
                      answers[q.id]
                        ? answers[q.id] === "sim" ? "bg-emerald-500" :
                          answers[q.id] === "parcial" ? "bg-amber-500" : "bg-red-500"
                        : i === currentQ ? "bg-blue-500 w-6" : "bg-slate-700"
                    } ${i === currentQ ? "w-6" : "w-2"}`}
                  />
                ))}
              </div>

              {/* Current question */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {QUESTIONS[currentQ].domain}
                  </span>
                  <span className="text-xs text-slate-600">· {currentQ + 1}/{totalQ}</span>
                </div>
                <p className="text-base font-medium text-white leading-relaxed mb-5">
                  {QUESTIONS[currentQ].question}
                </p>

                <div className="space-y-2">
                  {(["sim", "parcial", "nao"] as Answer[]).map(ans => {
                    const label = ans === "sim" ? "Sim" : ans === "parcial" ? "Parcialmente" : "Não";
                    const desc = ans === "sim" ? QUESTIONS[currentQ].sim :
                                 ans === "parcial" ? QUESTIONS[currentQ].parcial :
                                 QUESTIONS[currentQ].nao;
                    const color = ans === "sim"
                      ? answers[QUESTIONS[currentQ].id] === "sim"
                        ? "border-emerald-500 bg-emerald-900/30 text-emerald-300"
                        : "border-slate-700 hover:border-emerald-700 hover:bg-emerald-900/10"
                      : ans === "parcial"
                      ? answers[QUESTIONS[currentQ].id] === "parcial"
                        ? "border-amber-500 bg-amber-900/30 text-amber-300"
                        : "border-slate-700 hover:border-amber-700 hover:bg-amber-900/10"
                      : answers[QUESTIONS[currentQ].id] === "nao"
                        ? "border-red-500 bg-red-900/30 text-red-300"
                        : "border-slate-700 hover:border-red-700 hover:bg-red-900/10";

                    return (
                      <button
                        key={ans}
                        onClick={() => handleAnswer(QUESTIONS[currentQ].id, ans)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${color}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`text-sm font-bold shrink-0 mt-0.5 ${
                            ans === "sim" ? "text-emerald-400" :
                            ans === "parcial" ? "text-amber-400" : "text-red-400"
                          }`}>{label}</span>
                          <span className="text-xs text-slate-400 leading-relaxed">{desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => currentQ > 0 ? setCurrentQ(q => q - 1) : setStep(1)}
                  className="text-slate-400 hover:text-white gap-1"
                >
                  <ArrowLeft className="w-4 h-4" /> Anterior
                </Button>
                {currentQ < totalQ - 1 ? (
                  <Button
                    onClick={() => setCurrentQ(q => q + 1)}
                    disabled={!answers[QUESTIONS[currentQ].id]}
                    className="ml-auto bg-slate-700 hover:bg-slate-600 gap-1"
                  >
                    Próxima <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => allAnswered && setStep(3)}
                    disabled={!allAnswered}
                    className="ml-auto bg-purple-600 hover:bg-purple-500 gap-2"
                  >
                    Ver Resultado <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Skip all button */}
              <button
                onClick={() => setStep(3)}
                className="w-full mt-4 text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                Pular questionário e usar cenário padrão →
              </button>
            </div>
          )}

          {/* ── PASSO 3: Confirmação ── */}
          {step === 3 && !processing && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-600/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-blue-400" />
              </div>

              <h2 className="text-2xl font-bold mb-2">Pronto para o Diagnóstico</h2>
              <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto">
                O motor v3 vai processar as respostas e gerar o diagnóstico completo de compliance para{" "}
                <span className="text-white font-medium">{companyName || "sua empresa"}</span>.
              </p>

              {/* Summary */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8 text-left">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Resumo do Assessment</h3>
                <div className="space-y-2">
                  {QUESTIONS.map(q => {
                    const ans = answers[q.id];
                    if (!ans) return null;
                    return (
                      <div key={q.id} className="flex items-center gap-3 text-xs">
                        <span className={`shrink-0 w-16 text-center font-semibold px-2 py-0.5 rounded-full ${
                          ans === "sim" ? "bg-emerald-900/50 text-emerald-400" :
                          ans === "parcial" ? "bg-amber-900/50 text-amber-400" :
                          "bg-red-900/50 text-red-400"
                        }`}>
                          {ans === "sim" ? "Sim" : ans === "parcial" ? "Parcial" : "Não"}
                        </span>
                        <span className="text-slate-400 truncate">{q.domain}</span>
                      </div>
                    );
                  })}
                  {answeredCount === 0 && (
                    <p className="text-slate-500 text-xs">Nenhuma pergunta respondida — será usado o cenário padrão (Empresa Complexa).</p>
                  )}
                </div>
              </div>

              {/* Predicted scenario */}
              {answeredCount > 0 && (() => {
                const predicted = determineScenario(answers);
                const labels: Record<ScenarioKey, { label: string; color: string; desc: string }> = {
                  simples: { label: "✅ Bem Preparada", color: "text-emerald-400", desc: "Score estimado: 55–75/100" },
                  medio: { label: "⚠️ Em Transição", color: "text-amber-400", desc: "Score estimado: 40–60/100" },
                  complexo: { label: "🚨 Situação Crítica", color: "text-red-400", desc: "Score estimado: 25–45/100" },
                };
                const meta = labels[predicted];
                return (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 text-left">
                    <p className="text-xs text-slate-500 mb-1">Perfil estimado pelo motor</p>
                    <p className={`font-bold text-lg ${meta.color}`}>{meta.label}</p>
                    <p className="text-xs text-slate-500">{meta.desc}</p>
                  </div>
                );
              })()}

              <Button
                onClick={handleStartDiagnosis}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white gap-2 py-6 text-base font-semibold"
              >
                <Zap className="w-5 h-5" />
                Iniciar Diagnóstico
              </Button>

              <button
                onClick={() => setStep(2)}
                className="mt-4 text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                ← Revisar respostas
              </button>
            </div>
          )}

          {/* ── PROCESSANDO ── */}
          {processing && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full border-4 border-blue-600/30 border-t-blue-500 animate-spin mx-auto mb-8" />
              <h2 className="text-xl font-bold mb-3">Processando Diagnóstico</h2>
              <p className="text-slate-400 text-sm mb-6">
                O motor v3 está calculando score, gaps, riscos, plano de ação e tarefas atômicas...
              </p>
              <div className="space-y-2 text-xs text-slate-500 max-w-xs mx-auto">
                {[
                  "✓ Avaliando 8 domínios de compliance",
                  "✓ Calculando score por requisito",
                  "✓ Identificando gaps e evidências",
                  "✓ Gerando matriz de riscos 4×4",
                  "✓ Criando plano de ação priorizado",
                  "⟳ Gerando tarefas atômicas...",
                ].map((msg, i) => (
                  <p key={i} className={i < 5 ? "text-slate-400" : "text-blue-400 animate-pulse"}>{msg}</p>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-3 text-center text-xs text-slate-600">
        IA Solaris · Compliance Engine v3 · Diagnóstico baseado em LC 214/2023
      </footer>
    </div>
  );
}
