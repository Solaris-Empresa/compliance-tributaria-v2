# ADR-003 — Exaustão de Riscos: Integração do Diagnóstico Tributário

**Status:** Em análise — aguardando aprovação do P.O. para implementação  
**Versão:** 1.0  
**Data:** 2026-03-22  
**Autor:** Manus AI (Agente de Implementação)  
**Revisão obrigatória:** Orquestrador + P.O. antes de qualquer implementação  
**Referência:** ADR-001 (Arquitetura), ADR-002 (Plano com Rollback)

---

## Resumo Executivo

Este documento responde às 7 perguntas críticas do orquestrador com base em leitura direta do código-fonte. Nenhuma suposição foi feita — cada afirmação é rastreável a um arquivo e linha específicos.

**Descobertas críticas:**

1. **Dois endpoints de briefing coexistem:** `trpc.briefing.generate` (Fluxo A, `server/routers.ts:533`) lê `corporateAnswers + operationalAnswers + cnaeAnswers` da tabela `projects`. O `trpc.fluxoV3.generateBriefing` (Fluxo B, `server/routers-fluxo-v3.ts`) lê `questionnaireAnswersV3` + campos de perfil do CPIE v2. Ambos gravam na mesma coluna `briefingContent` do projeto. **Risco de sobrescrita mútua confirmado.**

2. **Risk engine e action plan usam exclusivamente o Fluxo A:** `trpc.risk.generate` e `trpc.actionPlan.generate` em `server/routers.ts:847` e `server/routers.ts:1134` leem apenas `corporateAnswers`, `operationalAnswers` e `cnaeAnswers`. Se o usuário usa o Fluxo B (V3), essas colunas ficam vazias e o risk/plan recebe contexto vazio.

3. **Não existe mecanismo de identificação de projeto legado vs novo:** nenhum campo `flowVersion`, `isLegacy` ou equivalente existe no schema. A distinção depende de qual coluna está preenchida — heurística frágil.

4. **localStorage é fonte de verdade paralela para briefing, matrizes e plano de ação:** `BriefingV3.tsx:151`, `MatrizesV3.tsx:206` e `PlanoAcaoV3.tsx:711` fazem auto-save no localStorage. O banco é atualizado apenas no `onSuccess` das mutations. Se o usuário fecha o navegador antes do save, o localStorage tem versão mais recente que o banco.

5. **`diagnosticStatus` (JSON no projeto) e `currentStep` (int no projeto) são fontes paralelas de estado:** o stepper lê `currentStep`, mas o diagnóstico lê `diagnosticStatus`. Eles podem divergir — um projeto pode ter `currentStep=8` (briefing) mas `diagnosticStatus.corporate="not_started"`.

**Conclusão desta fase:** **Ainda não seguro para implementação.** Os riscos R-001, R-002, R-007 e R-012 são bloqueadores críticos que precisam de mitigação estrutural antes de qualquer código.

---

## BLOCO 1 — Matriz Completa de Riscos

