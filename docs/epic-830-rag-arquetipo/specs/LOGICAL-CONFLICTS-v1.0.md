# LOGICAL-CONFLICTS-v1.0 — regras de detecção de conflito lógico entre dimensões

**Status:** DRAFT — aguardando ratificação do P.O.
**Data:** 2026-04-24
**Versão:** `logical-conflicts-v1.0.0`
**Contexto:** Epic #830 — RAG com Arquétipo (M1) — artefato-filho de SPEC-RUNNER-RODADA-D §4.2.2
**Motivação:** Q-C4 — Regra 3 da tabela §4.2.1 (`conflito lógico entre dimensões → inconsistente`) exige lista **enumerada** e **determinística** de conflitos. Este artefato fecha essa lista.

## §1. Propósito

Enumerar exaustivamente as combinações de valores entre dimensões do Perfil da Entidade que são **semanticamente incompatíveis** (conflito lógico), independente de campos estarem preenchidos ou faltantes.

**Distinção vs outras classes de issue (SPEC-RUNNER §4.2.2):**
- **Insuficiência quantitativa** (faltam campos) → `missing_required_fields` → classe diferente
- **Derivação legada falha** (AmbiguityError em `deriveOperationType`) → classe diferente  
- **Conflito lógico** (campos preenchidos, mas combinação contradiz realidade tributária) → **este artefato**

## §2. Princípios vinculantes (P.O. 2026-04-24)

1. **Determinístico** — toda regra é igualdade estrita em enum fechado (Princípio §2.0.3 SPEC-RUNNER). Zero `contains()`, zero LLM, zero heurística
2. **Sem fallback silencioso** — conflito detectado emite blocker `V-LC-NNN` com `severity="HARD_BLOCK"` → `status_arquetipo = "inconsistente"`
3. **Baseado nas 5 dimensões** + 2 contextuais do modelo canônico (ADR-0031)
4. **Reversão possível** — bump minor adiciona regras; remoção é bump major

## §3. Classificação — 6 classes de conflito

| Classe | Escopo | Prefixo blocker |
|---|---|---|
| C1 | Papel na cadeia × Tipo de relação | `V-LC-1NN` |
| C2 | Papel na cadeia × Objeto | `V-LC-2NN` |
| C3 | Papel na cadeia × Território | `V-LC-3NN` |
| C4 | Papel na cadeia × Regime | `V-LC-4NN` |
| C5 | Tipo de relação × Objeto | `V-LC-5NN` |
| C6 | Contextuais (subnatureza, órgão regulador) | `V-LC-6NN` |

## §4. Regras — C1 (Papel × Relação)

| ID | Condição (enum-match) | Tipo | Justificativa | Exemplo cenário |
|---|---|---|---|---|
| **C1-01** | `papel == "transportador"` AND `"venda" ∈ tipo_de_relacao` | conflito funcional | Transportador presta serviço de transporte — não vende mercadoria. Se vende, é comerciante com serviço acessório (outro papel) | Caso raiz do Hotfix IS v1.2 (transportadora que "vende" combustível — era papel errado) |
| **C1-02** | `papel == "fabricante"` AND `"producao" ∉ tipo_de_relacao` | conflito funcional | Fabricante, por definição, produz. Ausência de `producao` na relação indica papel declarado incorreto | Hipotético: fabricante que só vende estoque parado (na prática é distribuidor) |
| **C1-03** | `papel == "prestador"` AND `"servico" ∉ tipo_de_relacao` | conflito funcional | Prestador de serviço sem relação de serviço é contradição direta | — |
| **C1-04** | `papel == "varejista"` AND `"venda" ∉ tipo_de_relacao` | conflito funcional | Varejista não vende? Papel incompatível | — |
| **C1-05** | `papel == "distribuidor"` AND `"venda" ∉ tipo_de_relacao` | conflito funcional | Distribuidor comercializa — venda é central | — |
| **C1-06** | `papel == "intermediador"` AND `tipo_de_relacao ≠ ["intermediacao"]` | marketplace-com-estoque (Q-3) | Intermediador puro faz só intermediação. Venda + intermediação = marketplace-com-estoque ambíguo | S04 Marketplace de sellers (se re-seedado com `venda`) |
| **C1-07** | `papel == "produtor"` AND `"producao" ∉ tipo_de_relacao` | conflito funcional | Produtor rural/agrícola produz; relação inversa | — |
| **C1-08** | `papel == "operadora_regulada"` AND `"servico" ∉ tipo_de_relacao` | conflito funcional | Operadora regulada (telecom, energia, saúde) presta serviço regulado | S24 Telecom (se declarar venda apenas) |

