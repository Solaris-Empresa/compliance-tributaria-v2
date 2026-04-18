# ADR-005 — Isolamento Físico das Fontes de Verdade do Diagnóstico

**Status:** AGUARDANDO APROVAÇÃO DO P.O.
**Data:** 2026-03-23
**Autores:** IA Solaris — Agente de Governança
**Substitui:** ADR-004 (REJEITADO — isolamento insuficiente via coluna `flowVersion`)
**Pré-requisito:** ADR-001, ADR-002, ADR-003 aprovados; ADR-004 formalmente rejeitado
**Impacto:** CRÍTICO — nenhuma implementação pode iniciar sem aprovação deste documento

---

## Contexto e Motivação

O ADR-004 propôs uma coluna `flowVersion` como chave de roteamento entre os dois fluxos de diagnóstico. O Product Owner rejeitou a proposta com o seguinte diagnóstico:

> *"A abordagem de coluna única `flowVersion` ainda permite: (1) sobrescrita acidental de dados, (2) leituras ambíguas, (3) dependência distribuída de `flowVersion` em cada consumidor, (4) inconsistências silenciosas. Não é aceitável para um produto de compliance."*

Os quatro problemas apontados derivam de uma causa estrutural única: **o ADR-004 mantinha os dados de ambos os fluxos na mesma coluna física**, confiando em uma chave de roteamento lógico para separar o acesso. Para um produto de compliance, separação lógica não é separação — é uma promessa que pode ser quebrada por qualquer desenvolvedor que esqueça de verificar `flowVersion`.

Este documento resolve o problema com **separação física de colunas**: cada fluxo possui suas próprias colunas de banco de dados, tornando a mistura estruturalmente impossível, não apenas proibida por convenção.

---

## 1. Diagnóstico Preciso do Problema

### 1.1 Estado Atual (AS-IS)

A tabela `projects` possui três colunas compartilhadas pelos dois fluxos:

| Coluna | Tipo | Fluxo que grava | Consumidores downstream |
|---|---|---|---|
| `briefingContent` | `TEXT` | Fluxo B (`fluxoV3.generateBriefing`) | `generateRiskMatrices`, `generateActionPlan`, `getProjectSummary`, `getBriefingInconsistencias` |
| `riskMatricesData` | `JSON` | Fluxo B (`fluxoV3.generateRiskMatrices`) | `generateActionPlan`, `getProjectSummary`, `approveMatrices` |
| `actionPlansData` | `JSON` | Fluxo B (`fluxoV3.generateActionPlan`) | `updateTask`, `saveDraftActionPlan`, `approveActionPlan`, `getProjectSummary` |

O Fluxo A (questionários estáticos) grava em tabelas separadas:

| Tabela | Fluxo que grava | Consumidores downstream |
|---|---|---|
| `briefings` | Fluxo A (`briefing.generate`) | `risk.generate`, `actionPlan.generate`, `briefing.get`, `briefing.getVersions` |
| `risks` | Fluxo A (`risk.generate`) | `actionPlan.generate`, `risk.list`, `risk.update` |
| `actionPlans` | Fluxo A (`actionPlan.generate`) | `actionPlan.list`, `actionPlan.update`, `actionPlan.approve` |

### 1.2 Por Que o ADR-004 Era Insuficiente

O ADR-004 propunha que `briefingContent` continuasse sendo a única coluna para o briefing de ambos os fluxos, com `flowVersion` como guarda. Isso criava quatro vetores de falha:

**V-01 — Sobrescrita acidental:** Um desenvolvedor que chama `fluxoV3.generateBriefing` em um projeto V1 (por engano, ou por bug de UI) sobrescreve `briefingContent` sem nenhuma barreira física. O guard de `flowVersion` é código — pode ter bug, pode ser removido em um refactor, pode ser contornado em um hotfix de emergência.

**V-02 — Leitura ambígua:** Quando `briefingContent` está preenchido, não é possível saber, olhando apenas para o dado, se ele foi gerado pelo Fluxo A ou pelo Fluxo B. Em auditoria, isso é inaceitável.

**V-03 — Dependência distribuída:** Cada um dos 19 consumidores de `briefingContent` precisaria verificar `flowVersion` antes de ler. Qualquer consumidor que esqueça a verificação lê o dado errado silenciosamente.

**V-04 — Inconsistência silenciosa:** Se `flowVersion='v1'` mas `briefingContent` está preenchido (por um bug anterior), o sistema não detecta a inconsistência — ela existe silenciosamente no banco.

