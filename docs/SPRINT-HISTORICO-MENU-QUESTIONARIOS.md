# HISTÓRICO DE SPRINT — Mudança do Menu e Adição de Questionários
**Sprint:** v2.1 Diagnostic Flow | **Período:** Jan–Mar 2026 | **Checkpoints:** `6922c6d` → `f74273e`

---

## 1. Contexto e Motivação

Antes da sprint v2.1, a plataforma utilizava um fluxo de Assessment em duas fases (Fase 1 e Fase 2) com questionários genéricos. O Product Owner identificou que esse modelo não refletia a realidade operacional das empresas que precisam de diagnóstico tributário: era necessário separar claramente as dimensões **corporativa**, **operacional** e **por CNAE**.

A decisão foi reorganizar completamente o fluxo diagnóstico, substituindo o Assessment por 3 camadas de questionários sequenciais com bloqueio progressivo — cada camada só é liberada após a conclusão da anterior.

---

## 2. Decisões de Design do Menu

### 2.1 Antes (v2.0)

O menu lateral apresentava os itens de forma plana, sem hierarquia clara entre as etapas do diagnóstico. O fluxo era:

```
Painel → Projetos → [Projeto] → Assessment Fase 1 → Assessment Fase 2 → Briefing → Riscos → Plano
```

O menu não refletia o progresso do projeto e não havia bloqueio sequencial entre etapas.

### 2.2 Depois (v2.1)

O menu foi reestruturado com o `DiagnosticoStepper` — um componente de progresso visual que exibe as 3 camadas de diagnóstico com seus estados (bloqueado / em andamento / concluído):

```
Painel → Projetos → [Projeto]
  └─ Perfil da Empresa (GATE obrigatório)
  └─ Diagnóstico:
       ├─ [1] Corporativo (QC-01..QC-10)  ← sempre disponível após perfil
       ├─ [2] Operacional (QO-01..QO-10)  ← bloqueado até QC=completed
       └─ [3] CNAE (QCNAE-01..QCNAE-05)  ← bloqueado até QO=completed
  └─ Briefing (bloqueado até diagnóstico completo)
  └─ Riscos
  └─ Plano de Ação
```

### 2.3 Labels Oficiais (definidos pelo PO)

Os nomes das seções foram definidos pelo Product Owner e implementados exatamente como especificado:

**Questionário Corporativo (QC):**

| Código | Label |
|---|---|
| QC-01 | Identificação e Perfil Corporativo |
| QC-02 | Estrutura Societária e Governança |
| QC-03 | Regime Tributário e Enquadramento |
| QC-04 | Operações e Atividades Econômicas |
| QC-05 | Faturamento e Receitas |
| QC-06 | Fornecedores e Cadeia de Valor |
| QC-07 | Clientes e Mercados |
| QC-08 | Créditos e Benefícios Fiscais |
| QC-09 | Obrigações Acessórias e Compliance |
| QC-10 | Tecnologia e Sistemas |

**Questionário Operacional (QO):**

| Código | Label |
|---|---|
| QO-01 | Processos de Compras e Aquisições |
| QO-02 | Gestão de Estoque e Logística |
| QO-03 | Produção e Operações |
| QO-04 | Vendas e Faturamento |
| QO-05 | Contratos e Acordos Comerciais |
| QO-06 | Recursos Humanos e Folha |
| QO-07 | Financeiro e Tesouraria |
| QO-08 | Importação e Exportação |
| QO-09 | Propriedade Intelectual e Licenças |
| QO-10 | Meio Ambiente e Sustentabilidade |

**Questionário CNAE (QCNAE):**

| Código | Label |
|---|---|
| QCNAE-01 | Atividades Principais e Secundárias |
| QCNAE-02 | Especificidades Setoriais |
| QCNAE-03 | Regimes Especiais por Setor |
| QCNAE-04 | Obrigações Específicas do Setor |
| QCNAE-05 | Transição para Novo Regime |

---

## 3. Implementação Técnica

### 3.1 Novos Arquivos Criados

