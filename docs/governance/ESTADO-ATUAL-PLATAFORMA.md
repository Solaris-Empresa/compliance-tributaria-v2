# ESTADO ATUAL DA PLATAFORMA — IA SOLARIS

> **Fonte única de verdade.** Atualizado em: 2026-03-28.
> Audiência: P.O. · Orquestrador · Implementador.
> Versão: **v1.0** — gerado com dados reais do repositório (577 commits, 184 PRs).

---

## 1. Identidade do Produto

| Campo | Valor |
|---|---|
| Nome | IA SOLARIS — Plataforma de Compliance Tributário |
| Repositório | https://github.com/Solaris-Empresa/compliance-tributaria-v2 |
| Produção | https://iasolaris.manus.space |
| Admin / RAG Cockpit | https://iasolaris.manus.space/admin/rag-cockpit |
| Painel P.O. | https://solaris-empresa.github.io/compliance-tributaria-v2/painel-po/ |
| Taskboard P.O. | https://iasolaris.manus.space/taskboard-po |
| Stack | React 19 / Tailwind 4 / Express 4 / tRPC 11 / TiDB Cloud / Drizzle / Vitest / pnpm |
| Modelo LLM | GPT-4.1 (via `invokeLLM` — Manus Forge API) |
| Autenticação | Manus OAuth |

---

## 2. Métricas Técnicas (2026-03-28)

