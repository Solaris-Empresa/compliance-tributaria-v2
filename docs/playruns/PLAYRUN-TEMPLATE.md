# Playrun — [TÍTULO DO PLAYRUN]

> **ID:** PLAYRUN-NNN
> **Playbook de referência:** [nome do playbook executado]
> **Data de execução:** AAAA-MM-DD
> **Executor:** [nome ou papel — ex.: Manus AI / P.O. / Equipe Jurídica]
> **Sprint / Contexto:** [nome da sprint ou contexto que originou esta execução]
> **Commit de início:** `xxxxxxx`
> **Commit de encerramento:** `xxxxxxx`
> **Checkpoint Manus:** `xxxxxxxx`
> **Status:** ✅ CONCLUÍDO | ⚠️ CONCLUÍDO COM RESSALVAS | ❌ ABORTADO

---

## 1. Objetivo desta Execução

Descreva em 2-3 frases o que esta execução do playbook pretendia alcançar. Seja específico sobre o escopo — o que estava dentro e o que estava fora.

---

## 2. Pré-condições Verificadas

Liste as condições que foram verificadas antes de iniciar a execução. Marque cada uma como atendida ou não.

| Pré-condição | Estado | Observação |
|---|---|---|
| TypeScript sem erros | ✅ / ❌ | — |
| Testes passando (N/N) | ✅ / ❌ | — |
| Banco de dados conectado | ✅ / ❌ | — |
| Checkpoint de segurança criado | ✅ / ❌ | commit `xxxxxxx` |
| [pré-condição específica do playbook] | ✅ / ❌ | — |

---

## 3. Etapas Executadas

Registre cada etapa do playbook com seu resultado real. Esta é a diferença central entre o Playbook (o que fazer) e o Playrun (o que aconteceu).

| # | Etapa | Resultado | Desvio do Playbook | Commit |
|---|---|---|---|---|
| 1 | [descrição da etapa] | ✅ OK / ⚠️ Parcial / ❌ Falhou | Nenhum / [descrição do desvio] | `xxxxxxx` |
| 2 | [descrição da etapa] | ✅ OK | Nenhum | `xxxxxxx` |
| … | … | … | … | … |

---

## 4. Resultados Mensuráveis

Registre os números reais obtidos nesta execução. Estes dados alimentam o `BASELINE-PRODUTO.md` após a execução.

| Métrica | Antes | Depois | Delta |
|---|---|---|---|
| Testes automatizados passando | N | N | +N |
| Erros TypeScript | N | N | -N |
| Erros conhecidos ativos | N | N | -N / +N |
| [métrica específica desta execução] | — | — | — |

---

## 5. Erros Encontrados e Resolvidos

Liste os erros encontrados durante esta execução, com referência ao `ERROS-CONHECIDOS.md`.

| Erro | Severidade | Encontrado em | Resolvido? | Referência |
|---|---|---|---|---|
| [descrição] | P0/P1/P2/P3 | Etapa N | ✅ Sim / ❌ Não | ERR-NNN |

> Se nenhum erro foi encontrado, registre: **Nenhum erro encontrado durante esta execução.**

---

## 6. Desvios do Playbook

Registre qualquer desvio em relação ao playbook de referência — seja uma etapa pulada, uma decisão tomada no momento, ou uma adaptação necessária. Desvios não são falhas; são aprendizados que podem melhorar o playbook.

| Desvio | Razão | Impacto | Ação recomendada |
|---|---|---|---|
| [descrição do desvio] | [por que aconteceu] | [qual o efeito] | Atualizar playbook / Documentar como exceção |

> Se nenhum desvio ocorreu, registre: **Execução seguiu o playbook sem desvios.**

---

## 7. Decisões Tomadas Durante a Execução

Registre decisões que não estavam previstas no playbook e que foram tomadas no momento.

| Decisão | Contexto | Alternativas consideradas | Decisão tomada | Reversível? |
|---|---|---|---|---|
| [descrição] | [por que surgiu] | [o que mais foi cogitado] | [o que foi feito] | Sim / Não |

---

## 8. Artefatos Gerados

Liste todos os artefatos criados ou modificados durante esta execução.

| Artefato | Tipo | Localização | Descrição |
|---|---|---|---|
| [nome do arquivo] | Novo / Modificado / Removido | `docs/...` ou `server/...` | [descrição] |

---

## 9. Invariants Verificados

Confirme que os invariants do sistema foram verificados ao final da execução.

| Invariant | Verificado? | Resultado |
|---|---|---|
| INV-001 — flowVersion único por projeto | ✅ / ❌ | N/N testes passando |
| INV-002 — companyProfile nunca como string | ✅ / ❌ | N/N testes passando |
| INV-003 — builders nunca lançam exceção | ✅ / ❌ | N/N testes passando |
| INV-004 — normalizeProject() em todos os retornos | ✅ / ❌ | N/N testes passando |
| INV-005 — sem lógica local de prefill | ✅ / ❌ | N/N testes passando |
| INV-006 — estrutura de riscos completa | ✅ / ❌ | N/N testes passando |
| INV-007 — estrutura de planos de ação completa | ✅ / ❌ | N/N testes passando |
| INV-008 — estrutura de briefing completa | ✅ / ❌ | N/N testes passando |

---

## 10. Veredicto Final

| Campo | Valor |
|---|---|
| **Status** | ✅ CONCLUÍDO / ⚠️ CONCLUÍDO COM RESSALVAS / ❌ ABORTADO |
| **Critérios de aceite atendidos** | N/N |
| **Bloqueios remanescentes** | Nenhum / [descrição] |
| **Próxima ação recomendada** | [o que fazer a seguir] |

---

## 11. Lições Aprendidas

Registre o que esta execução ensinou — sobre o produto, sobre o processo ou sobre o playbook. Esta seção alimenta a evolução do playbook de referência.

> [Escreva aqui as lições. Seja direto e específico. Evite generalidades.]

---

*Playrun gerado em [DATA]. Executor: [NOME]. Playbook de referência: [NOME DO PLAYBOOK].*
*Para abrir uma issue com base neste playrun, use o template em [`.github/ISSUE_TEMPLATE/structural-fix.md`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/.github/ISSUE_TEMPLATE/structural-fix.md).*
