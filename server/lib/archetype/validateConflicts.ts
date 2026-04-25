/**
 * validateConflicts.ts — Detecção de conflitos lógicos entre dimensões
 *
 * Fonte canônica: LOGICAL-CONFLICTS-v1.0.md §3 (6 classes, 31 regras)
 * Referências cruzadas: SPEC-RUNNER-RODADA-D.md §4.2.1 regra 3
 *
 * Regras vinculantes:
 * - Comparações por igualdade estrita em enum fechado (I-LC-1)
 * - Zero substring, regex, ou LLM (ADR-0031 Princípio 2)
 * - Conflitos aditivos (I-LC-2) — ordem de avaliação não muda resultado
 * - Determinístico (I-LC-3) — mesmo input → mesmo conjunto de blockers
 * - Override Q-D3: C4-01 não dispara quando regime_especifico.length > 0
 */

import type { Blocker } from "./types";
import type { PerfilDimensional, Seed } from "./types";

/**
 * Perfil parcial necessário para validação de conflitos.
 * Exclui metadata (status, hashes, model_version) que não afetam detecção.
 */
type PerfilForValidation = Pick<
  PerfilDimensional,
  | "papel_na_cadeia"
  | "tipo_de_relacao"
  | "objeto"
  | "territorio"
  | "regime"
  | "subnatureza_setorial"
  | "orgao_regulador"
  | "regime_especifico"
>;

/**
 * Contexto extra da seed necessário para regras que cruzam perfil × seed
 * (ex.: C3-05 — território internacional sem atua_importacao/atua_exportacao).
 */
export interface ConflictContext {
  readonly atua_importacao: boolean;
  readonly atua_exportacao: boolean;
}

function conflict(id: string, rule: string): Blocker {
  return { id: `V-LC-${id}`, severity: "HARD_BLOCK", rule };
}

// ─── C1 — Papel × Relação (§4) — 8 regras ──────────────────────────────────

function validateC1(perfil: PerfilForValidation): Blocker[] {
  const out: Blocker[] = [];
  const { papel_na_cadeia: papel, tipo_de_relacao: rel } = perfil;

  // C1-01: papel=transportador AND "venda" ∈ tipo_de_relacao
  if (papel === "transportador" && rel.includes("venda")) {
    out.push(
      conflict(
        "101",
        'papel_na_cadeia="transportador" com "venda" em tipo_de_relacao — transportador presta serviço, não vende',
      ),
    );
  }

  // C1-02: papel=fabricante AND "producao" ∉ tipo_de_relacao
  if (papel === "fabricante" && !rel.includes("producao")) {
    out.push(
      conflict(
        "102",
        'papel_na_cadeia="fabricante" sem "producao" em tipo_de_relacao — fabricante, por definição, produz',
      ),
    );
  }

  // C1-03: papel=prestador AND "servico" ∉ tipo_de_relacao
  if (papel === "prestador" && !rel.includes("servico")) {
    out.push(
      conflict(
        "103",
        'papel_na_cadeia="prestador" sem "servico" em tipo_de_relacao — contradição direta',
      ),
    );
  }

  // C1-04: papel=varejista AND "venda" ∉ tipo_de_relacao
  if (papel === "varejista" && !rel.includes("venda")) {
    out.push(
      conflict(
        "104",
        'papel_na_cadeia="varejista" sem "venda" em tipo_de_relacao',
      ),
    );
  }

  // C1-05: papel=distribuidor AND "venda" ∉ tipo_de_relacao
  if (papel === "distribuidor" && !rel.includes("venda")) {
    out.push(
      conflict(
        "105",
        'papel_na_cadeia="distribuidor" sem "venda" em tipo_de_relacao',
      ),
    );
  }

  // C1-06: papel=intermediador AND tipo_de_relacao ≠ ["intermediacao"]
  if (papel === "intermediador") {
    const hasOnlyIntermediacao =
      rel.length >= 1 && rel.every((r) => r === "intermediacao");
    if (!hasOnlyIntermediacao) {
      out.push(
        conflict(
          "106",
          `papel_na_cadeia="intermediador" com tipo_de_relacao=${JSON.stringify(rel)} — marketplace-com-estoque não resolve (Q-3)`,
        ),
      );
    }
  }

  // C1-07: papel=produtor AND "producao" ∉ tipo_de_relacao
  if (papel === "produtor" && !rel.includes("producao")) {
    out.push(
      conflict(
        "107",
        'papel_na_cadeia="produtor" sem "producao" em tipo_de_relacao',
      ),
    );
  }

  // C1-08: papel=operadora_regulada AND "servico" ∉ tipo_de_relacao
  if (papel === "operadora_regulada" && !rel.includes("servico")) {
    out.push(
      conflict(
        "108",
        'papel_na_cadeia="operadora_regulada" sem "servico" em tipo_de_relacao',
      ),
    );
  }

  return out;
}

