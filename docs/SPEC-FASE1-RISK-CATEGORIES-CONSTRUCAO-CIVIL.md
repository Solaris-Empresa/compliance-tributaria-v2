# SPEC — Fase 1: 9 Categorias de Risco Construção Civil em `risk_categories`

**Data:** 29/06/2026  
**Gate jurídico:** Dr. José (Despacho 29/06/2026 14h35) — 7 aprovadas + B3 corrigida + B7 corrigida  
**D3:** A — A3 descartada (backlog P3)  
**Responsável implementação:** CC  
**Desbloqueado por:** merge PR #1633 (emenda B3/B7/B8) + confirmação formal gate Dr. José

---

## Resumo

Inserir **9 novas linhas** na tabela `risk_categories` para cobrir os 13 riscos do Dr. José identificados no documento setorial (Principaisriscosparaumaconstrutora.pdf).

**Sem alteração de schema** — a tabela já possui todas as colunas necessárias.  
**Sem migration DDL** — apenas INSERT (seed de dados).  
**Classe de risco:** B (Controlado) — requer aprovação P.O. para INSERT em produção.

---

## Categorias a inserir (9)

### Grupo B — Novas categorias setoriais (construção civil CNAE 41/42/43/68)

| # | codigo | nome | severidade | urgencia | tipo | artigo_base | lei_codigo |
|---|--------|------|------------|----------|------|-------------|------------|
| B1 | `risco_redutor_ajuste` | Perda do Redutor de Ajuste | alta | imediata | risk | Art. 257 LC 214 + Arts. 360-362 Dec. 12.955 | LC-214-2025 |
| B2 | `risco_sinter_avaliacao` | Avaliação SINTER — Risco de Base de Cálculo | alta | imediata | risk | Art. 256 LC 214 + Arts. 363-364 Dec. 12.955 | LC-214-2025 |
| B3 | `risco_permuta_imoveis` | Permuta de Imóveis — Sujeição Passiva | alta | curto_prazo | risk | Art. 252 §2º I e §5º LC 214 + Arts. 365-366 Dec. 12.955 | LC-214-2025 |
| B4 | `risco_controle_empreendimento` | Controle por Empreendimento — Apuração Segregada | alta | imediata | risk | Art. 270 LC 214 + Arts. 370-371 Dec. 12.955 | LC-214-2025 |
| B5 | `risco_cib_cadastro` | CIB — Cadastro Imobiliário de Bens | alta | imediata | risk | Arts. 265-266 LC 214 + Arts. 367-368 Dec. 12.955 | LC-214-2025 |
| B6 | `risco_custos_historicos` | Custos Históricos 2027 — Base de Crédito | alta | curto_prazo | risk | Art. 258 LC 214 + Arts. 361-362 Dec. 12.955 | LC-214-2025 |
| B7 | `risco_tributacao_parcelas` | Tributação por Parcelas — Momento de Incidência | media | medio_prazo | risk | Art. 262 LC 214 + Art. 372 Dec. 12.955 | LC-214-2025 |
| B8 | `risco_sujeicao_passiva_scp` | Sujeição Passiva em SCP e Contratos de Parceria | media | medio_prazo | risk | Arts. 263-264 LC 214 + Arts. 365-366 Dec. 12.955 | LC-214-2025 |
| A1* | `risco_art_269_270` | Obrigação — Cadastro e Apuração por Empreendimento | media | curto_prazo | risk | Art. 269 LC 214 + Art. 369 Dec. 12.955 | LC-214-2025 |

> *A1 (`risco_art_269_270`) já existe no banco (id=6540003). Verificar se precisa de UPDATE de severidade/urgência ou apenas manter.

---

## SQL de seed (INSERT)

