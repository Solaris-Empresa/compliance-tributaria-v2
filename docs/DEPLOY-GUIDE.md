# Guia de Deploy e Controle de Versão

> **Versão:** 5.6.0 — Atualizado em 2026-03-21  
> **Escopo:** Fluxo de deploy na plataforma Manus, verificação de versão e checklist pós-deploy.

---

## Fluxo de Deploy

O projeto usa o sistema de checkpoints da Manus como controle de versão e mecanismo de deploy. Cada checkpoint é um snapshot imutável do código, banco de dados e configurações.

```
Desenvolvimento (sandbox)
        │
        ▼
  webdev_save_checkpoint   ←── cria commit no S3 interno + screenshot
        │
        ▼
  Botão "Publish" no painel ←── promove o checkpoint para produção
        │
        ▼
  iasolaris.manus.space    ←── versão publicada
```

---

## Checklist de Deploy

### Antes de publicar

Antes de clicar em **Publish**, confirme os seguintes itens:

| Item | Verificação |
|---|---|
| TypeScript sem erros | `npx tsc --noEmit` retorna 0 erros |
| Testes passando | `npx vitest run` — todos os testes verdes |
| CHANGELOG atualizado | Entrada com a versão semântica adicionada em `CHANGELOG.md` |
| todo.md atualizado | Todos os itens da sprint marcados como `[x]` |
| Variáveis de ambiente | `OPENAI_API_KEY`, `TRACE_LEVEL` configurados no painel Secrets |

### Após publicar

Após clicar em **Publish** e aguardar o deploy (≈60s), execute a sequência de verificação:

```bash
# 1. Confirmar versão publicada
curl https://iasolaris.manus.space/api/version | jq '{version, gitHash, env}'

# 2. Verificar saúde do pipeline
curl https://iasolaris.manus.space/api/health/cnae | jq '{status, "cache": .components.embeddingsCache.loaded}'

# 3. Validar qualidade do pipeline (leva ~3s)
curl https://iasolaris.manus.space/api/health/cnae/validate | jq '.summary'
```

**Resultado esperado:**
```json
{ "version": "5.6.0", "gitHash": "7252416", "env": "production" }
{ "status": "ok", "cache": true }
"✅ Pipeline CNAE validado: 1332 embeddings (100%), 4/4 casos passaram em 3s"
```

---

## Controle de Versão

### Como identificar a versão em produção

O campo `gitHash` no `/api/version` corresponde aos primeiros 7 caracteres do ID do checkpoint Manus. Para confirmar que o deploy está atualizado:

1. No painel de gerenciamento, anote o ID do último checkpoint publicado (ex: `72524167`).
2. Execute: `curl https://iasolaris.manus.space/api/version | jq .gitHash`
3. O resultado deve ser `"7252416"` (primeiros 7 chars do ID do checkpoint).

### Histórico de checkpoints

| Versão | Checkpoint ID | Data | Descrição |
|---|---|---|---|
| 5.6.0 | `72524167` | 2026-03-21 | Cache warm-up + tracer refineCnaes + alerta de deploy |
| 5.5.1 | `ead9c909` | 2026-03-21 | Endpoint `/api/health/cnae/validate` on-demand |
| 5.5.0 | `5d81f5b1` | 2026-03-21 | Tracing estruturado + endpoint `/api/version` |
| 5.4.0 | `ea616dd9` | 2026-03-21 | Health check + validação automática semanal |

---

## Exportação para GitHub

O repositório interno usa S3 da Manus como backend Git. Para exportar para um repositório GitHub externo:

1. Acesse o painel de gerenciamento → **Settings → GitHub**.
2. Selecione o owner e defina o nome do repositório.
3. Clique em **Export** — o código será enviado para o GitHub como repositório público ou privado.

> **Nota:** A exportação é um snapshot do estado atual. Commits futuros na Manus não são sincronizados automaticamente com o GitHub — é necessário exportar novamente a cada sprint.

---

## Rollback

Se um deploy introduzir um bug crítico em produção:

1. No painel de gerenciamento, localize o checkpoint anterior estável na lista de checkpoints.
2. Clique em **Rollback** no checkpoint desejado.
3. O sistema restaura o código e as configurações daquele snapshot.
4. Verifique com `curl https://iasolaris.manus.space/api/version | jq .gitHash` que o rollback foi aplicado.

> **Nunca use `git reset --hard`** — use sempre o botão **Rollback** no painel para garantir consistência entre código, banco e configurações.

---

## Variáveis de Ambiente de Produção

| Variável | Obrigatória | Valor recomendado | Descrição |
|---|---|---|---|
| `OPENAI_API_KEY` | ✅ Sim | `sk-proj-...` | Chave para GPT-4.1 e text-embedding-3-small |
| `TRACE_LEVEL` | Recomendada | `"info"` | Nível de log do tracer (`debug`/`info`/`off`) |
| `NODE_ENV` | Auto | `"production"` | Definido automaticamente pela plataforma |
| `DATABASE_URL` | Auto | — | Injetado automaticamente pela plataforma |
| `JWT_SECRET` | Auto | — | Injetado automaticamente pela plataforma |

Configure variáveis no painel: **Settings → Secrets**.

---

## Alerta Automático de Deploy

A partir da v5.6.0, o servidor envia uma notificação ao owner via `notifyOwner()` a cada restart/deploy em produção. O owner receberá uma mensagem com:

```
🚀 Deploy confirmado: v5.6.0 (7252416)
Ambiente: production | Node: v22.13.0
Commit: Checkpoint: Sprint v5.6.0...
Horário: 2026-03-21T12:00:00.000Z
```

Se a notificação não chegar em até 2 minutos após o Publish, verifique:
1. `/api/health/cnae` — se retornar HTML (SPA), o deploy não foi aplicado.
2. `/api/version` — se `gitHash` for `"unknown"`, o build não injetou o hash corretamente (comportamento esperado na Manus — o `version` semântico é o indicador confiável).
