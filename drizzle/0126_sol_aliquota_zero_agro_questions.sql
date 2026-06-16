-- migration: 0126_sol_aliquota_zero_agro_questions.sql
-- (nº 0126 — 0125 já em main)
-- Issue: #1439a (GATE-NCM-NBS / Art. 197) · curadoria jurídica Dr. José (15/06/2026)
-- Cria 2 perguntas SOLARIS do gate Art. 110 LC 214/2025 c/c Art. 197 Decreto 12.955/2026
-- (alíquota zero IBS/CBS em bens de capital agrícolas). Alimentam o gate do engine (#1439b).
--
-- Filename SEM "rag"/"cnae" (REGRA-ORQ-FILENAME-01 / Lição #92 — evita falso-positivo do guard).
-- Migration SÓ-DADOS (INSERT) — não toca drizzle/schema.ts (todas as colunas já existem).
--
-- Colunas EXATAS confirmadas via Gate 0 (drizzle/schema.ts:1678-1758, 15/06/2026):
--   texto NOT NULL · categoria NOT NULL (sem default → fornecido) · risk_category_code (engine link)
--   cnae_groups (JSON; ["28"]=grupo 28 por prefixo, db.ts:1395) · obrigatorio/ativo tinyint def 1
--   fonte def 'solaris' · criado_em bigint NOT NULL (sem default → fornecido)
--   classification_scope/mapping_review_status enums · lei_ref(20)/artigo_ref(50) · codigo varchar(10) SOL-NNN
--
-- Curadoria Dr. José (correção bloqueante vs proposta do Consultor):
--   • Sujeito = produtor rural NÃO CONTRIBUINTE (NÃO "pessoa física" — restrição inexistente na norma)
--   • Objeto = Tabela II do Anexo IV do Decreto 12.955/2026 (NÃO "bens de capital" genérico)
--   • 2 perguntas separadas: gate de produto (SOL-058) + gate de destinatário (SOL-059)
--
-- mapping_review_status='approved_legal' → EXIBIDA (db.ts:1381 inArray[curated_internal,approved_legal]).
-- Codigos SOL-058/SOL-059 = próximos numéricos livres (Manus: MAX=SOL-057). Convenção SOL-NNN mantida
--   (grep confirmou ZERO códigos semânticos no corpus — premissa "AGR-01 já usado" do despacho refutada).
-- Idempotente (guard NOT EXISTS por codigo — codigo não tem unique key). Reversível (DOWN abaixo).

-- SOL-058 — Gate de PRODUTO (bens elegíveis Tabela II Anexo IV)
INSERT INTO solaris_questions
  (texto, categoria, risk_category_code, cnae_groups, obrigatorio, ativo, fonte, criado_em,
   classification_scope, mapping_review_status, lei_ref, artigo_ref, codigo, titulo, topicos, observacao)
SELECT
  'A empresa fornece tratores, máquinas, implementos agrícolas ou demais bens relacionados na Tabela II do Anexo IV do Decreto 12.955/2026?',
  'aliquota_zero_bens_capital_agro', 'aliquota_zero_bens_capital_agro', '["28"]', 1, 1, 'solaris', FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000),
  'risk_engine', 'approved_legal', 'lc214', 'Art. 110 c/c Art. 197 Dec 12.955/2026', 'SOL-058',
  'Alíquota zero agro — bens (Tabela II Anexo IV)',
  'IBS,CBS,aliquota zero,bens de capital,agro,Tabela II Anexo IV,Art. 197,Art. 110',
  '#1439a (gate produto). Curadoria Dr. José: objeto = Tabela II do Anexo IV do Decreto 12.955/2026 (não "bens de capital" genérico). Base legal: Art. 110 LC 214/2025 c/c Art. 197 Decreto 12.955/2026. Codigo numerico SOL-058 (convencao SOL-NNN; semantico AGR-01 nao adotado — zero precedente no corpus).'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM solaris_questions WHERE codigo = 'SOL-058');

-- SOL-059 — Gate de DESTINATÁRIO (produtor rural não contribuinte)
INSERT INTO solaris_questions
  (texto, categoria, risk_category_code, cnae_groups, obrigatorio, ativo, fonte, criado_em,
   classification_scope, mapping_review_status, lei_ref, artigo_ref, codigo, titulo, topicos, observacao)
SELECT
  'Os destinatários dessas operações são produtores rurais não contribuintes do IBS e da CBS?',
  'aliquota_zero_bens_capital_agro', 'aliquota_zero_bens_capital_agro', '["28"]', 1, 1, 'solaris', FLOOR(UNIX_TIMESTAMP(NOW(3)) * 1000),
  'risk_engine', 'approved_legal', 'lc214', 'Art. 110 LC 214 (condição destinatário)', 'SOL-059',
  'Alíquota zero agro — destinatário não contribuinte',
  'IBS,CBS,aliquota zero,destinatario,produtor rural,nao contribuinte,Art. 110,Art. 197',
  '#1439a (gate destinatário). Curadoria Dr. José: sujeito = produtor rural NÃO CONTRIBUINTE (não "pessoa física" — restrição inexistente na norma). Base legal: Art. 110 LC 214/2025 c/c Art. 197 Decreto 12.955/2026 (condição de destinatário).'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM solaris_questions WHERE codigo = 'SOL-059');

-- ROLLBACK (DOWN) — Reversível:
-- DELETE FROM solaris_questions WHERE codigo IN ('SOL-058', 'SOL-059') AND fonte = 'solaris';
