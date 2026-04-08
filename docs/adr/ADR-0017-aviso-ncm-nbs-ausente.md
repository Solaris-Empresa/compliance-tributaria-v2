# ADR-0017 — Aviso de Diagnóstico Genérico quando NCM/NBS Ausente

**Status:** Aceito  
**Data:** 2026-04-08  
**Autores:** Orquestrador Claude / Implementador Manus  
**Aprovação P.O.:** Uires Tapajós  
**Branch de origem:** `fix/bug-legacy-02-guarda-qo-ncm-warning`

---

## Contexto

O Q.Produtos (`/questionario-produto`) gera perguntas diagnósticas com base nos códigos NCM
cadastrados no `operationProfile.principaisProdutos[].ncm_code`. Quando nenhum NCM está
cadastrado, a função `generateProductQuestions` retorna um fallback genérico de 2 perguntas
(`buildProductFallback`) — sem especificidade jurídica para alíquota zero, Imposto Seletivo
ou regime diferenciado por produto (LC 214/2025).

O mesmo padrão se aplica ao Q.Serviços (`/questionario-servico`) com NBS
(`operationProfile.principaisServicos[].nbs_code`).

O advogado que conduz o diagnóstico pode não perceber que está respondendo perguntas
genéricas, resultando em um briefing de menor qualidade sem aviso explícito.

---

## Problema

Sem aviso, o fluxo parece idêntico com ou sem NCM/NBS cadastrados. O advogado não tem
informação para decidir se deve adicionar os códigos antes de prosseguir.

---

## Decisão

Exibir um **aviso informativo não bloqueante** quando:

1. Q.Produtos é aberto e o projeto não possui NCMs em `operationProfile.principaisProdutos`
2. Q.Serviços é aberto e o projeto não possui NBS em `operationProfile.principaisServicos`

O aviso:
- É exibido acima do rodapé de navegação (antes do botão "Finalizar questionário")
- Usa `data-testid="aviso-sem-ncm"` e `data-testid="aviso-sem-nbs"` para testes E2E
- **Não bloqueia** o botão "Finalizar questionário" — o advogado decide se quer continuar
- Informa claramente que o diagnóstico será genérico e sugere adicionar os códigos

**Princípio herdado do ADR-0016:** transparência informativa em vez de bloqueio.

---

## Implementação

### QuestionarioProduto.tsx

```typescript
const hasNcm = (projectData?.operationProfile?.principaisProdutos ?? [])
  .some((p: any) => p.ncm_code);

{!hasNcm && (
  <div data-testid="aviso-sem-ncm" className="...amber...">
    <AlertTriangle />
    <p>Diagnóstico genérico — nenhum NCM cadastrado...</p>
  </div>
)}
```

### QuestionarioServico.tsx

```typescript
const hasNbs = (projectData?.operationProfile?.principaisServicos ?? [])
  .some((s: any) => s.nbs_code);

{!hasNbs && (
  <div data-testid="aviso-sem-nbs" className="...amber...">
    <AlertTriangle />
    <p>Diagnóstico genérico — nenhum NBS cadastrado...</p>
  </div>
)}
```

---

## Fix relacionado (BUG-LEGACY-02)

Este ADR foi criado junto com a remoção da guarda legada em `QuestionarioCNAE.tsx`
que bloqueava o acesso ao Q.CNAE exigindo `diagnosticStatus.operational === "completed"`.

No fluxo TO-BE (ADR-0010), Q.Produto avança direto para Q.CNAE (comercio/produto) ou
Q.Serviço (misto/industria) — sem passar por Q.Operacional. A guarda era um resquício
do fluxo AS-IS e foi removida.

---

## Consequências

**Positivas:**
- Advogado ciente da qualidade do diagnóstico antes de prosseguir
- Não bloqueia o fluxo (não é obrigatório adicionar NCM/NBS)
- Incentiva preenchimento de NCM/NBS no perfil do projeto
- Consistente com o princípio de transparência do ADR-0016

**Negativas:**
- O aviso pode ser ignorado pelo usuário
- Requer uma query adicional (`getProjectStep1`) em Q.Produtos e Q.Serviços

---

## data-testid obrigatórios

| Elemento | data-testid |
|---|---|
| Aviso sem NCM (Q.Produtos) | `aviso-sem-ncm` |
| Aviso sem NBS (Q.Serviços) | `aviso-sem-nbs` |

---

## Referências

- ADR-0016 — Modelo de Completude e Confiança dos Questionários
- ADR-0010 — Fluxo TO-BE (flowStateMachine)
- `server/lib/product-questions.ts` — `buildProductFallback()`
- `server/lib/service-questions.ts` — fallback NBS
