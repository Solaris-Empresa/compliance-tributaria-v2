# ADR-0022 — Hot Swap: Risk Engine v4 (Determinístico) substitui generateRiskMatrices (LLM)

**Status:** ACEITO  
**Data:** 2026-04-12  
**Sprint:** Z-12 (conclusão do trabalho iniciado em Z-07)  
**PR:** feat/z12-hot-swap-final  
**Autores:** Manus (implementação) · Claude Orquestrador (decisão arquitetural)

---

## Contexto

O procedimento `generateRiskMatrices` em `server/routers-fluxo-v3.ts` gerava a Matriz de Riscos via LLM (`invokeLLM`, temperatura 0.2), com RAG por área (contabilidade, negócio, TI, jurídico). O processo era não-determinístico, custoso (~45s paralelo) e sujeito a alucinações de artigos regulatórios.

Na Sprint Z-07, foi construído o engine determinístico `risk-engine-v4.ts` com as funções puras:
- `computeRiskMatrix(rules, projectProfile)` — gera riscos a partir de regras mapeadas
- `buildActionPlans(risks)` — gera planos de ação por risco
- `classifyRisk`, `buildBreadcrumb`, `sortBySourceRank` — helpers determinísticos

O router `risksV4` (`server/routers/risks-v4.ts`) foi criado com as 11 procedures do Skeleton Spec (ADR-0021), persistindo em `risks_v4`, `action_plans` e `tasks`.

O frontend foi atualizado com `useNewRiskEngine = true` em `DiagnosticoStepper.tsx` e `ProjetoDetalhesV2.tsx`, apontando para `/risk-dashboard-v4` que chama `risksV4.generateRisks`.

## Decisão

**Opção B escolhida (deprecação com aviso):** substituir o corpo de `generateRiskMatrices` por um `throw new TRPCError({ code: "METHOD_NOT_SUPPORTED" })` preservando o código legado em bloco de comentário para rollback imediato.

A Opção A (redirecionamento para `computeRiskMatrix`) foi descartada porque:
1. O schema de entrada/saída é incompatível (`briefingContent` vs `mappedRules[]`)
2. A transformação exigiria nova spec — fora do escopo do hot swap
3. O frontend já não chama `generateRiskMatrices` em produção

## Consequências

### Positivas
- `invokeLLM` não é mais chamado no caminho principal da Matriz de Riscos
- Engine determinístico: 0 alucinações, rastreabilidade por `rule_id`, `breadcrumb` e `source_priority`
- Custo de geração: ~0s (sem chamada LLM) vs ~45s anterior
- Rollback: `git revert <commit>` em 2 minutos

### Negativas / Riscos
- Clientes com projetos legados que ainda usem `MatrizesV3.tsx` (rota antiga) receberão erro `METHOD_NOT_SUPPORTED`
- O código legado em comentário aumenta o tamanho do arquivo em ~130 linhas

## Evidência

```
ANTES: grep -n "invokeLLM" server/routers-fluxo-v3.ts
  12: import { invokeLLM } ...
  814: const response = await invokeLLM(...)   ← generateBriefing (mantido)
  1250: { temperature: 0.2, context: 'generateRiskMatrices:...' }  ← ATIVO

DEPOIS: grep -n "invokeLLM" server/routers-fluxo-v3.ts
  12: import { invokeLLM } ...
  814: const response = await invokeLLM(...)   ← generateBriefing (mantido)
  (linha 1250 está dentro do bloco de comentário — não executada)

tsc --noEmit: 0 erros
```

## Rollback

```bash
git revert <commit-hash-do-feat/z12-hot-swap-final>
# ou manualmente: remover o throw e o bloco de comentário, restaurar o código original
```

## Referências

- `server/routers-fluxo-v3.ts` — procedure `generateRiskMatrices` (linha 1180)
- `server/routers/risks-v4.ts` — novo router determinístico
- `server/lib/risk-engine-v4.ts` — engine puro
- `server/lib/action-plan-engine-v4.ts` — planos de ação
- `docs/sprints/Z-07/SKELETON-SPEC-ADR-0021.md` — spec original
- `docs/sprints/Z-07/HANDOFF-MANUS-Z07.md` — handoff da Sprint Z-07
