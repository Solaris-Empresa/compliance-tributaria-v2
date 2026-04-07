# CONTRATO-DEC-M3-05-v3-interface — Q.Produtos (NCM) + Q.Serviços (NBS)
## IA SOLARIS · Interface Contract — Versão Completa

**Versão:** v3-interface  
**Data:** 2026-04-07  
**ADR de referência:** ADR-0010  
**Sprint:** Z-02 (implementação)  
**Status:** ATIVO  
**Autores:** Uires Tapajós (P.O.) · Orquestrador Claude  

---

## Parte 1 — Tipos de dados

### 1.1 ProductAnswer

```typescript
interface ProductAnswer {
  questionId:  string           // ID único da pergunta NCM (ex: 'NCM-1006-001')
  resposta:    string           // Resposta do usuário
  fonte:       string           // 'rag' | 'solaris' | 'generic'
  fonte_ref:   string           // OBRIGATÓRIO — anchor_id RAG ou código SOL-XXX
  lei_ref:     string           // OBRIGATÓRIO — ex: 'Art. 14 LC 214/2025'
  ncm?:        string           // Código NCM relacionado (ex: '1006.40.00')
  confidence?: number           // 0.0 a 1.0
}
```

**Invariante:** `fonte_ref` e `lei_ref` NUNCA podem ser vazios ou `undefined`.
Qualquer `ProductAnswer` com `fonte_ref === ''` ou `lei_ref === ''` constitui
violação de contrato (ver Parte 6).

### 1.2 ServiceAnswer

```typescript
interface ServiceAnswer {
  questionId:  string           // ID único da pergunta NBS (ex: 'NBS-1.03-001')
  resposta:    string           // Resposta do usuário
  fonte:       string           // 'rag' | 'solaris' | 'generic'
  fonte_ref:   string           // OBRIGATÓRIO — anchor_id RAG ou código SOL-XXX
  lei_ref:     string           // OBRIGATÓRIO — ex: 'Art. 29 LC 214/2025'
  nbs?:        string           // Código NBS relacionado (ex: '1.03.07')
  confidence?: number           // 0.0 a 1.0
}
```

**Invariante:** `fonte_ref` e `lei_ref` NUNCA podem ser vazios ou `undefined`.

### 1.3 GetProductQuestionsResult — tipo discriminado

```typescript
type GetProductQuestionsResult =
  | { nao_aplicavel: true;  perguntas: [] }
  | { nao_aplicavel: false; perguntas: TrackedQuestion[] }
```

**Invariante:** Quando `nao_aplicavel === true`, `perguntas` DEVE ser array vazio.
Quando `nao_aplicavel === false`, `perguntas` DEVE ter pelo menos 1 elemento.

### 1.4 GetServiceQuestionsResult — tipo discriminado

```typescript
type GetServiceQuestionsResult =
  | { nao_aplicavel: true;  perguntas: [] }
  | { nao_aplicavel: false; perguntas: TrackedQuestion[] }
```

---

## Parte 2 — Contratos de procedure

### 2.1 getProductQuestions

```
Input:  { projectId: number }
Output: GetProductQuestionsResult

Efeitos colaterais GARANTIDOS:    nenhum (é query, não mutation)
Efeitos colaterais NÃO produzidos: NÃO grava nada no banco

Comportamento por operationType:
  'servico' | 'servicos' → { nao_aplicavel: true, perguntas: [] }
  qualquer outro         → { nao_aplicavel: false, perguntas: [...] }
```

**ATENÇÃO DIV-Z02-001:** A assinatura real do engine é:
```typescript
generateProductQuestions(
  ncmCodes:       string[],
  cnaeCodes:      string[],
  companyProfile: { operationType?: string },
  queryRagFn?,
  querySolarisFn?
)
```
Não usar a assinatura do DEC-M3-05 (objeto como primeiro parâmetro — erro tipográfico).

**ATENÇÃO DIV-Z02-002:** Usar `(project as any).cnaes` (não `project.confirmedCnaes`).

### 2.2 getServiceQuestions

