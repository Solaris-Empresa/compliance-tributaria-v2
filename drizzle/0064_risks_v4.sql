-- Migration 0064 — Sprint Z-07 PR #B
-- Sistema de Riscos v4 — 4 tabelas novas (ADR-0022)
-- NÃO altera nenhuma tabela existente

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabela 1: risks_v4
-- Engine determinístico — substitui project_risks_v3 (legado AS-IS)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `risks_v4` (
  `id`               VARCHAR(36)    NOT NULL,
  `project_id`       INT            NOT NULL,
  `rule_id`          VARCHAR(64)    NOT NULL,
  `type`             ENUM('risk','opportunity') NOT NULL,
  `categoria`        ENUM(
    'imposto_seletivo',
    'confissao_automatica',
    'split_payment',
    'inscricao_cadastral',
    'regime_diferenciado',
    'transicao_iss_ibs',
    'obrigacao_acessoria',
    'aliquota_zero',
    'aliquota_reduzida',
    'credito_presumido'
  ) NOT NULL,
  `titulo`           VARCHAR(500)   NOT NULL,
  `descricao`        TEXT           NULL,
  `artigo`           VARCHAR(255)   NOT NULL,
  `severidade`       ENUM('alta','media','oportunidade') NOT NULL,
  `urgencia`         ENUM('imediata','curto_prazo','medio_prazo') NOT NULL,
  `evidence`         JSON           NOT NULL,
  `breadcrumb`       JSON           NOT NULL,
  `source_priority`  ENUM('cnae','ncm','nbs','solaris','iagen') NOT NULL,
  `confidence`       DECIMAL(5,4)   NOT NULL DEFAULT 1.0,
  `status`           ENUM('active','deleted') NOT NULL DEFAULT 'active',
  `approved_by`      INT            NULL,
  `approved_at`      TIMESTAMP      NULL,
  `deleted_reason`   TEXT           NULL,
  `created_by`       INT            NOT NULL,
  `updated_by`       INT            NOT NULL,
  `created_at`       TIMESTAMP      NOT NULL DEFAULT NOW(),
  `updated_at`       TIMESTAMP      NOT NULL DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `risks_v4_id` PRIMARY KEY (`id`)
);

CREATE INDEX `risks_v4_project_id_idx` ON `risks_v4` (`project_id`);
CREATE INDEX `risks_v4_status_idx`     ON `risks_v4` (`status`);
CREATE INDEX `risks_v4_rule_id_idx`    ON `risks_v4` (`rule_id`);

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabela 2: action_plans
-- Planos de ação vinculados a risks_v4 (substitui project_actions_v3 legado)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `action_plans` (
  `id`             VARCHAR(36)   NOT NULL,
  `project_id`     INT           NOT NULL,
  `risk_id`        VARCHAR(36)   NOT NULL,
  `titulo`         VARCHAR(500)  NOT NULL,
  `descricao`      TEXT          NULL,
  `responsavel`    VARCHAR(100)  NOT NULL,
  `prazo`          ENUM('30_dias','60_dias','90_dias') NOT NULL,
  `status`         ENUM('rascunho','aprovado','em_andamento','concluido','deleted') NOT NULL DEFAULT 'rascunho',
  `approved_by`    INT           NULL,
  `approved_at`    TIMESTAMP     NULL,
  `deleted_reason` TEXT          NULL,
  `created_by`     INT           NOT NULL,
  `updated_by`     INT           NOT NULL,
  `created_at`     TIMESTAMP     NOT NULL DEFAULT NOW(),
  `updated_at`     TIMESTAMP     NOT NULL DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `action_plans_id` PRIMARY KEY (`id`),
  CONSTRAINT `action_plans_risk_id_fk` FOREIGN KEY (`risk_id`) REFERENCES `risks_v4` (`id`)
);

CREATE INDEX `action_plans_project_id_idx` ON `action_plans` (`project_id`);
CREATE INDEX `action_plans_risk_id_idx`    ON `action_plans` (`risk_id`);
CREATE INDEX `action_plans_status_idx`     ON `action_plans` (`status`);

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabela 3: tasks
-- Tarefas atômicas vinculadas a action_plans
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `tasks` (
  `id`               VARCHAR(36)   NOT NULL,
  `project_id`       INT           NOT NULL,
  `action_plan_id`   VARCHAR(36)   NOT NULL,
  `titulo`           VARCHAR(500)  NOT NULL,
  `descricao`        TEXT          NULL,
  `responsavel`      VARCHAR(100)  NOT NULL,
  `prazo`            DATE          NULL,
  `status`           ENUM('todo','doing','done','blocked','deleted') NOT NULL DEFAULT 'todo',
  `ordem`            INT           NOT NULL DEFAULT 0,
  `deleted_reason`   TEXT          NULL,
  `created_by`       INT           NOT NULL,
  `created_at`       TIMESTAMP     NOT NULL DEFAULT NOW(),
  `updated_at`       TIMESTAMP     NOT NULL DEFAULT NOW() ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `tasks_id` PRIMARY KEY (`id`),
  CONSTRAINT `tasks_action_plan_id_fk` FOREIGN KEY (`action_plan_id`) REFERENCES `action_plans` (`id`)
);

CREATE INDEX `tasks_project_id_idx`      ON `tasks` (`project_id`);
CREATE INDEX `tasks_action_plan_id_idx`  ON `tasks` (`action_plan_id`);
CREATE INDEX `tasks_status_idx`          ON `tasks` (`status`);

-- ─────────────────────────────────────────────────────────────────────────────
-- Tabela 4: audit_log
-- Trilha de auditoria imutável para risks_v4, action_plans e tasks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id`            BIGINT        NOT NULL AUTO_INCREMENT,
  `project_id`    INT           NOT NULL,
  `entity`        ENUM('risk','action_plan','task') NOT NULL,
  `entity_id`     VARCHAR(36)   NOT NULL,
  `action`        ENUM('created','updated','deleted','restored','approved') NOT NULL,
  `user_id`       INT           NOT NULL,
  `user_name`     VARCHAR(255)  NOT NULL,
  `user_role`     VARCHAR(100)  NOT NULL,
  `before_state`  JSON          NULL,
  `after_state`   JSON          NULL,
  `reason`        TEXT          NULL,
  `created_at`    TIMESTAMP     NOT NULL DEFAULT NOW(),
  CONSTRAINT `audit_log_id` PRIMARY KEY (`id`)
);

CREATE INDEX `audit_log_project_id_idx`        ON `audit_log` (`project_id`);
CREATE INDEX `audit_log_entity_entity_id_idx`  ON `audit_log` (`entity`, `entity_id`);