| ID | Risco | Categoria | Onde ocorre (arquivo:linha) | Probabilidade | Impacto | Severidade | Sinal de falha | Mitigação | Plano de rollback |
|----|-------|-----------|----------------------------|---------------|---------|------------|----------------|-----------|-------------------|
| R-001 | Dois endpoints de briefing sobrescrevem a mesma coluna `briefingContent` | Arquitetura | `routers.ts:533` + `routers-fluxo-v3.ts:1718` | Alta | Crítico | **CRÍTICO** | Briefing gerado pelo Fluxo A é sobrescrito pelo Fluxo B (ou vice-versa) sem aviso | Criar colunas separadas `briefingContentV1` e `briefingContentV3` ou adicionar campo `briefingSource` | Desativar o endpoint do Fluxo A via feature flag |
| R-002 | Risk engine e action plan leem apenas Fluxo A — projetos V3 recebem contexto vazio | Arquitetura | `routers.ts:847` + `routers.ts:1134` | Alta | Crítico | **CRÍTICO** | Risk matrix gerada sem dados de diagnóstico; plano de ação genérico | Adaptar `risk.generate` e `actionPlan.generate` para ler de `questionnaireAnswersV3` quando `corporateAnswers` estiver vazio | Manter Fluxo A funcional como fallback |
| R-003 | Dois fluxos coexistindo sem discriminador de versão | Arquitetura | `drizzle/schema.ts:74-114` | Alta | Alto | **ALTO** | Projeto criado no Fluxo B abre no Fluxo A (ou vice-versa) | Adicionar campo `flowVersion: enum("v1","v2")` ao schema | Rollback do schema via migration reversa |
| R-004 | `diagnosticStatus` e `currentStep` podem divergir | Dados / State Machine | `drizzle/schema.ts:74,114` | Média | Alto | **ALTO** | Stepper mostra etapa 8 (briefing) mas diagnóstico mostra "not_started" | Criar função de reconciliação executada no `getProjectById` | Nenhum — divergência é estado corrompido; requer reset manual |
| R-005 | localStorage como fonte de verdade paralela | Persistência | `BriefingV3.tsx:151`, `MatrizesV3.tsx:206`, `PlanoAcaoV3.tsx:711` | Alta | Médio | **ALTO** | Usuário vê versão do localStorage diferente do banco após login em outro dispositivo | Implementar save-on-blur + save-before-navigate; remover localStorage como fonte primária | Limpar localStorage e recarregar do banco |
| R-006 | `consolidateDiagnosticLayers` usa perfil CPIE v2 mas não as respostas dos questionários estáticos | Dados | `diagnostic-consolidator.ts:1-80` | Alta | Alto | **ALTO** | Briefing V3 não reflete respostas dos questionários QC/QO preenchidos pelo usuário | Passar `corporateAnswers` e `operationalAnswers` para o consolidator quando disponíveis | Nenhum — dado já foi perdido no pipeline |
| R-007 | Projetos legados (com `corporateAnswers` preenchido) podem ser abertos no Fluxo B | Compatibilidade Legada | `routers-fluxo-v3.ts` (sem filtro de versão) | Média | Crítico | **CRÍTICO** | Briefing V3 gerado sem contexto dos questionários QC/QO; risk/plan vazio | Adicionar guarda `if (!project.flowVersion || project.flowVersion === "v1") throw` no Fluxo B | Feature flag desliga Fluxo B para projetos legados |
| R-008 | Perda de progresso ao recarregar o stepper | Stepper / State Machine | `DiagnosticoStepper.tsx` (inicializa `completedSteps=[]`) | Alta | Médio | **ALTO** | Usuário perde indicação visual de etapas concluídas ao recarregar | Inicializar `completedSteps` lendo `diagnosticStatus` do banco no mount | Nenhum — apenas UX, dados não são perdidos |
| R-009 | Regressão do CPIE v2 após mudanças no schema | Arquitetura | `drizzle/schema.ts` | Baixa | Crítico | **ALTO** | CPIE v2 para de funcionar após migration | Executar suite de 92 testes CPIE antes de qualquer migration | Rollback via `pnpm db:push` com schema anterior + tag `cpie-v2-stable` |
| R-010 | Regressão do CNAE após mudanças no fluxo | Backend | `routers-fluxo-v3.ts` (descoberta de CNAEs) | Baixa | Alto | **MÉDIO** | CNAEs não são descobertos ou confirmados | Testes de integração para `discoverCnaes` e `confirmCnaes` | Feature flag desliga Fluxo B |
| R-011 | Perguntas V3 com baixa qualidade (RAG retorna artigos irrelevantes) | RAG / IA | `rag-retriever.ts` | Média | Médio | **MÉDIO** | Perguntas geradas são genéricas ou incorretas para o CNAE | ICE < 95 detectado em avaliação manual; threshold de qualidade no prompt | Nenhum — requer reescrita do corpus ou do prompt |
| R-012 | Latência e timeout do RAG bloqueiam o fluxo | RAG / IA | `rag-retriever.ts` + `routers-fluxo-v3.ts` | Média | Alto | **ALTO** | Usuário fica aguardando indefinidamente; timeout sem mensagem de erro | Implementar timeout explícito de 30s + fallback para perguntas genéricas | Desativar RAG via feature flag; usar perguntas pré-definidas |
| R-013 | Usuário não percebe mudança de fluxo | Frontend / UX | `ProjetoDetalhesV2.tsx`, `DiagnosticoStepper.tsx` | Alta | Médio | **ALTO** | Usuário confuso com etapas diferentes entre projetos antigos e novos | Banner contextual "Novo diagnóstico inteligente" + tooltip explicativo | Nenhum — apenas comunicação |
| R-014 | Rollback parcial — Fluxo B desligado mas dados V3 já gravados | Rollback | `questionnaireAnswersV3` (tabela) | Média | Alto | **ALTO** | Projetos com dados parciais em `questionnaireAnswersV3` ficam em estado inconsistente | Marcar projetos como `rollback_pending` antes de desligar flag; executar script de limpeza | Script SQL de limpeza de `questionnaireAnswersV3` para projetos afetados |
| R-015 | Feature flag incompleta — alguns endpoints não verificam a flag | Operação / Deploy | `shared/feature-flags.ts` (a criar) | Alta | Alto | **ALTO** | Fluxo B ativo em produção mesmo com flag desligada | Centralizar verificação da flag em middleware tRPC; não verificar em cada endpoint | Desligar flag no banco; reiniciar servidor |
| R-016 | localStorage mascarando estado real do banco | Persistência | `QuestionarioV3.tsx:461`, `NovoProjeto.tsx:436` | Alta | Médio | **ALTO** | Usuário vê dados desatualizados do localStorage após rollback do banco | Invalidar localStorage ao detectar versão diferente do banco (hash de versão) | Limpar localStorage via script no console do navegador |
| R-017 | Inconsistência entre banco e UI no stepper | Stepper / State Machine | `FlowStepper.tsx:50-53` | Média | Médio | **MÉDIO** | Stepper mostra etapa errada; usuário não consegue avançar | Sincronizar `currentStep` do banco com o stepper no mount de cada página | Forçar `currentStep=1` via SQL para projeto afetado |
| R-018 | `consolidateDiagnosticLayers` não tem testes automatizados | Dados | `diagnostic-consolidator.ts` | Alta | Alto | **ALTO** | Consolidação silenciosamente incorreta; briefing gerado com dados errados | Criar testes unitários para o consolidator antes de qualquer integração | Nenhum — requer correção manual do briefing |
| R-019 | Briefing lendo fonte errada (Fluxo A lendo V3 ou vice-versa) | Briefing | `routers.ts:563` + `routers-fluxo-v3.ts:1718` | Alta | Crítico | **CRÍTICO** | Briefing gerado com dados incorretos ou vazios | Discriminar fonte pelo campo `flowVersion` antes de chamar qualquer endpoint de briefing | Regenerar briefing manualmente após rollback |
| R-020 | Gap/risk/plan lendo fonte errada | Backend | `routers.ts:847,1134` | Alta | Crítico | **CRÍTICO** | Risk matrix e plano de ação gerados sem dados reais do diagnóstico | Adaptar endpoints para ler de `questionnaireAnswersV3` quando `flowVersion="v2"` | Regenerar manualmente após rollback |

