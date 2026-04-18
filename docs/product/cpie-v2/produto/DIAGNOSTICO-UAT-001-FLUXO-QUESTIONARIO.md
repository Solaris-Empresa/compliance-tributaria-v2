# DIAGNÓSTICO TÉCNICO — UAT-001: Quebra de Fluxo no Questionário Pós-CNAE

**Incidente:** UAT-001  
**Classificação:** 🔴 P0 — Funcional Crítico Bloqueante  
**Data de detecção:** 2026-03-23 (UAT — Projeto "TESTE T01 — HARD BLOCK", ID 630001)  
**Detectado por:** UAT manual (Shadow Mode não captura — correto por design)  
**Preparado por:** Manus AI — Diagnóstico Autônomo  
**Status:** Causa raiz identificada. Correção planejada.

---

## 1. Descrição do Sintoma

O usuário confirmou os CNAEs do projeto (3 CNAEs: 1113-5/02, 4635-4/02, 4723-7/00) e ao navegar para a Etapa 2 do fluxo, a tela exibiu:

- **Título:** "Questionário concluído"
- **Mensagem:** "0 respostas registradas em 3 CNAE(s). Você pode visualizar as respostas abaixo."
- **Conteúdo:** Três cards de CNAE, cada um com "Nenhuma resposta registrada para este CNAE."
- **URL:** `/projetos/630001/questionario-v3`
- **Stepper:** Etapa 2 marcada como ativa (azul), mas Briefing aparece como concluído (verde)

O usuário **nunca respondeu nenhuma pergunta**. O sistema pulou completamente a fase de coleta de respostas e entrou diretamente no modo de visualização de um questionário vazio.

---

## 2. Estado do Banco de Dados (Evidência Forense)

Consulta executada diretamente no banco de produção em 2026-03-23:

```
id:               630001
name:             TESTE T01 — HARD BLOCK
status:           "matriz_riscos"          ← STATUS LEGADO (v2.0)
currentStep:      4                        ← STEP LEGADO
currentStepName:  "confirmacao_cnaes"      ← STEP NAME LEGADO
diagnosticStatus: null                     ← NOVO CAMPO VAZIO
questionnaireAnswers: null                 ← SEM RESPOSTAS
confirmedCnaes:   [3 CNAEs confirmados]    ← CNAE OK
briefingContent:  3.562 chars              ← BRIEFING EXISTE
riskMatricesData: null                     ← SEM MATRIZES
actionPlansData:  null                     ← SEM PLANO
```

Tabela `questionnaireAnswersV3` para projectId=630001: **0 registros**.

---

## 3. Causa Raiz — Análise em 5 Camadas

### Camada 1: O Projeto é um Artefato Híbrido (v2.0 + v2.1)

O projeto 630001 foi criado **antes** da refatoração v2.1. Ele percorreu o fluxo antigo (v2.0):

```
rascunho → assessment_fase1 → assessment_fase2 → matriz_riscos
```

O status `"matriz_riscos"` é um **status legado** da v2.0. O novo fluxo v2.1 usa os status:
```
diagnostico_corporativo → diagnostico_operacional → diagnostico_cnae → briefing → riscos → plano
```

O campo `diagnosticStatus` (novo, v2.1) está `null` porque este projeto nunca passou pelo novo fluxo. O briefingContent existe porque foi gerado pelo fluxo antigo com dados do `companyProfile` (sem respostas de questionário real).

### Camada 2: O `statusToCompletedStep` Não Conhece os Novos Status

O arquivo `client/src/lib/flowStepperUtils.ts` mapeia status → etapa concluída:

```typescript
const map: Record<string, FlowStep> = {
  rascunho:         1,
  assessment_fase1: 1,
  assessment_fase2: 2,
  matriz_riscos:    3,   // ← "Briefing concluído"
  plano_acao:       4,
  ...
};
```

Para `status="matriz_riscos"`, o mapa retorna `3` (Briefing concluído). **Os novos status `diagnostico_corporativo`, `diagnostico_operacional`, `diagnostico_cnae` não estão mapeados neste arquivo.** Se um projeto novo chegar com `status="diagnostico_corporativo"`, o `statusToCompletedStep` retornará `1` (fallback), o que é incorreto.

