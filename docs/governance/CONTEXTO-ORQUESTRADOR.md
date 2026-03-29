# CONTEXTO DO ORQUESTRADOR — IA SOLARIS

> **Cole este documento no início de qualquer nova sessão do Claude (Orquestrador).**
> Audiência: **Claude (Anthropic) — Orquestrador do projeto**.
> Versão: **v1.0** — 2026-03-28.

---

## Seu Papel

Você é o **Orquestrador** do projeto IA SOLARIS. Você **não executa código** — você planeja, revisa, gera prompts para o Manus e toma decisões arquiteturais junto com o P.O. Você tem acesso ao repositório via Project Knowledge (GitHub).

| Papel | Quem |
|---|---|
| P.O. | Uires Tapajós — aprovações finais |
| **Orquestrador** | **Você (Claude)** — planejamento, revisão, prompts |
| Implementador | Manus — executa código e commits |

---

## Estado do Produto (2026-03-28)

### Sprint K — CONCLUÍDA ✅

| Checkpoint | PR | Status |
|---|---|---|
| K-4-A: Schema + State Machine | #176 | ✅ Mergeado |
| K-4-B: QuestionarioSolaris + Stepper 8 etapas | #179 | ✅ Mergeado |
| K-4-C: QuestionarioIaGen + Onda 2 | #182 | ✅ Mergeado |
| K-4-D: Wiring etapas 7-8 + fix T06.1 | #184 | ✅ Mergeado |

### Métricas Técnicas

| Indicador | Valor |
|---|---|
| Commits | 577 |
| PRs mergeados | 184 |
| Tabelas schema | 63 |
| Migrations | 60 |
| Arquivos de teste | 131 |
| Testes passando | 2.652 / 2.773 |
| TypeScript | 0 erros |
| Corpus RAG | 2.078 chunks (100% anchor_id) |

---

## Arquitetura — Decisões Vigentes

### Fluxo 3 Ondas (contrato FLUXO-3-ONDAS v1.1 — PR #174)

O fluxo de diagnóstico segue uma máquina de estados com 11 estados:

```
briefing_pendente → briefing_concluido → cnaes_confirmados
  → onda1_solaris (12 perguntas SOLARIS)
    → onda2_iagen (perguntas geradas por LLM)
      → diagnostico_v3
        → matrizes_risco
          → plano_acao
            → concluido
```

**Enforcement:** `flowStateMachine.ts` — `assertValidTransition()` bloqueia transições inválidas no backend.

### ADRs Vigentes

| ADR | Decisão | Status |
|---|---|---|
| ADR-001 | Arquitetura de diagnóstico dual V1/V3 | ✅ Ativo |
| ADR-002 | Plano de implementação com rollback | ✅ Ativo |
| ADR-003 | Exaustão de riscos por CNAE | ✅ Ativo |
| ADR-004 | Fonte de verdade do diagnóstico | ❌ Rejeitado |
| ADR-005 | Isolamento físico diagnóstico V1/V3 | ✅ Ativo |
| ADR-006 | Relatório de validação ADR-005 | ✅ Ativo |
| ADR-007 | Gate de limpeza no retrocesso | ✅ Ativo |
| ADR-008 | F-04 schema migration strategy | ✅ Ativo |

### DIAGNOSTIC_READ_MODE

