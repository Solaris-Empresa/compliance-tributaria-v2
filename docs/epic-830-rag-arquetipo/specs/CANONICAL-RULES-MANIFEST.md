# CANONICAL-RULES-MANIFEST — manifesto declarativo do modelo lógico

**Status:** DRAFT — aguardando aprovação do P.O. (primeira versão pós-Q-5)
**Data:** 2026-04-24
**Versão:** `manifest-v1.0.0` (corresponde a `model_version = m1-v1.0.0`)
**Contexto:** Epic #830 — RAG com Arquétipo (M1) — artefato-filho de SPEC-RUNNER-RODADA-D §6.3
**Motivação:** Q-5 Opção C aprovada — `rules_hash` hash de manifesto declarativo, não de código

## §1. Propósito

O manifesto é a **fonte única e estável** do modelo lógico do Perfil da Entidade. Serve para:

1. Calcular `rules_hash` (ADR-0032 §2) de forma determinística, legível e auditável
2. Documentar o que está efetivamente em vigor em cada `model_version`
3. Suportar reprodução histórica de snapshots antigos (ADR-0032 §4 não-migração)
4. Separar **modelo lógico** (estável) de **implementação** (pode refatorar sem bump)

## §2. Princípios vinculantes (P.O. 2026-04-24)

| # | Regra |
|---|---|
| P-1 | **Não usar código-fonte** — bytecode, `.ts`, `.js` não entram no hash |
| P-2 | **Não usar dados de input** — seed, respostas, answers não entram no hash |
| P-3 | **JSON canônico** — chaves ordenadas lexicograficamente; arrays preservam ordem de declaração |
| P-4 | **Apenas modelo lógico** — dimensões + enums + derivações + regras de negócio declarativas |

Implementação que viola qualquer princípio é **defeito crítico**, não "refactor".

## §3. Estrutura canônica

### §3.1. Top-level keys (ordem lexicográfica após serialização)

```jsonc
{
  "derivations": { /* §3.4 */ },
  "dimensions":  [ /* §3.2 */ ],
  "enums":       { /* §3.3 */ },
  "rules":       [ /* §3.5 */ ],
  "version":     "m1-v1.0.0"
}
```

5 chaves exatas. Adicionar chave = bump de major; remover = bump de major; alterar semântica de chave = bump de major.

### §3.2. `dimensions` — lista ordenada das dimensões

```jsonc
"dimensions": ["objeto", "papel_na_cadeia", "tipo_de_relacao", "territorio", "regime"]
```

Conforme ADR-0031. Ordem fixa (não lexicográfica — reflete ordem canônica da ADR).

### §3.3. `enums` — catálogo de valores válidos

Cada enum é um array de strings. **Ordem preservada** (arrays semânticos — ver CANONICAL-JSON-SPEC §7.3). 

Política aditiva: novos valores são adicionados **ao final** da lista. Reordenar valores existentes é bump major (muda `rules_hash` e quebra compatibilidade com snapshots antigos). Esta ordem define o ranking canônico de cada enum.

**Reconciliação Q-D5 2026-04-24:** arrays em `enums.*` são **semânticos** (classificação §7.3 coluna 2); wrapper `canonicalizeForHash()` **NÃO** os reordena. `canonicalJSON(manifesto)` preserva ordem exata como declarada neste documento.

```jsonc
"enums": {
  "objeto":                 ["combustivel", "bebida", "tabaco", "alimento", "medicamento", "energia_eletrica", "servico_financeiro", "servico_digital", "servico_regulado", "bens_industrializados", "bens_mercadoria_geral", "servico_geral", "agricola", "pecuario"],
  "papel_na_cadeia":        ["fabricante", "distribuidor", "varejista", "prestador", "transportador", "importador", "exportador", "comercio_exterior_misto", "intermediador", "produtor", "operadora_regulada", "indefinido"],
  "regime":                 ["simples_nacional", "lucro_presumido", "lucro_real", "mei", "indefinido"],
  "status_arquetipo":       ["pendente", "inconsistente", "bloqueado", "confirmado"],
  "subnatureza_setorial":   ["telecomunicacoes", "saude", "saude_regulada", "energia", "financeiro", "combustiveis", "transporte"],
  "territorio":             ["municipal", "estadual", "interestadual", "nacional", "internacional", "ZFM", "ALC", "incentivado_outro"],
  "tipo_de_relacao":        ["venda", "servico", "producao", "intermediacao", "locacao", "indefinida"],
  "tipo_objeto_economico":  ["Bens/mercadorias", "Servicos", "Energia/combustiveis", "Digital", "Financeiro", "Agricola", "Pecuario", "Misto"]
}
```

