# CONTRATO-DEC-M3-05-v3 — Q.Produtos / Q.Serviços
## IA SOLARIS · Interface Contract

**Versão:** v3
**Data:** 2026-04-07
**ADR de referência:** ADR-0010
**Sprint:** Z-02 (implementação)
**Status:** ATIVO

---

## 1. Escopo

Este contrato especifica as interfaces, invariantes e protocolo de violação
para as procedures Q.Produtos (NCM) e Q.Serviços (NBS) do Diagnóstico v3.

---

## 2. Interfaces

### 2.1 ProductAnswer

```typescript
interface ProductAnswer {
  questionId: string      // ID único da pergunta NCM
  answer: string          // Resposta do usuário
  fonte_ref: string       // Código NCM de referência (obrigatório)
  lei_ref: string         // Referência legal LC 214/2025 (obrigatório)
  projectId: string       // ID do projeto
}
```

### 2.2 ServiceAnswer

```typescript
interface ServiceAnswer {
  questionId: string      // ID único da pergunta NBS
  answer: string          // Resposta do usuário
  fonte_ref: string       // Código NBS de referência (obrigatório)
  lei_ref: string         // Referência legal LC 214/2025 (obrigatório)
  projectId: string       // ID do projeto
}
```

### 2.3 Procedures tRPC

| Procedure | Input | Output | Tabela |
|---|---|---|---|
| `getProductQuestions` | `{ projectId, cnaes }` | `ProductQuestion[]` | — |
| `completeProductQuestionnaire` | `{ projectId, answers: ProductAnswer[] }` | `{ ok: true }` | `product_answers` |
| `getServiceQuestions` | `{ projectId, cnaes }` | `ServiceQuestion[]` | — |
| `completeServiceQuestionnaire` | `{ projectId, answers: ServiceAnswer[] }` | `{ ok: true }` | `service_answers` |

---

## 3. Invariantes

**Garantia INV-P01:** `completeProductQuestionnaire` SEMPRE grava em `product_answers`,
NUNCA em `corporate_answers` ou `operational_answers`.

**Garantia INV-P02:** `completeServiceQuestionnaire` SEMPRE grava em `service_answers`,
NUNCA em `corporate_answers` ou `operational_answers`.

**Garantia INV-P03:** Estados legados `diagnostico_corporativo` e `diagnostico_operacional`
NUNCA são removidos do `flowStateMachine.ts` (ADR-0010 Seção 5).

**Garantia INV-P04:** `getNextStateAfterProductQ` usa valores de enum em português:
`'produto'` e `'servico'` — NUNCA `'product'` ou `'service'` (DIV-Z02-003).

**Garantia INV-P05:** Empresa de produto puro (sem CNAE de serviço) recebe
`NaoAplicavelBanner` no step Q.Serviços — NUNCA um formulário vazio ou erro.

---

## 4. Violações

### Protocolo de violação

Se qualquer invariante for violada:

1. **PARAR** a implementação imediatamente
2. **CRIAR** `docs/divergencias/DIV-Z02-XXX-descricao.md`
3. **REPORTAR** ao Orquestrador com o arquivo gerado
4. **AGUARDAR** decisão antes de continuar

### Histórico de violações

| ID | Invariante | Causa | Resolução |
|---|---|---|---|
| DIV-Z01-006 | INV-P01 (implícita) | product-questions.ts sem frontend | Gate FC implementado |
| DIV-Z02-003 | INV-P04 | Enum inglês vs português | Pendente Z-02 |

---

## 5. Rastreabilidade

- **ADR:** ADR-0010 (docs/adr/ADR-010-content-architecture-98.md)
- **Spec:** DEC-M3-05-v3-implementacao-etapas.md
- **Testes:** server/integration/fitness-functions.test.ts (FF-10..FF-15)
- **Gate:** scripts/gate-fc.sh · scripts/gate-adr.sh
