-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0133 — Correção de artigo_base por SUB-DISPOSITIVO (caput/§/c-c)
--
-- Issue: #1691 · Origem: OVERLAP-RISK-01 (auditoria 11100001, 02/07/2026)
-- Parecer convergido (Manus/Dr. José + Consultor ChatGPT): MANTER risco_art_269_270
-- e resolver a duplicação do Art. 270 por citação de sub-dispositivo (caput vs §único).
--
-- Gate 0: risk_categories.artigo_base é varchar(255) free-text e JÁ contém
-- sub-dispositivos em produção ("Art. 255 §5º", "Art. 252 §2º I e §5º") — suportado.
--
-- Migração de banco. Reversível (UPDATE — valores antigos no DOWN). Testado em
-- ambiente isolado. NÃO é DDL (nenhum ALTER/DROP).
-- ═══════════════════════════════════════════════════════════════════════════

-- UP — 5 correções de artigo_base

-- 1) Art. 270 fica APENAS o caput aqui (apuração por empreendimento).
UPDATE risk_categories SET
  artigo_base = 'Art. 270, caput, LC 214/2025',
  updated_at  = NOW()
WHERE codigo = 'risco_controle_empreendimento';
-- Antes: 'Art. 270 LC 214/2025' (artigo inteiro → duplicava o §único de art_269_270)

-- 2) art_269_270 = cadastro da obra (269) + documento fiscal (270 §único).
--    Restaura o "270" que o motor data-driven havia perdido; qualifica como §único.
UPDATE risk_categories SET
  artigo_base = 'Art. 269 e Art. 270, § único, LC 214/2025',
  updated_at  = NOW()
WHERE codigo = 'risco_art_269_270';
-- Antes (data-driven): 'Art. 269' (perdeu o 270)

-- 3) Oportunidade de redução de 50%: Art. 261 (redução) c/c Art. 251 (institui o regime).
UPDATE risk_categories SET
  artigo_base = 'Art. 261 c/c Art. 251 LC 214/2025',
  updated_at  = NOW()
WHERE codigo = 'regime_especifico_imoveis';
-- Antes (data-driven): 'Art. 251' (institui o regime, sem o percentual de redução)

-- 4) Confissão automática — 2 vetores: apuração (45 §§4-5) + documento fiscal (60 §1º).
--    ⚠️ DoD (#1691/#1692): confirmar via pdftotext do PDF LC 214 as 3 citações
--       literais (Art. 45 §4, §5, Art. 60 §1º) ANTES de rodar esta migration.
UPDATE risk_categories SET
  artigo_base = 'Art. 45 §§ 4º e 5º c/c Art. 60 §1º LC 214/2025',
  updated_at  = NOW()
WHERE codigo = 'confissao_automatica';
-- Antes: 'Art. 45 LC 214/2025' (incompleto — faltava §§ e o Art. 60 §1º)

-- 5) risco_cib_cadastro: SEM mudança (Arts. 265-266 permanecem — Art. 269 fica
--    em categoria própria art_269_270, por decisão do parecer). Documentado aqui
--    para rastreabilidade; nenhum UPDATE.

-- 6) Re-escopo do TÍTULO de art_269_270 (data-driven lê titulo_template): remove
--    "apuração" (que agora é só de controle_empreendimento) — passa a ser
--    cadastro da obra + documento fiscal.
UPDATE cnae_categoria_map SET
  titulo_template = 'Obrigação de cadastro da obra (CIB) e indicação do número do cadastro em documento fiscal ({op})'
WHERE categoria_codigo = 'risco_art_269_270';
-- Antes (0131): '...cadastro de obra (CIB) e apuração por empreendimento...'

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN (reversão manual — valores anteriores)
-- UPDATE risk_categories SET artigo_base='Art. 270 LC 214/2025' WHERE codigo='risco_controle_empreendimento';
-- UPDATE risk_categories SET artigo_base='Art. 269'            WHERE codigo='risco_art_269_270';
-- UPDATE risk_categories SET artigo_base='Art. 251'            WHERE codigo='regime_especifico_imoveis';
-- UPDATE risk_categories SET artigo_base='Art. 45 LC 214/2025' WHERE codigo='confissao_automatica';
-- UPDATE cnae_categoria_map SET titulo_template='Obrigação de cadastro de obra (CIB) e apuração por empreendimento de construção civil ({op})' WHERE categoria_codigo='risco_art_269_270';
-- ═══════════════════════════════════════════════════════════════════════════
