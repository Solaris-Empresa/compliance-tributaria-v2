# SPEC-RUNNER-RODADA-D — Runner v3 para validar modelo dimensional

**Status:** DRAFT — aguardando aprovação do P.O.
**Data:** 2026-04-24
**Contexto:** Epic #830 — RAG com Arquétipo (M1) — pré-M1
**Base normativa:**
- ADR-0031 (modelo dimensional)
- ADR-0032 (imutabilidade + versionamento)
- DE-PARA-CAMPOS-PERFIL-ENTIDADE (§2.5, §2.6)
**Substitui:** runner v2 em `tests/archetype-validation/run-50-v2.mjs`
**Objetivo:** ter um contrato implementável sem ambiguidade para runner v3, antes de qualquer código.

## Por que esta SPEC existe

Runner v2 usa modelo flat de 17 campos + `contains()` (substring match) + gate por score. Viola ADR-0031 §Princípio 2 (proibição de inferência semântica aberta) e §Princípio 3 (derivações devem usar enums fechados). Precisa ser reescrito, não emendado.

**Regra de operação:** nenhuma linha de código escrita até esta SPEC ser aprovada pelo P.O. Implementação gera `tests/archetype-validation/run-50-v3.mjs` (arquivo novo; v2 permanece até GO formal).

---

## §1. Contrato público do runner v3

### §1.1. Entrada

- Arquivo de suite: `M1-arquetipo-50-casos-brasil-v3.json` (arquivo **novo**; v2 permanece imutável por ADR-0032 §4)
- Cada case tem `id`, `macro_setor`, `scenario_name`, `seed_data` com o mesmo contrato de campos de entrada já existente no v2 (não é mudança de shape; é reinterpretação)
- Campos adicionais por case (aceitos, opcionais): `expected_status`, `expected_blockers`, `expected_dimensions` — para testes de regressão

### §1.2. Saída

JSON único no stdout com a estrutura:

```jsonc
{
  "suite_name": "M1-arquetipo-50-casos-brasil-v3",
  "phase": "PRE_M1_EXPLORACAO",
  "model_version": "m1-v1.0.0",
  "rules_hash": "sha256:…",
  "executed_at": "ISO-8601",
  "summary": { /* §5 */ },
  "verdict": { "decision": "GO" | "NO-GO", "rationale": ["…"] },
  "results": [ /* array de TestResult §1.3 */ ]
}
```

### §1.3. `TestResult` por case

```jsonc
{
  "id": "S01",
  "scenario_name": "Supermercado de bairro",
  "status": "PASS" | "FAIL" | "BLOCKED",  // status do TESTE (Q-C3 RESOLVIDA 2026-04-24 — AMBIGUOUS removido)
  "arquetipo": { /* PerfilDimensional §6 */ },
  "blockers_triggered": [ { "id": "V-XX", "severity": "HARD_BLOCK" | "BLOCK_FLOW" | "INFO", "rule": "…" } ],
  "missing_required_fields": ["…"],
  "notes": ["…"]
}
```

### §1.4. Invariantes de entrada-saída

- O runner é **função pura**: mesma entrada → mesma saída byte-a-byte
- Zero chamada de LLM, rede, arquivo fora do suite JSON
- Zero dependência de hora do sistema fora de `executed_at` (que é escrito, não lido)
- Zero uso de `Math.random` ou qualquer não-determinismo

### §1.5. Origem da seed — reuso do fluxo CNAE existente (decisão P.O. 2026-04-24)

A seed entra no runner **já com CNAEs confirmados**. O runner **não** invoca RAG/LLM de sugestão de CNAE — essa etapa é **upstream**, no frontend `NovoProjeto.tsx` via botão explícito "Identificar CNAEs" (ver DE/PARA §9.1.1).

Decisão vinculante:
- Runner v3 **não** reescreve a rotina/modal CNAE existente em produção
- `seed.cnae_principal_confirmado` e CNAEs adicionais são tratados como **input confirmado pelo usuário**, não como sugestão a validar
- Fluxo RAG/LLM de CNAE permanece intocado (zero mudança em `server/routers/` relacionado)

---

## §2. Derivação 17 campos → 5 dimensões

Atende ponto 1 da instrução. Função pura `derivePerfilDimensional(seed) → PerfilDimensional`. Cada dimensão abaixo define: inputs, tabela de mapeamento enum-para-enum, política de conflito, política de ausência.

### §2.0. Princípios fundamentais (aprovados Bloco 1 — 2026-04-24)

Decisão P.O. sobre Q-2 (operationType) consolidou os princípios base do mapping. Aplicam-se a toda §2:

1. **Dimensões são fonte de verdade.** Nenhum campo legado (operationType, possui_bens, possui_servicos, etc.) é fonte primária em projetos `m1-v1.0.0`
2. **Mapping 17 → 5 dimensões** definido como: `objeto` · `papel_na_cadeia` · `tipo_de_relacao` · `territorio` · `regime` (conforme ADR-0031)
3. **Proibido `contains()` / substring match** — apenas igualdade em enum fechado (detalhes em §3)
4. **`possui_bens` e `possui_servicos` são DERIVADOS**, não mais campos da seed. Detalhe em §2.7
5. **`papel_na_cadeia` é valor ÚNICO** (escalar, enum fechado §3.3)
6. **`tipo_de_relacao` e `territorio` são MULTI-SELECT** (arrays de enum fechado §3.4, §3.5)
7. **`buildPerfilEntidade` é função determinística** — mesma seed → mesmo output byte-idêntico (Invariante I-1 §8.1)

Entrada canônica do runner v3 é a seed **sem** `possui_bens`/`possui_servicos` (ver §1.1 + §2.7).

### §2.1. `objeto[]` — dimensão de objeto da operação

**Inputs da seed (canônicos em v3):**
- `tipo_objeto_economico[]` (enum fechado, ver §3.2)
- `ncms_principais[]` (strings NCM)
- `nbss_principais[]` (strings NBS)

**Inputs proibidos em v3:**
- ~~`possui_bens`~~ (agora derivado — ver §2.7)
- ~~`possui_servicos`~~ (agora derivado — ver §2.7)

**Política:**
1. `objeto[]` é enum fechado — valores válidos listados na §3.2
2. Mapeamento por **igualdade em enum**, nunca substring (Princípio §2.0.3)
3. Se `tipo_objeto_economico` contém `"Bens/mercadorias"` E `ncms_principais` é não-vazio → `objeto` inclui categoria derivada do NCM (tabela §2.1.1)
4. Se `tipo_objeto_economico` contém `"Servicos"` E `nbss_principais` é não-vazio → `objeto` inclui categoria derivada do NBS
5. Ausência total de sinal → `objeto = []` (dispara `missing_required_fields`)

**Derivação NCM → objeto (Q-D1 RESOLVIDA 2026-04-24 · Opção B aprovada):** camada de tradução sobre o Decision Kernel existente em `server/lib/decision-kernel/engine/ncm-engine.ts` (`lookupNcm()`). Função `deriveObjetoFromNcm(ncm)` consome `result.regime` e traduz via tabela declarativa para valor do enum `objeto`. Spec: `NCM-OBJETO-LOOKUP.md`. **NÃO cria lookup novo; reusa engine existente.**

**Derivação NBS → objeto (Q-D1 Opção B):** análoga, usando `lookupNbs()`. Spec: `NBS-OBJETO-LOOKUP.md`.

**Comportamento por classe (Q-D1 v2 + Ajustes A/B 2026-04-24):**

1. **Classe 1 — Tradução determinística:** tupla `(regime, imposto_seletivo, chapter/divisao)` bate em alguma regra → valor do enum objeto. Caminho feliz.

2. **Classe 2 — Fallback tolerante (Ajuste A):** `regime === "regime_geral"` com `confianca.tipo === "fallback"` (código fora do dataset) → retorna valor genérico (`bens_mercadoria_geral` para NCM · `servico_geral` para NBS) + blocker `V-10-FALLBACK` severity **INFO**. `status_arquetipo` inalterado. Test result: **PASS**. **Runner não quebra** com dataset sub-dimensionado.

3. **Classe 3 — AmbiguityError (HARD_BLOCK):** três situações:
   - `pending_validation` → `V-10-PENDING` HARD_BLOCK
   - `regime_especial` (NBS) ou `reducao_60` em setor/divisão sem regra → `V-10-UNMAPPED-TUPLE` HARD_BLOCK
   - Tupla inédita (regime ou chapter novo) → `V-10-UNMAPPED-TUPLE` HARD_BLOCK
   
   Nestes casos: `status_arquetipo = "inconsistente"` via regra 2 da §4.2.1.

**D-N6/D-B6 RESOLVIDAS 2026-04-24 (pós-medição real):** disambiguação via tupla `(regime, IS, chapter/divisao)` extraída determinísticamente do próprio código. Ver NCM-OBJETO-LOOKUP §3.3 + NBS-OBJETO-LOOKUP §3.3.

### §2.2. `papel_na_cadeia` — dimensão de papel

**Inputs:**
- `posicao_na_cadeia_economica` (string)
- `operacoes_secundarias[]`
- `atua_como_marketplace_plataforma` (bool)
- `papel_operacional_especifico[]`
- `papel_comercio_exterior[]`

