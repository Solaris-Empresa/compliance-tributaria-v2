/**
 * task-generator-v4.integration.test.ts — Teste de integração com LLM REAL
 *
 * Roda com chamada LLM real (não mock) — precisa de OPENAI_API_KEY no ambiente.
 * Skip automático se OPENAI_API_KEY não estiver configurada.
 *
 * Previne: LLM falhando silenciosamente em produção (Sprint Z-17 lição aprendida).
 * Custo: ~$0.02 por execução (1 chamada GPT-4.1 com prompt cache).
 *
 * Executar manualmente antes de merge de features LLM:
 *   OPENAI_API_KEY=sk-... pnpm vitest run server/lib/task-generator-v4.integration.test.ts
 */
import { describe, it, expect } from "vitest";

// Skip se LLM não configurado
const HAS_LLM = !!process.env.OPENAI_API_KEY;
const describeIfLLM = HAS_LLM ? describe : describe.skip;

describeIfLLM("TaskGenerator Integration (LLM real)", () => {
  it(
    "gera 2-4 tarefas para plano de split_payment",
    async () => {
      // Import dinâmico para evitar erro se dependências de banco não estiverem disponíveis
      const { generateTaskSuggestions } = await import(
        "./task-generator-v4"
      );

      const result = await generateTaskSuggestions({
        risco: {
          titulo: "Risco de split payment — LC 214/2025",
          categoria: "split_payment",
          artigo: "Art. 29 LC 214/2025",
          severidade: "alta",
          source_priority: "cnae",
        },
        plano: {
          titulo: "Adequar sistema para split payment",
          responsavel: "ti",
          prazo: "90_dias",
        },
        empresa: {
          cnpj: null,
          cnaes: ["4711-3/02"],
          porte: "media",
          regime_tributario: "lucro_real",
        },
      });

      // Validações críticas
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.length).toBeLessThanOrEqual(4);

      for (const task of result) {
        expect(task.titulo.length).toBeGreaterThanOrEqual(3);
        expect(task.titulo.length).toBeLessThanOrEqual(200);
        expect(task.responsavel.length).toBeGreaterThanOrEqual(1);
        // Responsavel deve ser um dos papéis válidos
        expect([
          "gestor_fiscal",
          "diretor",
          "ti",
          "juridico",
          "advogado",
          "contador",
        ]).toContain(task.responsavel);
      }
    },
    60_000 // 60s timeout — LLM pode demorar
  );

  it(
    "gera tarefas sem artigo (Onda 1 Solaris)",
    async () => {
      const { generateTaskSuggestions } = await import(
        "./task-generator-v4"
      );

      const result = await generateTaskSuggestions({
        risco: {
          titulo: "Risco de confissão automática",
          categoria: "confissao_automatica",
          artigo: null, // Onda 1 não tem artigo
          severidade: "alta",
          source_priority: "solaris",
        },
        plano: {
          titulo: "Avaliar e mitigar: confissão automática",
          responsavel: "advogado",
          prazo: "30_dias",
        },
        empresa: {
          cnpj: null,
          cnaes: ["6201-5/00"],
          porte: "pequena",
          regime_tributario: "simples_nacional",
        },
      });

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.length).toBeLessThanOrEqual(4);

      for (const task of result) {
        expect(task.titulo.length).toBeGreaterThanOrEqual(3);
      }
    },
    60_000
  );

  it(
    "gera tarefas com artigo vazio (Onda 2 IA Gen)",
    async () => {
      const { generateTaskSuggestions } = await import(
        "./task-generator-v4"
      );

      const result = await generateTaskSuggestions({
        risco: {
          titulo: "Risco de obrigação acessória",
          categoria: "obrigacao_acessoria",
          artigo: "", // String vazia — || null converte para null
          severidade: "media",
          source_priority: "iagen",
        },
        plano: {
          titulo: "Avaliar e mitigar: obrigação acessória",
          responsavel: "contador",
          prazo: "60_dias",
        },
        empresa: {
          cnpj: "12.345.678/0001-90",
          cnaes: ["4712-1/00", "4711-3/02"],
          porte: "grande",
          regime_tributario: "lucro_real",
        },
      });

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.length).toBeLessThanOrEqual(4);
    },
    60_000
  );
});
