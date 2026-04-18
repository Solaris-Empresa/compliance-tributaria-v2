# G15 — Diagnóstico: Arquitetura 3 Ondas de Perguntas

**Issue:** #141 · **Sprint:** K · **Prioridade:** P2
**Data diagnóstico:** 2026-03-27
**Status:** Diagnóstico concluído — aguarda sessão de planejamento com o Orquestrador

---

## 1. Estado atual (AS-IS)

### QuestionSchema (ai-schemas.ts, linha 126)

```typescript
export const QuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  objetivo_diagnostico: z.string().optional().default(""),
  impacto_reforma: z.string().optional().default(""),
  type: z.enum([...]).optional().catch("sim_nao").default("sim_nao"),
  peso_risco: z.preprocess(...).optional().default("medio"),
  required: z.boolean().optional().default(true),
  options: z.union([...]).optional(),
  scale_labels: z.object({...}).optional(),
  placeholder: z.string().optional(),
});
```

**Campos ausentes:** `fonte`, `requirement_id`, `source_reference` — não existem no schema atual.

### generateQuestions (routers-fluxo-v3.ts, linha 505)

- Recebe: `projectId`, `cnaeCode`, `level`, `roundIndex`
- Busca contexto RAG (artigos relevantes) via `ragCtx`
- Chama LLM com contexto RAG + CNAE
- **Problema:** o LLM recebe artigos do RAG mas não é instruído a classificar a origem da pergunta (`regulatorio` vs `solaris` vs `ia_gen`)
- **Resultado:** todas as perguntas geradas são tratadas como `ia_gen` implicitamente — sem rastreabilidade

### INV-005 (sem cobertura)

A invariante `pergunta_sem_fonte → inválida` não tem teste automatizado. Não há validação no schema nem no router que rejeite perguntas sem `fonte`.

---

## 2. Diagnóstico de impacto

| Componente | Impacto da mudança | Risco |
|---|---|---|
| `QuestionSchema` | Adicionar 3 campos opcionais | Baixo — additive |
| `QuestionsResponseSchema` | Nenhum — herda do schema | Zero |
| `generateQuestions` prompt | Adicionar instrução de classificação | Médio — afeta output do LLM |
| Testes existentes | Mocks sem `fonte` precisam ser atualizados | Médio |
| Frontend | Exibir `fonte` como badge na pergunta | Baixo — UI apenas |

---

## 3. Plano faseado TO-BE

### Fase A — Schema aditivo (Sprint K · P2 · Risco baixo)

Adicionar campos opcionais ao `QuestionSchema` sem quebrar o fluxo atual:

```typescript
export const QuestionSchema = z.object({
  // ... campos existentes ...
  fonte: z.enum(["regulatorio", "solaris", "ia_gen"]).optional().default("ia_gen"),
  requirement_id: z.string().optional(), // obrigatório se fonte="regulatorio"
  source_reference: z.string().optional(), // artigo específico ex: "Art. 9 LC 214/2025"
});
```

**Critério de aceite:** tsc zero erros · testes existentes passando · `fonte` presente com default `ia_gen`.

### Fase B — Alimentar 1ª onda (Sprint K · P2 · Risco médio)

Instruir o LLM a classificar perguntas originadas de artigos RAG como `regulatorio` e preencher `source_reference`:

```
REGRA: Para cada pergunta gerada a partir de um artigo específico do corpus RAG,
classifique como fonte="regulatorio" e preencha source_reference com o artigo
(ex: "Art. 9 LC 214/2025"). Para perguntas de orientação SOLARIS, use fonte="solaris".
Para inferências contextuais, use fonte="ia_gen".
```

**Critério de aceite:** ≥ 30% das perguntas geradas com `fonte="regulatorio"` em testes com corpus real.

### Fase C — Separar 3 ondas (Sprint L · P3 · Risco alto)

Refatorar `generateQuestions` para executar 3 chamadas LLM separadas:
1. Onda 1: perguntas regulatórias (baseadas em artigos RAG obrigatórios)
2. Onda 2: perguntas SOLARIS (orientações jurídicas proprietárias)
3. Onda 3: perguntas contextuais (inferência LLM)

**Dependência:** Fase A + Fase B concluídas e validadas em UAT.

---

## 4. Recomendação ao Orquestrador

**Executar Fase A imediatamente** — risco zero, additive, não quebra nenhum teste.

**Fase B** requer aprovação do Orquestrador antes de alterar o prompt do `generateQuestions` — impacta diretamente o output do LLM em produção.

**Fase C** é Sprint L — não bloqueia o UAT atual.

---

## 5. INV-005 — Cobertura automatizada

Teste a criar na Fase A:

```typescript
it("INV-005: pergunta com fonte regulatorio deve ter source_reference", () => {
  const result = QuestionSchema.safeParse({
    id: "q1", text: "Você apura IBS mensalmente?",
    fonte: "regulatorio",
    // source_reference ausente — deve ser detectado
  });
  // Fase A: passa (source_reference é optional)
  // Fase B: falha se source_reference ausente quando fonte="regulatorio"
});
```

---

**Aguarda sessão de planejamento com o Orquestrador para aprovação das Fases A, B e C.**
