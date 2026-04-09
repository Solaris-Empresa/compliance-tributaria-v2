# Auditoria — Fluxo E2E Rastreabilidade Completa
## Cruzamento contra: varredura Manus · estado canônico · Sprint Z-07
## 2026-04-09 · HEAD f8a5864

---

## Resumo executivo

| Severidade | Quantidade | Impacto |
|---|---|---|
| 🔴 Crítico | 3 | Afeta Sprint Z-07 diretamente |
| 🟡 Importante | 4 | Informação incorreta ou incompleta |
| 🟢 Menor | 2 | Cosmético / imprecisão de referência |

**Veredicto:** documento é confiável como AS-IS do fluxo atual, mas tem 3 gaps críticos que afetam o planejamento da Sprint Z-07.

---

## 🔴 CRÍTICO-01 — Gap Engine ausente no diagrama

**O que o documento diz:**
```
gaps → briefing
gaps → riscos
```

**O que o código realmente faz:**
```
consolidadores → gap analyzers → GapConfirmed[] → briefing/riscos
```

**Os arquivos que o documento omitiu completamente:**
```
server/gapEngine.ts
server/lib/engine-gap-analyzer.ts
server/lib/solaris-gap-analyzer.ts
server/lib/iagen-gap-analyzer.ts
server/lib/risk-categorizer.ts   ← crítico para Z-07
```

**Por que é crítico para Z-07:**
O `risk-engine-v4.ts` recebe `GapConfirmed[]` como entrada — não recebe
dados brutos dos consolidadores. Esses `GapConfirmed[]` vêm do gap engine,
não diretamente dos consolidadores.

Se o Claude Code implementar o engine sem entender este passo intermediário,
vai criar interfaces erradas e o swap vai falhar na integração com o router.

**Correção no diagrama:**
```
gaps → [gap-analyzers] → GapConfirmed[] → briefing
                      → GapConfirmed[] → risk-engine-v4 (Z-07)
```

---

## 🔴 CRÍTICO-02 — AUDIT-C-004 omitido: Score CPIE com decisão pendente

**O que o documento diz:**
```
Score CPIE — 0–100 — calculado a partir dos gaps e completude
→ apresentado como feature completa e funcionando
```

**O que o estado real é:**
```
AUDIT-C-004 (aberto): Score CPIE backend — decisão P.O. pendente
Opção A vs Opção B ainda não decidida
```

**Por que é crítico:**
O documento apresenta o Score CPIE como output resolvido.
Na prática há uma decisão de arquitetura pendente sobre como ele é calculado.
Qualquer implementação que dependa do Score CPIE para a Z-07 pode partir
de uma premissa errada.

**Correção:**
Adicionar nota: `⚠️ AUDIT-C-004 aberto — cálculo do Score CPIE aguarda decisão P.O. (Opção A vs B)`

---

## 🔴 CRÍTICO-03 — 4 áreas como estado final (não é — Z-07 substitui)

**O que o documento diz:**
```
generateRiskMatrices: "4 áreas · RAG por área"
Plano de Ação: "(4 áreas · prioridade · prazo)"
```

**O que a Sprint Z-07 define:**
```
DEC-R-01: As 4 áreas (Contabilidade, Negócio, TI, Jurídico) são
          substituídas por 10 categorias RAG da LC 214/2025
```

**Por que é crítico:**
O documento descreve as 4 áreas como arquitetura atual sem sinalizar
que serão eliminadas na Sprint Z-07. Um desenvolvedor lendo este documento
pode implementar baseado nas 4 áreas, gerando código incompatível com o v4.

**As 10 categorias que substituem:**
```
imposto_seletivo · confissao_automatica · split_payment
inscricao_cadastral · regime_diferenciado · transicao_iss_ibs
obrigacao_acessoria · aliquota_zero · aliquota_reduzida · credito_presumido
```

**Correção:**
```
generateRiskMatrices: "4 áreas · RAG por área [AS-IS — Sprint Z-07 substitui por 10 categorias LC 214]"
```

---

## 🟡 IMPORTANTE-01 — Contagem de chunks RAG divergente

**O que o documento diz:** `2.509 chunks · 10 leis`

**O que outros documentos dizem:**
- BASELINE-PRODUTO.md (memória): `2.454 chunks`
- Varredura Manus (HEAD f8a5864): `2.509 chunks`

**Análise:** a varredura foi feita no HEAD correto (f8a5864). O número 2.509 é provavelmente o correto para este HEAD. O número 2.454 pode ser de um HEAD anterior.

**Ação:** confirmar com query SQL: `SELECT COUNT(*) FROM rag_chunks`
**Risco:** baixo — não afeta implementação, afeta documentação.

---

## 🟡 IMPORTANTE-02 — riskEngine.ts sem consumidor ativo não sinalizado

**O que o documento diz:**
```
🏗️ Risk Engine — server/riskEngine.ts
Engine matemático de cálculo de risco (probability × impact = risk_score)
```

**O que a varredura revelou:**
```
Frontend usa APENAS Engine v2 (generateRiskMatrices)
O riskEngine.ts NÃO tem consumidor ativo no frontend
```