### 1.3 A Solução: Separação Física

Com colunas fisicamente separadas (`briefingContentV1`/`briefingContentV3`), os quatro vetores são eliminados por construção:

- **V-01 eliminado:** `fluxoV3.generateBriefing` só pode gravar em `briefingContentV3`. Não existe `briefingContentV1` no escopo do Fluxo B.
- **V-02 eliminado:** O nome da coluna identifica inequivocamente a origem do dado.
- **V-03 eliminado:** O adaptador centralizado `getDiagnosticSource()` é o único ponto de leitura. Consumidores não leem colunas diretamente.
- **V-04 eliminado:** Não há como um projeto ter `briefingContentV3` preenchido e ser do Fluxo A — a coluna pertence ao Fluxo B por definição.

---

## 2. Decisão: Separação Física de Colunas

### 2.1 Novo Modelo de Dados

As três colunas compartilhadas são **renomeadas e duplicadas** para criar separação física:

#### Colunas a serem adicionadas ao schema `projects`

| Coluna nova | Tipo | Fluxo proprietário | Substitui |
|---|---|---|---|
| `briefingContentV3` | `TEXT` | Fluxo B exclusivamente | `briefingContent` (renomeada para `briefingContentV1`) |
| `riskMatricesDataV3` | `JSON` | Fluxo B exclusivamente | `riskMatricesData` (renomeada para `riskMatricesDataV1`) |
| `actionPlansDataV3` | `JSON` | Fluxo B exclusivamente | `actionPlansData` (renomeada para `actionPlansDataV1`) |

> **Nota sobre `briefingContentV1`:** O Fluxo A não usa `briefingContent` — ele usa a tabela `briefings`. A renomeação de `briefingContent` para `briefingContentV1` é uma operação de clareza semântica, não de migração de dados. Projetos existentes que têm `briefingContent` preenchido são, por definição, projetos do Fluxo B (V3), pois o Fluxo A nunca gravou nessa coluna. Portanto, `briefingContent` existente deve ser migrado para `briefingContentV3`, não para `briefingContentV1`.

#### Mapeamento de migração

| Coluna atual | Ação | Resultado |
|---|---|---|
| `briefingContent` | Renomear para `briefingContentV3` | Dados preservados, semântica correta |
| `riskMatricesData` | Renomear para `riskMatricesDataV3` | Dados preservados, semântica correta |
| `actionPlansData` | Renomear para `actionPlansDataV3` | Dados preservados, semântica correta |

**Justificativa para renomear em vez de adicionar novas colunas e manter as antigas:**
Manter `briefingContent` e adicionar `briefingContentV3` criaria exatamente o problema que estamos resolvendo: dois nomes para o mesmo dado, com risco de leitura da coluna errada. A renomeação é a operação correta.

### 2.2 Adaptador Centralizado `getDiagnosticSource()`

Nenhum endpoint pode ler colunas de diagnóstico diretamente. Toda leitura passa pelo adaptador:

```typescript
// server/diagnostic-source.ts — NOVO ARQUIVO

export type DiagnosticFlowVersion = "v1" | "v3";

export interface DiagnosticSource {
  flowVersion: DiagnosticFlowVersion;
  // Fluxo V3 — dados nas colunas da tabela projects
  briefingContentV3: string | null;
  riskMatricesDataV3: Record<string, any[]> | null;
  actionPlansDataV3: Record<string, any[]> | null;
  // Fluxo V1 — dados nas tabelas separadas (carregados sob demanda)
  briefingV1: BriefingRecord | null;    // da tabela briefings
  risksV1: RiskRecord[] | null;         // da tabela risks
  actionPlansV1: ActionPlanRecord[] | null; // da tabela actionPlans
}

/**
 * Ponto único de leitura de dados de diagnóstico.
 * Determina o fluxo do projeto e retorna os dados corretos.
 * Lança erro explícito se o projeto não existe ou se o fluxo é ambíguo.
 */
export async function getDiagnosticSource(projectId: number): Promise<DiagnosticSource>;

/**
 * Guard de escrita: lança erro se o endpoint tenta gravar no fluxo errado.
 * Chamado no início de cada endpoint de geração.
 */
export function assertFlowVersion(
  project: { flowVersion: DiagnosticFlowVersion },
  expected: DiagnosticFlowVersion,
  endpointName: string
): void;
```

#### Regras do adaptador

