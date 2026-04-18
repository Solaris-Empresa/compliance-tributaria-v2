# Claude Code — Acesso Read-Only ao Banco de Dados

**Sprint Z-21 · Governança executável (Opção B com R1-R3)**
**Criado em:** 2026-04-18
**Decisão:** P.O. Uires Tapajós — aprovado em sessão Z-19/Z-20

---

## Objetivo

Permitir que o Claude Code faça sanity-checks independentes no banco de dados durante
validações de bateria, eliminando a dependência de resumos do Manus como única fonte
de evidência. Resolve os vetores D8 (falso positivo SELECT) e "4/4 sem origem" identificados
na revisão de governança do Sprint Z-20.

---

## Endpoint

```
GET /api/admin/db-snapshot
```

**Disponível apenas quando:** `E2E_TEST_MODE=true` (nunca em produção)

---

## Autenticação

```bash
curl -H "Authorization: Bearer $E2E_TEST_SECRET" \
  "https://dev-server/api/admin/db-snapshot?projectId=1200001"
```

O `E2E_TEST_SECRET` é o mesmo secret usado pelo Playwright para autenticação E2E.

---

## Parâmetros

| Parâmetro | Tipo | Obrigatório | Default | Descrição |
|---|---|---|---|---|
| `projectId` | integer | **SIM** | — | ID do projeto a inspecionar |
| `tables` | string (csv) | não | todas | Tabelas a incluir (whitelist abaixo) |
| `limit` | integer | não | 50 | Linhas por tabela (clamp [1, 500]) |

---

## Whitelist de Tabelas

| Tabela | Colunas expostas | Colunas omitidas |
|---|---|---|
| `risks_v4` | id, project_id, categoria, severidade, status, approved_at, rag_validated, rag_confidence, created_at, updated_at | titulo, descricao, recomendacao, rag_trecho_legal, rag_query |
| `action_plans` | id, project_id, risk_id, status, created_at, updated_at | titulo, descricao, responsavel |
| `tasks` | id, action_plan_id, status, created_at, updated_at | titulo, descricao, prazo |
| `audit_log` | id, project_id, entity, action, entity_id, user_id, before_state, after_state, reason, created_at | — |
| `projects` | id, name, status, profileCompleteness, profileConfidence, profileLastAnalyzedAt, scoringData, confirmedCnaes, taxRegime, companySize, created_at, updated_at | companyProfile (JSON completo), operationProfile, clientId |

**Nunca expostas:** `users`, `sessions`, `oauth_tokens`, `cpie_settings`, qualquer tabela não listada acima.

---

## Aggregates (sempre incluídos na resposta)

Além das linhas brutas, a resposta sempre inclui:

```json
{
  "aggregates": {
    "audit_log_summary": [
      { "entity": "risk", "action": "deleted", "cnt": 1 },
      { "entity": "action_plan", "action": "deleted", "cnt": 1 }
    ],
    "risks_by_status": [...],
    "plans_by_status": [...]
  }
}
```

---

## Exemplos de Uso

### Verificar cascata após deleteRisk

```bash
curl -s \
  -H "Authorization: Bearer $E2E_TEST_SECRET" \
  "https://dev-server/api/admin/db-snapshot?projectId=1200001&tables=risks_v4,action_plans,tasks,audit_log&limit=20" \
  | jq '.aggregates.audit_log_summary'
```

### Verificar score CPIE de um projeto

```bash
curl -s \
  -H "Authorization: Bearer $E2E_TEST_SECRET" \
  "https://dev-server/api/admin/db-snapshot?projectId=930001&tables=projects" \
  | jq '.tables.projects.rows[0] | {profileCompleteness, profileConfidence, scoringData}'
```

### Verificar todos os riscos aprovados

```bash
curl -s \
  -H "Authorization: Bearer $E2E_TEST_SECRET" \
  "https://dev-server/api/admin/db-snapshot?projectId=1200001&tables=risks_v4&limit=50" \
  | jq '.aggregates.risks_by_status'
```

---

## Formato da Resposta

```json
{
  "projectId": 1200001,
  "generatedAt": "2026-04-18T20:00:00.000Z",
  "tables": {
    "risks_v4": {
      "count": 10,
      "rows": [...],
      "query": "SELECT id, project_id, ... FROM risks_v4 WHERE project_id = 1200001 ..."
    }
  },
  "aggregates": {
    "audit_log_summary": [...],
    "risks_by_status": [...],
    "plans_by_status": [...]
  }
}
```

A resposta inclui o campo `query` com o SQL exato executado — permite auditoria da query
sem acesso ao código-fonte.

---

## Rotação do E2E_TEST_SECRET (R3)

### Regras

1. O `E2E_TEST_SECRET` **nunca é commitado** — existe apenas em `.env.local` (gitignored)
2. Rotação **manual** ao início de cada sprint
3. Após rotação: atualizar o secret no painel de secrets do Manus (Settings → Secrets)
4. Claude Code recebe o novo valor via variável de ambiente injetada no início da sprint

### Procedimento de rotação

```bash
# Gerar novo secret (32 bytes hex)
NEW_SECRET=$(openssl rand -hex 32)
echo "E2E_TEST_SECRET=$NEW_SECRET"

# Atualizar .env.local (nunca commitar)
echo "E2E_TEST_SECRET=$NEW_SECRET" >> .env.local

# Atualizar no painel Manus → Settings → Secrets → E2E_TEST_SECRET
# Comunicar ao Orquestrador o novo valor para repassar ao Claude Code
```

### Histórico de rotações

| Sprint | Data | Rotacionado por |
|---|---|---|
| Z-21 | 2026-04-18 | Manus (criação inicial) |

---

## Restrições de Segurança

- **Escopo por projectId:** impossível fazer SELECT global sem projectId
- **Sem escrita:** endpoint é GET-only, sem mutations
- **Sem DATABASE_URL exposta:** a conexão usa a variável de ambiente do servidor
- **Guard de ambiente:** retorna 403 se `E2E_TEST_MODE !== "true"`
- **Guard de autenticação:** retorna 401 se Bearer token não bate com `E2E_TEST_SECRET`
- **Whitelist rígida:** qualquer tabela fora da whitelist é silenciosamente ignorada

---

## Implementação

| Arquivo | Descrição |
|---|---|
| `server/lib/db-snapshot.ts` | Handler principal com queries e whitelist |
| `server/_core/index.ts` | Registro da rota `GET /api/admin/db-snapshot` |
| `docs/governance/CLAUDE_CODE_DB_ACCESS.md` | Este documento |

---

## Referências

- Issue #719 (fix cascata soft delete) — primeiro uso do endpoint
- Sprint Z-20 revisão de governança — origem da decisão
- `.claude/rules/database.md` — regra clamp [1,500] (R2)
