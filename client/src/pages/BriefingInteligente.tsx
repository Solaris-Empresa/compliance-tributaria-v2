/**
 * BriefingInteligente.tsx — Novo Fluxo v2.0
 * Usuário descreve a empresa em texto livre → IA sugere ramos de atividade
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Building2, Sparkles, ArrowRight, ArrowLeft,
  CheckCircle2, AlertCircle, Loader2, ChevronRight
} from "lucide-react";

interface SuggestedBranch {
  code: string;
  name: string;
  justification: string;
  confidence: number;
}

export default function BriefingInteligente() {
  const [, navigate] = useLocation();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [suggestedBranches, setSuggestedBranches] = useState<SuggestedBranch[]>([]);
  const [confirmedBranches, setConfirmedBranches] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<"descricao" | "confirmar">("descricao");

  useEffect(() => {
    const token = sessionStorage.getItem("sessionToken");
    if (!token) {
      navigate("/modo-uso");
      return;
    }
    setSessionToken(token);
  }, [navigate]);

  const suggestMutation = trpc.sessions.suggestBranches.useMutation({
    onSuccess: (data) => {
      setSuggestedBranches(data.branches);
      // Pré-selecionar todos com confiança >= 0.7
      const highConfidence = new Set(
        data.branches
          .filter((b: SuggestedBranch) => b.confidence >= 0.7)
          .map((b: SuggestedBranch) => b.code)
      );
      setConfirmedBranches(highConfidence);
      setStep("confirmar");
    },
    onError: (err) => {
      toast.error("Erro ao analisar empresa", { description: err.message });
    },
  });

  const saveConfirmedMutation = trpc.sessions.saveConfirmedBranches.useMutation({
    onSuccess: () => {
      navigate("/questionario-ramos");
    },
    onError: (err) => {
      toast.error("Erro ao salvar ramos", { description: err.message });
    },
  });

  const handleAnalyze = () => {
    if (!sessionToken) return;
    if (description.trim().length < 20) {
      toast.error("Descrição muito curta", {
        description: "Descreva a empresa com pelo menos 20 caracteres para uma análise precisa.",
      });
      return;
    }
    suggestMutation.mutate({ sessionToken, companyDescription: description });
  };

  const toggleBranch = (code: string) => {
    setConfirmedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleConfirm = () => {
    if (!sessionToken) return;
    if (confirmedBranches.size === 0) {
      toast.error("Selecione ao menos um ramo", {
        description: "É necessário selecionar pelo menos um ramo de atividade para continuar.",
      });
      return;
    }
    const selected = suggestedBranches
      .filter((b) => confirmedBranches.has(b.code))
      .map((b) => ({ code: b.code, name: b.name }));

    saveConfirmedMutation.mutate({
      sessionToken,
      companyDescription: description,
      confirmedBranches: selected,
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return "text-green-400 bg-green-500/10 border-green-500/30";
    if (confidence >= 0.7) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
    return "text-slate-400 bg-slate-500/10 border-slate-500/30";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.85) return "Alta relevância";
    if (confidence >= 0.7) return "Relevância média";
    return "Baixa relevância";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/modo-uso")}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          {/* Progress steps */}
          <div className="flex items-center gap-2 mb-6">
            {["Briefing", "Confirmar Ramos", "Questionário", "Plano de Ação"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full ${
                  i === 0 ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
                  i === 1 && step === "confirmar" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
                  "text-slate-600 border border-slate-800"
                }`}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? "bg-blue-500 text-white" :
                    i === 1 && step === "confirmar" ? "bg-blue-500 text-white" :
                    "bg-slate-800 text-slate-600"
                  }`}>{i + 1}</span>
                  {s}
                </div>
                {i < 3 && <ChevronRight className="w-3 h-3 text-slate-700" />}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {step === "descricao" ? "Conte sobre sua empresa" : "Confirme os ramos de atividade"}
              </h1>
              <p className="text-slate-400 text-sm">
                {step === "descricao"
                  ? "A IA vai identificar os ramos de atividade relevantes para o compliance"
                  : "Revise e ajuste os ramos sugeridos pela IA"}
              </p>
            </div>
          </div>
        </div>

        {/* Step: Descrição */}
        {step === "descricao" && (
          <Card className="border border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Descreva sua empresa
                </label>
                <Textarea
                  placeholder="Ex: Somos uma empresa de tecnologia que desenvolve software para hospitais e clínicas. Também importamos equipamentos médicos da Europa e EUA. Temos 120 funcionários e faturamos R$ 30 milhões por ano..."
                  className="min-h-[160px] bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 resize-none focus:border-blue-500"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-slate-500">
                    Quanto mais detalhes, mais precisa será a análise
                  </p>
                  <span className={`text-xs ${description.length < 20 ? "text-slate-600" : "text-slate-400"}`}>
                    {description.length} caracteres
                  </span>
                </div>
              </div>

              {/* Exemplos */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                <p className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Exemplos de descrição
                </p>
                <div className="space-y-2">
                  {[
                    "Indústria alimentícia que produz e distribui alimentos processados para todo o Brasil",
                    "Escritório de contabilidade que presta serviços para PMEs no setor de varejo",
                    "Construtora especializada em obras residenciais e comerciais no interior de SP",
                  ].map((ex) => (
                    <button
                      key={ex}
                      className="text-xs text-slate-400 hover:text-blue-300 transition-colors text-left block"
                      onClick={() => setDescription(ex)}
                    >
                      → {ex}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-500 text-white gap-2"
                onClick={handleAnalyze}
                disabled={suggestMutation.isPending || description.trim().length < 20}
              >
                {suggestMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analisando com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Analisar com IA
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Confirmar Ramos */}
        {step === "confirmar" && (
          <div className="space-y-4">
            <Card className="border border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-base">
                    Ramos identificados pela IA
                  </CardTitle>
                  <Badge variant="outline" className="border-blue-500/30 text-blue-300 text-xs">
                    {confirmedBranches.size} selecionado{confirmedBranches.size !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <p className="text-slate-400 text-sm">
                  Selecione os ramos que se aplicam à sua empresa. Você pode adicionar ou remover.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestedBranches.map((branch) => {
                  const isSelected = confirmedBranches.has(branch.code);
                  return (
                    <button
                      key={branch.code}
                      onClick={() => toggleBranch(branch.code)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? "border-blue-500/50 bg-blue-500/10"
                          : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                          isSelected ? "border-blue-400 bg-blue-500" : "border-slate-600"
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-white text-sm">{branch.name}</span>
                            <Badge variant="outline" className="text-xs px-1.5 py-0 border-slate-600 text-slate-400">
                              {branch.code}
                            </Badge>
                            <Badge variant="outline" className={`text-xs px-1.5 py-0 ${getConfidenceColor(branch.confidence)}`}>
                              {getConfidenceLabel(branch.confidence)}
                            </Badge>
                          </div>
                          <p className="text-slate-400 text-xs mt-1">{branch.justification}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {confirmedBranches.size === 0 && (
              <div className="flex items-center gap-2 text-yellow-400 text-sm bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Selecione pelo menos um ramo para continuar
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={() => setStep("descricao")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Rever descrição
              </Button>
              <Button
                className="flex-2 bg-blue-600 hover:bg-blue-500 text-white gap-2"
                onClick={handleConfirm}
                disabled={confirmedBranches.size === 0 || saveConfirmedMutation.isPending}
              >
                {saveConfirmedMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    Confirmar e continuar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
