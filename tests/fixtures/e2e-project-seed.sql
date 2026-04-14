-- =============================================================
-- E2E Seed — Sprint Z-14
-- Projeto: E2E ONLY - Z14 (id=270001)
-- Gerado em: 14/04/2026
-- NÃO executar em produção fora de ambiente de testes
-- =============================================================

-- TAREFA 2: Projeto E2E isolado
INSERT INTO projects
  (id, name, clientId, createdById, createdByRole)
VALUES
  (270001, 'E2E ONLY - Z14', 9999, 1, 'equipe_solaris')
ON DUPLICATE KEY UPDATE name = 'E2E ONLY - Z14';

-- TAREFA 3: 10 riscos controlados
-- Mix: imposto_seletivo(alta) x3, split_payment(media) x3,
--      aliquota_zero(oportunidade) x2, credito_presumido(oportunidade) x2
-- Todos: rag_validated=1, approved_at=NULL, status='active'

INSERT INTO risks_v4
  (id, project_id, rule_id, type, categoria, titulo, descricao, artigo,
   severidade, urgencia, evidence, breadcrumb, source_priority, confidence,
   status, approved_at, created_by, updated_by,
   rag_validated, rag_confidence, rag_artigo_exato, rag_query, rag_validation_note)
VALUES
  ('7c402eae-a0bc-4ef5-a0c1-ad2309b2ccdc', 270001, 'E2E-IS-001', 'risk', 'imposto_seletivo',
   'E2E Z14 — Imposto Seletivo IS-001', 'Risco de teste E2E Z-14 — não usar em produção.',
   'Art. 1º LC 214/2025', 'alta', 'imediata', '{"e2e":true}', '[]', 'solaris', 1.0,
   'active', NULL, 1, 1, 1, 0.95, 'Art. 1º LC 214/2025', 'E2E smoke test query Z-14', 'Risco controlado para suite E2E Z-14'),

  ('5dddb74c-405d-408f-add2-28268a9663d9', 270001, 'E2E-IS-002', 'risk', 'imposto_seletivo',
   'E2E Z14 — Imposto Seletivo IS-002', 'Risco de teste E2E Z-14 — não usar em produção.',
   'Art. 2º LC 214/2025', 'alta', 'curto_prazo', '{"e2e":true}', '[]', 'solaris', 1.0,
   'active', NULL, 1, 1, 1, 0.95, 'Art. 2º LC 214/2025', 'E2E smoke test query Z-14', 'Risco controlado para suite E2E Z-14'),

  ('e9d400bb-122d-4178-8514-78accf6f6aff', 270001, 'E2E-IS-003', 'risk', 'imposto_seletivo',
   'E2E Z14 — Imposto Seletivo IS-003', 'Risco de teste E2E Z-14 — não usar em produção.',
   'Art. 3º LC 214/2025', 'alta', 'medio_prazo', '{"e2e":true}', '[]', 'solaris', 1.0,
   'active', NULL, 1, 1, 1, 0.95, 'Art. 3º LC 214/2025', 'E2E smoke test query Z-14', 'Risco controlado para suite E2E Z-14'),

  ('40038aa1-306f-4f3c-9e16-120fd379311a', 270001, 'E2E-SP-001', 'risk', 'split_payment',
   'E2E Z14 — Split Payment SP-001', 'Risco de teste E2E Z-14 — não usar em produção.',
   'Art. 10 LC 214/2025', 'media', 'imediata', '{"e2e":true}', '[]', 'solaris', 1.0,
   'active', NULL, 1, 1, 1, 0.95, 'Art. 10 LC 214/2025', 'E2E smoke test query Z-14', 'Risco controlado para suite E2E Z-14'),

  ('8d1a5113-4983-47b5-9c89-c30568a12930', 270001, 'E2E-SP-002', 'risk', 'split_payment',
   'E2E Z14 — Split Payment SP-002', 'Risco de teste E2E Z-14 — não usar em produção.',
   'Art. 11 LC 214/2025', 'media', 'curto_prazo', '{"e2e":true}', '[]', 'solaris', 1.0,
   'active', NULL, 1, 1, 1, 0.95, 'Art. 11 LC 214/2025', 'E2E smoke test query Z-14', 'Risco controlado para suite E2E Z-14'),

  ('a133353f-c80c-4d43-af56-842c397049a3', 270001, 'E2E-SP-003', 'risk', 'split_payment',
   'E2E Z14 — Split Payment SP-003', 'Risco de teste E2E Z-14 — não usar em produção.',
   'Art. 12 LC 214/2025', 'media', 'medio_prazo', '{"e2e":true}', '[]', 'solaris', 1.0,
   'active', NULL, 1, 1, 1, 0.95, 'Art. 12 LC 214/2025', 'E2E smoke test query Z-14', 'Risco controlado para suite E2E Z-14'),

  ('0589512f-cfdb-404f-b8e9-a58c3c60ab1e', 270001, 'E2E-AZ-001', 'opportunity', 'aliquota_zero',
   'E2E Z14 — Aliquota Zero AZ-001', 'Risco de teste E2E Z-14 — não usar em produção.',
   'Art. 20 LC 214/2025', 'oportunidade', 'curto_prazo', '{"e2e":true}', '[]', 'solaris', 1.0,
   'active', NULL, 1, 1, 1, 0.95, 'Art. 20 LC 214/2025', 'E2E smoke test query Z-14', 'Risco controlado para suite E2E Z-14'),

  ('d09ae364-ebee-436a-b218-985c1fa5c8af', 270001, 'E2E-AZ-002', 'opportunity', 'aliquota_zero',
   'E2E Z14 — Aliquota Zero AZ-002', 'Risco de teste E2E Z-14 — não usar em produção.',
   'Art. 21 LC 214/2025', 'oportunidade', 'medio_prazo', '{"e2e":true}', '[]', 'solaris', 1.0,
   'active', NULL, 1, 1, 1, 0.95, 'Art. 21 LC 214/2025', 'E2E smoke test query Z-14', 'Risco controlado para suite E2E Z-14'),

  ('c24f5072-6065-4a0b-a311-29611c2d5ce3', 270001, 'E2E-CP-001', 'opportunity', 'credito_presumido',
   'E2E Z14 — Credito Presumido CP-001', 'Risco de teste E2E Z-14 — não usar em produção.',
   'Art. 30 LC 214/2025', 'oportunidade', 'curto_prazo', '{"e2e":true}', '[]', 'solaris', 1.0,
   'active', NULL, 1, 1, 1, 0.95, 'Art. 30 LC 214/2025', 'E2E smoke test query Z-14', 'Risco controlado para suite E2E Z-14'),

  ('6fc49348-8f3c-4fb9-ac75-bd3a337b0e16', 270001, 'E2E-CP-002', 'opportunity', 'credito_presumido',
   'E2E Z14 — Credito Presumido CP-002', 'Risco de teste E2E Z-14 — não usar em produção.',
   'Art. 31 LC 214/2025', 'oportunidade', 'medio_prazo', '{"e2e":true}', '[]', 'solaris', 1.0,
   'active', NULL, 1, 1, 1, 0.95, 'Art. 31 LC 214/2025', 'E2E smoke test query Z-14', 'Risco controlado para suite E2E Z-14')

ON DUPLICATE KEY UPDATE
  titulo = VALUES(titulo),
  status = 'active',
  approved_at = NULL;

-- TAREFA 4: Fixture CT-02 (action_plan base para edição)
INSERT INTO action_plans
  (id, project_id, risk_id, titulo, descricao, responsavel, prazo, status, created_by, updated_by)
VALUES
  ('90e41fa7-657c-47e6-a72e-d5e65cccadcd', 270001,
   '7c402eae-a0bc-4ef5-a0c1-ad2309b2ccdc',
   'E2E Z14 CT-02 BASE',
   'Plano de ação de teste E2E para CT-02 — não usar em produção.',
   'Equipe Solaris E2E', '60_dias', 'em_andamento', 1, 1)
ON DUPLICATE KEY UPDATE
  titulo = 'E2E Z14 CT-02 BASE',
  status = 'em_andamento',
  prazo = '60_dias';
