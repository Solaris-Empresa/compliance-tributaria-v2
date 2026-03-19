import { useState } from "react";
import { useLocation } from "wouter";
import { Building2, CheckCircle2, ChevronRight, ArrowLeft, Zap, FileText, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ScenarioKey } from "@/lib/demo-engine";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Answer = "sim" | "parcial" | "nao";
type Step = 1 | 2 | 3 | 4;

interface CnaeItem {
  code: string;
  description: string;
}

// ─── Geração simulada de CNAEs a partir da descrição ─────────────────────────
// Regra simples: palavras-chave na descrição mapeiam para CNAEs reais IBGE

const KEYWORD_CNAE_MAP: { keywords: string[]; code: string; description: string }[] = [
  { keywords: ["software", "sistema", "tecnologia", "ti ", "saas", "aplicativo", "app", "desenvolvimento", "programação", "digital"], code: "6201-5/01", description: "Desenvolvimento de programas de computador sob encomenda" },
  { keywords: ["comércio", "varejo", "loja", "venda", "produto", "mercadoria", "atacado", "distribui"], code: "4711-3/02", description: "Comércio varejista de mercadorias em geral" },
  { keywords: ["indústria", "fabricação", "manufatura", "produção", "fábrica", "industrial", "metal", "plástico"], code: "2599-3/99", description: "Fabricação de outros produtos de metal não especificados" },
  { keywords: ["serviço", "consultoria", "assessoria", "gestão", "administração", "terceirização", "outsourcing"], code: "6920-6/01", description: "Atividades de contabilidade, consultoria e auditoria contábil" },
  { keywords: ["saúde", "médico", "clínica", "hospital", "farmácia", "medicamento", "laborat", "odonto"], code: "8630-5/04", description: "Atividade odontológica" },
  { keywords: ["agro", "agrícola", "fazenda", "rural", "cultivo", "plantio", "pecuária", "gado", "soja", "milho"], code: "0111-3/01", description: "Cultivo de arroz" },
  { keywords: ["financeiro", "banco", "crédito", "seguro", "investimento", "fintech", "pagamento", "cobrança"], code: "6422-1/00", description: "Bancos múltiplos com carteira comercial" },
  { keywords: ["construção", "obra", "engenharia", "imóvel", "imobiliária", "incorporação", "reforma", "predial"], code: "4120-4/00", description: "Construção de edifícios" },
  { keywords: ["transporte", "logística", "frete", "entrega", "carga", "frota", "caminhão", "motorista"], code: "4930-2/01", description: "Transporte rodoviário de carga, exceto produtos perigosos e mudanças" },
  { keywords: ["educação", "escola", "ensino", "curso", "treinamento", "capacitação", "universidade", "faculdade"], code: "8599-6/04", description: "Treinamento em desenvolvimento profissional e gerencial" },
  { keywords: ["alimento", "restaurante", "alimentação", "bebida", "bar", "café", "padaria", "gastronomia"], code: "5611-2/01", description: "Restaurantes e similares" },
  { keywords: ["telecom", "comunicação", "internet", "provedor", "rede", "telecomunicação", "fibra"], code: "6110-8/01", description: "Serviços telefônicos" },
];

function generateCnaesFromDescription(description: string): CnaeItem[] {
  const lower = description.toLowerCase();
  const matched: CnaeItem[] = [];
  const usedCodes = new Set<string>();

  for (const entry of KEYWORD_CNAE_MAP) {
    if (matched.length >= 4) break;
    if (usedCodes.has(entry.code)) continue;
    if (entry.keywords.some(kw => lower.includes(kw))) {
      matched.push({ code: entry.code, description: entry.description });
      usedCodes.add(entry.code);
    }
  }

  // Fallback: se não encontrou nada, retorna 2 CNAEs genéricos de serviços
  if (matched.length === 0) {
    matched.push(
      { code: "6920-6/01", description: "Atividades de contabilidade, consultoria e auditoria contábil" },
      { code: "7490-1/04", description: "Atividades de intermediação e agenciamento de serviços" }
    );
  }

  // Garante mínimo de 2
  if (matched.length === 1) {
    matched.push({ code: "7490-1/04", description: "Atividades de intermediação e agenciamento de serviços" });
  }

  return matched;
}

// ─── 5 perguntas fixas sobre Reforma Tributária ──────────────────────────────

const QUESTIONS = [
  {
    id: "q1",
    domain: "Governança",
    question: "Sua empresa já formou um grupo de trabalho ou comitê responsável pela adequação à Reforma Tributária (LC 214/2023)?",
  },
  {
    id: "q2",
    domain: "Sistemas",
    question: "O ERP ou sistema fiscal da empresa já foi avaliado para suportar a emissão de notas com CBS/IBS e os novos cálculos tributários?",
  },
  {
    id: "q3",
    domain: "Financeiro",
    question: "Foi feita alguma estimativa financeira dos custos de adequação e do impacto da transição tributária no fluxo de caixa (2026–2033)?",
  },
  {
    id: "q4",
    domain: "Jurídico",
    question: "Os contratos com clientes e fornecedores foram revisados para incluir cláusulas de reajuste tributário relacionadas à Reforma?",
  },
  {
    id: "q5",
    domain: "Pessoas",
    question: "A equipe financeira, fiscal e jurídica foi comunicada e treinada sobre as mudanças trazidas pela LC 214/2023?",
  },
];

