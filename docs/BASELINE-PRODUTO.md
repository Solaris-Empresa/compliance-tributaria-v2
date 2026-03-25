# Baseline do Produto — Plataforma de Compliance da Reforma Tributária

**IA SOLARIS — Plataforma de Compliance da Reforma Tributária**

> **Versão:** 1.0 — 2026-03-24
> **Commit HEAD:** `9e25ead` (branch `main`)
> **Checkpoint Manus:** `80d542a4`
> **Servidor de produção:** https://iasolaris.manus.space
> **Repositório GitHub:** https://github.com/Solaris-Empresa/compliance-tributaria-v2
> **Documento vivo:** este arquivo é a fonte de verdade do estado do produto. Deve ser atualizado a cada sprint concluída, a cada decisão arquitetural relevante e a cada mudança de estado das issues ou bloqueios.
> **Audiência:** P.O. · Equipe de Engenharia · Equipe Jurídica (UAT)

---

## Como usar este documento

Este é o **único baseline do produto**. Não existe versão em `.docx` — o GitHub é o repositório oficial. Para consultar o estado atual da plataforma, leia este arquivo. Para registrar uma mudança de estado, abra um PR que atualize este arquivo junto com o código correspondente.

**Regra de atualização:** toda sprint concluída deve gerar um commit que atualize pelo menos as seções 1 (Indicadores Técnicos), 2 (Métricas), 5 (Issues) e 10 (Próximos Passos). As demais seções são atualizadas quando há mudança real de arquitetura, stack ou decisões.

---

## 1. Indicadores Técnicos

| Indicador | Valor atual | Status |
|---|---|---|
| TypeScript | 0 erros (`npx tsc --noEmit`) | ✅ |
| Testes automatizados — total | **410 testes passando** (PCT v1 + v2 + E2E Fase 2 + BUG-001 + INV-006/007/008) | ✅ |
| Cobertura de suítes | PCT v1 (117) · PCT v2 (81) · E2E Fase 2 (132) · BUG-001 (33) · INV-606/607/608 (47) | ✅ |
| Git working tree | Limpo — sem arquivos pendentes | ✅ |
| Servidor de desenvolvimento | Rodando na porta 3000 | ✅ |
| Banco de dados | Conectado (TiDB Cloud — us-east-1) | ✅ |
| Migrations aplicadas | **54** (última: `0053_slow_maggott` — tabela `diagnostic_shadow_divergences`) | ✅ |
| ADRs formais | **9** (ADR-001 a ADR-009; ADR-004 rejeitado) | ✅ |
| Decisões Arquiteturais de Prefill | **4** (DA-1 a DA-4) | ✅ |
| Invariants do sistema | **8** (INV-001 a INV-008) com testes de regressão | ✅ |
| `DIAGNOSTIC_READ_MODE` | `shadow` (ativo em produção) | ✅ |
| Banco de dados para UAT | **Limpo** — todos os projetos removidos em 2026-03-24 | ✅ |

---

## 2. Métricas do Produto (produção — 2026-03-24)

| Métrica | Valor |
|---|---|
| Total de projetos | **0** — banco limpo para início do UAT |
| Total de usuários cadastrados | — (preservados; apenas projetos foram removidos) |
| Projetos UAT criados | **0** — aguardando sessão com advogados |
| Divergências Shadow Mode registradas | **0** (banco limpo) |
| Divergências críticas | **0** |

> **Nota:** O banco foi limpo intencionalmente em 2026-03-24 para garantir ambiente neutro no UAT com advogados. Os dados históricos (1.847 projetos, 1.364 usuários) existiam até 2026-03-23 e estão documentados no histórico de commits.

---

## 3. Arquitetura da Plataforma

### 3.1 Visão Geral

