# ADR-0010 — Substituição de QC/QO por Q.Produtos (NCM) e Q.Serviços (NBS)
## IA SOLARIS · Architecture Decision Record

**Status:** Aceito  
**Data:** 2026-04-07  
**Autores:** Uires Tapajós (P.O.) · Orquestrador Claude  
**Implementação:** Sprint Z-02 · Branch: feat/z02-to-be-flow-refactor  
**Substitui:** N/A  
**Relacionado a:** DEC-M3-05 v3 · ADR-0009 · DIV-Z02-001/002/003  

---

## 1. Contexto

A plataforma IA SOLARIS realiza diagnóstico de compliance tributário para
empresas brasileiras durante a transição para a Reforma Tributária (LC 214/2025).
O fluxo de diagnóstico coleta dados em 8 etapas, sendo as etapas 4 e 5 dedicadas
à coleta de informações sobre produtos e serviços da empresa.

### Estado anterior (AS-IS — Sprint K-4, ativo até Z-01)

As etapas 4 e 5 eram implementadas como:
- **Etapa 4:** Questionário Corporativo (QC) — 10 seções com perguntas genéricas
  sobre documentos fiscais, cadastros, regimes, estrutura societária
- **Etapa 5:** Questionário Operacional (QO) — 10 seções com perguntas genéricas
  sobre fluxo comercial, canais de venda, meios de pagamento, operações

**Problema:** As perguntas do QC e QO são idênticas para qualquer empresa,
independentemente de ela comercializar arroz, destilados, medicamentos ou
serviços hospitalares. Um diagnóstico de compliance tributário sobre a LC
214/2025 requer perguntas específicas por produto (NCM) e por serviço (NBS),
pois as regras de IBS, CBS, Imposto Seletivo, alíquota zero e regime diferenciado
variam radicalmente por código NCM/NBS.

### Evento que precipitou a decisão

O primeiro E2E manual (Sprint Z, 2026-04-07) revelou que a empresa
"Distribuidora Alimentos Teste 5" — distribuidora de bebidas e alimentos —
recebeu exatamente as mesmas perguntas que qualquer outra empresa de qualquer
setor. As perguntas não mencionavam NCM 2202 (bebidas açucaradas sujeitas ao
Imposto Seletivo) nem NCM 1006 (arroz com alíquota zero). O diagnóstico era
tecnicamente válido mas juridicamente genérico.

---

## 2. Decisão

**Substituir o Questionário Corporativo (QC) e o Questionário Operacional (QO)
por dois questionários adaptativos baseados nos códigos NCM e NBS cadastrados
no perfil da empresa:**

### Q. de Produtos (Etapa 4)

- **Ativado:** quando `operationType ∈ {produto, comercio, misto, industria}`
- **Não aplicável:** quando `operationType ∈ {servico, servicos}`
- **Conteúdo:** perguntas geradas dinamicamente pelo engine `product-questions.ts`
  consultando o corpus RAG por NCM específico + fallback para SOLARIS/genérico
- **Rastreabilidade:** cada pergunta é um `TrackedQuestion` com campos obrigatórios
  `fonte`, `fonte_ref`, `lei_ref`, `ncm`, `confidence`
- **Persistência:** campo `productAnswers` (TEXT JSON) na tabela `projects`

### Q. de Serviços (Etapa 5)

- **Ativado:** quando `operationType ∈ {servico, servicos, misto, industria}`
- **Não aplicável:** quando `operationType ∈ {produto, comercio}`
- **Conteúdo:** perguntas geradas dinamicamente pelo engine `service-questions.ts`
  consultando SOLARIS primeiro, RAG por NBS segundo
- **Rastreabilidade:** cada pergunta é um `TrackedQuestion` com campos obrigatórios
  `fonte`, `fonte_ref`, `lei_ref`, `nbs`, `confidence`
- **Persistência:** campo `serviceAnswers` (TEXT JSON) na tabela `projects`

---

## 3. Alternativas consideradas

### Alternativa A — Manter QC/QO e enriquecê-los com perguntas NCM/NBS

**Descrição:** Adicionar seções de NCM/NBS ao QC e QO existentes, mantendo as
10 seções genéricas como base e adicionando seções específicas por produto/serviço.

**Motivo da rejeição:**
- O QC/QO genérico continuaria sendo respondido por todas as empresas,
  gerando ruído no diagnóstico
- O briefing receberia respostas sobre "canais de venda" e "meios de pagamento"
  misturadas com respostas sobre IS e alíquota zero — dificultando a consolidação
- A rastreabilidade `lei_ref → pergunta → gap → risco` ficaria corrompida
  por perguntas sem base legal específica

### Alternativa B — Remover QC/QO e substituir diretamente no fluxo

**Descrição:** Remover os estados `diagnostico_corporativo` e `diagnostico_operacional`
do `VALID_TRANSITIONS` e substituir por `q_produto` e `q_servico`.

**Motivo da rejeição:**
- Projetos existentes em status `diagnostico_corporativo` ou `diagnostico_operacional`
  ficariam presos — `assertValidTransition` lançaria `TRPCError FORBIDDEN`
  para qualquer tentativa de avanço
- Viola o princípio de retrocompatibilidade do sistema

### Alternativa C (ADOTADA) — Estratégia aditiva: adicionar sem remover