Chaves de nível `enums.*` ficam em ordem lexicográfica após serialização canônica. Valores dentro de cada enum preservam ordem declarada.

### §3.4. `derivations` — ponteiros para tabelas externas

Cada derivação referencia um artefato versionado. Ponteiro é string `@versao`:

```jsonc
"derivations": {
  "canonical_json":         "CANONICAL-JSON-SPEC.md@canonical-json-v1.0.0",
  "logical_conflicts":      "LOGICAL-CONFLICTS-v1.0.md@logical-conflicts-v1.0.0",
  "objeto_from_ncm":        "NCM-OBJETO-LOOKUP.md@ncm-objeto-v1.0.0 (translation layer sobre Decision Kernel lookupNcm)",
  "objeto_from_nbs":        "NBS-OBJETO-LOOKUP.md@nbs-objeto-v1.0.0 (translation layer sobre Decision Kernel lookupNbs)",
  "operationType":          "DERIVATION-OPERATIONTYPE.md@derivation-v1.0.0",
  "papel_na_cadeia":        "SPEC-RUNNER-RODADA-D.md#2.2@v1.0.0",
  "regime":                 "SPEC-RUNNER-RODADA-D.md#2.5@v1.0.0",
  "territorio":             "SPEC-RUNNER-RODADA-D.md#2.4@v1.0.0",
  "tipo_de_relacao":        "SPEC-RUNNER-RODADA-D.md#2.3@v1.0.0"
}
```

**Regra:** bump de versão em qualquer artefato apontado exige bump **mínimo minor** no manifesto (novo `rules_hash`).

### §3.5. `rules` — regras de negócio declarativas

Array de strings em linguagem semi-formal. Cada regra é uma afirmação testável.

