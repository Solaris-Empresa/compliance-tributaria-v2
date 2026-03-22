# CPIE v2 — Schema do Banco de Dados

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado  
**Rastreabilidade:** `drizzle/schema.ts`

---

## 1. Tabela `consistency_checks`

Esta é a tabela central do CPIE v2. Cada registro representa uma análise de consistência realizada para um projeto.

### 1.1 Definição completa

```sql
CREATE TABLE consistency_checks (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  project_id            INT NOT NULL,
  user_id               INT NOT NULL,
  
  -- Scores (0–100)
  completeness_score    INT NOT NULL DEFAULT 0,
  consistency_score     INT NOT NULL DEFAULT 0,
  diagnostic_confidence INT NOT NULL DEFAULT 0,
  
  -- Decisão
  overall_level         VARCHAR(20) NOT NULL DEFAULT 'none',
  critical_count        INT NOT NULL DEFAULT 0,
  high_count            INT NOT NULL DEFAULT 0,
  medium_count          INT NOT NULL DEFAULT 0,
  low_count             INT NOT NULL DEFAULT 0,
  can_proceed           TINYINT(1) NOT NULL DEFAULT 0,
  block_type            VARCHAR(50),
  block_reason          TEXT,
  
  -- Conflitos (JSON serializado)
  conflicts_json        TEXT,
  
  -- Versão do motor
  analysis_version      VARCHAR(20) NOT NULL DEFAULT 'cpie-v2.0',
  
  -- Override de soft_block
  accepted_risk         TINYINT(1) NOT NULL DEFAULT 0,
  accepted_risk_at      BIGINT,
  accepted_risk_by      VARCHAR(100),
  accepted_risk_reason  TEXT,
  
  -- Aceite de conflitos MEDIUM
  medium_acknowledged   TINYINT(1) NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at            BIGINT NOT NULL,
  updated_at            BIGINT,
  
  -- Índices
  INDEX idx_project_id (project_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);
```

### 1.2 Descrição dos campos

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | INT | Sim | Chave primária auto-incremento |
| `project_id` | INT | Sim | FK para a tabela `projects` |
| `user_id` | INT | Sim | FK para a tabela `users` |
| `completeness_score` | INT | Sim | Score de completude (0–100) |
| `consistency_score` | INT | Sim | Score de consistência (0–100) |
| `diagnostic_confidence` | INT | Sim | Confiança diagnóstica (0–100) |
| `overall_level` | VARCHAR | Sim | Nível geral: `none`/`low`/`medium`/`high`/`critical` |
| `critical_count` | INT | Sim | Número de conflitos críticos |
| `high_count` | INT | Sim | Número de conflitos altos |
| `medium_count` | INT | Sim | Número de conflitos médios |
| `low_count` | INT | Sim | Número de conflitos baixos |
| `can_proceed` | TINYINT | Sim | 1 = pode avançar, 0 = bloqueado |
| `block_type` | VARCHAR | Não | `hard_block` ou `soft_block_with_override` |
| `block_reason` | TEXT | Não | Mensagem explicativa do bloqueio |
| `conflicts_json` | TEXT | Não | JSON array de `CpieConflict[]` |
| `analysis_version` | VARCHAR | Sim | Versão do motor: `cpie-v2.0` |
| `accepted_risk` | TINYINT | Sim | 1 = override realizado |
| `accepted_risk_at` | BIGINT | Não | Timestamp Unix (ms) do override |
| `accepted_risk_by` | VARCHAR | Não | ID do usuário que fez o override |
| `accepted_risk_reason` | TEXT | Não | Justificativa + log do override |
| `medium_acknowledged` | TINYINT | Sim | 1 = usuário confirmou ciência de conflitos MEDIUM |
| `created_at` | BIGINT | Sim | Timestamp Unix (ms) de criação |
| `updated_at` | BIGINT | Não | Timestamp Unix (ms) da última atualização |

---

## 2. Relacionamentos

### 2.1 `consistency_checks` → `projects`

```
consistency_checks.project_id → projects.id
```

**Cardinalidade:** Um projeto pode ter múltiplas análises (histórico). A análise mais recente é obtida via `ORDER BY created_at DESC LIMIT 1`.

### 2.2 `consistency_checks` → `users`

```
consistency_checks.user_id → users.id
```

**Cardinalidade:** Um usuário pode ter múltiplas análises (uma por projeto criado).

---

## 3. Índices e Performance

| Índice | Campos | Uso |
|---|---|---|
| `idx_project_id` | `project_id` | `getByProject` — busca por projeto |
| `idx_user_id` | `user_id` | Auditoria — busca por usuário |
| `idx_created_at` | `created_at` | Ordenação temporal |

**Query mais frequente:**
```sql
SELECT * FROM consistency_checks
WHERE project_id = ?
ORDER BY created_at DESC
LIMIT 1;
```

---

## 4. Política de Retenção

Os registros em `consistency_checks` são **imutáveis após criação** (exceto pelos campos de override e aceite). Não há exclusão automática — todos os registros são mantidos como trilha de auditoria permanente.

**Campos que podem ser atualizados após criação:**
- `accepted_risk`, `accepted_risk_at`, `accepted_risk_by`, `accepted_risk_reason` — via `overrideSoftBlock`
- `medium_acknowledged`, `updated_at` — via `acknowledgeMediumConflicts`

---

## 5. Estrutura do `conflicts_json`

O campo `conflicts_json` armazena um array JSON de objetos `CpieConflict`:

```json
[
  {
    "id": "A1",
    "type": "direct",
    "severity": "critical",
    "title": "Regime tributário incompatível com faturamento",
    "description": "O regime MEI tem limite de R$ 81.000/ano...",
    "conflictingFields": ["taxRegime", "annualRevenueRange"],
    "consistencyVeto": 15,
    "reconciliationRequired": true,
    "source": "deterministic"
  },
  {
    "id": "AI-001",
    "type": "composite",
    "severity": "medium",
    "title": "Operação descrita sugere porte maior",
    "description": "A descrição menciona operações em múltiplos estados...",
    "conflictingFields": ["companySize", "description"],
    "consistencyVeto": 55,
    "reconciliationRequired": false,
    "source": "ai"
  }
]
```

---

## 6. Estrutura do `accepted_risk_reason`

O campo `accepted_risk_reason` armazena a justificativa do usuário seguida de um log JSON:

```
[CPIE v2 Override] Por orientação da consultoria tributária, a empresa está em processo de transição de regime e o faturamento atual já ultrapassou o limite do Simples Nacional conforme balanço recente. | Log: {"timestamp":1711123456789,"userId":42,"userName":"João Silva","justification":"Por orientação...","checkId":123,"projectId":456,"diagnosticConfidenceAtOverride":45}
```

**Limite de tamanho:** a justificativa é truncada em 450 chars antes do log. O campo total pode ter até ~1KB.

---

## 7. Migração

O campo `medium_acknowledged` foi adicionado em 2026-03-22 (versão 1.2 do schema). Registros anteriores têm `medium_acknowledged = 0` por padrão.

```sql
-- Migração aplicada via pnpm db:push
ALTER TABLE consistency_checks
ADD COLUMN medium_acknowledged TINYINT(1) NOT NULL DEFAULT 0;
```
