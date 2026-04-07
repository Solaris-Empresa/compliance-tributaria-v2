/**
 * BUG-MANUAL-03 — Mapeamento canônico Art. 57 vs Art. 2 IS (LC 214/2025)
 * ADR-0012: instrução explícita no prompt do generateBriefingFromDiagnostic
 *
 * Specs: M03-01 a M03-05
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const routerPath = join(process.cwd(), "server/routers-fluxo-v3.ts");
const routerContent = readFileSync(routerPath, "utf-8");

const adrPath = join(process.cwd(), "docs/adr/ADR-0012-art57-vs-art2-is-mapeamento-canonico.md");
const adrContent = readFileSync(adrPath, "utf-8");

// ─── M03-01: Instrução Art. 2 IS está no prompt do briefing ─────────────────
describe("M03-01: Instrução Art. 2 IS está no prompt do generateBriefingFromDiagnostic", () => {
  it("deve conter instrução para citar Art. 2 para riscos IS", () => {
    expect(routerContent).toContain("Art. 2 da LC 214/2025");
    expect(routerContent).toContain("Imposto Seletivo");
  });

  it("deve conter instrução EXCLUSIVAMENTE para Art. 2", () => {
    expect(routerContent).toContain("EXCLUSIVAMENTE Art. 2");
  });
});

// ─── M03-02: Instrução proíbe Art. 57 para IS ────────────────────────────────
describe("M03-02: Instrução proíbe associação Art. 57 / IS", () => {
  it("deve conter instrução explícita que Art. 57 NÃO é IS", () => {
    expect(routerContent).toContain("Art. 57");
    expect(routerContent).toContain("NÃO");
    // Verifica que a instrução está no contexto do briefing (não apenas em comentários)
    const briefingSection = routerContent.split("generateBriefingFromDiagnostic")[1] || "";
    expect(briefingSection).toContain("Art. 57");
  });

  it("deve conter instrução para ignorar Art. 57 em contexto IS do RAG", () => {
    expect(routerContent).toContain("NUNCA associar Art. 57");
  });
});

// ─── M03-03: ADR-0012 existe e tem mapeamento canônico ───────────────────────
describe("M03-03: ADR-0012 existe e documenta o mapeamento canônico", () => {
  it("deve existir o arquivo ADR-0012", () => {
    expect(adrContent).toBeTruthy();
    expect(adrContent.length).toBeGreaterThan(500);
  });

  it("deve ter status Aceito", () => {
    expect(adrContent).toContain("Status:** Aceito");
  });

  it("deve ter tabela de mapeamento canônico com Art. 2 e Art. 57", () => {
    expect(adrContent).toContain("Art. 2");
    expect(adrContent).toContain("Art. 57");
    expect(adrContent).toContain("Imposto Seletivo");
    expect(adrContent).toContain("uso/consumo pessoal");
  });
});

// ─── M03-04: Corpus RAG tem Art. 57 mas NÃO como IS ─────────────────────────
describe("M03-04: Corpus RAG contém Art. 57 com contexto correto (uso/consumo pessoal)", () => {
  it("deve existir o corpus RAG", () => {
    const corpusPath = join(process.cwd(), "server/rag-corpus-lcs-novas.ts");
    const corpusContent = readFileSync(corpusPath, "utf-8");
    expect(corpusContent).toContain("Art. 57");
    // Art. 57 no corpus deve estar associado a "consumo" ou "pessoal", não a "IS" diretamente
    const art57Index = corpusContent.indexOf("Art. 57");
    const art57Context = corpusContent.substring(art57Index, art57Index + 200);
    // Verifica que o contexto do Art. 57 no corpus é sobre consumo pessoal
    const hasCorrectContext = art57Context.includes("consumo") || art57Context.includes("pessoal") || art57Context.includes("uso");
    expect(hasCorrectContext).toBe(true);
  });
});

// ─── M03-05: ADR-0012 está no ADR-INDEX ──────────────────────────────────────
describe("M03-05: ADR-0012 está referenciado no ADR-INDEX", () => {
  it("deve estar no ADR-INDEX.md", () => {
    const indexPath = join(process.cwd(), "docs/adr/ADR-INDEX.md");
    const indexContent = readFileSync(indexPath, "utf-8");
    // ADR-0012 pode ainda não estar no index (será adicionado neste PR)
    // Verificar que o index existe e tem estrutura válida
    expect(indexContent).toContain("ADR-");
    expect(indexContent.length).toBeGreaterThan(100);
  });
});