**Política:** enum fechado (§3.3). Nunca multi-valor (a dimensão é escalar, não array).

**Tabela de decisão determinística (ordem importa — primeira regra que bate vence):**

| Condição (avaliada em ordem) | `papel_na_cadeia` |
|---|---|
| `posicao_na_cadeia_economica == "Produtor/fabricante"` | `fabricante` |
| `posicao_na_cadeia_economica == "Atacadista"` | `distribuidor` |
| `posicao_na_cadeia_economica == "Varejista"` | `varejista` |
| `posicao_na_cadeia_economica == "Prestador de servico"` | `prestador` |
| `posicao_na_cadeia_economica == "Operadora"` | `operadora_regulada` |
| `atua_como_marketplace_plataforma == true` (Q-3 RESOLVIDA) | `intermediador` + exigir `tipo_de_relacao = ["intermediação"]` em composição (ver §2.2.2) |
| `"Transporte"` ∈ `natureza_operacao_principal` | `transportador` |
| `papel_comercio_exterior` não-vazio | `importador` OU `exportador` (ver §2.2.1) |
| default | `indefinido` → dispara `missing_required_fields` |

#### §2.2.1. Composição `importador`/`exportador` (Q-D2 RESOLVIDA 2026-04-24)

**Regra determinística de derivação** a partir da seed — algoritmo em 3 passos:

**Passo 1 — Normalização dos sinais:**

```
sinais_cex = Set(papel_comercio_exterior[])
  ∪ (if atua_importacao == true: {"Importador"})
  ∪ (if atua_exportacao == true: {"Exportador"})
```

União dos campos explícitos da seed — `papel_comercio_exterior[]` tem precedência, `atua_importacao`/`atua_exportacao` são promovidos quando array é vazio.

**Passo 2 — Tabela de decisão (escalar `papel_na_cadeia`):**

| Condição | `papel_na_cadeia` | `territorio[]` adiciona |
|---|---|---|
| `sinais_cex == {"Importador"}` | `importador` | `internacional` |
| `sinais_cex == {"Exportador"}` | `exportador` | `internacional` |
| `sinais_cex == {"Importador", "Exportador"}` | `comercio_exterior_misto` | `internacional` |
| `sinais_cex == ∅` | (cai em outra regra da tabela §2.2 — produtor/fabricante/varejista/etc.) | — |

**Passo 3 — Coerência declarativa:**

Seed com ambos os estilos conflitantes (ex.: `papel_comercio_exterior=["Importador"]` AND `atua_exportacao=true`) → **união dos sinais vence**. Nunca há contradição porque o algoritmo toma o supremo.

Exemplo:
```
seed.papel_comercio_exterior = ["Importador"]
seed.atua_importacao = true
seed.atua_exportacao = true
→ sinais_cex = {"Importador", "Exportador"}
→ papel_na_cadeia = "comercio_exterior_misto"
→ territorio inclui "internacional"
```

**Nota importante:** esta derivação **força** `territorio[]` a conter `"internacional"` (Passo 2 coluna 3). Isso significa que C3-01/02/03 de LOGICAL-CONFLICTS **nunca disparam quando a derivação é executada corretamente** — tornam-se **guardrails defensivos** contra seed malformada ou upstream que pula a derivação.

#### §2.2.2. Composição marketplace (Q-3 RESOLVIDA 2026-04-24)

**Marketplace é modelado como composição, não como enum próprio.** A combinação canônica é:

- `papel_na_cadeia = "intermediador"`
- `tipo_de_relacao = ["intermediação"]` (**exclusivamente**; sem outros valores)

**Regra de ambiguidade crítica:**

Se `papel_na_cadeia = "intermediador"` E `tipo_de_relacao` contém `"venda"` (ou qualquer outro valor além de `"intermediação"`) → **AmbiguityError**.

Motivação: marketplace-com-estoque (intermediador que também vende produtos próprios) tem dois streams de receita com tratamentos tributários distintos e não pode ser reduzido a um único `OperationType` sem refinamento. Forçar decisão explícita > fallback silencioso (lição Z-17).

**Efeito em `deriveOperationType()`:** ver DERIVATION-OPERATIONTYPE §3.2 R-21 + §4 (AmbiguityError) — esta regra desbloqueia R-21 que estava pendente Q-3.

**Efeito em `status_arquetipo`:** AmbiguityError → `inconsistente` (via regra 2 da §4.2.1).

### §2.3. `tipo_de_relacao[]` — dimensão da relação com objeto

**Inputs:**
- `natureza_operacao_principal[]`
- `fontes_receita[]`
- `operacoes_secundarias[]`

**Política:** enum fechado (§3.4). Array porque uma mesma entidade pode ter múltiplas relações.

**Tabela de mapeamento:**

| `fontes_receita` valor | `tipo_de_relacao` valor |
|---|---|
| `"Venda de mercadoria"` | `venda` |
| `"Producao propria"` | `producao` |
| `"Prestacao de servico"` | `servico` |
| `"Assinatura/mensalidade"` | `servico` |
| `"Comissao/intermediacao"` | `intermediacao` |
| `"Aluguel/locacao"` | `locacao` |
| `"Royalties/licenciamento"` | `locacao` |
| `"Outras receitas operacionais"` | `indefinida` (dispara nota, não bloqueia) |

Deduplicar resultado final. Ex.: fontes = `["Prestacao de servico","Assinatura/mensalidade"]` → `tipo_de_relacao = ["servico"]`.

**Gap fechado 2026-04-24 (ratificação P.O.):** mapeamento `"Producao propria" → "producao"` adicionado para cobrir cenários de fabricantes/agros (papel=fabricante ou produtor) que declaram produção própria como fonte de receita. Regra C1-02 (LOGICAL-CONFLICTS §4) permanece inalterada e agora é alcançável via esta fonte declarativa. Mapping incluído no manifesto m1-v1.0.0 e sujeito a bump de versão se alterado no futuro.

### §2.4. `territorio[]` — dimensão territorial

**Inputs:**
- `abrangencia_operacional[]`
- `opera_multiplos_estados` (bool)
- `possui_filial_outra_uf` (bool)
- `uf_principal_operacao`
- `opera_territorio_incentivado` (bool)
- `tipo_territorio_incentivado[]`
- `atua_importacao` / `atua_exportacao`

**Política:** enum fechado (§3.5). Array.

**Regras (agregam, não excluem):**

| Condição | Contribui em `territorio[]` |
|---|---|
| `"Apenas municipal"` ∈ `abrangencia_operacional` | `municipal` |
| `opera_multiplos_estados == true` OU `"Interestadual"` ∈ `abrangencia_operacional` | `interestadual` |
| `"Nacional"` ∈ `abrangencia_operacional` | `nacional` |
| `atua_importacao == true` OU `atua_exportacao == true` OU `papel_comercio_exterior.length > 0` | `internacional` (Q-D2 RESOLVIDA — garante coerência com §2.2.1) |
| `opera_territorio_incentivado == true` E `"ZFM"` ∈ `tipo_territorio_incentivado` | `ZFM` |
| `opera_territorio_incentivado == true` E `"ALC"` ∈ `tipo_territorio_incentivado` | `ALC` |
| `opera_territorio_incentivado == true` E outro valor | `incentivado_outro` |

Se vazio após todas as regras → `territorio = []`. Não é sinal de erro por si só — depende de outros blockers.

### §2.5. `regime` — dimensão de regime tributário

**Inputs:**
- `regime_tributario_atual` (enum)
- `possui_regime_especial_negocio` (bool)
- `tipo_regime_especial[]`

**Política:** enum fechado escalar (§3.6).

**Tabela:**

| `regime_tributario_atual` | `regime` |
|---|---|
| `"Simples Nacional"` | `simples_nacional` |
| `"Lucro Presumido"` | `lucro_presumido` |
| `"Lucro Real"` | `lucro_real` |
| `"MEI"` | `mei` |
| null/undefined | `indefinido` (dispara `missing_required_fields`) |

Se `possui_regime_especial_negocio == true` → conteúdo de `tipo_regime_especial[]` é copiado para campo contextual `regime_especifico[]` (Q-D3 RESOLVIDA 2026-04-24 — ver §2.6). **`regime` (dimensão escalar) nunca é alterado** por regime especial; os dois coexistem ortogonalmente.

### §2.6. Campos contextuais (Q-D4 RESOLVIDA 2026-04-24)

Não dimensionais, mas obrigatórios para setores regulados:

- **`subnatureza_setorial: string[]`** (sempre array, nunca string simples)
  - 1 valor → `["telecomunicacoes"]`
  - Múltiplos valores → `["telecomunicacoes", "saude"]` (empresas multi-setor regulado)
  - Nenhum valor → `[]` (empresa não opera em setor regulado)
  - Fonte: copiado da seed `subnatureza_setorial[]`
  - Enum v1 (7 valores, extensível): `["telecomunicacoes", "saude", "saude_regulada", "energia", "financeiro", "combustiveis", "transporte"]`

- **`orgao_regulador: string[]`** (sempre array)
  - Copiado de `orgao_regulador_principal[]` da seed
  - Enum aberto v1: `["ANATEL", "ANVISA", "ANS", "ANEEL", "BCB", "CVM", "SUSEP", "ANP", "ANTT", "ANTAQ", "ANAC", ...]`