| Arquivo | Função |
|---|---|
| `client/src/pages/QuestionarioCorporativoV2.tsx` | Questionário Corporativo (10 seções, QC-01..QC-10) |
| `client/src/pages/QuestionarioOperacional.tsx` | Questionário Operacional (10 seções, QO-01..QO-10) |
| `client/src/pages/QuestionarioCNAE.tsx` | Questionário CNAE (5 seções, QCNAE-01..QCNAE-05) |
| `server/routers/diagnostic.ts` | Sub-router com máquina de estados e consolidador |

### 3.2 Rotas Adicionadas ao App.tsx

```tsx
<Route path="/projetos/:id/questionario-corporativo-v2" component={QuestionarioCorporativoV2} />
<Route path="/projetos/:id/questionario-operacional" component={QuestionarioOperacional} />
<Route path="/projetos/:id/questionario-cnae" component={QuestionarioCNAE} />
```

### 3.3 Máquina de Estados

O campo `status` da tabela `projects` foi estendido com novos valores ENUM:

**Removidos:**
- `assessment_fase1`
- `assessment_fase2`
- `parado`

**Adicionados:**
- `diagnostico_corporativo`
- `diagnostico_operacional`
- `diagnostico_cnae`

### 3.4 Bloqueio Sequencial

O `DiagnosticoStepper` implementa bloqueio progressivo via `getDiagnosticStatus`:

```
QC disponível → sempre (após perfil completo)
QO disponível → somente se QC.status === 'completed'
QCNAE disponível → somente se QO.status === 'completed'
Briefing disponível → somente se QCNAE.status === 'completed'
```

### 3.5 Consolidador de 3 Camadas

A função `generateBriefingFromDiagnostic` consolida as respostas das 3 camadas em um único payload para o Briefing Engine:

```typescript
// Agrega: corporateAnswers + operationalAnswers + cnaeAnswers
// Retorna: { summary, gaps, recommendations, riskAreas }
```

---

## 4. Tabelas do Banco Criadas/Modificadas

| Tabela | Operação | Descrição |
|---|---|---|
| `projects` | ALTER | Novo ENUM status com 3 estados de diagnóstico |
| `questionnaireAnswersV3` | CREATE | Respostas das 3 camadas (JSON por seção) |
| `questionnaireProgressV3` | CREATE | Progresso por camada (corporativo/operacional/cnae) |
| `questionnaireQuestionsCache` | CREATE | Cache de perguntas geradas por IA por CNAE |

---

## 5. Evidências de Validação

O checkpoint `f74273e` inclui as seguintes evidências:

1. **3 screenshots** do fluxo completo no browser
2. **Persistência confirmada** no banco: todos os 5 blocos JSON (companyProfile, operationProfile, taxComplexity, financialProfile, governanceProfile) gravados corretamente
3. **Reload confirmado**: dados persistem após reload da página
4. **Bloqueio sequencial validado**: QO só abre após QC=completed, QCNAE só abre após QO=completed
5. **Liberação do Briefing** confirmada após conclusão das 3 camadas
6. **TypeScript: 0 erros**

---

## 6. Bugs Identificados e Corrigidos

| Bug | Causa | Correção | Commit |
|---|---|---|---|
| LSP type inference falha no diagnostic router | Router muito grande (>150 linhas) | Extraído para sub-router `server/routers/diagnostic.ts` | `c55af7e` |
| `getDiagnosticStatus` sem `progress` e `isComplete` | Campos não retornados | Adicionados ao retorno da procedure | `a256f72` |
| ENUM status com valores legados | `assessment_fase1/2/parado` ainda no schema | ENUM limpo, apenas novos valores | `43a7ec1` |
| Perfil da Empresa não era obrigatório | Campos com `.optional()` no Zod | Todos os 7 campos tornados obrigatórios | `71451b5` |

---

## 7. Impacto no Produto

A mudança do menu e a adição dos 3 questionários transformou a plataforma de um sistema de assessment genérico em um **motor de diagnóstico tributário estruturado**, com:

- **Cobertura completa**: 25 seções de diagnóstico (10 corporativo + 10 operacional + 5 CNAE)
- **Progressão guiada**: o usuário não pode pular etapas
- **Rastreabilidade**: cada resposta é persistida com `projectId`, `layerType` e `sectionCode`
- **Integração com IA**: o consolidador alimenta o Briefing Engine com contexto rico das 3 camadas

---

*Documento gerado automaticamente em 20/03/2026 — IA SOLARIS Compliance Tributária*
