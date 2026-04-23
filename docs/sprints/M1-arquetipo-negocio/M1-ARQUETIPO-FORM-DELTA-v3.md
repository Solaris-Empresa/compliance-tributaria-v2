# M1-ARQUETIPO-FORM-DELTA-v3

**Versão:** v3  
**Data:** 2026-04-23  
**Branch:** `docs/m1-arquetipo-exploracao`  
**Status:** artefato de análise pré-M1 · sem implementação  
**Referência anterior:** `M1-ARQUETIPO-FORM-DELTA-v2.md`  
**Mockup:** `MOCKUP_perfil_entidade_deterministico_v3.html`

---

## Sumário dos 8 Ajustes do Delta v3

| ID  | Ajuste | Impacto |
|-----|--------|---------|
| A01 | `project_name` adicionado como 1º campo do BLOCO 0 | Novo campo de identificação |
| A02 | UI "Arquétipo" → "Perfil da Entidade" | Terminologia de UX |
| A03 | B4-02 (escolha de escopo multi-CNPJ) removido | Simplificação de fluxo |
| A04 | B4-01 vira informativo contextual | Mudança de comportamento |
| A05 | RB-06 HARD BLOCK → `RB-06-INFO` (aviso informativo) | Remoção de bloqueio |
| A06 | Gate E2E depende apenas de `status_arquetipo = confirmado` | Simplificação de gate |
| A07 | Estados A, E, G e painel lateral atualizados | Consistência visual |
| A08 | `analise_1_cnpj_operacional` removido da UI | Remoção de campo |

---

## 1. Contexto

Este documento registra as mudanças do Delta v3 sobre o Delta v2. O Delta v2 identificou dois BLOCKERs estruturais e produziu o modelo transitional/target. O Delta v3 incorpora 8 ajustes do P.O. que simplificam o fluxo, ajustam a terminologia de UX e removem um bloqueio desnecessário (RB-06).

---

## 2. Ajustes Detalhados

### A01 — `project_name` como 1º campo do BLOCO 0

**Decisão P.O.:** O formulário deve começar com o nome do projeto para identificação do caso.

**Especificação:**
- Campo: `project_name` (text, obrigatório)
- ID de UI: `[B0-00]`
- Posição: primeiro campo do BLOCO 0, antes de `descricao_negocio`
- Efeito no arquétipo: **nenhum** — campo de identificação apenas
- Persistência: salvo no projeto, não afeta `operationProfile`

**Impacto na matriz:** linha adicionada (`project_name` → identificação → sem blocker).

---

### A02 — UI "Arquétipo" → "Perfil da Entidade"

**Decisão P.O.:** O termo "Arquétipo" é técnico e interno. A interface do usuário deve usar "Perfil da Entidade".

**Regra de terminologia:**

| Contexto | Termo correto |
|----------|--------------|
| Interface do usuário (labels, títulos, botões) | "Perfil da Entidade" |
| Código interno (variáveis, campos de banco) | `status_arquetipo`, `arquetipo_label` |
| Documentação técnica | ambos, com nota |

**Substituições no mockup:**
- Painel lateral: "Arquétipo em construção" → "Perfil da Entidade em construção"
- Botão de confirmação: "Confirmar arquétipo" → "Confirmar Perfil da Entidade"
- Painel final: "Arquétipo final (snapshot)" → "Perfil da Entidade final (snapshot)"
- Estado G: "Arquétipo confirmado" → "Perfil da Entidade confirmado"

---

### A03 — B4-02 removido

**Decisão P.O.:** O campo B4-02 (escolha de escopo: "Analisar apenas este CNPJ" vs "Analisar grupo") é removido. Esta versão analisa sempre por CNPJ individual.

**Campo removido:** `analise_1_cnpj_operacional` (boolean) — removido da UI.

**Impacto:** BLOCO 4 passa a ter apenas B4-01 (informativo).

---

### A04 — B4-01 vira informativo contextual

**Decisão P.O.:** B4-01 (`isEconomicGroup`) deixa de ser campo de decisão e vira campo informativo contextual.

