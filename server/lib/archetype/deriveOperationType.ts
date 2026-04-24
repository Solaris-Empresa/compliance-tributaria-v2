/**
 * deriveOperationType.ts — Derivação reversa legada (Q-2 Opção A)
 *
 * Fonte canônica: DERIVATION-OPERATIONTYPE.md §3 (tabela R-01..R-31)
 * Referências cruzadas: SPEC-RUNNER-RODADA-D.md §2.8 + §10.1 Q-2
 *
 * Regras vinculantes (P.O. 2026-04-24):
 * - Determinística — enum match apenas; sem LLM, sem contains(), sem fallback silencioso
 * - Ordem das regras importa (top-down, primeira que bate vence)
 * - Ambiguidade lança AmbiguityError (nunca warning)
 * - `risk-eligibility.ts` (Hotfix IS) permanece intocado — esta função
 *   produz o input `OperationType` que o gate consome
 *
 * Ambiguidades conhecidas (esperadas):
 * - papel=intermediador + tipo_de_relacao contendo valor além de "intermediacao"
 *   (marketplace-com-estoque — R-21-AMB)
 * - papel=indefinido (R-31 default)
 * - Perfil sem dimensões preenchidas
 */

import type { OperationType, PapelNaCadeia } from "./enums";
import { AmbiguityError } from "./types";
import type { PerfilDimensional } from "./types";

// ─── Catálogo de objetos agropecuários (§3.4) ──────────────────────────────

const AGRO_OBJECTS: readonly string[] = ["agricola", "pecuario"] as const;

// ─── Função principal — tabela R-01 a R-31 ─────────────────────────────────

/**
 * Deriva `OperationType` legado (consumido por `risk-eligibility.ts`) a partir
 * do perfil dimensional. Implementa a tabela de decisão DERIVATION-OPERATIONTYPE §3.2.
 *
 * Ordem: regras específicas (R-01, R-02) antes das regras por papel (R-10..R-19).
 * R-20 REMOVIDA — `marketplace` não é mais enum (Q-3 RESOLVIDA).
 * R-21 desbloqueada com constraint sobre `tipo_de_relacao`.
 *
 * @throws AmbiguityError em condições E-1, E-2, E-3 (§4.2 do artefato)
 */
export function deriveOperationType(
  perfil: Pick<
    PerfilDimensional,
    "papel_na_cadeia" | "tipo_de_relacao" | "objeto"
  >,
): OperationType {
  const { papel_na_cadeia, tipo_de_relacao, objeto } = perfil;

  // R-01: precedência alta — agronegócio (ADR-0030 v1.1 D-6)
  if (objeto.some((o) => (AGRO_OBJECTS as readonly string[]).includes(o))) {
    return "agronegocio";
  }

  // R-02: precedência alta — serviço financeiro
  if (objeto.includes("servico_financeiro")) {
    return "financeiro";
  }

  // R-10 a R-19: mapeamento por papel_na_cadeia
  switch (papel_na_cadeia satisfies PapelNaCadeia) {
    case "fabricante":
    case "produtor":
      return "industria";

    case "distribuidor":
    case "varejista":
    case "importador":
    case "exportador":
    case "comercio_exterior_misto":
      return "comercio";

    case "prestador":
    case "operadora_regulada":
    case "transportador":
      return "servicos";

    case "intermediador": {
      // R-21: intermediador + tipo_de_relacao = ["intermediacao"] exclusivamente → servicos
      // R-21-AMB: coexistência com qualquer outro valor → AmbiguityError
      const hasOnlyIntermediacao =
        tipo_de_relacao.length >= 1 &&
        tipo_de_relacao.every((t) => t === "intermediacao");
      if (hasOnlyIntermediacao) {
        return "servicos";
      }
      throw new AmbiguityError(
        "DERIVE-001",
        `Marketplace-com-estoque (papel=intermediador com tipo_de_relacao=${JSON.stringify(tipo_de_relacao)}) não resolve para OperationType único — Q-3 R-21-AMB`,
        ["R-21-AMB"],
      );
    }

    case "indefinido":
      throw new AmbiguityError(
        "DERIVE-001",
        "papel_na_cadeia=indefinido — derivação de OperationType exige papel definido",
        ["R-31"],
      );
  }

  // R-30: composição — venda + servico simultâneos (fallback quando switch não cobrir)
  // Em TypeScript com enum exhaustivo, este código é unreachable. Guard defensivo.
  if (
    tipo_de_relacao.includes("venda") &&
    tipo_de_relacao.includes("servico")
  ) {
    return "misto";
  }

  // R-31: nenhuma regra bateu — AmbiguityError (E-1)
  throw new AmbiguityError(
    "DERIVE-001",
    `Nenhuma regra R-01..R-30 bateu para perfil (papel=${papel_na_cadeia}, relacao=${JSON.stringify(tipo_de_relacao)}, objeto=${JSON.stringify(objeto)})`,
    ["R-31"],
  );
}
