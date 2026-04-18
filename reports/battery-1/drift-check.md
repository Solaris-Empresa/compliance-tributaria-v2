# Drift check — categorias de risco

Executado em 2026-04-18T14:56:08.478Z

## Fontes

- **N1 DB** (risk_categories): 10 categorias 
- **N2 Código** (SEVERITY_TABLE): 10 categorias
- **N3 RN doc**: 11 categorias

## Categorias por fonte

| Categoria | DB | Código | RN | Status |
|---|---|---|---|---|
| aliquota_reduzida | ✅ | ✅ | ✅ | OK |
| aliquota_zero | ✅ | ✅ | ✅ | OK |
| confissao_automatica | ✅ | ✅ | ✅ | OK |
| credito_presumido | ✅ | ✅ | ✅ | OK |
| imposto_seletivo | ✅ | ✅ | ✅ | OK |
| inscricao_cadastral | ✅ | ✅ | ✅ | OK |
| obrigacao_acessoria | ✅ | ✅ | ✅ | OK |
| regime_diferenciado | ✅ | ✅ | ✅ | OK |
| split_payment | ✅ | ✅ | ✅ | OK |
| transicao_iss_ibs | ✅ | ✅ | ✅ | OK |
| tributacao_servicos | ❌ | ❌ | ✅ | ⚠️ DRIFT |

## Resumo

- **Alinhadas:** 10
- **Com drift:** 1

⚠️ **1 categoria(s) divergem entre as 3 fontes.**

Ver snapshot §5 para decisões P.O.:
- D2: tributacao_servicos (órfã RN — DEC-02)
- D3: inscricao_cadastral severidade (RN desatualizada)
- D4: RN doc com categorias não implementadas