### Camada 3: O `QuestionarioV3` Entra em `isViewMode` por Causa do Status Legado

O `QuestionarioV3.tsx` (linha 692-694) determina o modo de visualização assim:

```typescript
const isViewMode = (project?.currentStep ?? 1) >= 3 || 
  ["aprovado", "em_andamento", "concluido", "arquivado", "em_avaliacao", 
   "parado", "plano_acao", "matriz_riscos"].includes(project?.status ?? "");
```

Para o projeto 630001:
- `project.currentStep = 4` → `4 >= 3` → **TRUE**
- `project.status = "matriz_riscos"` → está na lista → **TRUE**

**Resultado:** `isViewMode = true`. O componente entra diretamente no modo de leitura, sem nunca tentar carregar ou exibir perguntas.

### Camada 4: O `isViewMode` Renderiza Respostas Vazias

Quando `isViewMode = true` e `savedProgress` existe (mesmo que vazio), o componente renderiza:

```typescript
const allAnswers = savedProgress.answers || [];  // → []
const cnaeList = (project?.confirmedCnaes as any[]) || [];  // → [3 CNAEs]
// totalAnswers = 0
// Renderiza: "Questionário concluído — 0 respostas registradas em 3 CNAE(s)"
```

O sistema exibe exatamente o que está no banco: zero respostas. Não há bug de renderização — o componente está funcionando corretamente para o caso de uso para o qual foi projetado (visualização de questionário já respondido). O problema é que **ele está sendo acionado para um projeto que nunca respondeu o questionário**.

### Camada 5: O `ProjetoDetalhesV2` Também Está Desalinhado

O `ProjetoDetalhesV2.tsx` usa `statusToStep("matriz_riscos") = 3`, o que faz o stepper do projeto mostrar:
- Etapa 1 (Projeto): ✓ concluída
- Etapa 2 (Diagnóstico): ✓ concluída
- Etapa 3 (Briefing): **ativa** (currentStep=3)

Mas ao clicar na Etapa 2 (Diagnóstico), o botão navega para `/projetos/:id/questionario-v3` (linha 475 do ProjetoDetalhesV2), que é a rota do `QuestionarioV3` — o componente legado — e não para o novo fluxo de diagnóstico em 3 camadas.

---

## 4. Tabela AS-IS vs. Comportamento Esperado

| Dimensão | Comportamento Atual (Incorreto) | Comportamento Esperado (Correto) |
|---|---|---|
| **Status do projeto após CNAE** | Permanece em status legado (`matriz_riscos`, `assessment_fase1`, etc.) | Deve avançar para `diagnostico_corporativo` após confirmação de CNAEs |
| **Rota da Etapa 2** | `/questionario-v3` (componente legado) | `/questionario-corporativo-v2` (1ª camada do novo diagnóstico) |
| **`isViewMode` no QuestionarioV3** | `true` para qualquer projeto com `currentStep >= 3` | Deve verificar se `diagnosticStatus` está completo, não `currentStep` legado |
| **`statusToCompletedStep`** | Não mapeia `diagnostico_corporativo/operacional/cnae` | Deve mapear os 3 novos status para etapa 2 |
| **`statusToStep` no ProjetoDetalhesV2** | Não mapeia `diagnostico_corporativo/operacional/cnae` | Deve mapear os 3 novos status para step 2 |
| **Navegação pós-CNAE** | Nenhuma navegação automática | Após `confirmCnaes`, navegar para `/questionario-corporativo-v2` |
| **`flowStepperUtils`** | Mapa incompleto (sem novos status) | Deve incluir os 3 novos status com `completedUpTo=1` (etapa 1 concluída, etapa 2 em andamento) |

---

## 5. Mapa de Arquivos Afetados

