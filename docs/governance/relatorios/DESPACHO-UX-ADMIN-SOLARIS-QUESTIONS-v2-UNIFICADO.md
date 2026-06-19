# Despacho ao Orquestrador — UX v2 Admin SOLARIS Questions (página principal, consulta)

**Página (única no escopo):** `/admin/solaris-questions` — aba **Lista** (consulta). **Usuário-alvo:** Dr. José (sênior).
**Classe:** Frontend-only (`client/src/pages/AdminSolarisQuestions.tsx`, 1518 LOC) — **read-only / consulta**. **Sem** regra de negócio, **sem** banco, **sem** schema, **sem** migration, **sem** procedure nova. Todos os filtros/agrupamentos consomem **campos já existentes** (`categoria`, `severidade_base`, `tax_regimes`, `cnae_groups`, `risk_category_code`, `lote/batch_id`, `ativo`, `vigencia_*`).
**Status:** MOCKUP aprovado pelo P.O. (unificação Claude Code + Manus). **Não implementar** até Gate UX (REGRA-ORQ-09 + `ux-spec-validator` LIBERAR).

> Unifica: `mockups/mockup-admin-solaris-questions-v2.html` (Claude Code — interativo) + `manus--MOCKUP-SPEC-SOLARIS-ADMIN-QUESTIONS.md` + PNGs do Manus. AS-IS/TO-BE: `AS-IS-TO-BE-ADMIN-SOLARIS-QUESTIONS-UX-20260619.md`.

---

## 1. Escopo (somente a página principal)
✅ **APENAS a aba Lista (consulta)** de `/admin/solaris-questions`: cards de resumo, filtros, status, agrupamento, tabela, painel de visibilidade, modal de detalhe (read-only), export, acessibilidade.

❌ **NÃO alterar (intocadas, confirmação P.O.):**
- **Página/fluxo de alteração (editar/criar pergunta)** — permanece **exatamente como hoje**. O botão "Editar" (no modal/linha) apenas **abre o fluxo de edição atual, sem nenhuma mudança**.
- **Página/aba de importação (Upload CSV)** — intocada.
- Aba **Histórico de Lotes** — intocada.
- Qualquer regra de negócio, banco, schema, migration, procedure.

> Esta v2 adiciona **somente consulta** à lista principal. Não há um único byte de mudança em edição/importação.

## 2. Componentes (unificados)

### 2.1 Cards de resumo (topo) — *do Manus*
4 cards **clicáveis** (atalho de filtro), com **cor + ícone + texto** (acessibilidade):
| Card | Valor (dinâmico) | Cor | Ação ao clicar |
|---|---|---|---|
| Total | 52 | Azul #1E40AF | status = Todas |
| Ativas | 22 | Verde #16A34A | status = Ativas |
| Inativas | 30 | Cinza #6B7280 | status = Inativas |
| Regime específico | 4 | Roxo #7C3AED | filtro regime ≠ Universal |
*(valores são consulta em tempo real; números acima ilustrativos.)*

### 2.2 Filtros — 7 + busca (2 linhas, **todos com label** — sênior)
**Linha 1:** Busca textual ampla (código + título + **conteúdo** + código do risco) · Área · Severidade · Regime Tributário.
**Linha 2:** Grupo CNAE · Código de Risco · Lote · **Status (segmented Ativas/Inativas/Todas, com contagem)** · **Agrupar por**.
- **Novos vs AS-IS** (eram colunas, não filtros): **Regime, Grupo CNAE, Código de Risco** — *multi-select* (Claude Code).
- **Chips de filtros ativos** removíveis + **"Limpar tudo"** (Claude Code).

### 2.3 Agrupamento (group-by) — *unificado* (como o Excel, e além)
Opções: **Nenhum** · Regime · Categoria · Severidade · Grupo CNAE · Lote · **Status** · **Vigência**. Cada grupo = header **colapsável** com **contador** (ex.: `confissao_automatica — 6`). "Expandir/Recolher tudo".

