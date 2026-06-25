# Mapa de Riscos — F3 Wizard Refactor (NovoProjeto.tsx)

**Data:** 25/06/2026 | **HEAD:** `4593ed7e` | **Autor:** Manus AI  
**Objetivo:** Identificar todas as validações, consistências e dependências da página `/projetos/novo` para guiar o refactor em wizard multi-step (F3).

---

## 1. Resumo Executivo

A página `NovoProjeto.tsx` (715 linhas) é o **ponto de entrada único** de todo o fluxo de compliance. Ela orquestra **4 mutações tRPC encadeadas**, **1 componente gigante** (PerfilEmpresaIntelligente, 1533 linhas), **2 camadas de validação** (frontend + backend Zod), e **1 mecanismo de persistência de rascunho**. Qualquer refactor que quebre a sequência `createProject → extractCnaes → confirmCnaes` ou altere a estrutura do payload JSON deixa o pipeline inteiro inoperante.

O risco principal do F3 não é visual — é **manter a integridade do contrato de dados** entre os passos do wizard e o backend.

---

## 2. Inventário de Validações

### 2.1 Validações Frontend (Gate de Submit)

O botão "Avançar" é bloqueado por 4 condições simultâneas (`NovoProjeto.tsx:544-549`):

| # | Condição | Arquivo:Linha | Tipo |
|---|----------|---------------|------|
| 1 | `!name.trim()` | NovoProjeto.tsx:546 | Obrigatório |
| 2 | `descLength < 100` | NovoProjeto.tsx:547 | Mínimo 100 chars |
| 3 | `!profileValid` | NovoProjeto.tsx:548 | Gate de perfil |
| 4 | `isLoading` | NovoProjeto.tsx:545 | Anti-double-click |

A condição `profileValid` é derivada de `calcProfileScore(perfilData).missingRequired.length === 0` (linha 268-269).

### 2.2 Validações de Perfil (calcProfileScore) — Condicional PJ/PF

`PerfilEmpresaIntelligente.tsx:179-226`

**PJ (taxIdType='cnpj') — 6 campos obrigatórios:**

| Campo | Validação | Mensagem de Erro |
|-------|-----------|------------------|
| CNPJ | `validateCnpj(p.cnpj)` — algoritmo de dígitos verificadores | "CNPJ válido" |
| Tipo Jurídico | `!!p.companyType` | "Tipo Jurídico" |
| Porte | `!!p.companySize` | "Porte da empresa" |
| Regime Tributário | `!!p.taxRegime` | "Regime Tributário" |
| Tipo de Operação | `!!p.operationType` | "Tipo de Operação" |
| Tipo de Cliente | `p.clientType.length > 0` | "Tipo de Cliente" |

**PF (taxIdType='cpf') — 2 campos obrigatórios:**

| Campo | Validação | Mensagem de Erro |
|-------|-----------|------------------|
| CPF | `validateCpf(p.cpf ?? "")` — algoritmo de dígitos verificadores | "CPF válido" |
| Tipo de Cliente | `p.clientType.length > 0` | "Tipo de Cliente" |

### 2.3 Validações Backend (Zod superRefine) — Dupla Camada

**Camada 1: `companyProfileSchema.superRefine`** (`routers-fluxo-v3.ts:310-356`)

| Regra | Condição | Erro |
|-------|----------|------|
| taxId length | CPF=11 ou CNPJ=14 dígitos | "Documento inválido" |
| companyType (PJ only) | `data.taxIdType !== 'cpf' && !data.companyType` | "Tipo Jurídico obrigatório para PJ" |
| companySize (PJ only) | `data.taxIdType !== 'cpf' && !data.companySize` | "Porte obrigatório para PJ" |
| taxRegime (PJ only) | `data.taxIdType !== 'cpf' && !data.taxRegime` | "Regime tributário obrigatório para PJ" |

**Camada 2: `createProject.input().superRefine`** (`routers-fluxo-v3.ts:463-479`)

| Regra | Condição | Erro |
|-------|----------|------|
| operationType (PJ only) | `companyProfile.taxIdType !== 'cpf' && !operationProfile.operationType` | "Tipo de Operação obrigatório para PJ" |
| multiState (PJ only) | `companyProfile.taxIdType !== 'cpf' && multiState === undefined` | "Operação multiestadual obrigatória para PJ" |

### 2.4 Validações NCM/NBS (inline no componente)

`PerfilEmpresaIntelligente.tsx:796-797` + linhas 1167, 1276:

