import { describe, it, expect } from "vitest";
import { invokeLLM } from "./_core/llm";

describe("Briefing Generation", () => {
  it("should generate briefing content via LLM", async () => {
    const prompt = `Você é um consultor tributário especializado em Reforma Tributária brasileira.

Analise os dados abaixo e gere um Levantamento Inicial:

## DADOS DO CLIENTE
- Razão Social: Empresa Teste LTDA
- CNPJ: 12.345.678/0001-90
- Segmento: Tecnologia

## DADOS DO PROJETO
- Regime Tributário: Lucro Presumido
- Porte: Pequena Empresa
- Faturamento Anual: R$ 2.500.000,00

Retorne APENAS JSON válido no formato:
{
  "summaryText": "string (markdown com resumo executivo)",
  "gapsAnalysis": "string (markdown com análise)",
  "riskLevel": "baixo|medio|alto|critico",
  "priorityAreas": "string (markdown com recomendações)"
}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um consultor de compliance. Retorne apenas JSON válido." },
        { role: "user", content: prompt }
      ],
    });

    const rawContent = response.choices[0]?.message?.content;
    expect(rawContent).toBeDefined();
    expect(typeof rawContent).toBe("string");

    let content = typeof rawContent === 'string' ? rawContent : "{}";
    
    // Remover markdown code blocks se existirem
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const parsed = JSON.parse(content);

    // Validar estrutura do JSON retornado
    expect(parsed.summaryText).toBeDefined();
    expect(typeof parsed.summaryText).toBe("string");
    expect(parsed.summaryText.length).toBeGreaterThan(50);

    expect(parsed.gapsAnalysis).toBeDefined();
    expect(typeof parsed.gapsAnalysis).toBe("string");
    expect(parsed.gapsAnalysis.length).toBeGreaterThan(50);

    expect(parsed.riskLevel).toBeDefined();
    expect(["baixo", "medio", "alto", "critico"]).toContain(parsed.riskLevel);

    if (parsed.priorityAreas) {
      expect(typeof parsed.priorityAreas).toBe("string");
    }
  }, 60000); // 60 segundos de timeout para LLM
});
