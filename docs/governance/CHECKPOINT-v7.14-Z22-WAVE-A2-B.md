# CHECKPOINT v7.14 — Sprint Z-22 Wave A.2+B

**Data:** 2026-04-20
**HEAD:** `94c5537` (github/main)
**PR:** #737 — `feat(z22): CPIE legado DROP completo — Wave A.2+B [Refs #725]`
**Estado:** ✅ ENCERRADA (admin-merge com 2 FAILURE pré-existentes de paridade com main)

---

## Resumo executivo

Sprint destinada a **remover integralmente o código legado CPIE** (v1, v2, CPIE-B, Scoring Engine) do repositório conforme ADR-0029 drop strategy. Operação destrutiva irreversível consolidada em single PR coerente para evitar estado inconsistente parcial. Invariante RAG (2515 chunks) **preservada** em todo o ciclo.

## Entregáveis

### Código (94c5537)

| Categoria | Quantidade |
|---|---|
| Arquivos deletados | 24 |
| Arquivos modificados | 14 |
| Fixes UAT incluídos | 4 (B-01, B-02a, B-02b, B-03) |
| Exceções autorizadas (ADR-0029) | 3 (EX-1, EX-2, EX-3) |

**Backend (21 deletes):**
`cpie.ts` · `cpie-v2.ts` · `cpie-v2-evidence.ts` · `cpie-v2-evidence-fase2.ts` · `cpieRouter.ts` · `cpieV2Router.ts` · `scoringEngine.ts` · `monthlyReportJob.ts` · `calibration-test.ts` · `determinism-test.ts` · `pre-homologacao.ts` · `cpie.test.ts` · `cpie-v2.test.ts` · `cpieV2Router.test.ts` · `sprint-s-lotes-be.test.ts` · `routers-scoring-engine.test.ts` · `e2e-flow.test.ts` · `cpie_stress_runner.ts`

**Frontend (5 deletes + 8 modifies):**
Deletes: `CpieScoreBadge.tsx` · `CpieBatchPanel.tsx` · `CpieHistoryPanel.tsx` · `CpieSettingsPanel.tsx` · `AdminCpieDashboard.tsx` · `CpieReportExport.tsx`
Modifies: `App.tsx` · `NovoProjeto.tsx` (-488 linhas) · `PerfilEmpresaIntelligente.tsx` · `ProjetoDetalhesV2.tsx` · `DiagnosticoStepper.tsx` · `Painel.tsx` · `AdminConsistencia.tsx` · `compliance-v3/ComplianceDashboardV3.tsx` · `compliance-v3/ScoreView.tsx`

### Migration 0088 (aplicada dev, pendente produção)

```sql
DROP TABLE IF EXISTS cpie_analysis_history;
DROP TABLE IF EXISTS cpie_settings;
DROP TABLE IF EXISTS cpie_score_history;   -- não existia no dev, skipped
ALTER TABLE projects DROP COLUMN IF EXISTS profileCompleteness;
ALTER TABLE projects DROP COLUMN IF EXISTS profileConfidence;
ALTER TABLE projects DROP COLUMN IF EXISTS profileLastAnalyzedAt;
ALTER TABLE projects DROP COLUMN IF EXISTS profileIntelligenceData;
-- Invariante: COUNT(*) FROM ragDocuments = 2515 pré e pós
```

**Status ambientes:**
- Dev Manus: ✅ aplicada, RAG 2515 → 2515 confirmado
- Produção: ❌ pendente (janela de manutenção)

### Governança

- **SPEC-CPIE-V3-DASHBOARD-COMPLIANCE v1.1** aprovada (hash `c8914f16...`)
- **ADR-0029** drop strategy aprovada (hash `e63168b2...`)
- **Errata F6.1** aplicada (NovoProjeto escopo ativo)

## Fixes UAT pré-merge

| Bug | Resolução |
|---|---|
| B-01 | `SectionLink` "Compliance Engine v3 ✨" duplicado removido de `ProjetoDetalhesV2.tsx:637` |
| B-02a | Título dashboard legado renomeado para "Exposição ao Risco de Compliance (legado v3)" |
| B-02b | Rota `/compliance-v3/*` (9 rotas) removida de `App.tsx` · dashboard v3 lia `project_risks_v3` vazia pós hot swap ADR-0022 |
| B-03 | `statusMap` em `DiagnosticoStepper.tsx` expandido com `ALL_COMPLETED` para 6 status pós-aprovação |
| B-04 | Não reproduzível no código (`available={true}` literal) — tracking em #740 para re-validação UAT |