- **`regime_especifico: string[]`** (Q-D3 RESOLVIDA 2026-04-24 — campo contextual ortogonal ao `regime` dimensional)
  - `[]` → sem regime específico setorial
  - Valores de exemplo: `["combustivel_monofasico"]`, `["bebida_substituicao_tributaria", "energia_diferenciado"]`, etc.
  - Fonte: copiado de `tipo_regime_especial[]` da seed quando `possui_regime_especial_negocio == true`
  - Enum v1 (aberto, extensível conforme dataset cresce): valores declarados em artefato-filho futuro ou no manifesto; v1.0 mantém aberto
  - **Atua como modificador** — não substitui `regime` principal; pode relaxar certos conflitos (ver LOGICAL-CONFLICTS D-LC-4)

**Regra de obrigatoriedade condicional** (formalizada em LOGICAL-CONFLICTS C2/C6):
- Se `papel_na_cadeia == "operadora_regulada"` → `subnatureza_setorial` deve ter **pelo menos 1 valor** (via `missing_required_fields` se vazio)
- Consistência setor-regulador: conflito C6 se subnatureza contém valor X e órgão regulador correspondente ausente

### §2.7. Helpers derivados internos

Aprovação Bloco 1 removeu `possui_bens` e `possui_servicos` da seed v3 (Princípio §2.0.4). Permanecem necessários como **predicados internos** para decidir:
- se o bloco de coleta de NCM é obrigatório
- se o bloco de coleta de NBS é obrigatório
- se `missing_required_fields` inclui `ncms_principais` ou `nbss_principais`

São **funções puras** sobre a seed, não campos persistidos:

```ts
function hasObjetoBens(seed: Seed): boolean {
  return Array.isArray(seed.tipo_objeto_economico)
    && seed.tipo_objeto_economico.includes("Bens/mercadorias");
}

function hasObjetoServicos(seed: Seed): boolean {
  return Array.isArray(seed.tipo_objeto_economico)
    && seed.tipo_objeto_economico.includes("Servicos");
}
```

**Política:**
- `hasObjetoBens` ∨ `hasObjetoServicos` deve ser verdadeiro para qualquer seed válido (exceto controle negativo); caso contrário seed é estruturalmente incompleto
- **Não** são campos de saída — não aparecem em `arquetipo` nem em `perfil_hash`
- **Não** vão para o snapshot — ADR-0032 §2 considera apenas as 5 dimensões + contextuais
- Retroação: seeds v2 com `possui_bens`/`possui_servicos` serão **ignoradas** em v3; migração manual converte para `tipo_objeto_economico` (fora de escopo deste SPEC — proibido migrar automaticamente por ADR-0032 §4)

### §2.8. Derivação reversa legada — `OperationType`

Decisão Q-2 (Opção A aprovada 2026-04-24) estabelece `operationType` como campo **derivado** das dimensões, não mais entrada direta.

Função `deriveOperationType(perfil: PerfilDimensional): OperationType` é especificada em artefato-filho obrigatório `DERIVATION-OPERATIONTYPE.md` (§10.3 Q-D7) — criado nesta sessão junto com esta SPEC.

**Regras vinculantes (P.O. 2026-04-24):**

1. **Determinística** — sem LLM, sem `contains()`, sem fallback silencioso (Princípio §2.0.3, §2.0.7)
2. **Ambiguidade lança erro** — nunca warning; runner trata como FAIL estrutural
3. `operationProfile.operationType` no banco **permanece como valor derivado**, gravado pelo fluxo M1; ADR-0032 §4 proíbe DROP
4. **Projetos legados** (`profileVersion='1.0'`) **não recalculam** — `operationType` original preservado para briefings já gerados
5. **Snapshot do arquétipo inclui** `derived_legacy_operation_type` (campo **obrigatório**, não opcional) — ver §6.1 shape
6. **Usuário não pode editar** `operationType` em projetos `m1-v1.0.0+` — campo é read-only derivado; UX deve refletir

**Relação com `perfil_hash`:** `derived_legacy_operation_type` **não entra** no `perfil_hash` (§6.2) porque é computável determinístico a partir das 5 dimensões + contextuais. Entra no **output do snapshot** para auditoria e consumo direto pelo gate Hotfix IS sem recomputar.

**Relação com `rules_hash`:** o manifesto da tabela de decisão `(papel, relação, objeto) → OperationType` **entra** em `rules_hash` (§6.3) com chave `derivation_rules.operation_type_legacy`. Mudança na tabela implica bump de `model_version`.

**Camada de compatibilidade:** `server/lib/risk-eligibility.ts` **não é alterado** — continua recebendo `OperationType`, apenas muda a origem.

---

## §3. Substituição de `contains()` por enum fechado

Atende ponto 2. Cataloga as ocorrências atuais em `run-50-v2.mjs` e define mapeamentos.

### §3.1. Ocorrências em v2 a eliminar

| Local | Uso atual | Violação ADR-0031 |
|---|---|---|
| `run-50-v2.mjs:22-26` (fn `contains`) | Declaração de `contains` (substring match `.includes`) | **Princípio 2** — inferência semântica aberta |
| `run-50-v2.mjs:52` | `contains(seed.tipo_objeto_economico, "bens")` | Princípio 2 + 3 |
| `run-50-v2.mjs:58` | `contains(seed.tipo_objeto_economico, "servicos")` | Princípio 2 + 3 |

**Resolução:** remover a função `contains` inteiramente em v3. Toda comparação usa:

```ts
function hasEnumValue<T extends string>(arr: readonly T[], value: T): boolean {
  return Array.isArray(arr) && arr.includes(value);  // comparação de igualdade, não substring
}
```

### §3.2. Enum fechado `TIPO_OBJETO_ECONOMICO` (input da seed)

Valores aceitos exatos (case-sensitive) no input `seed.tipo_objeto_economico[]`:

```
["Bens/mercadorias", "Servicos", "Energia/combustiveis", "Digital", "Financeiro", "Agricola", "Pecuario", "Misto"]
```

Input com valor fora deste conjunto → runner registra erro estrutural (não é gap de dado — é seed inválido).

### §3.2.1. Enum fechado `objeto` (output derivado — Q-D1 v2 + Ajuste B 2026-04-24)

Valores do array `arquetipo.objeto[]` após derivação via tupla `(regime, IS, chapter/divisao)`:

```
["combustivel", "bebida", "tabaco", "alimento", "medicamento",
 "energia_eletrica", "servico_financeiro", "servico_digital", "servico_regulado",
 "bens_industrializados", "bens_mercadoria_geral", "servico_geral",
 "agricola", "pecuario"]
```

**14 categorias (Ajuste B 2026-04-24):** enum **não é expandido** agora. Valores como `servico_educacional` ou `servico_saude` ficam fora do v1.0 — a expansão só ocorre após validação com dados reais (dataset enrichment). Categorias como educação/saúde pública são temporariamente mapeadas via regras criativas (`servico_geral`, `servico_regulado`).

**Ajuste Q-D1 2026-04-24:** valor `"outros"` removido em rodada anterior — mantido fora do enum.

**Fonte:** `NCM-OBJETO-LOOKUP.md` §2 + `NBS-OBJETO-LOOKUP.md` §2 (compartilhado).

**Comportamento sem match (Ajuste A 2026-04-24):** 
- `regime_geral + fallback` → valor genérico + `V-10-FALLBACK` severity INFO (**runner continua PASS**)
- `pending_validation` ou tupla não-mapeada → `V-10-PENDING` / `V-10-UNMAPPED-TUPLE` severity HARD_BLOCK → inconsistente → FAIL

Ver NCM-OBJETO-LOOKUP §4 + NBS-OBJETO-LOOKUP §4.

### §3.3. Enum `papel_na_cadeia`

```
["fabricante", "distribuidor", "varejista", "prestador", "transportador",
 "importador", "exportador", "comercio_exterior_misto", "intermediador",
 "produtor", "operadora_regulada", "indefinido"]
```

**Nota (Q-3 RESOLVIDA 2026-04-24):** `marketplace` **NÃO** é enum próprio. Marketplace é modelado como a composição `papel_na_cadeia = "intermediador"` + `tipo_de_relacao = ["intermediação"]`. Ver §2.2 derivação e DERIVATION-OPERATIONTYPE §3.2.

### §3.4. Enum `tipo_de_relacao`

```
["venda", "servico", "producao", "intermediacao", "locacao", "indefinida"]
```

### §3.5. Enum `territorio`

```
["municipal", "estadual", "interestadual", "nacional", "internacional", "ZFM", "ALC", "incentivado_outro"]
```

### §3.6. Enum `regime` (Q-D3 RESOLVIDA 2026-04-24)

```
["simples_nacional", "lucro_presumido", "lucro_real", "mei", "indefinido"]
```

**5 valores** (antes 6). `regime_especifico_setorial` **REMOVIDO** do enum — era erro categorial: regime tributário principal (Simples/Presumido/Real/MEI) é mutuamente exclusivo enquanto regimes específicos setoriais (monofásico, ST, etc.) são **aditivos** ao regime principal.

Regimes específicos setoriais agora vivem em campo contextual separado `regime_especifico: string[]` (ver §2.6) — modificador, não substituto.

