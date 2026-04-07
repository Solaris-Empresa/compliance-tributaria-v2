# ADR-002 — Plano de Implementação com Rollback: Migração Arquitetural do Diagnóstico
**Plataforma COMPLIANCE da Reforma Tributária**
**Data:** 22/03/2026 | **Versão:** 1.0 | **Status:** SUPERSEDIDO — State machine substituída por ADR-0009 (2026-04-06)
**Referência:** ADR-001 (Decisão Arquitetural) | Auditoria do Orquestrador (22/03/2026)

> "Arquitetura certa sem rollback é risco. Arquitetura certa com rollback é produto."

---

## 0. Estado Atual — Pré-Execução

### 0.1 Tag de Segurança Criada

```
Tag: cpie-v2-stable
Commit: 4604654 (HEAD da main em 22/03/2026)
Mensagem: "CPIE v2 fully validated — baseline pré-migração arquitetural ADR-001"
GitHub: https://github.com/Solaris-Empresa/compliance-tributaria-v2/releases/tag/cpie-v2-stable
```

Esta tag é o **ponto de retorno absoluto**. Qualquer rollback completo parte daqui.

### 0.2 Branch de Transição Criada

```
Branch: feature/v3-diagnostic-integration
Base: main (commit 4604654)
GitHub: https://github.com/Solaris-Empresa/compliance-tributaria-v2/tree/feature/v3-diagnostic-integration
```

**Regra inviolável:** nenhum código de migração será desenvolvido diretamente na `main`. Todo desenvolvimento ocorre na `feature/v3-diagnostic-integration` e só entra na `main` via Pull Request aprovado.

### 0.3 Checklist de Segurança Pré-Execução

| Item | Status | Evidência |
|---|---|---|
| Tag `cpie-v2-stable` criada | ✅ FEITO | `git tag cpie-v2-stable` → push confirmado |
| Branch `feature/v3-diagnostic-integration` criada | ✅ FEITO | Branch visível no GitHub |
| Feature flag definida no código | ⬜ PENDENTE | Fase 1 deste plano |
| Dados antigos preservados no schema | ✅ JÁ EXISTE | `corporateAnswers`, `operationalAnswers`, `cnaeAnswers` mantidos |
| Rota antiga funcionando | ✅ JÁ EXISTE | `routers/diagnostic.ts` intacto |
| Plano de rollback documentado | ✅ ESTE DOCUMENTO | Seção 6 |

---

## 1. Os 5 Riscos e Como São Mitigados

O orquestrador identificou 5 riscos críticos. Este plano responde a cada um com mitigação concreta.

### Risco 1 — Migração de Modelo de Dados (CRÍTICO)

**Problema:** a mudança de `corporateAnswers`/`operationalAnswers`/`cnaeAnswers` para `questionnaireAnswersV3` como fonte de verdade pode deixar código legado acessando campos antigos, gerar briefings com fonte errada e quebrar queries existentes.

**Mitigação:** os campos antigos **não serão removidos do schema**. Serão marcados como `@deprecated` nos comentários do `drizzle/schema.ts`. A função `getDiagnosticSource(project)` (Fase 1) será o único ponto de acesso às respostas — ela decide automaticamente qual fonte usar com base na feature flag e na presença de dados. Nenhuma query existente será quebrada.

### Risco 2 — Briefing como Ponto Único de Falha

**Problema:** GAP analysis, matriz de riscos e plano de ação são todos derivados do briefing. Se o `generateBriefing` falhar, todo o pipeline downstream falha.

**Mitigação:** o `generateBriefing` já usa `generateWithRetry` (3 tentativas com backoff). Além disso, a Fase 3 deste plano adiciona um **briefing de fallback determinístico**: se a IA falhar após 3 tentativas, o sistema gera um briefing estruturado mínimo com base nos dados estruturados do `companyProfile` + `operationProfile`, sem depender da IA. Isso garante que o pipeline não trava completamente.

### Risco 3 — Dependência Total da IA

**Problema:** qualidade do RAG, qualidade do prompt e estabilidade do modelo introduzem variabilidade no diagnóstico.