| Validação | Regex | Formato aceito |
|-----------|-------|----------------|
| NCM | `/^\d{4}$\|\^\d{4}\.\d{2}$\|\^\d{4}\.\d{2}\.\d{2}$/` | 1006, 1006.20, 1006.20.00 |
| NBS | `/^\d\.\d{4}$\|\^\d\.\d{4}\.\d{2}$\|\^\d\.\d{4}\.\d{2}\.\d{2}$/` | 1.0501, 1.0501.14, 1.0501.14.59 |

### 2.5 Validação CNPJ/CPF (blur event)

`PerfilEmpresaIntelligente.tsx:860-882` — validação ao sair do campo (onBlur), com feedback visual imediato (ícone verde/vermelho).

---

## 3. Consistências Cross-Field (Downstream)

Após o `createProject`, o `consistencyEngine.ts` roda **8 regras determinísticas** que cruzam campos entre si:

| ID | Campos Cruzados | Regra |
|----|-----------------|-------|
| DET-001 | `taxRegime` × `annualRevenueRange` | Regime incompatível com faturamento |
| DET-002 | `companySize` × `annualRevenueRange` | Porte inconsistente com faturamento |
| DET-003 | `companySize(mei)` × `multiState` | MEI não pode ser multi-estado |
| DET-004 | `companySize(mei)` × `hasInternationalOps` | MEI não pode importar/exportar |
| DET-005 | `taxRegime(simples)` × `hasInternationalOps` | Simples com ops internacionais |
| DET-006 | `companySize(media/grande)` × `hasTaxTeam` | Grande empresa sem equipe tributária |
| DET-007 | `hasTaxIssues` × `hasAudit` | Pendências sem auditoria |
| DET-008 | `usesMarketplace` × `taxRegime(simples)` × `revenue` | Marketplace perto do limite |

**RISCO F3:** Se o wizard separar `companyProfile` (Passo 1) de `taxComplexity` (Passo 3), o consistency engine **não pode rodar incrementalmente** — ele precisa do objeto completo. O submit final deve montar o payload idêntico ao atual.

---

## 4. Cadeia de Mutações (Sequência Crítica)

```
handleSubmit()
  └─ createProject.mutate(payload)
       └─ onSuccess → extractCnaes.mutate({ projectId, description })
            └─ onSuccess → setShowCnaeModal(true)
                 └─ [Modal] handleConfirmCnaes()
                      └─ confirmCnaes.mutate({ projectId, cnaes })
                           └─ onSuccess → navigate (3 rotas possíveis)
```

**Dependências temporais:**
1. `extractCnaes` precisa do `projectId` retornado por `createProject`
2. `confirmCnaes` precisa do `projectId` + CNAEs selecionados no modal
3. A navegação pós-confirmCnaes depende de feature flags server-side

**RISCO F3:** Se o wizard permitir "voltar" após `createProject`, o projeto já existe no banco. Não pode criar duplicado. Precisa de lógica de "editar projeto existente" ou bloquear retrocesso após submit.

---

## 5. Mecanismo de Persistência (Draft/Rascunho)

`NovoProjeto.tsx:265` + `usePersistenceV3.ts`:

| Aspecto | Implementação |
|---------|---------------|
| Auto-save | `useAutoSave(DRAFT_PROJECT_ID, 'etapa1', { name, description }, 500)` |
| Storage | `localStorage` com chave `persistence_v3_0_etapa1` |
| Campos salvos | Apenas `name` e `description` (NÃO salva perfilData!) |
| Resume banner | Exibido se `loadTempData` retorna dados |
| Clear | Após `confirmCnaes.onSuccess` |

**RISCO F3:** O wizard terá mais passos. Se cada passo salvar separadamente, a lógica de resume precisa ser multi-stage. Se o `perfilData` (26 campos) não é salvo hoje, o wizard **deve** salvar — senão o usuário perde tudo ao recarregar a página no meio do preenchimento.

---

## 6. Efeito Colateral PF/PJ (useEffect de Limpeza)

`PerfilEmpresaIntelligente.tsx:835-852`:

Quando o usuário alterna de PJ para PF, um `useEffect` **limpa 8 campos** automaticamente:

```typescript
onChange({
  ...value,
  companyType: "",
  companySize: "",
  taxRegime: "",
  isEconomicGroup: null,
  taxCentralization: null,
  hasTaxTeam: null,
  annualRevenueRange: "",
  operationType: "",
});
```

