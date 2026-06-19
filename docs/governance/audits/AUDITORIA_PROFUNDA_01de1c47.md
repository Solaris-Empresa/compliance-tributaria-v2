# Auditoria Profunda — HEAD `01de1c47` (F6 merged)

**Data:** 19/06/2026 11:07 UTC  
**Auditor:** Manus  
**Escopo:** Produção `iasolaris.manus.space` pós-merge #1524 (F6 CSV backward-compat)

---

## Gate 0 — 4 HEADs Alinhados

| Artefato | HEAD | Verificação |
|----------|------|-------------|
| GitHub `origin/main` | `01de1c47` | `git log origin/main --oneline -1` |
| S3 Manus (webdev) | `01de1c47` | `git log --oneline -1` (local) |
| Checkpoint publicado | `01de1c47` | webdev_save_checkpoint result |
| HTTP produção | 200 OK | `curl -s -w "%{http_code}" https://iasolaris.manus.space` |

**PRs abertos:** 0  
**TypeScript:** `tsc --noEmit` exit 0, zero erros

---

## Gate 1 — Database Integrity

| Verificação | Resultado | Query |
|-------------|-----------|-------|
| `solaris_questions.tax_regimes` existe | ✅ | INFORMATION_SCHEMA.COLUMNS |
| `projects.tax_regimes` NÃO existe | ✅ (0 rows) | INFORMATION_SCHEMA.COLUMNS |
| 18 perguntas ativas, todas `tax_regimes = NULL` | ✅ | `WHERE ativo=1 AND tax_regimes IS NOT NULL` → 0 rows |
| DoD negativo: "Todos" = NULL | ✅ CONFIRMADO | Nenhuma pergunta tem valor não-nulo |

---

## Gate 2 — Smoke E2E Produção (9 Fluxos)

| # | Fluxo | URL | Status | Evidência |
|---|-------|-----|--------|-----------|
| 1 | Home/Painel | `/` | ✅ | 714 projetos sidebar, dashboard carregado |
| 2 | Criar Projeto | `/projetos/novo` | ✅ | Formulário 5 etapas renderizado |
| 3 | Questionário SOLARIS | `/projetos/8760001/questionario-solaris` | ✅ | 14 perguntas Onda 1, radio buttons, navegação |
| 4 | Briefing v3 | `/projetos/8760001/briefing-v3` | ✅ | 35% confiança, 5 gaps, RAG ✓, toolbar completa |
| 5 | Risk Dashboard v4 | `/projetos/8760001/risk-dashboard-v4` | ✅ | 4 riscos (3 Alta, 1 Média), RAG ✓, Exportar Riscos btn |
| 6 | Admin Perguntas SOLARIS | `/admin/solaris-questions` | ✅ | 18 perguntas, coluna "Regimes" = "Todos", CRUD funcional |
| 7 | Perfil da Entidade | `/projetos/8760001/perfil-entidade` | ✅ | Confiança 100/100, Confirmado, V-10-FALLBACK informativo |
| 8 | Trilha de Auditoria | `/projetos/8760001/historico` | ✅ | 5 eventos, filtros por tipo/período, Exportar CSV |
| 9 | Shadow Monitor | `/admin/shadow-monitor` | ✅ | 37 divergências totais, **0 críticas**, 17 projetos afetados |

---

## Gate 3 — Validação F5 Admin tax_regimes (T1/T4)

| Teste | Resultado | Evidência |
|-------|-----------|-----------|
| T1 — Coluna "Regimes" visível na listagem | ✅ | Screenshot: coluna entre "Vigência" e "Código do Risco" |
| T4 — Badges "Todos" em todas as 18 perguntas | ✅ | Todas exibem "Todos" (= NULL = universal) |
| Nova Pergunta btn presente | ✅ | Botão "+ Nova Pergunta" no header da tabela |
| Editar/Excluir por linha | ✅ | Ícones ✏️/🗑️ em cada row |

---

## Gate 4 — Validação F6 CSV backward-compat (T3/T5)

| Teste | Resultado | Evidência |
|-------|-----------|-----------|
| T3 — Tab "Upload CSV" presente | ✅ | Tab visível no admin (Lista / Upload CSV / Histórico de Lotes) |
| T5 — Regressão: perguntas existentes (NULL) continuam universais | ✅ | SQL: 0 rows com tax_regimes IS NOT NULL |
| DoD negativo SQL | ✅ | `SELECT tax_regimes FROM solaris_questions WHERE tax_regimes IS NOT NULL` → **0 rows** |

---

