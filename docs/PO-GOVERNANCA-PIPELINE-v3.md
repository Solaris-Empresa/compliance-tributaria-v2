# PO-GOVERNANCA-PIPELINE-v3 — Visão de P.O.
**IA SOLARIS — Plataforma de Compliance da Reforma Tributária**

> **Versão:** 3.0  
> **Origem:** `documentacao-para-rollback-rag-v1.00.docx` (integrado em 2026-03-23)  
> **Autoridade:** Product Owner Uires Tapajós  
> **Status:** ATIVO — Source of Truth de Governança

---

## 1. Visão Executiva do Produto

A IA SOLARIS não é mais um "assistente jurídico com RAG". Ela é, na prática, um **sistema de decisão regulatória**, com esteira de:

```
input empresarial
→ consistência
→ CNAE
→ diagnóstico em 3 camadas
→ briefing
→ gap
→ risco
→ plano
→ dashboard
```

Isso está alinhado ao playbook, ao baseline v2.2 e ao histórico de sprints, que posicionam o produto como **SaaS de compliance tributário** com motor de requisitos canônicos, gap engine e risk engine.

---

## 2. Estado Real Consolidado

| Bloco | Estado | Leitura de P.O. |
|---|---|---|
| Regulatory Engine | concluído | forte, não mexer |
| Canonical layer | concluída | forte, não mexer |
| Question quality | concluída | atingiu produção |
| Gap Engine | concluído | válido |
| Risk Engine | concluído | tecnicamente precisa encaixe final no fluxo |
| CNAE Engine | maduro e preservado | não refazer |
| 3 questionários | implementados | manter e evoluir |
| Consistency Engine | implementado | precisa integração |
| Flow state / persistência | **crítico e incompleto** | **prioridade máxima** |
| Briefing / Riscos / Plano | funcionam, mas com input ampliado | precisam refatoração de saída |
| QA humano de frontend | pendente / obrigatório | gate final de qualidade |
| Shadow Mode (ADR-009) | **concluído** | ativo em produção (`shadow`) |
| F-04 Fases 1+2 | **concluídas** | schema V1/V3 criado, dados copiados |
| F-04 Fases 3+4 | **bloqueadas** | aguarda UAT + 48-72h |
| UAT formal | **pendente** | aguarda publicação e criação de projetos `[UAT]` |

---

## 3. Achados Principais do Orquestrador

| Achado | Gravidade | Implicação |
|---|---|---|
| Motor CNAE já existe e está forte | alta | qualquer tentativa de "refazer descoberta via LLM" é regressão |
| v2.1 com 3 questionários foi preservado | alta | não reabrir essa frente |
| v2.2 adicionou ConsistencyEngine corretamente | média/alta | valor certo, mas integração ainda incompleta |
| Stepper frontend está à frente do backend | crítica | usuário pode navegar sem persistência real |
| `current_step` precisa ser persistido | crítica | sem isso não há produção |
| enum/status do banco ainda não reflete o fluxo novo | crítica | backend não entende integralmente o estado do projeto |
| Briefing/Risco/Plano agora recebem mais insumos | crítica | não podem continuar com lógica "CNAE-only" |
| QA humano precisa ser formalizado | crítica | testes automatizados não bastam para front-end em produto regulatório |
| Shadow Mode ativo com 60 divergências esperadas | informativo | todas do tipo "legada tem valor, nova é null" — F-04 Fase 2 não executada ainda |

---

## 4. Princípios de Produto — Regras Mandatórias

**Regra 1 — Confiabilidade do input:** Se o cadastro for incoerente, o diagnóstico inteiro pode ser irrealista. O Consistency Engine deve existir antes de abrir o diagnóstico.

**Regra 2 — Persistência é requisito funcional:** Sem persistência de estado, não existe produto em produção.

**Regra 3 — Output precisa refletir o novo input:** Briefing, matriz de riscos e plano de ação precisam consumir: perfil da empresa, consistência, CNAEs confirmados, questionário corporativo, questionário operacional e questionário CNAE.

**Regra 4 — QA humano é gate final:** Todo item com frontend precisa ser validado manualmente pelo P.O. antes de DONE.

