# SPEC-1028 — Q.CNAE: fonte única regulatório + UX de gap

**Status:** PROPOSTA — aguarda autorização P.O.
**Data:** 2026-05-08
**Issue:** [#1028](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/1028)
**Autor:** Claude Code (orquestrador) com base em diagnóstico empírico Manus
**Classe (REGRA-ORQ-24):** A — cirúrgica (≤50 LOC, ≤2 arquivos, 1 procedure)

---

## 1. Contexto

A FASE 1 da Issue #1028 destravou o pipeline Q.CNAE em 2026-05-07T15:12 UTC (PR #1029, mergeado). Auditoria empírica pós-merge (Manus, projeto 4800002) confirmou:

- ✅ Cache populado em runtime (4 rows × 34 perguntas = 136 perguntas)
- ✅ Pipeline RAG → LLM → DB funcional
- ✅ ZERO alucinação (16/16 source_references validadas no corpus)
- ⚠️ Composição mista por CNAE: 24 SOLARIS + 7-10 regulatório + 1-3 ia_gen
- ⚠️ Gate `hasGap` defunto pós-fix #1020 — `CnaeGapBanner` é dead code em produção

Decisão P.O. (2026-05-08): Q.CNAE deve ter **fonte única regulatório baseada em RAG**, e exibir mensagem clara quando não houver requisito regulatório para o CNAE.

## 2. Diagnóstico empírico

### 2.1 Composição atual por CNAE (🔴 Empírico — Manus 2026-05-08)

| CNAE | Nível | SOLARIS | regulatório | ia_gen | Total |
|---|---|---|---|---|---|
| 4930-2/03 | nivel1 | 24 | 7 | 3 | 34 |
| 4681-8/01 | nivel1 | 24 | 9 | 1 | 34 |
| 8299-7/99 | nivel1 | 24 | 7 | 3 | 34 |
| 4930-2/03 | nivel2 | 24 | 10 | 0 | 34 |

### 2.2 Razões para o problema

| # | Causa | Evidência |
|---|---|---|
| 1 | `injectOnda1IntoQuestions` força 24 SOLARIS universal em todo CNAE | `server/routers-fluxo-v3.ts:737-741` |
| 2 | Schema `QuestionSchema` permite `fonte=ia_gen` + `source_reference=""` | `server/ai-schemas.ts:146-148` |
| 3 | Prompt LLM autoriza explicitamente `ia_gen` quando RAG insuficiente | `server/routers-fluxo-v3.ts:705-710` |
| 4 | Gate `hasGap` é AND (RAG=0 AND SOLARIS=0) — pós-fix #1020, SOLARIS sempre 24 → gate nunca dispara | `server/routers-fluxo-v3.ts:679` |

### 2.3 Por que isso é problemático

- **Mistura conceitual:** SOLARIS (template universal) + Regulatório (RAG-ancorado) + ia_gen (inferência) coexistem sem distinção visual clara
- **Violação REGRA-ORQ-29 silenciosa:** 2.9% das perguntas têm `source_reference=""` (3 ia_gen por projeto)
- **CnaeGapBanner inacessível:** componente existe mas nunca renderiza — usuários nunca recebem mensagem clara sobre gaps de cobertura
- **Confiança jurídica diluída:** 24 perguntas universais SOLARIS em CNAE específico de Combustíveis aparecem como diagnóstico setorial (não são)

## 3. Spec técnica

### 3.1 Escopo

| Arquivo | Linhas afetadas | Tipo de mudança |
|---|---|---|
| `server/routers-fluxo-v3.ts` | 679-686, 705-710, 727-743 | Lógica + prompt |
| `client/src/components/CnaeGapBanner.tsx` | corpo do banner | Texto |

**Total estimado:** ~40 linhas em 2 arquivos.

### 3.2 Mudanças backend

#### M1 — Gate hasGap apenas em RAG

**Localização:** `server/routers-fluxo-v3.ts:677-686`

**Antes:**
```typescript
const onda1ForGapCheck = await getOnda1Questions(input.cnaeCode);
const ragArticlesCount = ragCtx?.articles?.length ?? 0;
if (ragArticlesCount === 0 && onda1ForGapCheck.length === 0) {
  console.log(`[generateQuestions] hasGap=true cnae=${input.cnaeCode} (RAG=0 + SOLARIS=0)`);
  return {
    questions: [],
    hasGap: true as const,
    motivo: 'cnae_sem_legislacao_especifica' as const,
  };
}
```

**Depois:**
```typescript
const ragArticlesCount = ragCtx?.articles?.length ?? 0;
if (ragArticlesCount === 0) {
  console.log(`[generateQuestions] hasGap=true cnae=${input.cnaeCode} (RAG=0)`);
  return {
    questions: [],
    hasGap: true as const,
    motivo: 'cnae_sem_legislacao_especifica' as const,
  };
}
```

**Racional:** SOLARIS deixa de ser fallback. Sem RAG → sem perguntas → banner.

#### M2 — Prompt LLM exige fonte regulatório

**Localização:** `server/routers-fluxo-v3.ts:705-710`

**Antes:**
```text
- "fonte": "regulatorio" se baseada em legislação (LC 214, EC 132, LC 227, LC 224, LC 116, LC 87),
           "solaris" se baseada em orientação jurídica SOLARIS interna,
           "ia_gen" se inferida sem base documental explícita no contexto RAG
- "requirement_id": identificador do requisito (ex: "RF-045") ou "" se não aplicável
- "source_reference": referência normativa (ex: "LC 214/2025 Art. 9°") ou "" se ia_gen
   Se não houver base documental no contexto RAG, usar fonte: "ia_gen" e campos vazios.
```

**Depois:**
```text
- "fonte": SEMPRE "regulatorio" — toda pergunta DEVE ter base documental explícita no contexto RAG.
- "requirement_id": OBRIGATÓRIO — identificador do requisito (ex: "RF-045").
- "source_reference": OBRIGATÓRIO — referência normativa exata extraída do contexto RAG
                      (ex: "LC 214/2025 Art. 9°"). NÃO INVENTE referências.

Se o contexto RAG não contiver base documental suficiente para gerar perguntas com
source_reference válido, RETORNE ARRAY VAZIO em vez de inventar perguntas conceituais.
```

**Racional:** elimina autorização explícita de `ia_gen`. Força LLM a retornar `[]` em vez de inferir.

#### M3 — Validação pós-LLM

**Localização:** `server/routers-fluxo-v3.ts:734` (após log do count)

**Adicionar:**
```typescript
// Filtrar perguntas que não cumprem REGRA-ORQ-29 (sem fonte=regulatorio ou sem source_reference)
const validQuestions = result.questions.filter(q =>
  q.fonte === "regulatorio" &&
  typeof q.source_reference === "string" &&
  q.source_reference.trim().length > 0
);
console.log(`[generateQuestions] LLM ok=${result.questions.length} valid=${validQuestions.length} filtered=${result.questions.length - validQuestions.length}`);

if (validQuestions.length === 0) {
  console.log(`[generateQuestions] hasGap=true cnae=${input.cnaeCode} (LLM 0 perguntas válidas após filtro)`);
  return {
    questions: [],
    hasGap: true as const,
    motivo: 'cnae_sem_legislacao_especifica' as const,
  };
}
```

**Racional:** defesa em profundidade — se LLM ignorar instrução do prompt, o filtro pega.

#### M4 — Remover injeção SOLARIS do retorno

**Localização:** `server/routers-fluxo-v3.ts:737-743`

**Antes:**
```typescript
const questionsWithOnda1 = await injectOnda1IntoQuestions(
  input.cnaeCode,
  result.questions as any
);
console.log(`[generateQuestions] Onda1 injected: onda1=${questionsWithOnda1.filter(q => q.fonte === 'solaris').length} regulatorio=${questionsWithOnda1.filter(q => q.fonte !== 'solaris').length} total=${questionsWithOnda1.length}`);

return { questions: questionsWithOnda1, hasGap: false as const };
```

**Depois:**
```typescript
return { questions: validQuestions, hasGap: false as const };
```

**Racional:** Q.CNAE retorna apenas perguntas regulatórias. SOLARIS Onda 1 continua disponível em `getOnda1Questions` para outros usos (não removido do codebase).

### 3.3 Mudanças frontend

#### M5 — Mensagem clara em CnaeGapBanner

**Localização:** `client/src/components/CnaeGapBanner.tsx`

**Texto proposto** (corpo do banner):

```
ℹ️ Sem requisitos regulatórios específicos para este CNAE

Não há requisitos regulatórios específicos no corpus normativo
da Reforma Tributária (LC 214/2025) para o CNAE {code} —
{description}.

Você pode pular este questionário e prosseguir para o próximo CNAE.
Este CNAE não terá perguntas de diagnóstico regulatório.

[Pular este CNAE →]
```

**Racional:** transparência ao cliente. Substitui texto genérico atual por mensagem específica que explica POR QUÊ não há perguntas.

## 4. ADR mínimo

### Decisão

Q.CNAE retorna **apenas** perguntas com `fonte=regulatorio` derivadas do RAG. Quando RAG não retorna chunks, gate dispara e exibe `CnaeGapBanner`.

### Alternativas consideradas

| Opção | Avaliação |
|---|---|
| **A — Manter mistura atual** | ❌ Viola REGRA-ORQ-29 (3% ia_gen sem source_ref) |
| **B — Filtrar fonte=regulatorio + manter SOLARIS** | ❌ Não resolve mistura conceitual |
| **C (escolhida) — Apenas regulatório + banner em gap** | ✅ Compliance ORQ-29 + transparência UX |

### Consequências

**Positivas:**
- Q.CNAE 100% rastreável (toda pergunta com `source_reference` válido)
- `CnaeGapBanner` deixa de ser dead code
- REGRA-ORQ-29 cumprida estruturalmente

**Negativas (declaradas):**
- CNAEs sem cobertura RAG → 0 perguntas regulatórias → confiança Q3 CNAE = 0% (peso 10)
- Confiança total do briefing pode cair de 71-85% para 60-70% em projetos com CNAEs sem cobertura RAG densa
- SOLARIS Onda 1 deixa de aparecer em Q.CNAE — equipe SOLARIS pode reagir

### Mitigação

- SOLARIS Onda 1 continua disponível em outras telas/contextos (Q.NCM, Q.NBS já injetam SOLARIS via outros pipelines)
- `CnaeGapBanner` permite usuário pular sem bloquear briefing
- Gap de RAG por CNAE vira backlog explícito (curadoria de corpus por CNAE 4 dígitos)

## 5. Critério de aceite empírico

Validação Manus pós-merge:

```sql
-- V1 — Toda pergunta no cache pós-fix tem fonte=regulatorio
WITH expanded AS (
  SELECT
    q.cnaeCode,
    jt.fonte
  FROM questionnaireQuestionsCache q,
  JSON_TABLE(q.questionsJson, '$[*]' COLUMNS (
    fonte VARCHAR(20) PATH '$.fonte'
  )) jt
  WHERE q.projectId IN (
    SELECT id FROM projects WHERE createdAt > '<timestamp_pos_deploy>'
  )
)
SELECT
  fonte,
  COUNT(*) AS total
FROM expanded
GROUP BY fonte;
-- Esperado: APENAS fonte='regulatorio'. Zero rows para 'solaris' ou 'ia_gen'.

-- V2 — Toda pergunta tem source_reference não-vazio
WITH expanded AS (
  SELECT
    q.cnaeCode,
    jt.source_ref
  FROM questionnaireQuestionsCache q,
  JSON_TABLE(q.questionsJson, '$[*]' COLUMNS (
    source_ref VARCHAR(500) PATH '$.source_reference'
  )) jt
  WHERE q.projectId IN (
    SELECT id FROM projects WHERE createdAt > '<timestamp_pos_deploy>'
  )
)
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN source_ref = '' OR source_ref IS NULL THEN 1 ELSE 0 END) AS sem_ref
FROM expanded;
-- Esperado: sem_ref = 0 (zero perguntas sem source_reference)

-- V3 — Toda source_reference aponta para chunk válido no corpus
SELECT DISTINCT jt.source_ref
FROM questionnaireQuestionsCache q,
JSON_TABLE(q.questionsJson, '$[*]' COLUMNS (
  source_ref VARCHAR(500) PATH '$.source_reference'
)) jt
WHERE q.projectId IN (
  SELECT id FROM projects WHERE createdAt > '<timestamp_pos_deploy>'
)
  AND jt.source_ref NOT IN (
    SELECT DISTINCT CONCAT('LC 214/2025 ', artigo) FROM ragDocuments
    -- ajustar JOIN conforme schema real do corpus
  );
-- Esperado: 0 rows (zero alucinação)

-- V4 — CNAE sem cobertura RAG dispara gate (criar projeto sintético com CNAE raro)
SELECT
  q.cnaeCode,
  JSON_LENGTH(q.questionsJson) AS num_perguntas
FROM questionnaireQuestionsCache q
WHERE q.projectId = '<projeto_sintetico>'
  AND q.cnaeCode = '<cnae_sem_cobertura_RAG>';
-- Esperado: 0 rows (gate disparou antes de gerar) OU num_perguntas = 0
```

### Validação UX

- [ ] CNAE com cobertura RAG densa (ex: 4930-2/03) → exibe N perguntas regulatórias com tag "Legislação"
- [ ] CNAE sem cobertura RAG → exibe `CnaeGapBanner` com mensagem clara em vez de 0/0 respondidas
- [ ] Tag "Equipe técnica SOLARIS" não aparece mais em Q.CNAE
- [ ] Tag "Perfil da empresa" (ia_gen) não aparece mais em Q.CNAE

## 6. Test contracts (skeleton)

A criar em `server/integration/spec-1028-fonte-unica.test.ts`:

```typescript
describe("SPEC-1028 — Q.CNAE fonte única regulatório", () => {
  it.todo("T1 — generateQuestions retorna apenas fonte=regulatorio");
  it.todo("T2 — generateQuestions retorna 0 perguntas com source_reference vazio");
  it.todo("T3 — gate hasGap dispara quando RAG retorna 0 chunks (sem AND com SOLARIS)");
  it.todo("T4 — quando LLM retorna pergunta com fonte=ia_gen, M3 filter remove");
  it.todo("T5 — quando LLM retorna pergunta sem source_reference, M3 filter remove");
  it.todo("T6 — quando todas as perguntas LLM são filtradas, retorna hasGap=true");
  it.todo("T7 — injectOnda1IntoQuestions NÃO é chamado em Q.CNAE pós-fix");
  it.todo("T8 — CnaeGapBanner exibe mensagem específica com cnae code + description");
});
```

REGRA-ORQ-28 Artefato 2 (test contracts) é **opcional** conforme decisão P.O. — pode ser backlog pós-fix se urgência supera processo.

## 7. Não-implementar (escopo excluído)

| Fora do escopo | Justificativa |
|---|---|
| Race condition do auto-start frontend (CNAEs 2 e 3 com state vazio) | Issue separada — Bug ortogonal não captado nesta spec |
| Gate server-side em `generateBriefing` (FASE 2 original) | Plano original — sequencial pós-FASE 1 |
| DELETE de 118 projetos órfãos (FASE 3) | Manus executa SQL — autorização P.O. já registrada |
| Remoção do componente legacy `QuestionarioCNAE.tsx` (FASE 4) | 24h após FASE 3 estável |
| Curadoria de corpus RAG por CNAE 4 dígitos | Backlog estrutural separado |
| Tabela `llm_call_log` para observabilidade | Backlog separado |
| Refactor visual da renderização (ondas em accordion) | UX backlog — não é decisão técnica |
| Remoção de `injectOnda1IntoQuestions` do codebase | Função permanece (uso em outros pipelines) — apenas não chamada de Q.CNAE |
| Modificação de `getOnda1Questions` ou tabela `solaris_questions` | Sem mudanças — fix não-destrutivo |

## 8. Vinculadas

### Issues e PRs

- Issue principal: [#1028](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/1028)
- PR de regressão original: [#1012](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/1012)
- PR FASE 1 (mergeado): [#1029](https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/1029)
- Branch backup: `backup/pre-fix-1028-20260507-1758` @ `2f122ce`

### REGRAs e Lições

- **REGRA-ORQ-29** — Sem requisito = sem pergunta (alvo deste fix)
- **REGRA-ORQ-31** — Meta 98% confiança (rastreabilidade obrigatória)
- **REGRA-ORQ-32** — Proibição de hardcode (no_hardcode visão sistêmica)
- **REGRA-ORQ-37** — Manus executa queries (validação V1-V4 acima)
- **CHECKLIST-VAL-01** — autor responde Q1-Q5 antes do PR de impl
- **Lição #59** — assemble ≠ consumption
- **Lição #61** — metadado determinístico antes da pergunta
- **Lição #66** — spec sem dados = ilusão (validação empírica obrigatória)

### Diagnóstico empírico

- Auditoria projeto 4800001 (Manus 2026-05-07) — confirmou 97% compliant + 0% alucinação
- Auditoria projeto 4800002 (Manus 2026-05-08) — confirmou Cenário C (bug frontend) e composição variável por CNAE
- PDFs P.O.: `cnae1-frete.pdf` e `cnae2-frete.pdf` (2026-05-08)
- Report Manus: `Diagnóstico Q.CNAE — Evidências Coletadas.md`

### Documentação relacionada

- ADR-011 (Sprint K — K-2 — `injectOnda1IntoQuestions`) — afetado parcialmente: função preservada, deixa de ser chamada no Q.CNAE
- Decisão M3.7 Item 5 (REGRA-ORQ-29 — `FALLBACK_QUESTIONS` removido) — alinhamento com mesmo princípio aplicado a ia_gen

---

## Resumo executivo

**O que muda:** Q.CNAE = perguntas 100% regulatórias do RAG+LLM. Sem cobertura RAG → banner.
**Onde muda:** 2 arquivos, ~40 linhas.
**Risco:** baixo — fix não-destrutivo (SOLARIS Onda 1 preservada para outros usos).
**Validação:** 4 queries SQL Manus + 4 checks UX.
**Não inclui:** race condition (issue separada), FASE 2/3/4 (plano original).

**Status:** aguarda autorização P.O. para abrir branch `fix/1028-fonte-unica` e implementar.
