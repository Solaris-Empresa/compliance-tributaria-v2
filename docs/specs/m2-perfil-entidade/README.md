# M2 — Perfil da Entidade no fluxo /projetos/novo

**Status:** SPEC v3 EM REVIEW · 2026-04-29
**Autor:** Claude Code (consolidação)
**Revisores:** Manus (1ª iteração feita) + Manus (2ª iteração — pendente sobre v3)
**Decisor final:** P.O.

---

## Contexto

Esta pasta consolida a SPEC do **M2 — Perfil da Entidade** que será inserida entre o modal de confirmação de CNAEs (em `/projetos/novo`) e o início do Questionário SOLARIS (`/projetos/:id/questionario-solaris`).

Origem: auditoria v7.60 (`docs/governance/audits/v7.60-2026-04-28-bundle-m1-corpus-gate.md`) Seção 7.1 identificou que o M1 Runner v3 está **desacoplado** do fluxo cliente — snapshot M1 vai para `m1_runner_logs` (monitoring) sem ser consumido pelo RAG, briefing, riscos ou plano de ação.

## Histórico de versões

| Versão | Data | Status | Razão |
|---|---|---|---|
| v1 | 2026-04-29 | ❌ BLOQUEADA | 4 riscos altos (Manus) + 6 bloqueantes (Claude Code) |
| v2 | 2026-04-29 | ❌ INTERMEDIÁRIA | dual-gate FSM — não alinhada com diretiva P.O. de 2026-04-29 |
| **v3** | **2026-04-29** | **✅ EM REVIEW** | dual-gate REMOVIDO + RAG guardrail absoluto |

## Diretivas P.O. 2026-04-29 incorporadas em v3

1. **"legado não é problema, devemos limpar os projetos legados"** → 3 opções de cleanup (DELETE / BACKFILL_NULL / MIGRATE_AUTO) — recomendação default: BACKFILL_NULL.
2. **"o rag não pode ser apagado"** → guardrail absoluto top-level com 7 arquivos imutáveis e verificação `git diff` obrigatória nos 3 PRs.

## Arquivos nesta pasta

| Arquivo | Conteúdo |
|---|---|
| `PROMPT-M2-v3-FINAL.json` | SPEC executável em formato JSON — pronta para despacho ao Claude Code (após review Manus + decisão final P.O.) |

## Itens pendentes para a 2ª iteração de review do Manus

Manus já validou v1 (crítica em `7-Perfil-Empresa-ARQUETIPO/RAG/M1/mockup/spec/critica--json/Crítica Técnica — Prompt M2…md`). v3 incorpora:

- ✅ 4 riscos altos do Manus → todos resolvidos
- ✅ 3 decisões pendentes do Manus → todas resolvidas (DECISÃO-1 pelo P.O.; DECISÃO-2 e DECISÃO-3 pelo Orquestrador)
- ✅ 6 imprecisões técnicas do Manus → todas corrigidas
- ✅ 6 bloqueantes do Claude Code → todos resolvidos
- ➕ Guardrail RAG absoluto adicionado (diretiva P.O.)
- ➕ Single-gate FSM (legacy cleanup) — substitui dual-gate da v2

**Pergunta para Manus:** v3 ainda introduz algum risco não-mitigado, alguma inconsistência com o código real (HEAD `06b7faf`), ou alguma imprecisão técnica que invalide a executabilidade do escopo?

## Plano de implementação proposto (3 PRs sequenciais)

| PR | Escopo | LOC estimado | Risk level |
|---|---|---|---|
| **PR-A** | Schema (5 colunas) + router `perfil.*` + FSM single-gate + ADRs 0031/0032 + testes router | ~280 | medium |
| **PR-B** | Frontend `ConfirmacaoPerfil.tsx` + Painel de Confiança PC-01..PC-06 + redirect condicional + gate frontend QuestionarioSolaris | ~700 | high |
| **PR-C** | E2E Playwright + suite integração + polish UX + atualização dicionários | ~350 | low |

## Decisão única pendente do P.O. antes de despachar PR-A

Escolher entre `legacy_cleanup_options`:

- **A — DELETE total** (perda de dados — NÃO recomendada)
- **B — BACKFILL_NULL** (preserva, snapshot null para legacy — ✅ default sugerido)
- **C — MIGRATE_AUTO** (rodar engine retroativamente — risco médio)

## Referências

- `docs/governance/audits/v7.60-2026-04-28-bundle-m1-corpus-gate.md` — auditoria que identificou desacoplamento M1↔RAG
- `7-Perfil-Empresa-ARQUETIPO/RAG/M1/mockup/IA SOLARIS — Mockup M1 Perfil da Entidade v5.1.html` — baseline UX
- `7-Perfil-Empresa-ARQUETIPO/RAG/M1/mockup/M1-ARQUETIPO-FORM-DELTA-v5.1.md.txt` — delta funcional v5.1
- `7-Perfil-Empresa-ARQUETIPO/RAG/M1/mockup/regras---CONFIANCA/confianca-mockup.txt` — spec Painel de Confiança CP-01..CP-06
- `7-Perfil-Empresa-ARQUETIPO/RAG/M1/mockup/spec/critica--json/Crítica Técnica…md` — review v1 do Manus (resolvido em v3)
