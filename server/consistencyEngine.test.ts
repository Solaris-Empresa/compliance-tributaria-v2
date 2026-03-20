/**
 * Testes vitest — Consistency Engine v2.2
 * Cobertura: regras determinísticas, classificação, gate obrigatório
 */

import { describe, it, expect } from "vitest";

// ─── Tipos (replicados do consistencyEngine.ts para testes isolados) ──────────

type ConsistencyFinding = {
  rule: string;
  severity: "critical" | "high" | "medium" | "low";
  field?: string;
  message: string;
  suggestion?: string;
};

type ConsistencyStatus = "clean" | "has_issues" | "critical";

// ─── Lógica pura extraída para testes ────────────────────────────────────────

function classifyConsistencyStatus(findings: ConsistencyFinding[]): ConsistencyStatus {
  if (findings.length === 0) return "clean";
  const hasCritical = findings.some((f) => f.severity === "critical");
  if (hasCritical) return "critical";
  return "has_issues";
}

function canProceedFromGate(
  status: ConsistencyStatus,
  acceptedRisk: boolean
): { canProceed: boolean; reason: string } {
  if (status === "clean") return { canProceed: true, reason: "no_issues" };
  if (status === "critical" && !acceptedRisk) {
    return { canProceed: false, reason: "critical_unresolved" };
  }
  if (status === "critical" && acceptedRisk) {
    return { canProceed: true, reason: "risk_accepted" };
  }
  // has_issues sem críticos — pode prosseguir
  return { canProceed: true, reason: "minor_issues_only" };
}

