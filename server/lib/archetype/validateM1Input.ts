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
// GATE-NCM-NBS #1219 F1: grupo (NCM 4 díg. / NBS subposição 1.XXXX) OU específico (ADR-0035).
// Backend é fonte de verdade (Decisão P.O. C2) — simétrico ao frontend.
// Reversão intencional de #859 por ADR-0035 / #1219 (decisão P.O. 14/06/2026):
// "1201" (4 díg. puro) = GRUPO válido (posição NCM), não mais "truncado inválido".
// Demais parciais (12.01, 1201.90, 12019000, 1201.90.0) seguem inválidos. Ver Lição #123.
const NCM_REGEX = /^\d{4}$|^\d{4}\.\d{2}\.\d{2}$/;
const NBS_REGEX = /^\d\.\d{4}$|^\d\.\d{4}\.\d{2}\.\d{2}$/;

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
  // PR-FIN-NBS: campos opcionais para isenção NBS_REQUIRED em setor financeiro.
  // Quando setor_regulado=true E subnatureza_setorial⊇["financeiro"], NBS é
  // dispensado (regime BCB-específico LC 214/2025 Art. 202-220).
  // Callers M1 antigos que não passam esses campos: comportamento inalterado
  // (default undefined → guard isFinanceiro retorna false → exige NBS como antes).
  setor_regulado?: boolean;
  subnatureza_setorial?: string[];
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

  // NCM (Issue #1014: campo opcional — Decisão P.O. 2026-05-07)
  // Antes: NCM_REQUIRED era lançado quando requerNcm && ncms.length === 0.
  // Agora: NCM ausente é aceito (análise automática NCM simplesmente não executa).
  // Mantido: validação de FORMAT (NCM_INVALID_FORMAT) — protege contra NCM truncado
  // (ex: "1201" sem ".90.00") que era a justificativa original do PR #859.
  // Variável requerNcm permanece declarada acima para compatibilidade de leitura
  // semântica do código (pode ser consumida por logs/telemetria futura).
  const ncms = (seed.ncms_principais ?? []).map((n) => n?.trim()).filter(Boolean) as string[];
  for (const ncm of ncms) {
    if (!NCM_REGEX.test(ncm)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `NCM_INVALID_FORMAT: '${ncm}' não está no formato completo 0000.00.00 (ex: 1201.90.00).`,
      });
    }
  }

  // NBS (idem)
  const nbss = (seed.nbss_principais ?? []).map((n) => n?.trim()).filter(Boolean) as string[];

  // PR-FIN-NBS: setor regulado financeiro é classificado por BCB, não por NBS.
  // LC 214/2025 Art. 202-220 define regime específico por regulador.
  // Isenção: setor_regulado=true E subnatureza_setorial⊇["financeiro"].
  // Detectado em Smoke Cenário 6 (financeiro) 2026-04-30 — clientes BCB
  // (banco/fintech/factoring) não têm NBS aplicável.
  const isFinanceiro =
    seed.setor_regulado === true &&
    Array.isArray(seed.subnatureza_setorial) &&
    seed.subnatureza_setorial.includes("financeiro");

  // NBS (Issue #1014: campo opcional — Decisão P.O. 2026-05-07)
  // Antes: NBS_REQUIRED era lançado quando requerNbs && nbss.length === 0 && !isFinanceiro.
  // Agora: NBS ausente é aceito para qualquer operationType (análise automática NBS
  // simplesmente não executa). Bypass prévio para financeiro+BCB fica obsoleto —
  // todos os casos aceitam NBS vazio.
  // Mantido: validação de FORMAT (NBS_INVALID_FORMAT) — evita lixo persistido
  // quando cliente fornece código mal-formado.
  // Variáveis requerNbs e isFinanceiro permanecem para leitura semântica.
  for (const nbs of nbss) {
    if (!NBS_REGEX.test(nbs)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `NBS_INVALID_FORMAT: '${nbs}' não está no formato completo 0.0000.00.00 (ex: 1.0501.14.59).`,
      });
    }
  }
}
