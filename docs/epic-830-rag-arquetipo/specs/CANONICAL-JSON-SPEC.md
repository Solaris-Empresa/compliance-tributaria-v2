# CANONICAL-JSON-SPEC — serialização determinística para hash

**Status:** DRAFT — aguardando ratificação do P.O.
**Data:** 2026-04-24
**Versão:** `canonical-json-v1.0.0` (consumida por SPEC-RUNNER §6.2 e §6.3)
**Contexto:** Epic #830 — RAG com Arquétipo (M1) — artefato-filho de SPEC-RUNNER-RODADA-D §6
**Motivação:** Q-D5 — `perfil_hash` e `rules_hash` (ADR-0032 §2) exigem serialização determinística para que hash seja reproduzível byte-a-byte em qualquer ambiente (Node, Deno, navegador, CI runners)

## §1. Propósito

Definir regras **inequívocas** de serialização de objetos JavaScript/JSON em representação textual canônica, de modo que:

1. Mesmo objeto lógico → mesma string serializada → mesmo hash SHA-256
2. Independente de plataforma, linguagem, versão de parser
3. Independente de whitespace original ou ordem de campos na fonte
4. Auditável por humano — pode-se reconstruir o hash manualmente

## §2. Regras canônicas vinculantes (P.O. 2026-04-24)

| # | Regra | Descrição |
|---|---|---|
| **C-1** | **Chaves ordenadas recursivamente** | Chaves de objetos ordenadas em lexicographic ordering (codepoint Unicode) em todos os níveis aninhados |
| **C-2** | **Arrays preservam ordem de definição** | Arrays **NÃO** são reordenados; a ordem em que foram escritos na fonte é preservada no output |
| **C-3** | **Sem whitespace variável** | Nenhum espaço, tabulação, ou quebra de linha entre elementos. Saída é uma única string compacta |
| **C-4** | **Tipos fixos** | Apenas os 6 tipos JSON canônicos: string, number, boolean, null, array, object. Date, Map, Set, undefined são **proibidos** no input (devem ser convertidos antes) |
| **C-5** | **`null` explícito** | Valores `null` são serializados como `null`, nunca omitidos. Chaves com valor `undefined` **não** aparecem (são proibidas por C-4) |
| **C-6** | **Datas em ISO-8601 UTC** | Se datas aparecem, devem ser strings em formato `YYYY-MM-DDTHH:mm:ss.sssZ` (ex.: `"2026-04-24T12:00:00.000Z"`). Sem fusos diferentes de UTC |

## §3. Pseudo-algoritmo

```
function canonicalJSON(value):
  if value is null:
    return "null"
  if value is boolean:
    return value ? "true" : "false"
  if value is number:
    return formatNumber(value)         // ver §4
  if value is string:
    return escapeString(value)          // ver §5
  if value is array:
    parts = map(value, canonicalJSON)
    return "[" + join(parts, ",") + "]"
  if value is object:
    keys = sort(Object.keys(value))     // lexicographic
    parts = []
    for key in keys:
      v = value[key]
      if v === undefined: throw Error("undefined proibido — C-4")
      parts.push(escapeString(key) + ":" + canonicalJSON(v))
    return "{" + join(parts, ",") + "}"
  if value is Date: throw Error("Date proibido; converter para ISO-8601 string — C-6")
  if value is Map|Set: throw Error("tipo proibido — C-4")
  if value is undefined: throw Error("undefined proibido — C-4")
```

## §4. Serialização de números

Regras para `formatNumber(n)`:

- **Integers** (não fracionários, em range Number.safe): formato `"123"`, sem zero à esquerda, sem sinal positivo (ex.: `42` → `"42"`; `-7` → `"-7"`)
- **Fracionais**: formato decimal com mínimo de casas necessárias (ex.: `3.14` → `"3.14"`; `0.5` → `"0.5"`, nunca `.5`)
- **Especiais proibidos**: `NaN`, `Infinity`, `-Infinity` → lançar erro (não são JSON válido)
- **Notação exponencial**: permitida se natural para o valor (ex.: `1e21` → `"1e21"`), mas padrão é decimal para valores em range normal
- **Zero negativo**: `-0` → `"0"` (normalizar)

