import { describe, it, expect } from "vitest";
import { invokeLLM } from "./_core/llm";

describe("Action Plan Generation", () => {
  it("should generate action plan from briefing recommendations", async () => {
    const mockBriefing = {
      summaryText: "Empresa de tecnologia no Lucro Presumido precisa se adequar à reforma tributária.",
      gapsAnalysis: "Principais gaps: falta de mapeamento de processos, sistema ERP desatualizado.",
      priorityAreas: `## Recomendações Estratégicas

1. **Mapear processos de faturamento** - Prazo: 2 meses - Complexidade: Média
2. **Atualizar sistema ERP** - Prazo: 6 meses - Complexidade: Alta
3. **Treinar equipe contábil** - Prazo: 3 meses - Complexidade: Baixa`,
      riskLevel: "medio"
    };

    const prompt = `Você é um gerente de projetos especializado em compliance tributário.

Com base no Levantamento Inicial (Briefing) gerado:

## RESUMO EXECUTIVO
${mockBriefing.summaryText}

## ANÁLISE DETALHADA
${mockBriefing.gapsAnalysis}

## RECOMENDAÇÕES ESTRATÉGICAS
${mockBriefing.priorityAreas}

## NÍVEL DE RISCO GERAL
${mockBriefing.riskLevel}

## PARÂMETROS DO PROJETO
- Período do plano: 12 meses
- Data de início: ${new Date().toISOString().split('T')[0]}

## INSTRUÇÕES
Gere um Plano de Ação detalhado e executável que transforme as recomendações estratégicas do briefing em tarefas concretas.

**Estrutura do Plano:**
- Organize em fases lógicas (Fase 1: Diagnóstico, Fase 2: Planejamento, Fase 3: Implementação, Fase 4: Monitoramento)
- Cada fase deve ter duração proporcional ao período total
- Priorize ações críticas nas primeiras fases

**Para cada ação:**
- **Título:** Claro, objetivo e acionável
- **Descrição:** Detalhada (o que fazer, como fazer, entregáveis esperados)
- **Responsável:** Função/área responsável
- **Prazo:** Data realista no formato YYYY-MM-DD
- **Prioridade:** "alta", "media" ou "baixa"
- **Dependências:** IDs de outras ações (array vazio se não houver)
- **Indicadores de sucesso:** Métricas mensuráveis
- **Estimativa de horas:** Número realista de horas

Retorne APENAS JSON válido no formato:
{
  "phases": [
    {
      "name": "Fase 1: Diagnóstico e Mapeamento",
      "description": "Descrição da fase",
      "durationMonths": 2,
      "actions": [
        {
          "id": "action_1",
          "title": "Título da ação",
          "description": "Descrição detalhada",
          "responsible": "Função responsável",
          "dueDate": "2026-03-15",
          "priority": "alta",
          "dependencies": [],
          "indicators": "Indicadores de sucesso",
          "estimatedHours": 40
        }
      ]
    }
  ]
}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um gerente de projetos. Retorne apenas JSON válido." },
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
    expect(parsed.phases).toBeDefined();
    expect(Array.isArray(parsed.phases)).toBe(true);
    expect(parsed.phases.length).toBeGreaterThan(0);

    // Validar primeira fase
    const firstPhase = parsed.phases[0];
    expect(firstPhase.name).toBeDefined();
    expect(typeof firstPhase.name).toBe("string");
    expect(firstPhase.description).toBeDefined();
    expect(firstPhase.durationMonths).toBeDefined();
    expect(typeof firstPhase.durationMonths).toBe("number");
    expect(firstPhase.actions).toBeDefined();
    expect(Array.isArray(firstPhase.actions)).toBe(true);

    // Validar primeira ação
    if (firstPhase.actions.length > 0) {
      const firstAction = firstPhase.actions[0];
      expect(firstAction.id).toBeDefined();
      expect(firstAction.title).toBeDefined();
      expect(typeof firstAction.title).toBe("string");
      expect(firstAction.description).toBeDefined();
      expect(firstAction.responsible).toBeDefined();
      expect(firstAction.dueDate).toBeDefined();
      expect(firstAction.priority).toBeDefined();
      expect(["alta", "media", "baixa"]).toContain(firstAction.priority);
      expect(Array.isArray(firstAction.dependencies)).toBe(true);
      expect(firstAction.indicators).toBeDefined();
      expect(typeof firstAction.estimatedHours).toBe("number");
    }
  }, 60000); // 60 segundos de timeout para LLM
});
