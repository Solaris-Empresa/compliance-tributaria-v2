-- Corpus Onda 2 — Infraestrutura (sem conteúdo) — 2026-05-19
--
-- Adiciona 7 valores ao enum `lei` da tabela `ragDocuments` para suportar a
-- futura ingestão (Onda 2) de:
--   • moc_cte_v4         — MOC CT-e v4.00 (Visão Geral)
--   • moc_cte_anexo1_v4  — MOC CT-e Anexo I (Leiaute e Regras de Validação)
--   • moc_cte_anexo2_v4  — MOC CT-e Anexo II (Manual do DACTE)
--   • moc_mdfe_v3        — MOC MDF-e v3.00a (Visão Geral)
--   • moc_mdfe_anexo1_v3 — MOC MDF-e Anexo I (Leiaute)
--   • moc_mdfe_anexo2_v3 — MOC MDF-e Anexo II (DAMDFE)
--   • resolucao_cgsn_140 — Resolução CGSN 140/2018 (Simples Nacional)
--
-- NÃO incluído: lc123 (já presente no enum desde Sprint H — migration 0055).
--
-- IMPORTANTE: esta migration apenas habilita os slugs no enum. Nenhum chunk de
-- conteúdo é inserido aqui — o conteúdo legal aguarda extração de .txt canônico
-- pelo Manus (REGRA ANTI-ALUCINAÇÃO). Os build scripts scaffold em
-- scripts/build-corpus-*.ts lançam erro se o .txt correspondente não existir.
--
-- Padrão seguido: drizzle/0094_corpus_freshness_lei_enum.sql (CORPUS-RFC-008).
-- Migration cirúrgica: emite SOMENTE o ALTER da coluna.
--
-- NOTA DE SINCRONIA: o enum correspondente em drizzle/schema.ts NÃO é alterado
-- neste PR (infra/scaffold). A sincronização do schema.ts com estes 7 valores
-- é deferida para o PR de ingestão (onde há chunks e o RAG Quality Gate é
-- legitimamente respondível). Drift temporário schema.ts↔DB é aceito e
-- documentado — consistente com o débito de meta journal já citado em 0094.
--
-- Aplicação em produção: Manus executa este arquivo diretamente.
-- Rollback: ALTER COLUMN para remover os 7 valores (requer 0 chunks com esses slugs).

ALTER TABLE `ragDocuments`
  MODIFY COLUMN `lei` enum(
    'lc214',
    'ec132',
    'lc227',
    'lc224',
    'lc116',
    'lc87',
    'cg_ibs',
    'rfb_cbs',
    'conv_icms',
    'lc123',
    'resolucao_cgibs_1',
    'resolucao_cgibs_2',
    'resolucao_cgibs_3',
    'decreto12955',
    'resolucao_cgibs_6',
    'portaria_mf_cgibs_7',
    'moc_cte_v4',
    'moc_cte_anexo1_v4',
    'moc_cte_anexo2_v4',
    'moc_mdfe_v3',
    'moc_mdfe_anexo1_v3',
    'moc_mdfe_anexo2_v3',
    'resolucao_cgsn_140'
  ) NOT NULL;
