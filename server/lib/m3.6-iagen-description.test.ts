/**
 * m3.6-iagen-description.test.ts
 * Sprint M3.6 — Test contracts (it.todo) para Bug P1-1 (IA Gen consome description)
 *
 * Issue: #932
 *
 * STATUS: PENDING — testes serão implementados pelo PR de produção que
 * fizer `it.todo()` virar `it()` com código real.
 *
 * REGRA-ORQ-27 (Lição #59): cada teste valida CONSUMPTION efetivo no
 * prompt LLM final (vi.spyOn em invokeLLM com asserção sobre o argumento).
 *
 * Contexto: bug observado em produção (#2880001) — IA Gen Onda 2 gera
 * perguntas dizendo "não possui operações multiestaduais" mesmo com
 * descrição livre informando "operações em múltiplos estados".
 *
 * Causa-raiz: project.description NÃO é injetada em profileFields[]
 * (routers-fluxo-v3.ts:3836+) nem em projectContext (questionEngine.ts:312-322).
 *
 * Vinculadas:
 * - Issue #932 (M3.6 — RAG filter por lei + IA Gen description)
 * - PR #929 (gates de archetype consumption — pattern espy invokeLLM)
 * - REGRA-ORQ-27 (PR #917)
 */
import { describe, it } from "vitest";

describe("M3.6 P1-1 — IA Gen Onda 2 consome project.description", () => {
  it.todo(
    "project.description é injetada em profileFields[] quando não-null — server/routers-fluxo-v3.ts:~3839"
  );

  it.todo(
    "profileFields NÃO inclui linha 'Descrição do negócio:' quando description=null (backward-compat)"
  );
});

describe("M3.6 P1-1 — questionEngine.ts consome project.description", () => {
  it.todo(
    "SELECT em getProjectById inclui campo description — server/routers/questionEngine.ts:293"
  );

  it.todo(
    "projectContext.description é populado a partir de project.description — server/routers/questionEngine.ts:~320"
  );

  it.todo(
    "prompt generateQuestionForRequirement interpola description condicionalmente — server/routers/questionEngine.ts:~122"
  );
});