| Indicador | Valor | Status |
|---|---|---|
| Commits no main | **577** | ✅ |
| PRs mergeados | **184** (PR #1 a #184) | ✅ |
| Issues abertas | **18** | ⏳ |
| Tabelas no schema | **63** | ✅ |
| Migrations aplicadas | **60** (última: `0060`) | ✅ |
| Arquivos de teste | **131** arquivos `.test.ts` | ✅ |
| Testes passando (baseline) | **2.652 / 2.773** (97 falhas pré-existentes) | ✅ |
| TypeScript | **0 erros** | ✅ |
| Corpus RAG | **2.078 chunks — 100% com anchor_id** | ✅ |
| Routers tRPC | **43 routers** (server/routers*.ts + server/routers/*.ts) | ✅ |
| Engines de negócio | **7** (briefing, gap, risk, consistency, scoring, onda1Injector, diagnostic) | ✅ |
| Páginas frontend | **57 páginas** (client/src/pages/*.tsx) | ✅ |
| Componentes | **21 componentes** principais (client/src/components/*.tsx) | ✅ |
| ADRs formais | **8** (ADR-001 a ADR-008; ADR-004 rejeitado) | ✅ |
| Invariants do sistema | **8** (INV-001 a INV-008) | ✅ |
| DIAGNOSTIC_READ_MODE | `shadow` (ativo — **NÃO alterar sem aprovação P.O.**) | ✅ |
| Branch protection | Ativa (ruleset `main-protection`, ID 14328406) | ✅ |
| Agent Skills ativas | Manus `/solaris-orquestracao` + Claude `solaris-contexto` | ✅ |

---

## 3. Sprint K — Estado Final (2026-03-28)

Todos os 4 checkpoints do Sprint K foram mergeados com sucesso.

| Checkpoint | PR | Commit | Entregável | Status |
|---|---|---|---|---|
| K-4-A | #176 | `d370932` | Migration 0058: `solaris_answers` + `iagen_answers` + `flowStateMachine` | ✅ Mergeado |
| K-4-B | #179 | `a3c8f4e` | `QuestionarioSolaris.tsx` + `DiagnosticoStepper` 8 etapas + `completeOnda1` | ✅ Mergeado |
| K-4-C | #182 | `b7fb1b4` | `QuestionarioIaGen.tsx` + `completeOnda2` + `onStartOnda2` wiring | ✅ Mergeado |
| K-4-D | #184 | `e54d606` | Wiring etapas 7-8 (`onStartMatrizes`, `onStartPlano`) + fix T06.1 | ✅ Mergeado |

**Critério de aceite K-4-D:** clicar em "Iniciar" na Etapa 7 navega para `/matrizes-v3`; clicar em "Iniciar" na Etapa 8 navega para `/plano-v3`. **Validação P.O. pendente** (etapas já concluídas no projeto de teste — botão exibido como "Revisitar", comportamento correto).

---

## 4. Corpus RAG — Distribuição por Lei

| Lei | Label | Chunks | % do Corpus | IDs | Status |
|---|---|---|---|---|---|
| LC 214/2025 | `lc214` | **1.573** | 75,7% | 1–30.839 | ✅ Íntegro |
| LC 227/2024 | `lc227` | **434** | 20,9% | 808–1.241 | ✅ Íntegro |
| LC 224/2024 | `lc224` | **28** | 1,3% | 780–807 | ✅ Íntegro |
| EC 132/2023 | `ec132` | **18** | 0,9% | 30.840–30.857 | ✅ Íntegro |
| LC 123/2006 | `lc123` | **25** | 1,2% | 664–722 | ✅ Íntegro |
| **Total** | — | **2.078** | 100% | — | ✅ |

> **Por que LC 214 tem 75,7%?** A LC 214/2025 tem 544 artigos e 23 anexos com tabelas de produtos/alíquotas — é a lei mais extensa da Reforma Tributária. A LC 224/2024 tem apenas 14 artigos e zero anexos (lei cirúrgica de redução de benefícios fiscais).

---

## 5. Arquitetura — Fluxo 3 Ondas (contrato v1.1)

O fluxo de diagnóstico de um projeto segue uma máquina de estados com 11 estados e 3 ondas sequenciais:

```
briefing_pendente
  → briefing_concluido
    → cnaes_confirmados
      → onda1_solaris          ← Onda 1: Questionário SOLARIS (12 perguntas SOL-001..012)
        → onda2_iagen          ← Onda 2: Questionário IA Gen (gerado por LLM)
          → diagnostico_v3     ← Diagnóstico consolidado
            → matrizes_risco   ← Onda 3: Matrizes de Risco
              → plano_acao     ← Plano de Ação
                → concluido
```

**Enforcement:** `flowStateMachine.ts` — `assertValidTransition()` bloqueia qualquer transição inválida no backend.

---

## 6. Issues Abertas (18 total)

### Bloqueadas / Aguardam P.O.

| Issue | Título | Labels |
|---|---|---|
| #57 | Teste E2E Completo — Fluxo V1/V3 + Retrocesso | `priority:critical`, `requires:po-approval` |
| #56 | F-04 Separação Física de Colunas V1/V3 (Migration) | `priority:critical`, `risk:high`, `requires:po-approval` |
| #62 | ADR-009 Fase 4 — DROP COLUMN colunas legadas | `priority:low`, `risk:high` |
| #61 | ADR-009 — Validar zero divergências e promover para modo `new` | `priority:high`, `risk:medium` |
| #60 | ADR-009 — Ativar Shadow Mode `shadow` em produção | `priority:medium`, `risk:low` |

### Sprint L (próxima sprint)

| Issue | Título | Labels |
|---|---|---|
| #152 | ÉPICO E6 — Upload CSV SOLARIS | `epic` |
| #157 | L-1: Tela de upload CSV no painel admin | `frontend`, `backend`, `p.o.-valida` |
| #158 | L-2: Template CSV e documentação para equipe jurídica | `docs` |

### Débito Técnico

| Issue | Título |
|---|---|
| #101 | Testes legados quebrados no CI — 30 arquivos, 123 falhas |
| #99 | 27 arquivos de teste com falhas pré-existentes — catalogados |

---

## 7. Restrições Obrigatórias (Gate 0)

As seguintes ações **NUNCA** podem ser executadas sem aprovação explícita do P.O.:

1. `DIAGNOSTIC_READ_MODE=new` — ativar modo `new` (ADR-009 Fase 3)
2. `F-04 Fase 3` — executar DROP COLUMN nas colunas legadas V1
3. `DROP COLUMN` — qualquer remoção de coluna no schema
4. Merge de PR sem template preenchido com JSON de evidência

---

## 8. Documentos de Referência

| Documento | Localização | Versão |
|---|---|---|
| BASELINE-PRODUTO | `docs/BASELINE-PRODUTO.md` | v2.4 |
| HANDOFF-MANUS | `docs/HANDOFF-MANUS.md` | v2.4 |
| FLUXO-3-ONDAS | `docs/arquitetura/FLUXO-3-ONDAS-AS-IS-TO-BE.md` | v1.1 |
| GATE-CHECKLIST | `docs/GATE-CHECKLIST.md` | v1.0 |
| ERROS-CONHECIDOS | `docs/ERROS-CONHECIDOS.md` | v2.0 |
| INDICE-DOCUMENTACAO | `docs/INDICE-DOCUMENTACAO.md` | v2.01 |
| PLAYBOOK-DA-PLATAFORMA | `docs/product/cpie-v2/produto/PLAYBOOK-DA-PLATAFORMA-v3.md` | v3.0 |
| DOCUMENTACAO-IA-GENERATIVA | `docs/product/cpie-v2/produto/DOCUMENTACAO-IA-GENERATIVA-v5.md` | v5.0 |
| REQUISITOS-FUNCIONAIS | `docs/product/cpie-v2/produto/REQUISITOS-FUNCIONAIS-v6.md` | v6.0 |
| AUDITORIA-COMPLIANCE | `docs/product/cpie-v2/produto/AUDITORIA-COMPLIANCE-PLATAFORMA-v1.1.md` | v1.1 |
| RASTREABILIDADE-RF-PR | `docs/RASTREABILIDADE-RF-PR-SPRINT.md` | v1.0 |
| ADR-001 a ADR-008 | `docs/product/cpie-v2/produto/ADR-*.md` | — |
| CORPUS-BASELINE | `docs/rag/CORPUS-BASELINE.md` | v1.0 |
| FRAMEWORK-GOVERNANCA | `docs/governanca/FRAMEWORK-GOVERNANCA-IA-SOLARIS.md` | v1.0 |
| ESTADO-ATUAL-PLATAFORMA | `docs/governance/ESTADO-ATUAL-PLATAFORMA.md` | **v1.0 (este)** |
| HANDOFF-IMPLEMENTADOR | `docs/governance/HANDOFF-IMPLEMENTADOR.md` | v1.0 |
| CONTEXTO-ORQUESTRADOR | `docs/governance/CONTEXTO-ORQUESTRADOR.md` | v1.0 |
| RASTREABILIDADE-COMPLETA | `docs/governance/RASTREABILIDADE-COMPLETA.md` | v1.0 |