**Comportamento v3:**
- Exibe: "A entidade faz parte de grupo econômico?"
- Nota: "Campo informativo. Não bloqueia o fluxo. Análise restrita a este CNPJ nesta versão."
- Efeito técnico: `isEconomicGroup=true` → sinaliza complexidade societária → ativa `inscricao_cadastral` multi-estab → **não bloqueia**

---

### A05 — RB-06 HARD BLOCK → RB-06-INFO

**Decisão P.O.:** Grupo econômico não deve bloquear o fluxo. RB-06 vira aviso informativo.

**Antes (v2):**
```
RB-06: isEconomicGroup=true AND analise_1_cnpj_operacional=false → HARD BLOCK
```

**Depois (v3):**
```
RB-06-INFO: isEconomicGroup=true → INFO_ONLY
  severity: INFO_ONLY
  blocker: false
  message: "Grupo econômico identificado. Análise restrita a este CNPJ."
```

**Impacto na tabela de validação final:** RB-06 substituído por RB-06-INFO (linha com estilo diferenciado, sem impacto no gate).

---

### A06 — Gate E2E simplificado

**Decisão P.O.:** O gate E2E depende **apenas** de `status_arquetipo = confirmado`. Nenhuma outra condição adicional.

**Antes (v2):**
```
gate_e2e = status_arquetipo === 'confirmado'
           AND analise_1_cnpj_operacional === true
           AND !blockers.some(b => b.severity === 'HARD_BLOCK')
```

**Depois (v3):**
```
gate_e2e = status_arquetipo === 'confirmado'
```

**Nota:** `status_arquetipo = confirmado` já implica que todos os HARD BLOCKs foram resolvidos (pois o sistema só seta `confirmado` quando todos os RBs passam). A condição explícita de `analise_1_cnpj_operacional` é removida.

---

### A07 — Estados A, E, G e painel lateral atualizados

Atualização de consistência visual nos estados do mockup:
- **Estado A:** painel lateral usa "Perfil da Entidade em construção"
- **Estado E:** RB-06 vira RB-06-INFO, sem hard block, bloco com estilo informativo (purple)
- **Estado G:** gate E2E com nota explícita "depende apenas de `status_arquetipo`"

---

### A08 — `analise_1_cnpj_operacional` removido da UI

**Decisão P.O.:** O campo não existe na UI. `isEconomicGroup` é mantido como campo técnico interno (persistido em `operationProfile`).

**Campo removido da UI:** `analise_1_cnpj_operacional`  
**Campo mantido (técnico):** `isEconomicGroup` (boolean, persistido)

---

## 3. Modelo Transitional Atualizado (v3)

O modelo transitional descreve como os campos do formulário atual (`PerfilEmpresaIntelligente.tsx`) mapeiam para os campos do target model.

### 3.1 Campos mantidos sem mudança

| Campo atual | Campo target | Status |
|-------------|-------------|--------|
| `descricao_negocio` | `descricao_negocio` | mantido |
| `cnae_confirmado` | `cnae_confirmado` | mantido |
| `papel_operacional` | `papel_operacional` | mantido |
| `multiState` | `multiState` | mantido |
| `taxRegime` | `taxRegime` | mantido |
| `annualRevenueRange` | `annualRevenueRange` | mantido |
| `setor_regulado` | `setor_regulado` | mantido |
| `orgao_regulador_principal` | `orgao_regulador_principal` | mantido |
| `opera_territorio_incentivado` | `opera_territorio_incentivado` | mantido |
| `tipo_territorio_incentivado` | `tipo_territorio_incentivado` | mantido |
| `papel_comercio_exterior` | `papel_comercio_exterior` | mantido |
| `isEconomicGroup` | `isEconomicGroup` | mantido (técnico) |
| `principaisProdutos` | `principaisProdutos` | mantido |
| `principaisServicos` | `principaisServicos` | mantido |

### 3.2 Campos adicionados no target

| Campo target | Tipo | Origem | Notas |
|-------------|------|--------|-------|
| `project_name` | text | novo (A01) | 1º campo do BLOCO 0 |
| `possui_bens` | boolean | derivado de `natureza_da_operacao` | não persistido |
| `possui_servicos` | boolean | derivado de `natureza_da_operacao` | não persistido |
| `tipoOperacao_normalizado` | string | derivado | normaliza "servico"→"servicos" para gate IS |

