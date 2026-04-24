# DERIVATION-OPERATIONTYPE — tabela de decisão determinística

**Status:** DRAFT — aguardando aprovação do P.O. (primeira versão pós-Q-2)
**Data:** 2026-04-24
**Versão:** `derivation-v1.0.0` (entra em `rules_hash` de `m1-v1.0.0`)
**Contexto:** Epic #830 — RAG com Arquétipo (M1) — artefato-filho de SPEC-RUNNER-RODADA-D §2.8
**Motivação:** Q-2 Opção A aprovada — `operationType` é campo derivado, não mais input
**Consumidor primário:** `server/lib/risk-eligibility.ts` (gate Hotfix IS v1.2/v2/v2.1 — **intocado**)

## §1. Contrato da função

```ts
function deriveOperationType(perfil: PerfilDimensional): OperationType;

type OperationType =
  | "industria"
  | "comercio"
  | "servicos"
  | "misto"
  | "agronegocio"
  | "financeiro";
```

**Inputs usados (subset do `PerfilDimensional`):**
- `papel_na_cadeia` (enum escalar — SPEC §3.3)
- `tipo_de_relacao[]` (enum multi — SPEC §3.4)
- `objeto[]` (enum multi — SPEC §3.2 + NCM-OBJETO-LOOKUP / NBS-OBJETO-LOOKUP)

**Inputs NÃO usados:**
- `territorio` (dimensão territorial é ortogonal ao tipo de operação)
- `regime` (regime tributário não classifica o tipo)
- `subnatureza_setorial`, `orgao_regulador` (contextuais)

**Output:** exatamente um valor do enum `OperationType`.

## §2. Princípios vinculantes (P.O. 2026-04-24)

1. **Determinística** — sem LLM, sem `contains()`/substring, sem fallback silencioso
2. **Ambiguidade lança erro** (`throw new Error(...)` ou equivalente) — não degrada para `misto` por default
3. **Ordem das regras importa** — avaliadas top-down, primeira que bate vence
4. **Igualdade em enum** — todas as comparações são `===` ou `.includes(value)` sobre enum fechado
5. **Fechamento total** — toda combinação (`papel`, `relação`, `objeto`) deve OU produzir um `OperationType` válido OU lançar erro explícito

## §3. Tabela de decisão (v1.0.0)

Regras numeradas em ordem de avaliação. Primeira que bate vence.

### §3.1. Regras de precedência alta (específicas)

| # | Condição | `OperationType` | Justificativa |
|---|---|---|---|
| R-01 | `objeto.some(o => AGRO_OBJECTS.includes(o))` | `agronegocio` | ADR-0030 v1.1 D-6 — agronegócio tem tratamento específico (BLOCKED no gate IS) |
| R-02 | `objeto.includes("servico_financeiro")` | `financeiro` | Serviço financeiro é categoria tributária distinta |

### §3.2. Regras por `papel_na_cadeia` (papel determina eixo primário)

| # | Condição | `OperationType` |
|---|---|---|
| R-10 | `papel_na_cadeia === "fabricante"` | `industria` |
| R-11 | `papel_na_cadeia === "produtor"` | `industria` |
| R-12 | `papel_na_cadeia === "distribuidor"` | `comercio` |
| R-13 | `papel_na_cadeia === "varejista"` | `comercio` |
| R-14 | `papel_na_cadeia === "prestador"` | `servicos` |
| R-15 | `papel_na_cadeia === "operadora_regulada"` | `servicos` |
| R-16 | `papel_na_cadeia === "transportador"` | `servicos` |
| R-17 | `papel_na_cadeia === "importador"` | `comercio` |
| R-18 | `papel_na_cadeia === "exportador"` | `comercio` |
| R-19 | `papel_na_cadeia === "comercio_exterior_misto"` | `comercio` |
| R-20 | ~~marketplace~~ — **REMOVIDA 2026-04-24** (Q-3 RESOLVIDA: `marketplace` saiu do enum `papel_na_cadeia`; é composição) | — |
| R-21 | `papel_na_cadeia === "intermediador"` E `tipo_de_relacao == ["intermediação"]` (exclusivamente) | `servicos` |
| R-21-AMB | `papel_na_cadeia === "intermediador"` E `tipo_de_relacao` contém qualquer valor além de `"intermediação"` (ex.: `"venda"`) | **`AmbiguityError`** — marketplace-com-estoque não resolve para OperationType único |

### §3.3. Regras de composição (papel indefinido ou relação mista)

