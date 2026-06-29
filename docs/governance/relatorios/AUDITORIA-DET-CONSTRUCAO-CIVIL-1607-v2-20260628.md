# Auditoria DETERMINÍSTICA v2 — Construção Civil (Issue #1607)

> **Correção da v1.** A v1 relatou a conclusão empírica do Manus ("`requirement_question_mapping` vazia = CR-03") sem verificar na **fonte da verdade (código)** se essa tabela é sequer lida pelo pipeline ativo. **Era red herring.** Esta v2 rastreia o caminho real no código (REGRA-ORQ-36 T1/T4 + ast-grep/git-grep) e enquadra na **meta de 98% (REGRA-ORQ-31)**.
>
> **Data:** 2026-06-28 · **Autor:** Claude Code · **Base:** `origin/main` (HEAD no momento `c22cf1a3`) · **Método:** determinístico — toda afirmação com `arquivo:linha`. Fatos de banco → despacho Manus (§5).

---

## 1. ROOT CAUSE DETERMINÍSTICA (fonte da verdade)

**O pipeline ativo de risco descarta 100% das respostas do questionário Q.CNAE — por falta de chave de junção, não por tabela vazia.**

Cadeia verificada:

1. **Pipeline ativo:** `risks-v4.ts:133/838/1024` → `generateRisksV4Pipeline` (`generate-risks-pipeline.ts:69`) → gaps de `gapEngine.analyzeGaps` (`risks-v4.ts:860` "1. gapEngine.analyzeGaps → result.gaps").

2. **`gapEngine.analyzeGaps`** (`gapEngine.ts:254`):
   - carrega requisitos de `regulatory_requirements_v3` (`:282-292`), chaveados por `req.code` (`:350`);
   - carrega respostas de `questionnaireAnswersV3` (`:302-308`) — SELECT traz só `id, cnaeCode, questionIndex, questionText, answerValue`;
   - monta `answerMap` com chave `reqId = a.requirement_id ?? "Q"+questionIndex` (`:335`).

3. **A coluna `requirement_id` NÃO EXISTE** em `questionnaireAnswersV3` (schema `drizzle/schema.ts:1215-1228` — colunas: `id, projectId, cnaeCode, cnaeDescription, level, roundIndex, questionIndex, questionText, questionType, answerValue, answeredAt, updatedAt`). Logo `a.requirement_id` é sempre `undefined` → a chave vira **`"Q0".."Q16"`**.

4. **A busca é por `req.code`** (`gapEngine.ts:351`: `answerMap.get(req.code)`, ex. `"REQ-CLA-005"`). `"REQ-CLA-005"` nunca é igual a `"Q9"` → **`answerData` é sempre `undefined` para respostas Q.CNAE** → as 17 respostas (9 "Sim": permuta, locação, órgãos públicos, ativos não circulantes, ITBI/ITCD) geram **ZERO gaps**.

5. **Único match que funciona:** `service_answers` padrão `idN` via `extractRequirementId` (`gapEngine.ts:356-369`), que casa por `req.id` numérico. Q.CNAE não tem `fonte_ref` nem id numérico → fora dessa rota também.