## §5. Escape de strings

Regras para `escapeString(s)`:

- Aspas duplas em volta: `"..."`
- Caracteres que devem ser escapados:
  - `"` → `\"`
  - `\` → `\\`
  - Quebra de linha (U+000A) → `\n`
  - Tab (U+0009) → `\t`
  - Carriage return (U+000D) → `\r`
  - Backspace (U+0008) → `\b`
  - Form feed (U+000C) → `\f`
  - Controle < 0x20 → `\u00XX` (4 hex dígitos lowercase)
- **UTF-8 literal** para caracteres acima de U+001F e não-escapáveis (incluindo acentos, emojis, caracteres não-ASCII) — **não** escapar via `\uXXXX`

## §6. Ordenação de chaves (C-1)

Lexicographic por codepoint Unicode, case-sensitive:
- `"A" < "B" < "Z" < "a" < "z"` (uppercase antes de lowercase)
- Acentos seguem seu codepoint (ex.: `"a" < "á"` porque U+0061 < U+00E1)
- Aplicado recursivamente em objetos aninhados

Exemplo:
```json
Input:  { "zeta": 1, "alpha": 2, "Beta": 3 }
Output: {"Beta":3,"alpha":2,"zeta":1}
```

## §7. Preservação de ordem em arrays (C-2) — Q-D5 RESOLVIDA 2026-04-24

**Decisão P.O. 2026-04-24:** `canonicalJSON()` **NUNCA** re-ordena arrays. Ordenação semântica é responsabilidade do **wrapper** `canonicalizeForHash()`, não da função de serialização.

### §7.1. `canonicalJSON()` é array-agnóstica

`canonicalJSON(arr)` preserva byte-a-byte a ordem do input:

```json
Input a: [3, 1, 2]  → Output: "[3,1,2]"
Input b: [1, 2, 3]  → Output: "[1,2,3]"
canonicalJSON(a) !== canonicalJSON(b)  // ordens diferentes = hashes diferentes
```

**Motivo:** em muitos casos ordem **É** semântica (precedência, ranking, hierarquia). Serialização genérica não pode presumir o oposto.

### §7.2. `canonicalizeForHash()` — wrapper dedicado

Para cálculo de `perfil_hash` e `rules_hash`, usar wrapper que **classifica arrays e aplica política por classe**:

```ts
function canonicalizeForHash(obj: unknown): unknown {
  // Aplica ordenação lexicográfica APENAS aos arrays neutros
  // (lista de arrays neutros e semânticos em §7.3)
}

