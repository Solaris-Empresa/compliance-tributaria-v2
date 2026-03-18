// @ts-nocheck
/**
 * RevisaoQuestionario — V70.2
 *
 * Componente de revisão de respostas do questionário a partir do Briefing.
 * Ativado quando o usuário clica "Corrigir no Questionário" no modal de inconsistências.
 *
 * UX Principles:
 * - O usuário SABE que está em modo de revisão (banner contextual âmbar fixo no topo)
 * - O FlowStepper mostra o Briefing como etapa atual (não regride visualmente)
 * - A pergunta inconsistente é destacada com borda âmbar e scroll automático
 * - O status do projeto NÃO é alterado — apenas as respostas são atualizadas
 * - Botão "Salvar e Regenerar Briefing" é a única ação de saída (além de cancelar)
 */
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import ComplianceLayout from "@/components/ComplianceLayout";
import FlowStepper from "@/components/FlowStepper";
import { statusToCompletedStep } from "@/lib/flowStepperUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Loader2,
  Sparkles, ToggleLeft, BarChart2, List, MessageSquare, AlignLeft,
} from "lucide-react";
import { toast } from "sonner";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Answer {
  id: number;
  cnaeCode: string;
  cnaeDescription?: string;
  level: "nivel1" | "nivel2";
  questionIndex: number;
  questionText: string;
  questionType?: string;
  answerValue: string;
}

interface Props {
  projectId: number;
  project: any;
  savedProgress: { answers: Answer[] };
  perguntaInconsistente: string; // texto da pergunta a destacar
  onSalvar: () => void;   // navega para /briefing-v3?regenerar=true
  onCancelar: () => void; // navega para /briefing-v3
}

// ─── Campos de resposta (reutilizados do QuestionarioV3) ──────────────────────
function SimNaoField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-3">
      {["Sim", "Não", "Parcialmente"].map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={cn(
            "flex-1 py-2.5 px-3 rounded-xl border-2 text-sm font-semibold transition-all",
            value === opt
              ? opt === "Sim" ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : opt === "Não" ? "border-red-400 bg-red-50 text-red-700"
                : "border-amber-400 bg-amber-50 text-amber-700"
              : "border-border hover:border-primary/40 text-muted-foreground"
          )}
        >
          {opt === "Sim" ? "✓ Sim" : opt === "Não" ? "✗ Não" : "~ Parcialmente"}
        </button>
      ))}
    </div>
  );
}

