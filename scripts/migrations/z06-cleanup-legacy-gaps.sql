-- Sprint Z - Z-06 - Limpeza de gaps legado sem source_reference
-- Executar APOS Z-05 (limpeza do banco operacional)
-- Gerado em: 2026-04-07 - EV-05 investigacao
-- Expandido em: 2026-04-07 - pré-Z-02 (cobre 5 tabelas dependentes)
--
-- DIAGNOSTICO: CASO A (variante: gaps orfaos)
-- 12 gaps sem source_reference pertencem a project_ids que nao existem mais
-- na tabela projects (691585, 691586, 691587 - deletados)
-- Todos criados em 2026-03-24 com source=v1 (engine v1, pre-rastreabilidade)
-- Nao sao bug pos-PR 370 - sao dados historicos de projetos deletados
-- AUTORIZACAO: DEC-M3-05 v3 - Sprint Z-06

-- ─── Passo 1: Confirmar escopo antes de executar ─────────────────────────────
SELECT COUNT(*) as gaps_a_limpar
FROM project_gaps_v3
WHERE source_reference IS NULL;
-- ESPERADO: 12

-- ─── Passo 2: Confirmar que sao todos orfaos (sem projeto pai) ────────────────
SELECT g.id, g.project_id, g.source, g.created_at
FROM project_gaps_v3 g
LEFT JOIN projects p ON p.id = g.project_id
WHERE g.source_reference IS NULL AND p.id IS NULL;
-- ESPERADO: 12 linhas (todos orfaos)

-- ─── Passo 3: Confirmar que NAO ha gaps sem source_reference de projetos ativos
SELECT COUNT(*) as gaps_orfaos_com_projeto
FROM project_gaps_v3 g
JOIN projects p ON p.id = g.project_id
WHERE g.source_reference IS NULL;
-- ESPERADO: 0

-- ─── Passo 4: limpar orfaos em TODAS as tabelas dependentes ──────────────────
-- Executar na mesma ordem respeitando dependencias entre tabelas

-- Riscos orfaos
SELECT COUNT(*) as risks_orfaos
FROM project_risks_v3
WHERE project_id NOT IN (SELECT id FROM projects);

-- Respostas SOLARIS orfas
SELECT COUNT(*) as solaris_orfaos
FROM solaris_answers
WHERE project_id NOT IN (SELECT id FROM projects);

-- Respostas IA GEN orfas
SELECT COUNT(*) as iagen_orfaos
FROM iagen_answers
WHERE project_id NOT IN (SELECT id FROM projects);

-- Briefings orfaos
SELECT COUNT(*) as briefings_orfaos
FROM briefings
WHERE project_id NOT IN (SELECT id FROM projects);

-- Action plans orfaos
SELECT COUNT(*) as plans_orfaos
FROM action_plans
WHERE project_id NOT IN (SELECT id FROM projects);

-- ─── Confirmar contagens antes de executar DELETEs ────────────────────────────
-- Somente prosseguir se as contagens acima forem consistentes
-- com o diagnostico EV-05 (no maximo projetos 691585/691586/691587)

-- DELETE orphan risks
-- DELETE FROM project_risks_v3
-- WHERE project_id NOT IN (SELECT id FROM projects);

-- DELETE orphan solaris answers
-- DELETE FROM solaris_answers
-- WHERE project_id NOT IN (SELECT id FROM projects);

-- DELETE orphan iagen answers
-- DELETE FROM iagen_answers
-- WHERE project_id NOT IN (SELECT id FROM projects);

-- DELETE orphan briefings
-- DELETE FROM briefings
-- WHERE project_id NOT IN (SELECT id FROM projects);

-- DELETE orphan action plans
-- DELETE FROM action_plans
-- WHERE project_id NOT IN (SELECT id FROM projects);

-- DELETE orphan gaps (passo original)
-- DELETE FROM project_gaps_v3
-- WHERE source_reference IS NULL
--   AND project_id IN (691585, 691586, 691587);

-- ─── Passo 5: adicionar FK com CASCADE DELETE ao schema ──────────────────────
-- Registrar em backlog Z-06 para prevenir recorrencia:
-- ALTER TABLE project_gaps_v3
--   ADD CONSTRAINT fk_gaps_project
--   FOREIGN KEY (project_id) REFERENCES projects(id)
--   ON DELETE CASCADE;
-- (repetir para project_risks_v3, solaris_answers, iagen_answers,
--  briefings, action_plans)
-- NOTA: verificar suporte a FK com CASCADE no TiDB Cloud antes de executar

-- ─── Passo 6: evidencia final ─────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM project_gaps_v3
   WHERE project_id NOT IN (SELECT id FROM projects)) as gaps_orfaos,
  (SELECT COUNT(*) FROM project_risks_v3
   WHERE project_id NOT IN (SELECT id FROM projects)) as risks_orfaos,
  (SELECT COUNT(*) FROM solaris_answers
   WHERE project_id NOT IN (SELECT id FROM projects)) as solaris_orfaos,
  (SELECT COUNT(*) FROM briefings
   WHERE project_id NOT IN (SELECT id FROM projects)) as briefings_orfaos;
-- ESPERADO: todos = 0 apos execucao dos DELETEs