---

## BLOCO 2 — Mapa de Consumidores da Fonte de Diagnóstico

A tabela abaixo mapeia **todos os módulos que leem dados de diagnóstico**, com a fonte atual e o risco de não migrar.

| Módulo / Arquivo | O que lê hoje | Fonte atual | Fonte desejada (Fluxo B canônico) | Risco se não migrar | Necessidade de adaptação |
|------------------|---------------|-------------|-----------------------------------|---------------------|--------------------------|
| `server/routers.ts:533` — `briefing.generate` | `corporateAnswers`, `operationalAnswers`, `cnaeAnswers` | Colunas JSON em `projects` (Fluxo A) | `questionnaireAnswersV3` + perfil CPIE v2 | Briefing vazio para projetos V3 | **Sim — crítica** |
| `server/routers.ts:847` — `risk.generate` | `corporateAnswers`, `operationalAnswers`, `cnaeAnswers` + briefing | Colunas JSON em `projects` (Fluxo A) | `questionnaireAnswersV3` + perfil CPIE v2 | Risk matrix vazia ou genérica para projetos V3 | **Sim — crítica** |
| `server/routers.ts:1134` — `actionPlan.generate` | `corporateAnswers`, `operationalAnswers`, `cnaeAnswers` + briefing | Colunas JSON em `projects` (Fluxo A) | `questionnaireAnswersV3` + perfil CPIE v2 | Plano de ação vazio ou genérico para projetos V3 | **Sim — crítica** |
| `server/routers-fluxo-v3.ts:1702` — `fluxoV3.generateBriefing` | Perfil CPIE v2 + `questionnaireAnswersV3` via `consolidateDiagnosticLayers` | Tabela `questionnaireAnswersV3` + campos de perfil (Fluxo B) | Já correto para Fluxo B | Não se aplica | **Não** |
| `server/routers-fluxo-v3.ts:1532` — `fluxoV3.generateRiskMatrices` | `questionnaireAnswersV3` | Tabela `questionnaireAnswersV3` (Fluxo B) | Já correto para Fluxo B | Não se aplica | **Não** |
| `server/routers-fluxo-v3.ts:1839` — `fluxoV3.generateActionPlan` | `questionnaireAnswersV3` | Tabela `questionnaireAnswersV3` (Fluxo B) | Já correto para Fluxo B | Não se aplica | **Não** |
| `server/diagnostic-consolidator.ts` | `companyProfile`, `operationProfile`, `taxComplexity`, `financialProfile`, `governanceProfile` + `cnaeAnswers` | Perfil CPIE v2 (campos estruturados) + `questionnaireAnswersV3` agrupados | Já correto — mas **não lê** `corporateAnswers`/`operationalAnswers` | Respostas dos questionários QC/QO são ignoradas no Fluxo B | **Sim — moderada** |
| `server/routers/diagnostic.ts:34` — `diagnostic.getStatus` | `diagnosticStatus` (JSON) | Coluna `diagnosticStatus` em `projects` | Manter — é o controlador de estado das 3 camadas | Não se aplica | **Não** |
| `server/routers/diagnostic.ts:115` — `diagnostic.getProgress` | `diagnosticStatus`, `corporateAnswers`, `operationalAnswers`, `cnaeAnswers` | Colunas JSON em `projects` (Fluxo A) | Adicionar leitura de `questionnaireAnswersV3` para contar progresso do Fluxo B | Progress sempre 0% para projetos V3 | **Sim — moderada** |
| `server/routers/flowRouter.ts:74` — `flow.saveStep` | `corporateAnswers`, `operationalAnswers`, `cnaeAnswers`, `briefingContent`, `riskMatricesData`, `actionPlansData` | Snapshot completo do projeto (Fluxo A) | Adicionar `flowVersion` ao snapshot | Snapshot incompleto para projetos V3 | **Sim — baixa** |
| `client/src/pages/BriefingV3.tsx:195` | `briefingContent` (banco) + localStorage | Banco + localStorage (ambos) | Banco como única fonte; localStorage apenas como rascunho temporário | Inconsistência entre dispositivos | **Sim — moderada** |
| `client/src/pages/MatrizesV3.tsx:206` | `riskMatricesData` (banco) + localStorage | Banco + localStorage (ambos) | Banco como única fonte | Inconsistência entre dispositivos | **Sim — moderada** |
| `client/src/pages/PlanoAcaoV3.tsx:711` | `actionPlansData` (banco) + localStorage | Banco + localStorage (ambos) | Banco como única fonte | Inconsistência entre dispositivos | **Sim — moderada** |
| `client/src/pages/ProjetoDetalhesV2.tsx` | `status`, `currentStep`, `diagnosticStatus` | Banco (correto) | Manter + adicionar indicador de `flowVersion` | Não exibe qual fluxo está ativo | **Sim — baixa** |
| `client/src/components/FlowStepper.tsx:50` | `currentStep` (int) passado como prop | Banco via query do componente pai | Manter — mas inicializar corretamente no mount | Stepper reinicia ao recarregar | **Sim — moderada** |
| `client/src/pages/QuestionarioCorporativoV2.tsx:179` | `corporateAnswers` (JSON) | Coluna `corporateAnswers` em `projects` | Manter para Fluxo A; deprecar para Fluxo B | Formulário exibe dados do Fluxo A em projetos V3 | **Sim — baixa** |
| `client/src/pages/QuestionarioOperacional.tsx:179` | `operationalAnswers` (JSON) | Coluna `operationalAnswers` em `projects` | Manter para Fluxo A; deprecar para Fluxo B | Formulário exibe dados do Fluxo A em projetos V3 | **Sim — baixa** |
| `client/src/pages/QuestionarioV3.tsx:461` | `questionnaireAnswers` (coluna JSON) + localStorage | Banco + localStorage (Fluxo B) | Banco como única fonte | Inconsistência entre dispositivos | **Sim — moderada** |
| `server/routers-fluxo-v3.ts:486` — `fluxoV3.getProjectStep1` | `operationalAnswers` (como fallback) | Coluna `operationalAnswers` em `projects` | Remover fallback; usar apenas perfil CPIE v2 | Dados do Fluxo A contaminam o Fluxo B | **Sim — baixa** |