// ─── C2 — Papel × Objeto (§5) — 6 regras ───────────────────────────────────

function validateC2(perfil: PerfilForValidation): Blocker[] {
  const out: Blocker[] = [];
  const { papel_na_cadeia: papel, objeto } = perfil;

  // C2-01: papel=fabricante AND objeto vazio
  if (papel === "fabricante" && objeto.length === 0) {
    out.push(conflict("201", "papel=fabricante com objeto vazio — fabricante do quê?"));
  }

  // C2-02: papel=operadora_regulada sem servico_regulado ou servico_financeiro
  if (papel === "operadora_regulada") {
    const hasRegulado =
      objeto.includes("servico_regulado") ||
      objeto.includes("servico_financeiro");
    if (!hasRegulado) {
      out.push(
        conflict(
          "202",
          'papel="operadora_regulada" sem "servico_regulado" nem "servico_financeiro" em objeto',
        ),
      );
    }
  }

  // C2-03: papel=importador AND objeto == ["servico_digital"] somente
  if (
    papel === "importador" &&
    objeto.length === 1 &&
    objeto[0] === "servico_digital"
  ) {
    out.push(
      conflict(
        "203",
        'papel="importador" com objeto=["servico_digital"] — importador opera bens físicos',
      ),
    );
  }

  // C2-04: papel=exportador AND objeto == ["servico_digital"] somente
  if (
    papel === "exportador" &&
    objeto.length === 1 &&
    objeto[0] === "servico_digital"
  ) {
    out.push(
      conflict(
        "204",
        'papel="exportador" com objeto=["servico_digital"] — exportador opera bens físicos',
      ),
    );
  }

  // C2-05: papel=transportador AND objeto contém servico_digital OU servico_financeiro
  if (papel === "transportador") {
    const hasService =
      objeto.includes("servico_digital") ||
      objeto.includes("servico_financeiro");
    if (hasService) {
      out.push(
        conflict(
          "205",
          'papel="transportador" com "servico_digital" ou "servico_financeiro" em objeto — transportador move bens físicos',
        ),
      );
    }
  }

  // C2-06: papel=produtor AND objeto ⊆ {servicos...}
  if (papel === "produtor" && objeto.length > 0) {
    const allServicos = objeto.every(
      (o) =>
        o === "servico_geral" ||
        o === "servico_regulado" ||
        o === "servico_digital" ||
        o === "servico_financeiro",
    );
    if (allServicos) {
      out.push(
        conflict(
          "206",
          'papel="produtor" com objeto apenas serviços — produtor agrícola/pecuário produz bens materiais',
        ),
      );
    }
  }

  return out;
}

// ─── C3 — Papel × Território (§6) — 5 regras (C3-01..C3-05) ────────────────

