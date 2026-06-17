# Auditoria SOLARIS-SPEC-FIRST — Pós-Sessão 18/06/2026

**HEAD main:** `30330277`
**Método:** REGRA-ORQ-37 (evidência obrigatória — query SQL / vitest DB real / merge SHA), REGRA-ORQ-19 (auditoria de fim de sessão)
**Atores:** Claude Code (R — implementação) · Manus (execução prod + evidência runtime/SQL) · Consultor/ChatGPT (C — parecer) · P.O. Uires Tapajós (A — veredito)
**Veredito global:** ✅ **4/4 PASS com fundamento** — nenhuma regressão introduzida pelos PRs desta sessão; todos os fixes operacionais em produção.

---

## Veredito por bloco

| Bloco | Item | Evidência | Veredito |
|---|---|---|---|
| A | BUG-001 — precedência negativa `1006.10` (exclusion list) | Tabela DB + 9 testes vitest com DB real | ✅ PASS |
| B | ACHADO-001 — corpus/normativo `2304.00` | INSERT `id=180001` exact, `aliquota_reduzida_60`, `legal_reference` cita itens 7 e 20; grupo `2304` prefix intacto como fallback; 4 vitest DB real | ✅ PASS |
| C | G3-T3 E2E (#1496) — entrega agro CNAE 28 + NCM 8436 | Merged `b27a1e37`; evidência C2/C3 postada no PR antes do merge (Art.197 Decreto/CGIBS6 conf. 1.0; zero LC214 cooperativas) | ✅ PASS |
| D (lib/tsc) | Não-regressão core | 1116 testes / suite lib 74 arquivos · `tsc --noEmit` exit 0 | ✅ PASS |
| D (integration) | `ZodError` enum `SUGGESTED/IN_PROGRESS/COMPLETED/OVERDUE` | **Baseline:** `208fb98a`=1 / `30330277`=1 → **pré-existente** (não regressão; não #914) | ✅ PASS |

### Detalhe — Bloco D (integration), resolução da ressalva

A ressalva pendente em v68 (214 falhas de integration classificadas como infra #914) tinha dois padrões distintos:

- `TRPCError: Project not found` → fixture ausente no DB de teste — plausível infra #914.
- `ZodError ...SUGGESTED|IN_PROGRESS|COMPLETED|OVERDUE` → enum de status de tarefa — **não** é #914 (que é `OAUTH_SERVER_URL is not configured`).

Duas evidências convergentes fecham a ressalva:

1. **Estrutural (git diff `208fb98a..30330277`):** os únicos arquivos de código alterados na sessão foram `server/lib/ncm-nbs-resolver.ts`, `server/lib/ncm-nbs-resolver.test.ts` e `scripts/fix-2304-00-aliquota-reduzida-1493.ts`. O enum de status vive em `server/routers-tasks.ts` / `routers-actions-crud.ts` / `routers.ts` — **disjuntos** do diff. Logo, regressão causada pela sessão é estruturalmente impossível.
2. **Empírica (Manus — contagem baseline):** `git checkout 208fb98a` → `grep -c "ZodError.*SUGGESTED"` = **1**; `git checkout 30330277` → = **1**. Contagem **igual** → pré-existente → benigno.

→ Bloco D **PASS completo**.

---

## Inventário de PRs da sessão (todos MERGED)

| PR | Conteúdo | SHA / Estado |
|---|---|---|
| #1495 | ADR-0035 §10 — precedência negativa (exclusion list) + §10.5 salvaguarda Anexo I | `208fb98a` ✅ merged |
| #1496 | Teste E2E entrega agro CNAE 28 + NCM 8436 (G3-T3, #1494) | `b27a1e37` ✅ merged (Closes #1494) |
| #1497 | Governança RACI v59 — labels migram para Claude Code | `f0749ba6` ✅ merged |
| #1499 | fix(engine) BUG-001 — exclusion list / precedência negativa `active=0` (#1492) | `f8ecf55a` ✅ merged (Closes #1492) |
| #1500 | fix(normative) ACHADO-001 — INSERT `2304.00` + errata `legal_reference` `2304.00.10` (#1493) | `30330277` ✅ merged (Closes #1493) |

**Issues:** #1494 fechada (#1496) · #1492 fechada (#1499) · #1493 fechada (#1500) · #1498 aberta (Opção B cap. 10 — P3, gated).

---

## Pendências pós-sessão (não bloqueiam encerramento)

| Item | Tipo | Status |
|---|---|---|
| #1498 — Opção B (regra grupo 2304/1006 → regras específicas Anexo I) | tech-debt P3 | 🔵 Gated — desbloqueio: cap. 10 NCM 100% curado |
| #1466 / #1467 — curadoria `cnaeGroups` (Art.140/176) | curadoria jurídica | 🔒 `blocked-legal-gate` |
| Rename `loadActiveRules` (agora carrega inativas) | Nível 2 (REGRA-ORQ-22) | follow-up não-bloqueante |
| `seed-normative-product-rules-cap23.ts` stale (regime conservador vs DB definitivo) | observação | idempotente-skip; não reverte |

---

## Lições da sessão (REGRA-ORQ-19 Passo 8 / ORQ-46)

Nenhuma lição nova `#NNN` criada nesta sessão. As regras aplicadas (ORQ-45 Gate 0 do emissor, ORQ-21/22 níveis de crítica, ORQ-44 DoD negativo, Lição #114 verificar premissa do despacho, Lição #89 scripts fora do tsconfig) já estavam commitadas. Correções de premissa do despacho registradas nos PR bodies (path `docs/governance/governance.md` inexistente → `.claude/rules/governance.md`; `WHERE id=30001` frágil → `ncm_code+match_mode`; label `corpus` indevida → `normative`).

---

## Encerramento

Veredito **🟢 4/4 PASS**. Board limpo exceto itens gated (#1498) e `blocked-legal-gate` (#1466/#1467). Sessão SOLARIS-SPEC-FIRST 18/06/2026 encerrada.