**Descoberta crítica do Bloco 2:** Existem **3 consumidores críticos** (briefing, risk, actionPlan do Fluxo A) que **nunca lerão dados do Fluxo B** sem adaptação. Se o usuário usa o Fluxo B para o diagnóstico e depois chama qualquer um desses endpoints do Fluxo A, o resultado será vazio ou incorreto. Isso confirma o risco de "fonte dupla" e "rollback parcial" identificado pelo orquestrador.

---

## BLOCO 3 — Análise de Compatibilidade Legada

### Respostas às 7 perguntas obrigatórias

**1. Como um projeto legado será reconhecido?**
Atualmente, **não existe mecanismo formal**. Um projeto legado pode ser identificado heuristicamente pela presença de dados em `corporateAnswers`, `operationalAnswers` ou `cnaeAnswers` (colunas JSON em `projects`). Um projeto novo (Fluxo B) teria essas colunas vazias e dados em `questionnaireAnswersV3`. Porém, essa heurística é frágil — um projeto pode ter ambos preenchidos se o usuário usou os dois fluxos.

**2. Como o sistema decide se ele usa fluxo antigo ou novo?**
Atualmente, **não decide**. O sistema não tem lógica de discriminação. O usuário acessa rotas diferentes (`/projetos/:id/questionario-corporativo` para Fluxo A vs `/projetos/:id/questionario-v3` para Fluxo B), mas nenhum middleware impede que um projeto legado acesse o Fluxo B ou vice-versa.

**3. Quais campos/tabelas são lidos por projetos legados?**

| Campo/Tabela | Localização |
|---|---|
| `corporateAnswers` | Coluna JSON em `projects` |
| `operationalAnswers` | Coluna JSON em `projects` |
| `cnaeAnswers` | Coluna JSON em `projects` |
| `diagnosticStatus` | Coluna JSON em `projects` |
| `currentStep` | Coluna int em `projects` |
| `briefingContent` | Coluna text em `projects` |
| `riskMatricesData` | Coluna JSON em `projects` |
| `actionPlansData` | Coluna JSON em `projects` |

**4. Quais campos/tabelas serão lidos por projetos novos (Fluxo B)?**

| Campo/Tabela | Localização |
|---|---|
| `questionnaireAnswersV3` | Tabela separada (FK: `projectId`) |
| `questionnaireProgressV3` | Tabela separada (FK: `projectId`) |
| `questionnaireAnswers` | Coluna JSON em `projects` (cópia consolidada) |
| `companyProfile`, `operationProfile`, `taxComplexity`, `financialProfile`, `governanceProfile` | Colunas JSON em `projects` (perfil CPIE v2) |
| `currentStep`, `currentStepName` | Colunas em `projects` (compartilhadas) |
| `briefingContent` | Coluna text em `projects` (**compartilhada com Fluxo A — risco de sobrescrita**) |

**5. Existe risco de um projeto legado ser interpretado pelo fluxo novo?**
**Sim, confirmado.** Não existe guarda no Fluxo B que impeça um projeto legado de ser processado. Se o usuário navegar para `/projetos/:id/questionario-v3` com um projeto legado, o sistema tentará gerar perguntas V3 sem o contexto dos questionários QC/QO já preenchidos.

**6. Existe risco de um projeto novo cair no fluxo antigo?**
**Sim, confirmado.** O `DiagnosticoStepper` pode direcionar o usuário para `/questionario-corporativo` mesmo em projetos novos, dependendo do `currentStep` armazenado. Se `currentStep=5` (diagnostico_corporativo), o stepper abre o Fluxo A.

**7. Como impedir isso explicitamente?**
A única solução estrutural é adicionar o campo `flowVersion: enum("v1","v2")` ao schema e criar um middleware que valide a versão antes de processar qualquer endpoint de diagnóstico.