```sql
-- Fase 1 — 9 categorias construção civil
-- Aprovação: P.O. Uires Tapajós (gate jurídico Dr. José 29/06/2026)
-- Escopo: CNAE 41xx, 42xx, 43xx, 68xx
-- vigencia_inicio: 2027-01-01 (início da transição IBS/CBS para construção civil)

INSERT INTO risk_categories (
  codigo, nome, severidade, urgencia, tipo,
  artigo_base, lei_codigo,
  vigencia_inicio, status, origem, escopo,
  aprovado_por, aprovado_at,
  descricao, normative_bundle, legal_confidence, normative_status
) VALUES
-- B1
('risco_redutor_ajuste',
 'Perda do Redutor de Ajuste',
 'alta', 'imediata', 'risk',
 'Art. 257 LC 214 + Arts. 360-362 Dec. 12.955', 'LC-214-2025',
 '2027-01-01', 'ativo', 'lei_federal', 'setorial',
 'Dr. José', NOW(),
 'O Redutor de Ajuste (Art. 257) é aplicado sobre a base de cálculo do IBS/CBS nas operações com bens imóveis. Construtoras que não controlarem corretamente os custos de construção perdem o direito ao redutor, aumentando a carga tributária.',
 JSON_ARRAY('Art. 257 LC 214/2025', 'Art. 258 LC 214/2025', 'Art. 360 Dec. 12.955/2026', 'Art. 361 Dec. 12.955/2026', 'Art. 362 Dec. 12.955/2026'),
 'high', 'confirmed'),

-- B2
('risco_sinter_avaliacao',
 'Avaliação SINTER — Risco de Base de Cálculo',
 'alta', 'imediata', 'risk',
 'Art. 256 LC 214 + Arts. 363-364 Dec. 12.955', 'LC-214-2025',
 '2027-01-01', 'ativo', 'lei_federal', 'setorial',
 'Dr. José', NOW(),
 'O SINTER (Sistema Nacional de Gestão de Informações Territoriais) será usado como referência para avaliação de imóveis. Divergências entre o valor declarado e o valor SINTER podem resultar em autuações e recolhimento complementar.',
 JSON_ARRAY('Art. 256 LC 214/2025', 'Art. 363 Dec. 12.955/2026', 'Art. 364 Dec. 12.955/2026'),
 'high', 'confirmed'),

-- B3
('risco_permuta_imoveis',
 'Permuta de Imóveis — Sujeição Passiva',
 'alta', 'curto_prazo', 'risk',
 'Art. 252 §2º I e §5º LC 214 + Arts. 365-366 Dec. 12.955', 'LC-214-2025',
 '2027-01-01', 'ativo', 'lei_federal', 'setorial',
 'Dr. José', NOW(),
 'Nas permutas entre bens imóveis (Art. 252 §2º I e §5º), a sujeição passiva do IBS/CBS recai sobre ambas as partes. Construtoras que realizam permutas com terrenos (prática comum) precisam mapear e controlar a incidência bilateral.',
 JSON_ARRAY('Art. 252 §2º I LC 214/2025', 'Art. 252 §5º LC 214/2025', 'Art. 365 Dec. 12.955/2026', 'Art. 366 Dec. 12.955/2026'),
 'high', 'confirmed'),

-- B4
('risco_controle_empreendimento',
 'Controle por Empreendimento — Apuração Segregada',
 'alta', 'imediata', 'risk',
 'Art. 270 LC 214 + Arts. 370-371 Dec. 12.955', 'LC-214-2025',
 '2027-01-01', 'ativo', 'lei_federal', 'setorial',
 'Dr. José', NOW(),
 'A apuração do IBS/CBS deve ser feita por empreendimento (Art. 270). Construtoras com múltiplos empreendimentos simultâneos precisam de controles segregados por obra/empreendimento para evitar compensações indevidas.',
 JSON_ARRAY('Art. 270 LC 214/2025', 'Art. 370 Dec. 12.955/2026', 'Art. 371 Dec. 12.955/2026'),
 'high', 'confirmed'),

-- B5
('risco_cib_cadastro',
 'CIB — Cadastro Imobiliário de Bens',
 'alta', 'imediata', 'risk',
 'Arts. 265-266 LC 214 + Arts. 367-368 Dec. 12.955', 'LC-214-2025',
 '2027-01-01', 'ativo', 'lei_federal', 'setorial',
 'Dr. José', NOW(),
 'O CIB (Cadastro Imobiliário de Bens) é obrigatório para construtoras (Arts. 265-266). A ausência de cadastro ou cadastro incorreto impede o aproveitamento de créditos e pode resultar em autuações.',
 JSON_ARRAY('Art. 265 LC 214/2025', 'Art. 266 LC 214/2025', 'Art. 367 Dec. 12.955/2026', 'Art. 368 Dec. 12.955/2026'),
 'high', 'confirmed'),

-- B6
('risco_custos_historicos',
 'Custos Históricos 2027 — Base de Crédito',
 'alta', 'curto_prazo', 'risk',
 'Art. 258 LC 214 + Arts. 361-362 Dec. 12.955', 'LC-214-2025',
 '2027-01-01', 'ativo', 'lei_federal', 'setorial',
 'Dr. José', NOW(),
 'Os custos históricos de construção até 31/12/2026 serão a base para o cálculo do Redutor de Ajuste em 2027. Construtoras que não documentarem adequadamente os custos históricos perderão parte do redutor.',
 JSON_ARRAY('Art. 258 LC 214/2025', 'Art. 361 Dec. 12.955/2026', 'Art. 362 Dec. 12.955/2026'),
 'high', 'confirmed'),

-- B7
('risco_tributacao_parcelas',
 'Tributação por Parcelas — Momento de Incidência',
 'media', 'medio_prazo', 'risk',
 'Art. 262 LC 214 + Art. 372 Dec. 12.955', 'LC-214-2025',
 '2027-01-01', 'ativo', 'lei_federal', 'setorial',
 'Dr. José', NOW(),
 'Nas vendas parceladas de imóveis (Art. 262), o IBS/CBS incide no momento de cada parcela. Construtoras precisam adaptar contratos e sistemas de faturamento para apurar corretamente o tributo por parcela recebida.',
 JSON_ARRAY('Art. 262 LC 214/2025', 'Art. 372 Dec. 12.955/2026'),
 'high', 'confirmed'),

-- B8
('risco_sujeicao_passiva_scp',
 'Sujeição Passiva em SCP e Contratos de Parceria',
 'media', 'medio_prazo', 'risk',
 'Arts. 263-264 LC 214 + Arts. 365-366 Dec. 12.955', 'LC-214-2025',
 '2027-01-01', 'ativo', 'lei_federal', 'setorial',
 'Dr. José', NOW(),
 'Em Sociedades em Conta de Participação (SCP) e contratos de parceria (Arts. 263-264), a sujeição passiva do IBS/CBS pode recair sobre o sócio ostensivo ou sobre a SCP. Construtoras que operam via SCP precisam definir e documentar a sujeição passiva.',
 JSON_ARRAY('Art. 263 LC 214/2025', 'Art. 264 LC 214/2025', 'Art. 365 Dec. 12.955/2026', 'Art. 366 Dec. 12.955/2026'),
 'high', 'confirmed');
```