**Mitigação:** três camadas de proteção. Primeiro, o `confidence_score` do briefing é exibido ao usuário — se abaixo de 70, uma mensagem de alerta é mostrada recomendando revisão por especialista. Segundo, o corpus RAG é versionado (doc `19-versionamento-cpie.md`) — atualizações regulatórias não quebram diagnósticos existentes. Terceiro, a feature flag `USE_V3_DIAGNOSTIC` permite desligar o Fluxo B e voltar ao Fluxo A em minutos, sem deploy.

### Risco 4 — State Machine Desalinhada

**Problema:** `diagnosticStatus`, `currentStep` e o stepper do frontend estão desalinhados — três fontes de estado para o mesmo conceito.

**Mitigação:** a Fase 2 deste plano define uma **state machine canônica** com um único campo `currentStep` como fonte de verdade. O `diagnosticStatus` (Fluxo A) e o `localStorage` do stepper são tratados como caches de leitura, nunca como fonte de escrita. O stepper inicializa lendo `currentStep` do banco ao montar.

### Risco 5 — Transição Invisível para o Usuário

**Problema:** a mudança de formulário sequencial para diagnóstico inteligente dinâmico pode causar desorientação — o usuário sente que o sistema "mudou" sem aviso.

**Mitigação:** a Fase 4 deste plano adiciona uma **tela de boas-vindas ao diagnóstico** que explica o novo fluxo antes de iniciar, com linguagem orientada ao benefício ("Suas perguntas são geradas especificamente para o seu setor"). A transição é comunicada, não imposta.

---

## 2. Arquitetura da Feature Flag

A feature flag é implementada como uma constante no arquivo `shared/feature-flags.ts` (a ser criado na Fase 1):

```typescript
// shared/feature-flags.ts
export const FEATURE_FLAGS = {
  /**
   * USE_V3_DIAGNOSTIC
   * true  → Fluxo B canônico (Questionário V3 + IA + RAG)
   * false → Fluxo A legado (Questionários estáticos Corporativo/Operacional/CNAE)
   *
   * Para rollback imediato: alterar para false e fazer deploy.
   * Não requer migração de dados — os campos legados são preservados.
   */
  USE_V3_DIAGNOSTIC: true,

  /**
   * SHOW_DIAGNOSTIC_ONBOARDING
   * true  → Exibe tela de boas-vindas ao diagnóstico (Fase 4)
   * false → Vai direto para o questionário
   */
  SHOW_DIAGNOSTIC_ONBOARDING: true,
} as const;
```

A função `getDiagnosticSource` (adaptador de leitura) usará essa flag:

```typescript
// server/diagnostic-source.ts (a ser criado na Fase 1)
import { FEATURE_FLAGS } from "../shared/feature-flags";

export async function getDiagnosticSource(projectId: number, db: Database) {
  if (FEATURE_FLAGS.USE_V3_DIAGNOSTIC) {
    // Fonte canônica: questionnaireAnswersV3
    const answers = await db.query.questionnaireAnswersV3.findMany({
      where: eq(questionnaireAnswersV3.projectId, projectId),
    });
    return { source: "v3" as const, answers };
  } else {
    // Fallback legado: corporateAnswers + operationalAnswers + cnaeAnswers
    const project = await db.getProjectById(projectId);
    return {
      source: "legacy" as const,
      answers: {
        corporateAnswers: project?.corporateAnswers ?? null,
        operationalAnswers: project?.operationalAnswers ?? null,
        cnaeAnswers: project?.cnaeAnswers ?? [],
      },
    };
  }
}
```

---

## 3. Fases de Implementação

A migração é dividida em **5 fases atômicas**. Cada fase tem: escopo definido, critério de conclusão, checkpoint de segurança e plano de rollback individual.

### Fase 1 — Fundação (Feature Flag + Adaptador de Dados)

**Escopo:** criar `shared/feature-flags.ts`, `server/diagnostic-source.ts` e marcar campos legados como `@deprecated` no schema. Nenhuma funcionalidade existente é alterada.

**Arquivos afetados:**
- `shared/feature-flags.ts` (NOVO)
- `server/diagnostic-source.ts` (NOVO)
- `drizzle/schema.ts` (comentários `@deprecated` apenas — sem migração)

**Critério de conclusão:** `pnpm test` passa 100% | TypeScript 0 erros | feature flag `USE_V3_DIAGNOSTIC = false` não altera nenhum comportamento existente.

