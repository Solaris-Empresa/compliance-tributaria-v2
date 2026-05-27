-- migration: 0117_artigo_pai_anexo_link.sql
-- D2-DETECTOR (PR-A) — vincula as partes do Art. 620 (Decreto 12.955, Anexo V de
-- máquinas agrícolas) ao artigo-pai da LC 214 (Art. 197). Permite que
-- isSetorialArtigo reconheça esses chunks como setoriais VIA O PAI (197 ∈ [128,260])
-- em vez de pelo número do próprio artigo (620, fora do range) — substitui hardcode
-- de número por metadado data-driven (REGRA-ORQ-32).
--
-- Gate 0 empírico (Manus, 2026-05-27): coluna artigo_pai NÃO existia em ragDocuments;
-- strings exatas confirmadas (IDs 180823-180827, formato 'Art. 620 (parte XX)').
-- Parecer D0 (Dr. José Swami): Art. 197 aplica ao fabricante CNAE 2833. Partes 64-68
-- incluídas (decisão P.O. — conservadorismo: falso-negativo é pior que falso-positivo).
--
-- Filename sem "rag" (ORQ-FILENAME-01 / Lição #81). Reversível (DROP COLUMN).
-- UPDATE idempotente (mesmo valor; re-execução não altera nada).

-- D2.a — Schema (ADD COLUMN nullable, idempotente)
ALTER TABLE ragDocuments
  ADD COLUMN IF NOT EXISTS artigo_pai varchar(300) NULL;

-- D2.b — Dado (5 registros: Art. 620 partes 64-68 → Art. 197)
UPDATE ragDocuments
  SET artigo_pai = 'Art. 197'
  WHERE lei = 'decreto12955'
    AND artigo IN (
      'Art. 620 (parte 64)',
      'Art. 620 (parte 65)',
      'Art. 620 (parte 66)',
      'Art. 620 (parte 67)',
      'Art. 620 (parte 68)'
    );

-- Verificação (DoD):
--   SHOW COLUMNS FROM ragDocuments LIKE 'artigo_pai';                -- => 1 linha
--   SELECT COUNT(*) FROM ragDocuments WHERE artigo_pai = 'Art. 197'; -- => 5

-- DOWN (rollback):
-- ALTER TABLE ragDocuments DROP COLUMN artigo_pai;
