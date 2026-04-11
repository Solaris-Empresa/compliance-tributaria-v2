/**
 * QuestionarioCNAE.tsx
 * Diagnóstico Setorial CNAE — 5 seções estruturais (QCNAE-01..QCNAE-05)
 * FASE 4 / T9 — Sprint v2.1
 *
 * REGRA: Esta página contém APENAS estrutura, seções e placeholders.
 * Perguntas jurídicas finais serão inseridas na Fase 5 (pré-sprint RAG).
 * BLOQUEIO: Só acessível após Diagnóstico Operacional (operational) = completed.
 *
 * v2.2: Auto-prefill de campos redundantes com dados do perfil do projeto:
 *   QCNAE-01 (setor econômico) ← operationProfile.operationType
 *   QCNAE-01 (múltiplos CNAEs) ← confirmedCnaes[].length
 *   QCNAE-01 (CNAEs principais) ← confirmedCnaes[].code + description
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
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Save,
  ArrowLeft,
  SkipForward,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  buildCnaePrefill,
  getPrefilledSectionsCnae as getPrefilledSectionsCnaeShared,
} from "@shared/questionario-prefill";

// ─────────────────────────────────────────────────────────────────────────────
// Estrutura oficial das 5 seções do Questionário Setorial CNAE
// ─────────────────────────────────────────────────────────────────────────────
const SECOES_CNAE = [
  {
    codigo: "QCNAE-01",
    titulo: "Identificação Setorial e CNAEs",
    descricao: "CNAEs principais e secundários, setor econômico e classificação setorial.",
    placeholder: "Esta seção mapeará os CNAEs da empresa: atividade principal, atividades secundárias, setor econômico (indústria, comércio, serviços) e a classificação setorial para fins da Reforma Tributária (IBS/CBS/IS).",
    campos: [
      { id: "qcnae01_setor", label: "Setor econômico principal", tipo: "radio", opcoes: ["Indústria (transformação, extração, construção)", "Comércio (atacado ou varejo)", "Serviços (geral)", "Agronegócio / Agropecuária", "Financeiro / Seguros", "Saúde", "Educação", "Tecnologia / TI", "Outro"] },
      { id: "qcnae01_atividades", label: "A empresa possui múltiplos CNAEs (atividades secundárias)?", tipo: "radio", opcoes: ["Sim — mais de 3 CNAEs secundários", "Sim — 1 a 3 CNAEs secundários", "Não — apenas CNAE principal"] },
      { id: "qcnae01_observacoes", label: "Informe os CNAEs principais (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QCNAE-02",
    titulo: "Tributação Específica do Setor",
    descricao: "Tributos setoriais, regimes monofásicos, substituição tributária e tratamentos específicos.",
    placeholder: "Esta seção identificará os tributos setoriais aplicáveis: substituição tributária de ICMS, regimes monofásicos de PIS/COFINS, CIDE, IOF, contribuições setoriais e outros tributos específicos do setor.",
    campos: [
      { id: "qcnae02_st", label: "A empresa está sujeita à Substituição Tributária (ST) de ICMS?", tipo: "radio", opcoes: ["Sim — como substituto tributário", "Sim — como substituído", "Não está sujeita à ST", "Não sei informar"] },
      { id: "qcnae02_monofasico", label: "Há incidência monofásica de PIS/COFINS nas operações?", tipo: "radio", opcoes: ["Sim — para todos os produtos", "Sim — para parte dos produtos", "Não", "Não sei informar"] },
      { id: "qcnae02_tributos_setor", label: "Tributos setoriais aplicáveis (marque todos que se aplicam)", tipo: "checkbox", opcoes: ["CIDE (Contribuição de Intervenção no Domínio Econômico)", "IOF (Imposto sobre Operações Financeiras)", "Contribuição Previdenciária sobre Receita Bruta (CPRB)", "FUNRURAL", "Contribuições ao Sistema S", "Outro tributo setorial"] },
      { id: "qcnae02_observacoes", label: "Observações sobre tributação setorial (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QCNAE-03",
    titulo: "Impacto do IBS/CBS/IS no Setor",
    descricao: "Análise do impacto específico do IBS, CBS e Imposto Seletivo no setor da empresa.",
    placeholder: "Esta seção avaliará o impacto específico da Reforma Tributária no setor: como o IBS e CBS substituirão os tributos atuais, se o setor está sujeito ao Imposto Seletivo (IS) e as principais mudanças esperadas.",
    campos: [
      { id: "qcnae03_is", label: "O setor da empresa pode ser afetado pelo Imposto Seletivo (IS)?", tipo: "radio", opcoes: ["Sim — produto/serviço listado como sujeito ao IS", "Possivelmente — análise em andamento", "Não — setor não sujeito ao IS", "Não sei informar"] },
      { id: "qcnae03_impacto_carga", label: "Expectativa de impacto na carga tributária com a Reforma", tipo: "radio", opcoes: ["Aumento significativo da carga", "Aumento moderado", "Neutro — carga similar", "Redução moderada", "Redução significativa", "Não sei avaliar"] },
      { id: "qcnae03_observacoes", label: "Observações sobre impacto do IBS/CBS/IS (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QCNAE-04",
    titulo: "Regimes Diferenciados e Setoriais",
    descricao: "Regimes especiais setoriais, imunidades, isenções e tratamentos diferenciados previstos na LC 214/2025.",
    placeholder: "Esta seção identificará regimes diferenciados aplicáveis ao setor: imunidades constitucionais, isenções setoriais, regimes especiais previstos na LC 214/2025 (saúde, educação, agronegócio, etc.).",
    campos: [
      { id: "qcnae04_imunidade", label: "O setor possui imunidade ou isenção tributária?", tipo: "radio", opcoes: ["Sim — imunidade constitucional", "Sim — isenção legal", "Sim — redução de alíquota", "Não possui", "Não sei informar"] },
      { id: "qcnae04_regime_especial", label: "O setor possui regime especial previsto na Reforma Tributária?", tipo: "radio", opcoes: ["Sim — setor com tratamento diferenciado (saúde, educação, agronegócio, etc.)", "Possivelmente — análise em andamento", "Não — regime geral", "Não sei informar"] },
      { id: "qcnae04_observacoes", label: "Observações sobre regimes diferenciados (opcional)", tipo: "textarea" },
    ],
  },
  {
    codigo: "QCNAE-05",
    titulo: "Adaptação Setorial e Próximos Passos",
    descricao: "Plano de adaptação setorial, prioridades e necessidades específicas do setor.",
    placeholder: "Esta seção consolidará as necessidades de adaptação setorial: prioridades de compliance, necessidade de assessoria especializada no setor, participação em grupos setoriais e próximos passos.",
    campos: [
      { id: "qcnae05_prioridade", label: "Principal prioridade de compliance setorial", tipo: "radio", opcoes: ["Entender o impacto do IS no setor", "Adaptar a precificação para IBS/CBS", "Revisar contratos e acordos setoriais", "Capacitar equipe em tributação setorial", "Monitorar regulamentação setorial específica"] },
      { id: "qcnae05_associacao", label: "A empresa participa de associações ou grupos setoriais que discutem a Reforma?", tipo: "radio", opcoes: ["Sim — ativamente", "Sim — como observador", "Não, mas tem interesse", "Não tem interesse"] },
      { id: "qcnae05_assessoria", label: "Necessidade de assessoria especializada no setor", tipo: "radio", opcoes: ["Alta — necessidade urgente", "Média — necessidade nos próximos 6 meses", "Baixa — pode aguardar mais regulamentação", "Não necessita de assessoria especializada"] },
      { id: "qcnae05_observacoes", label: "Observações finais e necessidades específicas do setor (opcional)", tipo: "textarea" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mapeamentos: valores do banco → opções do questionário
// ─────────────────────────────────────────────────────────────────────────────

/** operationProfile.operationType → setor econômico principal (radio) */
// Mapeamentos e funções de prefill re-exportados do módulo shared (para compatibilidade)
export { OPERATION_TYPE_TO_SETOR, cnaeCountToAtividades, cnaesToObservacoes, getPrefilledSectionsCnae } from "@shared/questionario-prefill";

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function QuestionarioCNAE() {
  const params = useParams<{ id: string }>();
  const projectId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();
  const [secaoAtual, setSecaoAtual] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  // B-Z11-009: estado do modal de confirmação de pular
  const [confirmSkipAll, setConfirmSkipAll] = useState(false);

  // Buscar projeto
  const { data: projeto, isLoading } = trpc.projects.getById.useQuery(
    { id: projectId },
    { enabled: !!projectId }
  );

  // Buscar status do diagnóstico
  const { data: diagnosticStatus, refetch: refetchStatus } = trpc.diagnostic.getDiagnosticStatus.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Carregar respostas salvas ao montar — com auto-prefill do perfil
  useEffect(() => {
    if (projeto) {
      const p = projeto as any;
      // Respostas salvas anteriormente têm prioridade máxima
      if (p.cnaeAnswers && typeof p.cnaeAnswers === "object" && Object.keys(p.cnaeAnswers).length > 0) {
        setRespostas(p.cnaeAnswers);
      } else {
        // Auto-prefill a partir do perfil do projeto (via módulo shared)
        const prefill = buildCnaePrefill(p);
        if (Object.keys(prefill).length > 0) {
          setRespostas(prev => ({ ...prefill, ...prev }));
        }
      }
    }
    if (diagnosticStatus?.diagnosticStatus?.cnae === "completed") {
      setConcluido(true);
    }
  }, [projeto, diagnosticStatus]);

  // Mutation para completar a camada CNAE
  const completarCamada = trpc.diagnostic.completeDiagnosticLayer.useMutation({
    onSuccess: () => {
      toast.success("Diagnóstico CNAE concluído!", { description: "Todas as 3 camadas concluídas. Gerando Briefing..." });
      refetchStatus();
      setConcluido(true);
      // v2.1: todas as 3 camadas concluídas — avançar para o Briefing
      setTimeout(() => navigate(`/projetos/${projectId}/briefing-v3`), 1500);
    },
    onError: (err) => {
      toast.error("Erro ao concluir", { description: err.message });
    },
  });

  // Mutation para salvar rascunho
  const salvarRascunho = trpc.diagnostic.updateDiagnosticStatus.useMutation({
    onSuccess: () => { setSalvando(false); toast.success("Rascunho salvo"); },
    onError: () => { setSalvando(false); toast.error("Erro ao salvar rascunho"); },
  });

  const secao = SECOES_CNAE[secaoAtual];
  const totalSecoes = SECOES_CNAE.length;
  const progresso = Math.round(((secaoAtual + 1) / totalSecoes) * 100);

  // Seções com dados pré-preenchidos do perfil
  const prefilledSections = getPrefilledSectionsCnaeShared(projeto as any);

  function handleResposta(campoId: string, valor: any) {
    setRespostas(prev => ({ ...prev, [campoId]: valor }));
  }

  function handleCheckbox(campoId: string, opcao: string, checked: boolean) {
    setRespostas(prev => {
      const atual = Array.isArray(prev[campoId]) ? prev[campoId] : [];
      if (checked) return { ...prev, [campoId]: [...atual, opcao] };
      return { ...prev, [campoId]: atual.filter((v: string) => v !== opcao) };
    });
  }

  function handleSalvarRascunho() {
    setSalvando(true);
    salvarRascunho.mutate({ projectId, layer: "cnae", status: "in_progress" });
  }

  async function handleConcluir() {
    completarCamada.mutate({
      projectId,
      layer: "cnae",
      answers: respostas,
    });
  }

  // B-Z11-009: pular questionário CNAE — submete com respostas vazias
  function handleSkipAll() {
    toast.warning("Questionário Setorial CNAE pulado — diagnóstico com confiança reduzida.", { duration: 6000 });
    completarCamada.mutate({ projectId, layer: "cnae", answers: {} });
    setConfirmSkipAll(false);
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
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/projetos/${projectId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Projeto
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <LayoutGrid className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Questionário Setorial CNAE</h1>
              <Badge variant="outline" className="text-xs">
                {totalSecoes} seções
              </Badge>
              {concluido && (
                <Badge className="bg-emerald-500 text-white text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Concluído
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {projeto ? (projeto as any).name ?? "Projeto" : "Carregando..."} — Diagnóstico Setorial CNAE
            </p>
          </div>
        </div>
      </div>

      {/* Barra de progresso global */}
      <div className="bg-card border-b px-6 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Seção {secaoAtual + 1} de {totalSecoes}</span>
            <span>{progresso}% concluído</span>
          </div>
          <Progress value={progresso} className="h-2" />
          {/* Índice de seções */}
          <div className="flex gap-1 mt-3 flex-wrap">
            {SECOES_CNAE.map((s, idx) => (
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
                {prefilledSections.has(s.codigo) && (
                  <span className="ml-1 text-blue-500">●</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo da seção atual */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="font-mono text-xs">{secao.codigo}</Badge>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Seção {secaoAtual + 1}/{totalSecoes}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{secao.titulo}</CardTitle>
                <CardDescription className="mt-1">{secao.descricao}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Banner de pré-preenchimento — exibido na seção QCNAE-01 */}
            {prefilledSections.has(secao.codigo) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Dados pré-preenchidos do perfil do projeto</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Setor econômico, quantidade de CNAEs e lista de CNAEs foram preenchidos automaticamente
                      com base no tipo de operação e nos CNAEs confirmados no cadastro do projeto.
                      Confirme ou ajuste se necessário antes de prosseguir.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Nota de placeholder */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Conteúdo em desenvolvimento</p>
                  <p className="text-xs text-amber-700 mt-1">{secao.placeholder}</p>
                </div>
              </div>
            </div>

            {/* Campos da seção */}
            {secao.campos.map((campo) => (
              <div key={campo.id} className="space-y-2">
                <Label className="text-sm font-medium">{campo.label}</Label>

                {campo.tipo === "radio" && campo.opcoes && (
                  <RadioGroup
                    value={respostas[campo.id] ?? ""}
                    onValueChange={(val) => handleResposta(campo.id, val)}
                    className="space-y-2"
                  >
                    {campo.opcoes.map((opcao) => (
                      <div key={opcao} className="flex items-center space-x-2">
                        <RadioGroupItem value={opcao} id={`${campo.id}_${opcao}`} />
                        <Label htmlFor={`${campo.id}_${opcao}`} className="font-normal cursor-pointer">
                          {opcao}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {campo.tipo === "checkbox" && campo.opcoes && (
                  <div className="space-y-2">
                    {campo.opcoes.map((opcao) => {
                      const checked = Array.isArray(respostas[campo.id]) && respostas[campo.id].includes(opcao);
                      return (
                        <div key={opcao} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${campo.id}_${opcao}`}
                            checked={checked}
                            onCheckedChange={(c) => handleCheckbox(campo.id, opcao, !!c)}
                          />
                          <Label htmlFor={`${campo.id}_${opcao}`} className="font-normal cursor-pointer">
                            {opcao}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                )}

                {campo.tipo === "textarea" && (
                  <Textarea
                    placeholder="Digite suas observações aqui..."
                    value={respostas[campo.id] ?? ""}
                    onChange={(e) => handleResposta(campo.id, e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* B-Z11-009: Botão Pular questionário */}
        <div className="flex justify-center mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmSkipAll(true)}
            data-testid="btn-pular-questionario-cnae"
            className="text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Pular este questionário
          </Button>
        </div>
        {/* Modal de confirmação — Pular questionário CNAE */}
        <Dialog open={confirmSkipAll} onOpenChange={setConfirmSkipAll}>
          <DialogContent data-testid="modal-confirmar-pular-questionario-cnae">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Pular questionário Setorial CNAE?
              </DialogTitle>
              <DialogDescription>
                Ao pular este questionário, o diagnóstico será gerado com{" "}
                <strong>confiança reduzida</strong>. Você poderá voltar e
                responder as perguntas depois.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmSkipAll(false)}
                data-testid="btn-cancelar-pular-cnae"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleSkipAll}
                disabled={completarCamada.isPending}
                data-testid="btn-confirmar-pular-cnae"
              >
                {completarCamada.isPending ? "Pulando..." : "Confirmar — Pular questionário"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Navegação entre seções */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setSecaoAtual(prev => Math.max(0, prev - 1))}
            disabled={secaoAtual === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Seção anterior
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSalvarRascunho}
              disabled={salvando}
            >
              <Save className="h-4 w-4 mr-2" />
              {salvando ? "Salvando..." : "Salvar rascunho"}
            </Button>

            {secaoAtual < totalSecoes - 1 ? (
              <Button onClick={() => setSecaoAtual(prev => Math.min(totalSecoes - 1, prev + 1))}>
                Próxima seção
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleConcluir}
                disabled={completarCamada.isPending || concluido}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {completarCamada.isPending ? "Concluindo..." : concluido ? "Concluído" : "Concluir Diagnóstico Setorial CNAE"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
