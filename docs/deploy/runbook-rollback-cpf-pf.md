# Runbook — Rollback BUG-AGRO-CPF (CPF Pessoa Física)

**Versão:** 1.0 | **Data:** 29/05/2026 | **Issue:** #1290
**Tag de baseline:** `pre-cpf-pf-baseline` (bb8a0e1b)
**Snapshot DB:** `backup-pre-cpf-pf-20260529.sql.gz` (S3)
**Feature flag:** `ENABLE_TAX_ID_DUAL` (default `false` em F0)

> Este runbook é parte da F0 do BUG-AGRO-CPF (issue #1290). Aplica-se a qualquer fase F0-F5 da implementação.
> Referência completa: `docs/governance/relatorios/AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v4-20260529.md` §7.

---

## Níveis de rollback

### N1 — Feature flag OFF (<5 min) — PREFERENCIAL

```bash
# .env de produção — alterar e reiniciar o servidor
ENABLE_TAX_ID_DUAL=false
```

**Efeito:** UI volta a exibir apenas CNPJ. Dados PF existentes preservados no banco.
**Quando usar:** bug de UX detectado em F2 sem impacto em dados.
**Tempo total:** <5 min (inclui reload do servidor).
**Reversível:** sim — basta re-ativar `ENABLE_TAX_ID_DUAL=true`.

### N2 — Revert PR individual (15-30 min)

```bash
# Identificar o SHA do PR da fase com bug
git log --oneline | grep "feat(agro/fX)"

# Reverter o PR específico (squash merge tem SHA único)
git revert <SHA-do-PR-da-fase> --no-commit
git commit -m "revert: rollback fase Fx BUG-AGRO-CPF (#1290)"

# Abrir PR de revert
gh pr create --title "revert(agro/fX): rollback fase Fx — issue #1290" \
             --base main --head revert-fX
```

**Quando usar:** bug em fase específica sem afetar outras fases.
**Tempo total:** 15-30 min + CI verde.
**Pré-requisito:** identificar visualmente que outras fases estão íntegras.

### N3 — Revert F1-F5 mantendo F0 (30-60 min)

Manter migration 0119 (`tax_id_type` DEFAULT `'cnpj'` — não-destrutivo).
Reverter código F1-F5 via `git revert` encadeado.

```bash
# Em ordem REVERSA (F5 → F4 → F3 → F2 → F1)
for sha in <F5-SHA> <F4-SHA> <F3-SHA> <F2-SHA> <F1-SHA>; do
  git revert $sha --no-commit
done
git commit -m "revert: rollback F1-F5 mantendo F0 — issue #1290"
gh pr create ...
```

**Quando usar:** bug sistêmico no código mas sem corrupção de dados.
**Tempo total:** 30-60 min + CI.
**Efeito:** schema mantém `tax_id_type` (zero leitores ativos); código volta ao AS-IS.

### N4 — DROP COLUMN migration reversa (1-2h)

```sql
-- ATENÇÃO: irreversível se houver projetos PF com tax_id_type='cpf'
-- Executar verificação ANTES:
SELECT COUNT(*) FROM projects WHERE tax_id_type = 'cpf';
-- Se 0: prosseguir com DROP
-- Se > 0: P.O. + Manus obrigatoriamente avisados antes do DROP
```

```sql
-- DROP definitivo:
ALTER TABLE projects DROP COLUMN tax_id_type;
```

**Quando usar:** necessidade de reverter completamente o schema.
**Tempo total:** 1-2h (depende do volume de projetos PF criados durante a janela).
**ATENÇÃO:** projetos PF criados são **perdidos** (precisam ser recriados).

### N5 — Restore snapshot DB (4-8h · catastrófico)

```bash
# 1. Restore do backup S3
aws s3 cp s3://<bucket>/backup-pre-cpf-pf-20260529.sql.gz .
gunzip backup-pre-cpf-pf-20260529.sql.gz

# 2. Switch DB para ambiente paralelo (não tocar prod direto)
mysql <connection-staging> < backup-pre-cpf-pf-20260529.sql

# 3. Validar restore
mysql <connection-staging> -e "SELECT COUNT(*) FROM projects;"
# Esperado: mesmo COUNT do snapshot original

# 4. Switch tráfego de prod para staging restaurado
# (operacional Manus — depende do load balancer)

# 5. Sync git HEAD
git fetch origin
git reset --hard pre-cpf-pf-baseline  # tag git imutável

# 6. Downgrade archetypeVersion (ADR-0032 v1.1 → v1.0)
mysql <connection> -e "UPDATE projects SET archetypeVersion = 'v1.0';"
```

**Quando usar:** corrupção de dados confirmada · drift de hash em massa · falha estrutural irrecuperável.
**Tempo total:** 4-8h (depende de tamanho do DB + sync de tráfego).
**Quem aciona:** P.O. + Manus + Dr. Swami obrigatoriamente avisados.
**EFEITO:** projetos criados durante a janela da feature são **PERDIDOS** (precisa redoar).

---

## Smoke pós-rollback (obrigatório para N3, N4, N5)

```sql
-- 1. Verificar que nenhum projeto PF existe após N4/N5
SELECT COUNT(*) FROM projects WHERE tax_id_type = 'cpf';
-- ESPERADO: 0

-- 2. Verificar que projetos PJ continuam íntegros
SELECT COUNT(*) FROM projects
WHERE JSON_EXTRACT(companyProfile, '$.cnpj') IS NOT NULL;
-- ESPERADO: mesmo valor de antes do rollback

-- 3. Verificar que CNPJ válido cria projeto (greenfield)
-- (executar via UI: criar projeto PJ + briefing + matriz · sem erros)

-- 4. Verificar que perfilHash não crasha
-- (executar via test runner local: pnpm vitest run server/lib/archetype/perfilHash.test.ts)
```

**Critério de sucesso do rollback:** 4/4 smokes ✅ · sem erros no log de produção.

---

## Tabela rápida de decisão

| Sintoma observado | Nível recomendado | Tempo |
|---|---|---|
| Bug visual / falso positivo de validação CPF | **N1** (flag OFF) | <5 min |
| Bug em UMA fase específica (ex: F4 PDF gerando filename errado) | **N2** (revert PR) | 15-30 min |
| Bug runtime crítico (perfilHash crashando em produção) | **N3** (revert F1-F5) | 30-60 min |
| Decisão estratégica de remover totalmente a feature | **N4** (DROP COLUMN) | 1-2h |
| Corrupção de dados / drift hash em massa | **N5** (restore) | 4-8h |

---

## Anti-padrões (não fazer)

❌ **Tentar rollback parcial sem snapshot pré-F0 disponível** — P1 (Manus arquiva em S3) é gate hard.
❌ **Reverter F0 com F3 ainda merged** — `perfilHash.ts` quebra com `taxIdType undefined`; ordem N3 → N4 obrigatória.
❌ **Mudar feature flag em produção sem reload do servidor** — flag exige reload (não é hot-reload).
❌ **Esquecer downgrade `archetypeVersion` no N5** — perfil_hash de registros antigos não bate mais; gera drift silencioso.
❌ **Acionar N4 ou N5 sem aviso ao P.O.** — impacto jurídico em projetos PF criados.

---

## Contatos

- **P.O.:** Uires Tapajós
- **Snapshot S3:** `s3://<bucket>/backup-pre-cpf-pf-20260529.sql.gz` (Manus tem acesso)
- **Tag git:** https://github.com/Solaris-Empresa/compliance-tributaria-v2/releases/tag/pre-cpf-pf-baseline
- **Spec principal:** `docs/governance/relatorios/AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v4-20260529.md`
- **DB-SPEC:** `docs/governance/relatorios/DB-SPEC-BUG-AGRO-CPF.md`
- **Checklist aceite:** `docs/governance/relatorios/CHECKLIST-ACEITE-BUG-AGRO-CPF.md`

---

## Histórico de execuções de rollback

| Data | Nível | Causa | Resultado | Quem acionou |
|---|---|---|---|---|
| _(vazio — nenhum rollback executado ainda)_ | — | — | — | — |

---

**Vinculadas:**
- REGRA-ORQ-34 (Pipeline de Dados Bugfix Protocol)
- REGRA-ORQ-41 (AS-IS/TO-BE com impact-tree)
- Issue #1290 (raiz BUG-AGRO-CPF)
- 5 PRs F0-F5 da feature