function EscalaLikertField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const colors = ["bg-red-100 border-red-300 text-red-700", "bg-orange-100 border-orange-300 text-orange-700", "bg-amber-100 border-amber-300 text-amber-700", "bg-lime-100 border-lime-300 text-lime-700", "bg-emerald-100 border-emerald-300 text-emerald-700"];
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n, i) => (
        <button
          key={n}
          onClick={() => onChange(String(n))}
          className={cn("flex-1 h-12 rounded-xl border-2 text-lg font-bold transition-all", value === String(n) ? colors[i] + " scale-105" : "border-border hover:border-primary/40 text-muted-foreground")}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function MultiplaEscolhaField({ value, onChange, options, single }: { value: string; onChange: (v: string) => void; options: string[]; single?: boolean }) {
  const selected = value ? value.split("|") : [];
  const toggle = (opt: string) => {
    if (single) { onChange(opt); return; }
    const next = selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt];
    onChange(next.join("|"));
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => toggle(opt)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-all",
            selected.includes(opt) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50 text-muted-foreground"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function AnswerField({ answer, onChange }: { answer: Answer; onChange: (v: string) => void }) {
  const type = answer.questionType || "texto_longo";
  if (type === "sim_nao") return <SimNaoField value={answer.answerValue} onChange={onChange} />;
  if (type === "escala_likert") return <EscalaLikertField value={answer.answerValue} onChange={onChange} />;
  if (type === "multipla_escolha") return <MultiplaEscolhaField value={answer.answerValue} onChange={onChange} options={[]} />;
  if (type === "selecao_unica") return <MultiplaEscolhaField value={answer.answerValue} onChange={onChange} options={[]} single />;
  if (type === "texto_curto") return <Input value={answer.answerValue} onChange={e => onChange(e.target.value)} className="h-10" />;
  return <Textarea value={answer.answerValue} onChange={e => onChange(e.target.value)} rows={3} className="resize-none" />;
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export function RevisaoQuestionario({ projectId, project, savedProgress, perguntaInconsistente, onSalvar, onCancelar }: Props) {
  const allAnswers: Answer[] = savedProgress?.answers || [];
  const cnaeList: { code: string; description: string }[] = (project?.confirmedCnaes as any[]) || [];

  // Estado local das respostas editadas (cópia mutável)
  const [editedAnswers, setEditedAnswers] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [changedCount, setChangedCount] = useState(0);

  // Ref para scroll automático até a pergunta inconsistente
  const inconsistenteRef = useRef<HTMLDivElement | null>(null);

  // Scroll para a pergunta inconsistente após mount
  useEffect(() => {
    if (inconsistenteRef.current) {
      setTimeout(() => {
        inconsistenteRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 400);
    }
  }, []);

  // Atualizar contador de mudanças
  useEffect(() => {
    setChangedCount(Object.keys(editedAnswers).length);
  }, [editedAnswers]);

  const saveAnswerMutation = trpc.fluxoV3.saveAnswer.useMutation();

  const handleChange = (answerId: number, value: string) => {
    setEditedAnswers(prev => ({ ...prev, [answerId]: value }));
  };

  const handleSalvar = async () => {
    if (changedCount === 0) {
      toast.info("Nenhuma resposta foi alterada.");
      return;
    }
    setIsSaving(true);
    try {
      // Salvar apenas as respostas que foram alteradas
      const changedAnswers = allAnswers.filter(a => editedAnswers[a.id] !== undefined && editedAnswers[a.id] !== a.answerValue);
      for (const answer of changedAnswers) {
        await saveAnswerMutation.mutateAsync({
          projectId,
          cnaeCode: answer.cnaeCode,
          cnaeDescription: answer.cnaeDescription,
          level: answer.level,
          questionIndex: answer.questionIndex,
          questionText: answer.questionText,
          questionType: answer.questionType,
          answerValue: editedAnswers[answer.id],
        });
      }
      toast.success(`${changedAnswers.length} resposta(s) salva(s). Regenerando briefing...`);
      onSalvar(); // navega para /briefing-v3?regenerar=true
    } catch (err) {
      toast.error("Erro ao salvar respostas. Tente novamente.");
      setIsSaving(false);
    }
  };

  // Agrupar respostas por CNAE
  const answersByCnae = cnaeList.map(cnae => ({
    ...cnae,
    nivel1: allAnswers.filter(a => a.cnaeCode === cnae.code && a.level === "nivel1"),
    nivel2: allAnswers.filter(a => a.cnaeCode === cnae.code && a.level === "nivel2"),
  }));

  // Verificar se uma resposta é a pergunta inconsistente
  const isInconsistente = (questionText: string) => {
    if (!perguntaInconsistente) return false;
    return questionText.toLowerCase().includes(perguntaInconsistente.toLowerCase().slice(0, 40));
  };

  return (
    <ComplianceLayout>
      <div className="max-w-3xl mx-auto space-y-6 py-2">
        {/* Banner de revisão — fixo e bem visível */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border-2 border-amber-300 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">Modo de Revisão — Correção de Inconsistência</p>
            <p className="text-xs text-amber-800 mt-0.5">
              O briefing identificou uma inconsistência nas respostas. Corrija as respostas abaixo e clique em
              <strong> "Salvar e Regenerar Briefing"</strong> para atualizar a análise.
              O status do projeto não será alterado.
            </p>
          </div>
          {changedCount > 0 && (
            <Badge className="bg-amber-600 text-white shrink-0">{changedCount} alteração(ões)</Badge>
          )}
        </div>

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="gap-2 text-sm shrink-0" onClick={onCancelar}>
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar ao Briefing</span>
            <span className="sm:hidden">Voltar</span>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{project?.name || "Questionário"}</h1>
            <p className="text-sm text-muted-foreground">Revisão de Respostas — Etapa 2 de 5</p>
          </div>
        </div>

        {/* Stepper — mostra Briefing (etapa 3) como atual, não regride */}
        <FlowStepper currentStep={3} projectId={projectId} completedUpTo={statusToCompletedStep(project?.status)} />

        {/* Respostas editáveis por CNAE */}
        {answersByCnae.map((cnae) => (
          <div key={cnae.code} className="space-y-3">
            {/* Cabeçalho do CNAE */}
            <div className="flex items-center gap-2 pt-2">
              <span className="font-mono text-sm font-bold text-primary">{cnae.code}</span>
              <Badge variant="secondary" className="text-xs">{cnae.description}</Badge>
            </div>

            {/* Nível 1 */}
            {cnae.nivel1.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nível 1 — Essencial</p>
                  {cnae.nivel1.map((a, idx) => {
                    const isHighlighted = isInconsistente(a.questionText);
                    const currentValue = editedAnswers[a.id] ?? a.answerValue;
                    const wasChanged = editedAnswers[a.id] !== undefined && editedAnswers[a.id] !== a.answerValue;
                    return (
                      <div
                        key={a.id}
                        ref={isHighlighted ? inconsistenteRef : null}
                        className={cn(
                          "space-y-2 pb-4 border-b last:border-0 last:pb-0 rounded-lg transition-all",
                          isHighlighted && "bg-amber-50 border-2 border-amber-300 p-3 -mx-1",
                          wasChanged && !isHighlighted && "bg-blue-50/50 rounded-lg p-2 -mx-1"
                        )}
                      >
                        {/* Indicador de inconsistência */}
                        {isHighlighted && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-700">Resposta inconsistente — corrija abaixo</span>
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium flex-1">{idx + 1}. {a.questionText}</p>
                          {wasChanged && (
                            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 shrink-0">Alterado</Badge>
                          )}
                        </div>
                        {/* Resposta original (se alterada) */}
                        {wasChanged && (
                          <p className="text-xs text-muted-foreground line-through pl-4">Antes: {a.answerValue}</p>
                        )}
                        {/* Campo de edição */}
                        <div className="pl-0">
                          <AnswerField answer={{ ...a, answerValue: currentValue }} onChange={(v) => handleChange(a.id, v)} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Nível 2 */}
            {cnae.nivel2.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nível 2 — Aprofundamento</p>
                  {cnae.nivel2.map((a, idx) => {
                    const isHighlighted = isInconsistente(a.questionText);
                    const currentValue = editedAnswers[a.id] ?? a.answerValue;
                    const wasChanged = editedAnswers[a.id] !== undefined && editedAnswers[a.id] !== a.answerValue;
                    return (
                      <div
                        key={a.id}
                        ref={isHighlighted ? inconsistenteRef : null}
                        className={cn(
                          "space-y-2 pb-4 border-b last:border-0 last:pb-0",
                          isHighlighted && "bg-amber-50 border-2 border-amber-300 rounded-lg p-3 -mx-1",
                          wasChanged && !isHighlighted && "bg-blue-50/50 rounded-lg p-2 -mx-1"
                        )}
                      >
                        {isHighlighted && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-700">Resposta inconsistente — corrija abaixo</span>
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium flex-1">{idx + 1}. {a.questionText}</p>
                          {wasChanged && (
                            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 shrink-0">Alterado</Badge>
                          )}
                        </div>
                        {wasChanged && (
                          <p className="text-xs text-muted-foreground line-through pl-4">Antes: {a.answerValue}</p>
                        )}
                        <AnswerField answer={{ ...a, answerValue: currentValue }} onChange={(v) => handleChange(a.id, v)} />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        ))}

        {/* Ações fixas no rodapé */}
        <div className="sticky bottom-4 flex gap-3 pt-4 pb-2 bg-background/95 backdrop-blur border-t">
          <Button variant="outline" onClick={onCancelar} disabled={isSaving} className="flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button
            onClick={handleSalvar}
            disabled={isSaving || changedCount === 0}
            className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Salvar e Regenerar Briefing {changedCount > 0 ? `(${changedCount})` : ""}</>
            )}
          </Button>
        </div>
      </div>
    </ComplianceLayout>
  );
}
