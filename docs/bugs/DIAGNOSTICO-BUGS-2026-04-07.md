# Diagnóstico de Bugs — IA SOLARIS
**Data:** 2026-04-07 · **HEAD:** 8637773 · **Investigador:** Manus (paralelo via map)

---

## Resumo executivo

| Bug | Causa raiz confirmada | Impacto | Complexidade fix |
|---|---|---|---|
| BUG-RESP-01 | `diagnostic-consolidator.ts` não processa `productAnswers`/`serviceAnswers` (colunas Z-02) | Alto — briefing e matrizes ignoram respostas NCM/NBS | média |
| BUG-MANUAL-03 | Prompt do LLM não instrui explicitamente a usar Art. 2 para IS; modelo recupera Art. 57 por similaridade semântica | Médio — citação legal incorreta no briefing | baixa |
| BUG-MANUAL-04 | Frontend (subtarefa) não acessível no sandbox de investigação; backend confirma `risk_category_l2` canônico gravado corretamente | Médio — UI pode exibir categorias legadas | baixa |
| BUG-MANUAL-05 | `QuestionarioCNAE.tsx` intencionalmente criado com placeholders; sem procedure tRPC conectada | Alto — página de diagnóstico CNAE não funcional | média |
| BUG-LEGACY-01 | `projectId` sem `.references(() => projects.id, { onDelete: 'cascade' })` em ~25 tabelas | Médio — deleção de projeto cria órfãos | média |

---

## Tabela AS-IS × TO-BE

| # | Componente | AS-IS (problema atual) | TO-BE (comportamento esperado) |
|---|---|---|---|
| 1 | `diagnostic-consolidator.ts` | Consolida apenas `corporateAnswers` + `operationalAnswers` | Consolida também `productAnswers` + `serviceAnswers` (Z-02) |
| 2 | Prompt LLM briefing engine | Menciona IS genericamente; modelo recupera Art. 57 do RAG | Instrução explícita: IS → Art. 2 LC 214/2025; Art. 57 = uso/consumo pessoal |
| 3 | Frontend risk matrix | Renderiza campo `categoria` legado (Contabilidade/TI/Jurídico) | Renderiza `risk_category_l2` canônico (imposto_seletivo/ibs_cbs) |
| 4 | `QuestionarioCNAE.tsx` | Placeholder "Conteúdo em desenvolvimento" sem backend | Questionário funcional via procedure tRPC `getCnaeQuestions` |
| 5 | Schema FK `projectId` | `int("projectId").notNull()` sem `.references()` em ~25 tabelas | `.references(() => projects.id, { onDelete: 'cascade' })` em todas |

---

## BUG-RESP-01 — Respostas ignoradas no pipeline

### Causa raiz

O arquivo `server/diagnostic-consolidator.ts` foi criado antes da Sprint Z-02 e processa apenas `corporateAnswers` (QC) e `operationalAnswers` (QO). As colunas `productAnswers` e `serviceAnswers` — adicionadas na Etapa 1 do Z-02 — não foram incluídas na função `consolidateDiagnosticLayers` (linha 303).

### Fluxo de dados atual (AS-IS)

```
QC/QO respondidos pelo usuário
  → gravam em corporate_answers / operational_answers
  → consolidateDiagnosticLayers() lê corporate + operational
  → aggregatedDiagnosticAnswers alimenta generateBriefing
  → briefing usa as respostas ✅

Q.Produtos/Q.Serviços respondidos pelo usuário (Z-02)
  → gravam em product_answers / service_answers
  → consolidateDiagnosticLayers() NÃO lê product + service
  → aggregatedDiagnosticAnswers NÃO inclui NCM/NBS
  → briefing ignora respostas NCM/NBS ❌
```

### Fluxo esperado (TO-BE)

```
Q.Produtos/Q.Serviços respondidos
  → gravam em product_answers / service_answers
  → consolidateDiagnosticLayers() lê TODAS as 4 colunas
  → aggregatedDiagnosticAnswers inclui NCM/NBS
  → briefing usa respostas completas ✅
```

### Evidência de código