**Regra 5 — Shadow Mode antes de migração:** Nenhuma mudança de leitura de dados (F-04 Fase 3) sem divergências críticas = 0 e 48-72h de observação.

---

## 5. Roadmap Recomendado (Produção Regulatória)

### Fase A — Estabilização Transacional do Fluxo

| Issue | Nome | Tipo | Prioridade |
|---|---|---|---|
| #30 | Persistir `current_step` | refatoração | crítica |
| #31 | Atualizar enum/status do projeto | refatoração | crítica |
| #32 | Sincronizar state machine backend/frontend | refatoração | crítica |
| #33 | Retomada exata do fluxo | nova | crítica |
| #34 | QA manual do fluxo de retomada | QA | crítica |

### Fase B — Integração de Consistência

| Issue | Nome | Tipo | Prioridade |
|---|---|---|---|
| #35 | Conectar ConsistencyGate ao stepper | integração | crítica |
| #36 | Persistir findings + aceite de risco | refatoração | alta |
| #37 | Evidenciar risco assumido no projeto | nova | alta |

### Fase C — Refatoração da Saída

| Issue | Nome | Tipo | Prioridade |
|---|---|---|---|
| #38 | Briefing v2.2 multi-input | refatoração | crítica |
| #39 | Matriz de Riscos v2.2 (4 perspectivas) | refatoração | crítica |
| #40 | Plano de Ação v2.2 por domínio | refatoração | crítica |
| #41 | Evidenciar origem por camada no output | nova | alta |

### Fase D — Integração Final do Motor

| Issue | Nome | Tipo | Prioridade |
|---|---|---|---|
| #42 | Diagnóstico → Gap Engine | integração | alta |
| #43 | Gap → Risk Engine | integração | alta |
| #44 | Risk → Action Plan | integração | alta |
| #45 | Dashboard executivo consolidado | nova | média/alta |

### Fase E — UAT e Migração Final (em andamento)

| Issue | Nome | Tipo | Prioridade |
|---|---|---|---|
| #56 | F-04 Fases 3+4 (alterar leitura + DROP COLUMN) | migração | crítica — bloqueada |
| #57 | Validação E2E completa | QA | alta — aguardando |
| #58 | Refinamento UX final | UX | média — aguardando |
| #60 | Shadow Mode — monitoramento contínuo | operação | em andamento |
| #61 | Promover para modo `new` | migração | bloqueada — aguarda UAT |
| #62 | DROP COLUMN legadas | migração | bloqueada — aguarda #61 |

---

## 6. Critério de Liberação para Testes Externos

| Critério | Obrigatório? |
|---|---|
| `current_step` persistido e recuperado | sim |
| enum/status alinhado ao novo fluxo | sim |
| ConsistencyGate operacional antes do diagnóstico | sim |
| CNAE engine preservado, sem regressão | sim |
| 3 questionários operando em sequência com gates | sim |
| Briefing v2.2 refletindo múltiplos inputs | sim |
| Matriz de risco em 4 perspectivas | sim |
| Plano de ação por domínio | sim |
| Testes unitários / regressão / funcional | sim |
| QA humano do P.O. no frontend | sim |
| Evidência visual + banco + logs | sim |
| Commit + push + checkpoint | sim |
| Shadow Mode: divergências críticas = 0 | sim |
| 48-72h de observação pós-UAT | sim |

> **Regra de produção:** sem todos os critérios acima = não liberar para testes externos.

---

## 7. Decisão de P.O. — O Que Manter, Refatorar e Proibir

**O que manter:**
Motor CNAE, motor regulatório, 3 questionários, gap/risk engines, estrutura de governança já criada, Shadow Mode, ADRs aprovados.

**O que refatorar:**
Estado do fluxo, persistência, consistency integration, briefing, matriz de riscos, plano de ação.

**O que proibir:**
Reimplementar CNAE, refazer RAG sem necessidade, criar atalhos sem persistência, mover feature com frontend para DONE sem QA do P.O., ativar modo `new` sem critérios atendidos.

---

*Gerado em 2026-03-23 | Origem: documentacao-para-rollback-rag-v1.00.docx | Integrado ao repositório GitHub*
