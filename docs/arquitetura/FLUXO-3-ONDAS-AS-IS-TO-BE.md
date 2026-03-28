# IA SOLARIS — Arquitetura do Fluxo das 3 Ondas de Questionário

**Versão:** 1.0  
**Data:** 2026-03-28  
**Autores:** Manus (implementador técnico) + Orquestrador (Claude — Anthropic)  
**P.O.:** Uires Tapajós  
**Status:** Aguarda validação do P.O. antes de qualquer implementação

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
    │
    ▼
[Criar Projeto] (/projetos/novo)
    │ → identifica CNAEs via IA (NovoProjeto.tsx)
    │ → salva: confirmedCnaes, companyProfile
    │ → currentStep = 1, status = "rascunho"
    │
    ▼
[Detalhe do Projeto] (/projetos/:id)
    │ → ProjetoDetalhesV2.tsx
    │ → DiagnosticoStepper: exibe 3 camadas (corporate | operational | cnae)
    │
    ├─ [1] QC (/projetos/:id/questionario-corporativo-v2)
    │       → QuestionarioCorporativoV2.tsx
    │       → 10 seções: QC-01 a QC-10
    │       → salva: respostas corporativas
    │       → completa camada "corporate"
    │       → navega para QO ao concluir
    │
    ├─ [2] QO (/projetos/:id/questionario-operacional)
    │       → QuestionarioOperacional.tsx
    │       → 10 seções: QO-01 a QO-10
    │       → salva: respostas operacionais
    │       → completa camada "operational"
    │       → navega para QCNAE ao concluir (setTimeout 1500ms)
    │
    └─ [3] QCNAE (/projetos/:id/questionario-cnae)
            → QuestionarioCNAE.tsx
            → 5 seções temáticas FIXAS (não 1 por CNAE)
            → completa camada "cnae"
            → navega para Briefing V3 ao concluir (setTimeout 1500ms)
    │
    ▼
[Briefing V3] (/projetos/:id/briefing-v3)
    │ → BriefingV3.tsx
    │ → gera briefing via LLM
    │ → currentStep = 4, status = "briefing"
    │
    ▼
[Matrizes V3] (/projetos/:id/matrizes-v3)
    │ → MatrizesV3.tsx
    │ → currentStep = 5, status = "matriz_riscos"
    │
    ▼
[Plano de Ação V3] (/projetos/:id/plano-v3)
    │ → PlanoAcaoV3.tsx
    │ → currentStep = 5, status = "aprovado"
    ▼
[FIM]


FLUXO B — "Compliance V3" (5 etapas — NÃO USADO PELO P.O.)
===========================================================

[FormularioProjeto] (/projetos/:id/formulario)
    │ → step <= 2 → navega para questionario-v3
    │
    ▼
[QuestionarioV3] (/projetos/:id/questionario-v3)
    │ → QuestionarioV3.tsx
    │ → chama trpc.fluxoV3.generateQuestions (IA gera perguntas)
    │ → injectOnda1IntoQuestions() ← K-2 implementado AQUI (errado)
    │ → badges K-3 implementados AQUI (errado)
    │ → currentStep = 3, status = "cnaes_confirmados"
    │
    ▼
[BriefingV3] (/projetos/:id/briefing-v3)
    │ → currentStep = 4, status = "briefing"
    ▼