| Arquivo | Problema | Tipo de Mudança |
|---|---|---|
| `client/src/lib/flowStepperUtils.ts` | Não mapeia `diagnostico_corporativo`, `diagnostico_operacional`, `diagnostico_cnae` | Adicionar 3 entradas no mapa |
| `client/src/pages/QuestionarioV3.tsx` | `isViewMode` usa `currentStep >= 3` sem verificar `diagnosticStatus` | Ajustar condição para excluir projetos com `diagnosticStatus=null` e status legado |
| `client/src/pages/ProjetoDetalhesV2.tsx` | `statusToStep` não mapeia novos status; botão Etapa 2 navega para rota errada | Adicionar mapeamento + corrigir rota do botão de Diagnóstico |
| `client/src/pages/NovoProjeto.tsx` ou `FormularioProjeto.tsx` | Após `confirmCnaes`, não navega para `/questionario-corporativo-v2` | Adicionar navegação automática pós-confirmação |
| `server/routers-fluxo-v3.ts` — `confirmCnaes` | Após confirmar CNAEs, não avança status para `diagnostico_corporativo` | Adicionar `status: "diagnostico_corporativo"` no `updateProject` pós-confirmação |

---

## 6. Fluxo Correto Esperado (TO-BE)

```
[Formulário do Projeto]
    ↓ discoverCnaes → refineCnaes → confirmCnaes
    ↓ [CORREÇÃO: status → "diagnostico_corporativo" + navegar para /questionario-corporativo-v2]
[QuestionarioCorporativoV2]
    ↓ completeDiagnosticLayer("corporate") → diagnosticStatus.corporate = "completed"
    ↓ [navegar para /questionario-operacional]
[QuestionarioOperacional]
    ↓ completeDiagnosticLayer("operational") → diagnosticStatus.operational = "completed"
    ↓ [navegar para /questionario-cnae]
[QuestionarioCNAE]
    ↓ completeDiagnosticLayer("cnae") → diagnosticStatus.cnae = "completed"
    ↓ [status → "diagnostico_cnae" — já implementado no diagnostic.ts]
    ↓ [navegar para /briefing-v3]
[BriefingV3]
    ↓ generateBriefingFromDiagnostic (usa corporateAnswers + operationalAnswers + cnaeAnswers)
```

---

## 7. Análise de Impacto da Correção

A correção é **cirúrgica** e não afeta os módulos de Briefing, Matrizes de Risco e Plano de Ação. Os arquivos `BriefingV3.tsx`, `MatrizesV3.tsx` e `PlanoAcaoV3.tsx` não precisam ser alterados. O `generateBriefingFromDiagnostic` já está implementado e funcional no backend.

O único risco é para projetos legados (como o 630001) que têm `status="matriz_riscos"` e `diagnosticStatus=null`. Esses projetos não devem ser redirecionados para o novo fluxo — eles devem permanecer acessíveis via `QuestionarioV3` em modo de visualização, como estão hoje. A correção deve ser **aditiva**, não destrutiva.

---

## 8. Critério de Aceite da Correção

1. Criar um novo projeto, confirmar CNAEs → sistema navega automaticamente para `/questionario-corporativo-v2`
2. Responder o Questionário Corporativo → sistema navega para `/questionario-operacional`
3. Responder o Questionário Operacional → sistema navega para `/questionario-cnae`
4. Responder o Questionário CNAE → sistema navega para `/briefing-v3`
5. Gerar briefing → usa `generateBriefingFromDiagnostic` (não o legado `generateBriefing`)
6. Projetos legados (status legado + `diagnosticStatus=null`) continuam acessíveis sem regressão
7. TypeScript: 0 erros | Testes críticos: todos passando

---

## 9. Classificação Final

| Critério | Avaliação |
|---|---|
| **Tipo** | Funcional — quebra de jornada do usuário |
| **Gravidade** | 🔴 P0 — Bloqueante total do fluxo principal |
| **Escopo** | Todos os projetos novos criados após a v2.1 |
| **Causa raiz** | Desalinhamento entre status legado (v2.0) e novo fluxo (v2.1): `confirmCnaes` não avança o status para `diagnostico_corporativo` e o `QuestionarioV3` entra em `isViewMode` por causa do `currentStep >= 3` legado |
| **Detectável por Shadow Mode** | ❌ Não — é erro de fluxo de UI, não de leitura de dados |
| **Detectável por testes automatizados** | ❌ Não — os testes existentes cobrem o fluxo legado |
| **Detectável por UAT** | ✅ Sim — detectado corretamente no primeiro teste manual |
| **Complexidade da correção** | 🟡 Média — 5 arquivos, mudanças cirúrgicas, sem risco de regressão nos módulos downstream |
