# AUDITORIA-FIM-DE-SESSAO — Template canônico (REGRA-ORQ-19)

> Este é o template para auditorias de fim de sessão. Cada execução
> produz um relatório arquivado em `docs/governance/audits/v7.XX-YYYY-MM-DD.md`
> com os valores REAIS preenchidos.
>
> **Leitura obrigatória antes:** R-SYNC-01 + R-SYNC-02.

---

## Atores

| Ator | Passos sob responsabilidade |
|---|---|
| **Claude Code** | 0 · 2 · 3 · 5 · docs atualizadas |
| **Manus** | 1 · 4 · 6 |
| **P.O.** | 7 (veredito consolidado) |

## Gatilhos

Execute este template quando qualquer condição for verdadeira:

- ≥3 PRs mergeados na sessão
- Sprint encerrada (Gate 7 PASS)
- UAT Wave encerrada
- Deploy de lote (múltiplos checkpoints em sequência)
- Divergência detectada entre GitHub e S3 Manus

---

## PASSO 0 — Sincronia Defensiva (Claude Code)

```bash
git fetch solaris refs/heads/main:refs/remotes/solaris/main
git status
```

| Item | Resultado |
|---|---|
| `git fetch` com refspec explícito | [OK/FAIL] |
| R-SYNC-02 | [OK/FAIL] |
| Working tree | [LIMPO/SUJO — descrever] |

**Se SUJO:** PARAR antes de continuar. Reportar arquivos modificados.

---

## PASSO 1 — 4 HEADs Alinhados (Manus)

| Artefato | HEAD esperado | HEAD real |
|---|---|---|
| GitHub `solaris/main` | `<sha-esperado>` | `<sha-real>` |
| S3 Manus (`origin/main` em webdev) | `<sha-esperado>` | `<sha-real>` |
| Checkpoint publicado (último v7.XX Online) | `<sha-esperado>` | `<sha-real>` |
| `iasolaris.manus.space` | `<sha-esperado>` | `<sha-real>` |

**Se divergente:** reportar qual camada está atrás e por quê.

---

## PASSO 2 — Inventário dos PRs esperados (Claude Code)

```bash
# Substituir a lista pela relevante da sessão
PRS="744 745 746 747 ..."
for pr in $PRS; do
  found=$(git log <HEAD> --oneline --grep "#$pr\b" | wc -l)
  [ "$found" -eq 0 ] && echo "❌ PR #$pr" || echo "✓ PR #$pr"
done
```

**Esperado:** N/N ✓. Zero faltantes.

---

## PASSO 3 — Greps de Artefatos (Claude Code)

Para cada PR novo/modificado, verificar que seu símbolo canônico existe em produção:

| PR | Símbolo | Arquivo | Esperado |
|---|---|---|---|
| #XXX | `functionName` | `server/lib/file.ts` | ≥N matches |
| ... | ... | ... | ... |

**Reporte:** cada grep com `0` onde esperava ≥1.

---

## PASSO 4 — Runtime Sanity (Manus)

| Verificação | Comando | Esperado | Resultado |
|---|---|---|---|
| TypeScript | `pnpm check 2>&1 \| tail -3` | 0 erros | ? |
| HTTP dev | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` | 200 | ? |
| HTTP prod | `curl -s -o /dev/null -w "%{http_code}" https://iasolaris.manus.space` | 200 | ? |

---

## PASSO 5 — Unit Tests (Claude Code)

```bash
pnpm vitest run <arquivos-dos-módulos-novos-ou-modificados>
```

```
✓ nome-test-1  (X tests)
✓ nome-test-2  (Y tests)
─────────────────────────
Test Files  N passed (N)
Tests       M passed (M)   ← M/M ✓
```

**Se FAIL:** listar teste + erro.

---

## PASSO 6 — Smoke UX 9 Fluxos (Manus)

Acessar `iasolaris.manus.space` como usuário real e validar:

| Fluxo | URL | Resultado |
|---|---|---|
| 1. Login | `/` | ? |
| 2. Lista projetos | `/projetos` | ? |
| 3. Criar projeto | `/projetos/novo` | ? |
| 4. Questionários Sim/Não/N.A. | fluxo QCorp/QOp/QCNAE | ? |
| 5. Briefing sem crash | `/projetos/:id/briefing-v3` | ? |
| 6. ConfidenceBar | Briefing | ? |
| 7. Compartilhar Resumo (6 tabs) | Modal `btn-compartilhar-resumo` | ? |
| 8. Trilha de Auditoria | `/projetos/:id/historico` | ? |
| 9. Exportar Riscos CSV | Matriz v4 `btn-export-riscos-csv` | ? |

**Reporte:** ✅ ou ❌ + screenshot se falhar.

---

## PASSO 7 — Veredito Final (P.O.)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  VEREDITO: [🟢 APROVADO | 🟡 PARCIAL | 🔴 BIFURCAÇÃO]                       │
│  Checkpoint: vX.XX (<version-id>) | HEAD: <sha> | Data: YYYY-MM-DD           │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Resumo Executivo

```
[🟢/🟡/🔴] <status textual>

HEAD:          <sha>
PRs auditados: X/N
Greps:         Y/Z ✓
TypeScript:    <0 erros / N erros>
Tests:         M/N ✓
HTTP prod:     200 / <outros>
Smoke UX:      K/9 fluxos ✓

BUGS ABERTOS:  <lista ou "nenhum">
BLOQUEADORES:  <lista ou "nenhum">
```

### Decisão

- **🟢 APROVADO** → sessão encerra · próxima sprint liberada · arquivar relatório em `audits/`
- **🟡 PARCIAL** → fix específico antes de encerrar · reexecutar Passos 3/4/5/6 após correção
- **🔴 BIFURCAÇÃO** → issue de governança urgente · pausar todos os merges · não abrir nova sprint até 🟢

### Próximos passos

- Próxima sessão/sprint ataca: <issue ou tarefa prioritária>
- Backlog residual: <lista de issues não resolvidas>

---

**Auditoria executada por:** Manus (Passos 1, 4, 6) + Claude Code (Passos 0, 2, 3, 5)
**Veredito consolidado por:** P.O.
**Data:** YYYY-MM-DD
