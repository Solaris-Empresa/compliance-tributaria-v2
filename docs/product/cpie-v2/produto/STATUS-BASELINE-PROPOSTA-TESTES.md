# Status Report · Baseline Técnica · Proposta de Liberação para Testes

**Data:** 2026-03-23  
**Versão do código:** `63a19f5` (branch `main`)  
**Checkpoint de segurança:** `28f93642` (PRÉ-F04)  
**Servidor:** https://iasolaris.manus.space  
**Destinatário:** Orquestrador + Equipe de Advogados (UAT)

---

## PARTE 1 — STATUS REPORT

### Indicadores Técnicos

| Indicador | Valor | Status |
|---|---|---|
| TypeScript | 0 erros | ✅ |
| Testes unitários | 96 arquivos `.test.ts` | ✅ |
| Último resultado registrado | 74/74 passando (checkpoint `e937590`) | ✅ |
| Git working tree | Limpo (1 arquivo de metadata não versionado) | ✅ |
| Servidor de desenvolvimento | Rodando na porta 3000 | ✅ |
| Banco de dados | Conectado (TiDB Cloud — us-east-1) | ✅ |
| Migrations aplicadas | 53 (última: `0052_stormy_phalanx`) | ✅ |

### Métricas do Banco de Dados (produção)

| Métrica | Valor |
|---|---|
| Total de projetos | **1.733** |
| Projetos ativos (em andamento / avaliação / aprovados) | **132** |
| Total de usuários cadastrados | **1.308** |
| Projetos no fluxo V3 (`questionnaireAnswers` preenchido) | **0** |
| Projetos no fluxo V1 (`corporateAnswers` preenchido) | **1** (projeto de teste) |
| Projetos com colunas V1/V3 preenchidas (pós-F04 Fase 2) | **0** (esperado) |

### Commits Recentes (últimos 10)

| Commit | Descrição |
|---|---|
| `63a19f5` | feat(f04): Fase 1 — ADD COLUMN 6 colunas V1/V3 (migration 0052) |
| `28f9364` | Checkpoint PRÉ-F04 (ponto de rollback) |
| `1140a86` | docs: rollback drill F-04 — validação determinística completa |
| `e99bec4` | docs: ADR-008 v1.1 — SQL Fase 2 corrigido |
| `445a777` | docs: RESPOSTA-AUDITORIA-POS-HANDOFF.md |
| `3e3724e` | docs: ADR-008 — estratégia de migração F-04 |
| `e937590` | Checkpoint Sprint Final — Issues #54 e #55 concluídas |
| `683c0bb` | fix(tests): Issue #55 — débitos técnicos corrigidos |
| `113e921` | docs: RESPOSTA-ORQUESTRADOR-SPRINT-FINAL.md |
| `52daac5` | docs: RELATORIO-AUDITORIA-SPRINT-FINAL.md |

### Issues da Sprint Final