function applyDeterministicRules(profile: {
  cnpj?: string;
  razaoSocial?: string;
  cnaePrincipal?: string;
  regimeTributario?: string;
  faturamentoAnual?: number;
  dataConstituicao?: string;
}): ConsistencyFinding[] {
  const findings: ConsistencyFinding[] = [];

  // Regra 1: CNPJ obrigatório
  if (!profile.cnpj || profile.cnpj.replace(/\D/g, "").length !== 14) {
    findings.push({
      rule: "cnpj_invalido",
      severity: "critical",
      field: "cnpj",
      message: "CNPJ inválido ou ausente.",
      suggestion: "Informe o CNPJ com 14 dígitos.",
    });
  }

  // Regra 2: Razão social obrigatória
  if (!profile.razaoSocial || profile.razaoSocial.trim().length < 3) {
    findings.push({
      rule: "razao_social_ausente",
      severity: "critical",
      field: "razaoSocial",
      message: "Razão social ausente ou muito curta.",
      suggestion: "Informe a razão social completa da empresa.",
    });
  }

  // Regra 3: CNAE principal obrigatório
  if (!profile.cnaePrincipal) {
    findings.push({
      rule: "cnae_ausente",
      severity: "high",
      field: "cnaePrincipal",
      message: "CNAE principal não informado.",
      suggestion: "Informe o CNAE principal para identificar os requisitos tributários aplicáveis.",
    });
  }

  // Regra 4: Regime tributário obrigatório
  if (!profile.regimeTributario) {
    findings.push({
      rule: "regime_tributario_ausente",
      severity: "high",
      field: "regimeTributario",
      message: "Regime tributário não informado.",
      suggestion: "Informe o regime tributário (Simples Nacional, Lucro Presumido, Lucro Real).",
    });
  }

  // Regra 5: Faturamento inconsistente com Simples Nacional
  if (
    profile.regimeTributario === "simples_nacional" &&
    profile.faturamentoAnual &&
    profile.faturamentoAnual > 4800000
  ) {
    findings.push({
      rule: "simples_nacional_limite_excedido",
      severity: "critical",
      field: "faturamentoAnual",
      message: `Faturamento anual (R$ ${profile.faturamentoAnual.toLocaleString("pt-BR")}) excede o limite do Simples Nacional (R$ 4.800.000).`,
      suggestion: "Verifique o regime tributário — empresa pode estar enquadrada incorretamente.",
    });
  }

  // Regra 6: Data de constituição futura
  if (profile.dataConstituicao) {
    const dataConst = new Date(profile.dataConstituicao);
    if (dataConst > new Date()) {
      findings.push({
        rule: "data_constituicao_futura",
        severity: "medium",
        field: "dataConstituicao",
        message: "Data de constituição está no futuro.",
        suggestion: "Verifique a data de constituição da empresa.",
      });
    }
  }

  return findings;
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("ConsistencyEngine — Regras Determinísticas", () => {
  it("perfil completo e válido → sem findings", () => {
    const findings = applyDeterministicRules({
      cnpj: "11222333000181",
      razaoSocial: "Empresa Teste Ltda",
      cnaePrincipal: "6201-5/00",
      regimeTributario: "lucro_presumido",
      faturamentoAnual: 2000000,
      dataConstituicao: "2010-01-15",
    });
    expect(findings).toHaveLength(0);
  });

  it("CNPJ ausente → finding critical cnpj_invalido", () => {
    const findings = applyDeterministicRules({
      razaoSocial: "Empresa Teste Ltda",
      cnaePrincipal: "6201-5/00",
      regimeTributario: "lucro_presumido",
    });
    const cnpjFinding = findings.find((f) => f.rule === "cnpj_invalido");
    expect(cnpjFinding).toBeDefined();
    expect(cnpjFinding?.severity).toBe("critical");
  });

  it("CNPJ com menos de 14 dígitos → finding critical", () => {
    const findings = applyDeterministicRules({
      cnpj: "1122333",
      razaoSocial: "Empresa Teste Ltda",
      cnaePrincipal: "6201-5/00",
      regimeTributario: "lucro_real",
    });
    const cnpjFinding = findings.find((f) => f.rule === "cnpj_invalido");
    expect(cnpjFinding).toBeDefined();
    expect(cnpjFinding?.severity).toBe("critical");
  });

  it("razão social ausente → finding critical razao_social_ausente", () => {
    const findings = applyDeterministicRules({
      cnpj: "11222333000181",
      cnaePrincipal: "6201-5/00",
      regimeTributario: "lucro_presumido",
    });
    const finding = findings.find((f) => f.rule === "razao_social_ausente");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("critical");
  });

  it("CNAE ausente → finding high cnae_ausente", () => {
    const findings = applyDeterministicRules({
      cnpj: "11222333000181",
      razaoSocial: "Empresa Teste Ltda",
      regimeTributario: "lucro_presumido",
    });
    const finding = findings.find((f) => f.rule === "cnae_ausente");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("high");
  });

  it("regime tributário ausente → finding high", () => {
    const findings = applyDeterministicRules({
      cnpj: "11222333000181",
      razaoSocial: "Empresa Teste Ltda",
      cnaePrincipal: "6201-5/00",
    });
    const finding = findings.find((f) => f.rule === "regime_tributario_ausente");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("high");
  });

  it("Simples Nacional com faturamento > 4.8M → finding critical", () => {
    const findings = applyDeterministicRules({
      cnpj: "11222333000181",
      razaoSocial: "Empresa Grande Ltda",
      cnaePrincipal: "6201-5/00",
      regimeTributario: "simples_nacional",
      faturamentoAnual: 6000000,
    });
    const finding = findings.find((f) => f.rule === "simples_nacional_limite_excedido");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("critical");
  });

  it("Simples Nacional com faturamento <= 4.8M → sem finding de limite", () => {
    const findings = applyDeterministicRules({
      cnpj: "11222333000181",
      razaoSocial: "Empresa Pequena Ltda",
      cnaePrincipal: "6201-5/00",
      regimeTributario: "simples_nacional",
      faturamentoAnual: 3000000,
    });
    const finding = findings.find((f) => f.rule === "simples_nacional_limite_excedido");
    expect(finding).toBeUndefined();
  });

  it("data de constituição futura → finding medium", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const findings = applyDeterministicRules({
      cnpj: "11222333000181",
      razaoSocial: "Empresa Futura Ltda",
      cnaePrincipal: "6201-5/00",
      regimeTributario: "lucro_presumido",
      dataConstituicao: futureDate.toISOString().split("T")[0],
    });
    const finding = findings.find((f) => f.rule === "data_constituicao_futura");
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe("medium");
  });
});

