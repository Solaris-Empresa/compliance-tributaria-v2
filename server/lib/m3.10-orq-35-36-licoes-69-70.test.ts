/**
 * m3.10-orq-35-36-licoes-69-70.test.ts
 * Sprint M3.10 Fase 1 — REGRAs ORQ-35 + ORQ-36 + Lições #69 e #70 perenizadas
 *
 * Contexto: Após 4 fixes consecutivos errados em variações do mesmo bug
 * arquitetural ("matriz mono-fonte"), auto-avaliação Claude Code identificou
 * que técnicas críticas de investigação profunda não estavam formalizadas
 * em REGRAs ORQ. Esta Fase 1 perenıza:
 *
 * - REGRA-ORQ-35 (NUNCA ASSUMA — Read Before Write Enforcement com threshold)
 * - REGRA-ORQ-36 (Técnicas de Investigação Profunda T1-T5 com matriz)
 * - Lição #69 (multi-fonte agregado vs multi-fonte por risco)
 * - Lição #70 (assimetria auth em procedures aparentemente similares)
 *
 * Honestidade explícita: REGRA-ORQ-35 é declarativa em Fase 1.
 * Enforcement mecânico real virá em Fase 3 via Hook PreToolUse.
 *
 * Validação: source-static do governance.md confirma presença das seções
 * e conteúdo crítico. Tests de integridade garantem que perenizações
 * anteriores (REGRAs ORQ-19/20/27/28/33/34 + Lições #59/#62-#68) permanecem.
 *
 * Vinculadas:
 * - PR #980 (perenização anterior — REGRA-ORQ-34 + Lições #67 + #68)
 * - Decisão P.O./Manus 2026-05-05 (Opção A — Full Implementation em 4 fases)
 * - Sprint M3.10 (caso canônico)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const GOVERNANCE_SRC = readFileSync(
  path.resolve(__dirname, "../../.claude/rules/governance.md"),
  "utf-8",
);

// ---------------------------------------------------------------------------
// REGRA-ORQ-35 — NUNCA ASSUMA
// ---------------------------------------------------------------------------
describe("M3.10 Fase 1 — REGRA-ORQ-35 está em governance.md", () => {
  it("REGRA-ORQ-35 declarada com título correto", () => {
    expect(GOVERNANCE_SRC).toMatch(
      /## REGRA-ORQ-35 — NUNCA ASSUMA \(Read Before Write Enforcement\)/,
    );
  });

  it("REGRA-ORQ-35 declara vigência permanente a partir de 2026-05-05", () => {
    expect(GOVERNANCE_SRC).toMatch(
      /REGRA-ORQ-35[\s\S]{0,500}Vigência:\s*permanente,\s*a\s*partir\s*de\s*2026-05-05/,
    );
  });

  it("REGRA-ORQ-35 declara POSIÇÃO de prioridade sobre velocidade", () => {
    const block = GOVERNANCE_SRC.match(/## REGRA-ORQ-35[\s\S]+?(?=\n## )/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/POSIÇÃO[\s\S]{0,200}PRIORIDADE\s+sobre\s+velocidade/);
  });

  it("Threshold de leitura por LOC declarado (3 faixas)", () => {
    const block = GOVERNANCE_SRC.match(/## REGRA-ORQ-35[\s\S]+?(?=\n## )/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/≤\s*300\s*LOC/);
    expect(block![0]).toMatch(/300-1000\s*LOC/);
    expect(block![0]).toMatch(/>\s*1000\s*LOC/);
  });

  it("Fallback para arquivos extremos (>3000 LOC) declarado", () => {
    const block = GOVERNANCE_SRC.match(/## REGRA-ORQ-35[\s\S]+?(?=\n## )/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/>3000\s*LOC/);
    expect(block![0]).toMatch(/seções\s+de\s+500\s+linhas/);
  });

  it("Checklist obrigatório de 4 perguntas declarado", () => {
    const block = GOVERNANCE_SRC.match(/## REGRA-ORQ-35[\s\S]+?(?=\n## )/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/Checklist\s+Obrigatório/);
    expect(block![0]).toMatch(/4\s*perguntas/);
    expect(block![0]).toMatch(/1\.\s*Li\s+o\s+arquivo/);
    expect(block![0]).toMatch(/2\.\s*Identifiquei\s+TODOS/);
    expect(block![0]).toMatch(/3\.\s*Verifiquei\s+se\s+existe\s+procedure\s+similar/);
    expect(block![0]).toMatch(/4\.\s*Formulei\s+hipótese/);
  });

  it("Enforcement (Fases sequenciais) tabela com declarativa + mecânica", () => {
    const block = GOVERNANCE_SRC.match(/## REGRA-ORQ-35[\s\S]+?(?=\n## )/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/Enforcement\s*\(Fases\s+sequenciais\)/);
    expect(block![0]).toMatch(/Atual\s*\(declarativa\)/);
    expect(block![0]).toMatch(/Fase\s+3\s*\(mecânica\)/);
    expect(block![0]).toMatch(/Hook\s+PreToolUse/);
    expect(block![0]).toMatch(/declarativa\s+até\s+Fase\s+3/);
  });

  it("Vinculadas inclui ORQ-27, ORQ-28, ORQ-34, ORQ-36", () => {
    const block = GOVERNANCE_SRC.match(/## REGRA-ORQ-35[\s\S]+?(?=\n## )/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/REGRA-ORQ-27/);
    expect(block![0]).toMatch(/REGRA-ORQ-28/);
    expect(block![0]).toMatch(/REGRA-ORQ-34/);
    expect(block![0]).toMatch(/REGRA-ORQ-36/);
  });
});

// ---------------------------------------------------------------------------
// REGRA-ORQ-36 — Técnicas de Investigação Profunda T1-T5
// ---------------------------------------------------------------------------
describe("M3.10 Fase 1 — REGRA-ORQ-36 está em governance.md", () => {
  it("REGRA-ORQ-36 declarada com título correto", () => {
    expect(GOVERNANCE_SRC).toMatch(
      /## REGRA-ORQ-36 — Técnicas de Investigação Profunda/,
    );
  });

  it("Matriz de Aplicação T1-T5 declarada", () => {
    const block = GOVERNANCE_SRC.match(/## REGRA-ORQ-36[\s\S]+?(?=\n## )/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/T1\s*—\s*Tracing\s+transversal/);
    expect(block![0]).toMatch(/T2\s*—\s*Comparação\s+cirúrgica/);
    expect(block![0]).toMatch(/T3\s*—\s*Hipótese-refutação\s+SQL/);
    expect(block![0]).toMatch(/T4\s*—\s*Mapa\s+writers\/readers/);
    expect(block![0]).toMatch(/T5\s*—\s*Análise\s+contrastiva/);
  });

  it("Caso canônico para cada técnica referencia Sprint M3.10", () => {
    const block = GOVERNANCE_SRC.match(/## REGRA-ORQ-36[\s\S]+?(?=\n## )/);
    expect(block).toBeTruthy();
    // T1: G17-B em routers-fluxo-v3
    expect(block![0]).toMatch(/G17-B[\s\S]{0,200}routers-fluxo-v3/);
    // T2: gapEngine vs risksV4
    expect(block![0]).toMatch(/gapEngine[\s\S]{0,100}createdById/);
    // T3: dry-run Manus
    expect(block![0]).toMatch(/dry-run/i);
    // T4: 3 writers, 0 readers
    expect(block![0]).toMatch(/3\s+writers/);
    // T5: contraste #3570002 vs #3690001
    expect(block![0]).toMatch(/#3570002[\s\S]{0,100}#3690001/);
  });

  it("Regra de Ouro declarada (1 camada vs pipeline vs intermitente vs recorrente)", () => {
    const block = GOVERNANCE_SRC.match(/## REGRA-ORQ-36[\s\S]+?(?=\n## )/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/Regra\s+de\s+Ouro/);
    expect(block![0]).toMatch(/1\s+camada/);
    expect(block![0]).toMatch(/pipeline\s+multi-camada/);
    expect(block![0]).toMatch(/intermitente/);
    expect(block![0]).toMatch(/recorrente/);
  });

  it("Ferramentas Preferidas declaradas em ordem (ast-grep, rg -C 10, rg -l, grep, SQL)", () => {
    const block = GOVERNANCE_SRC.match(/## REGRA-ORQ-36[\s\S]+?(?=\n## )/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/ast-grep/);
    expect(block![0]).toMatch(/rg\s+-C\s+10/);
    expect(block![0]).toMatch(/rg\s+-l/);
    expect(block![0]).toMatch(/grep\s+-rn/);
    expect(block![0]).toMatch(/Query\s+SQL\s+direta/);
  });

  it("Comandos auxiliares para cada técnica declarados", () => {
    const block = GOVERNANCE_SRC.match(/## REGRA-ORQ-36[\s\S]+?(?=\n## )/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/Comandos\s+auxiliares/);
    expect(block![0]).toMatch(/T1\s*—\s*Tracing/);
    expect(block![0]).toMatch(/T2\s*—\s*Comparação/);
    expect(block![0]).toMatch(/T3\s*—\s*Hipótese-refutação/);
    expect(block![0]).toMatch(/T4\s*—\s*Mapa/);
    expect(block![0]).toMatch(/T5\s*—\s*Análise/);
  });
});

// ---------------------------------------------------------------------------
// Lição #69 — Multi-fonte agregado vs multi-fonte por risco
// ---------------------------------------------------------------------------
describe("M3.10 Fase 1 — Lição #69 está em governance.md", () => {
  it("Lição #69 declarada com título correto", () => {
    expect(GOVERNANCE_SRC).toMatch(
      /## Lição #69 — Multi-fonte agregado vs multi-fonte por risco/,
    );
  });

  it("Lição #69 origem em Sprint M3.10 Fix C-bis (#3780001)", () => {
    expect(GOVERNANCE_SRC).toMatch(
      /Lição #69[\s\S]{0,500}Sprint M3\.10 Fix C-bis[\s\S]{0,200}#3780001/,
    );
  });

  it("Lição #69 distingue 2 conceitos (agregado vs por risco)", () => {
    const block = GOVERNANCE_SRC.match(/## Lição #69[\s\S]+?(?=\n## )/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/Multi-fonte\s+AGREGADO/);
    expect(block![0]).toMatch(/Multi-fonte\s+POR\s+RISCO/);
  });

  it("Lição #69 caso canônico: 8 riscos no #3780001", () => {
    const block = GOVERNANCE_SRC.match(/## Lição #69[\s\S]+?(?=\n## )/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/8\s+riscos/);
    expect(block![0]).toMatch(/source_priority='regulatorio'/);
    expect(block![0]).toMatch(/source_priority='iagen'/);
  });

  it("Lição #69 declara DoD com ambos os critérios", () => {
    const block = GOVERNANCE_SRC.match(/## Lição #69[\s\S]+?(?=\n## )/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/COUNT\(DISTINCT\s+source_priority\)\s*>=\s*2/);
    expect(block![0]).toMatch(/LENGTH\(evidence\.gaps\)/);
  });
});

// ---------------------------------------------------------------------------
// Lição #70 — Assimetria de auth em procedures
// ---------------------------------------------------------------------------
describe("M3.10 Fase 1 — Lição #70 está em governance.md", () => {
  it("Lição #70 declarada com título correto", () => {
    expect(GOVERNANCE_SRC).toMatch(
      /## Lição #70 — Assimetria de auth em procedures aparentemente similares/,
    );
  });

  it("Lição #70 caso canônico: gapEngine.ts:268 vs generateRisksAllSources", () => {
    const block = GOVERNANCE_SRC.match(/## Lição #70[\s\S]+?(?=\n## |$)/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/gapEngine\.ts:268/);
    expect(block![0]).toMatch(/createdById/);
    expect(block![0]).toMatch(/generateRisksAllSources/);
    expect(block![0]).toMatch(/validateProjectAccess/);
  });

  it("Lição #70 declara o anti-pattern (try/catch silencioso)", () => {
    const block = GOVERNANCE_SRC.match(/## Lição #70[\s\S]+?(?=\n## |$)/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/silent\s+fail/i);
    expect(block![0]).toMatch(/try\/catch[\s\S]{0,200}absorve/);
  });

  it("Lição #70 declara o pattern do anti-fix (distinguir tipos de erro)", () => {
    const block = GOVERNANCE_SRC.match(/## Lição #70[\s\S]+?(?=\n## |$)/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/NOT_FOUND/);
    expect(block![0]).toMatch(/distingue/i);
  });

  it("Lição #70 declara tech debt para Sprint M3.11", () => {
    const block = GOVERNANCE_SRC.match(/## Lição #70[\s\S]+?(?=\n## |$)/);
    expect(block).toBeTruthy();
    expect(block![0]).toMatch(/tech\s+debt/i);
    expect(block![0]).toMatch(/Sprint\s+M3\.11/);
  });
});

// ---------------------------------------------------------------------------
// Integridade — REGRAs ORQ pré-existentes preservadas
// ---------------------------------------------------------------------------
describe("M3.10 Fase 1 — REGRAs ORQ pré-existentes intactas", () => {
  const REGRAS_PRE_EXISTENTES = [
    "REGRA-ORQ-19",
    "REGRA-ORQ-20",
    "REGRA-ORQ-27",
    "REGRA-ORQ-28",
    "REGRA-ORQ-33",
    "REGRA-ORQ-34",
  ];

  it.each(REGRAS_PRE_EXISTENTES)(
    "REGRA %s permanece declarada (não removida pela Fase 1)",
    (regra) => {
      expect(GOVERNANCE_SRC).toMatch(new RegExp(`## ${regra}\\b`));
    },
  );

  const LICOES_PRE_EXISTENTES = [
    "#62", "#63", "#64", "#65", "#66", "#67", "#68",
  ];

  it.each(LICOES_PRE_EXISTENTES)(
    "Lição %s permanece declarada (não removida pela Fase 1)",
    (licao) => {
      expect(GOVERNANCE_SRC).toMatch(new RegExp(`## Lição ${licao}\\b`));
    },
  );
});

// ---------------------------------------------------------------------------
// Sanidade — todas as REGRAs estão em ordem numérica crescente no arquivo
// ---------------------------------------------------------------------------
describe("M3.10 Fase 1 — REGRAs ORQ em ordem numérica", () => {
  it("REGRA-ORQ-34 aparece antes de REGRA-ORQ-35", () => {
    const idx34 = GOVERNANCE_SRC.indexOf("## REGRA-ORQ-34");
    const idx35 = GOVERNANCE_SRC.indexOf("## REGRA-ORQ-35");
    expect(idx34).toBeGreaterThanOrEqual(0);
    expect(idx35).toBeGreaterThan(idx34);
  });

  it("REGRA-ORQ-35 aparece antes de REGRA-ORQ-36", () => {
    const idx35 = GOVERNANCE_SRC.indexOf("## REGRA-ORQ-35");
    const idx36 = GOVERNANCE_SRC.indexOf("## REGRA-ORQ-36");
    expect(idx35).toBeGreaterThanOrEqual(0);
    expect(idx36).toBeGreaterThan(idx35);
  });

  it("Lição #68 aparece antes de Lição #69", () => {
    const idx68 = GOVERNANCE_SRC.indexOf("## Lição #68");
    const idx69 = GOVERNANCE_SRC.indexOf("## Lição #69");
    expect(idx68).toBeGreaterThanOrEqual(0);
    expect(idx69).toBeGreaterThan(idx68);
  });

  it("Lição #69 aparece antes de Lição #70", () => {
    const idx69 = GOVERNANCE_SRC.indexOf("## Lição #69");
    const idx70 = GOVERNANCE_SRC.indexOf("## Lição #70");
    expect(idx69).toBeGreaterThanOrEqual(0);
    expect(idx70).toBeGreaterThan(idx69);
  });
});