| # | Condição | `OperationType` |
|---|---|---|
| R-30 | `tipo_de_relacao.includes("venda")` E `tipo_de_relacao.includes("servico")` E papel não resolveu acima | `misto` |
| R-31 | `papel_na_cadeia === "indefinido"` (qualquer outro caso) | **ERRO** — lança `AmbiguityError` |

### §3.4. Catálogos de referência

**`AGRO_OBJECTS`** (usado em R-01):

```ts
const AGRO_OBJECTS = ["agricola", "pecuario"] as const;
```

Se catálogo NCM-OBJETO-LOOKUP (Q-D1) adicionar categorias agrícolas derivadas de NCM, atualizar `AGRO_OBJECTS` com bump `derivation-v1.1.0` e atualização em `rules_hash`.

## §4. Comportamento em ambiguidade

### §4.1. Classes de erro

```ts
class AmbiguityError extends Error {
  constructor(
    public readonly perfil: PerfilDimensional,
    public readonly reason: string,
    public readonly matched_rules: string[]
  ) {
    super(`deriveOperationType: ambiguity — ${reason}`);
  }
}
```

### §4.2. Condições que disparam erro

- **E-1:** Nenhuma regra bateu (não coberto por R-01 a R-31)
- **E-2:** `papel_na_cadeia === "intermediador"` E `tipo_de_relacao` contém valor além de `"intermediação"` (R-21-AMB) — marketplace-com-estoque
- **E-3:** Múltiplas regras não-exclusivas bateram (não deveria ocorrer com ordem determinística, mas guardrail explícito)

### §4.3. Tratamento no runner v3

**Decisão Q-6 ajustada (aprovação final 2026-04-24): AmbiguityError → `status_arquetipo = "inconsistente"` (IS estado).**

AmbiguityError é uma das 3 classes de inconsistência cobertas por SPEC-RUNNER §4.2.2 (classe 3 — derivação legada). Efeito durante execução da suite 50 casos:

- **`status_arquetipo`:** `"inconsistente"` — AmbiguityError é tratada como issue qualitativa da derivação legada (regra 2 da §4.2.1)
- **`derived_legacy_operation_type`:** `null` (derivação falhou)
- **`blockers_triggered`:** inclui `{ id: "DERIVE-001", severity: "HARD_BLOCK", rule: <reason descritivo> }`
- **Snapshot:** emitido com as 5 dimensões + contextuais; `status_arquetipo = "inconsistente"`; `derived_legacy_operation_type = null`
- **Test result:** `status = "FAIL"` (HARD_BLOCK em `blockers_triggered`)

**Invariantes ativas** (ver SPEC-RUNNER §8.1): IS-5 (inconsistente com HARD_BLOCK) e IS-6 (AmbiguityError específico) são ambas satisfeitas simultaneamente.

**Exemplo concreto:**

Seed com `papel_na_cadeia = "marketplace"` (Q-3 pendente) + `user_confirmed = true`:
- `deriveOperationType()` lança AmbiguityError (R-20 bloqueada até Q-3 resolver)
- Regra 2 da SPEC-RUNNER §4.2.1 dispara — `status_arquetipo = "inconsistente"`
- `user_confirmed = true` **não** vence — regras 1-4 têm precedência sobre regra 5
- `derived_legacy_operation_type = null`
- `blockers_triggered = [{id:"DERIVE-001", severity:"HARD_BLOCK", rule:"R-20 bloqueada por Q-3 pendente"}]`
- Test result = `FAIL`
- Gate E2E: não avança (status_arquetipo ≠ confirmado bloqueia avanço)

## §5. Dúvidas vinculadas

- **Q-3 (marketplace vs intermediador)** — **RESOLVIDA 2026-04-24.** `marketplace` não é enum próprio; é composição `intermediador` + `tipo_de_relacao=["intermediação"]`. R-20 removida. R-21 desbloqueada com constraint (R-21-AMB para marketplace-com-estoque). Ver §3.2 atualizado
- **Q-D1 (NCM-OBJETO-LOOKUP)** — SPEC §10.3: define o conjunto final de valores de `objeto[]` e portanto `AGRO_OBJECTS` (§3.4)
- **Q-D2 (import+export simultâneo)** — resolvido provisoriamente aqui via R-19 apontando para `comercio`; confirmar se `comercio_exterior_misto` é aceito

## §6. Testes unitários obrigatórios

Implementação de `deriveOperationType()` deve incluir os seguintes testes (ordem importa):

