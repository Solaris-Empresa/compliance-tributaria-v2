# ADR-0037 — Gate de deploy obrigatório: 4 HEADs alinhados (BLOQUEANTE)

## Status: Aceito · 2026-06-18 · Classe A (governança) · Origem: drift 3× na sessão 18/06 (audit v7.79)
## Relacionado: REGRA-ORQ-25 (checkpoint Manus.space ≠ SHA git), R-SYNC-01/R-SYNC-02, REGRA-ORQ-19 (Passo 1), Gate POST-DEPLOY (Gate E), Lição #128 (gates declarados ≠ enforçados)

---

## 1. Contexto

O princípio "os HEADs precisam estar alinhados antes de validar/encerrar" já existia **disperso e implícito** em três lugares: REGRA-ORQ-19 (Passo 1 "4 HEADs alinhados"), R-SYNC-01 (S3 espelha GitHub) e o Gate POST-DEPLOY. Por ser **aviso, não gate com consequência**, falhou **3 vezes na sessão 18/06/2026**:

| Checkpoint reportado | É objeto git? | Consequência |
|---|---|---|
| `c04097ca` (PR fantasma) | ❌ `Not a valid object name` | "fix" descrito existia só no sandbox; nunca em GitHub |
| `df07600c` | ❌ | re-deploy não pegou o HEAD; bug "8436" persistiu |
| `60e95765` | ❌ | `git reset --hard github/main` foi ao ref errado (R-SYNC-02); checkpoint nasceu com código velho |

Consequência estrutural (audit ORQ-19 v7.79): **smokes validaram `3033027`** (8 commits atrás do trabalho da sessão). "8/9 PASS" e "greenfield PASS" eram reais, mas **para o HEAD errado**. Declarar a sessão validada nesse estado repetiria a Lição #60 (score técnico ≠ produto).

## 2. Decisão

O alinhamento dos **4 HEADs** vira **gate BLOQUEANTE** no Passo 1 da REGRA-ORQ-19.

**Os 4 HEADs:**
1. **GitHub** `origin/main` (`git rev-parse origin/main`) — fonte de verdade.
2. **S3 Manus** (webdev/checkpoint store).
3. **Checkpoint publicado** (Manus.space).
4. **Produção** (`iasolaris.manus.space` — SHA servido / build hash).

**Regra:** se os 4 não forem **idênticos ao SHA git de `origin/main`**, a sessão **NÃO pode ser declarada validada**. Os Passos 4 e 6 (smoke HTTP / smoke UX) ficam **bloqueados** até o deploy reconciliar — porque smoke em HEAD divergente não é evidência autoritativa.

## 3. Consequência explícita

- **4 HEADs divergentes → veredito ORQ-19 INVÁLIDO.** Nenhum "VALIDADA" é emitido; o veredito anterior (se houver) é rebaixado a parcial até o deploy.
- Todo reporte de deploy/encerramento **DEVE** citar `git=<SHA real de origin/main> / checkpoint=<id Manus.space>` (REGRA-ORQ-25). Reporte que cita só checkpoint é rejeitado.
- Smoke (Passo 4/6) só conta se rodado **no HEAD alinhado** — caso contrário, marcar "não-autoritativo (HEAD divergente)".

## 4. Procedimento de verificação (Passo 1)

```bash
# (a) SHA autoritativo do GitHub
git fetch github refs/heads/main:refs/remotes/github/main   # refspec EXPLÍCITO (R-SYNC-02; 'github/main' bare é ambíguo com 3 remotes)
GIT=$(git rev-parse --short refs/remotes/github/main)

# (b) deploy a partir de checkout LIMPO do HEAD (não de checkpoint cacheado)
git reset --hard refs/remotes/github/main
[ "$(git rev-parse --short HEAD)" = "$GIT" ] || echo "ABORTAR: reset foi ao ref errado (R-SYNC-02)"

# (c) só então criar checkpoint / Publish — checkpoint nasce DESTE tree
# (d) confirmar produção: build hash / SHA servido == $GIT
```

Reporte do Passo 1 deve listar os 4 HEADs lado a lado (tabela), todos == `$GIT`.

## 5. Natureza do enforcement (honestidade — Lição #128)

Este gate é **processual, não mecânico**: o CI não enxerga S3/checkpoint/produção, logo não há required check que o force. A consequência é **operacional** — Manus (executor) e P.O. (accountable) NÃO declaram a sessão validada sem a tabela dos 4 HEADs no audit ORQ-19. Mecanizar parcialmente (ex.: workflow que compara o build hash de produção contra `origin/main`) fica como evolução futura.

## 6. Vinculadas
- REGRA-ORQ-25 (anti-drift SHA Manus.space) — esta ADR é o gate que a operacionaliza no encerramento.
- R-SYNC-01 / R-SYNC-02 (sincronização + refspec explícito) — o "como".
- REGRA-ORQ-19 Passo 1 — onde o gate se aplica.
- Gate POST-DEPLOY (smoke.sh) — complementar (verifica prod respondendo; ADR-0037 verifica que prod == GitHub).
- Lição #128 (gates declarados ≠ enforçados) — esta ADR move o princípio de "aviso disperso" para "gate com consequência declarada".
- Audit ORQ-19 v7.79 (`docs/governance/audits/v7.79-2026-06-18-sessao-clienttype-eligibility.md`) — caso canônico (Processo 🟡 pelo drift 3×).