## Incidente operacional pós-merge

**Bug crítico `/projetos/:id` 404:** dessincronia entre código pós-merge (schema.ts sem colunas profile*) e DB do dev Manus (colunas ainda presentes). Drizzle gerava SELECT com conflito → `getProjectById` retornava `undefined` → tRPC `NOT_FOUND`.

**Resolução (operação):**
1. Backup DB 102MB preservado em `/home/ubuntu/backups/pr737/backup-v2-20260419-205933.sql`
2. Tentativa inicial de backup falhou (7.8KB, `--single-transaction` incompatível com TiDB)
3. Ajuste de flags mysqldump → backup válido
4. Migration 0088 ajustada (skipped SELECT de tabela inexistente) + aplicada
5. Invariante RAG validado: 2515 → 2515 ✅
6. Dev server sincronizado com main + restart → HTTP 200
7. P.O. confirmou UAT destravada

## Issues pós-merge abertas

| # | Título | Prioridade |
|---|---|---|
| #739 | Débito B-03: statusMap considerar currentStep | 🟢 Baixa |
| #740 | UAT pós-merge B-04: validar botão Exposição em projeto novo | 🟡 Média |
| #741 | Badge "Exposição ao Risco" ausente nos cards (regressão Z-22) | 🟡 Média |
| #742 | Filtro "Score IA" em Projetos.tsx órfão pós-drop | 🟡 Média |
| #743 | Definir escopo "página completa sobre exposição" (carry-over) | 🟡 Média |

## Lições aprendidas

### Lição Z-22 (processo)

**Drop destrutivo em sprint ativa ≠ comentar código legado.**

Custo real vs estimado (proporção ~10×):

| Fase | Estimado | Real |
|---|---|---|
| Código | 2h | 4h (Errata F6.1 + UAT bugs) |
| Review | 30min | 2h (triple review + push-backs) |
| CI | 15min | 1.5h (body template + label + admin merge) |
| Backup | 10min | 1h+ (7.8KB fail → 102MB) |
| Migration | 5min | 1h (ajuste cpie_score_history) |
| Bloqueio UAT | 0 | 2h+ (/projetos/:id 404) |

**Regra proposta:** código legado que não impede evolução e não polui runtime → comentar imediatamente, drop destrutivo em janela dedicada pós-sprint, não atomizado com a feature que o tornou legado.

### Lição governança

- Governança (ADR-0029, invariante RAG, gates SQL) **funcionou** — prevenção real de perda de dados
- Preço: 7+ pontos de pausa do fluxo em vários momentos
- Trade-off explícito: segurança vs velocidade em drops irreversíveis

## Pós-merge pendente (não-bloqueante)

1. 🔴 **Manus aplica migration 0088 em produção** (blocker para deploy prod) — janela de manutenção
2. 🟡 **Manus consolida checkpoint v7.14** em S3 (este documento é a versão Claude)
3. 🟡 **P.O. re-valida B-03 e B-04** em projeto novo do dev pós-migration
4. 🟢 **Orquestrador cria issue de governança** "commentar antes de dropar" (Regra ORQ-19 proposta)
5. 🟢 **Sprint Z-23 planning** — incorporar issues #741/#742/#743 ou deferir

## Referências

- PR #737: https://github.com/Solaris-Empresa/compliance-tributaria-v2/pull/737
- Merge commit: `94c55376a5d46e3638905cb2e790e596acabe547`
- Merged at: 2026-04-20 00:28:47 UTC
- ADR-0029: `docs/adr/ADR-0029-cpie-v3-drop-estrategia-excecoes.md`
- SPEC v1.1: `docs/specs/SPEC-CPIE-V3-DASHBOARD-COMPLIANCE-v1.1.md`
- Backup: `/home/ubuntu/backups/pr737/backup-v2-20260419-205933.sql` (102MB, dev Manus)

---

*Checkpoint emitido pelo Orquestrador · 2026-04-20 · baseline v7.14*
