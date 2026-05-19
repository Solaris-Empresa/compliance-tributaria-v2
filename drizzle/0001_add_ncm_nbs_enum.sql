-- Migration: adicionar tabela_ncm_completa e nbs_completa ao enum lei
-- Pré-requisito para ingestão NCM/NBS (PR #1101)
-- Enum reconciliado contra banco real pós-#1091 (Nuclear Reset) em 2026-05-19
-- Padrão surgical ALTER (precedente 0094/0095) — sem drizzle-kit generate
ALTER TABLE `ragDocuments`
  MODIFY COLUMN `lei` enum(
    'lc214','lc227','lc224','lc123','ec132','lc116','lc87','conv_icms',
    'cg_ibs','rfb_cbs','resolucao_cgibs_1','resolucao_cgibs_2','resolucao_cgibs_3',
    'decreto12955','resolucao_cgibs_6','portaria_mf_cgibs_7','resolucao_cgibs_4',
    'resolucao_cgibs_5','nt_2025_002','nt_008_2026','resolucao_cgsn_140',
    'moc_cte_v4','moc_mdfe_v3',
    'tabela_ncm_completa','nbs_completa'
  ) NOT NULL;
-- Rollback: MODIFY COLUMN sem os 2 últimos valores (requer 0 chunks com esses slugs).