[MatrizesV3] → [PlanoAcaoV3]
```

**Problema identificado:** K-2 (`onda1Injector`) e K-3 (badges) foram implementados no Fluxo B, que não é usado pelo P.O. O Fluxo A (caminho real do P.O.) não tem nenhuma etapa de questionário IA.

---

### 2B — Tabela de Componentes AS-IS

| Componente | Arquivo | Função | Fluxo |
|---|---|---|---|
| `DiagnosticoStepper` | `client/src/components/DiagnosticoStepper.tsx` | Controla 3 camadas: corporate → operational → cnae | **Fluxo A** |
| `FlowStepper` | `client/src/components/FlowStepper.tsx` | Controla 5 etapas: Projeto → Questionário → Briefing → Riscos → Plano | **Fluxo B** |
| `QuestionarioCorporativoV2` | `client/src/pages/QuestionarioCorporativoV2.tsx` | QC-01 a QC-10 | **Fluxo A** |
| `QuestionarioOperacional` | `client/src/pages/QuestionarioOperacional.tsx` | QO-01 a QO-10 | **Fluxo A** |
| `QuestionarioCNAE` | `client/src/pages/QuestionarioCNAE.tsx` | 5 seções temáticas fixas por CNAE | **Fluxo A** |
| `QuestionarioV3` | `client/src/pages/QuestionarioV3.tsx` | Questionário IA (gera perguntas via LLM) | **Fluxo B** |
| `onda1Injector.ts` | `server/routers/onda1Injector.ts` | Injeta perguntas Onda 1 no pipeline IA | **Fluxo B** (errado) |
| `BriefingV3` | `client/src/pages/BriefingV3.tsx` | Gera briefing via LLM | Ambos |
| `MatrizesV3` | `client/src/pages/MatrizesV3.tsx` | Matrizes de risco | Ambos |
| `PlanoAcaoV3` | `client/src/pages/PlanoAcaoV3.tsx` | Plano de ação | Ambos |
| `ProjetoDetalhesV2` | `client/src/pages/ProjetoDetalhesV2.tsx` | Dashboard do projeto — ponto de entrada do Fluxo A | **Fluxo A** |

---

### 2C — `currentStep` e `status` AS-IS

O campo `currentStep` é um `int` (1–9) na tabela `projects`. O campo `status` é um `enum` com 19 valores possíveis.

| `currentStep` | `status` (stepName) | Rota associada | Fluxo |
|---|---|---|---|
| 1 | `rascunho` / `perfil_empresa` | `/projetos/novo` | A e B |
| 2 | `consistencia_pendente` / `descoberta_cnaes` | `/projetos/:id` | A e B |
| 3 | `cnaes_confirmados` / `confirmacao_cnaes` | `/projetos/:id/questionario-v3` | B |
| 3 | `diagnostico_corporativo` | `/projetos/:id/questionario-corporativo-v2` | A |
| 3 | `diagnostico_operacional` | `/projetos/:id/questionario-operacional` | A |
| 3 | `diagnostico_cnae` | `/projetos/:id/questionario-cnae` | A |
| 4 | `briefing` | `/projetos/:id/briefing-v3` | A e B |
| 5 | `matriz_riscos` | `/projetos/:id/matrizes-v3` | A e B |
| 5 | `aprovado` | `/projetos/:id/plano-v3` | A e B |

**Observação:** Não existem valores de `currentStep` ou `status` para "Onda 1" ou "Onda 2". Esses estados precisarão ser criados.

---

### 2D — Estado do Seed e Tabela `solaris_questions`

| Item | Estado |
|------|--------|
| Tabela `solaris_questions` em produção | ✅ Existe (migration `0057_odd_ink.sql`) |
| Seed SOL-001..012 | ✅ 12 registros inseridos (`ativo=1`, `fonte='solaris'`) |
| `cnae_groups` | 11 perguntas universais (`NULL`) + 1 filtrada por CNAE (id=8, grupos de comércio/indústria) |
| Exports no schema.ts | ✅ `solarisQuestions`, `SolarisQuestion`, `InsertSolarisQuestion` (linha 1685) |
| Watcher TypeScript | ⚠️ 4 erros falso-positivos (cache desatualizado) — `npx tsc --noEmit` retorna 0 erros |

---

## Parte 3 — TO-BE: Fluxo com as 3 Ondas

### 3A — Diagrama de Rotas TO-BE

A proposta é **unificar os dois fluxos** em um único fluxo sequencial, inserindo as Ondas 1 e 2 **antes** do Fluxo A existente.

```
FLUXO UNIFICADO — "Compliance Tributário com 3 Ondas" (TO-BE)
=============================================================

[Início]
    │
    ▼
[Criar Projeto] (/projetos/novo)
    │ → identifica CNAEs via IA
    │ → salva: confirmedCnaes, companyProfile
    │ → currentStep = 1, status = "rascunho"
    │
    ▼
