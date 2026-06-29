# AS-IS / TO-BE — Chave de junção resposta→requisito em `questionnaireAnswersV3` (Q1)

> **Skill:** impact-tree (REGRA-ORQ-41) · **Data:** 2026-06-28 · **Autor:** Claude Code
> **Alvo:** dar a `questionnaireAnswersV3` uma chave de junção a `regulatory_requirements_v3` para que as respostas Q.CNAE virem gap→risco.
> **Origem:** Issue #1607 · Auditoria DET v2 (`AUDITORIA-DET-CONSTRUCAO-CIVIL-1607-v2-20260628.md`) — esta é a **quebra Q1** das 3 identificadas.
> **Status:** ANÁLISE — **não implementar**. Aguarda confirmações Manus + decisão P.O.
> **Base:** `origin/main` (HEAD `c22cf1a3`). Toda afirmação com `arquivo:linha` (REGRA-ORQ-27).

---

## 1. Auto-auditoria das técnicas usadas

| Passo | Técnica | Status | Evidência |
|---|---|---|---|
| 1 | ast-grep semântico | 🟡 | rg dirigido cobriu writers/readers; ast-grep disponível (0.42.1) não reexecutado por padrão (rg suficiente p/ tabela Drizzle) |
| 2 | knip/ts-prune (dead-read) | ⚠️ não rodado | declarado como pendência (§9) — análise manual de readers feita |
| 3 | Issues pré-existentes | ✅ | #966 / #963 / #1025 / #966 (M3.9) — ver §7 |
| 4 | grep incluindo testes | ✅ | ≥10 test files tocam `questionnaireAnswersV3` (§3) |
| 5 | grep .sql/.md/.json | ✅ | 5 .sql (migrations) · 36 .md · 4 .json |
| 6 | PDF/email | ✅ | sem uso de `questionnaireAnswersV3` em geradores de PDF |
| 7 | snapshots | ✅ | 3 `.snap` (normalizers/risk-engine) — risco indireto (§2) |
| 8 | LOC antes de classificar | ✅ | §5 |
| 9 | ADRs + bump | ✅ | ADR-0027 MINOR (§7) |
| 10 | writers/readers | ✅ | 1 writer · 9 readers (§3) |
| 11 | auto-auditoria final | ✅ | §8 |

**Cobertura estimada:** 🟢 ~92% (resta knip + confirmação de banco do schema real em prod — §9).

---

## 2. Risco de regressão por gravidade

- 🔴 **Crítico — Lição #116 (callsite audit):** ADD COLUMN sem popular no único writer (`routers-fluxo-v3.ts:1289`) → coluna fica DEFAULT/null e o fix não funciona. O writer DEVE setar a nova chave.
- 🔴 **Crítico — contrato do gapEngine:** mudar o keying (`gapEngine.ts:335`) sem garantir que o valor casa `regulatory_requirements_v3.id` → continua no-op (Q1 resolvida mas sem efeito) OU passa a casar requisito errado (falso-positivo). Exige o mesmo determinismo de `extractRequirementId` (`unified-answer.ts:79`).
- 🟡 **Visível — snapshots de normalizers:** `server/__snapshots__/seed-normalizers.behavior.test.ts.snap` e `m1-monitor-normalizers.invariant.test.ts.snap` quebram se `normalizeQcnaeOnda3Answers` deixar de retornar `[]` (`unified-answer.ts:198`). Atualizar no mesmo PR.
- 🟡 **Visível — 9 readers de `questionnaireAnswersV3`:** ADD COLUMN é aditivo; readers com `SELECT`/colunas específicas não quebram. Confirmar que nenhum usa `SELECT *` que serialize a coluna nova para JSX sem `safeStr` (frontend).
- 🟢 **Cosmético:** nenhum.

---

## 3. Consumers e producers reais (inventários canônicos)