**Por que é importante:**
O documento apresenta o riskEngine.ts como infraestrutura ativa, mas ele
está essencialmente sem uso no produto atual. Isso confunde o planejamento
de quem vai implementar — pode parecer que o v4 precisa ser compatível
com o riskEngine.ts quando na verdade o alvo é o Engine v2.

**Correção:**
```
🏗️ Risk Engine — server/riskEngine.ts
Engine matemático [SEM CONSUMIDOR ATIVO no frontend — substituído pelo
Engine v2 (generateRiskMatrices). Sprint Z-07 consolida em engine único.]
```

---

## 🟡 IMPORTANTE-03 — SOLARIS: "20 perguntas" pode estar desatualizado

**O que o documento diz:**
```
Questionário estratégico de 20 perguntas sobre o negócio
```

**O que o estado canônico diz:**
```
24 perguntas ativas (SOL-013..036) — pós Sprint P
```

**Ação:** confirmar com: `SELECT COUNT(*) FROM solaris_questions WHERE ativo = 1`

---

## 🟡 IMPORTANTE-04 — Shadow Mode ausente no fluxo

**O que o documento mostra:** fluxo principal sem Shadow Mode

**O que existe no código:**
```
server/diagnostic-shadow/logger.ts
server/diagnostic-shadow/readers.ts
server/diagnostic-shadow/shadow.ts
server/diagnostic-shadow/types.ts
```

O Shadow Mode (`DIAGNOSTIC_READ_MODE=shadow`) é um modo de leitura paralela
que afeta como o diagnóstico é calculado — está em `server/diagnostic-source.ts`.

**Por que importa para Z-07:**
O shadow validation que precisamos fazer antes do hot-swap interage com
este sistema. Não documentá-lo cria um risco de conflito.

---

## 🟢 MENOR-01 — Link inválido no RAG

**O que o documento tem:**
```
server/rag.ts | Lgrep | [→ GitHub](...#Lgrep)
```

`Lgrep` não é um número de linha — é um artefato da geração automática.
O link aponta para uma âncora inválida.

**Correção:** remover o `#Lgrep` da URL ou substituir pelo número real da linha principal do rag.ts.

---

## 🟢 MENOR-02 — Procedures duplicadas na tabela de infraestrutura

O RAG Engine e CNAE Embeddings aparecem duas vezes:
- Uma vez na "Tabela de Rastreabilidade E2E"
- Uma vez na "Infraestrutura de Suporte"

Redundância sem valor — pode ser consolidado.

---

## O que está correto e bem feito

```
✅ Todas as procedures tRPC mapeadas com linhas corretas
✅ Fixes FIX_01, FIX_02, FIX_03 documentados com PR correto (#414)
✅ HEAD f8a5864 — correto e verificável
✅ URLs GitHub com hash de commit — imutáveis e auditáveis
✅ generateRiskMatrices em L1113 — correto (alvo do hot-swap)
✅ Tabelas do banco corretas (project_risks_v3, rag_chunks, etc.)
✅ Gate BUG-BRIEFING-01 documentado
✅ Auto-save FIX_03 e FIX_02 (8 operationTypes) corretos
✅ Fluxo de aprovação (approveMatrices, approveActionPlan) presente
```

---

## Ações recomendadas antes da Sprint Z-07

| Prioridade | Ação | Responsável |
|---|---|---|
| 🔴 Agora | Adicionar gap engine ao diagrama (solaris-gap-analyzer, iagen-gap-analyzer) | Manus atualiza doc |
| 🔴 Agora | Marcar 4 áreas como AS-IS · sinalizar substituição por 10 categorias Z-07 | Manus atualiza doc |
| 🔴 Antes do PR #A | Resolver AUDIT-C-004 (Score CPIE Opção A vs B) | P.O. decide |
| 🟡 Antes do PR #A | Confirmar contagem de chunks RAG via SQL | Manus executa |
| 🟡 Antes do PR #A | Confirmar contagem SOLARIS questions via SQL | Manus executa |
| 🟡 Informativo | Marcar riskEngine.ts como sem consumidor ativo | Manus atualiza doc |

---

## Fluxo corrigido (trecho crítico)

```
ANTES (documento):
  [Consolidadores] → gaps → [generateRiskMatrices]

CORRETO:
  [Consolidadores]
       ↓
  [Gap Engine]
  solaris-gap-analyzer.ts
  iagen-gap-analyzer.ts
  engine-gap-analyzer.ts
  risk-categorizer.ts        ← CRÍTICO para Z-07
       ↓
  GapConfirmed[]             ← este é o input do risk-engine-v4.ts
       ↓
  [generateRiskMatrices]     ← AS-IS: LLM + 4 áreas
  [risk-engine-v4.ts]        ← TO-BE: determinístico + 10 categorias
```

---

*Auditoria realizada pelo Orquestrador (Claude Browser)*
*Cruzado contra: VARREDURA-SISTEMA-RISCOS.md · VARREDURA-CONSUMERS-RISCOS.md*
*· estado canônico da memória · documentos Sprint Z-07*
*2026-04-09*