### 3.3 Campos removidos ou alterados

| Campo | Status v3 | Motivo |
|-------|-----------|--------|
| `analise_1_cnpj_operacional` | **removido da UI** (A08) | análise sempre por CNPJ individual |
| `natureza_da_operacao` | **mantido como array** (BLOCKER v2 resolvido) | deriva possui_bens/servicos |

### 3.4 BLOCKER v2 → status v3

| BLOCKER v2 | Resolução v3 |
|------------|-------------|
| **B1:** `natureza_da_operacao` como array quebra gate IS | Resolvido: `tipoOperacao_normalizado` derivado normaliza o valor |
| **B2:** `possui_bens`/`possui_servicos` não existem | Resolvido: derivados de `natureza_da_operacao` (não persistidos) |

---

## 4. Target Model (v3)

```typescript
interface PerfilEntidade {
  // Identificação (A01)
  project_name: string;                    // 1º campo, sem efeito no arquétipo

  // Bloco 0 — Entrada Obrigatória
  descricao_negocio: string;
  cnae_confirmado: string;
  natureza_da_operacao: ('produto' | 'servico' | 'misto')[];  // multi-select
  principaisProdutos?: { ncm: string; percentualReceita: number }[];
  principaisServicos?: { nbs: string; percentualReceita: number }[];
  multiState: boolean;
  annualRevenueRange: 'ate_360k' | '360k_4.8m' | '4.8m_10m' | '10m_50m' | 'acima_50m';
  taxRegime: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'lucro_arbitrado';

  // Bloco 1 — Cadeia de Valor
  papel_operacional: 'fabricante' | 'distribuidor' | 'varejista' | 'prestador' | 'misto';

  // Bloco 2 — Setor Regulado
  setor_regulado: boolean;
  orgao_regulador_principal?: string[];

  // Bloco 3 — Território e Comércio Exterior
  opera_territorio_incentivado: boolean;
  tipo_territorio_incentivado?: 'ZFM' | 'RECOF' | 'REPORTO' | 'SUDAM_SUDENE' | 'outro';
  papel_comercio_exterior: 'nenhum' | 'importador' | 'exportador' | 'importador_exportador';

  // Bloco 4 — Estrutura Societária (informativo)
  isEconomicGroup: boolean;              // técnico, persistido; sem bloqueio (A04/A05)
  // analise_1_cnpj_operacional: REMOVIDO (A08)

  // Derivados (não persistidos)
  possui_bens: boolean;                  // derivado de natureza_da_operacao
  possui_servicos: boolean;              // derivado de natureza_da_operacao
  tipoOperacao_normalizado: string;      // normaliza "servico"→"servicos" para gate IS

  // Resultado (derivado, persistido)
  status_arquetipo: 'pendente' | 'valido' | 'bloqueado' | 'confirmado';
  arquetipo_label?: string;
  dimensoes_ativas?: string[];
  categorias_ativas?: string[];
  categorias_bloqueadas?: string[];
  blockers?: Array<{ id: string; severity: string; message: string; fields: string[] }>;
  rb06_info?: { id: 'RB-06-INFO'; severity: 'INFO_ONLY'; message: string; blocker: false };
}
```

---

## 5. Matriz Campo → Efeito → Blocker (v3)