```jsonc
"rules": [
  // Elegibilidade Imposto Seletivo (ADR-0030 v1.1)
  "papel=transportador → not_contribuinte_IS",
  "papel=fabricante AND objeto IN [combustivel, bebida, tabaco] → contribuinte_IS",
  "papel=distribuidor AND objeto IN [combustivel, bebida, tabaco] → contribuinte_IS",
  "papel=varejista AND objeto IN [combustivel, bebida, tabaco] → contribuinte_IS",
  "papel IN [prestador, operadora_regulada] → not_contribuinte_IS",
  "objeto IN [agricola, pecuario] → BLOCKED_IS (ADR-0030 v1.1 D-6)",

  // Marketplace (Q-3 RESOLVIDA 2026-04-24)
  "papel=intermediador AND tipo_de_relacao=[intermediacao] → marketplace_canonico (servicos)",
  "papel=intermediador AND tipo_de_relacao CONTAINS venda → AmbiguityError (marketplace-com-estoque nao resolve)",

  // Objeto — translation layer sobre Decision Kernel (Q-D1 v2 + Opção B + Ajustes A/B 2026-04-24)
  "objeto_from_ncm: lookupNcm(ncm) → tupla (regime, imposto_seletivo, chapter) → REGIME_TUPLE_TO_OBJETO_NCM[tupla] (ver NCM-OBJETO-LOOKUP.md §3.3)",
  "objeto_from_nbs: lookupNbs(nbs) → tupla (regime, imposto_seletivo, divisao) → REGIME_TUPLE_TO_OBJETO_NBS[tupla] (ver NBS-OBJETO-LOOKUP.md §3.3)",
  "chapter = primeiros 2 dígitos do NCM (extração determinística do código)",
  "divisao = primeiros 4 dígitos do NBS após '1.' (extração determinística do código)",
  "regime=regime_geral AND confianca.tipo=fallback → objeto genérico (bens_mercadoria_geral para NCM, servico_geral para NBS) + blocker V-10-FALLBACK severity=INFO (Ajuste A 2026-04-24: runner NÃO quebra)",
  "status=pending_validation → AmbiguityError → V-10-PENDING severity=HARD_BLOCK → status_arquetipo=inconsistente",
  "tupla (regime, IS, chapter/divisao) sem regra na tabela → AmbiguityError → V-10-UNMAPPED-TUPLE severity=HARD_BLOCK → status_arquetipo=inconsistente",

  // Conflitos lógicos entre dimensões (Q-C4 RESOLVIDA 2026-04-24)
  "conflito logico C1-C6 detectado → blocker V-LC-NNN severity=HARD_BLOCK → status_arquetipo=inconsistente (ver LOGICAL-CONFLICTS-v1.0.md para 31 regras em 6 classes)",
  "papel=transportador AND venda ∈ tipo_de_relacao → V-LC-101 (conflito funcional — Hotfix IS caso raiz)",
  "papel=intermediador AND tipo_de_relacao != [intermediacao] → V-LC-106 (marketplace-com-estoque, Q-3)",
  "papel=importador OR exportador AND internacional ∉ territorio → V-LC-301 ou V-LC-302 (guardrail defensivo — derivação §2.2.1 já inclui internacional)",
  "Q-D2: uniao determinística de sinais_cex (papel_comercio_exterior[] ∪ atua_importacao ∪ atua_exportacao) → escalar papel_na_cadeia (importador|exportador|comercio_exterior_misto) + territorio.add(internacional)",
  "Q-D3: regime dimensional (simples|presumido|real|mei|indefinido) é ortogonal a regime_especifico[] contextual — regime principal NUNCA é substituído por regime especial setorial",
  "Q-D3 + D-LC-4: C4-01 (operadora_regulada + simples_nacional) NÃO dispara se regime_especifico.length > 0 (exceção legal pode aplicar)",
  "subnatureza=telecomunicacoes AND ANATEL ∉ orgao_regulador → V-LC-601 (contextual contraditório)",

  // Imutabilidade e versionamento (ADR-0032 + Q-7 RESOLVIDA 2026-04-24)
  "status_arquetipo=confirmado → snapshot_imutavel",
  "profileVersion=1.0 AND archetype_version IS NULL → legado_nao_recalcula",
  "Q-7: coexistência dual — profileVersion (legado, imutável em M1+) × archetype_version (M1+, escrito na primeira confirmação)",
  "Q-7: isProjetoM1(p) ≡ p.archetype_version !== null (detecção determinística)",
  "Q-7 P-7: sistema PROIBIDO de alterar profileVersion em projetos legados (ADR-0032 §4)",

  // Multi-CNPJ (Q-4 RESOLVIDA 2026-04-24 — 3 estados: NONE/INFO/DENIED)
  "integra_grupo_economico=false → NONE (nenhum blocker, nenhum efeito)",
  "integra_grupo_economico=true AND analise_1_cnpj_operacional=true → INFO (V-05-INFO severity=INFO, não altera status_arquetipo)",
  "integra_grupo_economico=true AND analise_1_cnpj_operacional=false → DENIED (V-05-DENIED severity=BLOCK_FLOW → status_arquetipo=bloqueado)"
]
```

**Regras sobre o conteúdo:**
- Cada string é uma regra independente
- Ordem é **preservada** — ordem é semanticamente relevante (precedência em caso de ambiguidade)
- Adicionar regra: bump minor
- Remover ou alterar regra: bump major
- Fonte das regras: ADRs + spec-filhas (DERIVATION-OPERATIONTYPE, SPEC-RUNNER, etc.) — este manifesto é consolidação textual, não cria regras novas

