# Despacho Manus — Sincronizar checkpoint com GitHub (R-SYNC-01) · NÃO criar commit

> **Para:** Manus · **De:** Claude Code (auditoria e419fceb) · **Data:** 2026-06-29
> **Autorização P.O.:** sim (procedimento abaixo) · **Ref.:** REGRA-ORQ-25 · R-SYNC-01 · ADR-0037 · Lição #141

## Veredito da auditoria (determinístico)

| Fato | Verificação |
|---|---|
| `origin/main` = **`da952313`** | `git cat-file -t da952313` → **commit** (git real) |
| Fase 3a **presente** em `da952313` | `isConstrucaoCivilImoveis` em `normative-inference.ts` + `regime-imoveis-eligibility.ts`; 8 codigo no `Categoria` union (`risk-engine-v4.ts`) |
| `da952313` = merge do #1636, filho de `3d10b62b` | histórico GitHub **linear, sem fork** |
| **`e419fceb` / `df4dc954`** | `git cat-file -t` → **`Not a valid object name`** → checkpoints S3, **NÃO git** (REGRA-ORQ-25) |

**Conclusão:** GitHub é a fonte de verdade e está **íntegro e completo**. Os checkpoints são árvore paralela não-git. O código da Fase 3a **já existe** como `da952313`.

## 🔴 NÃO FAZER

**NÃO** criar um commit novo que "inclua os arquivos da Fase 3a". Isso recria mudanças que já são `da952313` → **commit divergente duplicado = bifurcação** (R-SYNC-01 / REGRA-ORQ-26 — anti-padrão da bifurcação Z-12 #473/#474). Proibido.

## ✅ PROCEDIMENTO CORRETO (R-SYNC-01)

No sandbox, **antes** de qualquer save:

```bash
git fetch origin
git reset --hard origin/main          # → da952313 (move o ponteiro, SEM commit novo)
git rev-parse HEAD                      # DEVE imprimir da952313c863235293cc99964d4fcffbd294f576
git grep -c "isConstrucaoCivilImoveis" -- server/lib/regime-imoveis-eligibility.ts   # DEVE ser 1
```

Só **depois** das 2 verificações acima baterem:

```bash
webdev_save_checkpoint
```

O `reset --hard` move a branch do sandbox para `da952313` (que já tem a Fase 3a). O checkpoint vira **filho de `da952313`**, não de `df4dc954`. Nenhum código recriado; nenhuma bifurcação.

## ⚠️ VERIFICAÇÃO DE DEPLOY (Lição #141 / ADR-0037) — obrigatória

O risco real não é o commit — é **qual artefato produção serve**. Após o checkpoint:

1. **Sentinela no artefato servido:** confirmar `isConstrucaoCivilImoveis` presente no bundle de produção (deploy-guard `scripts/deploy-guard.cjs`, PR #1536). Reportar `git=da952313 / checkpoint=<id>` (REGRA-ORQ-25 — nunca só o checkpoint).
2. **Prova funcional (smoke):** regenerar riscos na **CONSTRUTORA VII (greenfield)** e confirmar via SQL que os **8 riscos** aparecem em `risks_v4`:
   ```sql
   SELECT categoria, confidence FROM risks_v4
    WHERE project_id = <CONSTRUTORA_VII_greenfield>
      AND categoria IN ('risco_redutor_ajuste','risco_sinter_avaliacao','risco_cib_cadastro',
                        'risco_controle_empreendimento','risco_permuta_imoveis',
                        'risco_tributacao_parcelas','risco_sujeicao_passiva_scp','risco_custos_historicos');
   -- esperado: 8 linhas · universais confidence≈0.85 · condicionais≈0.55
   ```
   Esse smoke fecha o arco #1607 (recomendação #4 do parecer Dr. José).

## DoD do despacho

- [ ] `git rev-parse HEAD` no sandbox == `da952313...` antes do checkpoint
- [ ] checkpoint salvo como filho de `da952313` (não `df4dc954`)
- [ ] reporte `git=da952313 / checkpoint=<id>`
- [ ] sentinela `isConstrucaoCivilImoveis` no artefato servido
- [ ] smoke CONSTRUTORA VII → 8 riscos em `risks_v4`

**NÃO criar commit. NÃO mergear nada. Apenas reset → checkpoint → verificar deploy.**

FIM.