A plataforma é uma aplicação web full-stack construída sobre **React 19 + Tailwind 4** (frontend) e **Express 4 + tRPC 11** (backend), com banco de dados **MySQL/TiDB Cloud** gerenciado via **Drizzle ORM**. A autenticação é delegada ao **Manus OAuth**, e toda a comunicação frontend-backend ocorre exclusivamente via procedimentos tRPC tipados — sem endpoints REST ad hoc.

### 3.2 Stack Tecnológico

| Camada | Tecnologia | Versão |
|---|---|---|
| Frontend | React + Tailwind CSS | 19 / 4 |
| Roteamento client-side | Wouter | — |
| Backend | Express + tRPC | 4 / 11 |
| ORM | Drizzle ORM | — |
| Banco de dados | MySQL / TiDB Cloud | — |
| Autenticação | Manus OAuth | — |
| IA / LLM | Manus Built-in Forge API | — |
| Embeddings / RAG | TiDB Vector Search | — |
| WebSocket | Socket.IO | — |
| Serialização | SuperJSON | — |
| Testes | Vitest | — |
| Deploy | Manus Hosting | — |
| CI/CD | GitHub Actions (`structural-fix-gate.yml` — 4 jobs bloqueantes) | — |

### 3.3 Fluxos de Diagnóstico

O sistema suporta dois fluxos de diagnóstico paralelos, fisicamente isolados:

**Fluxo V1 (legado):** Diagnóstico em 3 camadas — Corporativo (`corporateAnswers`), Operacional (`operationalAnswers`) e CNAE (`cnaeAnswers`). Produz briefing, matrizes de risco e plano de ação armazenados nas colunas legadas.

**Fluxo V3 (atual):** Diagnóstico baseado em questionário CNAE inteligente (`questionnaireAnswers`). Usa o mesmo conjunto de colunas legadas para armazenamento, com separação lógica garantida pelo adaptador `getDiagnosticSource()`. A F-04 (parcialmente concluída) criou colunas físicas separadas (`briefingContentV3`, `riskMatricesDataV3`, `actionPlansDataV3`) — a leitura dessas colunas está bloqueada até aprovação pós-UAT.

### 3.4 Arquitetura de Prefill (Sub-Sprint concluída em 2026-03-24)

O sistema de prefill inteligente elimina a repetição de perguntas já respondidas no perfil inicial da empresa. É composto por 4 Decisões Arquiteturais (DA):

| DA | Descrição | Arquivo |
|---|---|---|
| **DA-1** | Path canônico em `shared/questionario-prefill.ts` com builders completos e `PrefillTrace` | `client/src/shared/questionario-prefill.ts` |
| **DA-2** | API normalizada com `normalizeProject()` — JSON nunca chega como string ao frontend | `server/routes/projects.ts` |
| **DA-3** | Lógica local eliminada — todos os questionários usam builders compartilhados | QC, QO, QCNAE |
| **DA-4** | Contrato explícito — campos não coletados no perfil não são forçados nos builders | `shared/questionario-prefill.ts` |

**Questionários cobertos pelo prefill:**

| Questionário | Seções | Campos | Builders |
|---|---|---|---|
| Corporativo (QC) | QC-01 a QC-07 | 28 campos | `buildCorporatePrefill()` |
| Operacional (QO) | QO-01 a QO-03 | 15 campos | `buildOperationalPrefill()` |
| CNAE (QCNAE) | QCNAE-01 | 5 campos | `buildCNAEPrefill()` |

### 3.5 Ponto Único de Leitura — `getDiagnosticSource()`

O adaptador centralizado `server/diagnostic-source.ts` é o **único ponto de leitura** de dados de diagnóstico em toda a aplicação. Antes da F-01, havia 93 leituras diretas espalhadas pelo código — todas foram eliminadas. Ele determina o `flowVersion` (v1 / v3 / hybrid / none) e retorna dados isolados por versão.

### 3.6 Shadow Mode (ADR-009)

O Shadow Mode é controlado pela variável de ambiente `DIAGNOSTIC_READ_MODE`:

| Valor | Comportamento |
|---|---|
| `legacy` | Lê apenas colunas legadas (padrão histórico) |
| `shadow` | Lê legadas + compara com novas em background, loga divergências, **retorna legadas** (**ativo em produção**) |
| `new` | Lê apenas novas colunas V1/V3 (**bloqueado** até validação pós-UAT) |

O módulo Shadow Mode é composto por 5 arquivos em `server/diagnostic-shadow/`: `types.ts`, `utils.ts`, `readers.ts`, `logger.ts`, `shadow.ts`. O logger persiste divergências na tabela `diagnostic_shadow_divergences` e dispara `notifyOwner()` automaticamente para divergências críticas.

### 3.7 Gate de Retrocesso (F-03 / ADR-007)

Toda transição de retrocesso de etapa passa pelo gate `server/retrocesso-cleanup.ts`, que limpa os dados da etapa abandonada antes de permitir o retrocesso. O frontend exibe o `RetrocessoConfirmModal` antes de confirmar a operação.

### 3.8 Governança Permanente (implantada em 2026-03-24)

| Artefato | Localização | Descrição |
|---|---|---|
| Issue Template estrutural | `.github/ISSUE_TEMPLATE/structural-fix.md` | Obrigatório para issues de correção estrutural |
| PR Template estrutural | `.github/PULL_REQUEST_TEMPLATE/structural-pr.md` | Obrigatório para PRs de correção estrutural |
| CI Bloqueante | `.github/workflows/structural-fix-gate.yml` | 4 jobs: TypeScript, testes, invariants, prefill-contract |
| Labels GitHub | 5 labels obrigatórias | `structural-fix`, `bug`, `governance`, `prefill`, `uat` |
| Invariant Registry | `docs/invariants/` | INV-001 a INV-008 com testes de regressão |

---

## 4. Decisões Arquiteturais (ADRs)

| ADR | Título | Status |
|---|---|---|
| ADR-001 | Arquitetura do diagnóstico — fluxos V1 e V3 | ✅ Aprovado |
| ADR-002 | Plano de implementação com rollback | ✅ Aprovado |
| ADR-003 | Exaustão de riscos — gap → risco determinístico | ✅ Aprovado |
| ADR-004 | Fonte de verdade do diagnóstico | ❌ Rejeitado |
| ADR-005 | Isolamento físico do diagnóstico — `getDiagnosticSource()` | ✅ Aprovado |
| ADR-006 | Relatório de validação prática do ADR-005 | ✅ Aprovado |
| ADR-007 | Gate de limpeza no retrocesso | ✅ Aprovado |
| ADR-008 | Estratégia de migração F-04 (schema V1/V3) | ✅ Aprovado v1.1 |
| ADR-009 | Shadow Mode — comparação background V1/V3 | ✅ Implementado |

---

## 5. Issues — Estado Atual

### Issues Fechadas