**Linguagem:** semi-formal em português/inglês misto. Parseável por humanos. Não é DSL executável — implementação segue as spec-filhas, não este texto. Fidelidade semântica é verificada em testes de regressão.

### §3.6. `version` — identificador canônico

String `m1-vMAJOR.MINOR.PATCH`. Exemplo: `m1-v1.0.0`.

**Políticas de bump** (ver §5):
- Patch: mudança sem efeito em `rules_hash` (raro — ex.: correção ortográfica em comentário inline não-serializado)
- Minor: mudanças aditivas (nova regra, novo enum value, nova derivação)
- Major: mudança que altera output para input existente (quebra compatibilidade)

## §4. Cálculo de `rules_hash`

```
rules_hash = "sha256:" + sha256(canonicalJSON(manifesto))
```

### §4.1. Pipeline

```
1. Ler manifesto como objeto JavaScript/JSON
2. Aplicar canonicalJSON:
   a. Ordenar chaves recursivamente (lexicográfico)
   b. Preservar ordem de arrays (não re-ordenar)
   c. Remover whitespace desnecessário
   d. Serializar com escape padrão
3. Calcular SHA-256 do resultado UTF-8
4. Prefixar "sha256:"
```

`canonicalJSON` é especificado separadamente em `CANONICAL-JSON-SPEC.md` (Q-D5 pendente).

### §4.2. Invariantes

- **I-H1:** `rules_hash` é string `sha256:[64 hex chars]`
- **I-H2:** mesmo manifesto → mesmo hash byte-idêntico em qualquer ambiente (Node, Deno, navegador, CI)
- **I-H3:** whitespace no arquivo fonte do manifesto (indentação, quebras) **não afeta** o hash — canonicalJSON normaliza
- **I-H4:** ordem de campos no arquivo fonte **não afeta** o hash — canonicalJSON ordena chaves

### §4.3. Exemplo

Manifesto mínimo de teste:

```json
{"version":"test","dimensions":[],"enums":{},"derivations":{},"rules":[]}
```

Canonical form:
```
{"derivations":{},"dimensions":[],"enums":{},"rules":[],"version":"test"}
```

Hash: valor determinístico a ser fixado em T-H1 (§6.1).

## §5. Versionamento e ciclo de vida

### §5.1. Políticas de bump

| Mudança | Bump | `rules_hash` |
|---|---|---|
| Adicionar regra a `rules[]` | Minor | muda |
| Adicionar enum value ao final | Minor | muda |
| Adicionar novo enum | Minor | muda |
| Adicionar nova dimensão | **Major** (afeta ADR-0031) | muda |
| Alterar regra existente | Major | muda |
| Remover regra ou enum value | Major | muda |
| Reordenar `dimensions[]` | Major (semanticamente visível) | muda |
| Reordenar valores dentro de enum | Não permitido (sempre add ao final) | — |
| Fix ortográfico em comentário externo | Patch | não muda (se não serializado) |

### §5.2. Regra de coerência com `model_version`

`model_version` do snapshot **deve ser igual** a `version` do manifesto usado para calcular `rules_hash`.

Exemplo:
```jsonc
// Snapshot
{
  "model_version": "m1-v1.0.0",
  "rules_hash": "sha256:abc123..."  // hash do manifesto v1.0.0
}
```

Violação dispara erro estrutural.

### §5.3. Coexistência de versões

Snapshots antigos (`model_version: m1-v1.0.0`) preservam seu `rules_hash` quando novo manifesto `m1-v1.1.0` entra em vigor. ADR-0032 §4 proíbe recálculo.

Todos os manifestos históricos devem estar **acessíveis** — sugestão: pasta `docs/epic-830-rag-arquetipo/specs/manifests/m1-v1.0.0.json` (a criar quando primeiro manifesto for publicado).

### §5.4. Proibições

- Editar manifesto publicado **sem** bump de versão
- Re-gerar `rules_hash` de snapshot antigo com manifesto novo (ADR-0032 §4)
- Usar implementação como fonte de verdade (manifesto é a fonte)

