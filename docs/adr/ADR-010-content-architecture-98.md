# ADR-010 — Arquitetura Canônica de Conteúdo Diagnóstico para Confiabilidade 98%

**Status:** Proposto — aguardando aprovação do Orquestrador (gate B1)  
**Data:** 2026-03-23  
**Autores:** Manus AI / Equipe IA SOLARIS  
**Issue:** [#63](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/63)  
**Milestone:** [Sprint-98-Confidence-Content-Engine](https://github.com/Solaris-Empresa/compliance-tributaria-v2/milestone/7)

---

## Contexto

A plataforma IA SOLARIS atingiu estabilidade técnica completa na Sprint v5.3.0: fluxo de 5 etapas, persistência, concorrência (107/107 testes), Shadow Mode com 274 divergências esperadas e 0 críticas, e TypeScript sem erros. No entanto, a avaliação qualitativa dos outputs revelou que a qualidade semântica e regulatória dos questionários, briefing, matriz de riscos e plano de ação está abaixo de 30% do esperado.

A análise de causa raiz identificou 5 vetores de falha estruturais:

**Vetor 1 — Ausência de contrato de entrada por etapa.** Cada etapa do fluxo recebe inputs não padronizados, sem definição formal do que entra, como é processado e o que sai. Isso gera inconsistências entre etapas e impossibilita a rastreabilidade.

**Vetor 2 — Ausência de requirement-to-question mapping.** As perguntas geradas não têm vínculo formal com os requisitos normativos aplicáveis (LC 214, LC 224, LC 227, EC 132). O LLM gera perguntas genéricas sem ancoragem no corpus RAG, produzindo questionários que não cobrem os requisitos legais relevantes para o perfil da empresa.

**Vetor 3 — Ausência de coverage control.** Não há mecanismo que garanta que 100% dos requisitos aplicáveis foram perguntados, respondidos e avaliados. O briefing pode ser gerado com lacunas regulatórias significativas sem nenhum alerta.

**Vetor 4 — Ausência de gap formal e cadeia de rastreabilidade.** As respostas dos usuários não são transformadas em estados formais de conformidade (atende/não_atende/parcial/evidência_insuficiente/não_aplicável). Sem gap formal, não há base para gerar riscos e ações rastreáveis.

**Vetor 5 — Risk scoring e action planning sem estrutura.** Os riscos são gerados com texto livre sem taxonomia hierárquica, sem scoring determinístico e sem vínculo obrigatório com o gap de origem. As ações são genéricas, sem template por domínio e sem prazo determinístico.

---

## Decisão

Adotar uma **arquitetura de conteúdo baseada em 6 engines obrigatórias e sequenciais**, onde cada engine tem contrato formal de entrada e saída, e a cadeia de rastreabilidade `Requisito → Gap → Risco → Ação` é inviolável.

### Arquitetura das 6 engines

```
Perfil + CNAE
    │
    ▼
[Requirement Engine]  ← RAG filtrado por CNAE, porte, regime, UF
    │ requirements[]  (id, source, applicable, layer, cnae_scope)
    ▼
[Question Engine]     ← requirement-to-question mapping + deduplicação + LLM-as-judge
    │ questions[]     (id, requirement_id, source_reference, confidence, score)
    ▼
[Respostas do usuário]
    │
    ▼
[Gap Engine]          ← classificação formal determinística
    │ gaps[]          (id, question_id, requirement_id, gap_status, confidence)
    ├──────────────────────────────────────────────────────┐
    ▼                                                      ▼
[Coverage Engine]     ← gate de completude 100%    [Consistency Engine] ← contradições cross-stage
    │ coverage_report                                      │ conflicts[]
    │ (gate: bloqueia briefing se < 100%)                 │ (gate: bloqueia briefing se severity=high)
    └──────────────────────────────────────────────────────┘
                                │
                                ▼
                        [Risk Engine]         ← taxonomia 3 níveis + scoring híbrido
                                │ risks[]     (id, gap_id, requirement_id, taxonomy, score, impact)
                                ▼
                        [Action Engine]       ← templates por domínio + prazo determinístico
                                │ actions[]   (id, risk_id, gap_id, requirement_id, template_id, deadline)
                                ▼
                            [Outputs]
                            ├── Briefing (template 8 seções + grounding normativo)
                            ├── Matriz de Riscos (taxonomia 3 níveis + clustering)
                            └── Plano de Ação (templates + prioridade determinística)
```

### 5 Regras fundamentais (invioláveis)

**Regra 1 — Fonte obrigatória:** toda pergunta gerada deve ter `source_type`, `source_reference`, `requirement_id` e `confidence`. Perguntas sem fonte são bloqueadas pelo protocolo `NO_QUESTION`.

**Regra 2 — Coverage total:** nenhum requisito aplicável pode ficar sem pergunta, resposta e avaliação de gap. `coverage < 100%` bloqueia a geração do briefing.

**Regra 3 — Cadeia obrigatória:** a cadeia `Requisito → Gap → Risco → Ação` é inviolável. Risco sem `gap_id` não existe. Ação sem `risk_id` não existe.

**Regra 4 — Anti-alucinação:** o LLM não cria conhecimento novo. Ele apenas transforma conhecimento validado via RAG. Toda afirmação deve ter base normativa verificável no corpus.

**Regra 5 — CNAE condicionado:** CNAE sem requisito aplicável no corpus RAG não gera questionário. O sistema registra o CNAE como `skipped` com motivo `no_applicable_requirements`.

---

## Alternativas consideradas

**Alternativa A — Melhorar os prompts existentes sem reestruturar a arquitetura.** Descartada porque o problema não é de qualidade de prompt, mas de ausência de estrutura de dados formal entre as etapas. Prompts melhores sobre uma arquitetura sem contrato formal produzirão outputs melhores, mas não rastreáveis e não auditáveis.

**Alternativa B — Usar um único prompt "mega" que gera tudo de uma vez (briefing + matriz + plano).** Descartada porque viola a Regra 4 (anti-alucinação) e impossibilita a rastreabilidade. Um único prompt não pode garantir que 100% dos requisitos aplicáveis foram avaliados.

**Alternativa C — Implementar apenas o Gap Engine e o Risk Engine, mantendo o resto.** Descartada porque sem o Requirement Engine e o Coverage Engine, o Gap Engine não tem base formal de requisitos para classificar. A arquitetura é sistêmica — cada engine depende da anterior.

---

## Consequências

**Positivas:**
- Rastreabilidade completa de cada output até o requisito normativo de origem
- Coverage regulatório verificável e auditável
- Eliminação de alucinações por grounding obrigatório no RAG
- Matriz de riscos defensável em auditoria fiscal
- Plano de ação executável com prazo e responsável definidos

**Negativas / trade-offs:**
- Aumento de latência por múltiplas chamadas ao LLM (estimado: +8-15s por projeto)
- Necessidade de corpus RAG atualizado e bem indexado para cada legislação
- Complexidade de implementação maior (6 engines vs. 1 prompt)

**Mitigações:**
- Cache de requisitos por perfil de empresa (CNAE + porte + regime) para reduzir latência
- Pipeline assíncrono com streaming de resultados parciais para o frontend
- Corpus RAG versionado com data de última atualização visível no briefing

---

## Critérios de sucesso

A implementação desta arquitetura será considerada bem-sucedida quando:

| Critério | Meta | Medição |
|----------|------|---------|
| Confidence Score semântico | ≥ 98% | Dashboard `/admin/confidence-score` |
| Coverage regulatório | 100% | Coverage Engine + Shadow Monitor |
| Perguntas com fonte normativa | 100% | Log do Question Engine |
| Riscos com gap de origem | 100% | Validação do Risk Engine |
| Ações com template | ≥ 95% | Log do Action Engine |
| Aprovação UAT advogados | ≥ 80% | Formulário de feedback UAT |

---

## Referências

- [Tabela de Melhorias Técnicas HOW v1](../product/cpie-v2/produto/TABELA-MELHORIAS-TECNICAS-HOW-v1.md)
- [Requisitos Funcionais v6.0](../product/cpie-v2/produto/REQUISITOS-FUNCIONAIS-v6.md)
- [ADR-005 — Diagnóstico Dual V1/V3](ADR-005-diagnostico-dual-v1-v3.md)
- [ADR-007 — Gate de Retrocesso](ADR-007-gate-retrocesso.md)
- [ADR-008 — Estratégia de Migração Schema](ADR-008-migracao-schema.md)
- [Issue #63 — ADR-010](https://github.com/Solaris-Empresa/compliance-tributaria-v2/issues/63)
- [Milestone Sprint-98-Confidence](https://github.com/Solaris-Empresa/compliance-tributaria-v2/milestone/7)
