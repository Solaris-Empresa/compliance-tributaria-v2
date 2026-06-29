# Revisão do Pacote de Curadoria #1624
## Verificação contra Fonte Primária (banco RAG + código-fonte)

**De:** Manus (implementador)  
**Para:** CC (Orquestrador) + Dr. José  
**Data:** 2026-06-29  
**Contexto:** D-GOV-2 — Despacho 29/06/2026 13h51  
**Fonte:** banco RAG produção (READ-ONLY) + `ragDocuments` HEAD `bdec3ccb6757`

---

## Resultado da Verificação: 3 Divergências Encontradas

### ✅ Categorias com artigo e cnaeGroups CORRETOS no banco

| Categoria | Artigo | cnaeGroups no banco | Status |
|-----------|--------|---------------------|--------|
| B1 `risco_redutor_ajuste` | Art. 257 LC 214 | `41,42,43,68` | ✅ CORRETO |
| B2 `risco_sinter_avaliacao` | Art. 256 LC 214 | `41,42,43,68` | ✅ CORRETO |
| B3 `risco_permuta_imoveis` | Art. 259 LC 214 | `41,42,43,68` | ✅ CORRETO |
| B4 `risco_controle_empreendimento` | Art. 270 LC 214 | `41,42,43,68` | ✅ CORRETO |
| B5 `risco_cib_cadastro` | Arts. 265–266 LC 214 | `41,42,43,68` | ✅ CORRETO |
| B6 `risco_custos_historicos` | Art. 258 LC 214 | `41,42,43,68` | ✅ CORRETO |
| B8 `risco_revisao_contratos` | Arts. 263–264 LC 214 | `41,42,43,68` | ✅ CORRETO |
| A1 `risco_art_269_270` | Art. 269 LC 214 | `41,42,43,68` | ✅ CORRETO |
| A2 `regime_especifico_imoveis` | Art. 251 LC 214 | `41,42,43,68` | ✅ CORRETO |

---

## ⚠️ Divergências — Requerem Decisão do Dr. José

### DIV-1 — B7 `risco_tributacao_parcelas` (Art. 262)

**Problema:** O banco tem **3 chunks distintos** para "Art. 262", com cnaeGroups diferentes:

| Chunk | Lei | cnaeGroups | Conteúdo (início) |
|-------|-----|------------|-------------------|
| Chunk A | LC 214 | `64,65,66` (financeiro) | "Na incorporação imobiliária e no parcelamento de solo, o IBS e a CBS i..." |
| Chunk B | LC 214 (combustíveis) | `VAZIO` | "As alíquotas da CBS aplicáveis aos combustíveis..." |
| Chunk C | LC 214 (combustíveis) | `VAZIO` | "As alíquotas do IBS aplicáveis aos combustíveis..." |

**Divergência:** O único chunk de Art. 262 sobre incorporação imobiliária/parcelamento de solo está classificado como `cnaeGroups = '64,65,66'` (setor financeiro), **não** `'41,42,43,68'` (construção civil).

**Pergunta ao Dr. José:**
- O Art. 262 sobre parcelamento de solo/incorporação imobiliária é aplicável ao setor de construção civil (CNAE 41/42/43/68) ou apenas ao setor financeiro (64/65/66)?
- Se for construção civil: o cnaeGroups deve ser corrigido para `'41,42,43,68'` (UPDATE no banco — requer aprovação P.O.).
- Se for financeiro: a categoria B7 deve ser removida do pacote ou ter seu artigo-fonte revisado.

**Impacto:** Se mantido como `64,65,66`, o RAG não recuperará este artigo para construtoras → categoria B7 não funcionará para CNAE 41/42/43/68.

---

### DIV-2 — A3 `regime_diferenciado_reabilitacao_urbana` (Art. 234)

**Problema:** O banco tem **3 chunks distintos** para "Art. 234", com cnaeGroups diferentes:

| Chunk | Lei | cnaeGroups | Conteúdo (início) |
|-------|-----|------------|-------------------|
| Chunk A | LC 214 | `86,87,88,45,46,47` (saúde/comércio) | "Os planos de assistência à saúde ficam sujeitos a regime específico..." |
| Chunk B | LC 214 | `VAZIO` | "Observado o disposto neste Capítulo, ficam reduzidas em 60%..." |
| Chunk C | LC 214 | `01,02,03,10,11,12,23,46,47` (agro/manufatura) | "Observado o disposto neste Capítulo, ficam reduzidas em 60%..." |

