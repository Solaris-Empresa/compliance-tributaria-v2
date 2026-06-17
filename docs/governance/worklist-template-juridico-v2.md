# Template de Worklist Jurídico — v2 (curadoria de `cnaeGroups`)

**Criado:** 2026-06-17 · **Classe A** · **Uso:** estrutura canônica para o jurídico curar `cnaeGroups` por artigo.

> **Sem CNAEs induzidos.** O jurídico recebe **caput (fonte primária) + setor regulado** e decide. O sistema nunca sugere `cnaeGroups`. Curadoria de `cnaeGroups` é camada interpretativa (Lição #133) — só o jurídico assina.

## Colunas (v2 — 7 campos + identidade)

| Campo | Origem | Descrição |
|---|---|---|
| `artigo` / `lei` | extração determinística | identidade do chunk |
| `caput` | **fonte primária** (PDF) | texto legal real — nunca corpus derivado (Lição #126) |
| `setor_regulado` | jurídico | setor econômico que o artigo de fato regula |
| `scope_type` | jurídico | **`material`** · **`institucional`** · **`fora_filtro`** (ver abaixo) |
| `cnaeGroups_proposto` | jurídico | grupos CNAE (2 díg.) **ou** `universal` |
| `decision` | jurídico | `universal` · `restringir` · `manter` |
| `justificativa` | jurídico | base da decisão (1 linha) |
| `validado_por` | jurídico | nome do parecerista |
| `date` | jurídico | data ISO da validação |

### Semântica de `scope_type` (PR C — sem alteração no motor RAG)

| Valor | Significado | Implicação para `cnaeGroups` |
|---|---|---|
| `material` | Regula operações com bens/serviços de um setor (redução de alíquota, regime específico) | Pode ter recorte setorial (lista de grupos CNAE) |
| `institucional` | Governança/processo (CGIBS, arrecadação, contencioso) — aplica-se a todos | `universal` |
| `fora_filtro` | Regra geral de incidência/fato gerador/base/alíquota — não deve filtrar por CNAE | `universal` |

> `scope_type` é **metadado de curadoria** — **não** altera `belongsToUniversalPool` nem o motor de retrieval (intacto). É um campo de decisão do jurídico, materializado em `cnaeGroups` (universal vs recorte).

## Exemplos preenchidos (fatos verificados na fonte primária — referência)

| artigo | lei | caput (resumo, fonte primária) | setor_regulado | scope_type | cnaeGroups_proposto | decision | justificativa | validado_por | date |
|---|---|---|---|---|---|---|---|---|---|
| Art. 140 | lc214 | "serviços de comunicação institucional à administração pública" (L1129) | Comunicação/RP | material | _(jurídico)_ | _(jurídico)_ | faixa industrial atual está errada | ⬜ | ⬜ |
| Art. 176 | lc214 | "contribuintes... biocombustíveis, refinaria, petroquímica, gás" (L1436) | Energia/combustíveis | material | _(jurídico)_ | _(jurídico)_ | faixa industrial atual está errada | ⬜ | ⬜ |
| **Art. 110** | lc214 | "reduzidas a **zero**... **tratores, máquinas e implementos agrícolas**, produtor rural" (L936) | **Agro (alíquota zero)** | material | _(jurídico)_ | _(jurídico)_ | este é o agro de NCM 8436/CNAE 28 | ⬜ | ⬜ |
| **Art. 197** | lc214 | "Não poderão apropriar créditos... **sociedades cooperativas**" (L1551) | **Cooperativas/crédito** | fora_filtro | universal | universal | regra geral de crédito — **não** é agro | ⬜ | ⬜ |
| Art. 4º | lc214 | "IBS e CBS incidem sobre operações onerosas" (L71) | — (incidência) | fora_filtro | universal | universal | regra geral de incidência | ⬜ | ⬜ |
| Art. 2 | lc227 | "competências administrativas... CGIBS" | Institucional | institucional | universal | universal | governança do CGIBS | ⬜ | ⬜ |

> ⚠️ As linhas Art. 110 / Art. 197 acima documentam o fato correto da fonte primária: **LC 214 Art. 197 = cooperativas (universal)**, não agro. O "agro" de NCM 8436 na LC 214 é o **Art. 110**. (O "Art. 197 agro" citado em smokes é do **Decreto 12.955 / CGIBS 6**, outra norma.)

## Vinculadas

`corpus-curation-worklist-lc214-primario.md` · `-lc224-primario.md` · `-lc227-primario.md` · Lição #126/#133 · REGRA-ORQ-33 (gate jurídico) · `belongsToUniversalPool` (`server/rag-retriever.ts` — intacto)
