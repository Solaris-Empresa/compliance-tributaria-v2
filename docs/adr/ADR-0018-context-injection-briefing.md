# ADR-0018 — Context Injection: Fontes Ausentes no Briefing

**Status:** Aceito  
**Data:** 2026-04-08  
**Issue:** BUG-BRIEFING-01  
**Branch:** fix/briefing-inject-user-answers  
**Arquivo modificado:** `server/routers-fluxo-v3.ts` — função `generateBriefingFromDiagnostic`

---

## Contexto

O briefing gerado pela IA não incorporava três fontes de dados preenchidas pelo usuário:

1. **`projects.cnaeAnswers`** — respostas do QCNAE especializado (seções IS, alíquota zero, ST, regime especial, prioridade setorial — QCNAE-01..QCNAE-05)
2. **`solaris_answers`** — respostas da Onda 1 (Questionário SOLARIS — SOL-001..SOL-NNN)
3. **`iagen_answers`** — respostas da Onda 2 (IA Generativa — 8 perguntas dinâmicas)

A causa raiz foi confirmada na Fase 1 do diagnóstico (2026-04-08): `generateBriefingFromDiagnostic` usava `db.countOnda1Answers()` apenas como gate de validação, mas nunca buscava o conteúdo das respostas. A coluna `projects.cnaeAnswers` estava disponível em `p.cnaeAnswers` mas não era convertida para o payload do LLM.

**Evidência do bug:** Projeto T20 (#3480146) — usuário declarou IS (bebidas açucaradas) e alíquota zero (arroz) no QCNAE, mas o briefing gerado não mencionou nenhum dos dois.

---

## Decisão

Injetar as três fontes ausentes como bloco `DADOS ADICIONAIS DO CLIENTE` no userPrompt, usando tags XML para delimitação semântica:

```
<qcnae_especializado>   ← projects.cnaeAnswers (JSON serializado)
<respostas_solaris>     ← solaris_answers.codigo: solaris_answers.resposta
<respostas_iagen>       ← iagen_answers.questionText: iagen_answers.resposta
```

Adicionalmente, incluir regra obrigatória no systemPrompt (`REGRA OBRIGATÓRIA — QCNAE ESPECIALIZADO`) para instruir o LLM a priorizar dados do cliente sobre inferências genéricas do RAG.

---

## Implementação

**Passos 1–3** — `server/routers-fluxo-v3.ts` (após linha `const aggregatedDiagnosticAnswers`):

```typescript
// ADR-0018: Camadas 6+7+8 — Fontes ausentes
const specializedCnaeAnswers = p.cnaeAnswers
  ? (typeof p.cnaeAnswers === 'string'
      ? (() => { try { return JSON.parse(p.cnaeAnswers); } catch { return null; } })()
      : p.cnaeAnswers)
  : null;

const solarisAnswersForBriefing = await db.getOnda1Answers(input.projectId);
const iagenAnswersForBriefing = await db.getOnda2Answers(input.projectId);

const additionalContext: string[] = [];
if (specializedCnaeAnswers) {
  additionalContext.push('<qcnae_especializado>');
  additionalContext.push(JSON.stringify(specializedCnaeAnswers, null, 2));
  additionalContext.push('</qcnae_especializado>');
}
if (solarisAnswersForBriefing.length > 0) {
  additionalContext.push('<respostas_solaris>');
  solarisAnswersForBriefing.filter((a) => a.resposta).forEach((a) => {
    additionalContext.push(`${a.codigo}: ${a.resposta}`);
  });
  additionalContext.push('</respostas_solaris>');
}
if (iagenAnswersForBriefing.length > 0) {
  additionalContext.push('<respostas_iagen>');
  iagenAnswersForBriefing.forEach((a) => {
    additionalContext.push(`${a.questionText}: ${a.resposta}`);
  });
  additionalContext.push('</respostas_iagen>');
}
const additionalContextText = additionalContext.length > 0
  ? `DADOS ADICIONAIS DO CLIENTE:\n${additionalContext.join('\n')}\n\n`
  : '';
```

**Passo 4** — systemPrompt (após regra BUG-MANUAL-03):

```
REGRA OBRIGATÓRIA — QCNAE ESPECIALIZADO (ADR-0018):
- Se os dados do cliente (tag <qcnae_especializado>) confirmam sujeição ao IS → citar IS e Art. 2 LC 214/2025 nos gaps.
- Se os dados do cliente confirmam alíquota zero → citar Art. 14 LC 214/2025 nas oportunidades.
- Priorizar dados do cliente sobre inferências genéricas do RAG.
```

**Passo 3 (userPrompt)** — injetar `additionalContextText` antes de `DIAGNÓSTICO CONSOLIDADO`.

---

## Consequências

### Positivas
- O LLM passa a receber todas as respostas do usuário (5 camadas + 3 fontes adicionais)
- IS, alíquota zero e regimes especiais declarados pelo usuário aparecem no briefing
- Respostas SOLARIS e IA Gen (contexto qualitativo) enriquecem o diagnóstico
- Regra no systemPrompt garante priorização dos dados do cliente sobre o RAG

### Neutras
- Latência: +50–150ms por chamada (2 queries adicionais ao banco)
- Tamanho do prompt: +200–2000 tokens dependendo do volume de respostas
- Sem alteração de schema — apenas leitura de dados existentes

### Riscos Mitigados
- `specializedCnaeAnswers`: parse defensivo com try/catch — falha silenciosa se JSON inválido
- `solarisAnswersForBriefing`: retorna `[]` se banco indisponível (padrão `db.getOnda1Answers`)
- `iagenAnswersForBriefing`: retorna `[]` se banco indisponível (padrão `db.getOnda2Answers`)
- `additionalContextText`: string vazia se todas as fontes estiverem vazias — sem impacto no prompt

---

## Alternativas Rejeitadas

- **Adicionar como DiagnosticLayer**: rejeitado — `consolidateDiagnosticLayers` espera formato estruturado `{cnaeCode, cnaeDescription, level, questions[]}`. As fontes A/B/C têm formatos heterogêneos; conversão seria frágil.
- **Novo campo no schema**: rejeitado — sem necessidade de migração; dados já existem nas tabelas corretas.
- **Injetar via RAG**: rejeitado — RAG é para legislação, não para respostas do usuário.

---

## Referências

- ADR-0011: Consolidação de Respostas no Pipeline
- ADR-0012: Art. 57 vs Art. 2 IS — Mapeamento Canônico
- ADR-0016: Completude e Confiança dos Questionários
- BUG-MANUAL-03: Regra IS/Art. 57 no systemPrompt
- Fase 1 Diagnóstico: `/home/ubuntu/relatorio_fase1_briefing_context_injection.md`