perfil_hash = sha256(canonicalJSON(canonicalizeForHash(archetype)))
rules_hash  = sha256(canonicalJSON(manifesto))  // SEM wrapper — manifesto é todo semântico
```

### §7.3. Classificação obrigatória de arrays

**Arrays NEUTROS** (conjunto sem ordem — wrapper ORDENA lexicograficamente antes do hash):

| Array | Onde aparece | Motivo de ser neutro |
|---|---|---|
| `objeto[]` | arquétipo | conjunto de categorias tributárias; ordem irrelevante |
| `territorio[]` | arquétipo | conjunto de escopos territoriais; ordem irrelevante |
| `tipo_de_relacao[]` | arquétipo | conjunto de relações; ordem irrelevante |
| `orgao_regulador[]` | arquétipo | conjunto de agências; ordem irrelevante |
| `subnatureza_setorial[]` | arquétipo | **Q-D4 RESOLVIDA 2026-04-24** — conjunto de setores regulados; ordem irrelevante |
| `regime_especifico[]` | arquétipo | **Q-D3 RESOLVIDA 2026-04-24** — conjunto de regimes específicos setoriais; modificador aditivo; ordem irrelevante |

**Arrays SEMÂNTICOS** (ordem é informação — wrapper PRESERVA):

| Array | Onde aparece | Motivo de ser semântico |
|---|---|---|
| `rules[]` | manifesto | ordem define precedência top-down de regras |
| `enums.*[]` | manifesto | ordem define ranking canônico + política aditiva (novos valores sempre ao final) |
| `dimensions[]` | manifesto | ordem declarativa canônica (ADR-0031) |
| `ncms_principais[]` | seed input | ordem representa importância/percentual de faturamento |
| `nbss_principais[]` | seed input | idem |
| `natureza_operacao_principal[]` | seed input | hierarquia de naturezas (primária, secundária) |
| `operacoes_secundarias[]` | seed input | ordem por relevância |
| `blockers_triggered[]` | test result | ordem cronológica de emissão |

### §7.4. Invariantes

- **I-C5:** `canonicalJSON(arr)` nunca re-ordena; implementação que o faz é defeito
- **I-C6:** `canonicalizeForHash(obj)` aplica ordenação apenas em arrays listados §7.3 como neutros — nunca em outros
- **I-C7:** Adicionar array novo ao snapshot requer decisão explícita: neutro (registrar §7.3 coluna 1) ou semântico (registrar §7.3 coluna 2). Default **não existe** — omissão é erro.

### §7.5. Exemplo concreto

Archetype com arrays mistos:
```js
const archetype = {
  objeto: ["combustivel", "bebida"],         // NEUTRO
  territorio: ["nacional", "interestadual"], // NEUTRO
  tipo_de_relacao: ["venda", "servico"],     // NEUTRO
  orgao_regulador: ["ANATEL"],               // NEUTRO
  // ... demais campos escalares
};

