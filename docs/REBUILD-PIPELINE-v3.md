# REBUILD-PIPELINE-v3 — Visão para o Agente
**IA SOLARIS — Guia de Reconstrução Completa da Pipeline**

> **Versão:** 3.0  
> **Origem:** `documentacao-para-rollback-rag-v1.00.docx` (integrado em 2026-03-23)  
> **Autoridade:** Product Owner Uires Tapajós  
> **Cenário de uso:** GitHub corrompido, branch errada, perda parcial do pipeline, necessidade de remontar a esteira do zero.  
> **Status:** ATIVO — Source of Truth de Reconstrução

---

## 1. Objetivo

Reconstruir a pipeline sem reinventar arquitetura e sem destruir decisões corretas já tomadas. Este documento é o guia operacional para o agente em caso de desastre ou reconstrução.

---

## 2. Repositório de Referência

| Item | Valor |
|---|---|
| GitHub | https://github.com/Solaris-Empresa/compliance-tributaria-v2 |
| Branch principal | `main` |
| Commit HEAD atual | `40bf064` |
| Servidor de produção | https://iasolaris.manus.space |
| Checkpoint Manus | `0e1046cf` |

---

## 3. Ordem Correta de Reconstrução

### Etapa 0 — Baseline e Governança (SEMPRE PRIMEIRO)

Antes de qualquer código:

1. Criar sprint com issues numeradas
2. Definir checkpoints de segurança
3. Registrar critérios de DONE
4. Registrar que **frontend exige QA humano**
5. Registrar que **persistência é obrigatória**
6. Ler os documentos: `PLAYBOOK-PLATAFORMA.md`, `BASELINE-v2.2.md`, `PO-GOVERNANCA-PIPELINE-v3.md`

### Etapa 1 — Núcleo Regulatório

Reconstruir ou validar:

- Fontes legais (Reforma Tributária — LC 214/2025)
- Requisitos regulatórios (499 requisitos canônicos)
- Canonical requirements (`docs/architecture/canonical-requirements.md`)
- Requirement-question mapping (`docs/architecture/question-mapping-engine.md`)
- Coverage/audit trail

### Etapa 2 — Motores Diagnósticos

Reconstruir ou validar:

- Question engine
- Gap engine
- Risk engine

### Etapa 3 — Motores de Entrada

Reconstruir ou validar:

- Perfil da empresa
- **Motor CNAE existente** — `cnae-rag.ts`, `cnae-embeddings.ts`, `discoverCnaes`, `refineCnaes`, `confirmCnaes` (`docs/architecture/cnae-pipeline.md`)
- Confirmação de CNAEs
- Consistency engine

### Etapa 4 — Jornada do Usuário

Reconstruir ou validar:

- `DiagnosticoStepper`
- 3 questionários (corporativo, operacional, CNAE)
- State machine
- `currentStep` e `currentStepName`
- Retomada exata do fluxo

### Etapa 5 — Saídas

Reconstruir ou validar:

- Briefing v2.2 (multi-input)
- Matriz de riscos 4 perspectivas
- Plano de ação por domínio
- Dashboard executivo

### Etapa 6 — Evidência

Provar:

- Persistência (banco + API + UI)
- Retomada após refresh/fechar/reabrir
- Score honesto
- Rastreabilidade canonical_id → pergunta → gap → risco → plano
- QA humano executado

---

## 4. Pipeline Oficial da Plataforma

```
Perfil da Empresa
→ Consistency Engine
→ Descoberta de CNAEs
→ Refinamento de CNAEs
→ Confirmação de CNAEs
→ Diagnóstico Corporativo
→ Diagnóstico Operacional
→ Diagnóstico CNAE
→ Briefing v2.2
→ Gap Engine
→ Risk Engine
→ Plano de Ação
→ Dashboard
```

---

## 5. O Que o Agente NÃO Pode Esquecer

| Item | Regra |
|---|---|
| Persistência | toda task que muda fluxo ou frontend precisa persistir no banco |
| QA humano | toda task com tela precisa deixar roteiro para teste do P.O. |
| CNAE | não reimplementar; usar o motor existente |
| Score | sempre honesto; sem inflar |
| Done | só depois de validation + evidência + aprovação |
| RAG | não mexer sem necessidade |
| Output | briefing/riscos/plano devem refletir múltiplos inputs |
| Shadow Mode | manter `DIAGNOSTIC_READ_MODE=shadow`; não alterar para `new` sem autorização |

