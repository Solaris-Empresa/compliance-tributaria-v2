/**
 * ModoUso.tsx — Tela inicial do Novo Fluxo v2.0
 * Usuário escolhe entre Modo Temporário (sem login) ou Modo com Histórico (com login)
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Clock, History, Zap, Shield, ArrowRight, CheckCircle2 } from "lucide-react";
import { FluxoStepper } from "@/components/FluxoStepper";
import { saveSessionToken } from "@/hooks/useFluxoSession";

export default function ModoUso() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState<"temporario" | "historico" | null>(null);

  const createSession = trpc.sessions.create.useMutation({
    onSuccess: (data) => {
      // Salvar token de forma centralizada (sessionStorage + localStorage)
      saveSessionToken(data.sessionToken, data.mode);
      navigate("/briefing");
    },
    onError: (err) => {
      toast.error("Erro ao iniciar sessão", { description: err.message });
      setLoading(null);
    },
  });

  const handleModoTemporario = () => {
    setLoading("temporario");
    createSession.mutate({ mode: "temporario" });
  };

  const handleModoHistorico = () => {
    // Modo histórico requer login — redirecionar para auth
    setLoading("historico");
    sessionStorage.setItem("sessionMode", "historico");
    sessionStorage.setItem("pendingMode", "historico");
    // Redirecionar para login com redirect de volta ao briefing
    navigate("/login?redirect=/briefing-historico");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-6">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4 border-blue-400/50 text-blue-300 bg-blue-500/10">
            Reforma Tributária — Compliance IBS/CBS/IS
          </Badge>
          <h1 className="text-4xl font-bold text-white mb-3">
            Como você quer usar o sistema?
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Escolha o modo de uso que melhor atende sua necessidade. Você pode começar agora mesmo, sem criar conta.
          </p>
          {/* Stepper do fluxo */}
          <div className="flex justify-center mt-6">
            <FluxoStepper current="modo-uso" />
          </div>
        </div>

        {/* Cards de Modo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Modo Temporário */}
          <Card
            className="relative border border-blue-500/30 bg-slate-900/80 backdrop-blur-sm hover:border-blue-400/60 transition-all duration-300 cursor-pointer group"
            onClick={!loading ? handleModoTemporario : undefined}
          >
            <div className="absolute top-4 right-4">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                Sem cadastro
              </Badge>
            </div>
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <Zap className="w-7 h-7 text-blue-400" />
              </div>
              <CardTitle className="text-white text-xl">Modo Rápido</CardTitle>
              <CardDescription className="text-slate-400 text-sm">
                Explore o sistema agora, sem criar conta. Resultados disponíveis por 24 horas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {[
                  "Comece em segundos, sem cadastro",
                  "IA sugere ramos de atividade automaticamente",
                  "Questionário adaptativo por ramo",
                  "Plano de ação gerado pela IA",
                  "Resultados disponíveis por 24h",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-800">
                <Clock className="w-3.5 h-3.5" />
                Sessão expira em 24 horas
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-500 text-white gap-2 mt-2"
                disabled={!!loading}
                onClick={(e) => { e.stopPropagation(); handleModoTemporario(); }}
              >
                {loading === "temporario" ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Iniciando...
                  </span>
                ) : (
                  <>
                    Começar agora
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Modo com Histórico */}
          <Card
            className="relative border border-indigo-500/30 bg-slate-900/80 backdrop-blur-sm hover:border-indigo-400/60 transition-all duration-300 cursor-pointer group"
            onClick={!loading ? handleModoHistorico : undefined}
          >
            <div className="absolute top-4 right-4">
              <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-xs">
                Recomendado
              </Badge>
            </div>
            <CardHeader className="pb-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:bg-indigo-500/30 transition-colors">
                <History className="w-7 h-7 text-indigo-400" />
              </div>
              <CardTitle className="text-white text-xl">Modo com Histórico</CardTitle>
              <CardDescription className="text-slate-400 text-sm">
                Crie uma conta para salvar seu histórico, acompanhar o progresso e acessar relatórios completos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {[
                  "Histórico completo de projetos",
                  "Acompanhamento de progresso",
                  "Relatórios e exportações",
                  "Aprovação e gestão de planos",
                  "Acesso ilimitado sem expiração",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-800">
                <Shield className="w-3.5 h-3.5" />
                Dados salvos com segurança
              </div>

              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white gap-2 mt-2"
                disabled={!!loading}
                onClick={(e) => { e.stopPropagation(); handleModoHistorico(); }}
              >
                {loading === "historico" ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Redirecionando...
                  </span>
                ) : (
                  <>
                    Entrar / Criar conta
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-sm mt-8">
          Plataforma de Compliance Tributário — Reforma Tributária Brasileira (IBS, CBS, IS)
        </p>
      </div>
    </div>
  );
}