**Checkpoint:** tag `phase-1-complete` no GitHub.

**Rollback individual:** deletar os dois arquivos novos. Zero impacto nos dados ou no fluxo existente.

---

### Fase 2 — State Machine Canônica

**Escopo:** unificar `diagnosticStatus`, `currentStep` e o stepper do frontend em uma única fonte de verdade. O stepper inicializa lendo `currentStep` do banco. O `diagnosticStatus` passa a ser derivado de `currentStep` (não o contrário).

**Arquivos afetados:**
- `client/src/pages/DiagnosticoStepper.tsx` (leitura inicial do banco)
- `server/routers/diagnostic.ts` (derivar `diagnosticStatus` de `currentStep`)

**Critério de conclusão:** recarregar a página no meio do diagnóstico mantém o stepper na etapa correta. `pnpm test` passa 100%.

**Checkpoint:** tag `phase-2-complete` no GitHub.

**Rollback individual:** reverter os dois arquivos para a versão da tag `cpie-v2-stable`.

---

### Fase 3 — Integração do Briefing com Fallback

**Escopo:** modificar o `generateBriefing` para aceitar `companyProfile` + `operationProfile` como contexto adicional (além das respostas V3). Adicionar briefing de fallback determinístico para quando a IA falha após 3 tentativas.

**Arquivos afetados:**
- `server/routers-fluxo-v3.ts` (enriquecer o prompt com `companyProfile`)
- `server/ai-helpers.ts` (adicionar fallback determinístico)

**Critério de conclusão:** simular falha da IA (mock) → sistema gera briefing mínimo sem travar. `confidence_score` do briefing enriquecido ≥ 5 pontos acima da linha de base. `pnpm test` passa 100%.

**Checkpoint:** tag `phase-3-complete` no GitHub.

**Rollback individual:** reverter os dois arquivos para a versão da tag `phase-2-complete`.

---

### Fase 4 — Remoção dos Placeholders + Onboarding

**Escopo:** remover as seções QC-04..QC-10 e QO-04..QO-10 da UI. Adicionar tela de boas-vindas ao diagnóstico. Deprecar o QCNAE estático (redirecionar para Questionário V3).

**Arquivos afetados:**
- `client/src/pages/QuestionarioCorporativoV2.tsx` (remover seções placeholder)
- `client/src/pages/QuestionarioOperacional.tsx` (remover seções placeholder)
- `client/src/pages/DiagnosticoOnboarding.tsx` (NOVO)
- `client/src/App.tsx` (adicionar rota de onboarding)

**Critério de conclusão:** nenhum `[PLACEHOLDER]` visível na UI. Tela de onboarding exibida antes do questionário. QCNAE estático redireciona para V3. `pnpm test` passa 100%.

**Checkpoint:** tag `phase-4-complete` no GitHub.

**Rollback individual:** reverter os arquivos de UI para a versão da tag `phase-3-complete`. A tela de onboarding pode ser desligada via `SHOW_DIAGNOSTIC_ONBOARDING = false`.

---

### Fase 5 — Ativação do Fluxo V3 como Canônico + PR para Main

**Escopo:** alterar `USE_V3_DIAGNOSTIC = true` (já é o default proposto, mas esta fase é a validação final). Executar os 35 cenários da Matriz de Cenários (doc 09). Abrir Pull Request da `feature/v3-diagnostic-integration` para `main`.

**Critério de conclusão:** todos os 35 cenários da Matriz passam. ICE ≥ 98 para as regras afetadas. `pnpm test` passa 100%. PR aprovado pelo P.O.

**Checkpoint:** merge do PR → tag `v3-diagnostic-stable` na main.

**Rollback individual:** `USE_V3_DIAGNOSTIC = false` → deploy. Rollback em < 5 minutos sem migração de dados.

---

## 4. Tabela de Fases — Visão Consolidada

| Fase | Escopo | Risco Mitigado | Rollback | Esforço |
|---|---|---|---|---|
| **1** | Feature flag + adaptador de dados | Risco 1 (migração) | Deletar 2 arquivos | Baixo |
| **2** | State machine canônica | Risco 4 (step machine) | Reverter 2 arquivos | Médio |
| **3** | Briefing com fallback | Risco 2 (ponto único) + Risco 3 (IA) | Reverter 2 arquivos | Médio |
| **4** | Remover placeholders + onboarding | Risco 5 (transição) | Feature flag + reverter UI | Médio |
| **5** | Ativação V3 canônico + PR | Todos | `USE_V3_DIAGNOSTIC = false` | Baixo |

