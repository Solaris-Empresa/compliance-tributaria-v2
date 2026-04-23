# M1-ARQUETIPO-FORM-DELTA-v4

**Versão:** v4  
**Data:** 2026-04-23  
**Branch:** `docs/m1-arquetipo-exploracao`  
**Status:** artefato de análise pré-M1 · sem implementação  
**Referência anterior:** `M1-ARQUETIPO-FORM-DELTA-v3.md`  
**Mockup:** `MOCKUP_perfil_entidade_deterministico_v4.html`

---

## Sumário das Mudanças Delta v4

Este documento registra apenas as mudanças do Delta v4 sobre o v3. Todos os demais campos, regras e modelos do v3 permanecem válidos e não são repetidos aqui.

| Operação | ID / Campo | Descrição |
|----------|-----------|-----------|
| `remove` | `cnae_principal_input` | Campo de texto livre para CNAE removido do BLOCO 0 |
| `add` | `[B0-02]` `action_button` | Botão "Identificar CNAEs" após `descricao_negocio` → abre modal |
| `update` | `cnaes` | Campo de CNAEs vira `multi_select` editável (source=modal, allow_add, allow_remove) |
| `new_behavior` | `auto_open_blocos_based_on_cnae` | CNAEs pré-abrem blocos condicionais |
| `new_behavior` | `show_confidence_cnae` | Badge de confiança por CNAE no modal e no multi-select |
| `new_behavior` | `show_detected_profile_preview` | Painel de pré-visualização do Perfil da Entidade detectado |

---

## 1. Mudanças Detalhadas

### 1.1 remove — `cnae_principal_input`

O campo de texto livre `cnae_principal_input` é removido do BLOCO 0. Não há mais entrada manual de CNAE por digitação direta.

**Motivo:** substituído pelo fluxo modal + multi-select, que oferece confiança, sugestão automática e edição posterior.

---

### 1.2 add — `[B0-02]` `action_button` "Identificar CNAEs"

**Especificação:**

```json
{
  "id": "B0-02",
  "type": "action_button",
  "label": "Identificar CNAEs",
  "action": "open_cnae_modal",
  "after_field": "descricao_negocio"
}
```

**Comportamento:**
- Aparece logo após `descricao_negocio` (campo B0-01)
- Habilitado assim que `descricao_negocio` tem conteúdo (≥ 10 caracteres)
- Ao clicar, abre o modal de busca/seleção de CNAEs
- Se nenhum CNAE foi selecionado ainda, exibe placeholder: "Nenhum CNAE identificado. Use o botão para buscar e selecionar."
- Se CNAEs já foram selecionados, o botão muda para "Editar CNAEs"

**Posição no BLOCO 0:**
```
[B0-00] project_name
[B0-01] descricao_negocio
[B0-02] → botão "Identificar CNAEs" + multi-select resultante  ← NOVO v4
[B0-03] natureza_da_operacao (pré-selecionado por CNAE)
[B0-04] principaisProdutos (condicional)
[B0-05] principaisServicos (condicional)
[B0-06] multiState
[B0-07] annualRevenueRange
[B0-08] taxRegime
```

---

### 1.3 update — `cnaes` multi_select editável

**Especificação:**

```json
{
  "id": "cnaes",
  "type": "multi_select",
  "editable": true,
  "source": "modal",
  "allow_add": true,
  "allow_remove": true
}
```

**Comportamento após confirmação no modal:**
- CNAEs selecionados aparecem como chips editáveis no formulário
- Cada chip exibe: código CNAE + descrição resumida + badge de confiança
- `allow_remove=true`: botão ✕ em cada chip remove o CNAE da seleção
- `allow_add=true`: botão "+ Adicionar CNAE" reabre o modal para adicionar mais
- Mínimo obrigatório: ≥ 1 CNAE para avançar (RB validação)

**Estrutura de dados do campo `cnaes`:**

```typescript
interface CnaeEntry {
  code: string;                          // e.g. "47.31-8-00"
  description?: string;                  // descrição oficial IBGE
  confidence: 'high' | 'medium' | 'low'; // calculado pelo modal
  source: 'modal' | 'manual';            // origem da seleção
}
```

---

### 1.4 new_behavior — `auto_open_blocos_based_on_cnae`

Após confirmação dos CNAEs, o sistema analisa os códigos selecionados e pré-abre/pré-preenche blocos condicionais relevantes.

**Mapeamento CNAE → bloco/campo pré-aberto:**

| CNAE (prefixo) | Bloco pré-aberto | Campo pré-preenchido | Valor sugerido |
|----------------|-----------------|---------------------|----------------|
| 47.xx (varejo) | Bloco 1 | `papel_operacional` | `varejista` |
| 46.xx (atacado) | Bloco 1 | `papel_operacional` | `distribuidor` |
| 10–33 (indústria) | Bloco 1 | `papel_operacional` | `fabricante` |
| 47.31, 46.81 (combustíveis) | Bloco 2 | `setor_regulado`, `orgao` | `true`, `ANP` |
| 64–66 (financeiro) | Bloco 2 | `setor_regulado`, `orgao` | `true`, `BACEN/CVM` |
| 86 (saúde) | Bloco 2 | `setor_regulado`, `orgao` | `true`, `ANS/ANVISA` |
| 61 (telecom) | Bloco 2 | `setor_regulado`, `orgao` | `true`, `ANATEL` |
| 35 (energia) | Bloco 2 | `setor_regulado`, `orgao` | `true`, `ANEEL` |