function validateC3(
  perfil: PerfilForValidation,
  ctx: ConflictContext,
): Blocker[] {
  const out: Blocker[] = [];
  const { papel_na_cadeia: papel, territorio, objeto } = perfil;
  const hasInternacional = territorio.includes("internacional");

  // C3-01: papel=importador AND "internacional" ∉ territorio (guardrail)
  if (papel === "importador" && !hasInternacional) {
    out.push(
      conflict(
        "301",
        'papel="importador" sem "internacional" em territorio (guardrail defensivo — derivação §2.2.1 deveria ter incluído)',
      ),
    );
  }

  // C3-02: papel=exportador AND "internacional" ∉ territorio (guardrail)
  if (papel === "exportador" && !hasInternacional) {
    out.push(conflict("302", 'papel="exportador" sem "internacional" em territorio (guardrail)'));
  }

  // C3-03: papel=comercio_exterior_misto AND "internacional" ∉ territorio
  if (papel === "comercio_exterior_misto" && !hasInternacional) {
    out.push(
      conflict(
        "303",
        'papel="comercio_exterior_misto" sem "internacional" em territorio (guardrail)',
      ),
    );
  }

  // C3-04: transportador + territorio=["municipal"] + objeto IS
  if (
    papel === "transportador" &&
    territorio.length === 1 &&
    territorio[0] === "municipal"
  ) {
    const hasIS =
      objeto.includes("combustivel") ||
      objeto.includes("bebida") ||
      objeto.includes("tabaco");
    if (hasIS) {
      out.push(
        conflict(
          "304",
          'papel="transportador" com territorio=["municipal"] e objeto sujeito a IS — tributação municipal distinta',
        ),
      );
    }
  }

  // C3-05: coerência reversa (Q-D2) — territorio internacional sem sinais CEx
  const papelCex =
    papel === "importador" ||
    papel === "exportador" ||
    papel === "comercio_exterior_misto";
  if (
    hasInternacional &&
    !papelCex &&
    !ctx.atua_importacao &&
    !ctx.atua_exportacao
  ) {
    out.push(
      conflict(
        "305",
        'territorio contém "internacional" mas papel não é CEx e flags atua_importacao/exportacao são false — inconsistência declarativa',
      ),
    );
  }

  return out;
}

// ─── C4 — Papel × Regime (§7) — 4 regras (com override Q-D3) ───────────────

function validateC4(perfil: PerfilForValidation): Blocker[] {
  const out: Blocker[] = [];
  const { papel_na_cadeia: papel, regime, regime_especifico } = perfil;

  // C4-01: operadora + simples + SEM regime_especifico (Q-D3 override)
  if (
    papel === "operadora_regulada" &&
    regime === "simples_nacional" &&
    regime_especifico.length === 0
  ) {
    out.push(
      conflict(
        "401",
        'papel="operadora_regulada" com regime="simples_nacional" sem regime_especifico — LC 123/06 Art. 17 exclui setor regulado (override possível via regime_especifico Q-D3)',
      ),
    );
  }

  // C4-02: fabricante + mei
  if (papel === "fabricante" && regime === "mei") {
    out.push(
      conflict(
        "402",
        'papel="fabricante" com regime="mei" — porte incompatível (MEI limite receita bruta R$ 81k/ano)',
      ),
    );
  }

  // C4-03: operadora_regulada + mei
  if (papel === "operadora_regulada" && regime === "mei") {
    out.push(
      conflict(
        "403",
        'papel="operadora_regulada" com regime="mei" — operadoras reguladas raramente MEI',
      ),
    );
  }

  // C4-04: importador + mei
  if (papel === "importador" && regime === "mei") {
    out.push(
      conflict(
        "404",
        'papel="importador" com regime="mei" — MEI não pode importar (Art. 18-A LC 123/06)',
      ),
    );
  }

  return out;
}

// ─── C5 — Relação × Objeto (§8) — 3 regras ─────────────────────────────────

function validateC5(perfil: PerfilForValidation): Blocker[] {
  const out: Blocker[] = [];
  const { tipo_de_relacao: rel, objeto } = perfil;

  // C5-01: locacao exclusiva + objeto consumível
  if (rel.length === 1 && rel[0] === "locacao") {
    const hasConsumivel =
      objeto.includes("alimento") ||
      objeto.includes("bebida") ||
      objeto.includes("tabaco") ||
      objeto.includes("combustivel") ||
      objeto.includes("medicamento");
    if (hasConsumivel) {
      out.push(
        conflict(
          "501",
          'tipo_de_relacao=["locacao"] com objeto consumível — locação implausível, geralmente é venda',
        ),
      );
    }
  }

  // C5-02: producao exclusiva + objeto apenas serviços financeiro/digital
  if (rel.length === 1 && rel[0] === "producao") {
    const allServicoPuro = objeto.every(
      (o) => o === "servico_financeiro" || o === "servico_digital",
    );
    if (objeto.length > 0 && allServicoPuro) {
      out.push(
        conflict(
          "502",
          'tipo_de_relacao=["producao"] com objeto apenas servico_financeiro/digital — produção pressupõe objeto material',
        ),
      );
    }
  }

  // C5-03: intermediacao + objeto=["combustivel"]
  if (
    rel.includes("intermediacao") &&
    objeto.length === 1 &&
    objeto[0] === "combustivel"
  ) {
    out.push(
      conflict(
        "503",
        '"intermediacao" em tipo_de_relacao com objeto=["combustivel"] — cadeia de combustível controlada, intermediação pura é incomum',
      ),
    );
  }

  return out;
}