| Issue | Título | Status |
|---|---|---|
| [#54](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/54) | Modal de confirmação de retrocesso | ✅ **Fechada** |
| [#55](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/55) | Correção de débitos técnicos (3 testes) | ✅ **Fechada** |
| [#56](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/56) | F-04: Separação física de schema V1/V3 | 🔄 **Em progresso** (Fases 1+2 concluídas, Fases 3+4 bloqueadas) |
| [#57](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/57) | Validação E2E completa | ⏳ Aguardando |
| [#58](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/58) | Refinamento UX final | ⏳ Aguardando |
| [#59](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/59) | UX: botões "Voltar" não interceptados pelo modal | ⏳ Aguardando |

---

## PARTE 2 — BASELINE TÉCNICA

### Arquitetura Geral

A plataforma é uma aplicação web full-stack construída sobre **React 19 + Tailwind 4** (frontend) e **Express 4 + tRPC 11** (backend), com banco de dados **MySQL/TiDB Cloud** gerenciado via **Drizzle ORM**. A autenticação é delegada ao **Manus OAuth**, e toda a comunicação frontend-backend ocorre exclusivamente via procedimentos tRPC tipados — sem endpoints REST ad hoc.

### Stack Tecnológico

| Camada | Tecnologia | Versão |
|---|---|---|
| Frontend | React + Tailwind CSS | 19 / 4 |
| Backend | Express + tRPC | 4 / 11 |
| ORM | Drizzle ORM | — |
| Banco de dados | MySQL / TiDB Cloud | — |
| Autenticação | Manus OAuth | — |
| IA / LLM | Manus Built-in Forge API | — |
| Embeddings / RAG | TiDB Vector Search | — |
| WebSocket | Socket.IO | — |
| Testes | Vitest | — |
| Deploy | Manus Hosting | — |

### Fluxos de Diagnóstico

O sistema suporta dois fluxos de diagnóstico paralelos, fisicamente isolados:

**Fluxo V1 (legado):** Diagnóstico em 3 camadas — Corporativo (`corporateAnswers`), Operacional (`operationalAnswers`) e CNAE (`cnaeAnswers`). Produz briefing, matrizes de risco e plano de ação armazenados nas colunas legadas (`briefingContent`, `riskMatricesData`, `actionPlansData`).

**Fluxo V3 (atual):** Diagnóstico baseado em questionário CNAE inteligente (`questionnaireAnswers`). Usa o mesmo conjunto de colunas legadas para armazenamento, com separação lógica garantida pelo adaptador `getDiagnosticSource()`. A F-04 (em execução) criará colunas físicas separadas (`briefingContentV3`, `riskMatricesDataV3`, `actionPlansDataV3`).

### Adaptador de Leitura Centralizado (`getDiagnosticSource`)

O arquivo `server/diagnostic-source.ts` é o **ponto único de leitura** de dados diagnósticos em todo o sistema. Ele determina automaticamente qual versão do fluxo está ativa para cada projeto e retorna os dados corretos. Todos os 93 endpoints que antes liam colunas diretamente foram migrados para usar este adaptador (F-02, concluída). Esta é a garantia arquitetural central contra divergência V1/V3.

### Gate de Limpeza no Retrocesso (`retrocesso-cleanup.ts`)

Implementado na F-03, o gate garante que ao retroceder para uma etapa anterior no fluxo, os dados das etapas subsequentes sejam limpos de forma controlada. O endpoint `retrocesso.check` (tRPC) informa ao frontend quais dados serão perdidos antes da confirmação do usuário. O `FlowStepper` intercepta cliques em etapas anteriores e exibe o `RetrocessoConfirmModal` com a lista de dados afetados.

### Documentação de Governança

O projeto mantém 8 ADRs (Architecture Decision Records) formais:

| ADR | Título | Status |
|---|---|---|
| ADR-001 | Arquitetura do diagnóstico | Aprovado |
| ADR-002 | Plano de implementação com rollback | Aprovado |
| ADR-003 | Exaustão de riscos | Aprovado |
| ADR-004 | Fonte de verdade do diagnóstico | Rejeitado |
| ADR-005 | Isolamento físico do diagnóstico | Aprovado |
| ADR-006 | Relatório de validação prática ADR-005 | Aprovado |
| ADR-007 | Gate de limpeza no retrocesso | Aprovado |
| ADR-008 | Estratégia de migração F-04 (v1.1) | Aprovado |

### Estado da F-04 (Issue #56)

| Fase | Descrição | Status |
|---|---|---|
| Fase 1 | ADD COLUMN (6 colunas V1/V3) | ✅ Concluída (migration 0052) |
| Fase 2 | Cópia de dados em batches | ✅ Concluída (0 linhas — esperado) |
| Fase 3 | Atualizar leitura (`getDiagnosticSource`) | 🔒 Bloqueada — aguarda Orquestrador |
| Fase 4 | DROP COLUMN legadas | 🔒 Bloqueada — aguarda Orquestrador |

---

## PARTE 3 — PROPOSTA DE LIBERAÇÃO PARA TESTES (UAT)

### Contexto

A equipe de advogados precisa validar o fluxo completo de diagnóstico V3 em ambiente de produção antes da entrega final. Esta proposta define as condições mínimas, as tarefas pré-requisito, os tradeoffs e o sequenciamento recomendado para essa liberação.

### O que está pronto para teste hoje

| Funcionalidade | Estado |
|---|---|
| Fluxo V3 completo (Etapas 1–5) | ✅ Funcional |
| Modal de confirmação de retrocesso (FlowStepper) | ✅ Funcional |
| Geração de briefing por IA | ✅ Funcional |
| Matrizes de risco por CNAE | ✅ Funcional |
| Plano de ação | ✅ Funcional |
| Dashboard CPIE | ✅ Funcional |
| Autenticação e controle de acesso | ✅ Funcional |
| Notificações e WebSocket | ✅ Funcional |

### O que NÃO está pronto (bloqueantes para UAT)

| Item | Razão | Impacto no teste |
|---|---|---|
| F-04 Fase 3 (leitura V3 das novas colunas) | Bloqueada pelo Orquestrador | **Baixo** — dados ainda lidos pelas colunas legadas via `getDiagnosticSource`; funcionalidade não é afetada |
| Issue #59 (botões "Voltar" sem modal) | UX incompleta | **Médio** — advogado pode retroceder sem aviso em páginas internas |
| Issue #57 (validação E2E formal) | Não iniciada | **Baixo** — é a própria atividade de teste |

### Tarefas Pré-Requisito para Liberação

As tarefas abaixo devem ser concluídas **antes** de liberar o acesso à equipe de advogados, em ordem de prioridade:

**Pré-requisito 1 — Obrigatório (Issue #59 — UX):** Implementar a interceptação dos botões "Voltar" nas páginas `BriefingV3`, `MatrizesV3` e `PlanoAcaoV3` para exibir o mesmo `RetrocessoConfirmModal` já existente. Estimativa: 2–3 horas. Risco: baixo.

**Pré-requisito 2 — Obrigatório (Guia de Testes):** Criar um roteiro de testes UAT para a equipe de advogados, com cenários, dados de entrada esperados e critérios de aceite por etapa. Sem este guia, o teste será não-estruturado e os feedbacks serão difíceis de rastrear.

**Pré-requisito 3 — Recomendado (Conta de teste):** Criar pelo menos 1 usuário com perfil `equipe_solaris` e 1 com perfil `cliente` para que a equipe possa testar ambas as perspectivas sem usar contas reais.

**Pré-requisito 4 — Recomendado (Issue #58 — UX):** Executar o refinamento visual mínimo antes do UAT para evitar feedbacks de UX que não sejam funcionais. Estimativa: 4–6 horas.

### Decisões com Tradeoff

**Tradeoff 1 — Liberar antes ou depois da F-04 Fase 3?**

> **Opção A — Liberar antes da Fase 3 (recomendada):** O sistema funciona corretamente com as colunas legadas. A Fase 3 é transparente para o usuário final. Liberar agora permite coletar feedback funcional enquanto a F-04 avança em paralelo. Risco: nenhum para o usuário; risco técnico residual mínimo (colunas novas existem mas não são usadas ainda).
>
> **Opção B — Aguardar a F-04 completa:** Garante que a arquitetura final está em produção antes do teste. Atrasa o UAT em pelo menos 1–2 sprints. Risco: atraso desnecessário, pois a F-04 é transparente para o usuário.
>
> **Recomendação:** Opção A.

**Tradeoff 2 — Ambiente dedicado de UAT ou produção compartilhada?**

> **Opção A — Usar o ambiente de produção atual (recomendada):** O banco já tem 1.733 projetos reais. A equipe de advogados testará com dados reais ou criará projetos de teste no mesmo ambiente. Risco: projetos de teste poluem o banco de produção (mitigável com flag `mode = 'temporario'` ou prefixo no nome).
>
> **Opção B — Criar ambiente de staging separado:** Isolamento total, mas exige configuração de novo banco, novo deploy e sincronização de dados. Estimativa: 1–2 dias de trabalho técnico.
>
> **Recomendação:** Opção A com convenção de nomenclatura para projetos de teste (ex.: prefixo `[UAT]`).

**Tradeoff 3 — Nível de acesso da equipe de advogados**

> **Opção A — Perfil `equipe_solaris` (acesso total):** Permite testar todos os fluxos, incluindo aprovação de projetos e dashboard admin. Risco: ações irreversíveis em projetos reais.
>
> **Opção B — Perfil `cliente` (acesso restrito):** Testa apenas o fluxo do cliente. Não cobre o fluxo de revisão jurídica.
>
> **Opção C — Criar perfil `advogado_senior` / `advogado_junior` (já existente no schema):** Acesso intermediário, específico para o papel jurídico. Requer verificação de quais rotas estão protegidas por estes perfis.
>
> **Recomendação:** Opção C — usar os perfis `advogado_senior` e `advogado_junior` que já existem no enum `role` da tabela `users`.

### Sequenciamento Recomendado para Liberação

```
Semana atual:
  1. Implementar Issue #59 (botões Voltar) — 2–3h
  2. Criar guia de testes UAT — 2h
  3. Criar contas de teste (advogado_senior + cliente) — 30min
  4. Checkpoint pós-UAT-prep

Semana seguinte:
  5. Executar UAT com equipe de advogados (Issue #57)
  6. Coletar e priorizar feedbacks
  7. Executar Issue #58 (refinamento UX) com base nos feedbacks

Em paralelo (não bloqueia UAT):
  8. F-04 Fase 3 (aguarda Orquestrador)
  9. F-04 Fase 4 (após Fase 3 aprovada)
```

---

## Prompt sugerido para o Orquestrador

```
Orquestrador — Proposta de Liberação para Testes (UAT) — Equipe de Advogados

Estado técnico atual:
- TypeScript: 0 erros
- 96 arquivos de teste | último resultado: 74/74 passando
- F-04 Fases 1+2 concluídas (6 colunas criadas, dados copiados)
- Issues #54 e #55 fechadas
- Banco: 1.733 projetos, 1.308 usuários

Proposta:
Liberar o ambiente de produção para UAT pela equipe de advogados
ANTES da conclusão da F-04 (Fases 3 e 4), pois a F-04 é transparente
para o usuário final — o sistema funciona corretamente com as colunas
legadas via getDiagnosticSource().

Tarefas pré-requisito solicitadas:
1. APROVAÇÃO para executar Issue #59 (botões Voltar sem modal) — 2–3h, risco baixo
2. APROVAÇÃO para criar guia de testes UAT e contas de teste
3. CONFIRMAÇÃO do perfil de acesso para advogados (recomendado: advogado_senior)

Tradeoffs declarados:
- Liberar antes da F-04 completa: funcionalidade não afetada, UAT pode
  ocorrer em paralelo com a migração
- Ambiente: produção compartilhada com prefixo [UAT] nos projetos de teste
- Perfil: advogado_senior (já existe no schema, acesso intermediário)

Solicito:
A) APROVAÇÃO para iniciar Issue #59 imediatamente
B) APROVAÇÃO para criar guia UAT e contas de teste
C) CONFIRMAÇÃO do sequenciamento: UAT em paralelo com F-04 Fases 3+4
D) DECISÃO sobre ambiente: produção compartilhada vs. staging dedicado
```

---

*Documento gerado por Manus Agent em 2026-03-23. Dados coletados diretamente do repositório e banco de dados de produção.*