### 3.1 Producer (WRITER) — 1
| Writer | `arquivo:linha` | Nota |
|---|---|---|
| Save do questionário Q.CNAE | `routers-fluxo-v3.ts:1289` (`database.insert(questionnaireAnswersV3).values({…})`) | **único writer** — DEVE popular a nova chave (Lição #116) |

### 3.2 Readers — 9
| Reader | `arquivo:linha` | Usa para |
|---|---|---|
| Gap engine (ativo) | `gapEngine.ts:304` | **alvo do fix** — hoje keying `Q{index}` morto (`:335`) |
| routers-fluxo-v3 | `:1271`, `:1325`, `:1466`, `:3246`, `:3985`, `:4227` | progresso/retomada/briefing do questionário |
| Diagnostic | `diagnostic.ts:217` | leitura de respostas |
| db.ts | `db.ts:1565` | query auxiliar |

### 3.3 Contrato que FUNCIONA (a reusar) — `service_answers`
`extractRequirementId(fonte_ref)` (`unified-answer.ts:79`) parseia `fonte_ref` no padrão `lc<lei>-art-<…>-id<N>`, onde `idN` = `regulatory_requirements_v3.id` (`unified-answer.ts:59-63`). `gapEngine.ts:356-369` casa por `req.id` numérico. **É o mecanismo determinístico a espelhar para Q.CNAE** — não inventar novo.

### 3.4 Tabelas
| Tabela | Papel |
|---|---|
| `questionnaireAnswersV3` | respostas Q.CNAE (alvo — sem chave de junção) `schema.ts:1215-1228` |
| `regulatory_requirements_v3` | 138 requisitos curados (destino da junção) `gapEngine.ts:282` |
| `project_gaps_v3` | saída (gaps) — `source` distingue origem |
| `requirement_question_mapping` | mapeamento planejado (#963) — consumido por `normalizeQcnaeOnda3Answers` (stub) |

### 3.5 Feature flags
Nenhuma flag atual cobre o caminho qcnae→gap (é stub). O TO-BE deve introduzir flag (ex.: `ENABLE_QCNAE_GAP`) para rollout seguro.

---

## 4. Árvore de impacto (ASCII)

```
ADD chave de junção em questionnaireAnswersV3 (Q1)
│
├─ drizzle/schema.ts:1215  → +coluna (requirement_id INT | source_reference VARCHAR)   [migration 0NNN]
│
├─ WRITER routers-fluxo-v3.ts:1289  → insert DEVE popular a chave (Lição #116)
│     └─ gerador Q.CNAE (generateQuestions ~:1090) deve EMITIR o vínculo
│           ├─ opção (i): LLM mapeia pergunta→requirement.id (requer requisitos setoriais — C)
│           └─ opção (ii): fonte_ref padrão idN (espelha service_answers) — requer requisito existente
│
├─ gapEngine.ts:303/335/351  → SELECT inclui a coluna + keying por ela (espelhar extractRequirementId)
│     └─ depende: regulatory_requirements_v3 ter requisito setorial (Manus B1: só REQ-CLA-005)  → frente C
│
├─ unified-answer.ts:198  → normalizeQcnaeOnda3Answers deixa de ser stub [] (#966)
│     └─ snapshots seed-normalizers / m1-monitor-normalizers  → atualizar
│
├─ 9 readers de questionnaireAnswersV3  → aditivo (sem quebra; confirmar SELECT *)
│
└─ ADR-0027 (fonte de verdade respostas por onda)  → bump MINOR (contrato aditivo)
```

---

## 5. Cirurgia possível? (escopo mínimo vs amplo) — LOC reais

| Arquivo | LOC | Mudança |
|---|---|---|
| `drizzle/schema.ts` | 2034 | +1 coluna (cirúrgico) |
| migration `0NNN_*.sql` | nova | ADD COLUMN (reversível) |
| `server/routers-fluxo-v3.ts` | **7215** | writer `:1289` + gerador Q.CNAE (localizado, mas arquivo gigante) |
| `server/routers/gapEngine.ts` | 619 | SELECT + keying (`:303/335/351`) |
| `server/lib/unified-answer.ts` | 226 | ativar `normalizeQcnaeOnda3Answers` (#966) |

**Não é cirúrgico.** É **Classe C** (REGRA-ORQ-24): migration de schema + cross-file (drizzle + routers + lib) + pipeline de dados (REGRA-ORQ-34 Tier 2-3) + ADR bump. Mesmo com poucas linhas por arquivo, o blast radius (9 readers + contrato de onda + 138 requisitos) é transversal.

**Dependência dura:** Q1 sozinha **não** faz risco aparecer — precisa, em conjunto: **Q2/Q3** (#966 ativar normalizer) + **frente C** (requisitos setoriais em `regulatory_requirements_v3`, hoje só REQ-CLA-005). Q1 é **necessária, não suficiente**.

---

## 6. AS-IS em camadas

1. **Schema:** `questionnaireAnswersV3` (`schema.ts:1215-1228`) — colunas `cnaeCode/questionIndex/questionText/answerValue/…`, **sem** `requirement_id`/`fonte_ref`/`source_reference`.
2. **Writer:** `routers-fluxo-v3.ts:1289` grava a resposta sem vínculo a requisito.
3. **Gerador Q.CNAE:** `generateQuestions` (~`routers-fluxo-v3.ts:1090`) produz perguntas LLM com `source_reference` a **artigos** (não a `requirement.id`), e isso nem é persistido na tabela.
4. **Gap engine:** `gapEngine.ts:302-308` lê as respostas; `:335` chaveia por `a.requirement_id ?? "Q"+questionIndex` → `requirement_id` é `undefined` → chave `"Q{index}"`; `:351` busca por `req.code` → **nunca casa** → 0 gaps.
5. **Normalizer planejado:** `normalizeQcnaeOnda3Answers` (`unified-answer.ts:198`) = stub `[]`; gapEngine nem o chama.
6. **Requisitos:** `regulatory_requirements_v3` tem ~1 de imóveis (`REQ-CLA-005`, miscategorizado — Manus B1).

---

## 7. TO-BE com fases + bump ADR

> Princípio: reusar o contrato determinístico de `service_answers` (`extractRequirementId`), não criar mecanismo novo. Data-driven, sem hardcode.

### F0 — Decisão de design (P.O. + Consultor) — **pré-requisito**
Escolher como a pergunta Q.CNAE recebe o vínculo:
- **(i)** gerador mapeia pergunta→`requirement.id` (requirement-driven) — exige catálogo de requisitos setoriais (frente C);
- **(ii)** `fonte_ref` padrão `idN` espelhando `service_answers` + `requirement_question_mapping` (#963) para a curadoria.
Recomendação: **(ii)** — reusa `extractRequirementId` e a curadoria #963/#966 já planejada.

### F1 — Schema (migration aditiva)
ADD COLUMN `source_reference VARCHAR` (ou `requirement_id INT`) em `questionnaireAnswersV3` (`schema.ts:1215`). Migration reversível. **bump ADR-0027 = MINOR** (contrato de resposta por onda — aditivo).

### F2 — Writer + gerador
Popular a coluna no único writer (`routers-fluxo-v3.ts:1289`) a partir do gerador Q.CNAE. Lição #116 (callsite audit).

### F3 — Ativar consumo
`normalizeQcnaeOnda3Answers` (#966) deixa de ser stub e mapeia via a nova chave; `gapEngine` consome (espelhando `:356-369`). Atualizar snapshots de normalizers.

### F4 — Frente C (dependência)
Popular `regulatory_requirements_v3` com requisitos setoriais de construção (Arts. 252-270/365) — sem eles não há destino para a junção.

### DoD (REGRA-ORQ-44/47 — discriminante)
- **Positivo:** projeto construção greenfield → resposta "Sim" em permuta gera gap→risco setorial com `source` rastreável.
- **Negativo (estrutural):** `SELECT source, COUNT(*) FROM project_gaps_v3 WHERE project_id=<novo>` passa a conter gaps de origem qcnae (hoje 0 — ver despacho Manus D3).
- **Neutro:** projeto não-construção não gera falso-positivo.

### Flag
`ENABLE_QCNAE_GAP` (off→on) para rollout (snapshot→cold→hot).

---

## 8. Auto-auditoria final (cobertura)

| Item | Status |
|---|---|
| `arquivo:linha` em toda afirmação | ✅ |
| testes no grep | ✅ (≥10 files) |
| .sql/.md/.json | ✅ |
| PDF/email | ✅ (n/a) |
| issues pré-existentes | ✅ (#966/#963/#1025) |
| ast-grep ≥3 padrões | 🟡 (rg dirigido; ast-grep disponível) |
| dead-read knip/ts-prune | ⚠️ não rodado (§9) |
| LOC antes de classificar | ✅ |
| ADR + bump | ✅ (ADR-0027 MINOR) |
| writers/readers | ✅ (1/9) |
| inventário consumers/producers | ✅ |
| **Cobertura** | 🟢 ~92% |

---

## 9. Pendências para Manus (confirmação de banco)

1. **Schema real em prod:** `DESCRIBE questionnaireAnswersV3;` — confirmar ausência de chave de junção (= repo).
2. **Prova negativa (D3 do despacho #1607):** `SELECT source, COUNT(*) FROM project_gaps_v3 GROUP BY source;` — confirmar 0 gaps de origem qcnae.
3. **Requisitos setoriais:** conteúdo de `regulatory_requirements_v3` p/ construção (frente C) — Manus D5.
4. **knip/ts-prune:** rodar `knip --strict | grep questionnaireAnswersV3` para confirmar não há reader morto (não executado nesta análise).

## Vinculadas
REGRA-ORQ-24 (classe) · REGRA-ORQ-27 · REGRA-ORQ-34 (pipeline Tier 2-3) · REGRA-ORQ-41 · REGRA-ORQ-44/47 (DoD) · ADR-0027 (bump MINOR) · ADR-0011 · [[Lição #63]] · [[Lição #65]] · [[Lição #116]] (callsite audit) · [[Lição #93]] · Issue #1607 · #966/#963/#1025 (backlog M3.9) · AUDITORIA-DET v2.