### §3.7. Todas as comparações devem ser igualdade estrita

- `arr.some(x => x === value)` — OK
- `arr.includes(value)` — OK (comparação por `===`)
- `arr.some(x => x.includes(value))` — **PROIBIDO**
- `String(x).toLowerCase().includes(n)` — **PROIBIDO**
- Regex — **PROIBIDO**

---

## §4. Novo enum `status_arquetipo`

Atende ponto 3. Este é o campo DENTRO do arquétipo, separado do `status` de resultado do teste (§5).

### §4.1. Valores

```
["pendente", "inconsistente", "bloqueado", "confirmado"]
```

### §4.2. Máquina de estado (derivação determinística)

**Q-6 RESOLVIDA 2026-04-24 · Opção 1 com interpretação híbrida.** Estados são do snapshot no momento da captura; `confirmado` e `bloqueado` são terminais; edição após `confirmado` cria **novo snapshot** preservando o anterior (ADR-0032 §1/§6).

#### §4.2.1. Tabela de derivação (ordem determinística, top-down — primeira regra que bate vence)

| # | Condição | `status_arquetipo` | Origem |
|---|---|---|---|
| 1 | Blocker com `severity = BLOCK_FLOW` (HARD_BLOCK de negócio, ex.: V-05-DENIED) | `bloqueado` | Regra 1 do P.O. |
| 2 | `AmbiguityError` lançado por **qualquer** função de derivação — `deriveOperationType()`, `deriveObjetoFromNcm()`, `deriveObjetoFromNbs()` | `inconsistente` | Regra 2 do P.O. |
| 3 | Conflito lógico detectado entre dimensões (ver §4.2.2) | `inconsistente` | Regra 3 do P.O. |
| 4 | `missing_required_fields` não-vazio (campos obrigatórios faltando) | `inconsistente` | Regra ajuste adicional (Q-C2 resolvida) |
| 5 | Seed tem `user_confirmed == true` E não bateu condições 1-4 | `confirmado` | Regra 4 do P.O. |
| 6 | default (dados completos, sem ambiguidade, sem conflito, sem confirmação) | `pendente` | — |

**Nota sobre V-05-INFO:** `severity = "INFO"` **não altera** `status_arquetipo` (Regra 3 do P.O.). Aparece em `blockers_triggered` como observabilidade; não entra na tabela acima.

#### §4.2.2. Semântica dos estados (Q-C2 resolvida junto)

- **`pendente`** — estado de **espera coerente**. Todos os dados válidos, sem ambiguidade, sem conflito, sem HARD_BLOCK. O snapshot existe e é consistente; falta apenas a ação explícita de confirmação do usuário. **Sem issues detectadas.**
- **`inconsistente`** — estado com **qualquer issue detectada**. Cobre três classes, todas emitindo blockers em `blockers_triggered`:
  1. **Quantitativa** — `missing_required_fields` não-vazio (campos obrigatórios ausentes)
  2. **Qualitativa** — conflito lógico entre dimensões (ex.: `papel="transportador"` + `tipo_de_relacao=["venda"]`)
  3. **Derivação legada** — `AmbiguityError` em `deriveOperationType()` (ex.: papel bloqueado por Q-3 pendente)
- **`bloqueado`** — HARD_BLOCK de negócio (V-05-DENIED e outros futuros). Terminal.
- **`confirmado`** — usuário confirmou explicitamente perfil sem issues. Terminal. ADR-0032 §1.

Conflitos lógicos (classe 2) detalhados em artefato-filho `LOGICAL-CONFLICTS-v1.0.md` — **criado 2026-04-24 (Q-C4 RESOLVIDA)**. 31 regras em 6 classes (C1-C6); cada conflito emite blocker `V-LC-NNN` severity HARD_BLOCK.

#### §4.2.3. Interação `AmbiguityError` × `status_arquetipo`

**Regra 2 do P.O.:** `AmbiguityError` lançada por `deriveOperationType()` → `status_arquetipo = "inconsistente"`.

Comportamento em runtime:

- **Snapshot emitido** com as 5 dimensões + contextuais + `status_arquetipo = "inconsistente"`
- **`derived_legacy_operation_type`:** `null` (derivação falhou)
- **`blockers_triggered`:** inclui `{id:"DERIVE-001", severity:"HARD_BLOCK", rule:<reason de DERIVATION §4>}`
- **Test result do runner:** `status = "FAIL"` (definido pelo critério de GO §5, que conta FAIL por presença de HARD_BLOCK) — ver §5.4 para refinamento da interação

Note: não há ortogonalidade — AmbiguityError **é** uma classe de inconsistência. Snapshot com AmbiguityError sempre terá `status_arquetipo = "inconsistente"`, nunca `confirmado`.

### §4.3. Transições de estado (Interpretação C — híbrida)

Estados `confirmado` e `bloqueado` são **terminais para o snapshot** (ADR-0032 §1). Novo snapshot em edição preserva o anterior. Transições abaixo operam na sequência de snapshots de um projeto:

| De | Evento | Para | Quem dispara |
|---|---|---|---|
| — | projeto criado | `pendente` | sistema |
| `pendente` | campos obrigatórios faltando (quantitativo) | `inconsistente` | sistema (validação automática) |
| `pendente` | conflito lógico entre dimensões (qualitativo) | `inconsistente` | sistema |
| `pendente` | `AmbiguityError` em `deriveOperationType()` | `inconsistente` | sistema |
| `pendente` | V-05-DENIED detectado | `bloqueado` | sistema |
| `pendente` | usuário clica "Confirmar" sem issues | `confirmado` | usuário (explícito) |
| `inconsistente` | usuário corrige e nova derivação limpa | `pendente` | sistema |
| `inconsistente` | usuário corrige mas nova submit ainda tem issues | `inconsistente` (novo snapshot) | sistema |
| `inconsistente` | V-05-DENIED em nova submit | `bloqueado` | sistema |
| `confirmado` | usuário edita formulário | **novo perfil** em `pendente` (antigo preservado imutável) | usuário → sistema |
| `bloqueado` | — | terminal | — |
| `confirmado` | — (sobre o mesmo snapshot) | terminal; ADR-0032 §1 | — |

### §4.4. Relação com os 51 cenários da suite v3

Suite v3 tem **51 casos** (Q-D6 RESOLVIDA 2026-04-24):

- **S01–S26, S28–S50** (49 casos PASS normais): `status_arquetipo` depende de `seed.user_confirmed` (Q-C1 RESOLVIDA):
  - `user_confirmed = true` + seeds v3 completos e coerentes → `confirmado`
  - `user_confirmed = false` ou ausente + seeds v3 completos → `pendente`
  - Seeds com campos faltantes ou conflito lógico → `inconsistente` (não deveriam existir em cenários válidos da suite)
- **S27** (controle negativo multi-CNPJ DENIED): `status_arquetipo = "bloqueado"` (V-05-DENIED dispara regra 1 da §4.2.1)
- **S51** (controle multi-CNPJ INFO — Q-4 RESOLVIDA): `status_arquetipo = "confirmado"` (INFO não altera estado); `blockers_triggered` contém `V-05-INFO`; test status = `PASS`

Suite v3 deve definir `user_confirmed` e flags multi-CNPJ por cenário para cobrir todos os estados.

### §4.5. `status_arquetipo` é parte do snapshot imutável

Uma vez calculado e escrito com `perfil_hash`, não muda. Nova entrada do usuário → novo snapshot (ADR-0032 §1).

### §4.6. Gate E2E — status_arquetipo == confirmado

**Decisão P.O. 2026-04-24:** frontend só permite avançar ao briefing quando `status_arquetipo == "confirmado"`.

| `status_arquetipo` | UI exibe | Avança para briefing? |
|---|---|---|
| `pendente` | Formulário (preencher ou "Confirmar perfil") | ❌ |
| `inconsistente` | Lista de conflitos lógicos + campos a corrigir | ❌ |
| `bloqueado` | `motivo_bloqueio` + orientação (ex.: "abrir projetos separados por CNPJ") | ❌ terminal |
| `confirmado` | Resumo read-only do perfil + link "Iniciar nova versão" | ✅ |

Gate E2E distinto do gate GO/NO-GO do runner (§5) — são ortogonais. Runner valida o **modelo**; gate E2E valida o **fluxo do usuário**.

### §4.7. Invariantes de estado (verificáveis em §9.1 e §8.1)

- **IS-1:** `status_arquetipo = "bloqueado"` → `motivo_bloqueio ≠ null`
- **IS-2:** `status_arquetipo ≠ "bloqueado"` → `motivo_bloqueio = null`
- **IS-3:** `status_arquetipo = "confirmado"` → `data_version` fixado; snapshot imutável (ADR-0032 §1)
- **IS-4:** nenhuma transição parte de `confirmado` ou `bloqueado` modificando o snapshot original
- **IS-5:** `status_arquetipo = "inconsistente"` → `blockers_triggered` contém pelo menos um blocker com `severity = "HARD_BLOCK"` e `rule` descrevendo a issue (missing field, conflito, ou AmbiguityError)
- **IS-6:** `deriveOperationType()` lançou `AmbiguityError` → `status_arquetipo = "inconsistente"` E `derived_legacy_operation_type = null` E `blockers_triggered` contém `{id:"DERIVE-001", severity:"HARD_BLOCK", ...}`
- **IS-7:** Blocker `severity = "INFO"` (ex.: V-05-INFO) **não altera** `status_arquetipo` — apenas aparece em `blockers_triggered` como observabilidade
- **IS-8:** `status_arquetipo = "confirmado"` → `seed.user_confirmed == true` (no runner v3) E **nenhum** blocker com `severity ∈ {"HARD_BLOCK", "BLOCK_FLOW"}` E `missing_required_fields = []`
- **IS-9 (reforço 2026-04-24):** `confirmed` é **mutuamente exclusivo** com inconsistência ou bloqueio — regra 5 da §4.2.1 só dispara após regras 1-4 falharem

