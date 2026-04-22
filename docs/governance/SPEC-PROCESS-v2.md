# SPEC-PROCESS-v2 — Processo de aprovação de specs (documento narrativo)

**Versão:** 2.0 · 2026-04-22
**Aprovado por:** Uires Tapajós (P.O.)
**Status:** IN FORCE
**Fonte operacional:** `.claude/rules/governance.md` (REGRA-ORQ-21 a ORQ-24)

---

## Contexto e motivação

Em 2026-04-21, o hotfix IS (Imposto Seletivo para transportadoras)
passou por 3 ciclos formais de spec (v1.0, v1.1, v1.2) com ~20
observações triadas ao longo das críticas. O resultado técnico foi
correto, mas o processo foi **desproporcional ao tamanho do problema**:

- Código final: 3 arquivos, ~250 linhas
- Processo: 3 specs, 3 ADR versions, 3 contratos, 4 arquivos de auditoria
- Tempo: ~metade de uma sessão inteira negociando processo

A retrospectiva identificou 4 padrões que, **se tivessem sido regras a
priori**, teriam cortado ~60% do tempo sem perda de qualidade:

1. Ciclos infinitos de spec não produziam mais valor após v1.2
2. Críticas misturavam pontos triviais com bloqueantes
3. Ausência de tempo-box permitia crítica livre em qualquer versão
4. Processo de Classe C (pesado) aplicado a hotfix Classe A (cirúrgico)

Esse documento formaliza as 4 regras operacionais
(REGRA-ORQ-21 a ORQ-24 em `.claude/rules/governance.md`) e serve como
referência narrativa para a equipe.

---

## Regra 1 — Caminho C é default (REGRA-ORQ-21)

### O que diz

A última versão aprovada de uma spec é a **última revisão formal**.
Críticas posteriores que não afetem correção técnica vão como notas
no F3 ao implementador, nunca geram nova versão da spec.

### Por quê

No hotfix IS, 9 das 10 observações da crítica v1.1 não eram
bloqueantes — eram melhorias de design (Q1 nomenclatura, Q4 ordem
de commits, Q5 prefixo de teste, Q8 JSDoc). Transformar cada uma em
amendment formal duplicava trabalho sem aumentar qualidade.

### Como aplicar

Quando Claude Code retorna crítica pós-aprovação:

1. Orquestrador classifica cada item como **Bloqueante** ou **Não-bloqueante**
2. Bloqueantes entram em v1.x+1 (caso raro, só bugs técnicos reais)
3. Não-bloqueantes vão como seção "Notas operacionais" no prompt F3
4. Spec aprovada permanece com seu hash original

### Exceção

Se durante implementação o Claude Code descobrir que a spec está
tecnicamente **impossível** (ex: tipo que não existe, função que não
tem a assinatura esperada), o Gate 0 dispara amendment v1.x+1. Isso
não viola a regra — é reparo técnico, não crítica.

---

## Regra 2 — Crítica de spec em 3 níveis (REGRA-ORQ-22)

### O que diz

Claude Code, ao criticar uma spec, **DEVE** classificar cada
observação em um de 3 níveis. Saída em formato tabular obrigatório.

| Nível | Significado | Destino |
|---|---|---|
| **1** | Bloqueante técnico | Amendment formal (v1.x+1) |
| **2** | Design improvement | Nota no F3, não toca spec |
| **3** | Observação/backlog | Issue separada no GitHub |

### Por quê

Na crítica v1.1 do hotfix IS, 13 pontos vieram misturados (E1, E2,
E3, D1-D5, P1-P5). Separá-los exigiu trabalho manual do Orquestrador
e demorou minutos só para P.O. entender o que era urgente.

Se a crítica já vier classificada, P.O. lê em segundos:

- Nível 1: "quais? 2 pontos. OK, entram."
- Nível 2: "automaticamente vão pro F3, próximo."
- Nível 3: "quais viram issue? 4 pontos. crio depois."

### Template obrigatório

Ver `docs/governance/templates/TEMPLATE-critica-3-niveis.md`.

### O que fazer quando Claude Code não classifica

Se o retorno vier sem classificação (hábito antigo), Orquestrador
**não aceita** e pede re-submissão no formato correto. Isso treina
o padrão.

---

## Regra 3 — Tempo-box de aprovação (REGRA-ORQ-23)

### O que diz

Cada spec tem direito a **1 round formal de crítica** pelo Claude Code.

Fluxo canônico:

```
Orquestrador v1.0 → Claude Code critica (3 níveis)
                  → Orquestrador v1.1 com Nível 1 incorporado
                  → P.O. aprova v1.1
                  → Implementação
```

**Não existe v1.2 formal de rotina.** Só existe se Gate 0 da
implementação disparar reparo técnico.

### Por quê

Sem tempo-box, crítica vira processo infinito. No hotfix IS:

- v1.0 → 13 críticas → v1.1
- v1.1 → 10 críticas → v1.2
- v1.2 → 0 críticas → aprovação

Se tivéssemos parado em v1.1 com os 2 bloqueantes reais incorporados
(P2 residual + Q2), o resultado teria sido o mesmo com 1 sessão a menos.