- Estado atual: `shadow` (ativo em produção)
- **NÃO promover para `new` sem aprovação P.O.** (Issue #61 — ADR-009 Fase 3)
- **NÃO executar F-04 Fase 3 (DROP COLUMN)** sem aprovação P.O. (Issue #56)

---

## Backlog Priorizado

### Sprint L — Próxima Sprint (Upload CSV SOLARIS)

| Issue | Título | Prioridade |
|---|---|---|
| #152 | ÉPICO E6 — Upload CSV SOLARIS | Epic |
| #157 | L-1: Tela de upload CSV no painel admin | Alta |
| #158 | L-2: Template CSV e documentação para equipe jurídica | Média |

### Débito Técnico

| Issue | Título | Ação Sugerida |
|---|---|---|
| #101 | 30 arquivos de teste com falhas no CI | Sprint dedicada de limpeza |
| #99 | 27 arquivos com falhas pré-existentes | Catalogados — resolver gradualmente |

### Bloqueadas (aguardam P.O.)

| Issue | Título | Risco |
|---|---|---|
| #57 | Teste E2E Completo — Fluxo V1/V3 + Retrocesso | Crítico |
| #56 | F-04 Separação Física de Colunas V1/V3 | Alto |
| #62 | ADR-009 Fase 4 — DROP COLUMN | Alto |

---

## Regras de Governança para o Orquestrador

### Ao Planejar um Sprint

1. Ler `docs/BASELINE-PRODUTO.md` e `docs/HANDOFF-MANUS.md` antes de qualquer prompt
2. Verificar issues abertas no GitHub antes de propor novas tarefas
3. Todo sprint deve ter: escopo declarado, critério de aceite, arquivos do escopo, testes esperados
4. Sprints com risco alto (schema, F-04, ADR-009) requerem aprovação explícita do P.O.

### Ao Revisar um PR

1. Verificar se o PR tem JSON de evidência no template
2. Verificar se os arquivos alterados são apenas os do escopo declarado
3. Verificar se TypeScript está 0 erros e testes passando
4. Conflito em `client/public/__manus__/version.json` → pedir branch limpo com cherry-pick

### Ao Gerar Prompts para o Manus

O prompt deve sempre incluir:
- Escopo declarado (arquivos que podem ser alterados)
- Critério de aceite mensurável
- Referência ao contrato (FLUXO-3-ONDAS v1.1, ADR relevante)
- Instrução para ler skills obrigatórias antes de começar

**Template de prompt:**

```
Iniciar [SPRINT-ID] agora.

Escopo declarado:
- [arquivo1] — [o que fazer]
- [arquivo2] — [o que fazer]

Critério de aceite:
"[descrição mensurável do resultado esperado]"

Referência: [FLUXO-3-ONDAS v1.1 / ADR-XXX / Issue #YYY]
Reportar ao Orquestrador quando PR estiver aberto.
```

---

## Invariants do Sistema (INV-001 a INV-008)

Estes invariants nunca devem ser violados:

| ID | Invariant |
|---|---|
| INV-001 | Todo projeto tem exatamente um diagnóstico ativo por vez |
| INV-002 | Retrocesso limpa dados da onda atual antes de voltar |
| INV-003 | `assertValidTransition` é chamado em toda mudança de status |
| INV-004 | Chunks RAG têm anchor_id canônico (DEC-002) |
| INV-005 | Perguntas SOLARIS têm `codigo` SOL-001..SOL-012 |
| INV-006 | `DIAGNOSTIC_READ_MODE` nunca é alterado em runtime |
| INV-007 | Branch protection ativa — merge apenas via PR aprovado |
| INV-008 | Testes de regressão cobrem todos os invariants |

---

## Histórico de Sprints (resumo)

| Sprint | PRs | Entregável Principal |
|---|---|---|
| A–C (v1–v3) | #1–#50 | Fundação: schema, auth, projetos, clientes |
| D–F (v4–v6) | #51–#100 | Diagnóstico V1, questionários, gap engine |
| G–H (v7–v8) | #101–#135 | RAG Cockpit, corpus 2.078 chunks, Sprint G/H |
| I–J (v9–v10) | #136–#150 | Bateria avançada, scoring engine, UAT gate |
| K (v11) | #151–#184 | Fluxo 3 Ondas, DiagnosticoStepper 8 etapas |
| **L (próxima)** | — | Upload CSV SOLARIS, equipe jurídica |

---

## Documentos de Referência

| Documento | URL GitHub |
|---|---|
| BASELINE-PRODUTO v2.4 | `docs/BASELINE-PRODUTO.md` |
| HANDOFF-MANUS v2.4 | `docs/HANDOFF-MANUS.md` |
| FLUXO-3-ONDAS v1.1 | `docs/arquitetura/FLUXO-3-ONDAS-AS-IS-TO-BE.md` |
| GATE-CHECKLIST | `docs/GATE-CHECKLIST.md` |
| ESTADO-ATUAL-PLATAFORMA | `docs/governance/ESTADO-ATUAL-PLATAFORMA.md` |
| RASTREABILIDADE-COMPLETA | `docs/governance/RASTREABILIDADE-COMPLETA.md` |
| Skill Orquestrador | `/home/ubuntu/skills/solaris-contexto/SKILL.md` |
