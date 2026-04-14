-- =============================================================
-- E2E Reset — Sprint Z-14
-- Usar em afterEach() para restaurar estado do projeto E2E
-- Projeto: E2E ONLY - Z14 (id=270001)
-- =============================================================

-- Resetar todos os riscos: desfazer aprovações, restaurar status active
UPDATE risks_v4
SET approved_at = NULL,
    approved_by = NULL,
    status = 'active'
WHERE project_id = 270001;

-- Remover planos de ação criados durante testes (exceto fixture CT-02 base)
DELETE FROM action_plans
WHERE project_id = 270001
  AND titulo LIKE 'E2E Z14 CT-%'
  AND id != '90e41fa7-657c-47e6-a72e-d5e65cccadcd';

-- Restaurar fixture CT-02 ao estado base
UPDATE action_plans
SET titulo = 'E2E Z14 CT-02 BASE',
    status = 'em_andamento',
    prazo = '60_dias',
    approved_at = NULL,
    approved_by = NULL
WHERE id = '90e41fa7-657c-47e6-a72e-d5e65cccadcd';