### Estratégia Formal de Compatibilidade

| Tipo de projeto | Origem | Fluxo permitido | Fonte de verdade | Risco | Regra de proteção |
|---|---|---|---|---|---|
| **Legado (v1)** | Criado antes da migração; tem `corporateAnswers` preenchido | Apenas Fluxo A | `corporateAnswers`, `operationalAnswers`, `cnaeAnswers` | Abertura acidental no Fluxo B gera briefing vazio | `if (project.flowVersion !== "v1") throw FORBIDDEN` em todos os endpoints do Fluxo A |
| **Novo (v2)** | Criado após a migração; tem `flowVersion="v2"` | Apenas Fluxo B | `questionnaireAnswersV3` + perfil CPIE v2 | Abertura acidental no Fluxo A gera diagnóstico com dados antigos | `if (project.flowVersion !== "v2") throw FORBIDDEN` em todos os endpoints do Fluxo B |
| **Híbrido (sem versão)** | Criado durante a transição; pode ter ambos preenchidos | Fluxo A como fallback seguro | `corporateAnswers` (prioritário) | Dados inconsistentes entre as duas fontes | Tratar como legado até migração manual explícita |

---

## BLOCO 4 — Rollback Real, Não Teórico

### 4.1 — Rollback Map

| Cenário de falha | Onde falhou | Como detectar | Como desligar | Como voltar | Perda esperada | Tempo estimado |
|---|---|---|---|---|---|---|
| Briefing V3 gerado com dados vazios | `fluxoV3.generateBriefing` retorna briefing genérico | Monitorar `briefingContent` com menos de 200 chars após geração | Desligar feature flag `ENABLE_FLOW_V2=false` | Regenerar briefing via Fluxo A | Briefing V3 gerado (sobrescrito pelo V1) | 5 min |
| Risk matrix vazia em projetos V3 | `risk.generate` retorna matriz sem itens | Monitorar `riskMatricesData` vazio após geração | Desligar feature flag | Regenerar via Fluxo A com dados legados | Risk matrix V3 (se existia) | 5 min |
| Projetos legados abertos no Fluxo B | Usuário vê perguntas V3 em projeto antigo | Monitorar erros de `consolidateDiagnosticLayers` com inputs vazios | Desligar feature flag + adicionar guarda de `flowVersion` | Nenhuma ação — dados legados não foram alterados | Nenhuma | 10 min |
| `questionnaireAnswersV3` com dados parciais após rollback | Tabela tem respostas de projetos que voltaram ao Fluxo A | Query: `SELECT COUNT(*) FROM questionnaireAnswersV3 WHERE projectId IN (projetos_afetados)` | Desligar feature flag | Executar script SQL de limpeza (ver 4.2) | Respostas V3 parciais (não finalizadas) | 15 min |
| `currentStep` dessincronizado com `diagnosticStatus` | Stepper mostra etapa errada | Monitorar divergências via query SQL | Nenhuma ação de desligamento necessária | Executar script de reconciliação SQL | Nenhuma — apenas UX | 10 min |
| localStorage com versão mais recente que o banco | Usuário vê dados diferentes em dispositivos diferentes | Impossível monitorar automaticamente | Nenhuma ação de desligamento | Limpar localStorage via instrução ao usuário | Rascunhos não salvos no banco | 0 min (perda imediata) |
| Timeout do RAG bloqueia geração de perguntas | `generateQuestions` não retorna em 30s | Monitorar timeouts no log do servidor | Desligar RAG via flag `ENABLE_RAG=false` | Usar perguntas pré-definidas por CNAE | Qualidade das perguntas reduzida | 2 min |

### 4.2 — Rollback Drill Plan

Sequência de passos para ensaio de rollback (executar em ambiente de staging antes de produção):

**Passo 1 — Ativar Fluxo B:**
```bash
# Setar feature flag no banco
UPDATE projects SET flowVersion = 'v2' WHERE id = [projeto_teste];
# Verificar que o projeto abre no Fluxo B
```

**Passo 2 — Simular falha (briefing vazio):**
```bash
# Chamar generateBriefing via tRPC com projeto sem questionnaireAnswersV3
# Confirmar que briefingContent retorna texto genérico ou vazio
```

**Passo 3 — Desligar feature flag:**
```bash
# Setar ENABLE_FLOW_V2=false no ambiente
# OU: UPDATE projects SET flowVersion = 'v1' WHERE id = [projeto_teste];
# Reiniciar servidor (não necessário se flag é lida dinamicamente do banco)
```

**Passo 4 — Confirmar volta ao Fluxo A:**
```bash
# Verificar que o projeto abre no Fluxo A
# Verificar que corporateAnswers, operationalAnswers, cnaeAnswers estão intactos
# Verificar que briefing pode ser regenerado via Fluxo A
```

**Passo 5 — Confirmar dados legados íntegros:**
```sql
SELECT id, corporateAnswers IS NOT NULL as has_corp,
       operationalAnswers IS NOT NULL as has_op,
       cnaeAnswers IS NOT NULL as has_cnae,
       briefingContent IS NOT NULL as has_briefing
FROM projects WHERE id = [projeto_teste];
```