canonicalizeForHash(archetype) // retorna:
{
  objeto: ["bebida", "combustivel"],         // ORDENADO
  territorio: ["interestadual", "nacional"], // ORDENADO
  tipo_de_relacao: ["servico", "venda"],     // ORDENADO
  orgao_regulador: ["ANATEL"],               // (1 elemento, ordenação trivial)
  // ... demais campos escalares inalterados
}
```

`canonicalJSON()` então serializa esse output sem re-ordenar arrays.

## §8. Exemplo canônico completo

Input (objeto JavaScript equivalente):
```js
{
  territorio: ["nacional", "interestadual", "ZFM"],
  objeto: ["combustivel"],
  papel_na_cadeia: "fabricante",
  regime: "lucro_real",
  tipo_de_relacao: ["producao"],
  subnatureza_setorial: null,
  orgao_regulador: [],
  derived_legacy_operation_type: "industria",
  status_arquetipo: "confirmado",
  motivo_bloqueio: null,
  model_version: "m1-v1.0.0",
  data_version: "2026-04-24T12:00:00.000Z",
  perfil_hash: null,  // preenchido depois
  rules_hash: "sha256:abc...",
  imutavel: true
}
```

Após `canonicalizeForHash` (ordena arrays semanticamente neutros):
```js
{
  ...
  territorio: ["interestadual", "nacional", "ZFM"],  // ordenado
  objeto: ["combustivel"],                            // já ordenado
  tipo_de_relacao: ["producao"],                      // já ordenado
  orgao_regulador: [],
  ...
}
```

Output canônico (single-line, keys sorted):
```
{"data_version":"2026-04-24T12:00:00.000Z","derived_legacy_operation_type":"industria","imutavel":true,"model_version":"m1-v1.0.0","motivo_bloqueio":null,"objeto":["combustivel"],"orgao_regulador":[],"papel_na_cadeia":"fabricante","perfil_hash":null,"regime":"lucro_real","rules_hash":"sha256:abc...","status_arquetipo":"confirmado","subnatureza_setorial":null,"territorio":["interestadual","nacional","ZFM"],"tipo_de_relacao":["producao"]}
```

## §9. Invariantes

- **I-C1:** `canonicalJSON(x) === canonicalJSON(x)` — idempotência byte-a-byte
- **I-C2:** `canonicalJSON(x)` é string UTF-8 single-line sem whitespace externo
- **I-C3:** `sha256(canonicalJSON(x))` é estável entre Node, Deno, navegadores modernos — verificável em testes
- **I-C4:** `canonicalJSON(x) !== canonicalJSON(y)` sempre que `x`/`y` diferem em qualquer key, valor, ou ordem de array

## §10. Testes obrigatórios

### §10.1. Idempotência

- **T-CJ-1:** rodar `canonicalJSON(x)` 100× → mesmo output byte-a-byte

### §10.2. Ordenação de chaves

- **T-CJ-2:** `canonicalJSON({b:1,a:2}) === canonicalJSON({a:2,b:1})` — reordenação deterministic
- **T-CJ-3:** `canonicalJSON({Z:1,a:2}) === '{"Z":1,"a":2}'` (uppercase antes de lowercase)

### §10.3. Preservação de arrays

- **T-CJ-4:** `canonicalJSON([3,1,2]) === '[3,1,2]'` (não reordenada)
- **T-CJ-5:** `canonicalJSON([3,1,2]) !== canonicalJSON([1,2,3])`

### §10.4. Tipos proibidos

- **T-CJ-6:** `canonicalJSON(new Date())` → lança erro (C-4)
- **T-CJ-7:** `canonicalJSON({x: undefined})` → lança erro (C-4/C-5)
- **T-CJ-8:** `canonicalJSON(NaN)` → lança erro (§4)

### §10.5. Cross-runtime

- **T-CJ-9:** rodar `canonicalJSON` do mesmo input em Node 20, Node 22, Bun — mesmo output
- **T-CJ-10:** hash `sha256(canonicalJSON(x))` bate em pelo menos 2 runtimes

### §10.6. Fixtures conhecidas (fixar após implementação)

- **T-CJ-F1:** input mínimo `{}` → `"{}"` → hash fixo TBD
- **T-CJ-F2:** input `{"a":1}` → `'{"a":1}'` → hash fixo TBD
- **T-CJ-F3:** manifesto v1.0.0 do `CANONICAL-RULES-MANIFEST.md` → hash fixo TBD (fixado quando implementação estiver pronta)

## §11. Relação com outras specs

| Spec | Relação |
|---|---|
| `SPEC-RUNNER-RODADA-D.md` §6.2 | `perfil_hash = sha256(canonicalJSON(dimensões+contextuais))` |
| `SPEC-RUNNER-RODADA-D.md` §6.3 | `rules_hash = sha256(canonicalJSON(manifesto))` |
| `CANONICAL-RULES-MANIFEST.md` §4.1 | Pipeline explicitamente cita esta spec |
| `ADR-0032` §2 | Exige hashes determinísticos — esta spec responde como |

## §12. Não-escopo

- Serialização de tipos não-JSON (Date, Map, Set, Symbol, Function) — proibidos por C-4
- Comparação estrutural de objetos — usa-se hash, não diff
- Parsing reverso (`parseCanonical(s) → obj`) — fora de escopo v1.0.0 (JSON nativo já parsea)
- Minificação de números (ex.: `10e2` vs `1000`) — usa formato natural

## §13. Versionamento

- **Versão atual:** `canonical-json-v1.0.0`
- **Chave no manifesto:** pode aparecer em `derivations.canonical_json = "CANONICAL-JSON-SPEC.md@v1.0.0"` se relevante para rules_hash
- **Bump:** qualquer alteração de regras C-1 a C-6 é **major** (muda todos os hashes existentes) e exige ADR explícito

## §14. Status

DRAFT — aguardando:
1. Ratificação P.O. das 6 regras canônicas (§2)
2. Implementação de referência + fixação dos hashes fixtures §10.6
3. Teste cross-runtime (§10.5) validado antes do primeiro `rules_hash` oficial

Nenhuma implementação antes de aprovação.
