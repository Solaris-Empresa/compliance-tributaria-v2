# ADR-004 — Decisões Críticas: Fonte de Verdade do Diagnóstico

**Status:** AGUARDANDO APROVAÇÃO DO P.O.
**Data:** 2026-03-22
**Autores:** IA Solaris — Agente de Governança
**Pré-requisito:** ADR-001, ADR-002, ADR-003 aprovados
**Impacto:** CRÍTICO — nenhuma implementação pode iniciar sem aprovação deste documento

---

## Contexto

O ADR-003 identificou os riscos R-001, R-002, R-007, R-019 e R-020 como bloqueadores críticos. Todos derivam de uma causa raiz única: **o sistema possui dois fluxos de diagnóstico paralelos que gravam em destinos diferentes**, sem regra explícita de qual é a fonte canônica para cada consumidor downstream.

Este documento resolve essa ambiguidade com decisões formais e irrevogáveis, baseadas na leitura direta do código-fonte em produção.

---

## Mapa de Fontes Atual (AS-IS)

A tabela abaixo documenta exatamente o que cada endpoint lê e onde grava, conforme verificado no código em `server/routers.ts` e `server/routers-fluxo-v3.ts`:

| Endpoint | Lê de | Grava em | Fluxo |
|---|---|---|---|
| `briefing.generate` | `briefings` (tabela), `corporateAnswers`, `operationalAnswers`, `cnaeAnswers`, `assessmentPhase2` | `briefings` (tabela) | A |
| `fluxoV3.generateBriefing` | `questionnaireAnswersV3` (tabela), `corporateAnswers`, `operationalAnswers` | `projects.briefingContent` (coluna) | B |
| `risk.generate` | `briefings` (tabela), `corporateAnswers`, `operationalAnswers`, `cnaeAnswers` | `risks` (tabela) | A |
| `fluxoV3.generateRiskMatrices` | `projects.briefingContent` (coluna), `questionnaireAnswersV3` | `projects.riskMatricesData` (coluna JSON) | B |
| `actionPlan.generate` | `briefings` (tabela), `corporateAnswers`, `operationalAnswers`, `cnaeAnswers` | `actionPlans` (tabela) | A |
| `fluxoV3.generateActionPlan` | `projects.briefingContent` (coluna), `projects.riskMatricesData` (coluna JSON) | `projects.actionPlansData` (coluna JSON) | B |

**Conclusão do mapa:** Os dois fluxos são completamente paralelos e **não compartilham nenhuma fonte de dados**. Um projeto que passa pelo Fluxo B nunca alimenta o Fluxo A, e vice-versa. O risco de leitura cruzada é real mas não está ocorrendo atualmente — porque os dois fluxos têm UIs separadas. O risco aumenta quando a UI for unificada.

---

## 1. Decisão sobre Briefing

### Opção A — Separar colunas (`briefingContentV1` + `briefingContentV3`)

**Prós:** isolamento total, rollback independente por fluxo, sem risco de sobrescrita.
**Contras:** requer migration de schema, renomear `briefingContent` existente, atualizar todos os consumidores downstream (risk, actionPlan, exportPDF, getProjectStatus).

### Opção B — Manter coluna única `briefingContent` + controle por `flowVersion`

**Prós:** zero migration de schema, zero renomeação, zero atualização de consumidores downstream.
**Contras:** requer que o Fluxo A também grave em `briefingContent` (hoje grava na tabela `briefings`), e que todos os consumidores leiam `briefingContent` em vez de `briefings`.

### **DECISÃO: Opção B — Coluna única `briefingContent` + `flowVersion`**

**Justificativa baseada no código:**

1. O Fluxo B (`fluxoV3`) **já usa `briefingContent`** como coluna canônica em todos os seus consumidores downstream (`generateRiskMatrices` lê `briefingContent`, `generateActionPlan` lê `briefingContent`). A infraestrutura canônica já existe.
2. O Fluxo A usa a tabela `briefings` — uma tabela separada com estrutura diferente (`summaryText`, `gapsAnalysis`, `riskLevel`, `priorityAreas`). Essa tabela é **legada** e não é lida por nenhum componente do Fluxo B.
3. Adicionar `flowVersion` ao schema da tabela `projects` é uma migration de **uma coluna** (`ALTER TABLE projects ADD COLUMN flowVersion ENUM('v1','v3') DEFAULT 'v1'`), sem impacto em nenhum dado existente.
4. Com `flowVersion`, cada consumidor downstream pode fazer `if (project.flowVersion === 'v3') { use briefingContent } else { use briefings table }` — isolamento sem renomear nada.

**Impacto no schema:** 1 coluna nova (`flowVersion`) na tabela `projects`. Zero renomeações. Zero migrations destrutivas.

**Impacto no código:** Os consumidores downstream (`risk.generate`, `actionPlan.generate`) precisam de um `if/else` por `flowVersion`. O Fluxo A continua gravando na tabela `briefings` para projetos `flowVersion='v1'`. O Fluxo B continua gravando em `briefingContent` para projetos `flowVersion='v3'`.

---

## 2. Decisão sobre Risk e Action Plan

