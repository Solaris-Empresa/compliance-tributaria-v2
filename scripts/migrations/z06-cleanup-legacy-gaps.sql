-- Sprint Z - Z-06 - Limpeza de gaps legado sem source_reference
-- Executar APOS Z-05 (limpeza do banco operacional)
-- Gerado em: 2026-04-07 - EV-05 investigacao
--
-- DIAGNOSTICO: CASO A (variante: gaps orfaos)
-- 12 gaps sem source_reference pertencem a project_ids que nao existem mais
-- na tabela projects (691585, 691586, 691587 - deletados)
-- Todos criados em 2026-03-24 com source=v1 (engine v1, pre-rastreabilidade)
-- Nao sao bug pos-PR 370 - sao dados historicos de projetos deletados
-- AUTORIZACAO: DEC-M3-05 v3 - Sprint Z-06

-- PASSO 1: Confirmar escopo antes de executar
SELECT COUNT(*) as gaps_a_limpar
FROM project_gaps_v3
WHERE source_reference IS NULL;
-- ESPERADO: 12

-- PASSO 2: Confirmar que sao todos orfaos (sem projeto pai)
SELECT g.id, g.project_id, g.source, g.created_at
FROM project_gaps_v3 g
LEFT JOIN projects p ON p.id = g.project_id
WHERE g.source_reference IS NULL AND p.id IS NULL;
-- ESPERADO: 12 linhas (todos orfaos)

-- PASSO 3: Confirmar que NAO ha gaps sem source_reference de projetos ativos
SELECT COUNT(*) as gaps_orfaos_com_projeto
FROM project_gaps_v3 g
JOIN projects p ON p.id = g.project_id
WHERE g.source_reference IS NULL;
-- ESPERADO: 0

-- PASSO 4: Limpeza (descomentado na execucao real da Z-06)
-- DELETE FROM project_gaps_v3
-- WHERE source_reference IS NULL
--   AND project_id IN (691585, 691586, 691587);

-- PASSO 5: Verificacao pos-limpeza
-- SELECT COUNT(*) as gaps_sem_ref_restantes
-- FROM project_gaps_v3
-- WHERE source_reference IS NULL;
-- ESPERADO: 0