---

## 5. Regras de Desenvolvimento Durante a Migração

As seguintes regras se aplicam durante toda a execução das 5 fases:

**Regra 1 — Branch obrigatória:** todo código de migração vai para `feature/v3-diagnostic-integration`. Nenhum commit de migração vai direto para `main`.

**Regra 2 — Checkpoint por fase:** cada fase termina com uma tag no GitHub antes de iniciar a próxima. Nunca iniciar uma fase sem a tag da fase anterior.

**Regra 3 — Testes antes de checkpoint:** `pnpm test` deve passar 100% antes de criar qualquer tag ou abrir PR.

**Regra 4 — Schema não destrutivo:** nenhuma coluna do banco será removida durante as 5 fases. Apenas adições e comentários `@deprecated`.

**Regra 5 — Feature flag como interruptor de emergência:** se qualquer fase apresentar comportamento inesperado em produção, o primeiro passo é sempre `USE_V3_DIAGNOSTIC = false` + deploy — antes de qualquer investigação de código.

---

## 6. Plano de Rollback Operacional

### 6.1 Rollback Completo (Retorno ao Baseline)

Usado quando: múltiplas fases foram executadas e o sistema está em estado inconsistente.

```bash
# Passo 1 — Voltar ao código da tag de segurança
git checkout main
git reset --hard cpie-v2-stable
git push origin main --force

# Passo 2 — Desligar feature flag (já estará em false após o reset)
# Verificar: grep "USE_V3_DIAGNOSTIC" shared/feature-flags.ts

# Passo 3 — Deploy
# (usar o botão Publish no painel Manus)
```

**Tempo estimado:** < 5 minutos. **Impacto nos dados:** zero — os campos legados foram preservados.

### 6.2 Rollback por Fase

Usado quando: uma fase específica introduziu um problema.

```bash
# Rollback da Fase N para a Fase N-1
git checkout main
git reset --hard phase-{N-1}-complete
git push origin main --force
```

### 6.3 Rollback de Emergência via Feature Flag

Usado quando: o sistema está em produção e há comportamento inesperado no Fluxo V3.

```typescript
// Em shared/feature-flags.ts — alterar e fazer deploy imediato
USE_V3_DIAGNOSTIC: false,  // ← alterar de true para false
```

**Tempo estimado:** < 2 minutos (sem reset de código, apenas alteração de constante + deploy).

### 6.4 Verificação Pós-Rollback

Após qualquer rollback, verificar:

| Verificação | Comando | Resultado esperado |
|---|---|---|
| Testes passando | `pnpm test` | 100% pass |
| TypeScript | `npx tsc --noEmit` | 0 erros |
| Feature flag desligada | `grep USE_V3_DIAGNOSTIC shared/feature-flags.ts` | `false` |
| Fluxo A funcionando | Criar projeto de teste → completar diagnóstico | Briefing gerado |

---

## 7. Critério de Sucesso Final

A migração é considerada bem-sucedida quando:

| Critério | Métrica | Fonte |
|---|---|---|
| Zero placeholders visíveis | 0 ocorrências de `[PLACEHOLDER]` na UI | Inspeção visual |
| Briefing com RAG ativo | `confidence_score` ≥ 75 em média | Logs de produção |
| State machine unificada | Recarregar página mantém etapa correta | Teste manual |
| Rollback testado | Rollback completo executado em < 5 min | Teste de rollback |
| Testes passando | 100% dos 35 cenários da Matriz | `pnpm test` |
| ICE ≥ 98 | Avaliação pós-fase 5 | Doc 22-metrica-ice.md |

---

*Nenhum código foi alterado por este documento. As fases serão executadas sequencialmente após aprovação do P.O. para cada fase.*

*Referências: ADR-001 (arquitetura), doc 09 (matriz de cenários), doc 22 (ICE), doc 23 (testes contínuos), `server/routers-fluxo-v3.ts`, `server/diagnostic-consolidator.ts`*