**Passo 6 — Confirmar briefing/risk/plan funcionais:**
```bash
# Chamar trpc.briefing.generate, trpc.risk.generate, trpc.actionPlan.generate
# Confirmar que retornam dados corretos baseados no Fluxo A
```

**Passo 7 — Limpeza de dados V3 parciais (se necessário):**
```sql
-- Executar apenas se o projeto teve dados V3 gravados
DELETE FROM questionnaireAnswersV3 WHERE projectId = [projeto_teste];
DELETE FROM questionnaireProgressV3 WHERE projectId = [projeto_teste];
UPDATE projects SET questionnaireAnswers = NULL WHERE id = [projeto_teste];
```

### 4.3 — Critérios de Sucesso do Rollback

| Critério | Métrica | Limite aceitável |
|---|---|---|
| Retorno funcional | Tempo entre desligar flag e sistema funcional | ≤ 10 minutos |
| Projetos acessíveis | % de projetos que abrem sem erro após rollback | 100% |
| Dados não corrompidos | Projetos com `corporateAnswers` intacto após rollback | 100% |
| Telas sem estado órfão | Páginas que carregam sem erro 404/500 | 100% |
| Queries sem quebra | Endpoints que retornam 200 após rollback | 100% |
| Briefing regenerável | Projetos legados que conseguem regenerar briefing via Fluxo A | 100% |

---

## BLOCO 5 — Análise da State Machine

### AS-IS: Estado atual (múltiplas fontes de verdade)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FONTES DE ESTADO ATUAIS (AS-IS)                      │
├──────────────────────┬──────────────────────────────────────────────────┤
│ Fonte                │ O que controla                                   │
├──────────────────────┼──────────────────────────────────────────────────┤
│ projects.currentStep │ Etapa numérica do fluxo (1-11)                   │
│ projects.currentStep │ Etapa semântica ("briefing", "riscos", etc.)     │
│ Name                 │                                                  │
│ projects.status      │ Status do projeto ("ativo", "briefing", etc.)    │
│ projects.diagnostic  │ Status das 3 camadas de diagnóstico              │
│ Status               │ (corporate/operational/cnae)                     │
│ localStorage         │ Rascunhos de briefing, matrizes, plano, NovoPro  │
│                      │ jeto, QuestionarioV3                             │
│ questionnaireProgres │ Progresso do QuestionarioV3 (rounds, índices)    │
│ sV3                  │                                                  │
│ FlowStepper (UI)     │ Representação visual — derivado de currentStep   │
│ DiagnosticoStepper   │ completedSteps[] — estado LOCAL, não persistido  │
│ (UI)                 │                                                  │
└──────────────────────┴──────────────────────────────────────────────────┘
```

### Respostas às 5 perguntas obrigatórias

**1. Quem manda de verdade no fluxo?**
`projects.currentStep` é a fonte de autoridade para o fluxo principal (qual página abrir, qual etapa está ativa). `projects.diagnosticStatus` é a fonte de autoridade para o progresso do diagnóstico (quais camadas foram concluídas). O problema é que **os dois podem divergir** — não existe mecanismo de sincronização entre eles.

**2. O stepper é fonte de verdade ou só representação?**
O `FlowStepper` é **apenas representação** — recebe `currentStep` como prop e não persiste nada. O `DiagnosticoStepper` é **fonte de verdade local** — mantém `completedSteps[]` em estado React, inicializado como `[]` a cada mount. Isso significa que ao recarregar a página, o `DiagnosticoStepper` perde o progresso visual, mesmo que o banco tenha `diagnosticStatus` correto.

**3. Quais estados estão duplicados hoje?**

| Estado | Duplicado em | Risco |
|---|---|---|
| Progresso do diagnóstico | `diagnosticStatus` (banco) + `completedSteps[]` (React state) | Divergência visual |
| Conteúdo do briefing | `briefingContent` (banco) + localStorage | Inconsistência entre dispositivos |
| Conteúdo das matrizes | `riskMatricesData` (banco) + localStorage | Inconsistência entre dispositivos |
| Conteúdo do plano | `actionPlansData` (banco) + localStorage | Inconsistência entre dispositivos |
| Respostas do questionário V3 | `questionnaireAnswers` (coluna JSON) + `questionnaireAnswersV3` (tabela) | Duplicidade de dados |

**4. O que quebra se `currentStep` não for migrado?**
Se `currentStep` não for atualizado ao migrar um projeto do Fluxo A para o Fluxo B, o stepper abrirá na etapa errada. Por exemplo, um projeto legado com `currentStep=5` (diagnostico_corporativo) será direcionado para o `QuestionarioCorporativoV2` em vez do `QuestionarioV3`.

**5. Qual o risco de descompasso entre banco, router e UI?**
**Alto.** O descompasso já existe hoje entre `diagnosticStatus` e `completedSteps[]`. Após a migração, haverá um terceiro estado: o `flowVersion`. Se os três não estiverem sincronizados, o usuário pode ver uma tela de diagnóstico V3 mas o router chamar um endpoint do Fluxo A.

### TO-BE: Estado desejado (fonte única de verdade)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FONTE ÚNICA DE VERDADE (TO-BE)                       │
├──────────────────────┬──────────────────────────────────────────────────┤
│ Fonte                │ O que controla                                   │
├──────────────────────┼──────────────────────────────────────────────────┤
│ projects.flowVersion │ Qual fluxo o projeto usa ("v1" ou "v2")          │
│ projects.currentStep │ Etapa atual (inicializada no mount de cada página)│
│ projects.diagnostic  │ Progresso do diagnóstico (inicializa o stepper)  │
│ Status               │                                                  │
│ questionnaireAnswers │ Respostas do diagnóstico (tabela separada)       │
│ V3 (tabela)          │                                                  │
│ localStorage         │ Apenas rascunho temporário (TTL: 24h)            │
└──────────────────────┴──────────────────────────────────────────────────┘
```