**RISCO F3:** Se o wizard separar esses campos em passos diferentes, a limpeza precisa propagar para TODOS os passos afetados. Se o toggle PJ/PF estiver no Passo 1 e `taxRegime` no Passo 2, o Passo 2 precisa reagir à mudança do Passo 1.

---

## 7. Componentes e Dependências Externas

| Componente/Lib | Arquivo | Função no Fluxo |
|----------------|---------|-----------------|
| `PerfilEmpresaIntelligente` | `components/PerfilEmpresaIntelligente.tsx` (1533 linhas) | Formulário completo de perfil |
| `ResumeBanner` | `components/ResumeBanner.tsx` | Banner de retomada de rascunho |
| `ComplianceLayout` | `components/ComplianceLayout.tsx` | Shell de navegação |
| `EditCnaeModal` | (inline ou importado) | Edição de CNAE individual |
| `searchCnaes` | `shared/cnae-table.ts` | Busca local em 5.381 CNAEs |
| `validateCnpj` | `PerfilEmpresaIntelligente.tsx:162` | Algoritmo dígitos verificadores |
| `validateCpf` | `lib/validate-cpf.ts` | Algoritmo dígitos verificadores |
| `isValidNcm/isValidNbs` | `shared/ncm-nbs-validation.ts` | Regex de formato NCM/NBS |
| `calcProfileScore` | `PerfilEmpresaIntelligente.tsx:179` | Score de completude + gate |
| `useAutoSave` | `hooks/usePersistenceV3.ts` | Persistência localStorage |
| `flowStateMachine` | `server/flowStateMachine.ts` | Validação de transição de estado |

---

## 8. Cobertura de Testes Existente

**27 arquivos de teste** referenciam funcionalidades de NovoProjeto:

| Categoria | Arquivos | Cobertura |
|-----------|----------|-----------|
| Schema Zod (PJ/PF) | `bug-agro-cpf.test.ts` (9 TBs) | ✅ Excelente |
| Bloco E (NCM/NBS) | `bloco-e-frontend.test.ts` | ✅ Boa |
| confirmCnaes transition | `bug-e2e-01-confirm-cnaes.test.ts` | ✅ Boa |
| Fluxo completo E2E | `e2e-fluxo-completo.test.ts` | ✅ Boa |
| Consistency engine | `consistencyEngine.test.ts` | ✅ Boa |
| Frontend rendering | **NENHUM** | ❌ Zero |
| calcProfileScore | **NENHUM** | ❌ Zero |
| useAutoSave | **NENHUM** | ❌ Zero |
| PF/PJ toggle cleanup | **NENHUM** | ❌ Zero |

**RISCO F3:** A cobertura de testes é forte no backend (Zod, state machine) mas **zero no frontend** (React components, validação visual, toggle PF/PJ). O wizard F3 precisa de testes E2E com `data-testid` para ancorar.

---

## 9. Mapa de Riscos para o F3 Wizard

### 9.1 Riscos CRÍTICOS (quebram o fluxo se ignorados)

| # | Risco | Impacto | Mitigação |
|---|-------|---------|-----------|
| R1 | **Payload fragmentado** — wizard envia campos parciais por passo | Backend Zod rejeita com 400 | Submit final DEVE montar payload idêntico ao atual (objeto único) |
| R2 | **Retrocesso pós-createProject** — usuário volta ao Passo 1 após criar projeto | Projeto duplicado no banco | Bloquear retrocesso após submit OU implementar "editar projeto existente" |
| R3 | **PF/PJ toggle cross-step** — toggle no Passo 1, campos afetados no Passo 2/3 | Campos PJ-only ficam preenchidos para PF → backend rejeita | Propagar limpeza para todos os passos OU manter toggle + campos dependentes no mesmo passo |
| R4 | **Sequência de mutações quebrada** — `extractCnaes` precisa do `projectId` | CNAE extraction falha | Manter `createProject → extractCnaes` como operação atômica (não separar em passos) |

### 9.2 Riscos ALTOS (degradam UX ou causam perda de dados)

| # | Risco | Impacto | Mitigação |
|---|-------|---------|-----------|
| R5 | **Persistência parcial** — hoje só salva `name` + `description` | Usuário perde 26 campos do perfil ao recarregar | Wizard DEVE salvar `perfilData` completo por passo |
| R6 | **Consistency engine precisa de objeto completo** | Não pode rodar validação cruzada entre passos | Rodar consistency apenas no passo final (antes do submit) |
| R7 | **calcProfileScore condicional** — PJ tem 6 required, PF tem 2 | Wizard mostra "passo completo" mas backend rejeita | Replicar lógica condicional no wizard step validation |
| R8 | **Modal de CNAEs acoplado** — abre automaticamente após createProject | Wizard precisa decidir: modal dentro de qual passo? | Manter modal como "sub-passo" do último step (não separar) |

