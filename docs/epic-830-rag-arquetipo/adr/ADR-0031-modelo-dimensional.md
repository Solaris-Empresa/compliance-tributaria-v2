# ADR-0031 — Modelo Dimensional do Perfil da Entidade

**Status:** PROPOSED  
**Data:** 2026-04-24  
**Contexto:** Epic #830 — RAG com Arquétipo (M1)

## Problema

O modelo atual tende a classificar empresas por categorias fixas, como “transportadora” ou “distribuidora”, gerando:

- explosão combinatória de regras;
- ambiguidades semânticas, especialmente entre operar, vender, transportar e intermediar;
- erros de elegibilidade, como a aplicação indevida de Imposto Seletivo para transportadora de combustível.

## Decisão

Adotar o **modelo dimensional canônico** para o Perfil da Entidade.

O Perfil da Entidade passa a ser descrito por dimensões independentes, e não por uma classificação única da empresa.

## Dimensões canônicas

| Dimensão | Função | Exemplos |
|---|---|---|
| `objeto` | O que está envolvido na operação | combustível, alimento, medicamento, serviço médico, serviço financeiro |
| `papel_na_cadeia` | Qual papel a entidade exerce na cadeia | transportador, distribuidor, fabricante, varejista, intermediador, prestador |
| `tipo_de_relacao` | Como a entidade se relaciona com o objeto | venda, serviço, produção, intermediação, locação |
| `territorio` | Onde/como a operação ocorre | municipal, interestadual, internacional, ZFM, ALC |
| `regime` | Regime tributário aplicável | Simples Nacional, Lucro Presumido, Lucro Real, regime específico |

## Princípios

1. Regras operam por dimensão isolada, não por produto cartesiano de combinações.
2. É proibido usar inferência semântica aberta como `CONTAINS` em categorias não controladas.
3. Derivações devem usar enums fechados, tabelas oficiais ou listas controladas.
4. O Perfil da Entidade deve ser determinístico.
5. LLM pode auxiliar o usuário, mas não pode ser fonte de verdade do modelo.
6. O usuário deve confirmar o Perfil da Entidade antes de seguir no fluxo.

## Exemplo canônico — combustível

### Transportadora de combustível

| Dimensão | Valor |
|---|---|
| `objeto` | combustível |
| `papel_na_cadeia` | transportador |
| `tipo_de_relacao` | serviço |

Resultado: não contribuinte do Imposto Seletivo por transporte.

### Distribuidora de combustível

| Dimensão | Valor |
|---|---|
| `objeto` | combustível |
| `papel_na_cadeia` | distribuidor |
| `tipo_de_relacao` | venda |

Resultado: pode ser elegível a regras aplicáveis à comercialização/distribuição.

### Refinaria

| Dimensão | Valor |
|---|---|
| `objeto` | combustível |
| `papel_na_cadeia` | fabricante |
| `tipo_de_relacao` | produção |

Resultado: pode ser elegível a regras aplicáveis à produção.

## Consequências positivas

- Reduz ambiguidade estrutural.
- Evita explosão combinatória entre natureza, posição e objeto econômico.
- Resolve o núcleo dos BLOCKERS #1, #5 e #17.
- Melhora a qualidade do filtro M1 → M2.
- Reduz risco de aplicação indevida de categorias, como Imposto Seletivo.

## Consequências negativas

- Exige ajuste no formulário.
- Exige enums e listas controladas.
- Exige atualização dos cenários de teste.
- Exige contrato claro entre M1 e M2.

## Relação com BLOCKERS

| BLOCKER | Relação |
|---|---|
| #1 | Resolve a sobreposição entre natureza da operação e posição na cadeia |
| #5 | Elimina redundância entre `possui_bens` e outras fontes equivalentes |
| #17 | Separa operar, comercializar, transportar e intermediar |

## Relação com milestones

| Milestone | Impacto |
|---|---|
| M1 | Define o modelo do Perfil da Entidade |
| M2 | Fornece snapshot dimensional para filtro pré-RAG |
| M3 | Permite questionários condicionais mais precisos |
| M5 | Melhora geração de gaps |
| M6 | Reduz risco de categorias indevidas |
| M7 | Melhora plano de ação por perfil |
| M4 | Briefing passa a depender do Perfil confirmado |

## Não-escopo

Este ADR não define:

- versionamento e imutabilidade do Perfil da Entidade;
- migração de dados legados;
- fórmula de confiança do painel;
- implementação técnica;
- schema final de banco.

Esses temas serão tratados em ADRs ou specs próprios.

## Decisão do P.O.

O P.O. aprovou o modelo dimensional como base canônica do M1.

## Status

Aprovado para documentação pré-M1. Implementação continua bloqueada pela REGRA-M1-GO-NO-GO.