## §6. Testes obrigatórios

### §6.1. Determinismo

- **T-H1:** serializar manifesto mínimo (§4.3) → hash determinístico (fixar valor após impl)
- **T-H2:** manifesto completo v1.0.0 → hash único estável entre execuções
- **T-H3:** alterar apenas whitespace do arquivo fonte → hash permanece

### §6.2. Coerência

- **T-C1:** snapshot com `model_version=X` tem `rules_hash` que corresponde ao manifesto versão X
- **T-C2:** manifesto v1.1.0 difere de v1.0.0 apenas em campos aditivos

### §6.3. Integração com runner v3

- **T-I1:** runner v3 lê manifesto, calcula `rules_hash`, emite no output — todos os 50 cenários da suite v3 carregam o MESMO `rules_hash` em uma execução
- **T-I2:** bump de manifesto em teste produz `rules_hash` diferente em execuções subsequentes

## §7. Relação com outras specs

| Spec | Relação |
|---|---|
| `ADR-0031` | Define as 5 dimensões canônicas → `dimensions[]` + `enums.*` |
| `ADR-0032` | Define necessidade de `rules_hash` → este artefato responde como compor |
| `SPEC-RUNNER-RODADA-D` §6.3 | Referencia este artefato como detalhe de implementação |
| `DERIVATION-OPERATIONTYPE.md` | Referenciado em `derivations.operationType` |
| `NCM-OBJETO-LOOKUP.md` (a criar) | Referenciado em `derivations.objeto_from_ncm` |
| `NBS-OBJETO-LOOKUP.md` (a criar) | Referenciado em `derivations.objeto_from_nbs` |
| `CANONICAL-JSON-SPEC.md` (a criar — Q-D5) | Especifica regras exatas de `canonicalJSON` |

## §8. Dúvidas pendentes

- **Q-D5 CANONICAL-JSON-SPEC** — o hash depende da função canonicalJSON. Definir regras antes de fixar primeiro `rules_hash` oficial
- **Primeira tabela de regras `rules[]`** — conteúdo do §3.5 deste doc é provisório. Revisão completa junto com NCM-OBJETO-LOOKUP (Q-D1) e demais derivações
- **Incluir ou não `agro_requer_revisao`** (`risk-eligibility.ts:25`) nas regras — reservado mas não exercitado em v1.1. Manter fora do manifesto até ADR-0030 decidir

## §9. Não-escopo

- Implementação da função `canonicalJSON()` — trata-se de `CANONICAL-JSON-SPEC.md`
- Formato de persistência do manifesto em banco — dentro do runner, é leitura de arquivo; em produção, pode virar coluna `projects.archetype_manifest_ref` (fora de escopo pré-M1)
- Migração de `rules_hash` em snapshots antigos (proibida)
- UI de visualização do manifesto (fora de escopo M1)

## §10. Referências

- `docs/epic-830-rag-arquetipo/adr/ADR-0031-modelo-dimensional.md`
- `docs/epic-830-rag-arquetipo/adr/ADR-0032-imutabilidade-versionamento.md`
- `docs/epic-830-rag-arquetipo/specs/SPEC-RUNNER-RODADA-D.md` §6.3
- `docs/epic-830-rag-arquetipo/specs/DE-PARA-CAMPOS-PERFIL-ENTIDADE.md` §11 Q-5
- `docs/epic-830-rag-arquetipo/specs/DERIVATION-OPERATIONTYPE.md` §7

## §11. Status

DRAFT — aguardando:
1. Aprovação desta estrutura pelo P.O.
2. Resolução de Q-D5 (CANONICAL-JSON-SPEC) — bloqueia fixação do primeiro `rules_hash` canônico
3. Consolidação das regras finais em §3.5 quando NCM-OBJETO-LOOKUP (Q-D1) e demais derivações forem publicadas

Nenhuma implementação antes dos 3 itens acima. Manifesto permanece abstrato até o primeiro `rules_hash` canônico ser fixado.