// ─── C6 — Contextuais: subnatureza × órgão regulador (§9) — 7 regras ───────

function validateC6(perfil: PerfilForValidation): Blocker[] {
  const out: Blocker[] = [];
  const {
    subnatureza_setorial: sub,
    orgao_regulador: org,
    papel_na_cadeia: papel,
  } = perfil;

  // C6-01: telecomunicacoes sem ANATEL
  if (sub.includes("telecomunicacoes") && !org.includes("ANATEL")) {
    out.push(
      conflict("601", 'subnatureza_setorial contém "telecomunicacoes" sem "ANATEL" em orgao_regulador'),
    );
  }

  // C6-02: saude/saude_regulada sem ANVISA ou ANS
  const hasSaude = sub.includes("saude") || sub.includes("saude_regulada");
  const hasSaudeOrg = org.includes("ANVISA") || org.includes("ANS");
  if (hasSaude && !hasSaudeOrg) {
    out.push(
      conflict(
        "602",
        'subnatureza_setorial contém "saude"/"saude_regulada" sem "ANVISA" nem "ANS" em orgao_regulador',
      ),
    );
  }

  // C6-03: energia sem ANEEL
  if (sub.includes("energia") && !org.includes("ANEEL")) {
    out.push(
      conflict("603", 'subnatureza_setorial contém "energia" sem "ANEEL" em orgao_regulador'),
    );
  }

  // C6-04: financeiro sem BCB/CVM/SUSEP
  const hasFinanceiroOrg =
    org.includes("BCB") || org.includes("CVM") || org.includes("SUSEP");
  if (sub.includes("financeiro") && !hasFinanceiroOrg) {
    out.push(
      conflict(
        "604",
        'subnatureza_setorial contém "financeiro" sem "BCB"/"CVM"/"SUSEP" em orgao_regulador',
      ),
    );
  }

  // C6-05: combustiveis sem ANP
  if (sub.includes("combustiveis") && !org.includes("ANP")) {
    out.push(
      conflict("605", 'subnatureza_setorial contém "combustiveis" sem "ANP" em orgao_regulador'),
    );
  }

  // C6-06: transporte sem ANTT/ANTAQ/ANAC
  const hasTransporteOrg =
    org.includes("ANTT") || org.includes("ANTAQ") || org.includes("ANAC");
  if (sub.includes("transporte") && !hasTransporteOrg) {
    out.push(
      conflict(
        "606",
        'subnatureza_setorial contém "transporte" sem "ANTT"/"ANTAQ"/"ANAC" em orgao_regulador',
      ),
    );
  }

  // C6-07: operadora_regulada sem subnatureza (já coberto por missing_required_fields, declarado aqui por completude)
  if (papel === "operadora_regulada" && sub.length === 0) {
    out.push(
      conflict(
        "607",
        'papel_na_cadeia="operadora_regulada" sem subnatureza_setorial declarada',
      ),
    );
  }

  return out;
}

// ─── Função principal — orquestra 6 classes ────────────────────────────────

/**
 * Detecta todos os conflitos lógicos entre dimensões do perfil.
 * Retorna array aditivo (ordem: C1, C2, C3, C4, C5, C6).
 * Mesmo perfil → mesmo array byte-a-byte (I-LC-3).
 */
export function validateConflicts(
  perfil: PerfilForValidation,
  ctx: ConflictContext,
): readonly Blocker[] {
  return [
    ...validateC1(perfil),
    ...validateC2(perfil),
    ...validateC3(perfil, ctx),
    ...validateC4(perfil),
    ...validateC5(perfil),
    ...validateC6(perfil),
  ];
}

/**
 * Helper para extrair o contexto de uma seed.
 */
export function contextFromSeed(seed: Seed): ConflictContext {
  return {
    atua_importacao: seed.atua_importacao,
    atua_exportacao: seed.atua_exportacao,
  };
}
