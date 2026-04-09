---
# HANDOFF-MANUS — Sprint Z-07
## Documento de entrada para toda sessão de implementação
## docs/sprints/Z-07/HANDOFF-MANUS-Z07.md

---

## Estado atual

Sprint: Z-07 — Sistema de Riscos v4
RFC: RFC-Z07-001 ✅ Assinada pelo P.O.
HEAD: 63c3dd2
Fase atual: 3 — Implementação (PR #A em andamento, PR #B aguardando)

## Decisão central — ADR-0022

Tudo construído do zero em arquivos novos. Legado não é tocado.
NUNCA editar: routers-fluxo-v3.ts · riskEngine.ts · MatrizesV3.tsx · project_risks_v3

---

## PR #A — Engine puro (Claude Code)

Branch: test/risk-engine-v4-tdd
Arquivos: server/lib/risk-engine-v4.ts · server/lib/action-plan-engine-v4.ts
Testes: server/lib/risk-engine-v4.test.ts (30 testes — já commitados)
Status: EM ANDAMENTO

---

## PR #B — Schema + banco (Manus)

Branch: feat/schema-0064
Arquivos a criar:
  drizzle/0064_risks_v4.sql
  server/lib/db-queries-risks-v4.ts

### 4 tabelas obrigatórias

**Tabela 1: risks_v4**
  id VARCHAR(36) PK (uuid)
  project_id INT NOT NULL FK
  rule_id VARCHAR(64) NOT NULL
  type ENUM('risk','opportunity') NOT NULL
  categoria ENUM('imposto_seletivo','confissao_automatica','split_payment',
    'inscricao_cadastral','regime_diferenciado','transicao_iss_ibs',
    'obrigacao_acessoria','aliquota_zero','aliquota_reduzida','credito_presumido') NOT NULL
  titulo VARCHAR(500) NOT NULL
  descricao TEXT
  artigo VARCHAR(255) NOT NULL
  severidade ENUM('alta','media','oportunidade') NOT NULL
  urgencia ENUM('imediata','curto_prazo','medio_prazo') NOT NULL
  evidence JSON NOT NULL
  breadcrumb JSON NOT NULL
  source_priority ENUM('cnae','ncm','nbs','solaris','iagen') NOT NULL
  confidence DECIMAL(5,4) NOT NULL DEFAULT 1.0
  status ENUM('active','deleted') NOT NULL DEFAULT 'active'
  approved_by INT NULL
  approved_at TIMESTAMP NULL
  deleted_reason TEXT NULL
  created_by INT NOT NULL
  updated_by INT NOT NULL
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
  updated_at TIMESTAMP NOT NULL DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP

**Tabela 2: action_plans**
  id VARCHAR(36) PK (uuid)
  project_id INT NOT NULL FK
  risk_id VARCHAR(36) NOT NULL FK → risks_v4.id
  titulo VARCHAR(500) NOT NULL
  descricao TEXT
  responsavel VARCHAR(100) NOT NULL
  prazo ENUM('30_dias','60_dias','90_dias') NOT NULL
  status ENUM('rascunho','aprovado','em_andamento','concluido','deleted') NOT NULL DEFAULT 'rascunho'
  approved_by INT NULL
  approved_at TIMESTAMP NULL
  deleted_reason TEXT NULL
  created_by INT NOT NULL
  updated_by INT NOT NULL
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
  updated_at TIMESTAMP NOT NULL DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP

**Tabela 3: tasks**
  id VARCHAR(36) PK (uuid)
  project_id INT NOT NULL FK
  action_plan_id VARCHAR(36) NOT NULL FK → action_plans.id
  titulo VARCHAR(500) NOT NULL
  descricao TEXT
  responsavel VARCHAR(100) NOT NULL
  prazo DATE NULL
  status ENUM('todo','doing','done','blocked','deleted') NOT NULL DEFAULT 'todo'
  ordem INT NOT NULL DEFAULT 0
  deleted_reason TEXT NULL
  created_by INT NOT NULL
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
  updated_at TIMESTAMP NOT NULL DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP

**Tabela 4: audit_log**
  id BIGINT AUTO_INCREMENT PK
  project_id INT NOT NULL FK
  entity ENUM('risk','action_plan','task') NOT NULL
  entity_id VARCHAR(36) NOT NULL
  action ENUM('created','updated','deleted','restored','approved') NOT NULL
  user_id INT NOT NULL
  user_name VARCHAR(255) NOT NULL
  user_role VARCHAR(100) NOT NULL
  before_state JSON NULL
  after_state JSON NULL
  reason TEXT NULL
  created_at TIMESTAMP NOT NULL DEFAULT NOW()

### Índices obrigatórios
  risks_v4: INDEX(project_id), INDEX(status), INDEX(rule_id)
  action_plans: INDEX(project_id), INDEX(risk_id), INDEX(status)
  tasks: INDEX(project_id), INDEX(action_plan_id), INDEX(status)
  audit_log: INDEX(project_id), INDEX(entity, entity_id)

### Critério de entrega do PR #B
  pnpm tsc --noEmit → 0 erros
  Migration executada: 4 tabelas criadas e verificadas via SQL
  Campos críticos confirmados: approved_at · approved_by · deleted_reason

---

## PR #C — Router + Frontend (Manus)
Aguarda merge de PR #A e PR #B.

---

## Docs de referência
  docs/governance/ESTADO-ATUAL.md
  docs/governance/ADR-0022-estrategia-novo-plugin-strangler-fig.md
  server/lib/risk-engine-v4.test.ts (contrato do engine)

---
*HANDOFF-MANUS-Z07 · IA SOLARIS · Sprint Z-07 · 2026-04-09*