```
server/diagnostic-consolidator.ts:303 — export function consolidateDiagnosticLayers(params: {
  Parâmetros atuais: corporateAnswers, operationalAnswers (sem product/service)
  
server/routers-fluxo-v3.ts:526 — briefingContent: diagSource.briefingContentV3 ?? null
  (lê do projeto, que foi gerado sem productAnswers)
```

### Fix proposto

```typescript
// server/diagnostic-consolidator.ts:303
// Adicionar productAnswers e serviceAnswers aos parâmetros de consolidateDiagnosticLayers
export function consolidateDiagnosticLayers(params: {
  corporateAnswers: TrackedAnswer[]
  operationalAnswers: TrackedAnswer[]
  productAnswers?: TrackedAnswer[]   // ← ADICIONAR
  serviceAnswers?: TrackedAnswer[]   // ← ADICIONAR
  ...
})
```

**Dependência:** Este bug é consequência direta do BUG-MANUAL-02 (colunas erradas na Z-01). Após Z-02 mergear, o consolidador precisa ser atualizado na mesma sprint ou em Z-03.

---

## BUG-MANUAL-03 — Art. 57 vs Art. 2

### Causa raiz

O prompt do LLM nos classificadores tributários (`routers-fluxo-v3.ts` linhas 202, 366, 602, 1025, 1153, 1336) menciona "IS" como parte da Reforma Tributária mas não instrui explicitamente qual artigo usar. O modelo recupera Art. 57 do corpus RAG por similaridade semântica com "consumo" (Art. 57 trata de bens de uso/consumo pessoal).

### Trecho do prompt afetado

```
server/routers-fluxo-v3.ts:202
  content: `Você é um Classificador Tributário Especialista em CNAE 2.3 e Reforma
  Tributária brasileira (LC 214/2025, IBS, CBS, IS).
  ...
  Considere especialmente os CNAEs mais impactados pela Reforma Tributária (IBS, CBS, IS).`
  
  ← AUSENTE: instrução explícita sobre Art. 2 para IS
```

### Fix proposto

```typescript
// Adicionar ao system prompt do classificador (linha ~229):
`INSTRUÇÃO CRÍTICA SOBRE IMPOSTO SELETIVO (IS):
Ao identificar risco de Imposto Seletivo, citar EXCLUSIVAMENTE o Art. 2 da LC 214/2025.
O Art. 57 da LC 214/2025 trata de bens de uso ou consumo pessoal — NÃO está relacionado ao IS.
IS incide sobre: tabaco, bebidas alcoólicas, veículos, embarcações, aeronaves, bens e serviços prejudiciais à saúde ou ao meio ambiente.`
```

**Nota:** Confirmado em E0-D — corpus RAG tem 6 chunks com Art. 57, todos sobre uso/consumo pessoal. O corpus está correto; o problema é o prompt.

---

## BUG-MANUAL-04 — Categorias de risco legadas no frontend

### Causa raiz

O `riskEngine.ts` grava `risk_category_l2` com valores canônicos (`split_payment`, `ibs_cbs`, `imposto_seletivo`) desde Z-02b. O problema está no frontend — o componente de matrizes renderiza o campo `categoria` legado em vez de `risk_category_l2`.

### Evidência de backend (confirmado)

```
server/routers/riskEngine.ts:62  — categoria: z.string().default('enquadramento_geral')
server/routers/riskEngine.ts:284 — categoria: 'split_payment'  ← canônico ✅
server/routers/riskEngine.ts:302 — categoria: 'ibs_cbs'        ← canônico ✅
server/routers/riskEngine.ts:459 — risk_category_l2 = categoria canônica ✅
```

### Fix proposto

Verificar `client/src/pages/MatrizesV3.tsx` (ou componente equivalente) — localizar onde `categoria` é renderizado e substituir por `risk_category_l2`. Investigação do frontend requer acesso ao diretório `client/src/` no ambiente de produção.

---

## BUG-MANUAL-05 — QCNAE placeholder

### Causa raiz

`QuestionarioCNAE.tsx` foi criado intencionalmente com estrutura de placeholder (comentário na linha 6: "Esta página contém APENAS estrutura, seções e placeholders"). Não existe procedure tRPC `getCnaeQuestions` ou `completeCnaeQuestionnaire` no router.

