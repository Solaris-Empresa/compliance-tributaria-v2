/**
 * validateM1Input.ts — Gate de input P0 para M1 Runner v3
 *
 * Hotfix P0: impede execução do Runner com input fiscal incompleto/incoerente.
 * Fecha bug latente: NCM truncado (ex: "1201") caía em fallback silencioso →
 * operationType=industria → IS aplicado em agro indevidamente.
 *
 * Decisões P.O. (REGRA-ORQ-11):
 *   C1: Intermediação = MISTO (Bens/mercadorias + Servicos ambos)
 *   C2: Validação simétrica frontend + backend (TRPCError no router)
 *   C3: P0 valida formato apenas (regex); existência no dataset = P1
 *
 * Enum canônico: "Servicos" (sem acento) — conforme enums.ts
 */
import { TRPCError } from "@trpc/server";

const CNAE_REGEX = /^\d{4}-\d\/\d{2}$/;
const NCM_REGEX = /^\d{4}\.\d{2}\.\d{2}$/;
const NBS_REGEX = /^\d\.\d{4}\.\d{2}\.\d{2}$/;

/**
 * Mapping natureza_operacao_principal → tipo_objeto_economico
 * Valores canônicos: "Bens/mercadorias" e "Servicos" (sem acento, conforme enums.ts)
 * Decisão P.O. C1: Intermediação = MISTO
 */
export function deriveTipoObjetoEconomico(natureza: string[]): string[] {
  const result = new Set<string>();
  for (const item of natureza ?? []) {
    switch (item) {
      case "Produção própria":
      case "Comércio":
        result.add("Bens/mercadorias");
        break;
      case "Transporte":
      case "Prestação de serviço":
      case "Locação":
        result.add("Servicos");
        break;
      case "Intermediação":
        // Decisão P.O. C1: MISTO — exige NCM E NBS
        result.add("Bens/mercadorias");
        result.add("Servicos");
        break;
    }
  }
  return Array.from(result);
}

export interface M1SeedInput {
  cnae_principal_confirmado?: string;
  natureza_operacao_principal?: string[];
  ncms_principais?: string[];
  nbss_principais?: string[];
}

/**
 * Validação simétrica backend (Decisão P.O. C2).
 * Lança TRPCError BAD_REQUEST com código específico se input inválido.
 * P0 valida formato apenas (Decisão P.O. C3) — existência no dataset = P1.
 */
export function validateM1Seed(seed: M1SeedInput): void {
  // CNAE obrigatório
  const cnae = seed.cnae_principal_confirmado?.trim() ?? "";
  if (!cnae || cnae.toLowerCase().startsWith("ex:") || !CNAE_REGEX.test(cnae)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "CNAE_INVALID: informe CNAE válido no formato 0000-0/00 (ex: 0115-6/00).",
    });
  }

  // Derivar tipo de operação para validação NCM/NBS
  const tipoObjeto = deriveTipoObjetoEconomico(seed.natureza_operacao_principal ?? []);
  const requerNcm = tipoObjeto.includes("Bens/mercadorias");
  const requerNbs = tipoObjeto.includes("Servicos");

  // NCM (C3: formato apenas, não existência)
  const ncms = (seed.ncms_principais ?? []).map((n) => n?.trim()).filter(Boolean) as string[];
  if (requerNcm) {
    if (ncms.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "NCM_REQUIRED: operação envolve bens/produtos. Informe ao menos um NCM principal.",
      });
    }
    for (const ncm of ncms) {
      if (!NCM_REGEX.test(ncm)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `NCM_INVALID_FORMAT: '${ncm}' não está no formato completo 0000.00.00 (ex: 1201.90.00).`,
        });
      }
    }
  }

  // NBS (idem)
  const nbss = (seed.nbss_principais ?? []).map((n) => n?.trim()).filter(Boolean) as string[];
  if (requerNbs) {
    if (nbss.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "NBS_REQUIRED: operação envolve serviços. Informe ao menos um NBS principal.",
      });
    }
    for (const nbs of nbss) {
      if (!NBS_REGEX.test(nbs)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `NBS_INVALID_FORMAT: '${nbs}' não está no formato completo 0.0000.00.00 (ex: 1.0501.14.59).`,
        });
      }
    }
  }
}
