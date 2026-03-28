# FLUXO-3-ONDAS-AS-IS-TO-BE — Contrato de Implementação

**Versão:** 1.1
**Data:** 2026-03-27
**Autores:** Manus (implementador técnico) + Orquestrador (Claude — Anthropic)
**P.O.:** Uires Tapajós
**Status:** ✅ Aprovado pelo P.O. — pronto para implementação K-4-A

**Alterações v1.1:**
- Decisões formalizadas do P.O. registradas (5 perguntas respondidas)
- Adicionada Seção 6 — Integração no diagnóstico final
- Adicionada Seção 7 — Persistência por onda (schema Drizzle correto)
- Adicionada Seção 8 — Enforcement de fluxo no backend
- Adicionada Seção 9 — Regras da Onda 2 (IA Generativa)
- Adicionada Seção 10 — Máquina de estados do fluxo
- Corrigido schema Drizzle de `solaris_answers` e `iagen_answers`
- Corrigida tabela de enforcement (pré-condições por rota)
- Adicionado texto obrigatório do modal de retrocesso
- Adicionada invalidação do diagnóstico no retrocesso
- Nota de depreciação do `currentStep` registrada

---

## Decisões Formalizadas pelo P.O. — 2026-03-27

| # | Questão | Decisão | Justificativa |
|---|---------|---------|---------------|
| 1 | Persistência Onda 1 | Tabela separada `solaris_answers` | Rastreabilidade por SOL-001..012, auditoria jurídica, base para matriz de risco |
| 2 | Persistência Onda 2 | Tabela separada `iagen_answers` + campo `confidence_score` | Separa IA de conhecimento jurídico, permite controle de qualidade, evolução do modelo |
| 3 | Fluxo B | Manter como LEGACY_MODE — não evolui, não recebe features, será descontinuado | Evitar bifurcação de produto |
| 4 | Stepper UX | Etapas numeradas 1 a 8 (não "Pré-diagnóstico") | Mais didático para advogado, reduz confusão, facilita UAT |
| 5 | Fonte de verdade do fluxo | `status` (enum) é a fonte de verdade. `currentStep` é apenas visual | Elimina duplicação de lógica |

---

## Sumário Executivo

Este documento mapeia com precisão o estado atual da plataforma IA SOLARIS (AS-IS), propõe a arquitetura do fluxo com as 3 ondas de questionário (TO-BE), detalha o impacto em cada arquivo e tabela, e apresenta o plano de sprints para implementação controlada.

> **Regra crítica:** As ondas NÃO são partes de um mesmo questionário. Elas são **modelos distintos de geração de questionários**, apresentados em sequência independente antes do fluxo regulatório atual.

---

## Parte 1 — Conceito das 3 Ondas (Definição Canônica)

| Onda | Escopo | O que entrega | Origem (`fonte`) | Observação |
|------|--------|--------------|-----------------|------------|
| **1ª onda** | Base jurídica | 1 questionário único | `solaris` | Curadoria dos advogados SOLARIS. Sem CNAE, sem corporativo, sem operacional |
| **2ª onda** | IA generativa | 1 questionário único | `ia_gen` | Gerado dinamicamente com base no perfil da empresa |
| **3ª onda** | Modelo completo | Corporativo + Operacional + N×CNAE | `regulatorio` + lógica existente | Estrutura atual da plataforma |

**Regra de quantidade por onda (empresa com 5 CNAEs):**

| Elemento | 1ª Onda | 2ª Onda | 3ª Onda |
|----------|---------|---------|---------|
| Questionário base (advogados) | **1** | 0 | — |
| Questionário IA Gen | 0 | **1** | — |
| Questionário corporativo | 0 | 0 | **1** |
| Questionário operacional | 0 | 0 | **1** |
| Questionários por CNAE | 0 | 0 | **5** (1 por CNAE) |
| **Total** | **1** | **1** | **7** |

---

## Parte 2 — AS-IS: Fluxo Atual

### 2A — Diagrama de Rotas AS-IS