### §4.7.1. Mapping `status_arquetipo` → `projects.status` (Q-8 RESOLVIDA 2026-04-24)

**Decisão P.O. 2026-04-24:** mapping **explícito**, sem colapsar estados, preservando semântica. Adiciona **4 valores novos** ao enum `projects.status` (existente em `drizzle/schema.ts`) para refletir cada estado do arquétipo no fluxo do projeto.

**Tabela de mapping:**

| Situação do arquétipo | `projects.status` recomendado | Quem transiciona |
|---|---|---|
| Projeto sem arquétipo ainda (user no form CNAE) | `rascunho` / `consistencia_pendente` / `cnaes_confirmados` (estados **existentes**) | sistema (fluxo atual preservado) |
| `status_arquetipo = pendente` (user preenchendo form dimensional) | **`perfil_pendente`** (NOVO) | sistema após user entrar na tela de Confirmação |
| `status_arquetipo = inconsistente` (validação detectou issues) | **`perfil_inconsistente`** (NOVO) | sistema (transição automática após detecção) |
| `status_arquetipo = bloqueado` (V-05-DENIED ou HARD_BLOCK terminal) | **`perfil_bloqueado`** (NOVO) | sistema (terminal) |
| `status_arquetipo = confirmado` (user clicou "Confirmar") | **`perfil_confirmado`** (NOVO) | usuário (ação explícita) |
| User avança após confirmado | `assessment_fase1` ou `diagnostico_corporativo` (existentes) | sistema (continua fluxo legado) |

**Posicionamento no enum atual** (após `cnaes_confirmados`, antes de `assessment_fase1`):

```
rascunho
  → consistencia_pendente
    → cnaes_confirmados
      → perfil_pendente        [NOVO]
        → perfil_inconsistente  [NOVO, cíclico com perfil_pendente]
        → perfil_bloqueado      [NOVO, terminal]
        → perfil_confirmado     [NOVO]
          → assessment_fase1 / diagnostico_corporativo
            → ... (fluxo existente inalterado)
```

**Invariantes:**
- **IS-M-1:** Se `status_arquetipo = "confirmado"` no snapshot ativo, então `projects.status ∈ {perfil_confirmado, assessment_fase1, onda1_solaris, ..., concluido, arquivado}` (após-confirmação)
- **IS-M-2:** Se `status_arquetipo = "bloqueado"`, então `projects.status = "perfil_bloqueado"` — terminal
- **IS-M-3:** Edição de projeto `perfil_confirmado` cria novo snapshot (pendente); `projects.status` **volta** para `perfil_pendente` (preserva snapshot anterior por ADR-0032 §1; projeto avança no tempo)
- **IS-M-4:** `projects.status = perfil_*` apenas em projetos com `profileVersion = "m1-v1.0.0"` (ou superior). Legados continuam em estados pré-existentes (ADR-0032 §4 não-migração)

**Migração de schema (a executar em M1-F2, fora do escopo desta SPEC):**

```sql
ALTER TABLE projects MODIFY COLUMN status ENUM(
  'rascunho',
  'consistencia_pendente',
  'cnaes_confirmados',
  -- NOVOS Q-8
  'perfil_pendente',
  'perfil_inconsistente',
  'perfil_bloqueado',
  'perfil_confirmado',
  -- existentes inalterados
  'assessment_fase1','assessment_fase2',
  'onda1_solaris','onda2_iagen',
  'diagnostico_corporativo','diagnostico_operacional',
  'q_produto','q_servico','diagnostico_cnae',
  'briefing','riscos','plano',
  'dashboard','matriz_riscos','plano_acao',
  'em_avaliacao','aprovado','em_andamento','concluido','arquivado'
) NOT NULL DEFAULT 'rascunho';
```

De 26 para **30 valores** no enum. Rollback: DROP dos 4 valores novos (mantém projetos em estados pré-existentes — ADR-0032 §4 protege).

### §4.8. Alinhamento com mockup

Pré-requisito para implementação (não deste runner): mockup HTML da tela "Confirmação do perfil" em `docs/epic-830-rag-arquetipo/mockups/MOCKUP_perfil-confirmacao.html` — a criar.

Requisitos mínimos do mockup:
1. Preview das 5 dimensões + contextuais + `derived_legacy_operation_type`
2. Botão "Confirmar perfil" (dispara `pendente → confirmado`)
3. Botão "Voltar e editar" (volta ao questionário)
4. Renderização diferenciada para cada estado (`pendente`/`inconsistente`/`bloqueado`/`confirmado`)
5. Para `confirmado`: opção "Iniciar nova versão" (cria novo perfil em `pendente`)
6. Para `inconsistente`: lista de conflitos lógicos com reason legível
7. Para `bloqueado`: mensagem de bloqueio + orientação

Fora de escopo da implementação do runner v3. Registrado como dependência do Gate UX da issue futura (REGRA-ORQ-09).

---

## §5. Critério de GO

Atende ponto 4. Gate **independente de score**.

### §5.1. Regra formal

```
GO ⟺ (FAIL == 0) ∧ (BLOCKED == 1)
NO-GO ⟺ ¬GO
```

**Q-C3 RESOLVIDA 2026-04-24:** enum `AMBIGUOUS` removido do runner. Todo estado de ambiguidade é tratado como `FAIL` (test result) com `status_arquetipo = "inconsistente"` (snapshot). Critério GO simplificado para 2 condições.

### §5.2. Justificativa

- `FAIL == 0`: nenhum cenário produz arquétipo incoerente com expectativa
- `BLOCKED == 1`: exatamente o controle negativo S27 (V-05-DENIED) dispara o gate multi-CNPJ
- (removido) ~~`AMBIGUOUS == 0`~~: enum AMBIGUOUS eliminado (Q-C3 RESOLVIDA — ambiguidade vira FAIL)
- **PASS rate não entra**: é observabilidade, não gate
- **S51** (V-05-INFO) conta como PASS — INFO não é blocker operacional

### §5.3. Observabilidade preservada

`summary.by_status` continua reportando contagem por estado. `confidence_stats` pode permanecer para debug, com linha explícita:

> `confidence` é campo informativo — NÃO libera o gate.

### §5.4. AMBIGUOUS em v3 — Q-C3 RESOLVIDA 2026-04-24 (Proposta A aprovada)

**Decisão final P.O. 2026-04-24:** enum `AMBIGUOUS` **REMOVIDO** do runner v3.

**Regra única:** toda ambiguidade é tratada como `inconsistente` (no snapshot) + `FAIL` (no test result). Não há estado intermediário.

**Mapeamentos após remoção:**
- Blockers `HARD_BLOCK` (AmbiguityError, V-10-PENDING, V-10-UNMAPPED-TUPLE, DERIVE-001) → `status_arquetipo = inconsistente` + test `status = FAIL`
- Blockers `BLOCK_FLOW` (V-05-DENIED) → `status_arquetipo = bloqueado` + test `status = BLOCKED`
- Blockers `INFO` (V-05-INFO, V-10-FALLBACK) → `status_arquetipo` inalterado + test `status = PASS`

**Justificativa:**
1. Simplifica gate GO (§5.1) de 3 condições para 2
2. Alinha test result com `status_arquetipo` (3 valores cada: PASS/FAIL/BLOCKED vs pendente/inconsistente/bloqueado; confirmado vira PASS)
3. Elimina categoria "warning estrutural" que na prática sempre se resolvia em FAIL ou PASS — não houve caso real da Proposta B

**Impacto nos 50 cenários da suite v2:** nenhum cenário v2 era AMBIGUOUS; a categoria existia no runner v2 mas não era exercida. Remoção é zero-risco para suite atual.

---

## §6. Estrutura do snapshot (ADR-0032)

Atende ponto 5. Cada `TestResult.arquetipo` carrega snapshot completo.

### §6.1. Shape exato

```jsonc
{
  // Dimensões (ADR-0031)
  "objeto": ["combustivel"],
  "papel_na_cadeia": "transportador",
  "tipo_de_relacao": ["servico"],
  "territorio": ["interestadual"],
  "regime": "lucro_real",

  // Contextuais (Q-D4 + Q-D3 RESOLVIDAS — 3 arrays contextuais)
  "subnatureza_setorial": [],       // array vazio = não-regulado; ex.: ["telecomunicacoes"]
  "orgao_regulador": [],            // ex.: ["ANATEL"]
  "regime_especifico": [],          // Q-D3: campo modificador; ortogonal ao regime principal; ex.: ["combustivel_monofasico"]

  // Campo derivado legado (Q-2 Opção A — obrigatório, não editável pelo usuário)
  "derived_legacy_operation_type": "servicos",

  // Metadata imutabilidade (ADR-0032 §2)
  "status_arquetipo": "pendente",
  "motivo_bloqueio": null,
  "model_version": "m1-v1.0.0",
  "data_version": "2026-04-24T12:00:00.000Z",
  "perfil_hash": "sha256:abcd1234…",
  "rules_hash": "sha256:ef567890…",
  "imutavel": true
}
```

