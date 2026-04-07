/**
 * bug-manual-04-02-stepper-wiring.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Testes de regressão para:
 *   BUG-MANUAL-04: labels legados "Questionário Corporativo" / "Questionário Operacional"
 *                  ainda visíveis no DiagnosticoStepper após Z-02
 *   BUG-MANUAL-02 remainder: wiring onStartLayer → rotas legadas (/questionario-corporativo-v2,
 *                  /questionario-operacional) em vez das novas (/questionario-produto, /questionario-servico)
 *
 * Referência: ADR-0010 (Z-02 TO-BE), DIV-Z02-003 (valores em português)
 * Aprovação P.O.: 2026-04-07
 */

import { describe, it, expect } from "vitest";
import { projectStatusToStepState } from "../../client/src/components/DiagnosticoStepper";

// ─── W01 — Labels não contêm strings legadas ─────────────────────────────────
describe("W01 — DiagnosticoStepper: labels não contêm strings legadas", () => {
  it("label do step 'corporate' não deve ser 'Questionário Corporativo'", async () => {
    // Importar o arquivo e verificar que o label foi atualizado
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve(__dirname, "../../client/src/components/DiagnosticoStepper.tsx"),
      "utf-8"
    );
    // Não deve conter o label legado
    expect(content).not.toContain('label: "Questionário Corporativo"');
    expect(content).not.toContain("label: 'Questionário Corporativo'");
  });

  it("label do step 'operational' não deve ser 'Questionário Operacional'", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve(__dirname, "../../client/src/components/DiagnosticoStepper.tsx"),
      "utf-8"
    );
    expect(content).not.toContain('label: "Questionário Operacional"');
    expect(content).not.toContain("label: 'Questionário Operacional'");
  });
});

// ─── W02 — Labels contêm strings TO-BE ───────────────────────────────────────
describe("W02 — DiagnosticoStepper: labels contêm strings TO-BE (Z-02)", () => {
  it("label do step 'corporate' deve ser 'Q. de Produtos (NCM)'", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve(__dirname, "../../client/src/components/DiagnosticoStepper.tsx"),
      "utf-8"
    );
    expect(content).toContain('label: "Q. de Produtos (NCM)"');
  });

  it("label do step 'operational' deve ser 'Q. de Serviços (NBS)'", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve(__dirname, "../../client/src/components/DiagnosticoStepper.tsx"),
      "utf-8"
    );
    expect(content).toContain('label: "Q. de Serviços (NBS)"');
  });
});

// ─── W03 — Wiring: rotas legadas removidas do ProjetoDetalhesV2 ───────────────
describe("W03 — ProjetoDetalhesV2: rotas legadas removidas do onStartLayer", () => {
  it("não deve navegar para /questionario-corporativo-v2", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve(__dirname, "../../client/src/pages/ProjetoDetalhesV2.tsx"),
      "utf-8"
    );
    expect(content).not.toContain("questionario-corporativo-v2");
  });

  it("não deve navegar para /questionario-operacional via onStartLayer", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve(__dirname, "../../client/src/pages/ProjetoDetalhesV2.tsx"),
      "utf-8"
    );
    // Verifica que a rota legada não está no bloco onStartLayer
    // (pode ainda existir em outros contextos, mas não no callback de layer)
    const onStartLayerMatch = content.match(/onStartLayer=\{[\s\S]*?\}\}/);
    if (onStartLayerMatch) {
      expect(onStartLayerMatch[0]).not.toContain("questionario-operacional");
    }
  });
});

// ─── W04 — Wiring: rotas TO-BE presentes no ProjetoDetalhesV2 ────────────────
describe("W04 — ProjetoDetalhesV2: rotas TO-BE presentes no onStartLayer", () => {
  it("deve navegar para /questionario-produto quando layer='corporate'", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve(__dirname, "../../client/src/pages/ProjetoDetalhesV2.tsx"),
      "utf-8"
    );
    expect(content).toContain("questionario-produto");
  });

  it("deve navegar para /questionario-servico quando layer='operational'", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve(__dirname, "../../client/src/pages/ProjetoDetalhesV2.tsx"),
      "utf-8"
    );
    expect(content).toContain("questionario-servico");
  });
});

// ─── W05 — projectStatusToStepState: q_produto e q_servico mapeados corretamente ─
describe("W05 — projectStatusToStepState: status Z-02 mapeados corretamente", () => {
  it("q_produto → corporate=in_progress, operational=not_started", () => {
    const state = projectStatusToStepState("q_produto");
    expect(state.corporate).toBe("in_progress");
    expect(state.operational).toBe("not_started");
    expect(state.onda1).toBe("completed");
    expect(state.onda2).toBe("completed");
  });

  it("q_servico → corporate=completed, operational=in_progress", () => {
    const state = projectStatusToStepState("q_servico");
    expect(state.corporate).toBe("completed");
    expect(state.operational).toBe("in_progress");
    expect(state.onda1).toBe("completed");
    expect(state.onda2).toBe("completed");
  });
});

// ─── W06 — Condicional DIV-Z02-003: valores em português ─────────────────────
describe("W06 — DIV-Z02-003: condicional usa valores em português", () => {
  it("DiagnosticoStepper não deve usar 'service' ou 'mixed' (inglês) como valores de operationType", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve(__dirname, "../../client/src/components/DiagnosticoStepper.tsx"),
      "utf-8"
    );
    // Não deve ter comparações com valores em inglês
    expect(content).not.toMatch(/operationType.*['"](service|mixed)['"]/);
    expect(content).not.toMatch(/['"](service|mixed)['"].*operationType/);
  });

  it("ProjetoDetalhesV2 não deve usar 'service' ou 'mixed' (inglês) como valores de operationType", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve(__dirname, "../../client/src/pages/ProjetoDetalhesV2.tsx"),
      "utf-8"
    );
    expect(content).not.toMatch(/operationType.*['"](service|mixed)['"]/);
  });
});