O sistema possui **dois fluxos paralelos** que nunca se cruzam. O P.O. usa o Fluxo A. O Fluxo B é um fluxo alternativo legado.

```
FLUXO A — "Diagnóstico Tributário" (3 camadas — USADO PELO P.O.)
================================================================

[Início]
  └─ ProjetoDetalhesV2 (/projetos/:id)
       └─ DiagnosticoStepper (3 etapas)
            ├─ [Etapa 1] QC → /questionario-corporativo-v2
            ├─ [Etapa 2] QO → /questionario-operacional
            ├─ [Etapa 3] QCNAE → /questionario-cnae
            └─ [Concluído] → /briefing-v3  ← vai DIRETO para o briefing

FLUXO B — "Compliance V3" (5 etapas — LEGADO, não usado pelo P.O.)
================================================================

[Início]
  └─ FormularioProjeto (/projetos/:id/formulario)
       └─ FlowStepper (5 etapas)
            ├─ [Etapa 1] Formulário
            ├─ [Etapa 2] QuestionarioV3 → /questionario-v3  ← K-2 e K-3 estão aqui
            ├─ [Etapa 3] BriefingV3 → /briefing-v3
            ├─ [Etapa 4] MatrizesV3 → /matrizes-v3
            └─ [Etapa 5] PlanoV3 → /plano-v3
```

**Descoberta crítica:** K-2 (`onda1Injector`) e K-3 (badges visuais) foram implementados no Fluxo B. O P.O. usa o Fluxo A. As perguntas SOLARIS nunca apareceram no teste porque o P.O. nunca passou pelo Fluxo B.

### 2B — Componentes AS-IS

| Componente | Arquivo | Fluxo | Estado |
|-----------|---------|-------|--------|
| DiagnosticoStepper | `client/src/components/DiagnosticoStepper.tsx` | A | 3 etapas (QC, QO, QCNAE) |
| FlowStepper | `client/src/components/FlowStepper.tsx` | B | 5 etapas (Form, Q, Briefing, Matrizes, Plano) |
| QuestionarioCorporativoV2 | `client/src/pages/QuestionarioCorporativoV2.tsx` | A | Ativo |
| QuestionarioOperacional | `client/src/pages/QuestionarioOperacional.tsx` | A | Ativo |
| QuestionarioCNAE | `client/src/pages/QuestionarioCNAE.tsx` | A | Ativo |
| QuestionarioV3 | `client/src/pages/QuestionarioV3.tsx` | B | Legado — tem badges K-3 |
| BriefingV3 | `client/src/pages/BriefingV3.tsx` | A+B | Compartilhado |
| onda1Injector | `server/routers/onda1Injector.ts` | B | Implementado em K-2 |
| generateQuestions | `server/routers-fluxo-v3.ts` | B | Chamado apenas pelo Fluxo B |

### 2C — Campo `currentStep` AS-IS

O campo `currentStep` (int) na tabela `projects` é atualizado pelo frontend ao navegar entre etapas. Valores atuais: 0 (rascunho), 1 (QC), 2 (QO), 3 (QCNAE), 4 (briefing), 5 (matrizes), 6 (plano).

> **NOTA DE DEPRECIAÇÃO:** O campo `currentStep` (int) será depreciado futuramente. A fonte de verdade do fluxo é o campo `status` (enum). O `currentStep` será mantido apenas para compatibilidade visual com componentes existentes e removido em sprint futura. Registrar como débito técnico no M4.

### 2D — Tabela `solaris_questions` AS-IS

