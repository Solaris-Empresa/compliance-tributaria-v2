/**
 * QuestionarioOperacional.tsx
 * Questionário Operacional — 10 seções oficiais (QO-01..QO-10)
 * FASE 4 / T8 — Sprint v2.1
 *
 * REGRA: Apenas estrutura, seções e placeholders.
 * Perguntas jurídicas finais serão inseridas na Fase 5 (pré-sprint RAG).
 * Nomes oficiais definidos pelo PO em 19/03/2026.
 * BLOQUEIO: Só acessível após Questionário Corporativo (corporate) = completed.
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
  Settings2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Save,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────────────────────
// Seções oficiais do Questionário Operacional (definidas pelo PO)
// ─────────────────────────────────────────────────────────────────────────────
const SECOES: Array<{
  codigo: string;
  titulo: string;
  descricao: string;
  placeholder: string;
  campos: Array<{ id: string; label: string; tipo: string; opcoes?: string[] }>;
}> = [
  {
    codigo: "QO-01",
    titulo: "Fluxo comercial e vendas",
    descricao: "Canais de venda, clientes, ciclo comercial e tributação nas vendas.",
    placeholder: "[PLACEHOLDER QO-01] Esta seção mapeará o fluxo comercial: canais de venda, perfil de clientes, ciclo de vendas e tributação aplicável.",
    campos: [
      { id: "qo01_canais", label: "[QO-01-P1] Canais de venda utilizados", tipo: "checkbox", opcoes: ["Loja física", "E-commerce próprio", "Marketplace", "Representantes comerciais", "Venda direta B2B", "Exportação"] },
      { id: "qo01_clientes", label: "[QO-01-P2] Perfil predominante de clientes", tipo: "radio", opcoes: ["Pessoa Física (B2C)", "Pessoa Jurídica (B2B)", "Misto (B2B e B2C)", "Governo (B2G)"] },
      { id: "qo01_obs", label: "[QO-01-P3] Observações (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QO-02",
    titulo: "Fluxo de compras e suprimentos",
    descricao: "Fornecedores, insumos, matérias-primas e cadeia de suprimentos.",
    placeholder: "[PLACEHOLDER QO-02] Esta seção mapeará o fluxo de compras: fornecedores, insumos, matérias-primas e impacto tributário nas aquisições.",
    campos: [
      { id: "qo02_fornecedores", label: "[QO-02-P1] Perfil dos fornecedores principais", tipo: "checkbox", opcoes: ["PJ nacionais", "Pessoas Físicas (produtores rurais, autônomos)", "Importadores/distribuidores", "Fornecedores do exterior", "MEI/Microempresas"] },
      { id: "qo02_controle", label: "[QO-02-P2] Controle de insumos para crédito tributário", tipo: "radio", opcoes: ["Controle rigoroso e documentado", "Controle parcial", "Sem controle específico"] },
      { id: "qo02_obs", label: "[QO-02-P3] Observações (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QO-03",
    titulo: "Recebimentos e pagamentos",
    descricao: "Fluxo financeiro, meios de pagamento, recebimentos e gestão de caixa.",
    placeholder: "[PLACEHOLDER QO-03] Esta seção avaliará o fluxo financeiro: meios de pagamento, recebimentos, prazos e impacto do split payment.",
    campos: [
      { id: "qo03_meios", label: "[QO-03-P1] Meios de pagamento recebidos", tipo: "checkbox", opcoes: ["Pix", "Cartão de débito", "Cartão de crédito", "Boleto bancário", "TED/DOC", "Dinheiro em espécie", "Outro"] },
      { id: "qo03_prazo", label: "[QO-03-P2] Prazo médio de recebimento", tipo: "radio", opcoes: ["À vista (até 7 dias)", "Curto prazo (8 a 30 dias)", "Médio prazo (31 a 90 dias)", "Longo prazo (acima de 90 dias)", "Misto"] },
      { id: "qo03_obs", label: "[QO-03-P3] Observações (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QO-04",
    titulo: "Intermediadores e plataformas",
    descricao: "Uso de marketplaces, plataformas digitais, intermediadores e gateways.",
    placeholder: "[PLACEHOLDER QO-04] Esta seção identificará o uso de intermediadores: marketplaces, plataformas digitais, gateways de pagamento e obrigações tributárias associadas.",
    campos: [
      { id: "qo04_marketplace", label: "[QO-04-P1] Opera em marketplaces ou plataformas digitais?", tipo: "radio", opcoes: ["Sim — como vendedor", "Sim — como operador da plataforma", "Não"] },
      { id: "qo04_gateway", label: "[QO-04-P2] Utiliza gateway de pagamento ou adquirente?", tipo: "radio", opcoes: ["Sim", "Não"] },
      { id: "qo04_obs", label: "[QO-04-P3] Observações (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QO-05",
    titulo: "Contratos e instrumentos comerciais",
    descricao: "Contratos com clientes e fornecedores, cláusulas tributárias e revisão contratual.",
    placeholder: "[PLACEHOLDER QO-05] Esta seção avaliará contratos comerciais: cláusulas tributárias, contratos de longo prazo e necessidade de revisão para a Reforma.",
    campos: [
      { id: "qo05_contratos_lp", label: "[QO-05-P1] Possui contratos de longo prazo (acima de 1 ano)?", tipo: "radio", opcoes: ["Sim — com clientes", "Sim — com fornecedores", "Sim — com ambos", "Não"] },
      { id: "qo05_clausulas", label: "[QO-05-P2] Contratos possuem cláusulas de reajuste tributário?", tipo: "radio", opcoes: ["Sim — cláusulas específicas", "Parcialmente", "Não", "Não sei informar"] },
      { id: "qo05_obs", label: "[QO-05-P3] Observações (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QO-06",
    titulo: "Logística, entrega e territorialidade",
    descricao: "Transporte, armazenagem, distribuição e operações interestaduais.",
    placeholder: "[PLACEHOLDER QO-06] Esta seção avaliará logística e territorialidade: meios de transporte, armazéns, operações interestaduais e DIFAL.",
    campos: [
      { id: "qo06_transporte", label: "[QO-06-P1] Meios de transporte utilizados", tipo: "checkbox", opcoes: ["Frota própria", "Transportadora terceirizada", "Correios/Sedex", "Transportadora internacional", "Entrega por aplicativo"] },
      { id: "qo06_interestadual", label: "[QO-06-P2] Volume de operações interestaduais", tipo: "radio", opcoes: ["Alto (mais de 50%)", "Médio (20% a 50%)", "Baixo (menos de 20%)", "Não realiza"] },
      { id: "qo06_obs", label: "[QO-06-P3] Observações (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QO-07",
    titulo: "Sistemas, ERP e controles",
    descricao: "ERP, sistemas de emissão de documentos fiscais, integração e automação.",
    placeholder: "[PLACEHOLDER QO-07] Esta seção avaliará a maturidade tecnológica fiscal: ERP, integração com SEFAZ, automação de obrigações e readiness para a Reforma.",
    campos: [
      { id: "qo07_erp", label: "[QO-07-P1] Sistema ERP utilizado", tipo: "radio", opcoes: ["SAP", "TOTVS (Protheus/RM/Datasul)", "Oracle", "Senior", "Sankhya", "Outro ERP nacional", "Planilhas/sistema próprio", "Sem ERP"] },
      { id: "qo07_integracao", label: "[QO-07-P2] Nível de integração fiscal do ERP", tipo: "radio", opcoes: ["Totalmente integrado", "Parcialmente integrado", "Baixa integração", "Sem integração fiscal"] },
      { id: "qo07_obs", label: "[QO-07-P3] Observações (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QO-08",
    titulo: "Rotinas fiscais e operacionais",
    descricao: "Processos fiscais do dia a dia, apuração, controles e periodicidade.",
    placeholder: "[PLACEHOLDER QO-08] Esta seção mapeará as rotinas fiscais operacionais: apuração periódica, controles internos, revisões e processos de fechamento.",
    campos: [
      { id: "qo08_rotina", label: "[QO-08-P1] Frequência de revisão das rotinas fiscais", tipo: "radio", opcoes: ["Diária", "Semanal", "Mensal", "Trimestral", "Sem revisão periódica"] },
      { id: "qo08_equipe", label: "[QO-08-P2] Como é gerida a área fiscal/tributária?", tipo: "radio", opcoes: ["Equipe interna dedicada", "Equipe interna + escritório externo", "Totalmente terceirizado", "Contador autônomo", "Sem estrutura formal"] },
      { id: "qo08_obs", label: "[QO-08-P3] Observações (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QO-09",
    titulo: "Exceções e situações especiais",
    descricao: "Operações atípicas, situações especiais, tratamentos diferenciados e exceções.",
    placeholder: "[PLACEHOLDER QO-09] Esta seção identificará exceções e situações especiais: operações atípicas, tratamentos diferenciados e casos que requerem análise específica.",
    campos: [
      { id: "qo09_excecoes", label: "[QO-09-P1] A empresa possui operações com tratamento tributário especial?", tipo: "radio", opcoes: ["Sim — regularmente", "Sim — ocasionalmente", "Não"] },
      { id: "qo09_tipo_excecao", label: "[QO-09-P2] Tipos de exceções (se houver)", tipo: "checkbox", opcoes: ["Substituição tributária", "Regime monofásico", "Diferimento de ICMS", "Suspensão de IPI", "Drawback", "Outro"] },
      { id: "qo09_obs", label: "[QO-09-P3] Observações (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QO-10",
    titulo: "Evidências e documentação de suporte",
    descricao: "Documentação disponível, trilha de auditoria e evidências para compliance.",
    placeholder: "[PLACEHOLDER QO-10] Esta seção avaliará a disponibilidade de evidências documentais: arquivos fiscais, trilha de auditoria e documentação de suporte para compliance.",
    campos: [
      { id: "qo10_arquivos", label: "[QO-10-P1] Período de guarda dos arquivos fiscais", tipo: "radio", opcoes: ["Acima de 10 anos", "5 a 10 anos", "Até 5 anos", "Sem política definida"] },
      { id: "qo10_auditoria", label: "[QO-10-P2] Existe trilha de auditoria das operações fiscais?", tipo: "radio", opcoes: ["Sim — completa e documentada", "Sim — parcial", "Não"] },
      { id: "qo10_obs", label: "[QO-10-P3] Observações (opcional)", tipo: "textarea" },
    ],
  },
];

export default function QuestionarioOperacional() {
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

  const corporateCompleted = diagnosticStatus?.diagnosticStatus?.corporate === "completed";

  useEffect(() => {
    if (projeto && (projeto as any).operationalAnswers) {
      const saved = (projeto as any).operationalAnswers;
      if (typeof saved === "object" && saved !== null) {
        setRespostas(saved as Record<string, string | string[]>);
      }
    }
    if (diagnosticStatus?.diagnosticStatus?.operational === "completed") {
      setConcluido(true);
    }
  }, [projeto, diagnosticStatus]);

  const completarCamada = trpc.diagnostic.completeDiagnosticLayer.useMutation({
    onSuccess: () => {
      toast.success("Questionário Operacional concluído!", { description: "Respostas salvas com sucesso." });
      refetchStatus();
      setConcluido(true);
      setTimeout(() => navigate(`/projetos/${projectId}`), 1500);
    },
    onError: (err) => {
      toast.error("Erro ao concluir", { description: err.message });
    },
  });

  const salvarRascunho = trpc.diagnostic.updateDiagnosticStatus.useMutation({
    onSuccess: () => toast.success("Rascunho salvo"),
    onError: () => toast.error("Erro ao salvar rascunho"),
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
    salvarRascunho.mutate({ projectId, layer: "operational", status: "in_progress" });
  }

  function handleConcluir() {
    completarCamada.mutate({ projectId, layer: "operational", answers: respostas });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!corporateCompleted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Lock className="h-8 w-8 text-amber-600" />
              </div>
            </div>
            <CardTitle>Questionário Corporativo Necessário</CardTitle>
            <CardDescription>
              O Questionário Operacional só pode ser iniciado após a conclusão do Questionário Corporativo.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Complete primeiro o <strong>Questionário Corporativo (QC-01 a QC-10)</strong> para desbloquear esta etapa.
            </p>
            <Button onClick={() => navigate(`/projetos/${projectId}/questionario-corporativo-v2`)} className="w-full">
              Ir para o Questionário Corporativo
            </Button>
            <Button variant="outline" onClick={() => navigate(`/projetos/${projectId}`)} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />Voltar ao Projeto
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projetos/${projectId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />Voltar ao Projeto
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Questionário Operacional</h1>
              <Badge variant="outline" className="text-xs">{totalSecoes} seções</Badge>
              {concluido && (
                <Badge className="bg-emerald-500 text-white text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />Concluído
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {(projeto as any)?.name ?? "Projeto"} — Diagnóstico Operacional
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
                {completarCamada.isPending ? "Concluindo..." : concluido ? "Concluído" : "Concluir Questionário Operacional"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
