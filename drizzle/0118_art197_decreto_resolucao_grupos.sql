-- migration: 0118_art197_decreto_resolucao_grupos.sql
-- D1-A — corrige cnaeGroups do Art. 197 (regime de máquinas agrícolas / produtor rural)
-- no decreto12955 (id=180251, estava vazio) e na resolucao_cgibs_6 (id=420247, faltava
-- o grupo 28), alinhando ambos à mesma cadeia. Grupos definidos pelo parecer Dr. José
-- Swami (D0): 01,02,03 (agricultura/pecuária) · 10,11,12,23 (cadeia) · 28 (fabricante de
-- máquinas — caso 2700001) · 46,47 (comércio que vende a produtor rural).
--
-- NÃO toca lc214 Art. 197 (id=255) — é artigo DISTINTO (serviços financeiros,
-- cnaeGroups='64,65,66' CORRETO). Confirmado no Gate 0 (Manus, 2026-05-27).
--
-- Idempotente (guard WHERE cnaeGroups <> alvo). Já aplicado em prod por Manus
-- (smoke PASS 2026-05-27); este arquivo dá paridade repo↔DB (Lição #71) e cobre
-- db:reset / novos ambientes. Filename sem "rag"/"cnae" (ORQ-FILENAME-01 / Lição #92).

-- decreto12955 Art. 197 (id=180251): "" → cadeia completa
UPDATE ragDocuments
  SET cnaeGroups = '01,02,03,10,11,12,23,28,46,47'
  WHERE id = 180251
    AND cnaeGroups <> '01,02,03,10,11,12,23,28,46,47';

-- resolucao_cgibs_6 Art. 197 (id=420247): adicionar grupo 28
UPDATE ragDocuments
  SET cnaeGroups = '01,02,03,10,11,12,23,28,46,47'
  WHERE id = 420247
    AND cnaeGroups <> '01,02,03,10,11,12,23,28,46,47';

-- Verificação (DoD):
--   SELECT id, cnaeGroups FROM ragDocuments WHERE id IN (180251, 420247);
--   -> ambos '01,02,03,10,11,12,23,28,46,47'

-- DOWN (rollback): restaurar valores anteriores
-- UPDATE ragDocuments SET cnaeGroups = '' WHERE id = 180251;
-- UPDATE ragDocuments SET cnaeGroups = '01,02,03,10,11,12,23,46,47' WHERE id = 420247;