**Decisão:** Cada consumidor lê da fonte correspondente ao `flowVersion` do projeto.

| `flowVersion` | `risk.generate` lê de | `actionPlan.generate` lê de |
|---|---|---|
| `v1` (legado) | `briefings` (tabela) + `corporateAnswers` + `operationalAnswers` + `cnaeAnswers` | `briefings` (tabela) + `corporateAnswers` + `operationalAnswers` + `cnaeAnswers` |
| `v3` (novo) | `projects.briefingContent` + `questionnaireAnswersV3` | `projects.briefingContent` + `projects.riskMatricesData` |

**Como evitar leitura errada:** o campo `flowVersion` é verificado **antes** de qualquer leitura de dados. Se `flowVersion='v3'` e `briefingContent` for `null`, o endpoint retorna erro `BAD_REQUEST` com mensagem "Execute o briefing V3 primeiro" — nunca faz fallback silencioso para a tabela `briefings`.

**Como garantir consistência:** o `flowVersion` é gravado **uma única vez**, no momento da criação do projeto (`createProject`), e é **imutável** — não pode ser alterado após a criação. Isso garante que um projeto nunca muda de fluxo no meio do diagnóstico.

---

## 3. Definição de Fonte Única de Verdade

| Artefato | Fonte Canônica (v1) | Fonte Canônica (v3) | Como impedir leitura paralela |
|---|---|---|---|
| **Briefing** | Tabela `briefings` (campos `summaryText`, `gapsAnalysis`, `riskLevel`) | Coluna `projects.briefingContent` (markdown) | `flowVersion` obrigatório antes de qualquer leitura |
| **Respostas do diagnóstico** | Colunas `projects.corporateAnswers`, `operationalAnswers`, `cnaeAnswers` | Tabela `questionnaireAnswersV3` | Endpoints V3 não leem colunas legadas; endpoints V1 não leem `questionnaireAnswersV3` |
| **Matriz de riscos** | Tabela `risks` (linhas individuais) | Coluna `projects.riskMatricesData` (JSON por CNAE) | `flowVersion` direciona para a fonte correta |
| **Plano de ação** | Tabela `actionPlans` (linhas individuais) | Coluna `projects.actionPlansData` (JSON por área) | `flowVersion` direciona para a fonte correta |
| **Progresso do stepper** | `projects.currentStep` (int 1-9) | `questionnaireProgressV3.currentStep` (int 0-5) | Cada stepper lê apenas sua tabela correspondente |

**Regra absoluta:** nenhum endpoint pode ler de ambas as fontes simultaneamente. O `flowVersion` é a chave de roteamento — não uma sugestão.

---

## 4. Estratégia para o Consolidador (`diagnostic-consolidator.ts`)

**Decisão: MANTER, com escopo redefinido.**

O `diagnostic-consolidator.ts` é um **adaptador de compatibilidade** — ele transforma `corporateAnswers` + `operationalAnswers` + `cnaeAnswers` no formato `DiagnosticLayer[]` que o `generateBriefing` do Fluxo B aceita. Ele **não é um fluxo em si** — é uma ponte.

**Papel redefinido:**

- Para projetos `flowVersion='v1'`: o consolidador **não é usado** — o Fluxo A gera briefing diretamente das 3 colunas.
- Para projetos `flowVersion='v3'`: o consolidador **pode ser usado opcionalmente** para injetar contexto estruturado das 3 colunas no prompt do Fluxo B, enriquecendo o diagnóstico sem substituir `questionnaireAnswersV3` como fonte primária.
- **Não será removido** — sua remoção quebraria a ponte de migração para projetos que transitam de V1 para V3.

**Condição de remoção futura:** quando 100% dos projetos ativos forem `flowVersion='v3'` e as colunas `corporateAnswers`, `operationalAnswers`, `cnaeAnswers` forem deprecadas. Isso é uma decisão de fase futura, não desta implementação.

---

## 5. Migração Segura

### Projetos existentes (legado `flowVersion='v1'`)

- Recebem `flowVersion='v1'` por `DEFAULT` na migration — **zero impacto**, nenhum dado é alterado.
- Continuam usando exatamente os mesmos endpoints e as mesmas fontes de dados que usam hoje.
- A UI continua exibindo os mesmos componentes que exibe hoje.
- **Nenhum projeto existente é migrado automaticamente para V3.**

### Novos projetos (`flowVersion='v3'`)

- Recebem `flowVersion='v3'` explicitamente no `createProject` quando o usuário passa pelo novo fluxo de diagnóstico.
- Usam `questionnaireAnswersV3` como fonte de respostas, `briefingContent` como fonte de briefing, `riskMatricesData` e `actionPlansData` como fontes de risk e plano.
- A UI exibe o `DiagnosticoStepper` V3 em vez dos questionários estáticos.

### Como evitar mistura

- O campo `flowVersion` é verificado no início de cada endpoint sensível.
- Um projeto `flowVersion='v1'` que tenta chamar `fluxoV3.generateBriefing` recebe erro `FORBIDDEN: Este projeto usa o fluxo V1`.
- Um projeto `flowVersion='v3'` que tenta chamar `briefing.generate` (Fluxo A) recebe erro `FORBIDDEN: Este projeto usa o fluxo V3`.
- Essa proteção é implementada como middleware de roteamento, não como lógica espalhada em cada endpoint.