## §5. Regras — C2 (Papel × Objeto)

| ID | Condição | Tipo | Justificativa | Exemplo |
|---|---|---|---|---|
| **C2-01** | `papel == "fabricante"` AND `objeto == []` | insuficiência semântica | Fabricante do quê? Vazio sinaliza problema — mas esta regra **sobrepõe** `missing_required_fields`; mantida para detecção após derivação | — |
| **C2-02** | `papel == "operadora_regulada"` AND `{"servico_regulado", "servico_financeiro"} ∩ objeto == ∅` | papel sem domínio | Operadora regulada opera em setor regulado (telecom → servico_regulado; financeiro → servico_financeiro). Ausência indica papel errado | Hipotético: operadora declarada mas objeto=`["bens_mercadoria_geral"]` |
| **C2-03** | `papel == "importador"` AND `objeto == ["servico_digital"]` | papel sem alinhamento | Importador trata com bens físicos no cross-border. Serviço digital é outro tipo de operação (tributação diferente) | — |
| **C2-04** | `papel == "exportador"` AND `objeto == ["servico_digital"]` | idem C2-03 | idem | — |
| **C2-05** | `papel == "transportador"` AND `{"servico_digital","servico_financeiro"} ∩ objeto ≠ ∅` | papel sem coerência | Transportador move bens físicos — não se aplica a serviços puramente digitais/financeiros | — |
| **C2-06** | `papel == "produtor"` AND `objeto ⊆ {"servico_geral","servico_regulado","servico_digital","servico_financeiro"}` | papel produtor sem objeto produzível | Produtor agrícola/pecuário produz bens materiais — não serviços | — |

## §6. Regras — C3 (Papel × Território)

**Nota Q-D2 RESOLVIDA 2026-04-24:** Regras C3-01, C3-02, C3-03 atuam como **guardrails defensivos**. Derivação correta (SPEC-RUNNER §2.2.1) sempre acrescenta `"internacional"` ao `territorio[]` quando o papel for importador/exportador/misto. C3-01..03 só disparam se derivação foi pulada ou seed sofreu alteração pós-derivação — indicam bug do pipeline, não inconsistência do usuário.

| ID | Condição | Tipo | Justificativa | Exemplo |
|---|---|---|---|---|
| **C3-01** | `papel == "importador"` AND `"internacional" ∉ territorio` | guardrail defensivo (Q-D2) | Importador requer território internacional; derivação correta já garante. Disparo = pipeline bug | — |
| **C3-02** | `papel == "exportador"` AND `"internacional" ∉ territorio` | idem C3-01 | idem | — |
| **C3-03** | `papel == "comercio_exterior_misto"` AND `"internacional" ∉ territorio` | idem | Misto = importador + exportador; derivação §2.2.1 inclui internacional automaticamente | — |
| **C3-04** | `papel == "transportador"` AND `territorio == ["municipal"]` AND `objeto ∩ {"combustivel","bebida","tabaco"} ≠ ∅` | conflito específico IS | Transporte municipal de objeto sujeito a IS tem tributação distinta — papel pode estar errado (prestador?) | — |
| **C3-05** | `papel ∉ {"importador", "exportador", "comercio_exterior_misto"}` AND `"internacional" ∈ territorio` AND `atua_importacao == false` AND `atua_exportacao == false` | coerência reversa (Q-D2) | Território internacional declarado sem sinais de importação/exportação nem papel de CEx — inconsistência declarativa | — |