### Estado do banco

Não foi possível executar a query SQL diretamente. Via código:
- `server/routers-fluxo-v3.ts`: nenhuma procedure `getOnda3Questions`, `getCnaeQuestions` ou `questionarioCnae` encontrada
- A tabela `solaris_questions` existe no schema mas não está conectada ao QCNAE

### Fix proposto

```
1. Criar procedure tRPC: fluxoV3.getCnaeQuestions (lê solaris_questions por cnae_code)
2. Criar procedure tRPC: fluxoV3.completeCnaeQuestionnaire (persiste respostas)
3. Atualizar QuestionarioCNAE.tsx para chamar as procedures
4. Registrar no connection-manifest.test.ts (Gate FC)
```

**Nota:** Este é o próximo passo natural após Z-02 (que implementa Q.Produtos/Q.Serviços). Candidato para Z-03.

---

## BUG-LEGACY-01 — FK CASCADE DELETE ausente

### Causa raiz

O schema Drizzle define `projectId` como `int("projectId").notNull()` em ~25 tabelas sem `.references(() => projects.id, { onDelete: 'cascade' })`. Apenas 3 tabelas têm FK declarada (linhas 1765, 1791, 1821 do schema).

### FKs existentes no schema (confirmado)

```
drizzle/schema.ts:1765 — .references(() => projects.id)          ← sem onDelete
drizzle/schema.ts:1791 — .references(() => projects.id)          ← sem onDelete
drizzle/schema.ts:1821 — .references(() => projects.id)          ← sem onDelete
```

### Tabelas sem FK declarada (~25 ocorrências)

```
linhas 159, 190, 216, 240, 277, 295, 315, 338, 355, 374, 404, 432, 467, 485,
582, 612, 629, 653, 692, 739, 760, 792, 821, 851, 873, 954, 972, 1003, 1059, 1075
```

### Suporte a CASCADE no TiDB Cloud

TiDB Cloud suporta `ON DELETE CASCADE` para InnoDB. A adição é segura via migration `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ... ON DELETE CASCADE`.

**Atenção:** Requer aprovação do P.O. antes de executar (regra NUNCA execute DROP COLUMN sem aprovação — análogo para ALTER TABLE destrutivo).

### Fix proposto

```typescript
// drizzle/schema.ts — padrão a aplicar em todas as tabelas com projectId:
projectId: int("projectId").notNull().references(() => projects.id, { onDelete: 'cascade' }),
```

---

## Dependências entre bugs

```
BUG-RESP-01 ← consequência direta do BUG-MANUAL-02 (Z-01 gravou em colunas erradas)
              Após Z-02 mergear, consolidateDiagnosticLayers precisa ser atualizado

BUG-MANUAL-03 ← independente, fix de 1 linha no prompt do LLM
                Pode ser resolvido em Z-02 Etapa 5 (já planejado)

BUG-MANUAL-04 ← backend já correto (Z-02b); apenas frontend precisa de fix
                Pode ser resolvido junto com Z-02 Etapa 4 (mesma sprint)

BUG-MANUAL-05 ← bloqueado por Z-02 (Q.Produtos/Serviços primeiro, QCNAE depois)
                Candidato para Z-03

BUG-LEGACY-01 ← independente de Z-02, mas requer aprovação do P.O.
                Candidato para sprint de hardening pós-Z-02
```

---

## Ordem de resolução recomendada

1. **BUG-MANUAL-03** (baixa complexidade, fix de 1 linha no prompt IS) — pode ser feito em Z-02 Etapa 5 **agora**
2. **BUG-MANUAL-04** (baixa complexidade, fix no frontend MatrizesV3) — pode ser feito em Z-02 Etapa 4
3. **BUG-RESP-01** (média complexidade, atualizar consolidador) — fazer em Z-02 Etapa 5 ou Z-03, após Z-02 mergear
4. **BUG-MANUAL-05** (média complexidade, criar procedures QCNAE) — Z-03
5. **BUG-LEGACY-01** (média complexidade, requer aprovação P.O.) — sprint de hardening pós-Z-02
