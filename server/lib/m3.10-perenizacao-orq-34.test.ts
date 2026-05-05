/**
 * m3.10-perenizacao-orq-34.test.ts
 * Sprint M3.10 — Perenização das técnicas em REGRA-ORQ-34 + Lições #67 e #68
 *
 * Contexto: 4 fixes consecutivos para o mesmo bug arquitetural ("matriz
 * mono-fonte") expuseram que técnicas críticas (greenfield, dry-run, DoD com
 * critério negativo, 3 cenários) estavam apenas em post-mortem de sprint —
 * não em REGRAs ORQ perenes. Próxima sprint poderia "esquecer" essas técnicas
 * e repetir o ciclo de reincidência.
 *
 * Esta perenização consolida em REGRA-ORQ-34 (Pipeline de Dados Bugfix
 * Protocol) os 4 protocolos obrigatórios + Lições #67 (try/catch graceful) e
 * #68 (coluna mono + JSON multi).
 *
 * Validação: source-static do governance.md confirma presença das seções e
 * conteúdo crítico.
 *
 * Vinculadas:
 * - PR #979 (Fix C-bis — caso canônico)
 * - Post-mortem #975
 * - Sprint M3.10
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const GOVERNANCE_SRC = readFileSync(
  path.resolve(__dirname, "../../.claude/rules/governance.md"),
  "utf-8",
);

// ---------------------------------------------------------------------------
// REGRA-ORQ-34 — Pipeline de Dados Bugfix Protocol
// ---------------------------------------------------------------------------
describe("M3.10 Perenização — REGRA-ORQ-34 está em governance.md", () => {
  it("REGRA-ORQ-34 declarada com título correto", () => {
    expect(GOVERNANCE_SRC).toMatch(
      /## REGRA-ORQ-34 — Pipeline de Dados Bugfix Protocol/,
    );
  });

  it("REGRA-ORQ-34 declara vigência permanente a partir de 2026-05-05", () => {
    expect(GOVERNANCE_SRC).toMatch(
      /REGRA-ORQ-34[\s\S]{0,500}Vigência:\s*permanente,\s*a\s*partir\s*de\s*2026-05-05/,
    );
  });

  it("REGRA-ORQ-34 origem em Sprint M3.10 com 4 fixes consecutivos", () => {
    expect(GOVERNANCE_SRC).toMatch(
      /REGRA-ORQ-34[\s\S]{0,800}4 fixes consecutivos/,
    );
  });

  it("REGRA-ORQ-34 lista os 4 PRs canônicos (#968, #973, #976/#977, #979)", () => {
    const block = GOVERNANCE_SRC.match(
      /## REGRA-ORQ-34[\s\S]+?(?=\n## )/,
    );
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/#968/);
    expect(block![0]).toMatch(/#973/);
    expect(block![0]).toMatch(/#976/);
    expect(block![0]).toMatch(/#977/);
    expect(block![0]).toMatch(/#979/);
  });

  it("Protocolo 1 (Greenfield) declarado", () => {
    expect(GOVERNANCE_SRC).toMatch(
      /Protocolo 1\s*—\s*Validação Greenfield Obrigatória/,
    );
  });

  it("Protocolo 1 define greenfield como projeto pós-deploy", () => {
    const block = GOVERNANCE_SRC.match(
      /Protocolo 1[\s\S]+?Protocolo 2/,
    );
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/projeto criado APÓS o deploy/);
    expect(block![0]).toMatch(/created_at/);
  });

  it("Protocolo 2 (Dry-run) declarado para bugs recorrentes", () => {
    expect(GOVERNANCE_SRC).toMatch(
      /Protocolo 2\s*—\s*Dry-run pré-implementação para bugs recorrentes/,
    );
  });

  it("Protocolo 2 define bug recorrente com 2+ PRs prévios", () => {
    const block = GOVERNANCE_SRC.match(
      /Protocolo 2[\s\S]+?Protocolo 3/,
    );
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/2\+\s*PRs?\s*de\s*fix\s*prévios/);
    expect(block![0]).toMatch(/incident-recurrent/);
  });

  it("Protocolo 3 (DoD com critério NEGATIVO) declarado", () => {
    expect(GOVERNANCE_SRC).toMatch(
      /Protocolo 3\s*—\s*DoD com critério NEGATIVO SQL bloqueante/,
    );
  });

  it("Protocolo 3 exige critérios POSITIVO + NEGATIVO com SQL", () => {
    const block = GOVERNANCE_SRC.match(
      /Protocolo 3[\s\S]+?Protocolo 4/,
    );
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/POSITIVO/);
    expect(block![0]).toMatch(/NEGATIVO/);
    expect(block![0]).toMatch(/SQL/);
    expect(block![0]).toMatch(/0 linhas/);
  });

  it("Protocolo 4 (3 cenários) declarado", () => {
    expect(GOVERNANCE_SRC).toMatch(
      /Protocolo 4\s*—\s*Validação em 3 cenários ortogonais/,
    );
  });

  it("Protocolo 4 lista os 3 cenários (greenfield + pré-existente + edge)", () => {
    const block = GOVERNANCE_SRC.match(
      /Protocolo 4[\s\S]+?(?=###\s*Consequências)/,
    );
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/Greenfield/);
    expect(block![0]).toMatch(/Pré-existente/);
    expect(block![0]).toMatch(/Edge case/);
  });

  it("Consequências de violação declaradas", () => {
    const block = GOVERNANCE_SRC.match(
      /## REGRA-ORQ-34[\s\S]+?(?=\n## )/,
    );
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/### Consequências/);
    expect(block![0]).toMatch(/validate-pr/);
    expect(block![0]).toMatch(/revert obrigatório/);
  });

  it("Exceções declaradas (Hotfix P0, mudanças triviais, docs-only)", () => {
    const block = GOVERNANCE_SRC.match(
      /## REGRA-ORQ-34[\s\S]+?(?=\n## )/,
    );
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/### Exceções/);
    expect(block![0]).toMatch(/Hotfix P0/);
    expect(block![0]).toMatch(/Mudanças triviais/);
    expect(block![0]).toMatch(/Docs-only/);
  });

  it("Vinculadas inclui REGRA-ORQ-19, ORQ-20, ORQ-27, ORQ-28, ORQ-33", () => {
    const block = GOVERNANCE_SRC.match(
      /## REGRA-ORQ-34[\s\S]+?(?=\n## )/,
    );
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/REGRA-ORQ-19/);
    expect(block![0]).toMatch(/REGRA-ORQ-20/);
    expect(block![0]).toMatch(/REGRA-ORQ-27/);
    expect(block![0]).toMatch(/REGRA-ORQ-28/);
    expect(block![0]).toMatch(/REGRA-ORQ-33/);
  });

  it("Vinculadas inclui Lições #59, #62-#68", () => {
    const block = GOVERNANCE_SRC.match(
      /## REGRA-ORQ-34[\s\S]+?(?=\n## )/,
    );
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/Lição\s*#59/);
    expect(block![0]).toMatch(/#65/);
    expect(block![0]).toMatch(/#66/);
    expect(block![0]).toMatch(/#67/);
    expect(block![0]).toMatch(/#68/);
  });
});

// ---------------------------------------------------------------------------
// Lição #67 — Try/catch + degradação graciosa
// ---------------------------------------------------------------------------
describe("M3.10 Perenização — Lição #67 está em governance.md", () => {
  it("Lição #67 declarada com título correto", () => {
    expect(GOVERNANCE_SRC).toMatch(
      /## Lição #67 — Try\/catch \+ degradação graciosa em sequências assíncronas/,
    );
  });

  it("Lição #67 origem em Sprint M3.10 Fix C-bis (PR #979)", () => {
    expect(GOVERNANCE_SRC).toMatch(
      /Lição #67[\s\S]{0,500}Sprint M3\.10 Fix C-bis[\s\S]{0,200}PR #979/,
    );
  });

  it("Lição #67 declara o pattern obrigatório (try/catch + console.warn + Step2)", () => {
    const block = GOVERNANCE_SRC.match(
      /## Lição #67[\s\S]+?(?=\n## Lição|\n## REGRA)/,
    );
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/try\s*\{/);
    expect(block![0]).toMatch(/catch\s*\(\s*err\s*\)/);
    expect(block![0]).toMatch(/console\.warn/);
    expect(block![0]).toMatch(/Não relança/);
  });

  it("Lição #67 declara as 2 perguntas-chave para decidir aplicar", () => {
    const block = GOVERNANCE_SRC.match(
      /## Lição #67[\s\S]+?(?=\n## Lição|\n## REGRA)/,
    );
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/Step1 pode falhar de forma recuperável\?/);
    expect(block![0]).toMatch(/Step2 pode operar sem o resultado de Step1\?/);
  });

  it("Lição #67 caso canônico: ensureV1GapsMutation + generateAllSourcesMutation", () => {
    const block = GOVERNANCE_SRC.match(
      /## Lição #67[\s\S]+?(?=\n## Lição|\n## REGRA)/,
    );
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/ensureV1GapsMutation/);
    expect(block![0]).toMatch(/generateAllSourcesMutation/);
  });
});

// ---------------------------------------------------------------------------
// Lição #68 — Coluna mono-valor + JSON multi-valor
// ---------------------------------------------------------------------------
describe("M3.10 Perenização — Lição #68 está em governance.md", () => {
  it("Lição #68 declarada com título correto", () => {
    expect(GOVERNANCE_SRC).toMatch(
      /## Lição #68 — Coluna mono-valor \+ JSON multi-valor: ler do JSON na UI/,
    );
  });

  it("Lição #68 origem em Sprint M3.10 Fix C-bis (PR #979)", () => {
    expect(GOVERNANCE_SRC).toMatch(
      /Lição #68[\s\S]{0,500}Sprint M3\.10 Fix C-bis[\s\S]{0,300}PR #979/,
    );
  });

  it("Lição #68 caso canônico: source_priority + evidence.gaps", () => {
    const block = GOVERNANCE_SRC.match(
      /## Lição #68[\s\S]+?(?=\n## Lição|\n## REGRA|$)/,
    );
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/risks_v4\.source_priority/);
    expect(block![0]).toMatch(/evidence\.gaps\[\*\]\.fonte/);
  });

  it("Lição #68 declara o pattern obrigatório (helper com fallbacks)", () => {
    const block = GOVERNANCE_SRC.match(
      /## Lição #68[\s\S]+?(?=\n## Lição|\n## REGRA|$)/,
    );
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/getMultiValueField/);
    expect(block![0]).toMatch(/fallback/i);
    expect(block![0]).toMatch(/dedup/i);
  });

  it("Lição #68 declara aplicação prospectiva (3 perguntas + grep check)", () => {
    const block = GOVERNANCE_SRC.match(
      /## Lição #68[\s\S]+?(?=\n## Lição|\n## REGRA|$)/,
    );
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/Há JSON correlato/);
    expect(block![0]).toMatch(/grep -r/);
  });
});

// ---------------------------------------------------------------------------
// Integridade — REGRAs ORQ pré-existentes preservadas
// ---------------------------------------------------------------------------
describe("M3.10 Perenização — REGRAs ORQ pré-existentes intactas", () => {
  const REGRAS_PRE_EXISTENTES = [
    "REGRA-ORQ-19",
    "REGRA-ORQ-20",
    "REGRA-ORQ-27",
    "REGRA-ORQ-28",
    "REGRA-ORQ-33",
  ];

  it.each(REGRAS_PRE_EXISTENTES)(
    "REGRA %s permanece declarada (não removida pela perenização)",
    (regra) => {
      expect(GOVERNANCE_SRC).toMatch(new RegExp(`## ${regra}\\b`));
    },
  );

  const LICOES_PRE_EXISTENTES = [
    "#62", "#63", "#64", "#65", "#66",
  ];

  it.each(LICOES_PRE_EXISTENTES)(
    "Lição %s permanece declarada (não removida pela perenização)",
    (licao) => {
      expect(GOVERNANCE_SRC).toMatch(new RegExp(`## Lição ${licao}\\b`));
    },
  );
});