```
Input:  { projectId: number }
Output: GetServiceQuestionsResult

Efeitos colaterais GARANTIDOS:    nenhum (é query, não mutation)
Efeitos colaterais NÃO produzidos: NÃO grava nada no banco

Comportamento por operationType:
  'produto' | 'comercio' → { nao_aplicavel: true, perguntas: [] }
  qualquer outro         → { nao_aplicavel: false, perguntas: [...] }
```

### 2.3 completeProductQuestionnaire

```
Input:  { projectId: number, productAnswers: ProductAnswer[], operationType: string }
Output: { success: true, nextState: string, respostasGravadas: number }

Efeitos colaterais GARANTIDOS:
  1. Grava em projects.product_answers (JSON serializado)
  2. Avança projects.status via assertValidTransition
  3. Atualiza projects.updated_at

Efeitos colaterais NÃO produzidos:
  - NÃO altera projects.corporate_answers
  - NÃO altera projects.operational_answers
  - NÃO gera briefing
  - NÃO chama LLM
```

**ATENÇÃO DIV-Z02-003:** `operationType` usa valores em PORTUGUÊS:
- `'produto'` → nextState = `'diagnostico_cnae'`
- `'comercio'` → nextState = `'diagnostico_cnae'`
- `'misto'` → nextState = `'q_servico'`
- `'industria'` → nextState = `'q_servico'`
- `'servico'` → nextState = `'q_servico'`
- qualquer outro → nextState = `'q_servico'` (comportamento conservador)

### 2.4 completeServiceQuestionnaire

```
Input:  { projectId: number, serviceAnswers: ServiceAnswer[] }
Output: { success: true, nextState: 'diagnostico_cnae', respostasGravadas: number }

Efeitos colaterais GARANTIDOS:
  1. Grava em projects.service_answers (JSON serializado)
  2. Avança projects.status para 'diagnostico_cnae'
  3. Atualiza projects.updated_at

Efeitos colaterais NÃO produzidos:
  - NÃO altera projects.operational_answers
  - NÃO gera briefing
```

---

## Parte 3 — Contrato do flowStateMachine

### 3.1 Tabela de verdade EXAUSTIVA de getNextStateAfterProductQ

| operationType (input) | nextState (output) | Observação |
|---|---|---|
| `"produto"` | `"diagnostico_cnae"` | Pula q_servico |
| `"comercio"` | `"diagnostico_cnae"` | Pula q_servico |
| `"servico"` | `"q_servico"` | Passa por q_servico |
| `"servicos"` | `"q_servico"` | Alias de servico |
| `"misto"` | `"q_servico"` | Ambos ativos |
| `"industria"` | `"q_servico"` | Tem serviços B2B |
| `"agronegocio"` | `"q_servico"` | Conservador |
| `"financeiro"` | `"q_servico"` | Conservador |
| `"product"` (inglês) | `"q_servico"` | **Bug silencioso evitado** — NÃO reconhecido como produto |
| `"service"` (inglês) | `"q_servico"` | NÃO reconhecido como produto |
| qualquer outro | `"q_servico"` | Comportamento conservador |

**ATENÇÃO:** `'product'` (inglês) retorna `'q_servico'` — NÃO é reconhecido como produto.
Esta é a DIV-Z02-003: sempre usar `'produto'` (português).

### 3.2 VALID_TRANSITIONS — adições obrigatórias (estratégia aditiva)

```typescript
// ADICIONAR (sem remover os legados):
'onda2_iagen':     ['q_produto', 'diagnostico_corporativo'],  // q_produto = TO-BE
'q_produto':       ['q_servico', 'diagnostico_cnae'],
'q_servico':       ['diagnostico_cnae', 'q_produto'],
'diagnostico_cnae': ['briefing', 'diagnostico_operacional', 'q_servico', 'q_produto'],

// MANTER SEM ALTERAÇÃO (legado — NUNCA remover):
'diagnostico_corporativo': ['diagnostico_operacional', 'onda2_iagen'],
'diagnostico_operacional': ['diagnostico_cnae', 'diagnostico_corporativo'],
```