---

## BLOCO 6 — Análise de UX / Impacto no Usuário

### Tabela de Impacto por Ponto da Jornada

| Ponto da jornada | Risco de confusão | Impacto na confiança | Mitigação UX | Necessidade de onboarding |
|---|---|---|---|---|
| Abertura de projeto legado após migração | Alto — etapas diferentes do esperado | Alto — "o sistema mudou" | Banner: "Este projeto usa o diagnóstico clássico. Novos projetos usam o diagnóstico inteligente." | **Sim** |
| Criação de novo projeto | Baixo — fluxo novo é o padrão | Baixo | Nenhuma | Não |
| Etapa de diagnóstico (V3 vs QC/QO) | Alto — usuário não entende por que as perguntas são diferentes | Alto — "sumiu o formulário que eu conhecia" | Marcador "Diagnóstico Inteligente ✨" + tooltip explicativo | **Sim** |
| Briefing gerado pelo Fluxo B | Médio — usuário pode não perceber que a fonte mudou | Médio | Exibir "Baseado em: X perguntas respondidas sobre Y CNAEs" | Não |
| Recarregar página com stepper | Alto — stepper reinicia visualmente | Alto — "perdi meu progresso" | Inicializar stepper do banco no mount | **Sim** (mensagem de carregamento) |
| Login em outro dispositivo | Alto — localStorage diferente | Alto — "meu trabalho sumiu" | Priorizar banco sobre localStorage; mostrar "Versão salva em [data]" | **Sim** |
| Rollback (Fluxo B desligado) | Muito alto — fluxo muda sem aviso | Crítico | Mensagem de manutenção: "O diagnóstico inteligente está temporariamente indisponível. Seus dados estão seguros." | **Sim — obrigatório** |

### Decisão sobre comunicação da mudança

Com base na análise acima, são necessários:

1. **Banner contextual** em projetos legados: "Este projeto usa o diagnóstico clássico (v1). Novos projetos criados após [data] usam o Diagnóstico Inteligente."
2. **Marcador "Diagnóstico Inteligente ✨"** na etapa de diagnóstico do Fluxo B, com tooltip: "Perguntas geradas por IA com base na legislação tributária vigente para os seus CNAEs."
3. **Mensagem de rollback**: se a feature flag for desligada, exibir banner amarelo: "O Diagnóstico Inteligente está em manutenção. Seus dados estão seguros e o diagnóstico clássico está disponível."
4. **Não é necessário** explicar por que o fluxo mudou na criação de novos projetos — o Fluxo B será o padrão e o usuário não terá referência anterior.

---

## BLOCO 7 — Decisão sobre o Fluxo Canônico (Reforçada)

### Tabela Comparativa

| Critério | Fluxo A canônico | Fluxo B canônico | Fluxo híbrido |
|---|---|---|---|
| **Precisão jurídica** | Baixa — perguntas estáticas com seções placeholder | Alta — perguntas geradas por IA com base no RAG regulatório | Média — depende de qual fluxo alimenta o briefing |
| **Manutenção** | Alta — cada nova lei exige atualização manual dos formulários | Baixa — corpus RAG é atualizado centralmente | Alta — dois sistemas para manter |
| **Rastreabilidade** | Alta — respostas estruturadas em JSON com campos fixos | Média — respostas em texto livre por CNAE | Baixa — duas fontes de rastreabilidade |
| **UX** | Baixa — formulários longos com seções vazias (placeholders) | Alta — perguntas contextuais por CNAE, progressive disclosure | Média — dois formulários diferentes confundem o usuário |
| **Esforço de evolução** | Alto — adicionar nova pergunta exige deploy | Baixo — atualizar corpus RAG sem deploy | Muito alto — dois sistemas para evoluir |
| **Risco de inconsistência** | Baixo — fonte única (colunas JSON) | Médio — tabela separada + coluna JSON (duplicidade atual) | Muito alto — três fontes possíveis |
| **Compatibilidade legada** | Total — todos os projetos existentes usam Fluxo A | Parcial — projetos legados precisam de migração ou isolamento | Total — mas cria complexidade permanente |
| **Dependência de IA** | Nenhuma | Alta — RAG + LLM para gerar perguntas | Média |
| **Rollback** | Trivial — sempre disponível | Possível com feature flag | Complexo — dois sistemas para reverter |
| **Clareza de fonte de verdade** | Alta — uma tabela, campos fixos | Média — tabela separada, mas bem definida | Muito baixa — ambiguidade estrutural permanente |

### Conclusão

**O Fluxo B (V3 + IA + RAG) vence como canônico** pelos seguintes motivos:

1. **Precisão jurídica superior:** perguntas geradas por IA com base no corpus regulatório são mais precisas e atualizadas do que formulários estáticos com seções placeholder.
2. **Manutenção escalável:** atualizar o corpus RAG é operacionalmente mais simples do que atualizar formulários estáticos a cada mudança legislativa.
3. **UX superior:** perguntas contextuais por CNAE eliminam a sensação de "formulário genérico" que os questionários estáticos transmitem.

