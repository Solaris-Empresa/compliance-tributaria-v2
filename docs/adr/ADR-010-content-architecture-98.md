# ADR-010 — Arquitetura Canônica de Conteúdo Diagnóstico para Confiabilidade 98%

**Status:** Aprovado com ajustes obrigatórios — gate B1 liberado para B2 após incorporação dos ajustes  
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

## Ajustes obrigatórios do Orquestrador (incorporados em 2026-03-24)

O Orquestrador aprovou o B1 com 3 ajustes obrigatórios que devem ser incorporados antes do início de B2. Os ajustes foram incorporados neste ADR e refletidos nas Matrizes Canônica e de Rastreabilidade.

### Ajuste 1 — Coverage Engine: fórmula corrigida

A fórmula original `coverage = gaps_classificados / requisitos_aplicáveis` foi considerada insuficiente porque contabilizava gaps classificados mesmo quando a pergunta era de baixa qualidade ou a evidência era insuficiente.

A fórmula corrigida é:

```
coverage =
  (requisitos com pergunta válida
   + resposta válida
   + gap classificado
   + evidência suficiente)
  /
  (requisitos aplicáveis)
```

Um requisito só conta como coberto quando **todos os 4 critérios** são satisfeitos simultaneamente:

| Critério | Definição |
|----------|-----------|
| Pergunta válida | `question.score >= threshold` (padrão: 3.5/5.0) |
| Resposta válida | `answer.answer_value` não nulo e não vazio |
| Gap classificado | `gap.gap_status` ∈ {atende, nao_atende, parcial, evidencia_insuficiente, nao_aplicavel} |
| Evidência suficiente | `gap.gap_status ≠ evidencia_insuficiente` OU `gap.evidence` não vazio com justificativa |

**Diretriz do Orquestrador:** *"Cobertura sem qualidade não é cobertura. 100% coverage só é válido quando a avaliação é confiável."*

### Ajuste 2 — Question Quality Gate: requisito permanece pendente

O comportamento original descartava perguntas com `score < threshold` sem mecanismo de recuperação, deixando o requisito associado sem cobertura silenciosamente.

O comportamento corrigido é:

1. Pergunta com `score < threshold` → descartada (não incluída no questionário)
2. O requisito associado permanece com status `pending_valid_question`
3. O sistema tenta reformular a pergunta com prompt alternativo (até 2 tentativas)
4. Se após 2 tentativas nenhuma pergunta válida for gerada → requisito marcado como `no_valid_question_generated`, registrado no coverage report como lacuna
5. O coverage report alerta o usuário sobre os requisitos sem pergunta válida antes de prosseguir

**Implicação:** o coverage gate bloqueia o briefing não apenas quando há requisitos sem resposta, mas também quando há requisitos sem pergunta válida gerada.

### Ajuste 3 — evaluation_confidence no Gap (obrigatório)

Adicionar o campo `evaluation_confidence` ao schema do Gap para registrar a confiança da classificação de conformidade, não apenas a confiança da pergunta:

```typescript
interface Gap {
  // ... campos existentes ...
  evaluation_confidence: "high" | "medium" | "low";
  evaluation_confidence_reason?: string; // obrigatório quando "low"
}
```

Regras de derivação do `evaluation_confidence`:

| Condição | evaluation_confidence |
|----------|-----------------------|
| `classification_method === "deterministic"` + `evidence` não vazio | `"high"` |
| `classification_method === "llm_assisted"` + `evidence` não vazio | `"medium"` |
| `gap_status === "evidencia_insuficiente"` | `"low"` (sempre) |
| `evidence` vazio ou muito curto (< 20 chars) | `"low"` |

O campo `evaluation_confidence` é usado pelo Coverage Engine para calcular o coverage ponderado por confiança e pelo Risk Engine para ajustar o `ia_adjustment` dos riscos derivados de gaps de baixa confiança.

### Recomendação não bloqueadora — Contextual Risk Layer (caminho para 98%)

O Orquestrador identificou o último gap real do modelo: **riscos sistêmicos que não nascem de um único requisito isolado, mas da combinação de fatores do perfil da empresa**.

Exemplo: empresa com 5 CNAEs + 4 UFs + ERP legado + operação interestadual. Mesmo com 100% de coverage nos requisitos individuais, existe um risco sistêmico de implementação que não nasce de nenhum requisito isolado.

A solução é adicionar o campo `origin` ao schema do Risk:

```typescript
interface Risk {
  // ... campos existentes ...
  origin: "gap" | "contextual" | "gap+context";
  // Regras:
  // "gap"        → obrigatório (deriva de gap_id)
  // "contextual" → permitido (deriva de combinação de fatores do perfil)
  // "gap+context" → permitido (gap amplificado por contexto)
  // sem origem   → proibido (bloqueador)
}
```

**Impacto:** cobre o "não óbvio" — riscos que só aparecem quando o sistema analisa o perfil completo da empresa, não apenas os requisitos isolados. Isso leva o sistema de 95% para 98%.

**Status:** recomendado (não bloqueador para B2/B3). Deve ser implementado no bloco B4 (Risk Engine).

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