**Descrição:** Adicionar os estados `q_produto` e `q_servico` ao `VALID_TRANSITIONS`
mantendo `diagnostico_corporativo` e `diagnostico_operacional` como estados legados.
Novos projetos seguem o fluxo TO-BE. Projetos existentes continuam funcionando.

**Motivo da escolha:**
- Zero risco de regressão para projetos legados
- Coexistência controlada dos dois fluxos (V1/V2 com QC/QO, V3 com Q.Produtos/Serviços)
- Reversível sem perda de dados

---

## 4. Consequências

### Positivas

1. **Diagnóstico específico por produto/serviço:** empresa de bebidas recebe
   perguntas sobre IS; empresa de medicamentos recebe perguntas sobre alíquota
   reduzida; empresa de saúde recebe perguntas sobre regime diferenciado
2. **Rastreabilidade jurídica completa:** cada pergunta tem `fonte_ref` (anchor_id
   RAG ou código SOL-XXX) e `lei_ref` (artigo da LC 214/2025)
3. **Eliminação de perguntas irrelevantes:** empresa de produto puro não
   responde questões de serviços (NBS = não aplicável)
4. **Base para o briefing:** o briefing recebe `productAnswers` e `serviceAnswers`
   como fontes rastreadas, permitindo citar NCMs e NBS específicos

### Negativas / Trade-offs

1. **Complexidade adicional no flowStateMachine:** dois fluxos coexistem (legado
   QC/QO + novo Q.Produtos/Serviços). Requer manutenção de ambos até que projetos
   legados sejam concluídos ou arquivados
2. **Dois campos extras no schema:** `productAnswers` e `serviceAnswers` coexistem
   com `corporateAnswers` e `operationalAnswers`. A consolidação final (remoção das
   colunas legadas) requer Issue #62 resolvida
3. **Frontend mais complexo:** o `DiagnosticoStepper` precisa determinar
   dinamicamente quais steps são aplicáveis com base no `operationType`

### Neutralizadas por restrições permanentes

- `corporateAnswers` e `operationalAnswers` **não serão removidas** (Issue #62)
- Rotas `/questionario-corporativo-v2` e `/questionario-operacional` **não serão
  removidas** (compatibilidade com projetos V1/V2)
- Estados `diagnostico_corporativo` e `diagnostico_operacional` **não serão
  removidos** do `VALID_TRANSITIONS` (projetos existentes)

---

## 5. Diagrama do fluxo após implementação

```
Fluxo TO-BE (novos projetos — Sprint Z-02+):

  rascunho
    → consistencia_pendente
    → cnaes_confirmados
    → onda1_solaris          ← SOLARIS obrigatório (BUG-MANUAL-01 fix)
    → onda2_iagen
    → q_produto              ← NOVO (substitui diagnostico_corporativo)
    → q_servico (*)          ← NOVO · condicional por operationType
    → diagnostico_cnae
    → briefing
    → riscos
    → plano
    → aprovado

  (*) q_servico é pulado quando operationType ∈ {produto, comercio}

Fluxo AS-IS (projetos legados — mantido para retrocompat):

  ...
    → onda2_iagen
    → diagnostico_corporativo  ← LEGADO · mantido
    → diagnostico_operacional  ← LEGADO · mantido
    → diagnostico_cnae
    ...
```

---

## 6. Impacto nos componentes

| Componente | Impacto | Detalhe |
|---|---|---|
| `server/flowStateMachine.ts` | Modificado — aditivo | Adiciona q_produto, q_servico, getNextStateAfterProductQ |
| `server/routers-fluxo-v3.ts` | Modificado | Corrige getProductQuestions/getServiceQuestions; adiciona complete* |
| `drizzle/schema.ts` | Modificado | Adiciona productAnswers e serviceAnswers |
| `client/src/pages/DiagnosticoStepper.tsx` | Modificado | Steps 4-5 atualizados |
| `client/src/pages/QuestionarioIaGen.tsx` | Modificado | Navegação pós-Onda 2 corrigida |
| `client/src/pages/QuestionarioProduto.tsx` | Novo | Componente TO-BE |
| `client/src/pages/QuestionarioServico.tsx` | Novo | Componente TO-BE |
| `client/src/components/NaoAplicavelBanner.tsx` | Novo | Banner condicional |
| `client/src/App.tsx` | Modificado | Rotas TO-BE adicionadas |

**Componentes não alterados (garantia de retrocompat):**
- `client/src/pages/QuestionarioCorporativoV2.tsx` — intocado
- `client/src/pages/QuestionarioOperacional.tsx` — intocado
- `server/lib/product-questions.ts` — intocado (implementado em Z-01)
- `server/lib/service-questions.ts` — intocado (implementado em Z-01)

---

## 7. Validação

Este ADR é considerado implementado quando:

```
✅ connection-manifest.test.ts: 47/47 PASS (8 FAILs TO-BE viram PASS)
✅ E2E manual: empresa de produto → Q.Produtos ativa, Q.Serviços não aplicável
✅ E2E manual: empresa de serviço → Q.Produtos não aplicável, Q.Serviços ativa
✅ E2E manual: empresa mista → Q.Produtos e Q.Serviços ambos ativos
✅ Briefing cita NCMs e NBS específicos da empresa
✅ Red Flags 5, 8, 9, 11 fechadas
```

---

*ADR-0010 · IA SOLARIS · 2026-04-07*