### 2.4 Painel "Visibilidade por Regime" (sidebar) — *do Manus*
Aparece quando agrupado por Regime. Mostra, por regime do projeto, quantas perguntas o usuário final veria (universais + específicas) — **didático sobre o filtro ADR-0038**:
| Regime | Visíveis | Composição |
|---|---|---|
| Lucro Real | 44 | 44 universais + 0 específicas |
| Lucro Presumido | 48 | 44 universais + 4 específicas |
| Simples Nacional | 48 | 44 universais + 4 específicas |
| Sem regime (NULL) | 52 | todas (permissivo) |

### 2.5 Tabela principal
- Colunas: ☑ · Código (badge) · **Título sem truncamento** · Severidade (pill cor+texto+ícone) · Vigência · Regime (pill colorida) · Grupos CNAE (pill "+N") · Código do Risco · Lote · Ações (👁 ver / ✏️ editar).
- **Ordenação por coluna** (sort ▲▼ — Claude Code) · **densidade** Confortável/Compacto · **A/A+** (texto grande) — Claude Code.
- **Estado vazio** claro ("nenhuma corresponde — limpar filtros").

### 2.6 Modal de detalhe (read-only) — *do Manus*
Abre ao clicar no código / 👁: Código+Título (grande) · Status · grid de metadados (categoria, severidade, vigência, lote, regime, CNAE, risco, obrigatória) · **texto completo** · objetivo · risco associado · box de visibilidade ("aparece para regime: X") · botões Editar | Fechar. *(Consulta; "Editar" reusa o fluxo atual.)*

### 2.7 Conveniências de consulta
- **Paginação:** seletor 20 / 50 / 100 / **Todos** (Manus).
- **Export** do resultado filtrado em **Excel/CSV** com as abas da planilha (Manus) — geração **client-side** (sem banco).
- **Buscas salvas** ("Minhas buscas") em **localStorage** (Claude Code) — sem persistência em banco.

## 3. Tokens de cor (do Manus)
**Regime:** Universal #6B7280 · Lucro Presumido #7C3AED · Lucro Real #2563EB · Simples Nacional #16A34A.
**Severidade:** Crítica #DC2626 · Alta #EA580C · Média #CA8A04 · Baixa #6B7280 (sempre **cor + texto + ícone** — daltonismo).

## 4. Princípios sênior (consolidado)
Body 16–18px (toggle A/A+) · alto contraste · **todo controle com label textual** (não só ícone) · alvos ≥ 44px · barra de resultados sempre visível ("Mostrando X de Y · filtros: …") · sem truncamento · paginação "Todos" · cards/chips como atalhos · teclado + `aria-*`.

## 5. Convenções de implementação (quando liberado)
- **data-testid** obrigatório (frontend.md) — ex.: `card-total`, `card-ativas`, `filter-regime`, `filter-cnae`, `filter-risk`, `seg-status-{ativas|inativas|todas}`, `groupby`, `chip-{n}`, `btn-export`, `row-{codigo}`, `modal-detalhe`, `pagesize`.
- **safeStr/toLocaleDateString** em datas (React #31).
- Tudo client-side OU via parâmetros já aceitos por `listQuestions` (sem novo contrato tRPC).

## 6. Não-objetivos (hard)
❌ implementar nesta fase · ❌ tocar banco/schema/migration/procedure · ❌ campo persistido novo (buscas salvas = localStorage) · ❌ abas Upload/Histórico · ❌ alterar regra de elegibilidade/regime.

## 7. Próximos passos (fluxo)
1. P.O. aprova este despacho unificado.
2. `ux-spec-validator` → **LIBERAR** (REGRA-ORQ-09).
3. Orquestrador cria issue de frontend (Classe B/C, frontend-only) com Bloco 9 (data-testid acima) + os 2 mockups como referência.
4. Implementação + E2E (Gate E2E) — sem merge sem suite.

## 8. Referências
- Mockup interativo: `docs/governance/relatorios/mockups/mockup-admin-solaris-questions-v2.html` (+ cópia em `2a-versao-ux/`).
- Spec/PNGs Manus: `2a-versao-ux/manus--MOCKUP-SPEC-SOLARIS-ADMIN-QUESTIONS.md`.
- AS-IS/TO-BE: `docs/governance/relatorios/AS-IS-TO-BE-ADMIN-SOLARIS-QUESTIONS-UX-20260619.md`.
- Campos consumidos: ADR-0038 (`tax_regimes`) · CNAE-ADMIN-01 (`cnae_groups`) · `risk_category_code`.
