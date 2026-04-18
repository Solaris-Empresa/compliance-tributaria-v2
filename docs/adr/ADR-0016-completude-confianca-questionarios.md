# ADR-0016 — Modelo de Completude e Confiança dos Questionários
## IA SOLARIS · Architecture Decision Record

**Status:** Aceito
**Data:** 2026-04-07
**Autores:** Uires Tapajós (P.O.) · Orquestrador Claude
**Sprint:** Z-03 · Branch: feat/completude-confianca-questionarios
**Relacionado a:** DEC-M3-05 · ADR-0010 · ADR-0009

---

## 1. Contexto

O produto atual marca todas as perguntas dos questionários SOLARIS e IA Gen
como "Obrigatória", impedindo o usuário de avançar sem responder todas.
Isso causa dois problemas:

1. Advogados que não têm todas as informações disponíveis ficam bloqueados
2. O sistema trata diagnósticos com 1 resposta igual a diagnósticos com 24

O P.O. (Uires Tapajós) identificou durante o E2E manual em 2026-04-07 que:
  - SOLARIS exibe "Obrigatória" em cada pergunta — sem opção de pular
  - IA Gen exibe "Obrigatória" em cada pergunta — sem opção de pular
  - O conceito de "completude parcial com confiança reduzida" não existe

**Diagnóstico Fase 1 (2026-04-07):**
  - `server/lib/completeness.ts` já existe — mede fontes de dados disponíveis
    (status: insuficiente|parcial|adequado|completo) — NÃO tocar
  - Nenhum campo de skip/pulado em `solaris_answers` ou `iagen_answers`
  - `QuestionarioV3.tsx` tem lógica de skip para CNAE (nível 2) — padrão reutilizável
  - Label "Obrigatória" é apenas visual — sem bloqueio de submit

## 2. Decisão

**Nenhuma pergunta de nenhum questionário é obrigatória.**
O usuário pode pular perguntas individuais e pode pular questionários inteiros.
A consequência do não-preenchimento é representada pelo score de confiança,
não por um bloqueio de interface.

### Separação de responsabilidades (aprovada pelo Orquestrador 2026-04-07)

| Arquivo | Status | Mede |
|---|---|---|
| `server/lib/completeness.ts` | **Existente — NÃO tocar** | Fontes de dados disponíveis para o briefing |
| `server/lib/questionnaire-completeness.ts` | **Novo (este ADR)** | % de perguntas respondidas pelo usuário |

### Modelo de 3 estados por questionário

| Estado | Threshold | Badge | Impacto no diagnóstico |
|---|---|---|---|
| Completo | ≥ 80% respondidas | 🟢 Verde | Confiança alta |
| Parcial | 30–79% respondidas | 🟡 Amarelo | Confiança média — aviso no briefing |
| Incompleto | < 30% respondidas | 🔴 Vermelho | Confiança baixa — aviso forte |
| Pulado | 0% (questionário inteiro) | ⚫ Cinza | Sem contribuição — aviso explícito |

### Mínimos por questionário (confiança alta)

| Questionário | Total | Mínimo alta confiança |
|---|---|---|
| SOLARIS (Onda 1) | 24 | 20 respondidas (83%) |
| IA Gen (Onda 2) | 7 | 6 respondidas (86%) |
| Q.Produtos (NCM) | variável | 80% |
| Q.Serviços (NBS) | variável | 80% |

### Schema: array de IDs pulados no JSON do projeto (Decisão 2 — Orquestrador)

```typescript
// drizzle/schema.ts — ADD COLUMN em projects (Online DDL, não-destrutivo)
solarisSkippedIds:  text('solaris_skipped_ids'),   // JSON: string[]
iagenSkippedIds:    text('iagen_skipped_ids'),      // JSON: string[]
solarisSkippedAll:  boolean('solaris_skipped_all').default(false),
iagenSkippedAll:    boolean('iagen_skipped_all').default(false),
```

**Justificativa:** não altera `solaris_answers` (tabela com dados reais),
consistente com `productAnswers`/`serviceAnswers` (JSON na tabela projects),
reversível (DROP COLUMN não quebra respostas existentes).

## 3. Alternativas rejeitadas

**A — Manter obrigatoriedade:** rejeitada porque bloqueia o advogado que
não tem todas as informações e mascara a qualidade do diagnóstico.

**B — Remover aviso de confiança:** rejeitada porque o advogado precisa
saber que o diagnóstico é incompleto para não assinar um parecer baseado
em dados insuficientes. Transparência é requisito jurídico.

**C — Campo `skipped` em `solaris_answers`:** rejeitada porque altera tabela
com potencial de dados reais + muda o insert de respostas existente.

## 4. Consequências

**Positivas:**
- Advogado pode avançar com o que tem e completar depois
- Diagnóstico transparente sobre sua própria confiança
- Gate B viabilizado: advogado real não será bloqueado

**Negativas / Trade-offs:**
- Diagnósticos de baixa confiança podem gerar falsos negativos de gaps
- Precisa de UX clara para não parecer que "qualquer coisa é suficiente"

## 5. Validação

Este ADR é considerado implementado quando:
  ✅ Botão "Pular pergunta" visível em cada questão (SOLARIS + IA Gen)
  ✅ Botão "Pular questionário" no topo de cada questionário
  ✅ Badge de confiança no DiagnosticoStepper por questionário
  ✅ Briefing exibe aviso de confiança quando estado ≠ Completo
  ✅ E2E manual: advogado consegue avançar sem responder nenhuma pergunta
  ✅ 25/25 testes CC-01..CC-25 PASS
  ✅ Gate FC PASS · Gate ADR PASS · Gate E2E PASS
  ✅ TypeScript 0 erros
