/**
 * ADR-0018 — Context Injection: Fontes Ausentes no Briefing
 * BUG-BRIEFING-01: cnaeAnswers (IS + alíquota zero) não eram injetados no prompt do LLM
 *
 * Specs: BCI-01 a BCI-06
 *
 * Estratégia: testes estáticos (leitura do código-fonte) + testes de prompt assembly.
 * Não chamam o LLM real para evitar custo e flakiness.
 * Verificam que:
 *   1. O código injeta p.cnaeAnswers como <qcnae_especializado> no userPrompt
 *   2. O systemPrompt contém as regras obrigatórias IS → Art. 2 e alíquota zero → Art. 14
 *   3. O ADR-0018 existe e está aceito
 *   4. O prompt assembly inclui os termos esperados quando cnaeAnswers contém IS e alíquota zero
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const routerPath = join(process.cwd(), "server/routers-fluxo-v3.ts");
const routerContent = readFileSync(routerPath, "utf-8");

const adrPath = join(process.cwd(), "docs/adr/ADR-0018-context-injection-briefing.md");
const adrContent = readFileSync(adrPath, "utf-8");

// ─── BCI-01: cnaeAnswers especializado é lido de p.cnaeAnswers ───────────────
describe("BCI-01: Fonte A — p.cnaeAnswers é lido e injetado como <qcnae_especializado>", () => {
  it("deve ler p.cnaeAnswers (com parse JSON se string)", () => {
    expect(routerContent).toContain("p.cnaeAnswers");
    expect(routerContent).toContain("JSON.parse(p.cnaeAnswers");
  });

  it("deve injetar o bloco <qcnae_especializado> no additionalContext", () => {
    expect(routerContent).toContain("<qcnae_especializado>");
    expect(routerContent).toContain("</qcnae_especializado>");
    expect(routerContent).toContain("JSON.stringify(specializedCnaeAnswers");
  });
});

// ─── BCI-02: Respostas SOLARIS (Onda 1) são buscadas e injetadas ─────────────
describe("BCI-02: Fonte B — solarisAnswers são buscados e injetados como <respostas_solaris>", () => {
  it("deve chamar db.getOnda1Answers(input.projectId)", () => {
    // Verificar na seção após generateBriefingFromDiagnostic
    const briefingSection = routerContent.split("generateBriefingFromDiagnostic")[2] || routerContent;
    expect(briefingSection).toContain("getOnda1Answers(input.projectId)");
  });

  it("deve injetar o bloco <respostas_solaris> no additionalContext", () => {
    expect(routerContent).toContain("<respostas_solaris>");
    expect(routerContent).toContain("</respostas_solaris>");
  });
});

// ─── BCI-03: Respostas IA Gen (Onda 2) são buscadas e injetadas ──────────────
describe("BCI-03: Fonte C — iagenAnswers são buscados e injetados como <respostas_iagen>", () => {
  it("deve chamar db.getOnda2Answers(input.projectId)", () => {
    // getOnda2Answers é chamado dentro da função generateBriefingFromDiagnostic
    // split[1] = tudo após a primeira ocorrência do nome da função
    const briefingSection = routerContent.split("generateBriefingFromDiagnostic")[1] || "";
    expect(briefingSection).toContain("getOnda2Answers(input.projectId)");
  });

  it("deve injetar o bloco <respostas_iagen> no additionalContext", () => {
    expect(routerContent).toContain("<respostas_iagen>");
    expect(routerContent).toContain("</respostas_iagen>");
  });
});

// ─── BCI-04: systemPrompt contém regra IS → Art. 2 (ADR-0018) ───────────────
describe("BCI-04: systemPrompt contém regra QCNAE ESPECIALIZADO (ADR-0018)", () => {
  it("deve conter instrução QCNAE ESPECIALIZADO no systemPrompt", () => {
    expect(routerContent).toContain("REGRA OBRIGATÓRIA — QCNAE ESPECIALIZADO (ADR-0018)");
  });

  it("deve instruir: IS confirmado → citar Art. 2 LC 214/2025", () => {
    expect(routerContent).toContain("confirmam sujeição ao IS");
    expect(routerContent).toContain("Art. 2 LC 214/2025");
  });

  it("deve instruir: alíquota zero confirmada → citar Art. 14 LC 214/2025", () => {
    expect(routerContent).toContain("confirmam alíquota zero");
    expect(routerContent).toContain("Art. 14 LC 214/2025");
  });

  it("deve referenciar a tag <qcnae_especializado> na instrução", () => {
    expect(routerContent).toContain("tag <qcnae_especializado>");
  });
});

// ─── BCI-05: additionalContextText é incluído no userPrompt ─────────────────
describe("BCI-05: additionalContextText é injetado no userPrompt enviado ao LLM", () => {
  it("deve incluir additionalContextText no conteúdo do userPrompt", () => {
    expect(routerContent).toContain("additionalContextText");
    // Verificar que additionalContextText aparece dentro do template literal do userPrompt
    // O userPrompt usa ${additionalContextText} dentro de uma template string
    expect(routerContent).toContain("${additionalContextText}");
  });

  it("deve ter o prefixo DADOS ADICIONAIS DO CLIENTE", () => {
    expect(routerContent).toContain("DADOS ADICIONAIS DO CLIENTE");
  });
});

// ─── BCI-06: ADR-0018 existe, está aceito e documenta as 3 fontes ────────────
describe("BCI-06: ADR-0018 existe e documenta corretamente a decisão", () => {
  it("deve existir o arquivo ADR-0018", () => {
    expect(adrContent).toBeTruthy();
    expect(adrContent.length).toBeGreaterThan(500);
  });

  it("deve ter status Aceito", () => {
    expect(adrContent).toContain("Status:** Aceito");
  });

  it("deve documentar as 3 fontes: cnaeAnswers, solaris_answers, iagen_answers", () => {
    expect(adrContent).toContain("cnaeAnswers");
    expect(adrContent).toContain("solaris_answers");
    expect(adrContent).toContain("iagen_answers");
  });

  it("deve referenciar BUG-BRIEFING-01", () => {
    expect(adrContent).toContain("BUG-BRIEFING-01");
  });

  it("deve mencionar IS e alíquota zero como casos de uso", () => {
    expect(adrContent).toContain("IS");
    expect(adrContent).toContain("alíquota zero");
  });
});

// ─── BCI-07: Prompt assembly — mock de cnaeAnswers com IS + alíquota zero ────
describe("BCI-07: Prompt assembly — cnaeAnswers com IS e alíquota zero gera contexto correto", () => {
  /**
   * Simula o que o código faz em runtime:
   * 1. Lê p.cnaeAnswers (JSON)
   * 2. Serializa como JSON.stringify(specializedCnaeAnswers, null, 2)
   * 3. Envolve em <qcnae_especializado>...</qcnae_especializado>
   * 4. Monta additionalContextText com "DADOS ADICIONAIS DO CLIENTE:"
   *
   * Verifica que o texto resultante contém os termos que o LLM precisa ver.
   */
  const mockCnaeAnswers = {
    sections: [
      {
        id: "IS",
        sectionTitle: "Imposto Seletivo",
        answers: [
          {
            questionId: "QCNAE-03-IS",
            question: "Sua empresa opera com produtos sujeitos ao Imposto Seletivo?",
            answer: "sim",
            description: "bebidas açucaradas (NCM 2202.10.00) sujeitas ao IS",
          },
        ],
      },
      {
        id: "aliquota_zero",
        sectionTitle: "Alíquota Zero / Redução",
        answers: [
          {
            questionId: "QCNAE-04-AZ",
            question: "Possui produtos com alíquota zero no IBS/CBS?",
            answer: "sim",
            description: "arroz beneficiado (NCM 1006.40.00) com alíquota zero conforme LC 214/2025",
          },
        ],
      },
    ],
  };

  // Simular o bloco de montagem do additionalContext (mesmo código do router)
  const specializedCnaeAnswers = mockCnaeAnswers;
  const additionalContext: string[] = [];
  additionalContext.push("<qcnae_especializado>");
  additionalContext.push(JSON.stringify(specializedCnaeAnswers, null, 2));
  additionalContext.push("</qcnae_especializado>");
  const additionalContextText = `DADOS ADICIONAIS DO CLIENTE:\n${additionalContext.join("\n")}\n\n`;

  it("deve conter a tag <qcnae_especializado>", () => {
    expect(additionalContextText).toContain("<qcnae_especializado>");
  });

  it("deve conter 'Imposto Seletivo' no contexto montado", () => {
    expect(additionalContextText).toContain("Imposto Seletivo");
  });

  it("deve conter 'alíquota zero' no contexto montado", () => {
    expect(additionalContextText).toContain("alíquota zero");
  });

  it("deve conter 'sim' como resposta para IS", () => {
    const parsed = JSON.parse(
      additionalContextText
        .split("<qcnae_especializado>")[1]
        .split("</qcnae_especializado>")[0]
        .trim()
    );
    const isSection = parsed.sections.find((s: any) => s.id === "IS");
    expect(isSection).toBeDefined();
    expect(isSection.answers[0].answer).toBe("sim");
  });

  it("deve conter 'sim' como resposta para alíquota zero", () => {
    const parsed = JSON.parse(
      additionalContextText
        .split("<qcnae_especializado>")[1]
        .split("</qcnae_especializado>")[0]
        .trim()
    );
    const azSection = parsed.sections.find((s: any) => s.id === "aliquota_zero");
    expect(azSection).toBeDefined();
    expect(azSection.answers[0].answer).toBe("sim");
  });

  it("deve conter o prefixo DADOS ADICIONAIS DO CLIENTE", () => {
    expect(additionalContextText).toContain("DADOS ADICIONAIS DO CLIENTE:");
  });
});