---

## Verificação pré-INSERT (READ-ONLY)

```sql
-- Verificar duplicatas antes do INSERT
SELECT codigo FROM risk_categories
WHERE codigo IN (
  'risco_redutor_ajuste', 'risco_sinter_avaliacao', 'risco_permuta_imoveis',
  'risco_controle_empreendimento', 'risco_cib_cadastro', 'risco_custos_historicos',
  'risco_tributacao_parcelas', 'risco_sujeicao_passiva_scp'
);
-- Esperado: 0 rows (nenhuma duplicata)

-- Verificar A1 existente
SELECT id, codigo, severidade, urgencia FROM risk_categories
WHERE codigo = 'risco_art_269_270';
-- Esperado: 1 row (id=6540003, severidade=media, urgencia=curto_prazo)
```

---

## Testes (DoD)

```typescript
// server/lib/risk-categories-fase1.test.ts
// Verificar que as 9 categorias foram inseridas corretamente

describe('Fase 1 — risk_categories construção civil', () => {
  const EXPECTED_CODIGOS = [
    'risco_redutor_ajuste',
    'risco_sinter_avaliacao',
    'risco_permuta_imoveis',
    'risco_controle_empreendimento',
    'risco_cib_cadastro',
    'risco_custos_historicos',
    'risco_tributacao_parcelas',
    'risco_sujeicao_passiva_scp',
    'risco_art_269_270', // já existente
  ];

  it('deve ter 9 categorias setoriais de construção civil ativas', async () => {
    const rows = await db.select().from(riskCategories)
      .where(inArray(riskCategories.codigo, EXPECTED_CODIGOS));
    expect(rows).toHaveLength(9);
    rows.forEach(r => {
      expect(r.status).toBe('ativo');
      expect(r.escopo).toBe('setorial');
    });
  });

  it('B1 risco_redutor_ajuste deve ter severidade=alta e urgencia=imediata', async () => {
    const [row] = await db.select().from(riskCategories)
      .where(eq(riskCategories.codigo, 'risco_redutor_ajuste'));
    expect(row.severidade).toBe('alta');
    expect(row.urgencia).toBe('imediata');
    expect(row.tipo).toBe('risk');
  });

  it('B3 risco_permuta_imoveis deve ter artigo_base com Art. 252 §2º', async () => {
    const [row] = await db.select().from(riskCategories)
      .where(eq(riskCategories.codigo, 'risco_permuta_imoveis'));
    expect(row.artigoBase).toContain('252');
  });

  it('B8 deve usar codigo risco_sujeicao_passiva_scp (não risco_revisao_contratos)', async () => {
    const [old] = await db.select().from(riskCategories)
      .where(eq(riskCategories.codigo, 'risco_revisao_contratos'));
    expect(old).toBeUndefined(); // nome antigo não deve existir
    const [novo] = await db.select().from(riskCategories)
      .where(eq(riskCategories.codigo, 'risco_sujeicao_passiva_scp'));
    expect(novo).toBeDefined();
  });
});
```

