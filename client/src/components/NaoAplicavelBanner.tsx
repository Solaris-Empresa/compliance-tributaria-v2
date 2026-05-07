/**
 * NaoAplicavelBanner — Z-02 DEC-M3-05 v3 · ADR-0010
 *
 * Exibido quando uma empresa de produto puro chega no step Q.Serviços
 * (ou empresa de serviço puro chega no step Q.Produtos).
 * O usuário vê claramente "Não aplicável" e avança com 1 clique.
 *
 * Issue #1008 — texto adaptativo por motivo. Em vez de criar 4 banners
 * distintos, o mesmo banner adapta título e descrição com base no
 * `motivo` propagado pelo router (hotfix #1006). Reduz proliferação de
 * componentes preservando UX clara para cada caso.
 */
import { Info, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Motivos vindos do source via router (hotfix #1006).
 * Mantido como string para evitar acoplamento de import com server/.
 */
export type NaoAplicavelMotivo =
  | "no_ncm_codes"
  | "no_nbs_codes"
  | "no_applicable_requirements"
  | null;

interface NaoAplicavelBannerProps {
  /** 'produto' = empresa de produto chegou em Q.Serviços; 'servico' = empresa de serviço chegou em Q.Produtos */
  tipo: "produto" | "servico";
  /** Motivo opcional propagado pelo router. null/undefined preserva comportamento V1 (mensagem fixa). */
  motivo?: NaoAplicavelMotivo;
  /** Callback ao clicar em "Avançar para próxima etapa" */
  onAvancar: () => void;
  /** Se true, exibe spinner no botão */
  isLoading?: boolean;
}

/**
 * Mapeia (tipo, motivo) → (titulo, descricao).
 *
 * Exportado puro para testes unitários — evita necessidade de
 * @testing-library/react que não está configurado neste projeto.
 *
 * Casos:
 *   - motivo = null/undefined → V1 behavior (mensagem fixa por tipo)
 *   - motivo = "no_ncm_codes" → "Nenhum código NCM cadastrado"
 *   - motivo = "no_nbs_codes" → "Nenhum código NBS cadastrado"
 *   - motivo = "no_applicable_requirements" → "Nenhuma fonte retornou perguntas"
 */
export function getNaoAplicavelText(
  tipo: "produto" | "servico",
  motivo?: NaoAplicavelMotivo
): { titulo: string; descricao: string } {
  if (motivo === "no_ncm_codes") {
    return {
      titulo: "Nenhum código NCM cadastrado",
      descricao:
        "Não há códigos NCM informados para esta empresa — o questionário de produtos não é aplicável. " +
        "Você pode avançar para a próxima etapa ou voltar e adicionar NCMs para um diagnóstico mais preciso.",
    };
  }
  if (motivo === "no_nbs_codes") {
    return {
      titulo: "Nenhum código NBS cadastrado",
      descricao:
        "Não há códigos NBS informados para esta empresa — o questionário de serviços não é aplicável. " +
        "Você pode avançar para a próxima etapa ou voltar e adicionar NBS para um diagnóstico mais preciso.",
    };
  }
  if (motivo === "no_applicable_requirements") {
    return {
      titulo: "Nenhuma fonte retornou perguntas para este perfil",
      descricao:
        "RAG e SOLARIS não retornaram perguntas aplicáveis aos códigos informados. " +
        "Diagnóstico parcial — equipe SOLARIS notificada. Você pode avançar para a próxima etapa.",
    };
  }
  // V1 fallback (motivo = null/undefined): comportamento legado preservado.
  return {
    titulo:
      tipo === "produto"
        ? "Questionário de Serviços não aplicável"
        : "Questionário de Produtos não aplicável",
    descricao:
      tipo === "produto"
        ? "Sua empresa opera exclusivamente com produtos — o questionário de serviços NBS não é necessário para o seu perfil. Você pode avançar diretamente para a próxima etapa."
        : "Sua empresa opera exclusivamente com serviços — o questionário de produtos NCM não é necessário para o seu perfil. Você pode avançar diretamente para a próxima etapa.",
  };
}

export default function NaoAplicavelBanner({
  tipo,
  motivo,
  onAvancar,
  isLoading = false,
}: NaoAplicavelBannerProps) {
  const { titulo, descricao } = getNaoAplicavelText(tipo, motivo);

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Alert className="border-blue-200 bg-blue-50 text-blue-900" data-testid="nao-aplicavel-banner">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-800 font-semibold text-base">
          {titulo}
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
          data-testid="nao-aplicavel-avancar"
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
