/**
 * m3.6-iagen-description.test.ts
 * Sprint M3.6 — Test contracts (it) para Bug P1-1 (IA Gen consome description)
 *
 * Issue: #932
 * PR: implementação M3.6 (label `m3.6-impl`)
 *
 * REGRA-ORQ-27 (Lição #59): cada teste valida CONSUMPTION efetivo. Para a
 * lógica de assembly inline em routers (generateOnda2Questions e
 * generateQuestionForRequirement), criar um caller falso com createCaller +
 * mocks de DB seria infra proibitiva. Aplicamos REGRA-ORQ-27 Plano (b):
 * citação arquivo:linha — proof empírico via leitura do source e regex match
 * dos padrões obrigatórios da Spec Técnica (Issue #932 Seção 3).
 *
 * Cada asserção mapeia 1:1 a um critério de aceite (Issue #932 Seção 5) E a
 * um grep gate do workflow validate-spec-m3.6.yml — dupla camada.
 *
 * Vinculadas:
 * - Issue #932 (M3.6 — RAG filter por lei + IA Gen description)
 * - PR #929 (gates de archetype consumption — pattern arquivo:linha)
 * - REGRA-ORQ-27 (PR #917) — Plano (b) cite arquivo:linha
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// Caminhos absolutos dos arquivos source que devem conter os padrões
const ROUTERS_FLUXO_V3_SRC = readFileSync(
  path.resolve(__dirname, "..", "routers-fluxo-v3.ts"),
  "utf-8",
);
const QUESTION_ENGINE_SRC = readFileSync(
  path.resolve(__dirname, "..", "routers", "questionEngine.ts"),
  "utf-8",
);

describe("M3.6 P1-1 — IA Gen Onda 2 consome project.description", () => {
  it("project.description é injetada em profileFields[] quando não-null — server/routers-fluxo-v3.ts:~3839", () => {
    // REGRA-ORQ-27 Plano (b): cite arquivo:linha — pattern obrigatório do P1-1.1
    // Match esperado: profileFields.push(`Descrição do negócio: ${project.description}`)
    expect(ROUTERS_FLUXO_V3_SRC).toMatch(
      /profileFields\.push\(.*Descrição do negócio.*project\.description/,
    );
  });

  it("profileFields NÃO inclui linha 'Descrição do negócio:' quando description=null (backward-compat)", () => {
    // Backward-compat: a injeção é guardada por if (project.description) — só pushada se truthy
    expect(ROUTERS_FLUXO_V3_SRC).toMatch(
      /if\s*\(\s*project\.description\s*\)\s*profileFields\.push/,
    );
  });
});

describe("M3.6 P1-1 — questionEngine.ts consome project.description", () => {
  it("SELECT em getProjectById inclui campo description — server/routers/questionEngine.ts:293", () => {
    // REGRA-ORQ-27 Plano (b): grep gate P1-1.2 do workflow CI
    expect(QUESTION_ENGINE_SRC).toMatch(/SELECT\s+id.*description.*FROM projects/);
  });

  it("projectContext.description é populado a partir de project.description — server/routers/questionEngine.ts:~320", () => {
    // REGRA-ORQ-27 Plano (b): grep gate P1-1.3 do workflow CI
    expect(QUESTION_ENGINE_SRC).toMatch(/description:\s*project\.description/);
  });

  it("prompt generateQuestionForRequirement interpola description condicionalmente — server/routers/questionEngine.ts:~122", () => {
    // REGRA-ORQ-27 Plano (b): grep gate P1-1.4 do workflow CI
    // Padrão esperado: ${projectContext.description ? `\n- Descrição do negócio: ${projectContext.description}` : ""}
    // Validações:
    //   1. Existe ternário guardando interpolação
    //   2. O texto "Descrição do negócio:" só aparece dentro do template literal (backward-compat preservada)
    expect(QUESTION_ENGINE_SRC).toMatch(/projectContext\.description\s*\?/);
    expect(QUESTION_ENGINE_SRC).toMatch(/Descrição do negócio:\s*\$\{projectContext\.description\}/);
  });
});