---

## Parte 4 — Contrato do DiagnosticoStepper

### 4.1 Steps TO-BE (novos projetos)

```
Step 1: consistencia_pendente → Consistência
Step 2: cnaes_confirmados    → CNAEs
Step 3: onda1_solaris        → SOLARIS (obrigatório)
Step 4: onda2_iagen          → IA GEN
Step 5: q_produto            → Q. Produtos (NCM)   ← NOVO
Step 6: q_servico (*)        → Q. Serviços (NBS)   ← NOVO · condicional
Step 7: diagnostico_cnae     → Diagnóstico CNAE
Step 8: briefing             → Briefing
Step 9: riscos               → Riscos
Step 10: plano               → Plano de Ação
```

(*) Step 6 exibe `NaoAplicavelBanner` quando `isServiceQApplicable(operationType) === false`.

### 4.2 Steps legados (projetos existentes — manter)

```
Step 5: diagnostico_corporativo → Questionário Corporativo (QC)
Step 6: diagnostico_operacional → Questionário Operacional (QO)
```

---

## Parte 5 — Contrato do NaoAplicavelBanner

### 5.1 Quando exibir

| Componente | Condição | Texto do banner |
|---|---|---|
| `QuestionarioProduto` | `data.nao_aplicavel === true` | "Q. de Produtos — Não aplicável" |
| `QuestionarioServico` | `data.nao_aplicavel === true` | "Q. de Serviços — Não aplicável" |

### 5.2 Comportamento obrigatório

- Exibir botão "Avançar →" com `data-testid="btn-avancar-nao-aplicavel"`
- Ao clicar, navegar para o próximo step SEM chamar `complete*Questionnaire`
- NUNCA exibir formulário vazio
- NUNCA lançar erro quando `nao_aplicavel === true`

---

## Parte 6 — Violações de contrato

### 6.1 Violações que constituem bug imediato

| ID | Violação | Impacto |
|---|---|---|
| VIO-01 | `completeProductQuestionnaire` grava em `corporate_answers` | Dados perdidos, rastreabilidade corrompida |
| VIO-02 | `getNextStateAfterProductQ` usa `'product'` em vez de `'produto'` | Empresa de produto puro nunca pula Q.Serviços |
| VIO-03 | `getProductQuestions` persiste dados no banco | Efeito colateral não declarado |
| VIO-04 | `fonte_ref` vazio em ProductAnswer/ServiceAnswer | Rastreabilidade jurídica quebrada |
| VIO-05 | `lei_ref` vazio em ProductAnswer/ServiceAnswer | Rastreabilidade jurídica quebrada |
| VIO-06 | `NaoAplicavelBanner` não exibido quando `nao_aplicavel === true` | Usuário vê formulário vazio ou erro |
| VIO-07 | Estados `diagnostico_corporativo`/`diagnostico_operacional` removidos do FSM | Projetos legados ficam presos |

### 6.2 Protocolo de violação

Se qualquer violação for detectada durante a implementação:

1. **PARAR** a implementação imediatamente
2. **CRIAR** `docs/divergencias/DIV-Z02-XXX-descricao.md`
3. **REPORTAR** ao Orquestrador com o arquivo gerado
4. **AGUARDAR** decisão antes de continuar

---

## Parte 7 — Rastreabilidade

| Artefato | Localização |
|---|---|
| ADR | `docs/adr/ADR-0010-substituicao-qc-qo-por-ncm-nbs.md` |
| Spec | `DEC-M3-05-v3-implementacao-etapas.md` |
| DIVs | `docs/divergencias/DIV-Z02-001/002/003` |
| Testes | `server/integration/etapa1-*.test.ts` ... `etapa6-*.test.ts` |
| Gate FC | `scripts/gate-fc.sh` |
| Gate ADR | `scripts/gate-adr.sh` |
| Fitness | `server/integration/fitness-functions.test.ts` |
| Manifesto | `server/integration/connection-manifest.test.ts` |

---

*CONTRATO-DEC-M3-05-v3-interface · IA SOLARIS · 2026-04-07*
