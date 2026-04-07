# ADR-0013 — Badge risk_category_l2 no Frontend (RisksV3)

**Status:** Aceito  
**Data:** 2026-04-07  
**Autor:** Manus (implementador técnico)  
**Contexto:** BUG-MANUAL-04 — coluna "Categoria" (risk_category_l2) ausente na tabela de riscos

---

## 1. Contexto

A tabela de riscos em `client/src/pages/compliance-v3/RisksV3.tsx` exibe as colunas:
Requisito · Domínio · Nível · Dimensão · Score · Normalizado · Impacto Fin.

A coluna **Categoria** (`risk_category_l2`) está ausente, apesar de ser gerada pelo `riskEngine.ts` com 10 categorias canônicas da LC 214/2025 (definidas em `server/lib/risk-categorizer.ts`).

---

## 2. Decisão

Adicionar `CategoryBadge` ao `Badges.tsx` e coluna "Categoria" ao `RisksV3.tsx`.

### 10 Categorias Canônicas e Cores

| Categoria | Label | Cor |
|---|---|---|
| `imposto_seletivo` | IS | vermelho |
| `ibs_cbs` | IBS/CBS | azul |
| `regime_diferenciado` | Regime Dif. | roxo |
| `aliquota_reduzida` | Alíq. Reduzida | verde |
| `aliquota_zero` | Alíq. Zero | verde escuro |
| `split_payment` | Split Payment | laranja |
| `cadastro_fiscal` | Cadastro | cinza |
| `obrigacao_acessoria` | Obrig. Acessória | amarelo |
| `transicao` | Transição | índigo |
| `enquadramento_geral` | Geral | cinza claro |

---

## 3. Alternativas Rejeitadas

**A. Exibir como texto simples:** Rejeitado — inconsistente com o padrão de badges existente (RiskLevelBadge, CriticalityBadge).

**B. Filtrar por categoria:** Aceito como feature futura — o badge é o primeiro passo.

---

## 4. Consequências

- Usuário consegue identificar visualmente a categoria canônica de cada risco
- Specs M04-01..M04-06 verificam a presença do badge no código e na tabela