| Campo | Tipo | Efeito no Perfil da Entidade | Blocker se ausente? |
|-------|------|------------------------------|---------------------|
| `project_name` | text | identificação do caso — sem efeito no arquétipo | NÃO |
| `natureza_da_operacao` | string[] (multi) | dimensão principal · deriva possui_bens/servicos · normaliza tipoOperacao para gate IS | **SIM — absoluto** |
| `possui_bens` | derivado | abre NCM · ativa RB-01 | — |
| `possui_servicos` | derivado | abre NBS · ativa RB-02 | — |
| `principaisProdutos[].ncm` | lista+% | lookup IS por NCM · dimensão produto | SIM se possui_bens=true |
| `principaisServicos[].nbs` | lista+% | lookup IS por NBS · dimensão serviço | SIM se possui_servicos=true |
| `papel_operacional` | enum | define split_payment, IS, regime_diferenciado | **SIM — sem isso split_payment ambíguo** |
| `multiState` | boolean | geo:mono vs geo:multi no rule_id | NÃO — default mono |
| `taxRegime` | enum | validação cruzada RB-07 · dimensão fiscal | NÃO — default presumido |
| `annualRevenueRange` | enum | validação cruzada RB-07 · dimensão porte | NÃO — default desconhecido |
| `setor_regulado` | boolean | ativa obrigacao_acessoria regulatória | NÃO — default false |
| `orgao_regulador_principal` | enum_array | sub-categorias risco regulatório | SIM se setor_regulado=true |
| `opera_territorio_incentivado` | boolean | modifica aliquota_zero, imunidade ZFM | NÃO — default false |
| `tipo_territorio_incentivado` | enum | ZFM→bloqueia IBS/CBS; RECOF/REPORTO→suspensão | SIM se opera_territorio=true |
| `papel_comercio_exterior` | enum | importador→regime_diferenciado; exportador→aliquota_zero | NÃO — default nenhum |
| `isEconomicGroup` | boolean | sinaliza complexidade societária · ativa inscricao_cadastral multi-estab · **não bloqueia** | NÃO — default false |
| ~~`analise_1_cnpj_operacional`~~ | **removido v3** | removido da UI — análise sempre por CNPJ individual | — |
| `status_arquetipo` | derivado | **gate E2E único** — bloqueia /briefing se ≠ confirmado | **SIM — gate obrigatório** |

---

## 6. Regras de Bloqueio (v3)

| ID | Condição | Tipo | Mudança v3 |
|----|----------|------|------------|
| RB-01 | `possui_bens=true` AND `principaisProdutos` vazio | HARD BLOCK | sem mudança |
| RB-02 | `possui_servicos=true` AND `principaisServicos` vazio | HARD BLOCK | sem mudança |
| RB-03 | `papel_comercio_exterior ≠ nenhum` AND `natureza_da_operacao` vazio | HARD BLOCK | sem mudança |
| RB-04 | `setor_regulado=true` AND `orgao_regulador_principal` vazio | HARD BLOCK | sem mudança |
| RB-05 | `opera_territorio_incentivado=true` AND `tipo_territorio_incentivado` vazio | HARD BLOCK | sem mudança |
| **RB-06-INFO** | `isEconomicGroup=true` | **INFO_ONLY** | **v3: HARD BLOCK → INFO_ONLY (A05)** |
| RB-07 | `taxRegime=simples_nacional` AND `annualRevenueRange` > 4,8M | HARD BLOCK | sem mudança |
| RB-08 | `status_arquetipo ≠ confirmado` → bloqueia /briefing | GATE E2E | **v3: único gate (A06)** |

---

## 7. Gate E2E (v3)

```typescript
// Gate E2E v3 — simplificado (A06)
// Depende APENAS de status_arquetipo = confirmado
// (status_arquetipo = confirmado implica que todos os HARD BLOCKs foram resolvidos)

function isE2EGateOpen(profile: PerfilEntidade): boolean {
  return profile.status_arquetipo === 'confirmado';
}

// Antes (v2) — REMOVIDO:
// function isE2EGateOpen_v2(profile): boolean {
//   return profile.status_arquetipo === 'confirmado'
//     && profile.analise_1_cnpj_operacional === true
//     && !profile.blockers?.some(b => b.severity === 'HARD_BLOCK');
// }
```

---

## 8. Backlog Pendente (não agir sem autorização P.O.)

- Criar migration para tabela `eligibility_audit_log`
- Criar `drizzle/downs/0089_down.sql`
- Resolver divergência sandbox main (tag `backup/main-pre-sync-20260421-230108` preservada)
- Corrigir trigger `smoke-post-deploy.yml`
- Retomar Sprint Z-22 — Issue #725 (Dashboard Compliance v3)

---

*Documento gerado em 2026-04-23 · branch `docs/m1-arquetipo-exploracao` · artefato pré-M1 · sem implementação*