### §6.1. Casos canônicos (1 por regra R-01 a R-31)

| ID | Input → Output esperado |
|---|---|
| T-01 | agricultor de soja → `agronegocio` |
| T-02 | prestador de serviço médico → `servicos` |
| T-10 | indústria siderúrgica → `industria` |
| T-12 | atacadista de alimentos → `comercio` |
| T-13 | varejista → `comercio` |
| T-14 | escritório de advocacia → `servicos` |
| T-15 | concessionária de energia → `servicos` |
| T-16 | transportadora de combustível → `servicos` (dispara Hotfix IS — BLOCKED no gate, mas derivação retorna `servicos`) |
| T-17 | importador de bens → `comercio` |
| T-30 | empresa que vende bens **e** presta serviços simultaneamente → `misto` |

### §6.2. Casos de erro (ambiguidade)

| ID | Input → Esperado |
|---|---|
| T-E1 | `papel_na_cadeia = "indefinido"` → lança `AmbiguityError` com `reason` descritivo |
| T-E2 | `papel_na_cadeia = "intermediador"` + `tipo_de_relacao = ["intermediação", "venda"]` → lança `AmbiguityError` (marketplace-com-estoque) |
| T-E3 | Perfil com dimensões vazias (`papel=indefinido`, `tipo_de_relacao=[]`, `objeto=[]`) → lança `AmbiguityError` |

### §6.3. Determinismo

- **T-D1:** executar `deriveOperationType(perfil)` 100× com mesmo input → mesmo output (sem não-determinismo)
- **T-D2:** executar sobre os 50 cenários da suite Rodada D (`M1-arquetipo-50-casos-brasil-v3.json`) → output estável entre execuções

### §6.4. Cobertura sobre suite da Rodada D

- **T-C1:** 49 dos 50 cenários resultam em `OperationType ∈ enum` (S27 é BLOCKED antes de chegar a derivação)
- **T-C2:** Zero cenário produz `null` ou `undefined`

## §7. Ciclo de vida e versionamento

### §7.1. Identificador canônico

- **Versão atual:** `derivation-v1.0.0`
- **Chave no manifesto `rules_hash`:** `derivation_rules.operation_type_legacy = "derivation-v1.0.0"`
- **Manifesto entra em `rules_hash`** calculado em SPEC-RUNNER §6.3

### §7.2. Regras de versionamento

- **Patch (v1.0.1)** — fix de bug que não altera output para nenhum caso válido (ex.: melhor mensagem de erro)
- **Minor (v1.1.0)** — adição de regra nova que cobre caso antes ambíguo, sem alterar nenhum output existente
- **Major (v2.0.0)** — alteração que muda output para algum caso existente (quebra compatibilidade com snapshots antigos)

### §7.3. Política de não-migração

ADR-0032 §4: ao subir `derivation-v1.1.0`, projetos `m1-v1.0.0` **não são recalculados**. Mantêm `derived_legacy_operation_type` computado com ruleset antigo.

## §8. Não-escopo

- Alterações em `server/lib/risk-eligibility.ts` (contrato preservado)
- Integração com RAG (M2+)
- UI de exibição de `operationType` (M1 pós-GO)
- Derivação inversa (`operationType` → dimensões) — proibida por Q-2 Opção A
- Migração de projetos `profileVersion='1.0'` (proibida por ADR-0032 §4)

## §9. Referências

- `docs/epic-830-rag-arquetipo/adr/ADR-0031-modelo-dimensional.md`
- `docs/epic-830-rag-arquetipo/adr/ADR-0032-imutabilidade-versionamento.md`
- `docs/epic-830-rag-arquetipo/specs/SPEC-RUNNER-RODADA-D.md` §2.8 · §6
- `docs/epic-830-rag-arquetipo/specs/DE-PARA-CAMPOS-PERFIL-ENTIDADE.md` §11 Q-2
- `server/lib/risk-eligibility.ts` (gate consumidor — **não tocar**)
- `docs/adr/ADR-0030-hotfix-is-elegibilidade-por-operationtype-v1.1.md` (eligibility rules, agronegócio BLOCKED)

## §10. Status

DRAFT — aguardando:
1. Aprovação deste artefato pelo P.O.
2. Resolução de Q-3 (desbloqueia R-20 e R-21)
3. Resolução de Q-D1 (fecha `AGRO_OBJECTS` final)

Nenhuma implementação antes dos 3 itens acima.