**Riscos que o Fluxo B cria e como controlá-los:**

| Risco | Controle |
|---|---|
| Dependência de IA (latência, qualidade) | Timeout de 30s + fallback para perguntas pré-definidas por CNAE |
| Compatibilidade com projetos legados | Campo `flowVersion` + isolamento total entre os dois fluxos |
| Rastreabilidade das respostas | Tabela `questionnaireAnswersV3` com índices por CNAE, nível e round |
| Rollback em caso de falha | Feature flag + drill plan documentado no Bloco 4 |

---

## BLOCO 8 — Pré-Plano de Implementação (Ordem Mais Segura)

> **Atenção:** Este pré-plano **substitui a ordem proposta no ADR-002**. A ordem foi reavaliada com base nos riscos encontrados nos Blocos 1-7. Nenhuma fase deve ser iniciada sem aprovação explícita do P.O.

| Fase | Objetivo | Risco da fase | Dependência | Critério de aceite | Rollback por fase |
|---|---|---|---|---|---|
| **F0 — Testes de baseline** | Criar testes unitários para `diagnostic-consolidator.ts` e expandir testes CPIE v2 com IDs de cenário | Baixo — apenas testes, sem mudança de código | Nenhuma | 100% de cobertura do consolidator; todos os cenários da Matriz (doc 09) com ID nos testes | Reverter arquivos de teste |
| **F1 — Campo `flowVersion`** | Adicionar `flowVersion: enum("v1","v2")` ao schema + migration + popular `v1` em todos os projetos existentes | Médio — migration em produção | F0 concluída | Migration executada sem erro; todos os projetos existentes com `flowVersion="v1"`; testes passando | `pnpm db:push` com schema anterior |
| **F2 — Feature flag** | Criar `shared/feature-flags.ts` + middleware tRPC que verifica `flowVersion` antes de processar endpoints | Baixo — sem mudança de dados | F1 concluída | Feature flag `ENABLE_FLOW_V2=false` por padrão; middleware bloqueia Fluxo B para projetos v1; testes passando | Reverter `feature-flags.ts` |
| **F3 — Corrigir state machine** | Inicializar `DiagnosticoStepper` lendo `diagnosticStatus` do banco no mount; sincronizar `currentStep` com `diagnosticStatus` | Médio — mudança de comportamento do stepper | F2 concluída | Stepper não reinicia ao recarregar; `currentStep` e `diagnosticStatus` sempre sincronizados; testes passando | Reverter `DiagnosticoStepper.tsx` |
| **F4 — Adaptar risk/plan para Fluxo B** | Modificar `risk.generate` e `actionPlan.generate` para ler de `questionnaireAnswersV3` quando `flowVersion="v2"` | Alto — mudança em endpoints críticos | F2 concluída | Risk matrix e plano de ação gerados corretamente para projetos V2; projetos V1 não afetados; testes passando | Feature flag desliga Fluxo B |
| **F5 — Remover placeholders** | Remover seções QC-04..QC-10 e QO-04..QO-10 da UI | Baixo — apenas UI | F3 concluída | Formulários QC e QO não exibem seções placeholder; ICE de UX ≥ 98 | Reverter componentes de UI |
| **F6 — Ativar Fluxo B para novos projetos** | Setar `flowVersion="v2"` como padrão para projetos criados após a data de ativação | Alto — mudança de fluxo padrão | F1, F2, F3, F4 concluídas | Novos projetos usam Fluxo B; projetos legados continuam no Fluxo A; rollback drill executado com sucesso | Feature flag `ENABLE_FLOW_V2=false` |
| **F7 — Comunicação UX** | Implementar banners contextuais, marcador "Diagnóstico Inteligente" e mensagem de rollback | Baixo — apenas UI | F6 concluída | Todos os pontos de confusão da tabela do Bloco 6 têm mitigação implementada | Reverter componentes de UI |

---

## Conclusão Final do Implementador

**Ainda não seguro para implementação.**

Os seguintes bloqueadores críticos precisam ser resolvidos antes de qualquer código:

1. **R-001 (CRÍTICO):** Dois endpoints de briefing sobrescrevem a mesma coluna. Requer decisão sobre separação de colunas ou discriminação por `flowVersion` antes de qualquer implementação.
2. **R-002 (CRÍTICO):** Risk engine e action plan não leem dados do Fluxo B. Requer adaptação dos endpoints antes de ativar o Fluxo B para qualquer usuário.
3. **R-007 (CRÍTICO):** Projetos legados podem ser abertos no Fluxo B. Requer campo `flowVersion` e middleware antes de qualquer ativação.
4. **R-019 / R-020 (CRÍTICO):** Briefing, risk e plan podem ler fonte errada. Requer discriminação por `flowVersion` em todos os endpoints.

**O pré-plano proposto no Bloco 8 endereça todos os bloqueadores na ordem correta.** A Fase F0 (testes de baseline) e F1 (campo `flowVersion`) são os únicos passos que podem ser iniciados imediatamente, pois têm risco baixo e não afetam o comportamento do sistema em produção.

**Aguardando aprovação do P.O. e do orquestrador para iniciar F0.**