6. **O caminho planejado (M3.9) está duplamente inerte:** o normalizer que deveria mapear Q.CNAE→requisito, `normalizeQcnaeOnda3Answers` (`unified-answer.ts:198`), é **stub que retorna `[]`**; e o `gapEngine` **nem o chama** (0 referências). Esse normalizer consumiria `requirement_question_mapping` (#963) — por isso a tabela é relevante para o caminho **planejado**, mas hoje é inerte por (6) + por não estar populada.

**Conclusão — TRÊS quebras independentes (todas na fonte da verdade):**
- **Q1.** `questionnaireAnswersV3` sem coluna de junção a requisito → keying `Q{index}` morto (`schema.ts:1215-1228` + `gapEngine.ts:335/351`).
- **Q2.** Normalizer planejado é stub `[]` (`unified-answer.ts:198`).
- **Q3.** `gapEngine` não chama o normalizer (0 refs) + `requirement_question_mapping` não populada (#963).

As respostas Q.CNAE são **estruturalmente indescobríveis** pelo motor de risco. Os 2 riscos de imóveis que aparecem (conf 0.64) vêm **exclusivamente** de `inferNormativeRisks` (gate CNAE 41xx, `normative-inference.ts:227-258`), **não do questionário**. **O Q.CNAE é decorativo** para geração de risco. Issues que já rastreiam o caminho M3.9: **#966** (ativar `normalizeQcnaeOnda3Answers`), **#963** (popular `requirement_question_mapping`), **#1025** (gaps `source='v1'`).

---

## 2. CORREÇÃO do diagnóstico do Manus (Lição #93)

| Afirmação Manus (EVIDENCIA-1607) | Verificação na fonte da verdade | Veredito |
|---|---|---|
| **CR-03:** `requirement_question_mapping` vazia desliga pergunta→risco | A tabela é lida em `db-requirements.ts:201/308` e `gapRouter.ts:69` (motor separado) e seria consumida pelo normalizer planejado `normalizeQcnaeOnda3Answers` (`unified-answer.ts:198`, hoje stub `[]`). O `gapEngine` ativo **não** a referencia (grep=0). | 🟡 **Parcial, não pura causa.** É a camada de dados do caminho **planejado-mas-stubbed** (#963→#966) — necessária mas **insuficiente**: faltam Q1 (coluna de junção) + Q2/Q3 (ativar o normalizer no gapEngine). Populá-la sozinha (#963) **não** faz risco aparecer. |
| **CR-01:** taxRegime null bloqueia regras | `normative-inference.ts:230` gate `!== "simples_nacional"` → `null` passa; os 2 riscos de imóveis dispararam (Bloco 6) **apesar** do null. | ⚠️ Bug real, **não bloqueou** este caso (só falso-positivo p/ Simples). |
| **CR-02:** `op:servicos` impede setorial | breadcrumb é rótulo (`risk-engine-v4.ts:363`); gate é CNAE. | ⚠️ Cosmético (já refutado v1). |
| 17 perguntas geradas, 9 "Sim", risk_categories existem | Consistente com o código (Q.CNAE LLM gera + persiste em `questionnaireAnswersV3`). | ✅ Fato — mas as respostas **não têm como** virar risco (item §1). |

**A causa-raiz não é "dados de curadoria faltando numa tabela" — é arquitetura: o schema de respostas Q.CNAE não carrega o requisito.** Isso é mais profundo e afeta TODO projeto, não só construção.

---

## 3. ENQUADRAMENTO NA META DE 98% (REGRA-ORQ-31) — o que eu havia esquecido

A meta de 98% de confiabilidade tem gate em DOIS pontos verificados:
- **Cobertura de briefing:** `briefingEngine.ts:11` ("coverage = 100% obrigatório"), `:244` (critério B7-02), `:75` (`coverage_percent`).
- **Qualidade de pergunta:** `product-questions.ts:78/145`, `tracked-question.ts:70` ("não emitir perguntas com falsa autoridade legal — REGRA-ORQ-31 meta 98%").

**Nenhum gate mede completude SETORIAL de requisitos.** O `coverage` é calculado sobre os requisitos que **existem** em `regulatory_requirements_v3`. Como há ~1 requisito de imóveis (Manus B1: `REQ-CLA-005`, miscategorizado como `imposto_seletivo`), um projeto de construção pode atingir "coverage 100%" dos requisitos existentes e **ainda assim não cobrir nenhum dos 13 riscos do Dr. José**.

> **Red flag de viabilidade em termos de 98%:** o número de confiança é calculado sobre um denominador incompleto. 98% de cobertura de um conjunto de requisitos que não contém o setor = **98% de quase nada**, para construção. O gate de 98% é estruturalmente cego à ausência de requisitos setoriais.

---

## 4. O VERDADEIRO PLANO (data-driven, anti-hardcode, rumo aos 98%)

| # | Correção (fonte da verdade) | Onde | Aprovação |
|---|---|---|---|
| **A (P0)** | Dar a `questionnaireAnswersV3` uma **chave de junção a requisito** (coluna `requirement_id` OU `source_reference`/`fonte_ref` idN) e fazer o `gapEngine` casar por ela. Sem isso, **nenhuma** resposta Q.CNAE vira risco — em qualquer setor. | `drizzle/schema.ts:1215` + `gapEngine.ts:303/335/351` + gerador de perguntas Q.CNAE | bug arquitetural — P.O. (toca schema) |
| **B (P0)** | CR-01: fallback `companyProfile.taxRegime` em `extractProjectProfile:190` (DoD discriminante SN). | `project-profile-extractor.ts:190` | bug fix |
| **C (P1)** | Popular `regulatory_requirements_v3` com requisitos setoriais de construção (Arts. 252-270, 365) + `risk_category_code` correto (hoje só REQ-CLA-005, miscategorizado). | seed `regulatory-requirements-seed` (fora deste repo) | P.O. + Jurídico |
| **D (P2)** | Corrigir `cnaeGroups` errados no corpus (decreto12955 360-372 vazio; resolucao_cgibs_6 365 agro; lc214 redutor financeiro). | corpus | P.O. + Jurídico ([[Lição #133]]) |
| **E (P2)** | Estender o gate de 98% para medir **completude setorial** (denominador = requisitos aplicáveis ao CNAE), não só coverage dos existentes. | `briefingEngine.ts` + novo gate | P.O. |

> **`requirement_question_mapping` (CR-03 Manus) NÃO entra** — não está no pipeline ativo. Se for para usá-la, é decisão de unificar motores (gapRouter vs gapEngine), não fix de construção.

---

## 5. DESPACHO MANUS — confirmações de BANCO (o que não está no repo)

Ver bloco no comentário da Issue #1607. Itens: schema real de `questionnaireAnswersV3` em prod (DESCRIBE); conteúdo de `regulatory_requirements_v3` (construção); prova empírica de que o caminho qcnae→gap nunca produziu gap (`SELECT source, COUNT(*) FROM project_gaps_v3`); fonte_ref de `service_answers` do 10680001.

---

## 6. Auto-auditoria (determinismo)

| Item | Status | Evidência |
|---|---|---|
| Toda afirmação com `arquivo:linha` | ✅ | §1, §2, §3 |
| Pipeline ativo rastreado (T1) | ✅ | risks-v4 → generate-risks-pipeline → gapEngine |
| Writers/readers de `requirement_question_mapping` (T4) | ✅ | db-requirements/gapRouter (separado); gapEngine não usa |
| Schema verificado (não inferido) | ✅ | `drizzle/schema.ts:1215-1228` |
| Gate 98% localizado | ✅ | briefingEngine/product-questions/tracked-question |
| Fatos de banco isolados p/ Manus | ✅ | §5 (seed fora do repo) |
| **Cobertura** | 🟢 ~95% | resta confirmação DB (§5) |

## 7. Vinculadas
REGRA-ORQ-27 (assemble≠consumption) · REGRA-ORQ-31 (98%) · REGRA-ORQ-36 (T1/T4) · REGRA-ORQ-41 · [[Lição #59]] · [[Lição #63]] (questionnaireAnswersV3 0% mapeável — confirmada aqui em código) · [[Lição #93]] (mecanismo verificado) · [[Lição #133]] · [[Lição #142]] · Issue #1607 · EVIDENCIA-1607 (Manus) · Issue #963 (motor gapRouter, não o ativo).
