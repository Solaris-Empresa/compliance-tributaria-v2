# Prompt para Manus — Auditoria de sincronia v7.42 (Sprint Z-22 UAT Wave FINAL)

**Objetivo:** confirmar que TODOS os 39 PRs da sessão 2026-04-20 (#744 → #792) estão **efetivamente** em produção em `iasolaris.manus.space`, sem bifurcação entre GitHub, S3 Manus e o checkpoint publicado.

**Leitura obrigatória antes:** R-SYNC-01 + R-SYNC-02 (refspec explícito em fetches).

---

## PASSO 0 — Sincronia defensiva

```bash
git fetch solaris refs/heads/main:refs/remotes/solaris/main
git fetch github refs/heads/main:refs/remotes/github/main 2>/dev/null || true
git status
```

**Reporte:**
- HEAD atual da branch local
- Divergências entre local/solaris/main/github/main
- Arquivos modified/untracked (deveria estar LIMPO)

Se houver divergência ou working tree sujo: **PARAR** e reportar ANTES de continuar auditoria.

---

## PASSO 1 — Três verdades alinhadas

Preencher tabela abaixo com valores REAIS:

| Camada | HEAD esperado | HEAD real |
|---|---|---|
| GitHub `solaris/main` | `ab88497` (PR #792 merge) | ? |
| S3 Manus (`origin/main` em webdev) | `ab88497` | ? |
| Checkpoint publicado (último `v7.XX` Online) | `ab88497` | ? |
| `iasolaris.manus.space` (HTML deployado) | `ab88497` | ? |

**Esperado:** todas as 4 camadas iguais a `ab88497`.
**Se divergente:** reportar qual camada está atrás e por quê.

---

## PASSO 2 — Inventário dos 39 PRs

Verificar que cada PR abaixo está presente no `git log` a partir de `ab88497`:

```bash
# Lista canônica (copiar e rodar)
for pr in 744 745 746 747 748 749 750 751 753 754 755 756 757 758 759 762 763 764 765 768 769 770 772 773 775 776 777 778 779 781 782 784 786 787 788 789 790 791 792; do
  found=$(git log ab88497 --oneline --grep "#$pr\b" | wc -l)
  if [ "$found" -eq 0 ]; then
    echo "❌ PR #$pr NÃO encontrado no log"
  else
    echo "✓ PR #$pr"
  fi
done
```

**Esperado:** 39 linhas `✓`. Zero `❌`.

---

## PASSO 3 — Greps obrigatórios (artefatos em produção)

Cada grep abaixo DEVE retornar ≥1 match no código deployado.

```bash
# Confidence determinístico (#773)
grep -c "calculateBriefingConfidence" server/lib/calculate-briefing-confidence.ts
grep -c "calculateBriefingConfidence" server/routers-fluxo-v3.ts

# NCM/NBS no prompt (#768 + #770 + #775)
grep -c "respostas_solaris_onda1" server/routers-fluxo-v3.ts
grep -c "respostas_q_produtos_ncm" server/routers-fluxo-v3.ts

# Parse operationProfile (#770)
grep -c "opProfileRaw" server/routers-fluxo-v3.ts

# Audit evidência fontes (#772)
grep -c "briefing_generated" server/routers-fluxo-v3.ts
grep -c "solaris_onda1" server/routers-fluxo-v3.ts

# WhatsApp resumo 6 áreas (#776)
grep -c "classifyItemByArea" client/src/lib/briefing-areas.ts
grep -c "ShareBriefingModal" client/src/components/ShareBriefingModal.tsx

# Trilha de Auditoria (#777)
grep -c "getProjectTimeline" server/routers-audit.ts
grep -c "ProjectHistoryTimeline" client/src/pages/ProjectHistoryTimeline.tsx
grep -c "btn-trilha-auditoria" client/src/pages/ProjetoDetalhesV2.tsx

# Hotfix projectName (#778)
grep -c 'project?.name || "Briefing de Compliance"' client/src/pages/BriefingV3.tsx

# Complement RAG+prompt (#779 + #786)
grep -c "FATOS ADICIONAIS" server/routers-fluxo-v3.ts
grep -cE 'correctionContext.{0,3}complementContext' server/routers-fluxo-v3.ts

# Gate >=85% + ressalva (#781)
grep -c "approveBriefingWithReservation" server/routers-fluxo-v3.ts
grep -c "CONFIDENCE_BELOW_THRESHOLD" server/routers-fluxo-v3.ts
grep -c "ApproveReservationModal" client/src/components/ApproveReservationModal.tsx

# Histórico versão expand (#782)
grep -c "btn-toggle-reason-" client/src/pages/BriefingV3.tsx

# Exportar Riscos CSV (#784)
grep -c "btn-export-riscos-csv" client/src/components/RiskDashboardV4.tsx
grep -c "handleExportRisksCsv" client/src/components/RiskDashboardV4.tsx

# Lifecycle inconsistências (#787)
grep -c "dismissed_inconsistencias" server/routers-fluxo-v3.ts

# generationCount regress (#788)
grep -c "draftCount" client/src/pages/BriefingV3.tsx

# Regras fixas artigos (#789)
grep -c "REGRA DE ARTIGOS CRÍTICOS" server/routers-fluxo-v3.ts

# Consolidar gaps (#790)
grep -c "consolidateGapsByArticle" server/lib/consolidate-gaps.ts
grep -c "consolidateGapsByArticle" server/routers-fluxo-v3.ts

# Detector geo (#791)
grep -c "detectExportSignal" server/lib/detect-export-signal.ts
grep -c "detectExportSignal" server/routers-fluxo-v3.ts

# Hotfix useMemo (#792)
grep -c "useMemo" client/src/pages/BriefingV3.tsx
head -3 client/src/pages/BriefingV3.tsx | grep -c "useMemo"
```

**Reporte:** cada grep que retornar `0` onde se espera ≥1.

---

## PASSO 4 — Runtime sanity checks

```bash
pnpm check 2>&1 | tail -3              # tsc sem erro
curl -s -o /dev/null -w "%{http_code}" https://iasolaris.manus.space  # esperado 200
```

---

## PASSO 5 — Unit tests dos novos módulos

```bash
pnpm vitest run \
  server/lib/calculate-briefing-confidence.test.ts \
  server/lib/consolidate-gaps.test.ts \
  server/lib/detect-export-signal.test.ts \
  client/src/lib/briefing-areas.test.ts
```

**Esperado:** 54 testes PASS (10 confidence + 11 consolidate-gaps + 20 detect-export + 13 briefing-areas).

---

## PASSO 6 — Smoke test funcional em produção

Acessar `iasolaris.manus.space` e validar:

- [ ] Login OK
- [ ] `/projetos` carrega com paginação (#762)
- [ ] Criar projeto novo funciona
- [ ] Questionários (SOLARIS/IA Gen/Produtos/Serviços/CNAE) exibem botões Sim/Não/N.A. (#758, #759, #764)
- [ ] `/briefing-v3` carrega SEM crash (#778, #792)
- [ ] ConfidenceBar no topo do briefing (#765)
- [ ] Botão "Compartilhar Resumo" abre modal 6 tabs (#776)
- [ ] Botão "Trilha de Auditoria" leva a `/historico` (#777)
- [ ] Matriz v4 tem "Exportar Riscos" CSV (#784)

---

## PASSO 7 — Relatório final

```markdown
# Auditoria v7.42 — relatório final

## Sincronia (Passo 1)
- GitHub / S3 / Checkpoint / iasolaris: [4 HEADs]
- ALINHADO: [sim/não]

## Inventário (Passo 2)
- PRs verificados: X/39 [+ lista dos faltantes]

## Greps (Passo 3)
- Falhas: [lista ou "nenhuma"]

## Runtime (Passo 4)
- tsc / HTTP prod: [status]

## Unit tests (Passo 5)
- PASS/FAIL: Y/Z

## Smoke UX (Passo 6)
- 9 checks: [✓ ou ❌ + screenshot]

## Veredito
[ ] 🟢 LIMPA — produção reflete GitHub
[ ] 🟡 PARCIAL — [delta]
[ ] 🔴 BIFURCAÇÃO — [como corrigir]
```

---

**Se 🟢:** Sprint Z-22 UAT Wave arquivada · próxima sessão ataca issue #796 (score 66%).
**Se 🟡/🔴:** issue urgente + pausar merges.

FIM.
