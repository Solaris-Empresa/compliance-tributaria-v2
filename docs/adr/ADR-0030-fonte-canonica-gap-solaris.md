# ADR-0030 — Fonte Canônica de Gap SOLARIS · Arquitetura Max

**Status:** Aceito
**Data:** 01/06/2026
**Supersede:** ADR-0027 (Aceito 2026-04-10)
**Autores:** P.O. (Uires Tapajós) + Claude Code + Manus
**PRs de implementação:**
- Sprint 1 (FEAT-SOL-UX-01): #1316 (PR-A migration `resposta_opcao`) · #1317 (PR-B Zod + rota `solarisObjetivo`) · #1318 (PR-C frontend RadioGroup) · #1321 (FIX-01 G17 lê `resposta_opcao`) · #1322 (FIX-04 briefing filtro dual-column)
- Sprint 2 (FASE A): #1323 (FIX-05 migration `gap_descricao`) · #1324 (FIX-06 Zod `risk_category_code` obrigatório em CREATE)
- Sprint 2 (FASE B): #1325 (FIX-08 G17 arquitetura Max)
- Sprint 2 (FASE C): #1326 (FIX-09 IAGEN arquitetura Max) · #1327 (FIX-12 métrica de confiança qualidade) · #1328 (FIX-10 deletar dicionários) · **#FIX-11 (este PR)**

> **NOTA SOBRE NÚMERO DO ADR:** despacho P.O. FIX-11 (2026-06-01) referenciava "ADR-0028", mas esse número JÁ ESTAVA OCUPADO (`ADR-0028-categorizacao-onda2-iagen.md` desde 2026-04-10). Próximo livre verificado empiricamente: **0030** (0027/0028/0029 ocupados). Despacho ajustado sem perda de conteúdo.

---

## Contexto

O **ADR-0027** (Aceito 2026-04-10) designava `analyzeGapsFromQuestionnaires` ("Z-11") como pipeline canônico de gaps para Ondas 1 (SOLARIS) e 2 (IAGEN). Z-11 lia `solaris_answers` + `iagen_answers` JOIN com a categoria canônica de cada onda e gerava gaps em `project_gaps_v3`.

**Z-11 nunca foi conectado em produção.** Confirmado empiricamente em 01/06/2026:
- `grep -rn "analyzeGapsFromQuestionnaires" server/ --include="*.ts"` retornou apenas matches no próprio arquivo + test file (zero callers externos)
- Issue #964 (M3.9 Item 4 — "Formalizar exclusão de `solaris_answers` do Gap Engine") OPEN desde maio/2026 confirmava a inconsistência arquitetural

O pipeline **real** em produção era `analyzeSolarisAnswers` ("G17"), que usava dicionários intermediários:
- `server/config/solaris-gaps-map.ts` (547 LOC, 76 tópicos hardcoded com `gap_descricao`, `area`, `severidade`)
- `server/config/topico-to-categoria.ts` (94 LOC, 25 mapeamentos hardcoded tópico → `risk_category_code`)

Estes dicionários exigiam **curadoria manual de dev** a cada nova pergunta SOLARIS criada pelo advogado — violando a constraint de **zero curadoria recorrente** declarada pelo P.O. em 01/06/2026.

**Cobertura efetiva** com MAP: ~60% no projeto 4920001 (15 tópicos sem entrada no MAP geravam warnings e nenhum gap). Após arquitetura Max: 100% (depende apenas de o advogado preencher `risk_category_code` no upload — agora obrigatório via FIX-06).

---

## Decisão

