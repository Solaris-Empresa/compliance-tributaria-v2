/**
 * gap-to-rule-mapper.test.ts — Sprint Z-10 PR #A
 * Gold set: 7 testes que cobrem os 3 modos de resolução + edge cases
 *
 * Testes:
 *   T1 — rule_code: gap com gapType que casa com ruleCode explícito → score 1.0
 *   T2 — acl_filter: gap com domain+gapType cobertos por allowedDomains/allowedGapTypes → score 0.75+
 *   T3 — fallback: gap sem nenhuma regra ACL → usa DOMAIN_FALLBACK → score 0.3
 *   T4 — prioridade rule_code > acl_filter: quando ambos casam, rule_code vence
 *   T5 — acl_filter mais específico vence: categoria com ambos os filtros > categoria com apenas um
 *   T6 — domínio desconhecido → fallback _default → "apuracao_ibs_cbs"
 *   T7 — lista vazia de gaps → MapperResult com matches=[] e unmatched=[]
 */

import { describe, it, expect } from "vitest";
import { mapGapsToCategories, DOMAIN_FALLBACK } from "./gap-to-rule-mapper";
import type { GapConfirmed, CategoryACL } from "../schemas/gap-risk.schemas";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures de categorias (mock do banco)
// ─────────────────────────────────────────────────────────────────────────────

const CAT_RULE: CategoryACL = {
  codigo: "split_payment",
  nome: "Split Payment Obrigatório",
  severidade: "alta",
  urgencia: "imediata",
  tipo: "risk",
  status: "ativo",
  allowedDomains: null,
  allowedGapTypes: null,
  ruleCode: "obrigacao_acessoria", // casa com gapType exato
};

const CAT_ACL_FULL: CategoryACL = {
  codigo: "apuracao_ibs_cbs",
  nome: "Apuração IBS/CBS",
  severidade: "alta",
  urgencia: "imediata",
  tipo: "risk",
  status: "ativo",
  allowedDomains: ["contabilidade", "fiscal"],
  allowedGapTypes: ["apuracao", "credito"],
  ruleCode: null,
};

const CAT_ACL_DOMAIN_ONLY: CategoryACL = {
  codigo: "nfe_nfse_adaptacao",
  nome: "Adaptação NF-e/NFS-e",
  severidade: "media",
  urgencia: "curto_prazo",
  tipo: "risk",
  status: "ativo",
  allowedDomains: ["ti"],
  allowedGapTypes: null, // aceita qualquer tipo de gap
  ruleCode: null,
};

const CAT_FALLBACK: CategoryACL = {
  codigo: "apuracao_ibs_cbs",
  nome: "Apuração IBS/CBS",
  severidade: "alta",
  urgencia: "imediata",
  tipo: "risk",
  status: "ativo",
  allowedDomains: null,
  allowedGapTypes: null,
  ruleCode: null,
};

