# Relatório de Validação — Camada de Confiança M1 Runner v3

**Versão:** 1.1  
**Data:** 2026-04-25  
**Ambiente:** Produção controlada (`iasolaris.manus.space`)  
**Feature flag:** `M1_ARCHETYPE_ENABLED=false` (rollout controlado — acesso restrito a `equipe_solaris`)  
**Branch:** `feat/m1-archetype-runner-v3` · commit `f4fea136`  
**Aprovador:** P.O. Uires Tapajós  

---

## Resumo Executivo

A validação da Camada de Confiança do Runner v3 foi concluída com **PASS em produção controlada**. O caso real "Transportadora de Combustíveis Perigosos" — caso de maior risco de falso positivo identificado na análise estática — executou com `status_arquetipo = confirmado`, score 100%, zero fallbacks, zero hard_blocks e zero conflitos lógicos. Os logs foram gravados corretamente na tabela `m1_runner_logs`.

---

## Histórico de Versões

| Versão | Data | Mudança |
|---|---|---|
| v1.0 | 2026-04-24 | Validação estática (3 PASS, 2 PARTIAL) — formulário sem `natureza_operacao_principal` |
| v1.1 | 2026-04-25 | **Validação em produção real** — formulário completo com `natureza_operacao_principal` + `user_confirmed=true` |

---

## Caso de Teste: Transportadora de Combustíveis Perigosos

### Configuração da Seed (formulário `/admin/m1-perfil`)

| Campo | Valor informado |
|---|---|
| `natureza_operacao_principal` | `[Transporte]` |
| `regime_tributario_atual` | `Lucro Real` |
| `territorio_atuacao` | `interestadual` |
| `papel_na_cadeia` | (derivado automaticamente pelo runner) |
| `user_confirmed` | `true` (botão "Confirmar Perfil da Entidade") |

### Resultado Obtido em Produção

| Métrica | Valor | Critério | Status |
|---|---|---|---|
| `status_arquetipo` | `confirmado` | = `confirmado` | ✅ PASS |
| `score_confianca` | 100% | ≥ 70% | ✅ PASS |
| `fallback_count` (V-10-FALLBACK) | 0 | = 0 (sem NCM/NBS) | ✅ PASS |
| `hard_block_count` | 0 | = 0 | ✅ PASS |
| `lc_conflict_count` (V-LC-NNN) | 0 | = 0 | ✅ PASS |
| `missing_required_fields` | `[]` | = `[]` | ✅ PASS |
| IS indevido (Imposto Seletivo) | Não disparado | Não deve disparar | ✅ PASS |
| Fluxo `pendente → confirmado` | Validado | Regra 5 do runner | ✅ PASS |
| Gravação em `m1_runner_logs` | OK | INSERT sem erro | ✅ PASS |

**Veredito: PASS (9/9)**

### Comparação com Resultado Esperado (v1.0)

O guia de teste v1.0 previa que o resultado ideal (`confirmado`) só seria alcançável após o fix do formulário para expor `natureza_operacao_principal`. O P.O. executou o teste **após o fix** (campo adicionado no checkpoint `0935825e`) e obteve o resultado ideal.

| Métrica | Esperado (v1.0 — sem fix) | Esperado (v1.0 — com fix) | Obtido (v1.1 — produção) |
|---|---|---|---|
| `status_arquetipo` | `inconsistente` | `confirmado` | `confirmado` ✅ |
| `score_confianca` | ~40–47% | 70–100% | 100% ✅ |
| `fallback_count` | 0 | 0 | 0 ✅ |
| `hard_block_count` | 0 | 0 | 0 ✅ |
| `lc_conflict_count` | 0 | 0 | 0 ✅ |

---

## Validação das Regras do Runner v3

### Regras Verificadas Indiretamente

| Regra | Descrição | Evidência |
|---|---|---|
| Regra 5 (`user_confirmed`) | `user_confirmed=true` + sem `BLOCK_FLOW`/`HARD_BLOCK`/`missing_fields` → `confirmado` | `status_arquetipo = confirmado` com `user_confirmed=true` |
| C2-05 | Transportador não recebe `servico_digital` ou `servico_financeiro` como objeto | Sem `HARD_BLOCK` disparado |
| C3-04 | Transportador interestadual não recebe IS municipal | Sem IS indevido |
| V-10-FALLBACK | INFO apenas — não bloqueia gate | `fallback_count = 0` (sem NCM/NBS) |

### Painel de Confiança (Gauges SVG)

Com `score = 100%` e `missing_required_fields = []`:

| Gauge | Fórmula | Valor |
|---|---|---|
| Completude | `(6 − 0) / 6 × 100` | 100% |
| Inferência | `V-10-FALLBACK.length === 0 ? 100 : 0` | 100% |
| Coerência | `V-LC-NNN.length === 0 ? 100 : 0` | 100% |
| Score | `100×0.40 + 100×0.30 + 100×0.30` | **100%** |

---

## Integridade do Sistema

| Componente | Status |
|---|---|
| Runner `server/lib/archetype/` | Inalterado ✅ |
| Dataset NCM/NBS `server/lib/decision-kernel/` | Inalterado ✅ |
| Regras C1-C6 `validateConflicts.ts` | Inalteradas ✅ |
| TypeScript (`tsc --noEmit` limpo) | 0 erros ✅ |
| Vitest `m1-feature-flag.test.ts` | 12/12 PASS ✅ |
| Feature flag `M1_ARCHETYPE_ENABLED` | `false` (rollout controlado) ✅ |
| Tabela `m1_runner_logs` | INSERT OK — logs gravados ✅ |

---

## Conclusão

O módulo M1 Runner v3 está **validado em produção controlada**. O caso de maior risco (Transportadora de Combustíveis Perigosos) obteve PASS completo com score 100%, confirmando que:

1. A lógica de derivação de `papel_na_cadeia` a partir de `natureza_operacao_principal = [Transporte]` está correta.
2. O fluxo `pendente → confirmado` via `user_confirmed=true` funciona conforme especificado.
3. As proteções contra IS indevido (C3-04) e objetos incorretos (C2-05) estão ativas.
4. A persistência em `m1_runner_logs` está operacional.

**Status do módulo M1:** Pronto para piloto controlado via `M1_ARCHETYPE_ALLOWED_PROJECTS`.

---

## Pendências Remanescentes

| Prioridade | Item | Responsável |
|---|---|---|
| P3 | `drizzle/schema.ts`: `perfil_hash`/`rules_hash` declarados como `varchar(64)` — banco real tem `varchar(80)`. Correção no working tree, aguarda commit autorizado. | Manus |
| P3 | ADR-0031 e ADR-0032 em status `PROPOSED` — aguardam ratificação do P.O. | P.O. |
| P2 | Ativar piloto via secret `M1_ARCHETYPE_ALLOWED_PROJECTS=<project_id>` | P.O. |
| P2 | Adicionar `posicao_na_cadeia_economica` ao formulário M1 | Manus (aguarda autorização) |

---

*Gerado por Manus — Sprint M1 Arquétipo de Negócio · Aprovado por P.O. Uires Tapajós · 2026-04-25*
