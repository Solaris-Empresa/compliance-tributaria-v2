# AS-IS / TO-BE — Admin SOLARIS Questions (UX de consulta)

**Página:** `/admin/solaris-questions` · **Componente:** `client/src/pages/AdminSolarisQuestions.tsx` (1518 LOC)
**Data:** 2026-06-19 · **Solicitante:** Dr. José Swami Rodrigues (P.O.)
**Escopo:** **SOMENTE UX/UI de consulta** — sem mudança de regra de negócio, sem banco, sem schema. Nenhum campo novo persistido. Os novos filtros **consomem campos já existentes** (`categoria`, `severidade_base`, `tax_regimes`, `cnae_groups`, `risk_category_code`, `lote/batch_id`, `ativo`, `vigencia_inicio/fim`).
**Entregável desta fase:** **mockup** (não implementar). Mockup: `mockups/mockup-admin-solaris-questions-v2.html`.

---

## 1. AS-IS — estado atual (fundamentado em código)

### Filtros existentes (`AdminSolarisQuestions.tsx`)
| Filtro | Estado | Linha | UI |
|---|---|---|---|
| Busca textual (debounced) | `search`/`debouncedSearch` | `:274-275` | "Buscar pergunta…" `:524` |
| Área (categoria) | `categoria` (`todas`) | `:276` | "Todas as áreas" `:536` |
| Severidade | `severidade` (`todas`) | `:277` | "Todas" `:549` |
| Vigência | `vigencia` (todas/com/sem/vencida/a_vencer) | `:278` | "Todas" `:562` |
| Lote | `batchFilter` (`todas`) | `:279` | "Todos os lotes" `:572` |
| Status | `statusFilter` (ativas/inativas/todas) | `:280` | botão "Ativas" |
| Paginação | `page` | `:281` | "Exibindo 20 de 22" |

### Colunas exibidas
Código · Título · Severidade · Vigência · **Regimes** · **Grupos CNAE** · **Código do Risco** · Lote.

### Lacunas de consulta (o que o Dr. José sente falta)
1. **🔴 Regimes, Grupos CNAE e Código do Risco são COLUNAS, mas NÃO são filtros.** O usuário vê a dimensão mas não consegue filtrar/agrupar por ela — é justamente por onde o Excel agrupa.
2. **🟡 Status "Inativas" existe no estado (`:280`) mas é pouco descoberto** — Dr. José pediu explicitamente "botões para mostrar as inativas". Falta um controle segmentado claro (Ativas | Inativas | Todas) com contagem.
3. **🟡 Sem agrupamento (group-by)** — o Excel agrupa por categoria, severidade, regime, risco, lote. A tela só lista linear.
4. **🟡 Sem ordenação por coluna** (sort).
5. **🟡 Sem resumo/contadores por grupo** (quantas por severidade, por risco…).
6. **🟡 Sem chips de filtros ativos** (difícil ver/limpar o que está filtrado).
7. **🟡 Sem export da consulta** (CSV/Excel do resultado filtrado).
8. **🟡 Acessibilidade sênior:** fonte base pequena, densidade alta, alvos pequenos. `build: unknown` no header (marcador de build não resolveu — item à parte).

---

## 2. TO-BE — UX de consulta completa (read-only)

> Princípio orientador: **um advogado sênior precisa achar qualquer recorte em ≤ 3 cliques, com texto legível e rótulos claros** (não depender de ícones).

### 2.1 Barra de filtros — TODAS as dimensões
Manter os 6 atuais + **adicionar 3** (consumindo campos existentes):
- **Regime tributário** (multi): Simples Nacional · Lucro Presumido · Lucro Real · Universal (`tax_regimes=null`).
- **Grupo CNAE** (busca por prefixo/código, ex.: `28`, `4639-7/01`; opção "Universal").
- **Código do Risco** (multi): `confissao_automatica`, `obrigacao_acessoria`, `credito_presumido`, … (lista distinta dos valores presentes).
- **Status** promovido a **segmented control** proeminente: **Ativas (N) · Inativas (N) · Todas (N)** com contagem.

### 2.2 Agrupamento (group-by) — como o Excel, e além
- **Agrupar por:** Categoria · Severidade · Regime · Código do Risco · Lote · Status · Vigência · *(Nenhum = lista plana)*.
- Cada grupo é um cabeçalho **colapsável** com **contador** (ex.: `confissao_automatica — 6 perguntas`) e mini-resumo (severidade dominante).
- "Expandir tudo / Recolher tudo".

### 2.3 Tabela
- **Ordenação** por qualquer coluna (clique no cabeçalho, com indicador ▲▼).
- **Seletor de colunas** (mostrar/ocultar; lembra a preferência em localStorage — sem banco).
- **Densidade:** Confortável (default, linhas altas) | Compacto.
- **Chips de filtros ativos** acima da tabela (cada um removível; "Limpar tudo").
- **Resumo:** "Exibindo X de Y · Z inativas · filtros: …".

### 2.4 Conveniências de consulta (read-only)
- **Consultas salvas / "Minhas buscas"** — salvar combinação de filtros em **localStorage** (cliente; **não** toca banco). Ex.: "Críticas do Simples", "Vencidas".
- **Export** do resultado filtrado em **CSV/Excel** (geração client-side; read-only).
- **Busca ampliada:** código + título + conteúdo + código do risco.

### 2.5 Acessibilidade / sênior (boas práticas)
- Fonte base **16–18px**; botão **"A / A+"** (texto grande) — persiste em localStorage.
- **Alto contraste**, foco visível, alvos ≥ 44px, espaçamento generoso.
- **Rótulos textuais** em todo controle (ícone + texto), tooltips explicativos.
- Navegação por teclado + `aria-*` (leitor de tela); estados vazios claros.
- Severidade com **cor + texto + ícone** (não só cor) — daltonismo.

### 2.6 Restrições (não-objetivos)
- ❌ Não altera regra de negócio, schema, migrations, procedures.
- ❌ Não cria campo persistido (consultas salvas = localStorage).
- ❌ Edição/criação permanecem como hoje (fora do escopo desta melhoria de consulta).
- ✅ Filtros/agrupamentos são 100% client-side OU usam parâmetros já aceitos pelo `listQuestions` (sem novo contrato).

---

## 3. Classe e próximos passos
- **Classe (se vier a implementar):** B/C de **frontend apenas** (1 arquivo, ~1518 LOC já existentes; sem schema/ADR). Esta fase entrega **só mockup** (REGRA-ORQ-09 / Gate UX) — implementação só após aprovação do P.O. + `ux-spec-validator`.
- **Mockup:** `docs/governance/relatorios/mockups/mockup-admin-solaris-questions-v2.html` (abrir no navegador).
- **Dados de referência:** `SOLARIS-Questions-Completo.xlsx` (dimensões de agrupamento) + print atual (PDF 2a-versao-ux).

## 4. Vinculadas
- REGRA-ORQ-09 / Gate UX (mockup antes de issue de frontend) · `frontend.md` (data-testid, Tooltip em disabled, safeStr p/ datas)
- Campos consumidos (read-only): `tax_regimes` (ADR-0038) · `cnae_groups` (CNAE-ADMIN-01) · `risk_category_code` · `ativo` · `vigencia_*`
- Componente: `client/src/pages/AdminSolarisQuestions.tsx`
