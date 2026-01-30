import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, Clock, Sparkles } from "lucide-react";

interface GenerationProgressModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  estimatedSeconds?: number;
  onCancel?: () => void;
}

export function GenerationProgressModal({
  isOpen,
  title,
  description = "Aguarde enquanto processamos sua solicitação...",
  estimatedSeconds = 60,
  onCancel,
}: GenerationProgressModalProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);

  const messages = [
    "Analisando dados do projeto...",
    "Consultando inteligência artificial...",
    "Processando respostas do assessment...",
    "Gerando análise detalhada...",
    "Identificando riscos e oportunidades...",
    "Finalizando documento...",
  ];

  // Timer para contar segundos decorridos
  useEffect(() => {
    if (!isOpen) {
      setElapsedSeconds(0);
      setCurrentMessage(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Rotacionar mensagens a cada 8 segundos
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [isOpen, messages.length]);

  // Calcular progresso (máximo 95% até completar)
  const progress = Math.min(95, (elapsedSeconds / estimatedSeconds) * 100);

  // Formatar tempo decorrido
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Determinar cor do progresso baseado no tempo
  const getProgressColor = () => {
    if (elapsedSeconds < estimatedSeconds * 0.5) return "bg-blue-500";
    if (elapsedSeconds < estimatedSeconds) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Barra de progresso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Tempo decorrido */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Tempo decorrido</span>
            </div>
            <span className="font-mono text-lg font-semibold">{formatTime(elapsedSeconds)}</span>
          </div>

          {/* Estimativa */}
          {elapsedSeconds < estimatedSeconds && (
            <div className="text-center text-sm text-muted-foreground">
              Tempo estimado: ~{Math.ceil(estimatedSeconds / 60)} minuto
              {Math.ceil(estimatedSeconds / 60) > 1 ? "s" : ""}
            </div>
          )}

          {elapsedSeconds >= estimatedSeconds && (
            <div className="text-center text-sm text-orange-600">
              A operação está demorando mais que o esperado. Por favor, aguarde...
            </div>
          )}

          {/* Mensagem atual */}
          <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <span className="text-sm">{messages[currentMessage]}</span>
          </div>

          {/* Botão de cancelar (opcional) */}
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="w-full">
              Cancelar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