describe("ConsistencyEngine — Classificação de Status", () => {
  it("sem findings → status clean", () => {
    expect(classifyConsistencyStatus([])).toBe("clean");
  });

  it("apenas findings low/medium → status has_issues", () => {
    const findings: ConsistencyFinding[] = [
      { rule: "test", severity: "medium", message: "teste" },
      { rule: "test2", severity: "low", message: "teste2" },
    ];
    expect(classifyConsistencyStatus(findings)).toBe("has_issues");
  });

  it("finding critical → status critical", () => {
    const findings: ConsistencyFinding[] = [
      { rule: "cnpj_invalido", severity: "critical", message: "CNPJ inválido" },
    ];
    expect(classifyConsistencyStatus(findings)).toBe("critical");
  });

  it("mix de severidades com critical → status critical", () => {
    const findings: ConsistencyFinding[] = [
      { rule: "test_low", severity: "low", message: "baixo" },
      { rule: "test_critical", severity: "critical", message: "crítico" },
      { rule: "test_medium", severity: "medium", message: "médio" },
    ];
    expect(classifyConsistencyStatus(findings)).toBe("critical");
  });
});

describe("ConsistencyEngine — Gate Obrigatório", () => {
  it("status clean → canProceed=true, reason=no_issues", () => {
    const result = canProceedFromGate("clean", false);
    expect(result.canProceed).toBe(true);
    expect(result.reason).toBe("no_issues");
  });

  it("status critical sem aceite de risco → canProceed=false", () => {
    const result = canProceedFromGate("critical", false);
    expect(result.canProceed).toBe(false);
    expect(result.reason).toBe("critical_unresolved");
  });

  it("status critical com aceite de risco → canProceed=true", () => {
    const result = canProceedFromGate("critical", true);
    expect(result.canProceed).toBe(true);
    expect(result.reason).toBe("risk_accepted");
  });

  it("status has_issues sem críticos → canProceed=true", () => {
    const result = canProceedFromGate("has_issues", false);
    expect(result.canProceed).toBe(true);
    expect(result.reason).toBe("minor_issues_only");
  });
});

describe("ConsistencyEngine — Cenários de Borda", () => {
  it("perfil completamente vazio → múltiplos findings críticos", () => {
    const findings = applyDeterministicRules({});
    const criticals = findings.filter((f) => f.severity === "critical");
    expect(criticals.length).toBeGreaterThanOrEqual(2); // cnpj + razaoSocial
  });

  it("CNPJ com formatação (pontos e traços) → válido se 14 dígitos", () => {
    const findings = applyDeterministicRules({
      cnpj: "11.222.333/0001-81", // 14 dígitos após remover não-numéricos
      razaoSocial: "Empresa Formatada Ltda",
      cnaePrincipal: "6201-5/00",
      regimeTributario: "lucro_real",
    });
    const cnpjFinding = findings.find((f) => f.rule === "cnpj_invalido");
    expect(cnpjFinding).toBeUndefined(); // CNPJ formatado é válido
  });

  it("Lucro Real com faturamento alto → sem finding de limite", () => {
    const findings = applyDeterministicRules({
      cnpj: "11222333000181",
      razaoSocial: "Empresa Grande SA",
      cnaePrincipal: "6201-5/00",
      regimeTributario: "lucro_real",
      faturamentoAnual: 50000000,
    });
    const finding = findings.find((f) => f.rule === "simples_nacional_limite_excedido");
    expect(finding).toBeUndefined();
  });
});