- Criada em K-1 (PR #159, migration `0056_old_molten_man.sql`)
- 12 questões seed inseridas (SOL-001 a SOL-012, ids 1–12)
- **Ausência crítica:** coluna `codigo` (VARCHAR 10) não foi implementada em K-1 — será adicionada em K-4-A

---

## Parte 3 — TO-BE: Fluxo Unificado com 3 Ondas

### 3A — Diagrama de Rotas TO-BE

```
FLUXO UNIFICADO — 8 etapas (DiagnosticoStepper expandido)
==========================================================

[Início]
  └─ ProjetoDetalhesV2 (/projetos/:id)
       └─ DiagnosticoStepper (8 etapas)
            ├─ [Etapa 1] Onda 1 SOLARIS → /questionario-solaris
            ├─ [Etapa 2] Onda 2 IA Gen  → /questionario-iagen
            ├─ [Etapa 3] QC             → /questionario-corporativo-v2
            ├─ [Etapa 4] QO             → /questionario-operacional
            ├─ [Etapa 5] QCNAE          → /questionario-cnae
            ├─ [Etapa 6] Briefing       → /briefing-v3
            ├─ [Etapa 7] Matrizes       → /matrizes-v3
            └─ [Etapa 8] Plano          → /plano-v3
```

### 3B — Novos Status do Enum `status`

| Status | Significado | Etapa |
|--------|-------------|-------|
| `rascunho` | Projeto criado, CNAEs confirmados | — |
| `onda1_solaris` | **NOVO** — Onda 1 concluída e validada | Etapa 1 |
| `onda2_iagen` | **NOVO** — Onda 2 concluída e validada | Etapa 2 |
| `diagnostico_corporativo` | QC concluído | Etapa 3 |
| `diagnostico_operacional` | QO concluído | Etapa 4 |
| `diagnostico_cnae` | QCNAE concluído | Etapa 5 |
| `briefing` | Briefing gerado | Etapa 6 |
| `matriz_riscos` | Matrizes geradas | Etapa 7 |
| `aprovado` | Plano aprovado | Etapa 8 |

> **Semântica:** `onda1_solaris` e `onda2_iagen` representam **etapa validada** (respostas salvas e completas), não apenas "etapa aberta". O backend só seta esses status após validar a completude dos dados.

### 3C — Novos Componentes a Criar

| Componente | Arquivo | Sprint |
|-----------|---------|--------|
| QuestionarioSolaris | `client/src/pages/QuestionarioSolaris.tsx` | K-4-B |
| QuestionarioIagen | `client/src/pages/QuestionarioIagen.tsx` | K-4-C |
| DiagnosticoStepper (expandido) | `client/src/components/DiagnosticoStepper.tsx` | K-4-A |

### 3D — Impacto em Arquivos Existentes

| Arquivo | Tipo de mudança | Sprint |
|---------|----------------|--------|
| `drizzle/schema.ts` | Adicionar `solarisAnswers`, `iagenAnswers`, `projectStatusLog`; estender enum `status`; adicionar `codigo` em `solarisQuestions` | K-4-A |
| `server/flowStateMachine.ts` | Estender com `VALID_TRANSITIONS` e `assertValidTransition` | K-4-A |
| `server/routers-fluxo-v3.ts` | Adicionar procedures `completeOnda1`, `completeOnda2` | K-4-B/C |
| `server/routers/onda1Injector.ts` | Mover lógica para o novo fluxo A | K-4-B |
| `client/src/components/DiagnosticoStepper.tsx` | Expandir de 3 para 8 etapas | K-4-A |
| `client/src/App.tsx` | Adicionar rotas `/questionario-solaris` e `/questionario-iagen` | K-4-B |

---

## Parte 4 — Plano de Sprints K-4

| Sprint | Escopo | Duração | Gate P.O. |
|--------|--------|---------|-----------|
| **K-4-A** | Migrations (3): `codigo` em `solaris_questions`, `solaris_answers`, `iagen_answers`. Estender `flowStateMachine.ts`. Expandir `DiagnosticoStepper` para 8 etapas (visuais, sem lógica). | 1 dia | Não |
| **K-4-B** | Tela `QuestionarioSolaris.tsx` + procedure `completeOnda1`. Onda 1 aparece no Fluxo A. | 1 dia | **Sim — P.O. testa** |
| **K-4-C** | Tela `QuestionarioIagen.tsx` + procedure `completeOnda2`. Onda 2 aparece no Fluxo A. | 1,5 dias | **Sim — P.O. testa** |
| **K-4-D** | Integração no diagnóstico: `solaris_answers` e `iagen_answers` injetados nos prompts de `generateBriefing` e `generateRiskMatrices`. | 1 dia | **Sim — P.O. valida diagnóstico** |
| **K-4-E** | `project_status_log` (migration + logging). Limpeza do Fluxo B (LEGACY_MODE). Remoção dos badges do QuestionarioV3. | 0,5 dia | Não |

**Total estimado:** 5 dias de desenvolvimento, 3 gates P.O.

---

## Parte 5 — Fluxo B: LEGACY_MODE

```
FLUXO B = LEGACY_MODE

Status: mantido temporariamente
Regras formais:
- NÃO recebe novas features
- NÃO recebe badges das ondas
- NÃO evolui o schema
- Uso restrito — apenas projetos antigos
- Será descontinuado em K-4-E (Issue a criar no M4)

O time NUNCA deve desenvolver nova funcionalidade no Fluxo B.
```

---

## Parte 6 — Perguntas Respondidas pelo P.O.

Todas as 5 perguntas foram respondidas e formalizadas na seção "Decisões Formalizadas" no início deste documento.

---

## Parte 7 — Estado Atual dos Erros do Watcher TypeScript

**Problema identificado durante o diagnóstico:**

O servidor de desenvolvimento (watcher TypeScript) reporta 4 erros relacionados a `solarisQuestions`:

```
server/db.ts(25,3): error TS2305: Module '"../drizzle/schema"' has no exported member 'solarisQuestions'.
server/db.ts(25,21): error TS2305: Module '"../drizzle/schema"' has no exported member 'InsertSolarisQuestion'.
server/db.ts(25,44): error TS2305: Module '"../drizzle/schema"' has no exported member 'SolarisQuestion'.
server/routers/onda1Injector.ts(18,15): error TS2305: Module '"../../drizzle/schema"' has no exported member 'SolarisQuestion'.
```

**Causa:** O watcher está usando um cache de compilação anterior ao K-1. O `drizzle/schema.ts` local tem os exports corretos (linha 1685). O `npx tsc --noEmit` retorna exit code 0 (zero erros reais). O `dist/index.js` compilado tem todos os módulos corretos.

**Ação necessária em K-4-A:** Forçar rebuild do watcher via `pnpm build` ou reinicialização do servidor de desenvolvimento para eliminar os falsos positivos.

---

## Seção 6 — Integração no Diagnóstico Final

### Princípio fundamental

> "As ondas são independentes na coleta de dados, mas convergem em um único diagnóstico final."

Sem esta integração, a Onda 1 e a Onda 2 são **cosméticas** — o advogado responde as perguntas mas o diagnóstico ignora as respostas.

### Como cada onda alimenta o diagnóstico

**Onda 1 (SOLARIS) → Riscos práticos no diagnóstico:**

As respostas de `solaris_answers` são injetadas como contexto adicional no prompt de `generateRiskMatrices`. Uma resposta "NÃO" na SOL-002 (monitoramento CGIBS) gera risco crítico de confissão por inércia na matriz. Uma resposta "SIM" reduz ou mitiga o risco. As respostas devem aparecer no briefing como "riscos práticos identificados pela equipe jurídica SOLARIS". Impacta: Briefing + Matrizes de Risco + Plano de Ação.

**Onda 2 (IA Gen) → Personalização por perfil:**

As respostas de `iagen_answers` são injetadas no contexto de `generateBriefing` e `generateRiskMatrices`. Perguntas não respondidas ou respondidas com "Não se aplica" são filtradas do contexto. Apenas respostas com `confidence_score >= 0.7` são incluídas. Impacta: Briefing + Matrizes de Risco.

**Onda 3 (regulatório) → Base legislativa:**

Funcionamento atual — não alterar. É a base sobre a qual as ondas 1 e 2 adicionam contexto.

### Implementação técnica — onde integrar

```typescript
// server/routers-fluxo-v3.ts — função generateBriefing
// Adicionar ao contexto existente (referencial — não prescritivo):
const onda1Context = await getOnda1AnswersForProject(projectId)
const onda2Context = await getOnda2AnswersForProject(projectId)

// Injetar no prompt:
// ${formatOnda1Context(onda1Context)} → riscos práticos identificados
// ${formatOnda2Context(onda2Context)} → perfil específico da empresa
```

### Critério de validação (K-4-D)

O diagnóstico está correto quando:

- Empresa que respondeu "NÃO" em SOL-002 recebe risco crítico de confissão por inércia na matriz
- Empresa que respondeu "SIM" em SOL-002 recebe risco mitigado ou não recebe o risco
- O briefing menciona os riscos práticos da Onda 1
- O briefing menciona a personalização da Onda 2

### O que NÃO fazer

- ❌ Ignorar as respostas das ondas 1 e 2 no diagnóstico
- ❌ Usar as respostas apenas para exibição (cosmético)
- ❌ Misturar as respostas das 3 ondas em uma única estrutura

---

## Seção 7 — Persistência por Onda

### Decisão: tabelas separadas para Onda 1 e Onda 2

Tabelas JSON seriam erro grave: impossível fazer JOIN para auditoria, impossível rastrear resposta SOL-002 → risco na matriz, impossível filtrar por `confidence_score`, impossível evoluir o schema sem migração destrutiva.

### Schema Drizzle — `solaris_answers` (Onda 1)

```typescript
// drizzle/schema.ts — adicionar em K-4-A
export const solarisAnswers = mysqlTable('solaris_answers', {
  id:         int('id').autoincrement().primaryKey(),
  projectId:  int('project_id').notNull()
              .references(() => projects.id),
  questionId: int('question_id').notNull()
              .references(() => solarisQuestions.id),
  codigo:     varchar('codigo', { length: 10 }).notNull(), // SOL-001..012
  resposta:   text('resposta').notNull(),
  fonte:      varchar('fonte', { length: 20 }).default('solaris'),
  createdAt:  bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt:  bigint('updated_at', { mode: 'number' }).notNull(),
})
// Índice único: (project_id, codigo)
```

> **NOTA K-4-A:** Antes de criar `solaris_answers`, adicionar coluna `codigo VARCHAR(10)` à tabela `solaris_questions` existente e atualizar o seed com os valores SOL-001..012 nos registros ids 1–12. A coluna `codigo` foi especificada no design original mas não implementada em K-1.

### Schema Drizzle — `iagen_answers` (Onda 2)

```typescript
// drizzle/schema.ts — adicionar em K-4-A
export const iagenAnswers = mysqlTable('iagen_answers', {
  id:              int('id').autoincrement().primaryKey(),
  projectId:       int('project_id').notNull()
                   .references(() => projects.id),
  questionText:    text('question_text').notNull(),
  resposta:        text('resposta').notNull(),
  confidenceScore: decimal('confidence_score', { precision: 3, scale: 2 }),
  fonte:           varchar('fonte', { length: 20 }).default('ia_gen'),
  createdAt:       bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt:       bigint('updated_at', { mode: 'number' }).notNull(),
})
// Índice: (project_id)
```

### Padrão unificado de dados (todas as ondas)

| Campo | Onda 1 | Onda 2 | Onda 3 |
|-------|--------|--------|--------|
| `project_id` | ✅ | ✅ | ✅ (existente) |
| `question_id` | SOL-001..N | gerado dinâmico | existente |
| `resposta` | texto | texto | texto |
| `fonte` | `solaris` | `ia_gen` | `regulatorio` |
| `confidence_score` | N/A | ✅ obrigatório | N/A |
| `created_at` | ✅ ms UTC | ✅ ms UTC | ✅ (existente) |

### Fluxo B (LEGACY_MODE) — regra formal

```
FLUXO B = LEGACY_MODE

Status: mantido temporariamente
Regras:
- NÃO recebe novas features
- NÃO recebe badges das ondas
- NÃO evolui o schema
- Uso restrito — apenas projetos antigos
- Será descontinuado em K-4-E (Issue a criar no M4)

O time NUNCA deve desenvolver nova funcionalidade no Fluxo B.
```

---

## Seção 8 — Enforcement de Fluxo no Backend

### Princípio: backend é a fonte de verdade, não o frontend

O stepper no frontend é apenas visual. O enforcement real acontece no backend via tRPC. O frontend nunca altera o campo `status` diretamente — apenas o backend (via tRPC) atualiza o campo.

### Tabela de enforcement por rota

| Rota | Pré-condição no backend | Status setado ao sair | Erro se não atendido |
|------|------------------------|-----------------------|---------------------|
| `/questionario-solaris` | Projeto existe + ondas não iniciadas | `onda1_solaris` | FORBIDDEN |
| `/questionario-iagen` | `status = 'onda1_solaris'` (Onda 1 concluída) | `onda2_iagen` | FORBIDDEN |
| `/questionario-corporativo-v2` | `status = 'onda2_iagen'` (Onda 2 concluída) | `diagnostico_corporativo` | FORBIDDEN |
| `/questionario-operacional` | `status = 'diagnostico_corporativo'` | `diagnostico_operacional` | FORBIDDEN |
| `/questionario-cnae` | `status = 'diagnostico_operacional'` | `diagnostico_cnae` | FORBIDDEN |
| `/briefing-v3` | `status = 'diagnostico_cnae'` | `briefing` | FORBIDDEN |
| `/matrizes-v3` | `status = 'briefing'` | `matriz_riscos` | FORBIDDEN |
| `/plano-v3` | `status = 'matriz_riscos'` | `aprovado` | FORBIDDEN |

**Resposta ao usuário quando bloqueado:** Backend retorna `TRPCError({ code: 'FORBIDDEN' })`. Frontend exibe: "Etapa indisponível. Conclua a etapa anterior."

### Proteção contra acesso direto por URL

```typescript
// Referencial — em cada componente de onda/questionário:
useEffect(() => {
  if (project.status !== expectedStatus) {
    navigate(`/projetos/${projectId}`) // volta ao dashboard do projeto
  }
}, [project.status])
```

### Modal de retrocesso — texto obrigatório

O modal NUNCA deve ser genérico. Sempre listar exatamente o que será perdido.

**Retroceder da Onda 2 para a Onda 1:**
> "Você perderá todas as respostas da Onda 2 (Perfil da empresa). Esta ação não pode ser desfeita. Deseja continuar?"

**Retroceder da Onda 3 (QC) para a Onda 2:**
> "Você perderá todas as respostas do Questionário Corporativo e da Onda 2 (Perfil da empresa). Esta ação não pode ser desfeita. Deseja continuar?"

**Retroceder de Briefing/Matrizes/Plano para qualquer etapa anterior:**
> "Você perderá o diagnóstico gerado (briefing, matrizes de risco e plano de ação). Será necessário regenerar o diagnóstico após as alterações. Esta ação não pode ser desfeita. Deseja continuar?"

### Invalidação do diagnóstico no retrocesso

Qualquer retrocesso de onda invalida os dados do diagnóstico já gerado. O sistema deve limpar e exigir regeneração.

| Retrocesso | O que é invalidado e limpo |
|-----------|---------------------------|
| Onda 2 → Onda 1 | `iagen_answers` do projeto |
| Onda 3 → Onda 2 | `iagen_answers` + respostas QC |
| Qualquer → antes do Briefing | Apenas respostas da etapa posterior |
| Qualquer → após Briefing gerado | `briefingContentV3` + `riskMatricesDataV3` + `actionPlansDataV3` |

**Regra crítica:** se o advogado retrocede após o briefing estar gerado, o diagnóstico completo é invalidado. O sistema deve: (1) limpar `briefingContentV3`, `riskMatricesDataV3`, `actionPlansDataV3`; (2) atualizar `status` para o status da etapa de destino; (3) exibir aviso: "Diagnóstico anterior removido. Regenere após as alterações."

---

## Seção 9 — Regras da Onda 2 (IA Generativa)

A Onda 2 é a mais complexa porque depende de IA. Sem regras claras, pode travar, gerar perguntas ruins ou criar inconsistência.

### Limites de geração

```
Quantidade: mínimo 5, máximo 10 perguntas por projeto
Timeout: 30 segundos (após isso → fallback obrigatório)
Temperatura LLM: 0.3 (consistência)
MaxTokens: 2.000 (suficiente para 10 perguntas)
```

### Parâmetros de entrada (combinatórios)

```typescript
// Referencial — interface Onda2Params
interface Onda2Params {
  regime: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'lucro_arbitrado'
  porte: 'mei' | 'pequena' | 'media' | 'grande'
  cnaes: string[]                    // ex: ['4639-7/01', '1113-5/02']
  operacao_interestadual: boolean
  faz_exportacao: boolean
  contrata_simples_nacional: boolean
  tem_ativo_imobilizado: boolean
}
```

### Estrutura obrigatória do output (JSON)

```typescript
// Referencial — interface Onda2Question
interface Onda2Question {
  id: string                          // gerado: "ia-gen-001", "ia-gen-002"...
  texto: string                       // a pergunta
  objetivo_diagnostico: string        // o que essa pergunta diagnostica
  combinacao_gatilho: string          // ex: "Lucro Presumido + exportação"
  fonte: 'ia_gen'                     // fixo
  confidence_score: number            // 0.0 a 1.0
}
```

### Fallback obrigatório

Se a IA falhar (timeout, erro de API, resposta inválida):

1. Logar o erro (não silencioso)
2. Exibir conjunto padrão de 5 perguntas genéricas de Onda 2 (hardcoded em `server/routers/onda2Fallback.ts` — não depende de banco)
3. Marcar as perguntas fallback com `confidence_score = 0.5`
4. Não bloquear o fluxo — o advogado prossegue normalmente

### Filtragem de qualidade

```
Perguntas com confidence_score < 0.7:
- Não injetadas no diagnóstico final
- Respondidas mas marcadas como "baixa confiança"
- Podem ser revisadas em sprint futura (Onda 2 v2)
```

### O que NÃO gerar na Onda 2

- ❌ Perguntas idênticas às da Onda 1 (SOLARIS)
- ❌ Perguntas sobre o que a lei diz (isso é Onda 3)
- ❌ Perguntas genéricas que se aplicam a qualquer empresa
- ❌ Mais de 10 perguntas

---

## Seção 10 — Máquina de Estados do Fluxo

### Por que formalizar

O `status` como fonte de verdade cria implicitamente uma state machine distribuída. Sem formalização, as regras de transição ficam espalhadas em vários lugares — difícil manutenção e bugs de transição silenciosos.

### Diagrama de estados

```
rascunho
    │ (projeto criado, CNAEs confirmados)
    ▼
onda1_solaris
    │ (Onda 1 concluída — respostas salvas em solaris_answers)
    ▼
onda2_iagen
    │ (Onda 2 concluída — respostas salvas em iagen_answers)
    ▼
diagnostico_corporativo
    │ (QC concluído)
    ▼
diagnostico_operacional
    │ (QO concluído)
    ▼
diagnostico_cnae
    │ (QCNAE concluído)
    ▼
briefing
    │ (briefing gerado)
    ▼
matriz_riscos
    │ (matrizes geradas)
    ▼
aprovado
```

### Regras de transição

- Transições são **unidirecionais** no avanço
- Retrocesso é permitido com modal de confirmação
- Retrocesso **sempre limpa** os dados das etapas posteriores
- Nenhuma transição é permitida sem enforcement no backend
- O frontend **nunca** transita o status diretamente — apenas o backend (via tRPC) atualiza o campo `status`

### Implementação — estender arquivo existente

```typescript
// server/flowStateMachine.ts
// ESTENDER arquivo existente — NÃO criar novo
// Adicionar ao arquivo existente (que já tem FLOW_STEPS, FlowStep, StepConfig, FLOW_STEP_MAP):

export const VALID_TRANSITIONS: Record<string, string[]> = {
  'rascunho':                ['onda1_solaris'],
  'onda1_solaris':           ['onda2_iagen', 'rascunho'],
  'onda2_iagen':             ['diagnostico_corporativo', 'onda1_solaris'],
  'diagnostico_corporativo': ['diagnostico_operacional', 'onda2_iagen'],
  'diagnostico_operacional': ['diagnostico_cnae', 'diagnostico_corporativo'],
  'diagnostico_cnae':        ['briefing', 'diagnostico_operacional'],
  'briefing':                ['matriz_riscos', 'diagnostico_cnae'],
  'matriz_riscos':           ['aprovado', 'briefing'],
  'aprovado':                ['matriz_riscos'],
}

export function assertValidTransition(from: string, to: string) {
  if (!VALID_TRANSITIONS[from]?.includes(to)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Transição inválida: ${from} → ${to}`
    })
  }
}
```

### Consistência entre status e dados

O status avançar sem dados correspondentes é um bug silencioso. Para cada transição, o backend deve validar antes de confirmar:

| Status setado | Validação obrigatória antes de confirmar |
|--------------|----------------------------------------|
| `onda1_solaris` | Respostas Onda 1 completas (não apenas `≥1 registro` — validar completude da etapa) |
| `onda2_iagen` | Respostas Onda 2 completas |
| `diagnostico_corporativo` | Respostas QC salvas |
| `briefing` | `briefingContentV3` não está vazio |
| `matriz_riscos` | `riskMatricesDataV3` não está vazio |

Se inconsistente: bloquear a transição, retornar `TRPCError({ code: 'PRECONDITION_FAILED' })`, logar o erro (não silencioso), não gerar diagnóstico com dados incompletos.

### Log de transições (auditoria jurídica) — K-4-E

```typescript
// drizzle/schema.ts — adicionar em K-4-E (fora do K-4-A)
export const projectStatusLog = mysqlTable('project_status_log', {
  id:         int('id').autoincrement().primaryKey(),
  projectId:  int('project_id').notNull().references(() => projects.id),
  fromStatus: varchar('from_status', { length: 50 }).notNull(),
  toStatus:   varchar('to_status', { length: 50 }).notNull(),
  userId:     int('user_id').notNull(),
  createdAt:  bigint('created_at', { mode: 'number' }).notNull(),
})
```

**Benefícios:** auditoria completa do caminho percorrido, debugging rápido de bugs de fluxo, rastreabilidade nível jurídico, base para analytics futuros (tempo médio por etapa).

> **Decisão do P.O.:** `project_status_log` vai para K-4-E — fora do K-4-A. K-4-A tem apenas 3 migrations: (1) `codigo` em `solaris_questions`, (2) `solaris_answers`, (3) `iagen_answers`.

---

## Resumo Executivo para o P.O.

**O que existia (AS-IS):** Dois fluxos paralelos. O P.O. usa o Fluxo A (QC → QO → QCNAE → Briefing). O K-2 e K-3 foram implementados no Fluxo B (não usado pelo P.O.) — isso explica por que as perguntas SOLARIS não apareceram no teste.

**O que será construído (TO-BE):** Um fluxo unificado com 8 etapas onde Onda 1 (SOLARIS) e Onda 2 (IA Gen) aparecem como etapas independentes ANTES do QC/QO/QCNAE. As respostas das ondas alimentam o diagnóstico final (briefing + matrizes).

**Estimativa total:** 5 dias de desenvolvimento (K-4-A a K-4-E), 3 gates de validação P.O. (K-4-B, K-4-C, K-4-D).

**Risco mais alto:** Migration do enum `status` (K-4-A) — precisa de migration reversa documentada antes de executar.

**Próximo passo:** Merge deste PR. Após o merge, K-4-A pode iniciar imediatamente.

---

*Documento gerado por Manus (implementador técnico) — v1.0 em 2026-03-27, v1.1 em 2026-03-27*
*Baseado em leitura direta do código-fonte — zero suposições*
*v1.1 aprovado pelo P.O. Uires Tapajós — pronto para implementação K-4-A*
