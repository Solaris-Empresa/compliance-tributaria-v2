# Despacho Manus — Publicar a Fase 3a em produção (deploy a partir do GitHub) · v2

> **Para:** Manus · **De:** Claude Code (auditoria e419fceb + verificação de tooling) · **Data:** 2026-06-29
> **Autorização P.O.:** sim · **Ref.:** REGRA-ORQ-25 · R-SYNC-01/02 · ADR-0037 · Lição #141 · BUG-REGIME-FILTER-01 (#1536)
> **v2:** substitui o "reset + checkpoint" da v1 pelo **script canônico `deploy-from-github.sh`** (resposta do Manus mostrou que reset não basta).

---

## 1. Veredito da auditoria (determinístico — não reabrir)

| Fato | Verificação | Resultado |
|---|---|---|
| `origin/main` = **`da952313`** | `git cat-file -t da952313` | **commit** (git real) ✅ |
| Fase 3a presente em `da952313` | `git grep isConstrucaoCivilImoveis origin/main` | normative-inference + regime-imoveis-eligibility + union ✅ |
| `e419fceb` / `df4dc954` / `4e99ece8` | `git cat-file -t` | **`Not a valid object name`** → checkpoints S3, **NÃO git** (REGRA-ORQ-25) |
| Banco produção | migration 0128 | 8 categorias aplicadas ✅ |

**GitHub + banco estão corretos. O problema é só o ARTEFATO SERVIDO (deploy stale do checkpoint) — Lição #141.**

## 2. O que NÃO fazer (proibido)

- ❌ **NÃO** criar commit novo com "os arquivos da Fase 3a" → bifurcação (R-SYNC-01 / REGRA-ORQ-26; anti-padrão Z-12 #473/#474).
- ❌ **NÃO** re-digitar arquivos "de memória" → risco de drift byte-a-byte (Lição #93/#154).
- ❌ **NÃO** `git push` para `origin/main` (GitHub) — nada vai ao GitHub; `da952313` é a verdade.

## 3. CAMINHO 1 (canônico) — `deploy-from-github.sh` (#1536)

Este script **já existe** e foi feito para EXATAMENTE este problema (deploy tree do Manus puxando S3/checkpoint em vez do GitHub). Ele detecta o remote `github.com` (mesmo no sandbox onde `origin`=S3), faz fetch com refspec explícito (R-SYNC-02) e deixa o working tree em `da952313`.

```bash
# no sandbox Manus:
bash scripts/deploy-from-github.sh main

# verificações OBRIGATÓRIAS antes de publicar:
git rev-parse HEAD                                  # DEVE ser da952313c863235293cc99964d4fcffbd294f576
git grep -c isConstrucaoCivilImoveis -- server/lib/regime-imoveis-eligibility.ts   # DEVE ser 1
node scripts/deploy-guard.cjs || true               # guard do #1536 (build hash / sentinela)

# só então publicar o tree resultante (webdev_save_checkpoint / publish)
```

## 4. CAMINHO 2 (fallback, só se o Caminho 1 não puser os arquivos no working tree)

Extrair os 3 arquivos **do objeto git `da952313`** (byte-idêntico — NUNCA re-digitar):

```bash
git fetch origin
git checkout da952313 -- \
  server/lib/normative-inference.ts \
  server/lib/regime-imoveis-eligibility.ts \
  server/lib/risk-engine-v4.ts

# conferir idêntico ao GitHub:
git diff da952313 -- server/lib/normative-inference.ts server/lib/regime-imoveis-eligibility.ts server/lib/risk-engine-v4.ts   # DEVE ser vazio
git grep -c isConstrucaoCivilImoveis -- server/lib/regime-imoveis-eligibility.ts   # =1

# publicar o tree (sem commit no GitHub, sem push)
```

## 5. VERIFICAÇÃO DO ARTEFATO SERVIDO (Lição #141 / ADR-0037) — fecha o arco

Publicar não basta; **provar que produção serve o código novo**:

1. **Sentinela:** `isConstrucaoCivilImoveis` presente no bundle servido em produção.
2. **Smoke funcional (CONSTRUTORA VII greenfield):** regenerar riscos e consultar:
   ```sql
   SELECT categoria, confidence FROM risks_v4
    WHERE project_id = <CONSTRUTORA_VII_greenfield>
      AND categoria IN ('risco_redutor_ajuste','risco_sinter_avaliacao','risco_cib_cadastro',
                        'risco_controle_empreendimento','risco_permuta_imoveis',
                        'risco_tributacao_parcelas','risco_sujeicao_passiva_scp','risco_custos_historicos');
   -- esperado: 8 linhas · universais confidence≈0.85 · condicionais≈0.55
   ```
3. **Reportar:** `git=da952313 / checkpoint=<id>` (REGRA-ORQ-25 — nunca só o checkpoint).

## 6. Se NEM ASSIM capturar (escalonamento estrutural)

Se, com o working tree comprovadamente em `da952313` (passos 3/4), o checkpoint/deploy **ainda** não servir a Fase 3a → o defeito é **mecânico no checkpoint** (não no código; cópia de arquivo não resolveria, mesma working tree). **Escalar ao P.O.:** o deploy precisa publicar do working tree / sair do GitHub direto (o que `deploy-from-github.sh` já habilita — "publicar o tree resultante"). Não insistir em workarounds de arquivo.

## 7. DoD do despacho

- [ ] `git rev-parse HEAD` no sandbox == `da952313...` antes de publicar
- [ ] `origin/main` permanece `da952313` (nenhum push/commit novo)
- [ ] sentinela `isConstrucaoCivilImoveis` no artefato servido
- [ ] smoke CONSTRUTORA VII → **8 riscos** em `risks_v4`
- [ ] reporte `git=da952313 / checkpoint=<id>`

**Resumo:** rode `deploy-from-github.sh` (Caminho 1). Se não puser os arquivos, extraia do objeto git `da952313` (Caminho 2, idêntico). Nunca re-digite, nunca `push`. Feche com sentinela + smoke. Se o checkpoint mecanicamente não captura → escalar.

FIM.