---

## 6. Checklist de Reconstrução

### Infra e Estado

- [ ] enum/status atualizado
- [ ] `current_step` criado e persistido
- [ ] transições persistidas
- [ ] retomada validada
- [ ] Shadow Mode ativo (`DIAGNOSTIC_READ_MODE=shadow`)

### Entrada

- [ ] perfil da empresa funcional
- [ ] consistency gate funcional
- [ ] CNAE discovery preservado
- [ ] CNAE refine/confirm preservado

### Diagnóstico

- [ ] questionário corporativo funcional
- [ ] questionário operacional funcional
- [ ] questionário CNAE funcional
- [ ] bloqueios sequenciais funcionando

### Saídas

- [ ] briefing usa múltiplos inputs
- [ ] gaps gerados
- [ ] riscos gerados por domínio
- [ ] plano gerado por domínio
- [ ] dashboard consolidado

### Governança

- [ ] testes unitários passando (TypeScript 0 erros)
- [ ] testes de regressão
- [ ] testes funcionais
- [ ] evidência visual
- [ ] persistência comprovada
- [ ] commit/push/checkpoint
- [ ] QA humano executado

---

## 7. Prompt-Base para Reconstrução Completa

Use este prompt caso precise remontar do zero:

```
TÍTULO: REBUILD PIPELINE — IA SOLARIS COMPLIANCE (GOVERNANCE-FIRST)

AUTORIDADE:
Você opera sob comando do Product Owner Uires Tapajós.

MODO:
STRICT MODE — REBUILD + GOVERNANÇA CRÍTICA

OBJETIVO:
Reconstruir a pipeline completa da plataforma IA SOLARIS,
preservando as decisões arquiteturais corretas já consolidadas.

REGRAS FUNDAMENTAIS:
1. Persistência é obrigatória em toda task que altere fluxo, etapa ou UI.
2. Toda task com frontend exige QA humano do P.O.
3. Não reimplementar o motor CNAE.
4. Não refazer o RAG regulatório sem necessidade.
5. Nenhuma task vai para DONE sem:
   - TypeScript 0 erros
   - testes unitários
   - testes de regressão
   - testes funcionais
   - evidência visual
   - persistência validada
   - commit + push + checkpoint

PIPELINE OBRIGATÓRIA:
Perfil da Empresa
→ Consistency Engine
→ Descoberta/Refinamento/Confirmação de CNAEs
→ Diagnóstico Corporativo
→ Diagnóstico Operacional
→ Diagnóstico CNAE
→ Briefing
→ Gap
→ Risk
→ Plano
→ Dashboard

ORDEM DE EXECUÇÃO:
FASE 1 — Infra/estado/persistência
FASE 2 — Entrada (perfil + consistency + CNAE)
FASE 3 — 3 questionários
FASE 4 — Output (briefing/risk/plan)
FASE 5 — QA e validação end-to-end

OUTPUT OBRIGATÓRIO POR TASK:
1. arquivos alterados
2. alterações no banco
3. regras implementadas
4. testes executados
5. evidências de persistência
6. evidências visuais
7. instruções para QA humano
8. commit/push/checkpoint
9. Status: VALIDATION
```

---

## 8. Arquivos Críticos do Repositório

| Arquivo | Finalidade |
|---|---|
| `server/diagnostic-source.ts` | Único ponto de leitura de dados de diagnóstico |
| `server/diagnostic-shadow/` | 5 módulos do Shadow Mode (ADR-009) |
| `server/retrocesso-cleanup.ts` | Gate de limpeza no retrocesso (ADR-007) |
| `server/routers/shadowMode.ts` | Endpoints admin do Shadow Monitor |
| `drizzle/schema.ts` | Schema completo do banco (54 migrations) |
| `client/src/pages/ShadowMonitor.tsx` | Dashboard Shadow Mode + UAT |
| `docs/PLAYBOOK-PLATAFORMA.md` | Playbook oficial de desenvolvimento |
| `docs/BASELINE-v2.2.md` | Baseline técnica v2.2 |
| `docs/PO-GOVERNANCA-PIPELINE-v3.md` | Este documento de governança |
| `docs/SKILL-MANUS-PIPELINE-v3.md` | Skill técnico do Manus |

---

*Gerado em 2026-03-23 | Origem: documentacao-para-rollback-rag-v1.00.docx | Integrado ao repositório GitHub*