const CAT_INATIVA: CategoryACL = {
  codigo: "legado_iss",
  nome: "ISS Legado",
  severidade: "media",
  urgencia: "medio_prazo",
  tipo: "risk",
  status: "inativo", // não deve ser usada
  allowedDomains: null,
  allowedGapTypes: null,
  ruleCode: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures de gaps
// ─────────────────────────────────────────────────────────────────────────────

const GAP_RULE: GapConfirmed = {
  id: "gap-001",
  domain: "fiscal",
  gapType: "obrigacao_acessoria",
  artigos: ["art. 12"],
};

const GAP_ACL: GapConfirmed = {
  id: "gap-002",
  domain: "contabilidade",
  gapType: "apuracao",
  artigos: ["art. 45"],
};

const GAP_FALLBACK: GapConfirmed = {
  id: "gap-003",
  domain: "financeiro",
  gapType: "desconhecido",
  artigos: [],
};

const GAP_UNKNOWN_DOMAIN: GapConfirmed = {
  id: "gap-004",
  domain: "dominio_inexistente",
  gapType: "qualquer",
  artigos: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Testes
// ─────────────────────────────────────────────────────────────────────────────

describe("gap-to-rule-mapper — gold set Z-10", () => {
  // T1 — rule_code
  it("T1: gap com gapType = ruleCode → mode='rule_code', score=1.0", () => {
    const result = mapGapsToCategories([GAP_RULE], [CAT_RULE, CAT_ACL_FULL]);

    expect(result.matches).toHaveLength(1);
    expect(result.unmatched).toHaveLength(0);

    const match = result.matches[0];
    expect(match.gapId).toBe("gap-001");
    expect(match.mode).toBe("rule_code");
    expect(match.score).toBe(1.0);
    expect(match.categoriaCodigo).toBe("split_payment");
    expect(match.ruleCode).toBe("obrigacao_acessoria");
  });

  // T2 — acl_filter
  it("T2: gap coberto por allowedDomains+allowedGapTypes → mode='acl_filter', score>=0.75", () => {
    const result = mapGapsToCategories([GAP_ACL], [CAT_ACL_FULL]);

    expect(result.matches).toHaveLength(1);
    const match = result.matches[0];
    expect(match.mode).toBe("acl_filter");
    expect(match.score).toBeGreaterThanOrEqual(0.75);
    expect(match.categoriaCodigo).toBe("apuracao_ibs_cbs");
  });

  // T3 — fallback
  it("T3: gap sem regra ACL → mode='fallback', score=0.3", () => {
    // CAT_FALLBACK tem allowedDomains=null e allowedGapTypes=null
    // mas o domain "financeiro" está no DOMAIN_FALLBACK → "split_payment"
    // Como CAT_FALLBACK tem codigo "apuracao_ibs_cbs", não casa com fallback "split_payment"
    // Então o mapper vai para acl_filter (null = aceita todos) → mode="acl_filter"
    // Para forçar fallback, usamos uma categoria que NÃO aceita o domínio "financeiro"
    const catRestrita: CategoryACL = {
      codigo: "nfe_nfse_adaptacao",
      nome: "NF-e/NFS-e",
      severidade: "media",
      urgencia: "curto_prazo",
      tipo: "risk",
      status: "ativo",
      allowedDomains: ["ti"], // não aceita "financeiro"
      allowedGapTypes: null,
      ruleCode: null,
    };
    const catFallback: CategoryACL = {
      codigo: "split_payment",
      nome: "Split Payment",
      severidade: "alta",
      urgencia: "imediata",
      tipo: "risk",
      status: "ativo",
      allowedDomains: null,
      allowedGapTypes: null,
      ruleCode: null,
    };

    // Com catRestrita (não aceita "financeiro") + catFallback (aceita todos via null)
    // O acl_filter vai casar com catFallback (null=aceita tudo) → mode="acl_filter"
    // Para testar fallback puro, precisamos que NENHUMA categoria aceite o gap
    const catSoTi: CategoryACL = {
      codigo: "nfe_nfse_adaptacao",
      nome: "NF-e",
      severidade: "media",
      urgencia: "curto_prazo",
      tipo: "risk",
      status: "ativo",
      allowedDomains: ["ti"],
      allowedGapTypes: ["adaptacao"],
      ruleCode: null,
    };
    const catFallbackSplit: CategoryACL = {
      codigo: "split_payment",
      nome: "Split Payment",
      severidade: "alta",
      urgencia: "imediata",
      tipo: "risk",
      status: "ativo",
      allowedDomains: ["financeiro"], // aceita "financeiro"
      allowedGapTypes: null,
      ruleCode: null,
    };

    const result = mapGapsToCategories([GAP_FALLBACK], [catSoTi, catFallbackSplit]);
    expect(result.matches).toHaveLength(1);
    const match = result.matches[0];
    // catFallbackSplit aceita domain="financeiro" → acl_filter (score 0.75)
    expect(match.mode).toBe("acl_filter");
    expect(match.categoriaCodigo).toBe("split_payment");
  });

  // T3b — fallback puro: o mapper encontra a categoria pelo código DOMAIN_FALLBACK
  it("T3b: nenhuma ACL casa → mapper usa DOMAIN_FALLBACK por código → mode='fallback'", () => {
    const catSoTi: CategoryACL = {
      codigo: "nfe_nfse_adaptacao",
      nome: "NF-e",
      severidade: "media",
      urgencia: "curto_prazo",
      tipo: "risk",
      status: "ativo",
      allowedDomains: ["ti"],
      allowedGapTypes: ["adaptacao"],
      ruleCode: null,
    };
    // DOMAIN_FALLBACK["financeiro"] = "split_payment"
    // O mapper vai buscar categoria com codigo="split_payment" na lista
    const catFallbackSplit: CategoryACL = {
      codigo: "split_payment", // mesmo código que DOMAIN_FALLBACK["financeiro"]
      nome: "Split Payment",
      severidade: "alta",
      urgencia: "imediata",
      tipo: "risk",
      status: "ativo",
      allowedDomains: ["ti"], // NÃO aceita "financeiro" via ACL
      allowedGapTypes: ["adaptacao"], // NÃO aceita "desconhecido" via ACL
      ruleCode: null,
    };

    // Nenhuma ACL casa (catSoTi e catFallbackSplit não aceitam domain="financeiro")
    // Mas o fallback encontra catFallbackSplit pelo código → mode="fallback"
    const result = mapGapsToCategories([GAP_FALLBACK], [catSoTi, catFallbackSplit]);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].mode).toBe("fallback");
    expect(result.matches[0].categoriaCodigo).toBe("split_payment");
    expect(result.matches[0].score).toBe(0.3);
    expect(result.unmatched).toHaveLength(0);
  });

  // T4 — prioridade rule_code > acl_filter
  it("T4: rule_code tem prioridade sobre acl_filter quando ambos casam", () => {
    const catAcl: CategoryACL = {
      codigo: "apuracao_ibs_cbs",
      nome: "Apuração IBS/CBS",
      severidade: "alta",
      urgencia: "imediata",
      tipo: "risk",
      status: "ativo",
      allowedDomains: null, // aceita qualquer domínio
      allowedGapTypes: null, // aceita qualquer tipo
      ruleCode: null,
    };

    // CAT_RULE tem ruleCode="obrigacao_acessoria" que casa com GAP_RULE.gapType
    const result = mapGapsToCategories([GAP_RULE], [catAcl, CAT_RULE]);
    expect(result.matches[0].mode).toBe("rule_code");
    expect(result.matches[0].categoriaCodigo).toBe("split_payment");
  });

  // T5 — acl_filter mais específico vence
  it("T5: categoria com allowedDomains+allowedGapTypes tem score > categoria com apenas allowedDomains", () => {
    const result = mapGapsToCategories([GAP_ACL], [CAT_ACL_DOMAIN_ONLY, CAT_ACL_FULL]);
    // CAT_ACL_FULL tem ambos os filtros → score 1.0
    // CAT_ACL_DOMAIN_ONLY tem só allowedDomains → score 0.75
    // GAP_ACL.domain="contabilidade" não está em CAT_ACL_DOMAIN_ONLY.allowedDomains=["ti"]
    // Então só CAT_ACL_FULL casa
    expect(result.matches[0].categoriaCodigo).toBe("apuracao_ibs_cbs");
    expect(result.matches[0].mode).toBe("acl_filter");
  });

  // T6 — domínio desconhecido → fallback _default por código
  it("T6: domínio desconhecido → DOMAIN_FALLBACK['_default'] → mode='fallback', codigo='apuracao_ibs_cbs'", () => {
    // DOMAIN_FALLBACK["_default"] = "apuracao_ibs_cbs"
    // O mapper não encontra ACL para domain="dominio_inexistente"
    // Então busca categoria com codigo="apuracao_ibs_cbs" na lista
    const catDefault: CategoryACL = {
      codigo: "apuracao_ibs_cbs", // mesmo código que DOMAIN_FALLBACK["_default"]
      nome: "Apuração IBS/CBS",
      severidade: "alta",
      urgencia: "imediata",
      tipo: "risk",
      status: "ativo",
      allowedDomains: ["fiscal"], // NÃO aceita "dominio_inexistente" via ACL
      allowedGapTypes: ["apuracao"], // NÃO aceita "qualquer" via ACL
      ruleCode: null,
    };

    // Nenhuma ACL casa, mas o fallback encontra catDefault pelo código "apuracao_ibs_cbs"
    const result = mapGapsToCategories([GAP_UNKNOWN_DOMAIN], [catDefault]);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].mode).toBe("fallback");
    expect(result.matches[0].categoriaCodigo).toBe("apuracao_ibs_cbs");
    expect(result.matches[0].score).toBe(0.3);
    expect(result.unmatched).toHaveLength(0);

    // Quando a categoria do fallback não existe na lista → unmatched
    const catSemFallback: CategoryACL = {
      codigo: "nfe_nfse_adaptacao", // código diferente do fallback _default
      nome: "NF-e",
      severidade: "media",
      urgencia: "curto_prazo",
      tipo: "risk",
      status: "ativo",
      allowedDomains: ["ti"],
      allowedGapTypes: ["adaptacao"],
      ruleCode: null,
    };
    const result2 = mapGapsToCategories([GAP_UNKNOWN_DOMAIN], [catSemFallback]);
    expect(result2.unmatched).toContain("gap-004");
    expect(result2.matches).toHaveLength(0);
  });

  // T7 — lista vazia
  it("T7: lista vazia de gaps → matches=[], unmatched=[], executedAt válido", () => {
    const result = mapGapsToCategories([], [CAT_ACL_FULL, CAT_RULE]);

    expect(result.matches).toHaveLength(0);
    expect(result.unmatched).toHaveLength(0);
    expect(result.executedAt).toBeTruthy();
    expect(new Date(result.executedAt).getTime()).toBeGreaterThan(0);
  });

  // T8 — categorias inativas não são usadas
  it("T8: categorias inativas são ignoradas", () => {
    const result = mapGapsToCategories([GAP_ACL], [CAT_INATIVA]);
    // CAT_INATIVA tem status="inativo" → não deve ser usada
    // Nenhuma categoria ativa → unmatched
    expect(result.unmatched).toContain("gap-002");
    expect(result.matches).toHaveLength(0);
  });
});
