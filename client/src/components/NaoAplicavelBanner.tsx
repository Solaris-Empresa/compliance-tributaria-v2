/**
 * NaoAplicavelBanner — Z-02 DEC-M3-05 v3 · ADR-0010
 *
 * Exibido quando uma empresa de produto puro chega no step Q.Serviços
 * (ou empresa de serviço puro chega no step Q.Produtos).
 * O usuário vê claramente "Não aplicável" e avança com 1 clique.
 */
import { Info, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface NaoAplicavelBannerProps {
  /** 'produto' = empresa de produto chegou em Q.Serviços; 'servico' = empresa de serviço chegou em Q.Produtos */
  tipo: "produto" | "servico";
  /** Callback ao clicar em "Avançar para próxima etapa" */
  onAvancar: () => void;
  /** Se true, exibe spinner no botão */
  isLoading?: boolean;
}

export default function NaoAplicavelBanner({
  tipo,
  onAvancar,
  isLoading = false,
}: NaoAplicavelBannerProps) {
  const titulo =
    tipo === "produto"
      ? "Questionário de Serviços não aplicável"
      : "Questionário de Produtos não aplicável";

  const descricao =
    tipo === "produto"
      ? "Sua empresa opera exclusivamente com produtos — o questionário de serviços NBS não é necessário para o seu perfil. Você pode avançar diretamente para a próxima etapa."
      : "Sua empresa opera exclusivamente com serviços — o questionário de produtos NCM não é necessário para o seu perfil. Você pode avançar diretamente para a próxima etapa.";

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Alert className="border-blue-200 bg-blue-50 text-blue-900">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-800 font-semibold text-base">
          Esta etapa não se aplica à sua empresa
        </AlertTitle>
        <AlertDescription className="mt-2 text-blue-700">
          {descricao}
        </AlertDescription>
      </Alert>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={onAvancar}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          Avançar para próxima etapa
        </Button>
      </div>
    </div>
  );
}