1. **`solaris_answers.resposta_opcao`** (ENUM `sim`/`nao`/`nao_sei`/`nao_se_aplica`, migration 0120 — PR #1316) é a **fonte canônica** para decisão de gap SOLARIS.
   `solaris_answers.resposta` (TEXT) permanece como **evidência auditável** — alimenta briefing LLM, UX, fingerprint, gate Art. 168.

2. **G17 (`analyzeSolarisAnswers`)** usa arquitetura **"1 pergunta = 1 gap"** via campos diretos da pergunta:
   - `solaris_questions.risk_category_code` (obrigatório em CREATE via FIX-06)
   - `solaris_questions.severidade_base` (com fallback `'media'`)
   - `solaris_questions.gap_descricao` (com fallback `"Ausência: {titulo}"`)

3. **IAGEN (`analyzeIagenAnswers`)** usa **mesmo padrão de metadados diretos**, mantendo `resposta` (TEXT) como fonte canônica (sem `resposta_opcao` em `iagen_answers` — perguntas dinâmicas LLM, sem tabela curada equivalente). `iagen_answers.risk_category_code` é preenchido pelo LLM na geração (`categoryAssignmentMode='llm_assigned'`).

4. **Dicionários intermediários eliminados** (`SOLARIS_GAPS_MAP`, `topico-to-categoria`). Nova pergunta SOLARIS via UI admin (PR #1319) → gap automático sem curadoria de dev.

5. **Z-11 (`analyzeGapsFromQuestionnaires`) eliminado** neste PR. Issue #964 encerrada como `won't fix` — Z-11 nunca foi conectada e arquitetura Max torna sua premissa obsoleta. ADR-0027 supersedido por este documento.

6. **Métrica de confiança SOLARIS (Q1)** mede **participação diagnóstica** (`q1RespostasComCategoria / q1TotalPerguntas` — FIX-12), não completude bruta (`q1Respostas / q1TotalPerguntas`). Endereça inflação artificial de ~14% no score documentada pela auditoria Manus do projeto 4920001.

---

## Consequências

| Item | Resultado |
|---|---|
| Curadoria recorrente de dev | ✅ Zero — eliminado |
| Cobertura SOLARIS | ✅ 100% (era ~60% pré-arquitetura Max) |
| LOC morto eliminado (Sprint 2) | ✅ **−983 LOC** (MAP 547 + topico 94 + Z-11 342) + 30 tests obsoletos |
| Nova pergunta via UI → gap | ✅ Automático (FIX-08 + FIX-09 + FIX-06 obriga `risk_category_code`) |
| `gap_descricao` NULL | ⚠️ Fallback `"Ausência: {titulo}"` (aceitável — perguntas legadas) |
| Pergunta sem `risk_category_code` | ⚠️ Skip + warn (não crash) — REGRA-ORQ-29 |
| Métrica de confiança Q1 | ✅ Participação diagnóstica (FIX-12) |
| **ADR-0027** | ❌ **Supersedido por ADR-0030 (este)** |
| **Issue #964** | ❌ **Encerrada como `won't fix`** — premissa obsoleta |

---

## Atualização do ADR-0027

`docs/adr/ADR-0027-fonte-verdade-respostas-por-onda.md` recebe cabeçalho:

```
**Status:** Supersedido por ADR-0030 (01/06/2026)
```

ADR-0027 permanece arquivado para rastreabilidade histórica (padrão do projeto — ADRs nunca são deletados).

---

## Decisões intencionais (não reverter)

| Decisão | Por que mantida |
|---|---|
| `resposta` (TEXT) preservada | Evidência probatória jurídica (P.O. decisão F0-1) — não vira gap mas alimenta briefing |
| `resposta_opcao` opcional em UPDATE | Edição parcial via UI admin (PR #1319) — preserva fluxo de correção |
| IAGEN usa apenas `resposta` (TEXT) | Perguntas dinâmicas LLM — não há equivalente de `resposta_opcao` |
| Fallback `"Ausência: {titulo}"` para `gap_descricao` NULL | Suaviza migração — perguntas legadas continuam gerando gap |
| `risk_category_code` obrigatório só em CREATE | UPDATE preserva edição parcial (FIX-06) |

---

## Vinculações

- **REGRA-ORQ-29** (sem requisito = sem pergunta) — operacionalizada via skip + warn quando `risk_category_code` ausente
- **REGRA-ORQ-32** (no hardcode — visão sistêmica) — 641 LOC de dicionários eliminados
- **REGRA-ORQ-31** (meta 98% confiabilidade) — métrica de confiança Q1 deixa de inflar artificialmente
- **Lição #59 / #65** (assemble ≠ consumption / fluxo end-to-end) — auditoria 4920001 expôs lacuna entre PR-A/B/C entregues e G17 consumindo
- **Lição #61** (metadado determinístico antes da pergunta) — `risk_category_code` curado pelo advogado no upload
- **Lição #66** (spec sem dados = ilusão) — ADR-0027 era spec sem implementação real
- **Lição #117** (registrar lição ≠ aplicar fix) — caso canônico documentado: PR-A/B/C entregaram a coluna; G17 só consumiu após FIX-08
- **Post-mortem** `docs/governance/post-mortems/2026-05-05-mono-fonte-matriz-riscos.md` — contexto histórico do M3.10 Fix B (intermediário entre arquitetura legada e arquitetura Max)
- **Issue #964** (M3.9 Item 4) — alinhamento conceitual: Z-11 não era necessária
