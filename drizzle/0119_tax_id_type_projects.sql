-- migration: 0119_tax_id_type_projects.sql
-- BUG-AGRO-CPF F0 — adiciona coluna tax_id_type em projects para discriminar
-- Pessoa Jurídica (cnpj) vs Pessoa Física (cpf · Art. 164 LC 214/2025).
--
-- Issue: #1290
-- Predecessor: 0118_art197_decreto_resolucao_grupos.sql
-- Spec: docs/governance/relatorios/DB-SPEC-BUG-AGRO-CPF.md §B.2
-- Runbook rollback: docs/deploy/runbook-rollback-cpf-pf.md
--
-- Reversível (N4): ALTER TABLE projects DROP COLUMN tax_id_type;
-- Não-destrutivo: DEFAULT 'cnpj' garante que projetos existentes herdam
-- comportamento PJ automaticamente, sem ALTER seletivo.
--
-- Feature flag ENABLE_TAX_ID_DUAL=false (default em F0) — sem comportamento
-- visível ao usuário até F1+F2 mergeados. F0 é apenas infraestrutura.
--
-- Filename sem "rag"/"cnae" (REGRA-ORQ-FILENAME-01 / Lição #92 — projects
-- não é tabela RAG, mas guard de CI casa substring).

-- UP
ALTER TABLE projects
  ADD COLUMN tax_id_type ENUM('cnpj', 'cpf') NOT NULL DEFAULT 'cnpj'
  COMMENT 'cnpj=Pessoa Jurídica | cpf=Pessoa Física (Art. 164 LC 214/2025)';

-- DOWN (rollback N4 — referência apenas; executar manualmente se necessário)
-- ALTER TABLE projects DROP COLUMN tax_id_type;