// ─── Lógica de determinação do cenário ──────────────────────────────────────

function determineScenario(answers: Record<string, Answer>): ScenarioKey {
  let score = 0;
  for (const ans of Object.values(answers)) {
    if (ans === "sim") score += 2;
    else if (ans === "parcial") score += 1;
  }
  const max = QUESTIONS.length * 2; // 10
  const pct = score / max;
  if (pct >= 0.65) return "simples";
  if (pct >= 0.35) return "medio";
  return "complexo";
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function DemoAssessment() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>(1);

  // Passo 1
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");

  // Passo 2
  const [cnaes, setCnaes] = useState<CnaeItem[]>([]);
  const [confirmedCnaes, setConfirmedCnaes] = useState<CnaeItem[]>([]);

  // Passo 3
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [currentQ, setCurrentQ] = useState(0);

  // Passo 4
  const [processing, setProcessing] = useState(false);

  // ── Handlers ──

  function handleStep1Next() {
    const generated = generateCnaesFromDescription(description);
    setCnaes(generated);
    setConfirmedCnaes(generated);
    setStep(2);
  }

  function toggleCnae(cnae: CnaeItem) {
    setConfirmedCnaes(prev =>
      prev.some(c => c.code === cnae.code)
        ? prev.filter(c => c.code !== cnae.code)
        : [...prev, cnae]
    );
  }

  function handleStep2Next() {
    setStep(3);
  }

  function handleAnswer(qId: string, ans: Answer) {
    const updated = { ...answers, [qId]: ans };
    setAnswers(updated);
    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(q => q + 1), 250);
    }
  }

  function handleStep3Next() {
    setStep(4);
    setProcessing(true);
    const scenario = determineScenario(answers);
    setTimeout(() => {
      navigate(`/demo/dashboard?scenario=${scenario}&company=${encodeURIComponent(companyName || "Empresa Demo")}`);
    }, 2200);
  }

  const descOk = description.trim().length >= 80;
  const nameOk = companyName.trim().length >= 2;
  const canAdvance1 = nameOk && descOk;
  const canAdvance2 = confirmedCnaes.length >= 1;
  const allAnswered = Object.keys(answers).length === QUESTIONS.length;

  const progressPct = step === 1 ? 25 : step === 2 ? 50 : step === 3 ? 75 : 100;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm select-none">CE</div>
        <div>
          <div className="font-semibold text-sm leading-tight">Compliance Engine</div>
          <div className="text-xs text-slate-400">v3 · Diagnóstico</div>
        </div>
        {step < 4 && (
          <button
            onClick={() => step === 1 ? navigate("/demo") : setStep(s => (s - 1) as Step)}
            className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Voltar
          </button>
        )}
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-slate-800">
        <div className="h-1 bg-blue-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Steps indicator */}
      {step < 4 && (
        <div className="flex items-center justify-center gap-2 py-4 border-b border-slate-800/50">
          {[
            { n: 1, label: "Empresa", icon: Building2 },
            { n: 2, label: "CNAEs", icon: FileText },
            { n: 3, label: "Perguntas", icon: ClipboardList },
          ].map(({ n, label, icon: Icon }) => (
            <div key={n} className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step > n ? "bg-green-600 text-white" : step === n ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-500"
              }`}>
                {step > n ? "✓" : n}
              </div>
              <span className={`text-xs hidden sm:block ${step === n ? "text-white" : "text-slate-500"}`}>{label}</span>
              {n < 3 && <ChevronRight className="w-3 h-3 text-slate-700" />}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">

          {/* ── PASSO 1: Nome + Descrição ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-blue-400 font-medium uppercase tracking-wider">Passo 1 de 3</p>
                  <h2 className="text-xl font-bold">Dados da Empresa</h2>
                </div>
              </div>

              <div>
                <Label className="text-sm text-slate-300 mb-1.5 block">Nome da empresa *</Label>
                <Input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Ex: Comércio Digital Ltda."
                  className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>

              <div>
                <Label className="text-sm text-slate-300 mb-1.5 block">
                  Descrição do negócio *
                  <span className={`ml-2 text-xs font-normal ${descOk ? "text-green-400" : "text-slate-500"}`}>
                    {description.trim().length}/80 caracteres mínimos
                  </span>
                </Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Descreva as atividades da empresa: o que vende, como opera, quais setores atua, principais clientes e fornecedores..."
                  rows={5}
                  className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 resize-none"
                />
                {!descOk && description.length > 0 && (
                  <p className="text-xs text-amber-400 mt-1">
                    Adicione mais {80 - description.trim().length} caracteres para uma análise precisa.
                  </p>
                )}
              </div>

              <Button
                onClick={handleStep1Next}
                disabled={!canAdvance1}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Identificar CNAEs <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ── PASSO 2: CNAEs gerados ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-blue-400 font-medium uppercase tracking-wider">Passo 2 de 3</p>
                  <h2 className="text-xl font-bold">CNAEs Identificados</h2>
                </div>
              </div>

              <p className="text-sm text-slate-400">
                Com base na descrição da empresa, identificamos os seguintes códigos de atividade econômica. Confirme os que se aplicam:
              </p>

              <div className="space-y-3">
                {cnaes.map(cnae => {
                  const isSelected = confirmedCnaes.some(c => c.code === cnae.code);
                  return (
                    <button
                      key={cnae.code}
                      onClick={() => toggleCnae(cnae)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? "border-blue-500 bg-blue-900/20"
                          : "border-slate-700 bg-slate-900 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? "border-blue-500 bg-blue-500" : "border-slate-600"
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <div className="text-xs font-mono text-blue-400 mb-0.5">{cnae.code}</div>
                          <div className="text-sm text-white">{cnae.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                <p className="text-xs text-slate-500">
                  <span className="text-slate-400 font-medium">Como funciona:</span> Os CNAEs determinam quais artigos da LC 214/2023 (IBS/CBS/IS) se aplicam à sua empresa e quais requisitos serão avaliados no diagnóstico.
                </p>
              </div>

              <Button
                onClick={handleStep2Next}
                disabled={!canAdvance2}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirmar CNAEs e Avançar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ── PASSO 3: 5 Perguntas ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-blue-400 font-medium uppercase tracking-wider">Passo 3 de 3</p>
                  <h2 className="text-xl font-bold">Questionário de Diagnóstico</h2>
                </div>
              </div>

              {/* Progresso das perguntas */}
              <div className="flex gap-1.5">
                {QUESTIONS.map((q, i) => (
                  <div
                    key={q.id}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      answers[q.id] ? "bg-blue-500" : i === currentQ ? "bg-blue-800" : "bg-slate-800"
                    }`}
                  />
                ))}
              </div>

              {/* Pergunta atual */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
                <div className="text-xs text-blue-400 font-medium mb-2 uppercase tracking-wider">
                  {currentQ + 1} / {QUESTIONS.length} · {QUESTIONS[currentQ].domain}
                </div>
                <p className="text-base text-white leading-relaxed">
                  {QUESTIONS[currentQ].question}
                </p>
              </div>

              {/* Opções de resposta */}
              <div className="grid grid-cols-3 gap-3">
                {(["sim", "parcial", "nao"] as Answer[]).map(ans => {
                  const current = answers[QUESTIONS[currentQ].id];
                  const isSelected = current === ans;
                  const colors = {
                    sim: isSelected ? "border-green-500 bg-green-900/20 text-green-300" : "border-slate-700 bg-slate-900 text-slate-400 hover:border-green-600",
                    parcial: isSelected ? "border-amber-500 bg-amber-900/20 text-amber-300" : "border-slate-700 bg-slate-900 text-slate-400 hover:border-amber-600",
                    nao: isSelected ? "border-red-500 bg-red-900/20 text-red-300" : "border-slate-700 bg-slate-900 text-slate-400 hover:border-red-600",
                  };
                  const labels = { sim: "✅ Sim", parcial: "⚠️ Parcial", nao: "❌ Não" };
                  return (
                    <button
                      key={ans}
                      onClick={() => handleAnswer(QUESTIONS[currentQ].id, ans)}
                      className={`py-3 px-2 rounded-xl border text-sm font-medium transition-all ${colors[ans]}`}
                    >
                      {labels[ans]}
                    </button>
                  );
                })}
              </div>

              {/* Navegação entre perguntas */}
              <div className="flex gap-2">
                {currentQ > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQ(q => q - 1)}
                    className="flex-1 border-slate-700 text-slate-400 hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Anterior
                  </Button>
                )}
                {currentQ < QUESTIONS.length - 1 && answers[QUESTIONS[currentQ].id] && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQ(q => q + 1)}
                    className="flex-1 border-slate-700 text-slate-400 hover:text-white"
                  >
                    Próxima <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>

              {allAnswered && (
                <Button
                  onClick={handleStep3Next}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Zap className="w-4 h-4 mr-2" /> Gerar Diagnóstico Completo
                </Button>
              )}
            </div>
          )}

          {/* ── PASSO 4: Processando ── */}
          {step === 4 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-blue-600/20 border-2 border-blue-500 flex items-center justify-center mx-auto animate-pulse">
                <Zap className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Gerando Diagnóstico</h2>
                <p className="text-slate-400 text-sm">
                  O motor v3 está processando as respostas e calculando o score de compliance para <strong className="text-white">{companyName}</strong>...
                </p>
              </div>
              <div className="space-y-2 text-left bg-slate-900 rounded-xl p-4 border border-slate-800">
                {[
                  "Analisando CNAEs confirmados...",
                  "Calculando score por domínio...",
                  "Identificando gaps de compliance...",
                  "Gerando matriz de riscos 4×4...",
                  "Montando plano de ação...",
                ].map((msg, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