**Regra de precedência:** sugestão automática, não obrigatória. Usuário pode alterar qualquer campo pré-preenchido. O valor final é sempre o confirmado pelo usuário.

**Nota de implementação (pré-M1):** a lógica de mapeamento CNAE → sugestão é determinística (lookup por prefixo), não usa LLM. Pode ser implementada como tabela estática.

---

### 1.5 new_behavior — `show_confidence_cnae`

Cada CNAE exibe um badge de confiança calculado com base na correspondência entre `descricao_negocio` e a descrição oficial do CNAE.

**Níveis de confiança:**

| Nível | Badge | Critério (pré-M1: heurístico) |
|-------|-------|-------------------------------|
| `high` | 🟢 Alta confiança | Palavras-chave da descrição batem diretamente com o CNAE |
| `medium` | 🟡 Média confiança | Correspondência parcial ou setor relacionado |
| `low` | 🔴 Baixa confiança | Sugestão por setor amplo, baixa especificidade |

**Exibição:**
- No modal: badge ao lado de cada resultado da lista
- No multi-select (chips): badge compacto dentro do chip
- Confiança `low` exibe aviso: "Verifique se este CNAE é adequado para sua atividade"

**Nota de implementação (pré-M1):** confiança calculada por correspondência de keywords. Não requer LLM na v1 do modal.

---

### 1.6 new_behavior — `show_detected_profile_preview`

Após confirmação dos CNAEs, exibe um painel de pré-visualização do Perfil da Entidade detectado automaticamente.

**Campos exibidos no preview:**

| Campo | Origem |
|-------|--------|
| Natureza da operação | derivado do CNAE (produto/serviço/misto) |
| Papel operacional | sugerido por `auto_open_blocos_based_on_cnae` |
| Setor regulado | sugerido por `auto_open_blocos_based_on_cnae` |
| Riscos detectados | categorias ativas previstas pelo CNAE |
| Blocos pré-abertos | lista dos blocos que serão pré-abertos |

**Comportamento:**
- É informativo — não substitui confirmação do usuário nos blocos
- Exibe nota: "Pré-visualização baseada nos CNAEs. Confirme ou ajuste nos blocos abaixo."
- Atualiza em tempo real quando CNAEs são adicionados/removidos

---

## 2. Impacto no Target Model (delta sobre v3)

Apenas as adições ao `PerfilEntidade` interface do v3:

```typescript
// Adições ao PerfilEntidade (v4)
interface PerfilEntidade {
  // ... todos os campos do v3 ...

  // Novo campo v4 (substitui cnae_principal_input)
  cnaes: Array<{
    code: string;
    description?: string;
    confidence: 'high' | 'medium' | 'low';
    source: 'modal' | 'manual';
  }>;

  // Campo removido v4
  // cnae_principal_input: REMOVIDO

  // Novo campo derivado v4 (não persistido)
  detected_profile?: {
    papel_operacional?: string;
    setor_regulado?: boolean;
    orgao?: string;
    categorias_previstas?: string[];
  };
}
```

---

## 3. Impacto na Matriz Campo → Efeito → Blocker (delta sobre v3)

Apenas as linhas alteradas:

| Campo | Tipo | Efeito | Blocker |
|-------|------|--------|---------|
| ~~`cnae_principal_input`~~ | **removido v4** | substituído por `cnaes[]` | — |
| `cnaes[]` | multi_select (modal) | pré-seleciona papel_operacional, setor_regulado, orgao · auto_open_blocos · show_confidence · show_profile_preview | **SIM — ≥1 CNAE obrigatório** |

Todos os demais campos da matriz v3 permanecem sem alteração.

---

## 4. Fluxo UX Completo BLOCO 0 (v4)

```
1. Usuário preenche project_name [B0-00]
2. Usuário preenche descricao_negocio [B0-01]
3. Botão "Identificar CNAEs" fica habilitado [B0-02]
4. Usuário clica → modal abre
   4a. Modal exibe sugestões automáticas com show_confidence_cnae
   4b. Usuário adiciona/remove CNAEs
   4c. Usuário confirma seleção
5. CNAEs aparecem como chips editáveis (multi_select)
6. show_detected_profile_preview exibe pré-visualização
7. auto_open_blocos_based_on_cnae pré-abre Bloco 1 e/ou Bloco 2
8. natureza_da_operacao [B0-03] pré-selecionada por CNAE
9. Usuário confirma/ajusta campos pré-preenchidos
10. Continua fluxo normal dos demais campos do BLOCO 0
```

---

## 5. Backlog Pendente (não agir sem autorização P.O.)

Herdado do v3, sem alterações:

- Criar migration para tabela `eligibility_audit_log`
- Criar `drizzle/downs/0089_down.sql`
- Resolver divergência sandbox main (tag `backup/main-pre-sync-20260421-230108`)
- Corrigir trigger `smoke-post-deploy.yml`
- Retomar Sprint Z-22 — Issue #725 (Dashboard Compliance v3)

---

*Documento gerado em 2026-04-23 · branch `docs/m1-arquetipo-exploracao` · artefato pré-M1 · sem implementação*