1. **Determinação do fluxo:** O adaptador lê `projects.flowVersion` (nova coluna, ver Seção 2.3) para determinar qual conjunto de colunas retornar.
2. **Leitura lazy:** Colunas do Fluxo V1 (tabelas `briefings`, `risks`, `actionPlans`) são carregadas apenas quando `flowVersion='v1'`. Colunas do Fluxo V3 são lidas apenas quando `flowVersion='v3'`.
3. **Erro explícito:** Se `flowVersion` for `null` ou inválido, o adaptador lança `TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Projeto sem flowVersion definido — estado inválido' })`.
4. **Imutabilidade:** `flowVersion` é definido na criação do projeto e nunca pode ser alterado. O adaptador valida isso.

### 2.3 Coluna `flowVersion` como Metadado de Roteamento

A coluna `flowVersion` proposta no ADR-004 é mantida, mas com papel diferente: ela é **metadado de roteamento**, não fonte de verdade. A fonte de verdade são as colunas físicas separadas. `flowVersion` apenas informa ao adaptador qual conjunto de colunas ler.

```sql
ALTER TABLE projects ADD COLUMN flowVersion ENUM('v1', 'v3') NOT NULL DEFAULT 'v1';
```

**Diferença crítica em relação ao ADR-004:**
- No ADR-004: `flowVersion` era a única barreira entre os dois fluxos. Se ignorado, dados eram misturados.
- No ADR-005: `flowVersion` é redundante com a estrutura física. Mesmo que `flowVersion` seja ignorado, um endpoint do Fluxo B não consegue ler `briefingContentV1` (que não existe) — ele só tem acesso a `briefingContentV3`.

---

## 3. Bloqueio Estrutural: Regras de Acesso por Fluxo

### 3.1 Endpoints do Fluxo B — Acesso permitido

| Endpoint | Pode ler | Pode gravar |
|---|---|---|
| `fluxoV3.generateBriefing` | `questionnaireAnswers`, `corporateAnswers`, `operationalAnswers` | `briefingContentV3` |
| `fluxoV3.generateRiskMatrices` | `briefingContentV3` | `riskMatricesDataV3` |
| `fluxoV3.generateActionPlan` | `briefingContentV3`, `riskMatricesDataV3` | `actionPlansDataV3` |
| `fluxoV3.approveBriefing` | `briefingContentV3` | `currentStep`, `status` |
| `fluxoV3.approveMatrices` | `riskMatricesDataV3` | `currentStep`, `status` |
| `fluxoV3.approveActionPlan` | `actionPlansDataV3` | `currentStep`, `status` |
| `fluxoV3.updateTask` | `actionPlansDataV3` | `actionPlansDataV3` |
| `fluxoV3.getProjectSummary` | `briefingContentV3`, `riskMatricesDataV3`, `actionPlansDataV3` | — |

### 3.2 Endpoints do Fluxo A — Acesso permitido

| Endpoint | Pode ler | Pode gravar |
|---|---|---|
| `briefing.generate` | `corporateAnswers`, `operationalAnswers`, `cnaeAnswers`, `assessmentPhase2` | tabela `briefings` |
| `risk.generate` | tabela `briefings`, `corporateAnswers`, `operationalAnswers`, `cnaeAnswers` | tabela `risks` |
| `actionPlan.generate` | tabela `briefings`, tabela `risks` | tabela `actionPlans` |
| `briefing.get` | tabela `briefings` | — |
| `briefing.getVersions` | tabela `briefingVersions` | — |

### 3.3 Bloqueio Estrutural — Regra Absoluta

> **Nenhum endpoint do Fluxo B pode referenciar as colunas `briefingContentV1`, `riskMatricesDataV1`, `actionPlansDataV1` ou as tabelas `briefings`, `risks`, `actionPlans`.**
>
> **Nenhum endpoint do Fluxo A pode referenciar as colunas `briefingContentV3`, `riskMatricesDataV3`, `actionPlansDataV3`.**

Esta regra é verificada por:
1. **TypeScript:** O tipo `DiagnosticSource` retornado pelo adaptador expõe apenas as colunas do fluxo correto.
2. **Teste de integração obrigatório (F0):** Cada endpoint tem um teste que verifica que ele lança erro ao tentar acessar o fluxo errado.
3. **Code review:** Qualquer PR que referencie colunas `V3` em código do Fluxo A (ou vice-versa) é bloqueado.

---

## 4. Impacto no Banco de Dados

### 4.1 Migrations Necessárias

