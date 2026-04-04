# Post-Mortem: G17 — INSERT silencioso em `project_gaps_v3`

**Data:** 2026-03-31
**Severidade:** P1
**Status:** Resolvido
**MTTR:** ~4h (início da investigação → fix validado em produção)
**Autor:** Manus (Implementador) + Claude (Orquestrador)
**PRs relacionados:** #261 (G17 v1), #262 (G17 v2), #263 (G17 fix final)
**Issue:** #259 (G17 — solaris_answers → gapEngine)

---

## Resumo Executivo

A função `analyzeSolarisAnswers` foi implementada no PR #261 como uma chamada fire-and-forget (`Promise<void>`) dentro do router `completeOnda1`. Quando um usuário respondia SOL-002 = "Não" (confissão por inércia), a função era chamada mas o resultado do INSERT em `project_gaps_v3` nunca era verificado. Erros de enum inválido (`'solaris'` vs. `'ia_gen'`) faziam o INSERT falhar silenciosamente — o `catch` engolia o erro sem log, e a procedure retornava `{ inserted: 0 }` sem sinalizar falha. O advogado via o questionário concluído normalmente, mas nenhum gap era gerado.

---

## Timeline

| Horário (UTC-3) | Evento |
|---|---|
| Sprint N — Dia 1 | G17 implementado (PR #261) — `analyzeSolarisAnswers` inline no router |
| Sprint N — Dia 2 | Teste manual: SOL-002="Não" → 0 gaps em `project_gaps_v3` |
| Sprint N — Dia 2 | Diagnóstico iniciado: `SELECT COUNT(*) FROM project_gaps_v3` retorna 0 |
| Sprint N — Dia 2 | Causa raiz identificada: enum `'solaris'` inválido no `GapSourceEnum` |
| Sprint N — Dia 2 | 7 rodadas de crítica Claude ↔ ChatGPT ↔ Manus |
| Sprint N — Dia 2 | PR #262 — fix parcial (enum corrigido, mas catch ainda engolia) |
| Sprint N — Dia 2 | PR #263 — fix final: módulo extraído + transação + retorno `{ inserted: N }` |
| Sprint N — Dia 2 | Validado em produção: 3 gaps `source='solaris'` no projeto 2310001 |

---

## Causa Raiz — 5 Whys

**Por que 0 gaps foram inseridos?**
→ O INSERT em `project_gaps_v3` falhou silenciosamente.

**Por que falhou silenciosamente?**
→ O bloco `catch` engolia o erro sem log (`catch (e) { return { inserted: 0 }; }`).

**Por que o catch engolia o erro?**
→ A função era `Promise<void>` sem contrato de retorno verificável — o chamador não esperava o resultado.

**Por que era `Promise<void>`?**
→ A função foi implementada como função inline no router (`routers.ts`) sem módulo isolado.

**Por que inline no router?**
→ Ausência de regra de módulo isolado (R1) no Gate 2 — sem checklist que exigisse extração de lógica de negócio para `server/lib/`.

**Causa sistêmica:** Ausência de padrão arquitetural que impedisse lógica de negócio crítica (INSERTs) de ficar inline em routers sem contrato de retorno verificável.

---

## Impacto

| Dimensão | Impacto |
|---|---|
| Usuários afetados | Todos os projetos criados entre PR #261 e PR #263 |
| Dados perdidos | Gaps de confissão por inércia (SOL-002="Não") não gerados |
| Funcionalidade | `analyzeSolarisAnswers` retornava `{ inserted: 0 }` sem erro visível |
| MTTR | ~4h — no limite da meta P1 (<4h) |
| Change failure rate | +1 Sprint N |

---

## Ações Corretivas (já implementadas)

| Ação | Gate afetado | PR | Status |
|---|---|---|---|
| **R1** — Módulo isolado: `server/lib/solaris-gap-analyzer.ts` | Gate 2 | #263 | ✅ |
| **R4** — Retorno `{ inserted: N }` confirmado via `SELECT COUNT(*)` | Gate 2 | #263 | ✅ |
| **R5** — Log completo no catch com `console.error` estruturado | Gate 2 | #263 | ✅ |
| **Q6** — Retorno explícito obrigatório no checklist do PR template | Gate 2 v5.0 | #266 | ✅ |
| **R9** — Evento estruturado `{ event, projectId, inserted }` obrigatório | Gate 2 v5.0 | #266 | ✅ |
| **Tabela de erros** — 3 novos padrões adicionados ao MODELO-OPERACIONAL | Gate 3 | #268 | ✅ |
| **Passo 0** — 3 novos padrões: INSERT silencioso, import router, mistura drivers | Gate 1 v5.0 | #266 | ✅ |

---

## DORA Metrics — Sprint N

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| MTTR (G17) | ~4h | < 4h P1 | ⚠️ No limite |
| Change failure rate | 1/sprint | < 1/sprint | ⚠️ Excedido |
| Deployment frequency | 8 PRs mergeados | ≥ 3/sprint | ✅ |
| Lead time for changes | ~2h por PR | < 4h | ✅ |

---

## Lições Aprendidas

**O que funcionou bem:**
- O processo de crítica cruzada Claude ↔ ChatGPT ↔ Manus identificou a causa raiz em menos de 2h.
- A extração para `server/lib/` criou um contrato de retorno verificável que tornou o bug impossível de repetir.
- O `SELECT COUNT(*)` pós-INSERT como verificação explícita é agora padrão (R4).

**O que pode melhorar:**
- O Gate 2 não tinha checklist para INSERTs críticos — corrigido com Q6 e R9 no Gates v5.0.
- A ausência de teste de integração que verificasse `{ inserted: N } > 0` permitiu que o bug chegasse à produção — adicionar teste de contrato para funções de persistência.

---

## Ações Preventivas Futuras

1. **Teste de contrato obrigatório** para qualquer função que retorne `{ inserted: N }` — verificar que `inserted > 0` em pelo menos um caso de teste.
2. **Lint rule** (futuro): proibir `Promise<void>` em funções de persistência — retorno deve ser `Promise<{ inserted: number }>`.
3. **Alerta de produção**: configurar alerta quando `project_gaps_v3` não receber INSERT após `completeOnda1` bem-sucedido.

---

## Link ao Orquestrador

**Evidência de resolução:**
```json
{
  "incidente": "G17-INSERT-SILENCIOSO",
  "data": "2026-03-31",
  "severidade": "P1",
  "mttr_horas": 4,
  "causa_raiz": "Promise<void> sem contrato de retorno + catch engolindo erro",
  "fix_pr": "#263",
  "validacao_producao": "3 gaps source=solaris, projeto 2310001",
  "gates_atualizados": ["Q6", "R9", "Passo-0", "tabela-erros"],
  "dora_cfr": "+1 Sprint N"
}
```

---

*Documento gerado conforme Gate 4 — `docs/governance/POST-MORTEM-TEMPLATE.md`*
*Sprint N encerrada com este post-mortem.*
