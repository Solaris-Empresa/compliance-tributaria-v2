/**
 * QuestionarioCorporativoV2.tsx
 * Questionário Corporativo — 10 seções oficiais (QC-01..QC-10)
 * FASE 4 / T7 — Sprint v2.1
 *
 * REGRA: Apenas estrutura, seções e placeholders.
 * Perguntas jurídicas finais serão inseridas na Fase 5 (pré-sprint RAG).
 * Nomes oficiais definidos pelo PO em 19/03/2026.
 */
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Save,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Seções oficiais do Questionário Corporativo (definidas pelo PO)
// ─────────────────────────────────────────────────────────────────────────────
const SECOES: Array<{
  codigo: string;
  titulo: string;
  descricao: string;
  placeholder: string;
  campos: Array<{ id: string; label: string; tipo: string; opcoes?: string[] }>;
}> = [
  {
    codigo: "QC-01",
    titulo: "Identificação e enquadramento",
    descricao: "Sujeito passivo, regime tributário, porte e estrutura básica da empresa.",
    placeholder: "[PLACEHOLDER QC-01] Esta seção coletará dados de identificação e enquadramento tributário da empresa. Perguntas jurídicas finais serão inseridas na Fase 5.",
    campos: [
      { id: "qc01_regime", label: "[QC-01-P1] Regime tributário atual", tipo: "radio", opcoes: ["Simples Nacional", "Lucro Presumido", "Lucro Real", "Lucro Arbitrado", "Outro"] },
      { id: "qc01_porte", label: "[QC-01-P2] Porte da empresa", tipo: "radio", opcoes: ["MEI / Microempresa (até R$ 360 mil)", "Empresa de Pequeno Porte (até R$ 4,8 mi)", "Médio porte (até R$ 78 mi)", "Grande porte (acima de R$ 78 mi)"] },
      { id: "qc01_obs", label: "[QC-01-P3] Observações (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QC-02",
    titulo: "Estrutura societária e organizacional",
    descricao: "Grupo econômico, filiais, centralização de operações e governança corporativa.",
    placeholder: "[PLACEHOLDER QC-02] Esta seção mapeará a estrutura societária: grupo econômico, filiais, centralização fiscal e modelo de governança.",
    campos: [
      { id: "qc02_grupo", label: "[QC-02-P1] A empresa integra grupo econômico?", tipo: "radio", opcoes: ["Sim", "Não"] },
      { id: "qc02_filiais", label: "[QC-02-P2] Possui estabelecimentos em outros estados?", tipo: "radio", opcoes: ["Sim", "Não"] },
      { id: "qc02_centralizacao", label: "[QC-02-P3] Operações fiscais são centralizadas?", tipo: "radio", opcoes: ["Sim — centralizadas na matriz", "Não — cada unidade apura separadamente", "Parcialmente centralizado"] },
      { id: "qc02_obs", label: "[QC-02-P4] Observações (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QC-03",
    titulo: "Operações e incidência",
    descricao: "Bens, serviços, operações mistas, mercado interno e externo.",
    placeholder: "[PLACEHOLDER QC-03] Esta seção identificará os tipos de operações: bens, serviços, operações mistas, exportações e importações.",
    campos: [
      { id: "qc03_operacoes", label: "[QC-03-P1] Tipos de operações realizadas", tipo: "checkbox", opcoes: ["Venda de mercadorias", "Prestação de serviços", "Operações mistas (bens + serviços)", "Exportação de bens", "Exportação de serviços", "Importação de bens", "Importação de serviços"] },
      { id: "qc03_obs", label: "[QC-03-P2] Observações (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QC-04",
    titulo: "Documentos fiscais e cadastro",
    descricao: "Emissão de documentos fiscais, controles, cadastros e consistência documental.",
    placeholder: "[PLACEHOLDER QC-04] Esta seção avaliará documentos fiscais emitidos, qualidade dos cadastros e consistência com obrigações acessórias.",
    campos: [
      { id: "qc04_docs", label: "[QC-04-P1] Documentos fiscais emitidos", tipo: "checkbox", opcoes: ["NF-e", "NFS-e", "CT-e", "NFC-e", "MDF-e", "Outro"] },
      { id: "qc04_cadastro", label: "[QC-04-P2] Qualidade dos cadastros fiscais", tipo: "radio", opcoes: ["Totalmente atualizados", "Parcialmente atualizados", "Desatualizados"] },
      { id: "qc04_obs", label: "[QC-04-P3] Observações (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QC-05",
    titulo: "Apuração e obrigações",
    descricao: "Apuração tributária, controles internos, periodicidade e obrigações acessórias.",
    placeholder: "[PLACEHOLDER QC-05] Esta seção mapeará processos de apuração, periodicidade e obrigações acessórias (SPED, EFD, DCTF, etc.).",
    campos: [
      { id: "qc05_obrigacoes", label: "[QC-05-P1] Obrigações acessórias entregues regularmente", tipo: "checkbox", opcoes: ["SPED Fiscal (EFD ICMS/IPI)", "EFD Contribuições", "DCTF", "ECF", "ECD", "REINF", "eSocial", "Outro"] },
      { id: "qc05_periodicidade", label: "[QC-05-P2] Periodicidade de apuração federal", tipo: "radio", opcoes: ["Mensal", "Trimestral", "Anual", "Misto"] },
      { id: "qc05_obs", label: "[QC-05-P3] Observações (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QC-06",
    titulo: "Créditos e não cumulatividade",
    descricao: "Insumos, aproveitamento de créditos, restrições e controles de não cumulatividade.",
    placeholder: "[PLACEHOLDER QC-06] Esta seção avaliará o aproveitamento de créditos tributários: PIS/COFINS não cumulativo, ICMS, IPI e controles de insumos.",
    campos: [
      { id: "qc06_creditos", label: "[QC-06-P1] Aproveita créditos de PIS/COFINS?", tipo: "radio", opcoes: ["Sim — sistematicamente", "Sim — parcialmente", "Não — regime cumulativo", "Não — Simples Nacional"] },
      { id: "qc06_controle", label: "[QC-06-P2] Existe controle formal dos créditos?", tipo: "radio", opcoes: ["Sim — sistema/planilha dedicada", "Sim — dentro do ERP", "Controle informal", "Sem controle"] },
      { id: "qc06_obs", label: "[QC-06-P3] Observações (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QC-07",
    titulo: "Pagamentos e split payment",
    descricao: "Meios de pagamento, intermediadores financeiros e readiness para split payment.",
    placeholder: "[PLACEHOLDER QC-07] Esta seção avaliará preparação para o split payment da Reforma: meios de pagamento, gateways e capacidade de adaptação.",
    campos: [
      { id: "qc07_meios", label: "[QC-07-P1] Meios de pagamento utilizados", tipo: "checkbox", opcoes: ["Pix", "Cartão de débito", "Cartão de crédito", "Boleto bancário", "TED/DOC", "Dinheiro em espécie", "Outro"] },
      { id: "qc07_gateway", label: "[QC-07-P2] Utiliza gateway de pagamento?", tipo: "radio", opcoes: ["Sim", "Não"] },
      { id: "qc07_split", label: "[QC-07-P3] Conhecimento sobre split payment", tipo: "radio", opcoes: ["Alto — já se preparando", "Médio — conhecimento básico", "Baixo — não conhece"] },
      { id: "qc07_obs", label: "[QC-07-P4] Observações (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QC-08",
    titulo: "Benefícios, regimes diferenciados e exceções",
    descricao: "Incentivos fiscais, regimes especiais, condições específicas e exceções aplicáveis.",
    placeholder: "[PLACEHOLDER QC-08] Esta seção identificará benefícios fiscais vigentes: incentivos estaduais, regimes especiais, isenções e diferimentos.",
    campos: [
      { id: "qc08_beneficios", label: "[QC-08-P1] Possui benefícios fiscais vigentes?", tipo: "radio", opcoes: ["Sim — estaduais (ICMS)", "Sim — federais (PIS/COFINS/IPI)", "Sim — municipais (ISS)", "Não possui", "Não sei informar"] },
      { id: "qc08_regime_esp", label: "[QC-08-P2] Utiliza regime especial de tributação?", tipo: "radio", opcoes: ["Sim", "Não"] },
      { id: "qc08_obs", label: "[QC-08-P3] Descreva benefícios ou regimes especiais (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QC-09",
    titulo: "Fiscalização, contencioso e compliance",
    descricao: "Readiness de conformidade, trilha de auditoria, autuações e controles de compliance.",
    placeholder: "[PLACEHOLDER QC-09] Esta seção avaliará histórico de fiscalização, contencioso tributário ativo e maturidade em compliance tributário.",
    campos: [
      { id: "qc09_autuacoes", label: "[QC-09-P1] Possui autuações fiscais ativas?", tipo: "radio", opcoes: ["Sim — fase administrativa", "Sim — fase judicial", "Não possui", "Não sei informar"] },
      { id: "qc09_maturidade", label: "[QC-09-P2] Maturidade em compliance tributário", tipo: "radio", opcoes: ["Alto — processos formalizados e auditados", "Médio — processos existentes não auditados", "Baixo — processos informais", "Inicial — sem processos definidos"] },
      { id: "qc09_obs", label: "[QC-09-P3] Observações (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QC-10",
    titulo: "Transição e preparação para a reforma",
    descricao: "Capacidade de adaptação organizacional e prontidão para a Reforma Tributária.",
    placeholder: "[PLACEHOLDER QC-10] Esta seção avaliará o nível de preparação para a Reforma: conhecimento sobre IBS, CBS e IS, adaptação de sistemas e equipe.",
    campos: [
      { id: "qc10_conhecimento", label: "[QC-10-P1] Nível de conhecimento sobre a Reforma (IBS, CBS, IS)", tipo: "radio", opcoes: ["Alto — acompanha detalhadamente", "Médio — conhece os pontos principais", "Baixo — conhecimento superficial", "Nenhum"] },
      { id: "qc10_preparacao", label: "[QC-10-P2] Nível de preparação para a transição", tipo: "radio", opcoes: ["Avançado — já iniciou adaptações", "Em andamento — planejamento iniciado", "Inicial — ainda não iniciou", "Sem plano definido"] },
      { id: "qc10_obs", label: "[QC-10-P3] Observações (opcional)", tipo: "textarea" },
    ],
  },
];

export default function QuestionarioCorporativoV2() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();

  const [secaoAtual, setSecaoAtual] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string | string[]>>({});
  const [concluido, setConcluido] = useState(false);

  const { data: projeto, isLoading } = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: !!projectId }
  );

  const { data: diagnosticStatus, refetch: refetchStatus } = trpc.diagnostic.getDiagnosticStatus.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Mapeamento de valores do banco → opções do questionário
  const TAX_REGIME_MAP: Record<string, string> = {
    simples_nacional: "Simples Nacional",
    lucro_presumido: "Lucro Presumido",
    lucro_real: "Lucro Real",
  };
  const COMPANY_SIZE_MAP: Record<string, string> = {
    mei: "MEI / Microempresa (até R$ 360 mil)",
    micro: "MEI / Microempresa (até R$ 360 mil)",
    pequena: "Empresa de Pequeno Porte (até R$ 4,8 mi)",
    media: "Médio porte (até R$ 78 mi)",
    grande: "Grande porte (acima de R$ 78 mi)",
  };

  useEffect(() => {
    if (projeto) {
      const p = projeto as any;
      // Pré-preencher com respostas salvas anteriormente (prioridade máxima)
      if (p.corporateAnswers && typeof p.corporateAnswers === "object") {
        setRespostas(p.corporateAnswers as Record<string, string | string[]>);
      } else {
        // Pré-preencher automaticamente a partir do perfil do projeto
        const prefill: Record<string, string> = {};
        if (p.taxRegime && TAX_REGIME_MAP[p.taxRegime]) {
          prefill["qc01_regime"] = TAX_REGIME_MAP[p.taxRegime];
        }
        if (p.companySize && COMPANY_SIZE_MAP[p.companySize]) {
          prefill["qc01_porte"] = COMPANY_SIZE_MAP[p.companySize];
        }
        if (Object.keys(prefill).length > 0) {
          setRespostas(prev => ({ ...prefill, ...prev }));
        }
      }
    }
    if (diagnosticStatus?.diagnosticStatus?.corporate === "completed") {
      setConcluido(true);
    }
  }, [projeto, diagnosticStatus]);

  const completarCamada = trpc.diagnostic.completeDiagnosticLayer.useMutation({
    onSuccess: () => {
      toast.success("Questionário Corporativo concluído!", { description: "Avançando para o Diagnóstico Operacional..." });
      refetchStatus();
      setConcluido(true);
      // v2.1: avançar automaticamente para a próxima camada do diagnóstico
      setTimeout(() => navigate(`/projetos/${projectId}/questionario-operacional`), 1500);
    },
    onError: (err) => {
      toast.error("Erro ao concluir", { description: err.message });
    },
  });

  const salvarRascunho = trpc.diagnostic.updateDiagnosticStatus.useMutation({
    onSuccess: () => {
      toast.success("Rascunho salvo");
    },
    onError: () => {
      toast.error("Erro ao salvar rascunho");
    },
  });

  const secao = SECOES[secaoAtual];
  const totalSecoes = SECOES.length;
  const progresso = Math.round(((secaoAtual + 1) / totalSecoes) * 100);

  function handleResposta(campoId: string, valor: string) {
    setRespostas(prev => ({ ...prev, [campoId]: valor }));
  }

  function handleCheckbox(campoId: string, opcao: string, checked: boolean) {
    setRespostas(prev => {
      const atual = Array.isArray(prev[campoId]) ? (prev[campoId] as string[]) : [];
      if (checked) return { ...prev, [campoId]: [...atual, opcao] };
      return { ...prev, [campoId]: atual.filter((v) => v !== opcao) };
    });
  }

  function handleSalvarRascunho() {
    salvarRascunho.mutate({ projectId, layer: "corporate", status: "in_progress" });
  }

  function handleConcluir() {
    completarCamada.mutate({ projectId, layer: "corporate", answers: respostas });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projetos/${projectId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Projeto
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Questionário Corporativo</h1>
              <Badge variant="outline" className="text-xs">{totalSecoes} seções</Badge>
              {concluido && (
                <Badge className="bg-emerald-500 text-white text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />Concluído
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {(projeto as any)?.name ?? "Projeto"} — Diagnóstico Corporativo
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card border-b px-6 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Seção {secaoAtual + 1} de {totalSecoes}</span>
            <span>{progresso}% concluído</span>
          </div>
          <Progress value={progresso} className="h-2" />
          <div className="flex gap-1 mt-3 flex-wrap">
            {SECOES.map((s, idx) => (
              <button
                key={s.codigo}
                onClick={() => setSecaoAtual(idx)}
                className={`text-xs px-2 py-1 rounded border transition-colors ${
                  idx === secaoAtual
                    ? "bg-primary text-primary-foreground border-primary"
                    : idx < secaoAtual
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-muted text-muted-foreground border-border hover:bg-accent"
                }`}
              >
                {s.codigo}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="font-mono text-xs">{secao.codigo}</Badge>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />Seção {secaoAtual + 1}/{totalSecoes}
              </Badge>
            </div>
            <CardTitle className="text-xl">{secao.titulo}</CardTitle>
            <CardDescription className="mt-1">{secao.descricao}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {secao.codigo === "QC-01" && ((projeto as any)?.taxRegime || (projeto as any)?.companySize) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Dados pré-preenchidos do perfil do projeto</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Regime tributário e porte foram preenchidos automaticamente com base no cadastro do projeto.
                      Confirme ou ajuste se necessário antes de prosseguir.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Conteúdo em desenvolvimento (Fase 5)</p>
                  <p className="text-xs text-amber-700 mt-1">{secao.placeholder}</p>
                </div>
              </div>
            </div>

            {secao.campos.map((campo) => (
              <div key={campo.id} className="space-y-2">
                <Label className="text-sm font-medium">{campo.label}</Label>

                {campo.tipo === "radio" && campo.opcoes && (
                  <RadioGroup
                    value={(respostas[campo.id] as string) ?? ""}
                    onValueChange={(val) => handleResposta(campo.id, val)}
                    className="space-y-2"
                  >
                    {campo.opcoes.map((opcao) => (
                      <div key={opcao} className="flex items-center space-x-2">
                        <RadioGroupItem value={opcao} id={`${campo.id}_${opcao}`} />
                        <Label htmlFor={`${campo.id}_${opcao}`} className="font-normal cursor-pointer">{opcao}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {campo.tipo === "checkbox" && campo.opcoes && (
                  <div className="space-y-2">
                    {campo.opcoes.map((opcao) => {
                      const checked = Array.isArray(respostas[campo.id]) && (respostas[campo.id] as string[]).includes(opcao);
                      return (
                        <div key={opcao} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${campo.id}_${opcao}`}
                            checked={checked}
                            onCheckedChange={(c) => handleCheckbox(campo.id, opcao, !!c)}
                          />
                          <Label htmlFor={`${campo.id}_${opcao}`} className="font-normal cursor-pointer">{opcao}</Label>
                        </div>
                      );
                    })}
                  </div>
                )}

                {campo.tipo === "textarea" && (
                  <Textarea
                    placeholder="Digite suas observações aqui..."
                    value={(respostas[campo.id] as string) ?? ""}
                    onChange={(e) => handleResposta(campo.id, e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mt-6">
          <Button variant="outline" onClick={() => setSecaoAtual(prev => Math.max(0, prev - 1))} disabled={secaoAtual === 0}>
            <ChevronLeft className="h-4 w-4 mr-2" />Seção anterior
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSalvarRascunho} disabled={salvarRascunho.isPending}>
              <Save className="h-4 w-4 mr-2" />{salvarRascunho.isPending ? "Salvando..." : "Salvar rascunho"}
            </Button>
            {secaoAtual < totalSecoes - 1 ? (
              <Button onClick={() => setSecaoAtual(prev => Math.min(totalSecoes - 1, prev + 1))}>
                Próxima seção<ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleConcluir}
                disabled={completarCamada.isPending || concluido}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {completarCamada.isPending ? "Concluindo..." : concluido ? "Concluído" : "Concluir Questionário Corporativo"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
