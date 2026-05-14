-- CORPUS-RFC-008 — Issue #1074 — P0 fast-track (REGRA-ORQ-11)
--
-- Adiciona 3 valores ao enum `lei` da tabela `ragDocuments` para suportar a
-- ingestão de:
--   • decreto12955          — Decreto 12.955/2026 (regulamento CBS, Art. 1-620)
--   • resolucao_cgibs_6     — Resolução CGIBS 6/2026 (apenas Livro II, Art. 467-615)
--   • portaria_mf_cgibs_7   — Portaria Conjunta MF/CGIBS 7/2026 (Art. 1-2)
--
-- Migration cirúrgica: emite SOMENTE o ALTER da coluna. O `pnpm drizzle-kit
-- generate` produziu um catch-up de estado massivo (tabelas e colunas já
-- presentes em produção) por causa de meta journal stale — tech debt
-- pré-existente, não introduzido por esta sprint.
--
-- Aplicação em produção: Manus executa este arquivo diretamente.
-- Rollback: ALTER COLUMN para remover os 3 valores (requer corpus vazio).

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
    'portaria_mf_cgibs_7'
  ) NOT NULL;