## §7. Regras — C4 (Papel × Regime) — atualizado Q-D3 2026-04-24

**Nota Q-D3 RESOLVIDA:** `regime_especifico_setorial` **removido** do enum `regime`. O campo `regime_especifico[]` é agora atributo contextual modificador (SPEC-RUNNER §2.6). Regras C4 continuam operando sobre `regime` dimensional principal, mas **C4-01 pode ser relaxada** quando `regime_especifico` contém override conhecido (ver D-LC-4 RESOLVIDA).

| ID | Condição | Tipo | Justificativa | Exemplo |
|---|---|---|---|---|
| **C4-01** | `papel == "operadora_regulada"` AND `regime == "simples_nacional"` AND `regime_especifico == []` | regime incompatível com setor (com override) | Setores regulados geralmente excluídos do Simples (LC 123/06 Art. 17). **Q-D3 RESOLVIDA:** se `regime_especifico` contém valor (ex.: regime setorial específico conhecido), C4-01 NÃO dispara — exceção legal pode aplicar | S24 Telecom sem regime_especifico dispara; com `["setor_regulado_mei_compativel"]` não dispara |
| **C4-02** | `papel == "fabricante"` AND `regime == "mei"` | porte incompatível | MEI tem receita bruta máxima R$ 81k/ano — fabricação geralmente ultrapassa | — |
| **C4-03** | `papel == "operadora_regulada"` AND `regime == "mei"` | idem C4-02 | Operadoras reguladas raramente MEI | — |
| **C4-04** | `papel == "importador"` AND `regime == "mei"` | papel incompatível com MEI | MEI não pode importar (Art. 18-A LC 123/06 restrições) | — |

## §8. Regras — C5 (Relação × Objeto)

| ID | Condição | Tipo | Justificativa | Exemplo |
|---|---|---|---|---|
| **C5-01** | `tipo_de_relacao == ["locacao"]` AND `objeto ∩ {"alimento","bebida","tabaco","combustivel","medicamento"} ≠ ∅` | combinação implausível | Locação de consumíveis (alimentos, combustível) é anômala — geralmente é venda | — |
| **C5-02** | `tipo_de_relacao == ["producao"]` AND `objeto ⊆ {"servico_financeiro","servico_digital"}` | produção de serviço puro | Produção pressupõe objeto material ou digital produzido; serviço financeiro/digital puro é `servico`, não `producao` | — |
| **C5-03** | `"intermediacao" ∈ tipo_de_relacao` AND `objeto == ["combustivel"]` | intermediação de combustível (raro) | Combustível geralmente tem cadeia controlada (distribuidor/revendedor autorizado); intermediação pura é incomum — pode indicar erro de classificação | — |

## §9. Regras — C6 (Contextuais: subnatureza × órgão regulador)

**Atualizado Q-D4 RESOLVIDA 2026-04-24:** `subnatureza_setorial` é `string[]` (array). Todas as condições C6 usam `∈` (pertinência em array) no lugar de `==` (igualdade escalar).

| ID | Condição | Tipo | Justificativa | Exemplo |
|---|---|---|---|---|
| **C6-01** | `"telecomunicacoes" ∈ subnatureza_setorial` AND `"ANATEL" ∉ orgao_regulador` | contextual contraditório | Telecom é regulada pela ANATEL — ausência indica erro de declaração | S24 Telecom com ANATEL ausente |
| **C6-02** | `subnatureza_setorial ∩ {"saude","saude_regulada"} ≠ ∅` AND `orgao_regulador ∩ {"ANVISA","ANS"} == ∅` | idem | Saúde regulada por ANVISA (produtos) ou ANS (planos) | — |
| **C6-03** | `"energia" ∈ subnatureza_setorial` AND `"ANEEL" ∉ orgao_regulador` | idem | Energia elétrica é regulada pela ANEEL | S25 Geradora de energia |
| **C6-04** | `"financeiro" ∈ subnatureza_setorial` AND `orgao_regulador ∩ {"BCB","CVM","SUSEP"} == ∅` | idem | Instituições financeiras reguladas por BCB (bancos), CVM (mercado capitais), SUSEP (seguros) | — |
| **C6-05** | `"combustiveis" ∈ subnatureza_setorial` AND `"ANP" ∉ orgao_regulador` | idem | Combustíveis regulados pela ANP | — |
| **C6-06** | `"transporte" ∈ subnatureza_setorial` AND `orgao_regulador ∩ {"ANTT","ANTAQ","ANAC"} == ∅` | idem | Transporte regulado conforme modal (ANTT terrestre, ANTAQ aquaviário, ANAC aéreo) | — |
| **C6-07** | `subnatureza_setorial == []` AND `papel_na_cadeia == "operadora_regulada"` | contextual quantitativo | Cobertura já via `missing_required_fields`; declarado aqui por completude do mapeamento | — |