### 9.3 Riscos MÉDIOS (requerem atenção mas não bloqueiam)

| # | Risco | Impacto | Mitigação |
|---|-------|---------|-----------|
| R9 | **PerfilEmpresaIntelligente é monolítico** (1533 linhas) | Difícil de dividir entre passos do wizard | Usar como componente único em 1 passo OU refatorar em sub-componentes |
| R10 | **Validação CNPJ/CPF onBlur** — feedback visual acoplado ao componente | Se mover para outro passo, perde o feedback | Manter no mesmo passo que o campo de documento |
| R11 | **data-testid ausente** — componentes atuais não têm anchors E2E | Testes E2E do F3 não têm onde ancorar | Adicionar data-testid em TODOS os elementos interativos (obrigatório no mockup) |
| R12 | **Feature flags no onSuccess** — `confirmCnaes` consulta `isM2Enabled` | Wizard precisa manter essa lógica de navegação condicional | Preservar intacto o handler de `confirmCnaes.onSuccess` |

---

## 10. Recomendação de Arquitetura para o Wizard F3

Com base na análise de riscos, a divisão em passos mais segura é:

| Passo | Conteúdo | Justificativa |
|-------|----------|---------------|
| **1 — Identificação** | Nome + Descrição + Toggle PJ/PF + CNPJ/CPF | Campos de identidade (mínimo para criar draft) |
| **2 — Perfil Operacional** | Tipo Jurídico + Porte + Regime + Tipo Operação + Cliente + Multiestadual | Campos PJ-only (condicionais ao toggle do Passo 1) |
| **3 — Detalhamento** | NCM/NBS + Faturamento + Complexidade + Financeiro + Governança | Campos opcionais que enriquecem o diagnóstico |
| **4 — Revisão + Submit** | Resumo visual + Botão "Criar Projeto" | Monta payload completo, roda consistency preview, submete |
| **Sub-passo 4b** | Modal de CNAEs (automático após submit) | Mantém sequência `createProject → extractCnaes → confirmCnaes` intacta |

**Princípio:** O submit (createProject) acontece APENAS no Passo 4. Passos 1-3 são puramente frontend (state local + localStorage). Isso elimina R2 (retrocesso pós-create) e R4 (sequência quebrada).

---

## 11. Campos por Passo — Mapa de Dependências

```
Passo 1: name, description, taxIdType, cnpj/cpf
    ↓ (taxIdType propaga para Passo 2)
Passo 2: companyType, companySize, taxRegime, operationType, clientType[], multiState
    ↓ (companySize + taxRegime propagam para Passo 3 — consistency)
Passo 3: annualRevenueRange, hasMultipleEstablishments, hasImportExport,
          paymentMethods[], hasIntermediaries, hasTaxTeam, hasAudit, hasTaxIssues,
          isEconomicGroup, taxCentralization, principaisProdutos[], principaisServicos[]
    ↓ (tudo propaga para Passo 4)
Passo 4: [read-only review] → createProject → extractCnaes → [modal CNAEs] → confirmCnaes
```

---

## 12. Conclusão

O formulário NovoProjeto é **altamente acoplado** — 4 mutações sequenciais, 2 camadas de validação condicional (PJ/PF), 8 regras de consistência cross-field, e 1 componente de 1533 linhas que gerencia 26 campos de estado. O refactor em wizard é viável mas exige:

1. **Payload final idêntico** — o wizard NÃO pode alterar a estrutura do JSON enviado ao backend
2. **Submit apenas no último passo** — elimina o risco de projeto duplicado
3. **Persistência multi-step** — salvar `perfilData` completo (hoje só salva name+description)
4. **Toggle PJ/PF no mesmo passo** que os campos dependentes (ou propagar limpeza)
5. **data-testid obrigatório** — sem anchors, os testes E2E não funcionam
6. **Testes frontend** — hoje há ZERO cobertura de componente React; F3 deve adicionar

O risco mais grave é **R1 (payload fragmentado)** — se cada passo do wizard enviar dados parciais ao backend, o Zod superRefine rejeita. A solução é acumular state local e submeter tudo de uma vez no passo final.