**Divergência crítica:** Nenhum chunk do Art. 234 está classificado como `cnaeGroups = '41,42,43,68'` (construção civil). O pacote curadoria propõe CNAEs `4120-4, 4110-7, 4211-1, 4213-8` para esta categoria — mas o banco não tem o artigo mapeado para esses CNAEs.

**Pergunta ao Dr. José:**
- O Art. 234 (reabilitação urbana) é realmente aplicável a construtoras (CNAE 41/42/43)?
- Se sim: qual dos 3 chunks é o correto para construção civil? (O Chunk A é sobre saúde, o Chunk C é sobre agro/manufatura — nenhum parece ser sobre construção civil.)
- Possibilidade: o Art. 234 de construção civil pode estar em outro diploma legal (Decreto 12.955?) e não na LC 214.

**Impacto:** Se nenhum chunk do Art. 234 estiver mapeado para CNAE 41/42/43/68, a categoria A3 não funcionará para construtoras.

---

### DIV-3 — Decreto 12.955 Arts. 360–372 (cnaeGroups = VAZIO)

**Problema já documentado no CR-02 (INVESTIGACAO-CR-02-CNAEGROUPS.md):**

Os 18 chunks do Decreto 12.955 Arts. 360–372 têm `cnaeGroups = ''` (vazio), enquanto a LC 214 Arts. 252–270 têm `cnaeGroups = '41,42,43,68'`.

**Impacto nas categorias B1–B8:** Todas as categorias do Grupo B referenciam tanto a LC 214 quanto o Decreto 12.955 como artigo-fonte complementar. O RAG recuperará os artigos da LC 214 (cnaeGroups correto) mas **não** os artigos do Decreto 12.955 (cnaeGroups vazio → pool universal).

**Ação pendente (Fase 4):** UPDATE `cnaeGroups = '41,42,43,68'` nos 18 chunks do Decreto 12.955 Arts. 360–372 — **requer aprovação P.O.** (bloqueado).

---

## Resumo das Divergências para o Dr. José

| # | Divergência | Artigo | Impacto | Ação necessária |
|---|-------------|--------|---------|-----------------|
| DIV-1 | Art. 262 cnaeGroups=`64,65,66` (financeiro) | B7 `risco_tributacao_parcelas` | B7 não funciona para CNAE 41/42/43/68 | Dr. José decide: construção civil ou financeiro? |
| DIV-2 | Art. 234 sem mapeamento para CNAE 41/42/43/68 | A3 `regime_diferenciado_reabilitacao_urbana` | A3 não funciona para construtoras | Dr. José confirma: Art. 234 se aplica a construção civil? |
| DIV-3 | Decreto 12.955 Arts. 360–372 cnaeGroups=VAZIO | B1–B8 (artigo complementar) | Artigos do Decreto não recuperados para CNAE 41/42/43/68 | Aguarda aprovação P.O. (Fase 4) |

---

## Categorias APROVADAS para o gate do Dr. José (sem divergência)

As seguintes categorias estão com artigo e cnaeGroups corretos no banco e podem ser aprovadas pelo Dr. José sem ressalva técnica:

- **B1** `risco_redutor_ajuste` — Art. 257 ✅
- **B2** `risco_sinter_avaliacao` — Art. 256 ✅
- **B3** `risco_permuta_imoveis` — Art. 259 ✅
- **B4** `risco_controle_empreendimento` — Art. 270 ✅
- **B5** `risco_cib_cadastro` — Arts. 265–266 ✅
- **B6** `risco_custos_historicos` — Art. 258 ✅
- **B8** `risco_revisao_contratos` — Arts. 263–264 ✅
- **A1** `risco_art_269_270` — Art. 269 ✅
- **A2** `regime_especifico_imoveis` — Art. 251 ✅

**Categorias com divergência (aguardam Dr. José):**
- **B7** `risco_tributacao_parcelas` — Art. 262 ⚠️ cnaeGroups divergente
- **A3** `regime_diferenciado_reabilitacao_urbana` — Art. 234 ⚠️ sem mapeamento construção civil

---

*Revisão gerada por Manus em 2026-06-29. Fonte: banco RAG produção (READ-ONLY) · HEAD `bdec3ccb6757`.*