## §10. Algoritmo de detecção (determinístico)

```ts
function detectLogicalConflicts(archetype: Perfil): LogicalConflict[] {
  const conflicts: LogicalConflict[] = [];
  
  // Avalia cada regra §4-§9 em ordem
  for (const rule of ALL_RULES_C1_TO_C6) {
    if (rule.condicao(archetype)) {
      conflicts.push({
        id: rule.id,
        blocker_id: `V-LC-${rule.codigo}`,
        severity: "HARD_BLOCK",
        rule_text: rule.texto,
      });
    }
  }
  
  return conflicts;
}
```

**Integração no runner v3:**
- Função `detectLogicalConflicts()` executada DEPOIS de `derivePerfilDimensional()` e ANTES de derivação status_arquetipo
- Cada conflito detectado vira blocker `V-LC-NNN` com severity HARD_BLOCK em `blockers_triggered`
- Via regra 3 da §4.2.1 SPEC-RUNNER: `status_arquetipo = "inconsistente"`
- Test result: `status = "FAIL"`

## §11. Invariantes

- **I-LC-1:** toda regra C1-C6 usa comparação de igualdade em enum fechado; zero substring, regex ou LLM
- **I-LC-2:** ordem de avaliação das regras não afeta resultado (conflitos são aditivos, não exclusivos)
- **I-LC-3:** mesmo archetype avaliado múltiplas vezes produz mesmo conjunto de conflitos (determinismo)
- **I-LC-4:** arquétipo livre de conflitos (zero regras disparam) NÃO implica `status_arquetipo = "confirmado"` — depende ainda de `user_confirmed=true` (regra 5 §4.2.1 SPEC-RUNNER)
- **I-LC-5:** conflito lógico + INFO blocker (ex.: V-10-FALLBACK) coexistem — INFO não anula HARD_BLOCK

## §12. Testes obrigatórios

### §12.1. Unitários por regra

- **T-LC-C1-01..08:** 1 teste por regra da classe C1 com arquétipo exemplar que dispara a regra
- **T-LC-C2-01..06:** idem classe C2
- **T-LC-C3-01..04:** idem classe C3
- **T-LC-C4-01..04:** idem classe C4
- **T-LC-C5-01..03:** idem classe C5
- **T-LC-C6-01..06:** idem classe C6

### §12.2. Negativos (arquétipos válidos — nenhuma regra dispara)

- **T-LC-N1:** arquétipo S01 Supermercado (varejista + venda + bens) → zero conflitos
- **T-LC-N2:** arquétipo S04 Marketplace (intermediador + intermediacao pura) → zero conflitos
- **T-LC-N3:** arquétipo S24 Telecom (operadora_regulada + servico + ANATEL + regulado) → zero conflitos

### §12.3. Aditividade

- **T-LC-A1:** arquétipo com 2 conflitos simultâneos (ex.: papel=transportador+venda AND importador sem internacional) → ambos blockers emitidos
- **T-LC-A2:** conflito C1 + blocker INFO V-10-FALLBACK coexistem → ambos presentes em `blockers_triggered`; status=inconsistente (HARD_BLOCK vence)