---

## 6. Impacto no Banco de Dados

| Operação | Tipo | Risco | Reversível? |
|---|---|---|---|
| `ALTER TABLE projects ADD COLUMN flowVersion ENUM('v1','v3') DEFAULT 'v1'` | Additive | Baixo | Sim (`DROP COLUMN`) |
| Nenhuma outra alteração de schema | — | — | — |

**Confirmação:** esta decisão requer **exatamente 1 migration** de banco de dados. Nenhuma coluna é renomeada. Nenhuma tabela é removida. Nenhum dado existente é alterado.

---

## 7. Impacto no Código

| Arquivo | Tipo de mudança | Linhas estimadas |
|---|---|---|
| `drizzle/schema.ts` | Adicionar campo `flowVersion` à tabela `projects` | ~3 linhas |
| `server/routers.ts` — `briefing.generate` | Adicionar guard `if (project.flowVersion === 'v3') throw FORBIDDEN` | ~5 linhas |
| `server/routers.ts` — `risk.generate` | Adicionar guard + lógica de leitura por `flowVersion` | ~10 linhas |
| `server/routers.ts` — `actionPlan.generate` | Adicionar guard + lógica de leitura por `flowVersion` | ~10 linhas |
| `server/routers-fluxo-v3.ts` — `createProject` ou equivalente | Gravar `flowVersion='v3'` ao criar projeto V3 | ~3 linhas |
| `server/routers-fluxo-v3.ts` — endpoints sensíveis | Adicionar guard `if (project.flowVersion !== 'v3') throw FORBIDDEN` | ~15 linhas (5 endpoints × 3 linhas) |
| `client/src/pages/NovoProjeto.tsx` | Passar `flowVersion` no payload de criação do projeto | ~3 linhas |

**Total estimado:** ~49 linhas de código novo. Zero refatorações destrutivas. Zero renomeações.

---

## 8. Riscos Residuais

Após a implementação das decisões acima, os riscos R-001, R-002, R-007, R-019 e R-020 são resolvidos. Os riscos residuais são:

| ID | Risco residual | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| **R-RES-01** | Projeto criado sem `flowVersion` explícito recebe `v1` por DEFAULT e fica preso no fluxo legado | Baixa | Médio | Guard no `createProject` que exige `flowVersion` explícito para novos projetos |
| **R-RES-02** | Consumidor downstream não implementa o guard de `flowVersion` e lê da fonte errada | Média | Alto | Teste de integração obrigatório para cada endpoint sensível antes do deploy |
| **R-RES-03** | Migração de banco falha em produção e `flowVersion` fica `NULL` | Baixa | Alto | Rollback da migration via `git tag cpie-v2-stable` + `pnpm db:push` com schema anterior |
| **R-RES-04** | UI exibe componentes do Fluxo A para projetos V3 (ou vice-versa) | Média | Médio | Leitura de `flowVersion` no `ProjetoDetalhesV2` para renderização condicional dos componentes |

---

## 9. Pré-Condições para Implementação

Todas as condições abaixo devem ser atendidas antes de qualquer linha de código ser escrita:

- [ ] **P.O. aprova este documento** (ADR-004) formalmente
- [ ] **Tag de segurança confirmada:** `git tag cpie-v2-stable` existe no repositório (criada no ADR-002)
- [ ] **Branch de transição ativa:** `feat/diagnostico-v3-unificado` existe e está atualizada com `main`
- [ ] **Testes de baseline passando:** `pnpm test server/cpie-v2.test.ts` retorna 0 falhas
- [ ] **Rollback drill executado:** procedimento do ADR-003 Bloco 4 testado em staging

---

## 10. Resumo Executivo das Decisões

| # | Decisão | Escolha | Impacto |
|---|---|---|---|
| 1 | Fonte do briefing | Coluna única `briefingContent` + `flowVersion` | 1 coluna nova no schema |
| 2 | Risk e Action Plan | Leitura por `flowVersion`, sem fallback silencioso | Guards em 3 endpoints |
| 3 | Fonte única de verdade | `flowVersion` como chave de roteamento imutável | Middleware de proteção |
| 4 | Consolidador | Mantido como adaptador de compatibilidade | Nenhuma alteração |
| 5 | Migração legado | DEFAULT `v1`, zero impacto em projetos existentes | 1 migration additive |
| 6 | Impacto no banco | 1 `ALTER TABLE ADD COLUMN` | Reversível |
| 7 | Impacto no código | ~49 linhas novas, zero refatorações destrutivas | Baixo risco |

---

## Aprovação

| Papel | Nome | Status | Data |
|---|---|---|---|
| Product Owner | — | ⏳ AGUARDANDO | — |
| Tech Lead | IA Solaris Agent | ✅ Proposto | 2026-03-22 |

> **Regra:** sem aprovação do P.O. na linha acima, nenhuma implementação pode ser iniciada.