## Gate 5 — Environment & Runtime

| Env | Valor | Verificação |
|-----|-------|-------------|
| ENABLE_UNIFIED_ELIGIBILITY | `true` | process.env check |
| DIAGNOSTIC_READ_MODE | `shadow` | Shadow Monitor badge na UI |
| CORPUS_VERSION | `v3.3` | — |

---

## Tracing — Risk Dashboard v4 (Projeto 8760001)

```
Engine: determinístico · 10 categorias LC 214/2025
Perfil: industria + lucro_real + multi-estado + NCM 8436

Categorias geradas (4):
  1. split_payment::op:industria::geo:multi → Alta → Art. 31 LC 214/2025
  2. confissao_automatica::op:industria::geo:multi → Alta → Art. 45 LC 214/2025
  3. inscricao_cadastral::op:industria::geo:multi → Alta → Art. 59 LC 214/2025
  4. obrigacao_acessoria::op:industria::geo:multi → Média → Art. 60 LC 214/2025

Categorias AUSENTES (correto — A-2/A-3 #1507 validado):
  - transicao_iss_ibs (serviço-only → indústria não aplica)
  - regime_diferenciado (agro-only → indústria genérica não aplica)
  - imposto_seletivo (IS gate NCM/CNAE → 8436 não mapeado)
```

---

## Tracing — Shadow Monitor

```
Total divergências: 37 (acumulado desde 02/05/2026)
Divergências críticas: 0
Padrão: "briefingContent: legada tem valor, nova é null"
  → Comportamento esperado do DIAGNOSTIC_READ_MODE=shadow
  → Leitura nova retorna null quando briefing não foi regenerado no novo engine
  → Não é regressão — é o shadow mode funcionando como projetado
```

---

## Tracing — Perfil da Entidade (Projeto 8760001)

```
Confiança: 100/100 (Confirmado)
  - Completude (40%): 100%
  - Inferência validada (30%): 100%
  - Coerência (30%): 100%

Dimensões:
  - Objeto: bens_mercadoria_geral [Fallback - baixa confiança]
  - Papel: fabricante [Usuário preenchido]
  - Relação: producao [Usuário preenchido]
  - Território: interestadual, nacional [CNAE inferido]
  - Regime: lucro_real [Usuário preenchido]

CNAEs: 2831-3/00, 2833-0/00, 4661-3/00, 3314-7/11, 3314-7/12
NCMs: 8436

Pendências: V-10-FALLBACK (informativo, não bloqueia gate)
Hash snapshot: cda80860…4929516bb51f737a041eda96385a71debdbbf5c8d1ad2544ff8d18096e86e272
```

---

## VEREDITO FINAL

| Dimensão | Status |
|----------|--------|
| 4 HEADs alinhados | ✅ `01de1c47` |
| TypeScript | ✅ 0 erros |
| DB integrity | ✅ schema correto |
| DoD negativo (NULL = universal) | ✅ confirmado |
| 9 fluxos E2E | ✅ 9/9 PASS |
| Zero divergências críticas | ✅ 0 critical |
| Zero PRs abertos | ✅ 0 open |
| F5 Admin UI | ✅ funcional |
| F6 CSV tab | ✅ presente |

**PRODUÇÃO OPERACIONAL E LIMPA EM `01de1c47` ✅**

---

## Screenshots (Evidência Visual)

1. `/home/ubuntu/screenshots/iasolaris_manus_spac_2026-06-19_11-04-03_5217.webp` — Criar Projeto
2. `/home/ubuntu/screenshots/iasolaris_manus_spac_2026-06-19_11-04-13_1284.webp` — Questionário SOLARIS
3. `/home/ubuntu/screenshots/iasolaris_manus_spac_2026-06-19_11-04-25_1328.webp` — Briefing v3
4. `/home/ubuntu/screenshots/iasolaris_manus_spac_2026-06-19_11-05-19_5463.webp` — Risk Dashboard v4
5. `/home/ubuntu/screenshots/iasolaris_manus_spac_2026-06-19_11-05-35_9776.webp` — Admin Perguntas SOLARIS
6. `/home/ubuntu/screenshots/iasolaris_manus_spac_2026-06-19_11-06-19_6947.webp` — Perfil da Entidade
7. `/home/ubuntu/screenshots/iasolaris_manus_spac_2026-06-19_11-07-00_2567.webp` — Trilha de Auditoria
8. `/home/ubuntu/screenshots/iasolaris_manus_spac_2026-06-19_11-07-14_7324.webp` — Shadow Monitor