---

## Dependências para Fase 3a (após Fase 1)

Após o INSERT das 9 categorias, a Fase 3a pode criar as 8 regras Path B em `normative-inference.ts`:

| Regra | Categoria | Condição de disparo |
|-------|-----------|---------------------|
| R-B1 | `risco_redutor_ajuste` | CNAE 41/42/43/68 + regime imóveis |
| R-B2 | `risco_sinter_avaliacao` | CNAE 41/42/43/68 + regime imóveis |
| R-B3 | `risco_permuta_imoveis` | CNAE 41/42/43/68 + tem_permuta=true (Path A) |
| R-B4 | `risco_controle_empreendimento` | CNAE 41/42/43/68 + múltiplos empreendimentos |
| R-B5 | `risco_cib_cadastro` | CNAE 41/42/43/68 + regime imóveis |
| R-B6 | `risco_custos_historicos` | CNAE 41/42/43/68 + vigência 2027 |
| R-B7 | `risco_tributacao_parcelas` | CNAE 41/42/43/68 + vendas parceladas |
| R-B8 | `risco_sujeicao_passiva_scp` | CNAE 41/42/43/68 + opera_via_scp=true (Path A) |

---

## Checklist de execução (CC)

- [ ] Verificar duplicatas (READ-ONLY)
- [ ] Executar INSERT das 8 novas categorias (B1-B8)
- [ ] Verificar A1 (`risco_art_269_270`) — UPDATE se necessário
- [ ] Executar testes DoD
- [ ] Abrir PR com evidência JSON
- [ ] Aguardar merge + aprovação P.O. para Fase 3a