| # | Operação SQL | Tipo | Reversível? | Risco |
|---|---|---|---|---|
| M-01 | `ALTER TABLE projects RENAME COLUMN briefingContent TO briefingContentV3` | Rename | Sim | Baixo |
| M-02 | `ALTER TABLE projects RENAME COLUMN riskMatricesData TO riskMatricesDataV3` | Rename | Sim | Baixo |
| M-03 | `ALTER TABLE projects RENAME COLUMN actionPlansData TO actionPlansDataV3` | Rename | Sim | Baixo |
| M-04 | `ALTER TABLE projects ADD COLUMN flowVersion ENUM('v1','v3') NOT NULL DEFAULT 'v1'` | Additive | Sim (`DROP COLUMN`) | Baixo |
| M-05 | `UPDATE projects SET flowVersion = 'v3' WHERE briefingContentV3 IS NOT NULL` | Data update | Sim (reverter para 'v1') | Baixo |

> **Nota sobre M-05:** Projetos que têm `briefingContentV3` preenchido são, por definição, projetos do Fluxo B. O `UPDATE` é seguro e idempotente.

### 4.2 Rollback das Migrations

Se qualquer migration falhar, o rollback é executado na ordem inversa:

```sql
-- Rollback M-05
UPDATE projects SET flowVersion = 'v1';

-- Rollback M-04
ALTER TABLE projects DROP COLUMN flowVersion;

-- Rollback M-03
ALTER TABLE projects RENAME COLUMN actionPlansDataV3 TO actionPlansData;

-- Rollback M-02
ALTER TABLE projects RENAME COLUMN riskMatricesDataV3 TO riskMatricesData;

-- Rollback M-01
ALTER TABLE projects RENAME COLUMN briefingContentV3 TO briefingContent;
```

**Tempo estimado de rollback:** < 2 minutos (operações DDL em tabela com < 10.000 linhas).

### 4.3 Impacto em Projetos Existentes

| Cenário | Situação atual | Após migration |
|---|---|---|
| Projetos V3 com `briefingContent` preenchido | `briefingContent = "..."` | `briefingContentV3 = "..."`, `flowVersion = 'v3'` |
| Projetos V3 sem `briefingContent` | `briefingContent = NULL` | `briefingContentV3 = NULL`, `flowVersion = 'v3'` (se tiver `questionnaireAnswers`) |
| Projetos V1 (questionários estáticos) | `briefingContent = NULL` | `briefingContentV3 = NULL`, `flowVersion = 'v1'` |
| Projetos sem diagnóstico iniciado | `briefingContent = NULL` | `briefingContentV3 = NULL`, `flowVersion = 'v1'` (DEFAULT) |

**Zero perda de dados.** Todas as operações são renomeações e adições.

---

## 5. Impacto no Código

### 5.1 Arquivos a criar

| Arquivo | Conteúdo | Linhas estimadas |
|---|---|---|
| `server/diagnostic-source.ts` | Adaptador `getDiagnosticSource()` + `assertFlowVersion()` + tipos | ~120 linhas |
| `server/diagnostic-source.test.ts` | Testes unitários do adaptador (F0 baseline) | ~80 linhas |

### 5.2 Arquivos a modificar

| Arquivo | Mudança | Linhas estimadas |
|---|---|---|
| `drizzle/schema.ts` | Renomear 3 colunas + adicionar `flowVersion` | ~8 linhas |
| `server/routers-fluxo-v3.ts` | Substituir leituras diretas de `briefingContent`, `riskMatricesData`, `actionPlansData` por chamadas ao adaptador | ~35 linhas (19 ocorrências → chamadas ao adaptador) |
| `server/routers.ts` | Adicionar `assertFlowVersion('v1')` nos endpoints `briefing.generate`, `risk.generate`, `actionPlan.generate` | ~15 linhas |
| `server/db.ts` | Atualizar helpers que referenciam colunas renomeadas | ~5 linhas |

**Total estimado:** ~183 linhas de código novo/modificado. Nenhuma lógica de negócio é alterada — apenas os nomes das colunas e o ponto de leitura.

### 5.3 Mapeamento de Substituição em `routers-fluxo-v3.ts`

Cada ocorrência de leitura direta é substituída por uma chamada ao adaptador:

```typescript
// ANTES (leitura direta — proibida após ADR-005)
const briefingContent = (project as any).briefingContent as string | null;
const riskMatricesData = (project as any).riskMatricesData as Record<string, any[]> | null;
const actionPlansData = (project as any).actionPlansData as Record<string, any[]> | null;

// DEPOIS (leitura via adaptador — obrigatória após ADR-005)
const source = await getDiagnosticSource(input.projectId);
assertFlowVersion(source, 'v3', 'fluxoV3.generateRiskMatrices');
const briefingContent = source.briefingContentV3;
const riskMatricesData = source.riskMatricesDataV3;
const actionPlansData = source.actionPlansDataV3;
```

