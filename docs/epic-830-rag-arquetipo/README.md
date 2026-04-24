# Epic #830 — RAG com Arquetipo — Documentação pré-M1

> **Status:** pré-M1 em exploração avançada
> **REGRA-M1-GO-NO-GO ativa** — implementação bloqueada
> **Modelo canônico:** dimensional (objeto + papel + relação + território + regime)
> **Última atualização:** 2026-04-23

## Propósito

Consolidar conhecimento da exploração pré-M1 **sem travar criatividade**.
Documenta decisões consolidadas, mantém decisões em construção, versiona
mockups e specs em evolução.

**Princípio:** documentação **segue** a exploração, não a trava.

## Insight fundamental

> Vocês estão construindo um sistema de **decisão**, não de **classificação**.

Em vez de mapear empresa → categoria fixa (classificação, que explode em
combinações), aplicar regras determinísticas por dimensão independente e
compor o resultado (decisão).

## Modelo canônico do arquétipo

**Eixos independentes:**

| Eixo | Exemplos | Fonte |
|---|---|---|
| `objeto` | combustível, alimento, serviço médico, serviço financeiro | form + NCM/NBS |
| `papel_na_cadeia` | transportador, distribuidor, fabricante, varejista, intermediador, prestador | form |
| `tipo_de_relacao` | venda, serviço, produção, intermediação, locação | form |
| `territorio` | municipal, interestadual, internacional, ZFM, ALC | form |
| `regime` | Simples Nacional, Lucro Presumido, Lucro Real, regime específico | form |

**Regras** agem por dimensão, não por combinação. Exemplo:

```
IF papel = transportador → nunca contribuinte de IS
IF papel = fabricante AND objeto ∈ {combustível, tabaco, bebida} → contribuinte de IS
IF territorio = ZFM AND regime = incentivo → excluir X
```

## Política de versionamento e imutabilidade

**Princípio fundador:**

> Arquétipo é um **snapshot imutável** do momento de cálculo. Não é recalculado
> retroativamente quando o modelo evolui.

**Regras operacionais:**

1. **Cálculo único por projeto** — ao submeter o formulário arquétipo, o
   sistema calcula uma única vez e persiste com timestamp.
2. **Campos obrigatórios de metadados:**
   - `versao_modelo` — versão do modelo usada no cálculo (ex: "1.0")
   - `calculado_em` — ISO timestamp do momento do cálculo
3. **Evolução do modelo:** quando modelo evolui (v1.0 → v2.0), arquétipos
   antigos **continuam com v1.0**. Sistema roda múltiplas versões em paralelo.
4. **Não há migração automática.** Empresas cadastradas com modelo antigo
   permanecem com modelo antigo. Se precisar recalcular, é ação explícita
   e consciente do consultor tributário.
5. **Auditabilidade:** consultor sempre vê qual versão do modelo gerou qual
   arquétipo, e quando foi calculado.

**Rationale:**
- Rastreabilidade histórica (consultor viu arquétipo X na data Y)
- Estabilidade operacional (mudança de modelo não quebra análises antigas)
- Decisão consciente de recálculo (evita automações silenciosas que confundem)

**Ponto em aberto para ADR futuro:** processo de recálculo explícito (comando
do consultor para recalcular um caso específico). Não é parte do M1 inicial.

## Estrutura

- `adr/` — Architecture Decision Records (decisões **finais**, consolidadas)
- `decisions/` — Decisões **em construção** (debates, trade-offs, propostas)
- `mockups/` — Versões visuais do formulário arquétipo (+`diffs/` entre versões)
- `specs/` — Especificações (regras de negócio, campos, BLOCKERS, contratos)
- `schema/` — Estrutura de dados proposta do arquétipo
- `cenarios/` — 15 cenários da REGRA-M1-GO-NO-GO (bateria de testes)
- `exploracao/` — Hipóteses descartáveis, rascunhos, notas pessoais

### Promoção entre pastas

```
exploracao/ → decisions/ → adr/
(hipótese) → (debate) → (decidido)
```

Quando uma ideia vira debate sério, move para `decisions/`. Quando a decisão
consolida, vira ADR em `adr/` e é referenciada de volta em `decisions/`.

## Governança mínima obrigatória

**Regra 1 — ADR obrigatório para mudança de modelo**

Toda decisão que altera o modelo do arquétipo exige ADR antes do próximo
commit que toque a spec.

"Mudança de modelo" inclui (lista fechada):
- Adicionar/remover campo do arquétipo
- Mudar tipo de campo (enum, multi-select, etc.)
- Mudar regra de abertura/fechamento de bloco
- Mudar função de derivação de eixo
- Mudar política de bloqueio (ex: multi-CNPJ)

**Commit que altera spec sem ADR correspondente é inválido** — review
rejeita ou reverte.

**Regra 2 — Checkpoint por tag**

Branch `docs/pre-m1-exploracao` recebe tags nos momentos importantes:

- `pre-m1-estrutura-inicial` (após este F3)
- `pre-m1-blockers-consolidados` (quando 8 BLOCKERS viraram ADRs ou decisões)
- `pre-m1-modelo-dimensional` (quando modelo dimensional virar ADR formal)
- `pre-m1-cenarios-completos` (quando 15/15 prontos)
- `pre-m1-final` (quando GO declarado)

## Fluxo de contribuição

### Quando documentar (document-as-you-go)
- Decisão **final** tomada → ADR em `adr/`
- Decisão **em debate** → doc em `decisions/` antes de virar ADR
- Hipótese/rascunho → `exploracao/`, livre
- Descoberta importante → atualizar `specs/BLOCKERS-pre-m1.md` ou
  `specs/PENDING-DECISIONS.md`
- Cenário novo testado → arquivo em `cenarios/`
- Campo do form modificado → atualizar spec + ADR se muda modelo
- Contrato entre milestones → atualizar `specs/CONTRATOS-ENTRE-MILESTONES.md`
- Mudança visual → nova versão em `mockups/`

### Quando NÃO travar
- Discussão em andamento → draft, não bloqueia outras frentes
- Mudança de direção → versiona (v1 → v2), não apaga
- Hipótese especulativa → marca `[EXPLORATÓRIO]`, vai em `exploracao/`

## REGRA-M1-GO-NO-GO

M1 só inicia após 3 condições PASS:
- **C1** Modelo determinístico (regras explícitas, zero LLM, campo obrigatório com UI)
- **C2** 15/15 cenários de negócio com `arquetipo = valido`
- **C3** Amarração formulário↔testes (suite = fonte de verdade)

**Durante o gate:** proibido implementar, gerar código, alterar backend ou RAG.

## Links relacionados

- Issue-mãe do Epic: #830
- Milestones M1-M8: #831-#838
- M9 backlog: #839
- Issue de tracking desta sprint: (criada durante este F3, ver reporte)
- Hotfix IS encerrado (precursor): PRs #826/#840/#841