### §12.4. Determinismo

- **T-LC-D1:** `detectLogicalConflicts(a)` 100× → mesmo resultado
- **T-LC-D2:** ordem de iteração das regras no código não afeta ordem final (sort do output por ID)

### §12.5. Cobertura

- **T-LC-S1:** rodar sobre suite v3 (51 cenários) → cenários declarados válidos produzem zero conflitos; S27 continua BLOCKED por V-05-DENIED (não por conflito lógico)

## §13. Relação com outras specs

| Spec | Relação |
|---|---|
| `SPEC-RUNNER-RODADA-D.md` §4.2.1 regra 3 | Consome lista de conflitos deste artefato |
| `SPEC-RUNNER-RODADA-D.md` §4.2.2 | Semântica "conflito lógico vs quantitativo vs derivação legada" |
| `SPEC-RUNNER-RODADA-D.md` §7.2 | V-LC-NNN são consumidores de severity HARD_BLOCK |
| `ADR-0031` §Princípios | Princípio 2 (sem `contains()`) aplica-se às condições |
| `DERIVATION-OPERATIONTYPE.md` | Independente — DERIVATION opera antes; conflitos lógicos são camada separada |
| `NCM-OBJETO-LOOKUP.md` / `NBS-OBJETO-LOOKUP.md` | Upstream — fornecem valores de `objeto[]` que alimentam verificação C2/C5 |

## §14. Versionamento

- **Versão atual:** `logical-conflicts-v1.0.0`
- **Chave no manifesto:** `derivations.logical_conflicts = "LOGICAL-CONFLICTS-v1.0.md@v1.0.0"`
- **Políticas de bump:**
  - **Patch:** correção de texto/descrição sem alterar condição
  - **Minor:** adicionar regra nova (retroativo — antigos snapshots não mudam)
  - **Major:** alterar condição de regra existente OU remover regra (quebra snapshots)
- **Política de não-migração:** snapshots antigos preservam resultado com versão antiga (ADR-0032 §4)

## §15. Dúvidas pendentes

- **D-LC-1** — C4-01 (operadora + Simples): confirmar se dispara automaticamente ou se é warning (algumas exceções existem na LC 123/06)
- **D-LC-2** — C6-06 (transporte): se `orgao_regulador` está vazio mas `subnatureza = "transporte"`, qual ANx exigir como default?
- **~~D-LC-3~~** — **RESOLVIDA 2026-04-24 (junto com Q-D4)**: `subnatureza_setorial` é `string[]` (array) com enum v1 de 7 valores (`telecomunicacoes`, `saude`, `saude_regulada`, `energia`, `financeiro`, `combustiveis`, `transporte`). Todas as condições C6 atualizadas para operadores de array (`∈`, `∩`)
- **~~D-LC-4~~** — **RESOLVIDA 2026-04-24 (junto com Q-D3)**: regras podem ter overrides por `regime_especifico[]`. Primeira aplicação: C4-01 (operadora + Simples) **não dispara** quando `regime_especifico.length > 0`. Padrão extensível a outras regras (C4-02, C4-03, C4-04) via pedido explícito em bump minor futuro
- **D-LC-5** — C1-05 (distribuidor sem venda): pode haver distribuidor que opera exclusivamente por consignação (locação disfarçada)? Caso raro.

## §16. Não-escopo

- Validação tributária profunda (alíquotas, bases de cálculo) — é papel do engine de riscos
- Detecção de fraude ou evasão — fora de M1
- Correção automática de conflitos — runner apenas reporta
- Sugestões ao usuário — UX layer fora deste artefato

## §17. Status

DRAFT — aguardando:
1. Ratificação P.O. das regras C1-C6 (especialmente C4-01 sobre Simples Nacional e exceções)
2. Resolução de Q-D4 (tipo de `subnatureza_setorial`) — afeta escrita das regras C6
3. Validação sobre suite v3 após populada — conferir que cenários válidos produzem zero conflitos

Nenhuma implementação antes dos 3 itens acima.