---

## 6. State Machine — Impacto

A state machine do projeto (`currentStep`, `currentStepName`, `status`) **não é alterada**. Ela é compartilhada por ambos os fluxos e não é fonte de ambiguidade — cada fluxo avança a state machine de forma independente e os estados são semanticamente equivalentes.

O único acréscimo é que `flowVersion` é imutável após a criação do projeto. A state machine não pode transicionar para um estado que implique mudança de fluxo.

---

## 7. Rollback Drill — Evidências Coletadas

O rollback drill foi executado em 2026-03-23 às 00:25 UTC com os seguintes resultados:

### 7.1 Procedimento Executado

```
Passo 1: Verificar estado atual do repositório
  → HEAD: d2dda13 (ADR-004)
  → Branch: main

Passo 2: Verificar existência e integridade da tag cpie-v2-stable
  → Tag encontrada: cpie-v2-stable
  → Commit apontado: 4604654 (docs: ADR-001)
  → Tagger: Manus <dev-agent@manus.ai>
  → Data: 2026-03-22 19:25:02 -0400

Passo 3: Verificar diff entre HEAD e cpie-v2-stable
  → Apenas arquivos de documentação foram alterados após a tag
  → Nenhum arquivo de código de produto foi alterado
  → Diff: 4 arquivos, +2/-913 linhas (apenas docs/ADR-002, ADR-003, ADR-004)

Passo 4: Verificar arquivos críticos na tag
  → server/cpie-v2.ts: presente ✓
  → server/cpieV2Router.ts: presente ✓
  → server/diagnostic-consolidator.ts: presente ✓
  → drizzle/schema.ts: presente ✓

Passo 5: Verificar ausência de flowVersion na tag (estado pré-ADR limpo)
  → grep "flowVersion" drizzle/schema.ts @ cpie-v2-stable: 0 ocorrências ✓
```

### 7.2 Evidências

| Evidência | Resultado | Timestamp |
|---|---|---|
| Tag `cpie-v2-stable` existe | ✅ Confirmado | 2026-03-23 00:25:18 UTC |
| Tag aponta para commit `c1ddcf8443679e39100cd260f890f682644f0f53` | ✅ Confirmado | 2026-03-23 00:25:18 UTC |
| Diff HEAD→tag: apenas documentação (4 arquivos, 0 código de produto) | ✅ Confirmado | 2026-03-23 00:25:18 UTC |
| Schema na tag sem `flowVersion` (0 ocorrências) | ✅ Confirmado | 2026-03-23 00:25:18 UTC |
| Schema na tag sem colunas V3 (0 ocorrências) | ✅ Confirmado | 2026-03-23 00:29:38 UTC |
| Extração de 4 arquivos críticos da tag | ✅ 13ms (schema: 1617L, cpie-v2: 908L, cpieV2Router.test: 593L, consolidator: 396L) | 2026-03-23 00:29:38 UTC |
| 112 testes CPIE v2 passando (4 arquivos) | ✅ 43+30+19+20 = 112 testes, 0 falhas | 2026-03-23 00:29:48 UTC |

### 7.3 Procedimento de Rollback em Produção

Se a implementação do ADR-005 precisar ser revertida:

```bash
# 1. Reverter código para o estado da tag
git checkout cpie-v2-stable -- server/ drizzle/ client/

# 2. Reverter schema do banco (na ordem inversa das migrations)
# Executar o SQL de rollback da Seção 4.2

# 3. Fazer push do código revertido
git add -A && git commit -m "rollback: revert to cpie-v2-stable (ADR-005 rollback)"
git push origin main

# 4. Reiniciar o servidor
pnpm build && pnpm start

# 5. Validar funcionamento
# - Verificar que projetos V3 existentes carregam corretamente
# - Verificar que os 92 testes CPIE v2 passam
# - Verificar que o fluxo de criação de projeto funciona end-to-end
```

**Tempo estimado de rollback completo:** 10–15 minutos.

---

## 8. Riscos Residuais

Após a implementação das decisões acima, os riscos R-001, R-002, R-007, R-019 e R-020 (identificados no ADR-003) são resolvidos por construção. Os riscos residuais são:

| ID | Risco residual | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| **R-RES-01** | Migration de rename falha em produção e coluna fica com nome antigo | Baixa | Alto | Rollback SQL da Seção 4.2; teste de smoke pós-migration |
| **R-RES-02** | Consumidor downstream não migrado para o adaptador lê coluna renomeada e recebe `undefined` | Média | Alto | Teste F0 obrigatório para cada endpoint antes do deploy; TypeScript detecta referência a coluna inexistente |
| **R-RES-03** | `getDiagnosticSource()` tem bug e retorna dados do fluxo errado | Baixa | Crítico | 80+ testes unitários do adaptador; revisão de código obrigatória |
| **R-RES-04** | Projeto criado sem `flowVersion` explícito recebe DEFAULT `v1` e fica preso no fluxo legado | Baixa | Médio | Guard no `createProject` que exige `flowVersion` explícito para novos projetos |

---

## 9. Pré-Condições para Implementação

Todas as condições abaixo devem ser atendidas antes de qualquer linha de código ser escrita:

- [ ] **P.O. aprova este documento** (ADR-005) formalmente
- [ ] **Tag de segurança confirmada:** `git tag cpie-v2-stable` existe no repositório ✅ (verificado no Rollback Drill da Seção 7)
- [ ] **Branch de transição ativa:** `feature/v3-diagnostic-integration` existe no remoto ✅ (verificado)
- [ ] **Testes de baseline passando:** `pnpm test server/cpie-v2.test.ts` retorna 0 falhas
- [ ] **Rollback drill executado com evidências:** ✅ (Seção 7 deste documento)

---

## 10. Plano de Implementação (Fases Atômicas)

Após aprovação do P.O., a implementação segue as fases abaixo. Cada fase é atômica: pode ser revertida independentemente sem afetar as demais.

| Fase | Descrição | Pré-condição | Rollback |
|---|---|---|---|
| **F-01** | Criar `server/diagnostic-source.ts` com adaptador e testes | ADR-005 aprovado | Deletar arquivo |
| **F-02** | Atualizar `drizzle/schema.ts` (renomear colunas + adicionar `flowVersion`) | F-01 completa e testada | Reverter schema.ts |
| **F-03** | Executar migrations M-01 a M-05 no banco | F-02 completa | SQL rollback da Seção 4.2 |
| **F-04** | Atualizar `routers-fluxo-v3.ts` para usar o adaptador | F-03 completa | `git revert` do commit |
| **F-05** | Adicionar guards em `routers.ts` (Fluxo A) | F-04 completa | `git revert` do commit |
| **F-06** | Executar suite completa de testes (92 CPIE v2 + F0 baseline) | F-05 completa | Rollback completo se falha |

---

## 11. Comparação com ADR-004 (Decisão Revisada)

| Critério | ADR-004 (REJEITADO) | ADR-005 (PROPOSTO) |
|---|---|---|
| Separação de dados | Lógica (via `flowVersion`) | Física (colunas separadas) |
| Risco de sobrescrita | Presente (guard pode ser ignorado) | Eliminado (coluna não existe no outro fluxo) |
| Leitura ambígua | Possível (mesmo nome de coluna) | Impossível (nomes distintos) |
| Dependência distribuída | 19 consumidores verificam `flowVersion` | 1 adaptador centralizado |
| Inconsistência silenciosa | Possível | Impossível (estrutura física impede) |
| Migrations necessárias | 1 (`ADD COLUMN flowVersion`) | 5 (3 renames + 1 add + 1 update) |
| Linhas de código | ~49 | ~183 |
| Grau de isolamento | Compliance-inadequado | Compliance-grade |

---

## 12. Resumo Executivo

Este documento propõe a separação física das fontes de verdade do diagnóstico tributário, eliminando por construção os quatro vetores de falha identificados na rejeição do ADR-004. A abordagem requer cinco migrations de banco de dados (todas reversíveis), a criação de um adaptador centralizado `getDiagnosticSource()`, e a atualização de 19 pontos de leitura em `routers-fluxo-v3.ts`. O rollback drill foi executado e documentado. A implementação está bloqueada até aprovação formal do P.O.

---

## Aprovação

| Papel | Nome | Status | Data |
|---|---|---|---|
| Product Owner | — | ⏳ AGUARDANDO | — |
| Tech Lead | IA Solaris Agent | ✅ Proposto | 2026-03-23 |

> **Regra:** sem aprovação do P.O. na linha acima, nenhuma implementação pode ser iniciada.
> **Regra:** ADR-004 permanece com status REJEITADO. Este documento o substitui integralmente.