### Implicação para o Orquestrador

Na v1.0, **antecipar** os pontos que Claude Code provavelmente vai
criticar. Isso desloca qualidade para o início do ciclo em vez de
depender de múltiplos rounds.

### Implicação para o P.O.

Aprovar v1.1 mesmo com pequenas reservas é preferível a pedir v1.2.
Reservas viram notas de F3 (via Regra 1), não novo ciclo.

---

## Regra 4 — Classe de impacto (REGRA-ORQ-24)

### O que diz

Toda spec é classificada em uma de 3 classes **no ato de criação**:

#### Classe A — Cirúrgico

- Até 50 linhas de código
- Até 2 arquivos afetados
- 1 função/componente isolado
- **Governança:** SPEC 1 página, Caminho C default, aprovação em 1-2 ciclos
- **Exemplos:** bug fix pontual, correção de texto, ajuste de validação

#### Classe B — Feature média

- Até 500 linhas de código
- Até 5 arquivos afetados
- Módulo novo ou extensão substantiva
- **Governança:** SPEC completa, 1 round de crítica, ADR opcional
- **Exemplos:** novo endpoint, novo componente, refator de função crítica

#### Classe C — Mudança estrutural

- Mais de 500 linhas, refactor transversal, ou novo subsistema
- Múltiplos módulos afetados
- **Governança:** SPEC extensa, até 2 rounds, ADR obrigatório
- **Exemplos:** M1 Arquetipo, refactor do risk-categorizer, migração de banco

### Como classificar

O Orquestrador declara a classe no cabeçalho da spec. Claude Code,
no Gate 0, valida se a classe declarada corresponde ao escopo real:

- Se spec diz "Classe A" mas PR terá 400 linhas → reclassificar como B
- Se spec diz "Classe C" mas PR terá 30 linhas → reclassificar como A

Reclassificação força reavaliação dos critérios de governança antes
de prosseguir.

### Template de classificação

Ver `docs/governance/templates/TEMPLATE-classe-impacto.md`.

### Por quê

No hotfix IS, aplicamos governança Classe C (spec v1.0+v1.1+v1.2,
ADR com D-1 a D-8, contrato técnico separado, artefato de auditoria,
JSON de trilha paralelo) a um código de Classe A (3 arquivos, 250
linhas, 1 função nova).

O resultado técnico foi bom, mas o processo consumiu desproporcionalmente.
Classe A não precisa de todos esses ritos.

---

## Caso de estudo: Hotfix IS (2026-04-21)

Esta seção preserva o caso como material narrativo. Serve como
referência do **antes** para comparar com o **depois** quando as
regras produzirem seu primeiro hotfix Classe A enxuto.

### Métricas do hotfix IS

- **Classificação a priori:** não classificado (regras inexistiam)
- **Classificação retroativa (para estudo):** Classe A
- **Processo aplicado:** Classe C (desproporcional)

### Artefatos produzidos

- SPEC v1.0, v1.1, v1.2 (hash-lock em 3 versões)
- ADR-0030 v1.0 e v1.1 (amendment paralelo)
- Contrato técnico v1.0, v1.1, v1.2 (3 iterações)
- Artefato de auditoria pré-deploy
- `governance/APPROVED_SPEC-HOTFIX-IS.json` (trilha paralela, Caminho β)

### O que teria acontecido sob Regras 1-4

- **Regra 4:** classificado Classe A no ato
- **Regra 2:** crítica do Claude Code em 3 níveis — 2 Nível 1 + 4 Nível 2 + 4 Nível 3
- **Regra 3:** 1 round. v1.1 incorporaria os 2 Nível 1 (P2, Q2)
- **Regra 1:** v1.2 nunca existiria. Nível 2 iria como nota no F3
- **Resultado estimado:** 1 spec, 1 ADR, 1 contrato. Processo resolvido em metade do tempo

### Decisão sobre retroatividade

O hotfix IS **não é reclassificado** retroativamente. Seus artefatos
ficam como estão (v1.2 APPROVED_CURRENT, hashes preservados). A lição
fica na história do processo, não na reescrita do passado.

---

## Referências

- Regras operacionais: `.claude/rules/governance.md#regra-orq-21`
- Templates:
  - `docs/governance/templates/TEMPLATE-critica-3-niveis.md`
  - `docs/governance/templates/TEMPLATE-classe-impacto.md`
- Hash-lock: `governance/APPROVED_SPEC-PLATFORM-AUTOMATION.json`
- Epic-mãe: Platform Automation v2 (precursor do Epic RAG com Arquetipo)
- Sucessor planejado: Automação #1 (Milestone P2), Automação #4 (Milestone P3)

---

## Rastreabilidade

- Epic: Platform Automation v2
- Milestone: P1 (este documento)
- Issue GitHub: a ser criada
- PR: #829 (force-push v1.1 após correção de colisão ORQ-19/20)

**Próxima atualização:** quando o primeiro hotfix pós-regras for
concluído, atualizar esta seção com métricas reais comparadas ao
caso de estudo.
