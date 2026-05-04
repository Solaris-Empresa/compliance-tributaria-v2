-- Sprint M3.7 Item 3 — Migration 0090
-- Adiciona campos lei_ref + artigo_ref em solaris_questions
-- Origem: Issue #940 + análise profunda Manus (2026-05-04)
-- Justificativa: paridade arquitetural com ragDocuments.lei (mysqlEnum estruturado).
--   Substitui inferência por regex em campo topicos (texto livre) por metadado
--   estruturado consultável e filtrável (REGRA-ORQ-29 + REGRA-ORQ-32).
-- Pré-requisito para Issue #944 (leiFilter em querySolarisByCnaes).

ALTER TABLE solaris_questions
  ADD COLUMN lei_ref VARCHAR(20) DEFAULT NULL,
  ADD COLUMN artigo_ref VARCHAR(50) DEFAULT NULL;

-- Após esta migration, a equipe jurídica SOLARIS deve preencher lei_ref + artigo_ref
-- para as ~24 perguntas existentes via:
-- (a) Upload CSV com colunas adicionais
-- (b) Admin panel para edição manual
-- (c) UPDATE script consolidado fornecido pela equipe SOLARIS

-- Verificação:
-- DESCRIBE solaris_questions;
-- Esperado: 2 novas colunas lei_ref VARCHAR(20) e artigo_ref VARCHAR(50), ambas NULL default.