[Detalhe do Projeto] (/projetos/:id)
    │ → DiagnosticoStepper EXPANDIDO (8 etapas)
    │
    ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔵 ONDA 1 — Equipe Jurídica SOLARIS  [NOVA ETAPA]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Questionário SOLARIS] (/projetos/:id/questionario-solaris)  [NOVA ROTA]
    │ → QuestionarioSolaris.tsx  [NOVO COMPONENTE]
    │ → busca solaris_questions filtradas por CNAE
    │ → exibe 12 perguntas (SOL-001..012) com badge azul
    │ → advogado responde e avança
    │ → currentStep = 2, status = "onda1_solaris"  [NOVO STATUS]
    │
    ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟠 ONDA 2 — Perfil da Empresa (IA Gen)  [NOVA ETAPA]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Questionário IA Gen] (/projetos/:id/questionario-iagen)  [NOVA ROTA]
    │ → QuestionarioIaGen.tsx  [NOVO COMPONENTE]
    │ → gera perguntas combinatórias por perfil (regime, porte, operação, CNAE)
    │ → badge laranja "Perfil da empresa"
    │ → advogado responde e avança
    │ → currentStep = 3, status = "onda2_iagen"  [NOVO STATUS]
    │
    ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟢 ONDA 3 — Legislação (modelo completo)  [EXISTENTE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[QC] (/projetos/:id/questionario-corporativo-v2)
    │ → currentStep = 4, status = "diagnostico_corporativo"
    ▼
[QO] (/projetos/:id/questionario-operacional)
    │ → currentStep = 4, status = "diagnostico_operacional"
    ▼
[QCNAE] (/projetos/:id/questionario-cnae) × N CNAEs
    │ → currentStep = 4, status = "diagnostico_cnae"
    │
    ▼
[Briefing V3] (/projetos/:id/briefing-v3)
    │ → currentStep = 5, status = "briefing"
    ▼
[Matrizes V3] → [Plano de Ação V3]
```

---

### 3B — DiagnosticoStepper TO-BE (8 etapas)

```
[●] 1. Onda 1 — SOLARIS          (nova — badge azul)
[●] 2. Onda 2 — Perfil IA        (nova — badge laranja)
[●] 3. Corporativo (QC)          (existente)
[●] 4. Operacional (QO)          (existente)
[●] 5. Setorial CNAE             (existente)
[●] 6. Briefing                  (existente)
[●] 7. Matrizes de Risco         (existente)
[●] 8. Plano de Ação             (existente)
```

**Regras de bloqueio TO-BE:**
- Onda 2 só inicia após Onda 1 = `completed`
- QC só inicia após Onda 2 = `completed`
- QO só inicia após QC = `completed`
- QCNAE só inicia após QO = `completed`
- Briefing só libera após QCNAE = `completed`

---

### 3C — `currentStep` e `status` TO-BE

Novos valores necessários no enum `status` da tabela `projects`:

| Novo valor de `status` | Quando ativo | `currentStep` sugerido |
|---|---|---|
| `onda1_solaris` | Advogado está no Questionário SOLARIS | 2 |
| `onda2_iagen` | Advogado está no Questionário IA Gen | 3 |

Os valores existentes (`diagnostico_corporativo`, `diagnostico_operacional`, `diagnostico_cnae`, `briefing`, etc.) são mantidos sem alteração.

---

## Parte 4 — Tabela de Impacto

| # | O que muda | Arquivo / Tabela | Tipo | Risco | Rollback |
|---|---|---|---|---|---|
| 1 | Nova rota `/questionario-solaris` | `client/src/App.tsx` | Adição | Baixo | Remover rota |
| 2 | Nova rota `/questionario-iagen` | `client/src/App.tsx` | Adição | Baixo | Remover rota |
| 3 | Novo componente `QuestionarioSolaris.tsx` | `client/src/pages/` | Criação | Baixo | Remover arquivo |
| 4 | Novo componente `QuestionarioIaGen.tsx` | `client/src/pages/` | Criação | Médio | Remover arquivo |
| 5 | `DiagnosticoStepper` — 2 novas etapas (Onda 1 e Onda 2) | `client/src/components/DiagnosticoStepper.tsx` | Modificação | **Médio** | Reverter commit |
| 6 | Navegação pós-Criar Projeto → Onda 1 (antes era QC) | `client/src/pages/ProjetoDetalhesV2.tsx` | Modificação | **Médio** | Reverter commit |
| 7 | Navegação pós-QCNAE → Briefing (sem alteração) | `client/src/pages/QuestionarioCNAE.tsx` | Sem alteração | — | — |
| 8 | Enum `status` — 2 novos valores | `drizzle/schema.ts` + migration | **Migration** | **Alto** | Migration reversa |
| 9 | Novo tRPC procedure `fluxoV3.getOnda1Questions` | `server/routers-fluxo-v3.ts` | Adição | Baixo | Remover procedure |
| 10 | Novo tRPC procedure `fluxoV3.generateOnda2Questions` | `server/routers-fluxo-v3.ts` | Adição | Médio | Remover procedure |
| 11 | Novo tRPC procedure `fluxoV3.saveOnda1Answers` | `server/routers-fluxo-v3.ts` | Adição | Baixo | Remover procedure |
| 12 | Novo tRPC procedure `fluxoV3.saveOnda2Answers` | `server/routers-fluxo-v3.ts` | Adição | Baixo | Remover procedure |
| 13 | `onda1Injector.ts` — mover lógica do Fluxo B para Fluxo A | `server/routers/onda1Injector.ts` | Refatoração | Baixo | Reverter commit |
| 14 | `QuestionarioV3.tsx` — remover badges K-3 (movidos para QuestionarioSolaris) | `client/src/pages/QuestionarioV3.tsx` | Modificação | Baixo | Reverter commit |
| 15 | Nova tabela `solaris_answers` (respostas Onda 1) | `drizzle/schema.ts` + migration | **Migration** | **Alto** | DROP TABLE |
| 16 | Nova tabela `iagen_answers` (respostas Onda 2) | `drizzle/schema.ts` + migration | **Migration** | **Alto** | DROP TABLE |
| 17 | **Correção watcher TypeScript** — schema.ts não exporta `solarisQuestions` no servidor | `drizzle/schema.ts` (sincronização) | Correção | Baixo | — |

**Total de arquivos afetados:** 17 itens — 5 novos, 8 modificados, 4 migrations/schema.

---

## Parte 5 — Plano de Sprints

### Fase K-4-A — Correção do watcher TypeScript + Migration de status
**Duração estimada:** 0,5 dia  
**Risco:** Médio (migration de enum)  
**Sem aprovação P.O. necessária**

Entregas:
- Corrigir sincronização do `schema.ts` no servidor (eliminar 4 erros do watcher)
- Adicionar `onda1_solaris` e `onda2_iagen` ao enum `status` da tabela `projects`
- Criar tabelas `solaris_answers` e `iagen_answers`
- Migration aplicada via `pnpm db:push`
- Testes: verificar que enum aceita novos valores sem quebrar registros existentes

---

### Fase K-4-B — Componente `QuestionarioSolaris.tsx` + tRPC procedures
**Duração estimada:** 1 dia  
**Risco:** Baixo  
**P.O. valida antes do merge**

Entregas:
- Nova rota `/projetos/:id/questionario-solaris` em `App.tsx`
- `QuestionarioSolaris.tsx`: busca `solaris_questions` filtradas por CNAE, exibe com badge azul, salva respostas em `solaris_answers`, navega para Onda 2
- tRPC procedures: `getOnda1Questions`, `saveOnda1Answers`
- Navegação: `ProjetoDetalhesV2.tsx` — botão "Iniciar" da camada 1 aponta para `/questionario-solaris` (antes apontava para `/questionario-corporativo-v2`)

**Critério de aceite P.O.:**
> "Ao criar projeto com CNAE 4639-7/01, o PRIMEIRO questionário apresentado é o Questionário SOLARIS com as 12 questões dos advogados, com badge azul 'Equipe Jurídica SOLARIS'."

---

### Fase K-4-C — Componente `QuestionarioIaGen.tsx` + tRPC procedures
**Duração estimada:** 1,5 dias  
**Risco:** Médio (gera perguntas via IA)  
**P.O. valida antes do merge**

Entregas:
- Nova rota `/projetos/:id/questionario-iagen` em `App.tsx`
- `QuestionarioIaGen.tsx`: gera perguntas combinatórias via LLM (regime tributário + porte + operação + CNAE como parâmetro), exibe com badge laranja, salva respostas em `iagen_answers`, navega para QC
- tRPC procedures: `generateOnda2Questions`, `saveOnda2Answers`
- Lógica de geração: reutiliza `invokeLLM` com prompt especializado para Onda 2

**Critério de aceite P.O.:**
> "Após o Questionário SOLARIS, o SEGUNDO questionário é gerado pela IA com base no perfil da empresa. Empresa A (Simples Nacional, micro) e Empresa B (Lucro Real, grande) recebem perguntas diferentes."

---

### Fase K-4-D — Integração no `DiagnosticoStepper` (8 etapas)
**Duração estimada:** 1 dia  
**Risco:** Alto (toca o fluxo principal)  
**P.O. valida antes do merge**

Entregas:
- `DiagnosticoStepper.tsx`: adicionar etapas `onda1_solaris` e `onda2_iagen` antes de `corporate`
- Regras de bloqueio atualizadas: Onda 2 bloqueia QC, Onda 1 bloqueia Onda 2
- `ProjetoDetalhesV2.tsx`: `onStartLayer("onda1")` → `/questionario-solaris`, `onStartLayer("onda2")` → `/questionario-iagen`
- `flowStateMachine.ts`: adicionar steps `onda1_solaris` e `onda2_iagen` ao `FLOW_STEPS`

**Critério de aceite P.O.:**
> "O stepper mostra claramente 8 etapas. Onda 1 e Onda 2 aparecem antes do Corporativo. A ordem é visível e navegável. Não é possível pular para QC sem concluir as Ondas."

---

### Fase K-4-E — Limpeza e regressão
**Duração estimada:** 0,5 dia  
**Risco:** Baixo  
**Sem aprovação P.O. necessária**

Entregas:
- Remover badges K-3 de `QuestionarioV3.tsx` (movidos para `QuestionarioSolaris.tsx`)
- Refatorar `onda1Injector.ts`: remover injeção do Fluxo B (agora desnecessária)
- Suite completa de testes: K-1, K-2, K-4-A, K-4-B, K-4-C, K-4-D
- Regressão: verificar que Fluxo B (QuestionarioV3) ainda funciona sem os badges

---

## Parte 6 — Perguntas e Dúvidas Identificadas

As seguintes questões precisam de decisão do P.O. ou Orquestrador antes da implementação:

| # | Pergunta | Impacto se não respondida |
|---|---|---|
| 1 | As respostas da Onda 1 devem ser salvas em tabela separada (`solaris_answers`) ou na coluna JSON `questionnaireAnswers` da tabela `projects`? | Determina se precisamos de migration de nova tabela (alto risco) ou apenas coluna JSON (baixo risco) |
| 2 | As respostas da Onda 2 (IA Gen) devem ser salvas em tabela separada (`iagen_answers`) ou em JSON? | Mesmo impacto que #1 |
| 3 | O Fluxo B (`QuestionarioV3`) deve ser mantido ou descontinuado após a implementação do TO-BE? | Se mantido, os badges K-3 precisam ficar em QuestionarioV3 também |
| 4 | O `DiagnosticoStepper` deve mostrar Onda 1 e Onda 2 como etapas numeradas (1 e 2) ou como uma seção "Pré-diagnóstico" separada visualmente? | Decisão de UX — impacta o design do stepper |
| 5 | O `currentStep` deve usar novos valores inteiros (ex: 1.5, 2.5) ou os novos status são suficientes para controle de fluxo? | Determina se o campo `currentStep` (int) precisa ser alterado ou apenas o enum `status` |

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

## Resumo Executivo para o P.O.

**O que existe hoje:** Dois fluxos paralelos. O P.O. usa o Fluxo A (QC → QO → QCNAE → Briefing). O K-2 e K-3 foram implementados no Fluxo B (não usado pelo P.O.) — isso explica por que as perguntas SOLARIS não apareceram no teste.

**O que precisa ser construído:** Um fluxo unificado onde Onda 1 (SOLARIS) e Onda 2 (IA Gen) aparecem como etapas independentes ANTES do QC/QO/QCNAE.

**Estimativa total:** 4,5 dias de desenvolvimento (K-4-A a K-4-E), 3 gates de validação P.O. (K-4-B, K-4-C, K-4-D).

**Risco mais alto:** Migration do enum `status` (K-4-A) — precisa de migration reversa documentada antes de executar.

**Próximo passo:** P.O. valida este documento e responde às 5 perguntas da Parte 6 antes de qualquer linha de código.

---

*Documento gerado por Manus (implementador técnico) em 2026-03-28*  
*Baseado em leitura direta do código-fonte — zero suposições*  
*Aguarda validação do P.O. antes de qualquer implementação*
