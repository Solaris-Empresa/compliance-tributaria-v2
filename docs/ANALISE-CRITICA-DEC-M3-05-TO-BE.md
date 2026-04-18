# Análise Crítica — DEC-M3-05 TO-BE Refatoração Completa
## Relatório para Revisão do Orquestrador antes da Implementação

**Data:** 2026-04-07  
**HEAD:** b90a973 (main)  
**Branch alvo:** feat/z02-to-be-flow-refactor  
**Autor:** Manus (Implementador Técnico)  
**Destinatário:** Orquestrador Claude (Anthropic) + P.O. Uires Tapajós  
**Status:** PRÉ-IMPLEMENTAÇÃO — análise apenas, sem código alterado

---

## Sumário Executivo

O DEC-M3-05 especifica a substituição dos Questionários Corporativo (QC) e Operacional (QO) pelos Questionários de Produtos (NCM) e Serviços (NBS) no fluxo principal da plataforma IA SOLARIS. A análise profunda do código, do histórico de commits e da documentação revela que **o backend foi parcialmente implementado na Sprint Z-01 (PR #370, commit ff9fb71), mas nunca conectado ao fluxo principal**. Existem 5 camadas que precisam de mudança simultânea, 3 divergências de interface entre o DEC-M3-05 e o código real, e 2 riscos críticos que podem congelar projetos em produção se não tratados corretamente.

Este relatório detalha cada ponto antes de qualquer linha de código ser alterada.

---

## 1. Histórico: Por que o TO-BE Nunca Foi Implementado

### 1.1 Cronologia dos Commits Relevantes

A investigação do histórico do repositório revela a seguinte sequência de eventos:

| Commit | Data | O que foi feito | O que ficou faltando |
|--------|------|-----------------|----------------------|
| `d370932` (K-4-A) | Sprint K | `VALID_TRANSITIONS` + `assertValidTransition` criados | Estados `q_produto`/`q_servico` NÃO adicionados |
| `cc52952` (K-4-B fix) | Sprint K | `cnaes_confirmados → onda1_solaris` corrigido | Fluxo ainda aponta para `diagnostico_corporativo` |
| `62c4219` (K-4-C) | Sprint K | `QuestionarioIaGen.tsx` + `completeOnda2` | Navega para `/questionario-corporativo-v2` (linha 59) |
| `ff9fb71` (Z-01, PR #370) | 2026-04-07 | `getProductQuestions` + `getServiceQuestions` criados | **Salva em `corporateAnswers`/`operationalAnswers`** (não em `productAnswers`/`serviceAnswers`) |
| `b90a973` (Z-02, PR #376) | 2026-04-07 | `riskEngine` integrado | Fluxo AS-IS ainda ativo em todas as 5 camadas |

### 1.2 Causa Raiz

A Sprint K-4 implementou o fluxo das 3 Ondas (SOLARIS + IA Gen) mas **manteve o QC/QO como Etapas 3 e 4**, conforme especificado no documento `FLUXO-3-ONDAS-AS-IS-TO-BE.md` Parte 3A (linha 140-141). Naquele momento, o TO-BE ainda incluía QC/QO. A decisão de **substituir QC/QO por NCM/NBS** foi tomada posteriormente no DEC-M3-05 v3, mas o frontend nunca foi atualizado para refletir essa mudança.

A Sprint Z-01 (PR #370) criou os engines de backend (`product-questions.ts`, `service-questions.ts`) e as procedures `getProductQuestions`/`getServiceQuestions`, mas **como medida temporária** gravou os resultados em `corporateAnswers`/`operationalAnswers` (campos existentes) em vez de criar novas colunas `productAnswers`/`serviceAnswers`. O comentário no código confirma: `// DEC-M3-06 — ciclo completo em Z-02`.

Em outras palavras: **o backend existe mas aponta para colunas erradas, e o frontend nunca foi atualizado**.

---

## 2. Estado Atual: AS-IS vs TO-BE em Cada Camada

### 2.1 Mapeamento das 5 Camadas

| Camada | Arquivo | Estado AS-IS | Estado TO-BE Requerido | Gap |
|--------|---------|-------------|----------------------|-----|
| **1. State Machine** | `server/flowStateMachine.ts` | `onda2_iagen → diagnostico_corporativo → diagnostico_operacional → diagnostico_cnae` | `onda2_iagen → q_produto → q_servico → diagnostico_cnae` | Estados `q_produto`/`q_servico` inexistentes |
| **2. Backend Router** | `server/routers-fluxo-v3.ts` | `getProductQuestions` existe mas salva em `corporateAnswers`; `completeProductQuestionnaire` **não existe** | `getProductQuestions` salva em `productAnswers`; `completeProductQuestionnaire` e `completeServiceQuestionnaire` criados | 2 procedures faltando; 1 procedure salvando em coluna errada |
| **3. Frontend Stepper** | `client/src/pages/DiagnosticoStepper.tsx` | Steps 4-5: `diagnostico_corporativo` + `diagnostico_operacional` | Steps 4-5: `q_produto` + `q_servico` com `isSkipped` condicional | Steps não atualizados |
| **4. Navegação Onda 2** | `client/src/pages/QuestionarioIaGen.tsx` | Linha 59: `navigate('/questionario-corporativo-v2')` | `navigate('/projetos/${projectId}/questionario-produto')` | URL hardcoded errada |
| **5. Rotas + Páginas** | `client/src/App.tsx` + 2 novos arquivos | Rotas `/questionario-corporativo-v2` e `/questionario-operacional` | Rotas `/projetos/:id/questionario-produto` e `/projetos/:id/questionario-servico` | 2 rotas faltando; 2 componentes não criados |

### 2.2 Estado do Schema (Camada 0 — Pré-requisito)

A tabela `projects` no `drizzle/schema.ts` possui:

- **Existentes:** `corporateAnswers` (linha 122), `operationalAnswers` (linha 123)
- **Faltando:** `productAnswers` e `serviceAnswers`

A migration TiDB `ADD COLUMN IF NOT EXISTS product_answers TEXT` e `service_answers TEXT` ainda não foi criada nem executada. Esta é a **pré-condição bloqueante** para o Passo 2 em diante.

---

## 3. Divergências de Interface: DEC-M3-05 vs Código Real

A análise comparativa entre as assinaturas especificadas no DEC-M3-05 e as assinaturas reais no código revela 3 divergências que devem ser registradas como DIVs antes da implementação.

### DIV-Z02-001: Assinatura de `generateProductQuestions` (Passo 3b do DEC-M3-05)

O DEC-M3-05 (linha 193-197) especifica:

```typescript
// DEC-M3-05 Passo 3b — ERRADO:
const perguntas = await generateProductQuestions(
  { ncmCodes, operationType },  // ← objeto único
  project.confirmedCnaes ?? [],
  queryRagFn
)
```

O código real em `server/lib/product-questions.ts` (linha 64-70) tem:

```typescript
// Código real — CORRETO:
export async function generateProductQuestions(
  ncmCodes: string[],           // ← array direto
  cnaeCodes: string[],
  companyProfile: { operationType?: string },
  queryRagFn?: ...,
  querySolarisFn?: ...
)
```

**Resolução:** Usar a assinatura real do código. O DEC-M3-05 tem um erro tipográfico no Passo 3b. A implementação atual em `getProductQuestions` (linha 2626 do router) já usa a assinatura correta.

### DIV-Z02-002: `completeProductQuestionnaire` — campo `confirmedCnaes` vs `cnaes`

O DEC-M3-05 (linha 195) referencia `project.confirmedCnaes ?? []`, mas o código do router usa `(project as any).cnaes`. Verificar qual campo está populado no banco é necessário antes de implementar.

**Resolução:** Usar `(project as any).cnaes` consistentemente com o padrão existente em `getProductQuestions` (linha 2623).

### DIV-Z02-003: `getNextStateAfterProductQ` — valores do enum `operationType`

O DEC-M3-05 (linha 145-147) especifica:

```typescript
export function getNextStateAfterProductQ(operationType: string): string {
  return operationType === 'product' ? 'diagnostico_cnae' : 'q_servico'
}
```

O schema Zod em `routers-fluxo-v3.ts` (linha 88) define:

```typescript
operationType: z.enum(["produto", "servico", "misto", "industria", "comercio", "servicos", "agronegocio", "financeiro"])
```

**Atenção crítica:** O enum usa `"produto"` (português) e `"servico"` (português), não `"product"` e `"service"` (inglês). A função `getNextStateAfterProductQ` deve comparar com `"produto"`, não `"product"`.

**Resolução:** Registrar como DIV-Z02-003 e implementar com os valores corretos em português.

---

## 4. Análise de Risco: `flowStateMachine.ts`

Esta é a camada de **maior risco** da refatoração. O `VALID_TRANSITIONS` é o árbitro central de todas as transições de status em produção. Um erro aqui pode congelar todos os novos projetos.

### 4.1 Estado Atual do VALID_TRANSITIONS

```typescript
// ATUAL (AS-IS) — linhas críticas:
'onda2_iagen':               ['diagnostico_corporativo'],  // ← aponta para QC
'diagnostico_corporativo':   ['diagnostico_operacional', 'onda2_iagen'],
'diagnostico_operacional':   ['diagnostico_cnae', 'diagnostico_corporativo'],
'diagnostico_cnae':          ['briefing', 'diagnostico_operacional'],
```

### 4.2 Mudança Requerida pelo DEC-M3-05

```typescript
// TO-BE (DEC-M3-05 Passo 2b):
'onda2_iagen':               ['q_produto'],               // ← aponta para Q.Produtos
'q_produto':                 ['q_servico', 'diagnostico_cnae'],
'q_servico':                 ['diagnostico_cnae', 'q_produto'],
'diagnostico_cnae':          ['briefing', 'q_servico', 'q_produto'],  // ← 2 retrocessos possíveis
```

### 4.3 Análise de Risco por Cenário

| Cenário | Risco | Impacto | Mitigação |
|---------|-------|---------|-----------|
| Remover `diagnostico_corporativo` do VALID_TRANSITIONS | **CRÍTICO** | Projetos existentes em status `diagnostico_corporativo` ficam presos — `assertValidTransition` lança `FORBIDDEN` para qualquer transição | **Manter** `diagnostico_corporativo` e `diagnostico_operacional` no mapa como legado |
| `onda2_iagen → diagnostico_corporativo` removido | **ALTO** | Novos projetos que completam Onda 2 não conseguem avançar | Substituir por `onda2_iagen → q_produto` |
| `diagnostico_cnae` perde retrocesso para `diagnostico_operacional` | **MÉDIO** | Usuários não conseguem voltar ao QO (legado) | Manter `diagnostico_operacional` como destino de retrocesso legado |
| `getNextStateAfterProductQ` com valor inglês `"product"` | **ALTO** | Empresa de produto pula para `diagnostico_cnae` mas empresa de serviço também pula (bug silencioso) | Usar `"produto"` conforme enum real |

### 4.4 Estratégia de Migração Segura para `VALID_TRANSITIONS`

A estratégia correta é **adicionar os novos estados sem remover os legados**:

```typescript
// PROPOSTA SEGURA — adicionar ao VALID_TRANSITIONS:
'onda2_iagen':               ['q_produto', 'diagnostico_corporativo'],  // ← ambos por compatibilidade
'q_produto':                 ['q_servico', 'diagnostico_cnae'],
'q_servico':                 ['diagnostico_cnae', 'q_produto'],
// MANTER (legado — não remover):
'diagnostico_corporativo':   ['diagnostico_operacional', 'onda2_iagen'],
'diagnostico_operacional':   ['diagnostico_cnae', 'diagnostico_corporativo'],
'diagnostico_cnae':          ['briefing', 'diagnostico_operacional', 'q_servico', 'q_produto'],
```

Esta abordagem garante que projetos existentes em `diagnostico_corporativo` ou `diagnostico_operacional` continuem funcionando, enquanto novos projetos seguem o fluxo TO-BE.

---

## 5. Análise de Segurança: Migration TiDB

### 5.1 Operação Proposta

```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS product_answers TEXT,
  ADD COLUMN IF NOT EXISTS service_answers TEXT;
```

### 5.2 Avaliação de Risco

O TiDB Cloud (MySQL-compatible) suporta `ADD COLUMN IF NOT EXISTS` de forma online (Online DDL), o que significa que a operação não bloqueia leituras ou escritas na tabela durante a execução. Após o Z-06 Cleanup (13.030 projetos deletados), a tabela `projects` tem **0 projetos** no banco, o que elimina o risco de lock em tabela populada.

| Aspecto | Avaliação |
|---------|-----------|
| Tipo de operação | `ADD COLUMN` — operação não-destrutiva |
| Reversibilidade | Reversível com `DROP COLUMN` (requer aprovação P.O. conforme regras) |
| Impacto em projetos existentes | Nenhum — colunas novas são `NULL` por padrão |
| Risco de lock | Baixo — TiDB Online DDL + tabela vazia |
| Compatibilidade com Drizzle | Requer `pnpm db:push` após atualizar `drizzle/schema.ts` |

### 5.3 Verificação Pós-Migration

```sql
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'projects'
  AND COLUMN_NAME IN ('product_answers', 'service_answers');
-- ESPERADO: 2 linhas
```

---

## 6. UX: Banner "Não Aplicável" (NaoAplicavelBanner)

### 6.1 Requisito

O DEC-M3-05 especifica que empresas de produto puro devem ver um banner "Não aplicável" no step de Q.Serviços (e vice-versa), com um botão de avanço de um clique.

### 6.2 Lógica de Determinação

A função `inferCompanyType` em `server/lib/product-questions.ts` e `service-questions.ts` já implementa a lógica de inferência. O retorno `{ nao_aplicavel: true }` de `generateProductQuestions`/`generateServiceQuestions` já está mapeado nas procedures `getProductQuestions`/`getServiceQuestions`.

### 6.3 Mapeamento de Casos

| `operationType` | Q.Produtos (NCM) | Q.Serviços (NBS) |
|----------------|-----------------|-----------------|
| `"produto"` | Exibe perguntas NCM | **Banner "Não aplicável"** → avança para CNAE |
| `"servico"` | **Banner "Não aplicável"** → avança para Q.Serviços | Exibe perguntas NBS |
| `"misto"` | Exibe perguntas NCM | Exibe perguntas NBS |
| `"industria"` | Exibe perguntas NCM | Exibe perguntas NBS |
| `"comercio"` | Exibe perguntas NCM | Banner "Não aplicável" |

### 6.4 Componente `NaoAplicavelBanner`

O DEC-M3-05 referencia `<NaoAplicavelBanner>` como componente existente. **Verificação realizada:** o componente **NÃO existe** em `client/src/components/`. Apenas `ResumeBanner.tsx` foi encontrado, que tem propósito diferente.

**Conclusão:** `NaoAplicavelBanner` deve ser criado como parte do Passo 4. O componente deve:
1. Exibir título e descrição do motivo de não aplicabilidade
2. Exibir botão "Avançar" com um clique
3. Chamar a mutation `completeProductQuestionnaire` ou `completeServiceQuestionnaire` com array vazio de respostas antes de navegar

---

## 7. Rastreamento dos Procedimentos Backend Existentes

### 7.1 O que Já Existe e Funciona

| Procedimento | Arquivo | Linha | Estado | Observação |
|-------------|---------|-------|--------|------------|
| `generateProductQuestions` | `server/lib/product-questions.ts` | 64 | ✅ Implementado e testado (Z-01) | Assinatura: `(ncmCodes, cnaeCodes, companyProfile)` |
| `generateServiceQuestions` | `server/lib/service-questions.ts` | 64 | ✅ Implementado e testado (Z-01) | Assinatura: `(nbsCodes, cnaeCodes, companyProfile)` |
| `getProductQuestions` | `server/routers-fluxo-v3.ts` | 2610 | ⚠️ Existe mas salva em `corporateAnswers` | Deve salvar em `productAnswers` após migration |
| `getServiceQuestions` | `server/routers-fluxo-v3.ts` | 2645 | ⚠️ Existe mas salva em `operationalAnswers` | Deve salvar em `serviceAnswers` após migration |
| `extractNcmNbsFromProfile` | `server/routers-fluxo-v3.ts` | ~2720 | ✅ Implementado | Helper para extrair NCM/NBS do operationProfile |

### 7.2 O que Precisa Ser Criado

| Procedimento | Arquivo | Estado | Complexidade |
|-------------|---------|--------|-------------|
| `completeProductQuestionnaire` | `server/routers-fluxo-v3.ts` | ❌ Não existe | Baixa — persiste `productAnswers` + chama `assertValidTransition` |
| `completeServiceQuestionnaire` | `server/routers-fluxo-v3.ts` | ❌ Não existe | Baixa — persiste `serviceAnswers` + chama `assertValidTransition` |
| `getNextStateAfterProductQ` | `server/flowStateMachine.ts` | ❌ Não existe | Trivial — 1 linha de lógica |
| `QuestionarioProduto.tsx` | `client/src/pages/` | ❌ Não existe | Média — novo componente de página |
| `QuestionarioServico.tsx` | `client/src/pages/` | ❌ Não existe | Média — espelho do QuestionarioProduto |

### 7.3 O que Precisa Ser Modificado

| Arquivo | Linha(s) | Mudança | Risco |
|---------|----------|---------|-------|
| `server/flowStateMachine.ts` | ~30-40 | Adicionar `q_produto`, `q_servico` ao VALID_TRANSITIONS | **CRÍTICO** — ver Seção 4 |
| `server/routers-fluxo-v3.ts` | 2632, 2636, 2667, 2671 | Trocar `corporateAnswers`/`operationalAnswers` por `productAnswers`/`serviceAnswers` | Médio — requer migration primeiro |
| `client/src/pages/DiagnosticoStepper.tsx` | 106-117 | Substituir steps `diagnostico_corporativo`/`diagnostico_operacional` por `q_produto`/`q_servico` | Médio |
| `client/src/pages/QuestionarioIaGen.tsx` | 59 | `navigate('/questionario-corporativo-v2')` → `navigate('/projetos/${projectId}/questionario-produto')` | Baixo |
| `client/src/App.tsx` | ~124-125 | Adicionar 2 rotas novas (manter rotas antigas) | Baixo |
| `drizzle/schema.ts` | ~122-123 | Adicionar `productAnswers` e `serviceAnswers` | Baixo — pré-requisito |

---

## 8. Análise dos BUGs Secundários (Passos 5 e 6 do DEC-M3-05)

### 8.1 BUG-MANUAL-01: SOLARIS Obrigatório no Briefing

**Estado atual:** A procedure `generateBriefingFromDiagnostic` (linha 1972) verifica `isDiagnosticComplete(diagnosticStatus)`, que valida as 3 camadas do `diagnosticStatus` (corporate, operational, cnae). **Não há verificação explícita de `solarisAnswers`**.

**Impacto:** Um projeto pode gerar briefing sem ter respondido o Questionário SOLARIS (Onda 1), violando o requisito de que SOLARIS é fonte obrigatória.

**Localização da correção:** Adicionar verificação `solarisCount === 0 → TRPCError PRECONDITION_FAILED` antes do gate `isDiagnosticComplete` na procedure `generateBriefingFromDiagnostic`.

### 8.2 BUG-MANUAL-03: Art. 57 → Art. 2 para Imposto Seletivo

**Estado atual:** `grep -rn "Art. 57" server/lib/*.ts` retornou **0 resultados**. O bug pode estar no corpus RAG (tabela `ragDocuments`) ou em seeds, não no código TypeScript.

**Verificação necessária antes de implementar:**

```sql
SELECT anchor_id, SUBSTRING(content, 1, 200) as trecho
FROM ragDocuments
WHERE content LIKE '%Art. 57%'
  AND content LIKE '%Seletivo%'
LIMIT 5;
```

Se a referência incorreta estiver apenas no RAG, a correção é no corpus, não no código TypeScript.

---

## 9. Ordem de Execução e Dependências

O DEC-M3-05 especifica 7 passos em ordem obrigatória. A análise confirma que a ordem é correta e as dependências são:

```
Passo 1 (Schema + Migration)
  └─ Pré-requisito para Passo 2 (não bloqueia, mas sem as colunas o Passo 3 salva em lugar errado)

Passo 2 (flowStateMachine)
  └─ Pré-requisito para Passo 3 (procedures precisam dos novos estados para chamar assertValidTransition)

Passo 3 (routers-fluxo-v3.ts)
  └─ Pré-requisito para Passo 4 (frontend chama as procedures)

Passo 4 (Frontend)
  └─ Independente do Passo 5 e 6

Passo 5 (BUG-MANUAL-01)
  └─ Independente — pode ser feito em paralelo com Passo 4

Passo 6 (BUG-MANUAL-03)
  └─ Requer verificação SQL antes de implementar

Passo 7 (Testes)
  └─ Após todos os passos anteriores
```

---

## 10. Gate Q7 — Output Pré-Implementação

Conforme exigido pelo DEC-M3-05 (linha 38-46), o output do Gate Q7 é:

```
server/lib/completeness.ts:29:export type DiagnosticCompletenessStatus =
server/lib/completeness.ts:42:export interface DiagnosticCompleteness {
server/lib/completeness.ts:53:export interface DiagnosticCompletenessInput {
server/lib/tracked-question.ts:42:export interface TrackedAnswer {
```

**Interfaces relevantes identificadas:**
- `DiagnosticCompletenessStatus` — enum de status de completude
- `DiagnosticCompleteness` — resultado do cálculo de completude
- `DiagnosticCompletenessInput` — entrada para `computeCompleteness`
- `TrackedAnswer` — resposta rastreada (Q.Produtos e Q.Serviços)

**Interfaces faltando (a criar no Passo 3):**
- `ProductAnswer` — resposta do Q.Produtos (derivada de `TrackedAnswer`)
- `ServiceAnswer` — resposta do Q.Serviços (derivada de `TrackedAnswer`)

---

## 11. Critério de Avanço — Checklist de Verificação

Antes de considerar a implementação completa, verificar:

| Critério | Verificação |
|----------|------------|
| Migration TiDB executada | `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='projects' AND COLUMN_NAME IN ('product_answers','service_answers')` → 2 linhas |
| `q_produto` e `q_servico` no VALID_TRANSITIONS | `grep "q_produto\|q_servico" server/flowStateMachine.ts` → 2+ linhas |
| `completeProductQuestionnaire` criado | `grep "completeProductQuestionnaire" server/routers-fluxo-v3.ts` → 1 linha |
| `completeServiceQuestionnaire` criado | `grep "completeServiceQuestionnaire" server/routers-fluxo-v3.ts` → 1 linha |
| `getProductQuestions` salva em `productAnswers` | `grep "productAnswers" server/routers-fluxo-v3.ts` → 2+ linhas |
| `QuestionarioProduto.tsx` criado | `ls client/src/pages/QuestionarioProduto.tsx` → arquivo existe |
| `QuestionarioServico.tsx` criado | `ls client/src/pages/QuestionarioServico.tsx` → arquivo existe |
| Rotas TO-BE no App.tsx | `grep "questionario-produto\|questionario-servico" client/src/App.tsx` → 2 linhas |
| QuestionarioIaGen.tsx corrigido | `grep "questionario-produto" client/src/pages/QuestionarioIaGen.tsx` → 1 linha |
| DiagnosticoStepper atualizado | `grep "q_produto\|q_servico" client/src/pages/DiagnosticoStepper.tsx` → 2+ linhas |
| 10/10 testes novos PASS | `pnpm test server/integration/z02-to-be-flow.test.ts` → 10 PASS |
| Regressão 198/198 PASS | `pnpm test` → 198+ PASS |
| TypeScript 0 erros | `pnpm tsc --noEmit` → 0 erros |

---

## 12. Restrições Permanentes (Não Negociáveis)

Conforme o DEC-M3-05 e as regras de governança do projeto:

1. **NÃO remover** rotas `/questionario-corporativo-v2` e `/questionario-operacional` — compatibilidade com projetos V1/V2
2. **NÃO remover** estados `diagnostico_corporativo` e `diagnostico_operacional` do VALID_TRANSITIONS — projetos existentes
3. **NÃO executar** `DROP COLUMN` em `corporateAnswers`/`operationalAnswers` — Issue #62 permanente
4. **NÃO alterar** `solaris_answers` e `iagen_answers` — tabelas protegidas
5. **Registrar** qualquer divergência de interface como DIV antes de adaptar (Regra DIV)
6. **Confirmar** com o Orquestrador ao final de cada passo antes de avançar

---

## 13. Sumário de DIVs a Registrar

| DIV | Descrição | Resolução |
|-----|-----------|-----------|
| DIV-Z02-001 | DEC-M3-05 Passo 3b usa assinatura errada de `generateProductQuestions` (objeto vs. parâmetros separados) | Usar assinatura real do código |
| DIV-Z02-002 | DEC-M3-05 referencia `project.confirmedCnaes` mas código usa `(project as any).cnaes` | Usar `.cnaes` consistentemente |
| DIV-Z02-003 | DEC-M3-05 usa `"product"`/`"service"` (inglês) mas enum real usa `"produto"`/`"servico"` (português) | Usar valores em português |

---

## 14. Recomendação Final

A implementação do DEC-M3-05 é **tecnicamente viável e segura** se executada na ordem especificada, com as seguintes ressalvas:

1. **Registrar DIV-Z02-001, DIV-Z02-002, DIV-Z02-003** antes de iniciar o Passo 3
2. **Usar a estratégia de VALID_TRANSITIONS aditiva** (não substitutiva) para preservar projetos legados
3. **Verificar existência do `NaoAplicavelBanner`** antes de criar as páginas (pode já existir)
4. **Executar verificação SQL** do BUG-MANUAL-03 antes de implementar (pode ser problema de corpus, não de código)
5. **Confirmar com Orquestrador** após cada passo conforme protocolo DEC-M3-05

O risco mais alto é a alteração do `flowStateMachine.ts`. A estratégia aditiva proposta na Seção 4.4 elimina o risco de regressão em projetos existentes.

---

*Relatório gerado em 2026-04-07 · HEAD b90a973 · Sem alterações de código*