| Issue | Título | Commit |
|---|---|---|
| [#54](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/54) | Modal de confirmação de retrocesso | `e937590` |
| [#55](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/55) | Correção de débitos técnicos (3 testes) | `683c0bb` |
| [#59](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/59) | UX: botões "Voltar" interceptados pelo modal | `504c9ec` |

### Issues Bloqueadas (aguardam UAT)

| Issue | Título | Bloqueio |
|---|---|---|
| [#56](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/56) | F-04 completa (Fases 3+4) | Aguarda 48-72h de observação pós-UAT |
| [#61](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/61) | Promover para modo `new` | Aguarda #56 |
| [#62](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/62) | DROP COLUMN legadas | Aguarda #61 |

### Issues Em Andamento / Aguardando

| Issue | Título | Estado |
|---|---|---|
| [#57](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/57) | Validação E2E completa | ⏳ Aguardando UAT |
| [#58](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/58) | Refinamento UX final | ⏳ Aguardando feedback UAT |
| [#60](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/60) | Shadow Mode — monitoramento contínuo | 🔄 Em andamento |

---

## 6. Erros Conhecidos Ativos

Os erros abaixo estão catalogados em [`docs/ERROS-CONHECIDOS.md`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/ERROS-CONHECIDOS.md) com runbooks de incidente.

| Código | Descrição | Solução paliativa |
|---|---|---|
| **ERR-006** | Descoberta de CNAEs falha se `OPENAI_API_KEY` inválida (HTTP 401) | Reconfigurar chave via `webdev_request_secrets` com `preventMatching: true` |
| **ERR-009** | Projetos criados antes de 2026-03-24 não têm `isEconomicGroup`/`taxCentralization` | Script de migração (ver próximos passos) |
| **ERR-010** | Sobreposição QC-07/QO-03 (meios de pagamento) — pergunta duplicada | Aguardando DECISÃO-001 do P.O. |

---

## 7. Decisões Pendentes do P.O.

| Código | Decisão | Opções | Impacto |
|---|---|---|---|
| **DECISÃO-001** | Como tratar sobreposição QC-07/QO-03 (meios de pagamento) | A: prefill cruzado (recomendada) · B: remoção de QC-07 · C: consolidação em novo campo | Não bloqueante para UAT |

---

## 8. Fases do Projeto — Histórico Completo

| Fase | Descrição | Status | Commit |
|---|---|---|---|
| **F-01** | Adaptador centralizado `getDiagnosticSource()` — eliminou 93 leituras diretas | ✅ Concluída | `61d40966` |
| **F-02A** | `routers-fluxo-v3.ts` migrado para `getDiagnosticSource()` | ✅ Concluída | `51f308b1` |
| **F-02B** | `routers.ts` migrado (briefing, riskMatrix, actionPlan) | ✅ Concluída | `f6a59818` |
| **F-02C** | `flowStateMachine.ts` e `flowRouter.ts` migrados | ✅ Concluída | `d50d5a39` |
| **F-02D** | `routers/diagnostic.ts` migrado — ZERO leituras diretas em produção | ✅ Concluída | `1cbe8f76` |
| **F-03** | Gate de limpeza no retrocesso + modal de confirmação | ✅ Concluída | `6590be3c` |
| **F-04 Fase 1** | ADD COLUMN — 6 novas colunas V1/V3 criadas no banco | ✅ Concluída | `63a19f5` |
| **F-04 Fase 2** | Cópia de dados legados para colunas V1/V3 | ✅ Concluída | `63a19f5` (0 linhas — sem dados legados) |
| **F-04 Fase 3** | Alterar leitura para novas colunas | 🔒 **Bloqueada** — aguarda UAT + 48-72h |
| **F-04 Fase 4** | DROP COLUMN das colunas legadas | 🔒 **Bloqueada** — aguarda Fase 3 |
| **ADR-009** | Shadow Mode — comparação background legada vs. novas colunas | ✅ Concluída | `eb657d3` |
| **Preparação UAT** | Alerta automático + dashboard UAT + endpoint `getUatProgress` | ✅ Concluída | `0e1046c` |
| **Sub-Sprint Prefill** | Sistema de prefill estrutural (DA-1 a DA-4) + 410 testes + governança permanente | ✅ Concluída | `9e25ead` |

---

## 9. Bloqueios Ativos (Governança)

Os seguintes bloqueios estão em vigor por decisão formal e **não devem ser removidos sem aprovação documentada**:

- **NÃO ativar `DIAGNOSTIC_READ_MODE=new`** — aguarda 48-72h de observação pós-UAT
- **NÃO executar F-04 Fase 3** (alterar leitura para novas colunas) — aguarda UAT
- **NÃO executar DROP COLUMN** nas colunas legadas — aguarda Fase 3
- **NÃO misturar correções de bugs com novas features** — regra permanente de governança

---

## 10. Próximos Passos

### P0 — Prioridade Imediata

1. **Iniciar UAT com advogados** — Sistema aprovado e pronto. Criar 2-3 projetos piloto com perfis reais (Simples Nacional, Lucro Real com grupo econômico) e registrar feedback usando o [`GUIA-UAT-ADVOGADOS-v2.md`](https://github.com/Solaris-Empresa/compliance-tributaria-v2/blob/main/docs/product/cpie-v2/produto/GUIA-UAT-ADVOGADOS-v2.md).
2. **Tomar DECISÃO-001** — Definir como tratar sobreposição QC-07/QO-03 (meios de pagamento): prefill cruzado (Opção A recomendada), remoção ou consolidação.

### P1 — Próximas Sprints

3. **Executar script de migração para projetos legados** — Preencher `isEconomicGroup` e `taxCentralization` em projetos existentes a partir de `taxComplexity.hasMultipleEstablishments` (ERR-009).
4. **Adicionar ERR-006 ao monitoramento de alertas** — Configurar alerta automático quando `OPENAI_API_KEY` retornar HTTP 401.
5. **Adicionar testes de regressão para `normalizeProject()`** — Cobrir cenário de projeto legado onde `companyProfile` chega como string JSON.

### P2 — Melhorias Futuras

6. **Avaliar ISSUE-002 para QC-02 campo livre** — `qc02_obs` é o único campo marcado como "não pré-preenchível".
7. **Após 48-72h de UAT** — Retornar com relatório de divergências para autorização formal da F-04 Fase 3.

---

## 11. Funcionalidades do Produto

| Funcionalidade | Estado | Observação |
|---|---|---|
| Fluxo V3 completo (Etapas 1–5) | ✅ Funcional | — |
| Sistema de prefill inteligente (QC + QO + QCNAE) | ✅ Funcional | DA-1 a DA-4 implementadas |
| Modal de confirmação de retrocesso | ✅ Funcional | Gate + `RetrocessoConfirmModal` |
| Geração de briefing por IA | ✅ Funcional | `invokeLLM` via Manus Forge API |
| Matrizes de risco por CNAE | ✅ Funcional | — |
| Plano de ação | ✅ Funcional | — |
| Dashboard CPIE | ✅ Funcional | — |
| Autenticação e controle de acesso | ✅ Funcional | Manus OAuth |
| Notificações e WebSocket | ✅ Funcional | Socket.IO + `notifyOwner()` |
| Shadow Monitor (`/admin/shadow-monitor`) | ✅ Funcional | 4 métricas, gráfico 24h, clearOld |
| Dashboard UAT (`getUatProgress`) | ✅ Funcional | — |
| Descoberta de CNAEs por IA | ✅ Funcional | Requer `OPENAI_API_KEY` válida (ver ERR-006) |

---

## 12. Migrations do Banco de Dados

54 migrations aplicadas via Drizzle ORM. As mais recentes:

| Migration | Descrição |
|---|---|
| `0052_stormy_phalanx.sql` | F-04 Fase 1 — ADD COLUMN 6 colunas V1/V3 (`briefingContentV1/V3`, `riskMatricesDataV1/V3`, `actionPlansDataV1/V3`) |
| `0053_slow_maggott.sql` | Tabela `diagnostic_shadow_divergences` para Shadow Mode |

---

## 13. Histórico de Atualizações deste Documento

| Versão | Data | Commit | Descrição da atualização |
|---|---|---|---|
| 1.0 | 2026-03-24 | `9e25ead` | Criação — unificação de STATUS-REPORT-BASELINE-2026-03-23.md e STATUS-BASELINE-PROPOSTA-TESTES.md. Estado pós-Sub-Sprint Prefill Contract. Banco limpo para UAT. |

> **Instrução para próxima atualização:** ao concluir uma sprint ou tomar uma decisão relevante, adicione uma linha nesta tabela e atualize as seções 1, 2, 5 e 10 com os novos valores. Faça commit com mensagem `docs: BASELINE-PRODUTO v1.x — <descrição>`.

---

*Documento vivo mantido pela equipe IA SOLARIS. Repositório oficial: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