**`derived_legacy_operation_type`:** computado por `deriveOperationType()` (ver `DERIVATION-OPERATIONTYPE.md`). Obrigatório em todo snapshot. Não entra em `perfil_hash` mas o ruleset que o produz entra em `rules_hash` (§6.3).

### §6.2. Composição de `perfil_hash`

```
perfil_hash = sha256(
  canonicalJSON(
    canonicalizeForHash({
      objeto, papel_na_cadeia, tipo_de_relacao, territorio, regime,
      subnatureza_setorial, orgao_regulador
    })
  )
)
```

### §6.2.1. Política de arrays (Q-D5 RESOLVIDA 2026-04-24)

**Decisão final P.O. 2026-04-24:**

1. `canonicalJSON()` **NÃO ordena arrays** — preserva byte-a-byte a ordem do input
2. `canonicalizeForHash()` é wrapper dedicado que aplica ordenação por **classe de array**
3. Arrays são classificados em duas categorias (registradas em CANONICAL-JSON-SPEC §7.3):

**Arrays NEUTROS** (wrapper ordena lexicograficamente):
- `objeto[]` · `territorio[]` · `tipo_de_relacao[]` · `orgao_regulador[]` · `subnatureza_setorial[]` · **`regime_especifico[]`** (Q-D3 RESOLVIDA)

**Arrays SEMÂNTICOS** (wrapper preserva ordem):
- `rules[]`, `enums.*[]`, `dimensions[]` no manifesto
- `ncms_principais[]`, `nbss_principais[]`, `natureza_operacao_principal[]`, `operacoes_secundarias[]` na seed
- `blockers_triggered[]` no test result

**Motivo:** ordem pode ser informação (precedência de regras, ranking canônico, hierarquia). Serializador genérico (`canonicalJSON`) não pode presumir que arrays são conjuntos. Classificação explícita no wrapper resolve a ambiguidade sem contradição entre specs.

**Aplicação:**
- `perfil_hash` usa `canonicalizeForHash(archetype)` antes de `canonicalJSON` — archetype tem arrays NEUTROS
- `rules_hash` usa `canonicalJSON(manifesto)` diretamente — manifesto é 100% SEMÂNTICO

Ver `CANONICAL-JSON-SPEC.md` §7 (especificação completa das 7 invariantes I-C1 a I-C7 + tabela de classificação).

### §6.3. Composição de `rules_hash`

**Q-5 RESOLVIDA 2026-04-24 — Opção C aprovada:** `rules_hash` é hash do **manifesto declarativo** do modelo lógico, nunca do código.

**Regras vinculantes (P.O. 2026-04-24):**

1. **Não** usar código-fonte como entrada do hash (bytecode, arquivo `.ts`, etc.)
2. **Não** usar dados de input (seed, respostas de usuário)
3. **Usar JSON canônico** com ordem determinística (chaves lexicográficas, arrays preservam ordem de definição)
4. **Hash apenas do modelo lógico** — dimensões + enums + derivações + regras de negócio

**Estrutura canônica do manifesto** (detalhe completo em artefato-filho `CANONICAL-RULES-MANIFEST.md`):

```jsonc
{
  "version": "m1-v1.0.0",
  "dimensions": ["objeto", "papel_na_cadeia", "tipo_de_relacao", "territorio", "regime"],
  "enums": {
    "papel_na_cadeia":        [ /* §3.3 */ ],
    "tipo_de_relacao":        [ /* §3.4 */ ],
    "territorio":             [ /* §3.5 */ ],
    "regime":                 [ /* §3.6 */ ],
    "tipo_objeto_economico":  [ /* §3.2 */ ],
    "status_arquetipo":       [ /* §4.1 */ ]
  },
  "derivations": {
    "operationType": "DERIVATION-OPERATIONTYPE.md@v1.0.0"
  },
  "rules": [
    "papel=transportador → not_contribuinte_IS",
    "papel=fabricante AND objeto IN combustiveis → contribuinte_IS"
    // lista completa em CANONICAL-RULES-MANIFEST.md
  ]
}
```

**Cálculo:**

```
rules_hash = "sha256:" + sha256(canonicalJSON(manifesto))
```

`canonicalJSON`: **Q-D5 RESOLVIDA 2026-04-24.** Regras formalizadas em `CANONICAL-JSON-SPEC.md` (criado nesta sessão, v1.0.0) — 6 regras canônicas:

| # | Regra |
|---|---|
| C-1 | Chaves ordenadas recursivamente (lexicographic Unicode) |
| C-2 | Arrays preservam ordem de definição (não reordenam automaticamente) |
| C-3 | Sem whitespace variável (single-line compacto) |
| C-4 | Tipos fixos (string, number, boolean, null, array, object) — Date/Map/Set proibidos |
| C-5 | `null` explícito (`undefined` proibido) |
| C-6 | Datas em ISO-8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`) |

Para arrays semanticamente neutros (`objeto[]`, `territorio[]`, etc.), usar wrapper `canonicalizeForHash()` que os ordena lexicograficamente antes (ver CANONICAL-JSON-SPEC §7).

**Vantagens:**
- Estável contra refactor interno que preserva semântica (bytecode muda, manifesto não)
- Legível e auditável por humano
- Independente de implementação/linguagem
- Decla­rativo: mudança de regra obriga bump de versão (processo de governança explícito)
- Compatível com política ADR-0032 §4 — manifestos antigos permanecem disponíveis para reprodução

**Ciclo de vida do manifesto** (ver CANONICAL-RULES-MANIFEST.md §5):
- **Patch** (`v1.0.1`): correção textual sem alteração semântica → não muda `rules_hash` se JSON canônico final é idêntico
- **Minor** (`v1.1.0`): regra aditiva (novo enum value, nova regra) → `rules_hash` muda
- **Major** (`v2.0.0`): regra que altera output de algum input existente → `rules_hash` muda; snapshots antigos preservam `rules_hash` anterior (não recalculam)

### §6.4. `data_version`

ISO-8601 UTC (ex.: `"2026-04-24T12:00:00.000Z"`). Escrito uma vez no momento da derivação. Nunca atualizado.

### §6.5. `model_version`

Inicial: `"m1-v1.0.0"`. Bumps semver:
- patch (`m1-v1.0.1`): correção de bug em função de derivação sem mudança de output em seeds válidos
- minor (`m1-v1.1.0`): nova dimensão, novo enum value (aditivo)
- major (`m1-v2.0.0`): quebra de contrato (remoção de enum, renomeação de dimensão)

### §6.6. `imutavel: true`

Marker explícito. Documenta a política. Não é "aplicada" pelo runner (que é leitura + computação); é aplicada pelo consumidor do snapshot (banco, frontend, M2).

---

## §7. Multi-CNPJ — modelo de 3 estados (NONE/INFO/DENIED)

Atende ponto 6. Estende V-05 em v2. **Q-4 RESOLVIDA 2026-04-24.**

### §7.1. Modelo canônico de 3 estados

Multi-CNPJ tem **exatamente 3 estados** derivados determinístico a partir de duas flags da seed:

| Estado | Condição na seed | Blocker emitido | `severity` | Efeito em `status_arquetipo` |
|---|---|---|---|---|
| **NONE** | `integra_grupo_economico == false` (ou ausente) | nenhum | — | nenhum |
| **INFO** | `integra_grupo_economico == true` E `analise_1_cnpj_operacional == true` | `V-05-INFO` | `INFO` | **não altera** (continua `pendente`/`confirmado` conforme §4.2.1) |
| **DENIED** | `integra_grupo_economico == true` E `analise_1_cnpj_operacional == false` | `V-05-DENIED` | `BLOCK_FLOW` | `bloqueado` |

**Regras (P.O. 2026-04-24):**
1. NONE → nada (nenhum blocker, nenhum efeito)
2. INFO → não altera `status_arquetipo`; apenas entra em `blockers_triggered` para observabilidade
3. DENIED → `status_arquetipo = "bloqueado"` (regra 1 da §4.2.1 dispara via `BLOCK_FLOW`)

**Invariante vinculada:** IS-7 (§8.1) garante que `severity = "INFO"` nunca altera `status_arquetipo`.

### §7.2. Severidade `INFO` — nova categoria de blocker

Runner v2 reconhece apenas `HARD_BLOCK` e `BLOCK_FLOW`. Runner v3 adiciona terceira:

```
severity: "HARD_BLOCK" | "BLOCK_FLOW" | "INFO"
```

`INFO` **nunca** contribui para FAIL/BLOCKED. Aparece em `blockers_triggered` com `rule` descritivo. Permite auditoria + comunicação ao usuário (no frontend M1, renderizar como alerta não-bloqueante).

**Consumidores de `severity="INFO"`:**
- `V-05-INFO` (multi-CNPJ info — Q-4 RESOLVIDA)
- **`V-10-FALLBACK`** (NCM/NBS fora do dataset — Ajuste A 2026-04-24; runner continua PASS com objeto genérico e confiança baixa)

**Consumidores de `severity="HARD_BLOCK"`:**
- `DERIVE-001` (AmbiguityError em `deriveOperationType()` — Q-2 / Q-3)
- **`V-10-PENDING`** (entry com `status=pending_validation` no Decision Kernel — Q-D1 v2)
- **`V-10-UNMAPPED-TUPLE`** (tupla `(regime, IS, chapter/divisao)` sem regra na tabela; inclui `regime_especial` NBS e `reducao_60` em setores não-mapeados)
- **`V-LC-NNN`** (31 regras de conflito lógico entre dimensões — Q-C4 RESOLVIDA; ver `LOGICAL-CONFLICTS-v1.0.md` §3 classes C1-C6)

### §7.3. Cobertura na suite — **Opção A aprovada (Q-D6 RESOLVIDA)**

**Decisão:** adicionar cenário **S51** novo → suite v3 tem **51 casos**.

Breakdown canônico pós-Q-4:

| Classificação | Casos | Total |
|---|---|---|
| PASS (includes 1 INFO-PASS) | S01-S26, S28-S50, S51 | **50** |
| BLOCKED (controle negativo DENIED) | S27 | **1** |
| FAIL | — | **0** |
| **Total suite** | | **51** |

**Novo alvo do gate GO (§5.1):** `FAIL == 0` ∧ `BLOCKED == 1` — **inalterado** (independente do total). Q-C3 RESOLVIDA removeu AMBIGUOUS.

**Especificação do cenário S51 (a popular em `M1-arquetipo-50-casos-brasil-v3.json`):**
```jsonc
{
  "id": "S51",
  "macro_setor": "servicos",
  "scenario_name": "Grupo econômico — análise de 1 CNPJ operacional (controle INFO)",
  "seed_data": {
    // dimensões válidas qualquer setor (sugestão: serviços simples)
    "integra_grupo_economico": true,
    "analise_1_cnpj_operacional": true,
    "nivel_analise": "CNPJ operacional único (parte de grupo)",
    "user_confirmed": true
    // demais campos conforme template de PASS
  }
}
```

Expectativa: `status = "PASS"` · `status_arquetipo = "confirmado"` · `blockers_triggered` contém `V-05-INFO`.

### §7.4. Mensagens

```
V-05-DENIED: "empresa integra grupo econômico E análise consolidada solicitada — fora do escopo M1 (1 CNPJ)"
V-05-INFO:   "empresa integra grupo econômico — análise neste projeto é de 1 CNPJ operacional; consolidação requer projetos adicionais"
```

---

## §8. Invariantes e proibições

Derivadas dos ADRs; devem ser testadas explicitamente.

### §8.1. Invariantes (devem valer sempre)

**Gerais do runner:**
- **I-1:** runner produz output byte-idêntico para a mesma seed em execuções sucessivas (determinismo)
- **I-2:** `arquetipo.model_version == "m1-v1.0.0"` para toda saída v3
- **I-3:** `perfil_hash` e `rules_hash` são strings `sha256:[64 hex chars]`
- **I-4:** `data_version` respeita formato ISO-8601 estrito com `Z` final
- **I-5:** Nenhum valor de dimensão fora do enum declarado em §3

**De `status_arquetipo`** (derivadas de §4.7):
- **IS-1:** `status_arquetipo = "bloqueado"` → `motivo_bloqueio ≠ null`
- **IS-2:** `status_arquetipo ≠ "bloqueado"` → `motivo_bloqueio = null`
- **IS-3:** `status_arquetipo = "confirmado"` → `data_version` fixado; snapshot imutável (ADR-0032 §1)
- **IS-4:** nenhuma transição parte de `confirmado` ou `bloqueado` modificando o snapshot original
- **IS-5:** `status_arquetipo = "inconsistente"` → `blockers_triggered` contém pelo menos um blocker com `severity = "HARD_BLOCK"` e `rule` descrevendo a issue
- **IS-6:** `AmbiguityError` em `deriveOperationType()` → `status_arquetipo = "inconsistente"` E `derived_legacy_operation_type = null` E blocker `DERIVE-001` presente
- **IS-7:** Blocker `severity = "INFO"` (ex.: V-05-INFO) **não altera** `status_arquetipo`; apenas aparece em `blockers_triggered`
- **IS-8:** `status_arquetipo = "confirmado"` → `seed.user_confirmed == true` (no runner v3) E **nenhum** blocker com `severity ∈ {"HARD_BLOCK", "BLOCK_FLOW"}` presente E `missing_required_fields = []`
- **IS-9 (reforço Q-6):** `status_arquetipo = "confirmado"` → **NÃO** há ambiguidade, inconsistência, campo faltante ou bloqueio. Confirmed é **mutuamente exclusivo** com qualquer outro estado de issue. Regra 5 da §4.2.1 só dispara após regras 1-4 falharem

**Coexistência legado × M1 (Q-7 RESOLVIDA 2026-04-24):**
- **IV-L1:** `profileVersion` (coluna existente) **nunca** é modificada pelo sistema M1+. Projetos pre-M1 preservam valor original ("1.0")
- **IV-L2:** `archetype_version` (coluna nova) escrita **apenas** em projetos M1+ na primeira confirmação (`status_arquetipo = "confirmado"`)
- **IV-L3:** **Detecção determinística:** `isProjetoM1(p) ≡ p.archetype_version !== null`. Inverso: `isProjetoLegado(p) ≡ p.archetype_version === null`
- **IV-L4:** bump de `archetype_version` (ex.: m1-v1.0.0 → m1-v1.1.0) é aditivo no snapshot **novo**; snapshots anteriores preservam sua versão original (ADR-0032 §4)

### §8.2. Proibições absolutas

- **P-1:** uso de `contains()` / `.toLowerCase().includes()` / regex em comparação de enum
- **P-2:** chamada de LLM, rede, banco de dados, filesystem fora do suite JSON de entrada
- **P-3:** uso de `Math.random` ou qualquer não-determinismo
- **P-4:** dependência de hora do sistema para lógica (apenas para escrita de `data_version`/`executed_at`)
- **P-5:** side effects fora de `process.stdout.write`
- **P-6:** migração automática de snapshots v2 → v3 (ADR-0032 §4)
- **P-7 (Q-7):** alterar `profileVersion` de projetos legados (não-M1) — preservação imutável por política de não-migração (ADR-0032 §4 + IV-L1)

---

## §9. Plano de aceite

Após implementação, o runner v3 é aceito quando **todos** os critérios abaixo valem:

### §9.1. Testes determinísticos

- **T-1:** executar runner 2× com mesma seed → `diff` zero (I-1)
- **T-2:** todos os `perfil_hash` são hex válidos de 64 caracteres (I-3)
- **T-3:** `rules_hash` é constante em uma mesma execução (mesmo manifesto)
- **T-4:** nenhum valor fora do enum declarado (I-5) — check `grep` sobre output
- **T-5:** S27 produz `status_arquetipo == "bloqueado"` com `motivo_bloqueio` contendo "V-05-DENIED"

### §9.2. Gate GO/NO-GO

- **T-6:** sobre a suite v3 (51 cases — Q-D6 RESOLVIDA), `summary.by_status.FAIL == 0` E `BLOCKED == 1` (Q-C3 RESOLVIDA — AMBIGUOUS removido)
- **T-7:** `verdict.decision == "GO"`

### §9.3. Zero regressão semântica vs v2

- **T-8:** sobre as mesmas 49 cases que PASS em v2, v3 também produz PASS (ajustados pela nova derivação) ou identifica gap específico (não silencioso)
- **T-9:** S27 continua sendo o único BLOCKED

### §9.4. Cobertura de invariantes

- **T-10 a T-17:** cada invariante §8.1 tem teste unitário correspondente

---

## §10. Dependências e bloqueadores

Esta SPEC não fecha sozinha. 8 decisões do P.O. são pré-requisitos.

### §10.1. Do DE/PARA (já abertas)

- **Q-1** (DE/PARA §11) — `clientType` descartado ou contextual? — **RESOLVIDA 2026-04-24 · contextual fora do arquétipo.** Não entra em `perfil_hash` nem em `rules_hash`; não afeta `status_arquetipo`; não bloqueia gate E2E. Preservado em `operationProfile.clientType[]` para consumo por briefing/UX. Ver DE-PARA §11 Q-1 + DATA_DICTIONARY
- **Q-2** — `operationType` derivado vs entrada direta? — **RESOLVIDA 2026-04-24 · Opção A (derivado).** Ver §2.0, §2.8
- **Q-3** — `marketplace` é papel ou relação? — **RESOLVIDA 2026-04-24 · nem papel, nem relação — composição.** `papel = intermediador` + `tipo_de_relacao = ["intermediação"]`. Coexistência com `venda` em `tipo_de_relacao` → AmbiguityError. Ver §2.2.2 + §3.3 + DERIVATION §3.2 R-21
- **Q-4** — aprovar estado `info` multi-CNPJ? — **RESOLVIDA 2026-04-24 · 3 estados NONE/INFO/DENIED.** INFO não altera `status_arquetipo`; DENIED → bloqueado. Ver §7
- **Q-5** — composição de `rules_hash`? — **RESOLVIDA 2026-04-24 · Opção C (manifesto declarativo).** Ver §6.3 + `CANONICAL-RULES-MANIFEST.md`
- **Q-6** — máquina de estado `status_arquetipo`? — **RESOLVIDA 2026-04-24 · 4 estados, Interpretação C, AmbiguityError→FAIL não estado.** Ver §4.2, §4.3, §4.6, §4.7
- **Q-7** — `profileVersion` legado vs `archetype_version` novo? — **RESOLVIDA 2026-04-24 · coexistência dual com `archetype_version` como fonte de verdade M1+.** `profileVersion` (coluna existente) permanece imutável para projetos legados. `archetype_version` (coluna nova) é escrita apenas em projetos M1+ no momento da primeira confirmação. Detecção: `isProjetoM1(p) = p.archetype_version !== null`. Zero migração (ADR-0032 §4). Ver nova §10.5 + DATA_DICTIONARY
- **Q-8** — nova posição no enum `projects.status`? — **RESOLVIDA 2026-04-24 · 4 valores novos (`perfil_pendente`, `perfil_inconsistente`, `perfil_bloqueado`, `perfil_confirmado`) inseridos entre `cnaes_confirmados` e `assessment_fase1`.** Mapping 1-para-1 com `status_arquetipo`. Migration ALTER TABLE em M1-F2. Ver §4.7.1

### §10.2. Abertas específicas desta SPEC

- **Q-C1** — seed v3 precisa de flag `user_confirmed`? — **RESOLVIDA 2026-04-24 (Bloco 3 / Q-6):** sim, `user_confirmed: boolean` obrigatório na seed v3 para permitir cobertura do estado `confirmado` em testes determinísticos
- **Q-C2** — lista canônica de campos obrigatórios para `confirmado`? — **RESOLVIDA 2026-04-24 (Bloco 3 / Q-6):** `missing_required_fields != empty` → `inconsistente`. A lista canônica de campos obrigatórios por dimensão será formalizada em conjunto com Q-C4 no artefato-filho `LOGICAL-CONFLICTS-v1.0.md`. Obrigatoriedade base: todas as 5 dimensões + campos contextuais quando aplicáveis (`orgao_regulador` se `papel_na_cadeia == "operadora_regulada"`)
- **Q-C3** — AMBIGUOUS é removido (proposta A) ou mantido (proposta B)? — **RESOLVIDA 2026-04-24 · Proposta A aprovada.** AMBIGUOUS removido; ambiguidade vira `FAIL` (test) + `inconsistente` (snapshot). Gate GO simplificado de 3 para 2 condições. Ver §5.4 + §1.3 + §5.1
- **Q-C4** — artefato-filho `LOGICAL-CONFLICTS-v1.0.md` — **RESOLVIDA 2026-04-24.** Artefato criado com 31 regras distribuídas em 6 classes (C1 papel×relação, C2 papel×objeto, C3 papel×território, C4 papel×regime, C5 relação×objeto, C6 contextuais). Cada regra emite blocker `V-LC-NNN` severity HARD_BLOCK → `status_arquetipo=inconsistente`

### §10.3. Decisões determinísticas (enum/lookup)

Artefatos-filhos **a criar** antes da implementação:

- **Q-D1** — camada de tradução regime → `objeto`? — **RESOLVIDA 2026-04-24 · Opção B (translation layer).** Artefatos `NCM-OBJETO-LOOKUP.md` e `NBS-OBJETO-LOOKUP.md` **não** criam novos lookups — reusam `lookupNcm()`/`lookupNbs()` existentes + tabela determinística `regime → objeto`. Fallback `regime_geral` proibido → `AmbiguityError`. Enum `objeto[]` com 14 valores. Ver artefatos. **D-N6/D-B6 abertas** — disambiguação de regimes 1-para-muitos é bloqueador de runner v3
- **Q-D2** — comportamento escalar para import+export simultâneos? — **RESOLVIDA 2026-04-24.** Algoritmo em 3 passos formalizado em §2.2.1: união determinística de sinais (`papel_comercio_exterior[]` + flags promovidos) → tabela de decisão escalar → acrescenta `internacional` ao `territorio[]`. `comercio_exterior_misto` usado para `{Importador, Exportador}` simultâneos. Nunca há contradição porque união toma o supremo. C3-01/02/03 de LOGICAL-CONFLICTS viram guardrails defensivos
- **Q-D3** — `regime_especifico_setorial` é valor de `regime` ou dimensão separada? — **RESOLVIDA 2026-04-24 · campo contextual ortogonal.** `regime_especifico_setorial` REMOVIDO do enum `regime` (6→5 valores). Novo campo `regime_especifico: string[]` em §2.6 atua como modificador aditivo — regime principal + regime específico coexistem. LOGICAL-CONFLICTS D-LC-4 pode usar como override de C4-01 (operadora + Simples)
- **Q-D4** — `subnatureza_setorial` é string ou array? — **RESOLVIDA 2026-04-24 · array sempre.** `string[]` com enum v1 de 7 valores. Array vazio = não-regulado; obrigatório ter >=1 valor quando `papel=operadora_regulada`. Ver §2.6 + LOGICAL-CONFLICTS §9 (C6)
- **Q-D5** — `CANONICAL-JSON-SPEC.md` — regras exatas de serialização para hash — **RESOLVIDA 2026-04-24.** 6 regras canônicas C-1 a C-6 (ordem lexicográfica de chaves, arrays preservam ordem, sem whitespace, tipos fixos JSON, null explícito, ISO-8601 UTC). Artefato criado. Ver §6.2, §6.3 + `CANONICAL-JSON-SPEC.md`
- **Q-D6** — suite vira 51 cases (opção A) ou re-seeds um dos 49 PASS (opção B)? — **RESOLVIDA 2026-04-24 (junto com Q-4) · Opção A.** Suite v3 = 51 cenários, incluindo novo S51 para cobrir V-05-INFO. Ver §7.3
- **Q-D7** — `DERIVATION-OPERATIONTYPE.md` — tabela determinística `(papel_na_cadeia, tipo_de_relacao, objeto) → OperationType` + testes unitários + tie-breakers (criada por Bloco 1 / Q-2 Opção A)

### §10.4. Bloqueadores para implementação

Implementação começa **apenas** após:

1. Esta SPEC aprovada pelo P.O.
2. Q-1 a Q-8, Q-C1 a Q-C3, Q-D1 a Q-D6 decididos e registrados
3. Artefatos-filhos (Q-D1, Q-D5) criados como docs separados

---

## §11. Não-escopo

- Implementação do runner v3 (só spec)
- UI de confirmação do arquétipo (trata-se de M1 pós-GO)
- Persistência do snapshot em `projects.archetype` (trata-se de migration em M2+)
- Consumo do snapshot por M2 (contrato documentado em `CONTRATOS-ENTRE-MILESTONES.md`)
- Remoção de `run-50-v2.mjs` (permanece como artefato histórico imutável — ADR-0032 §4)
- Recalcular resultados antigos (proibido — ADR-0032 §4)

---

## §12. Convivência v2 ↔ v3

v2 continua existindo:
- Arquivo `tests/archetype-validation/run-50-v2.mjs` — **não tocar**
- Suite `M1-arquetipo-50-casos-brasil-v2.json` — **não tocar**
- Último `RESULT-50-casos-brasil-v2.json` — **não tocar** (trava histórica do "49/1/0" alcançado com modelo flat)

v3 é **novo** e independente:
- `tests/archetype-validation/run-50-v3.mjs`
- `tests/archetype-validation/M1-arquetipo-50-casos-brasil-v3.json`
- `tests/archetype-validation/RESULT-50-casos-brasil-v3.json`

Sem compartilhamento de código. Runner v3 pode importar tipos de `adr/` ou `specs/` (documentação), não de `run-50-v2.mjs`.

---

## §13. Referências

- `docs/epic-830-rag-arquetipo/adr/ADR-0031-modelo-dimensional.md`
- `docs/epic-830-rag-arquetipo/adr/ADR-0032-imutabilidade-versionamento.md`
- `docs/epic-830-rag-arquetipo/specs/DE-PARA-CAMPOS-PERFIL-ENTIDADE.md` (§2.5, §2.6, §8)
- `docs/epic-830-rag-arquetipo/specs/CONTRATOS-ENTRE-MILESTONES.md`
- `tests/archetype-validation/run-50-v2.mjs` (artefato histórico)
- `tests/archetype-validation/M1-arquetipo-50-casos-brasil-v2.json` (artefato histórico)

## §14. Status

DRAFT — aguardando:
1. Aprovação desta SPEC pelo P.O.
2. Decisões Q-1 a Q-8 (DE/PARA), Q-C1 a Q-C3, Q-D1 a Q-D6 (desta SPEC)
3. Criação dos artefatos-filhos: `NCM-OBJETO-LOOKUP.md`, `NBS-OBJETO-LOOKUP.md`, `CANONICAL-JSON-SPEC.md`

Após isso: runner v3 implementado, Rodada D executada, veredito formal registrado em novo audit report.

Nenhum código escrito. Nenhum commit realizado neste ciclo de SPEC.
