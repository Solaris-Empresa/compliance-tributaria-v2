# Product Spec — Perfil da Empresa (CPIE v2)

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado  
**Autor:** Equipe de Produto — Plataforma COMPLIANCE da Reforma Tributária  
**Rastreabilidade:** `server/cpie-v2.ts` · `server/routers/cpieV2Router.ts` · `drizzle/schema.ts`

---

## 1. Objetivo

O módulo **CPIE v2** (Company Profile Intelligence Engine — Conflict Intelligence) é o portão de qualidade obrigatório antes do diagnóstico tributário. Seu objetivo é detectar contradições internas no perfil declarado pela empresa e impedir que análises baseadas em dados inconsistentes gerem recomendações tributárias incorretas.

O CPIE v2 responde a uma única pergunta central: **"Essa empresa pode existir na realidade brasileira com o perfil declarado?"**

A diferença fundamental em relação ao CPIE v1 é conceitual: enquanto a v1 media completude de formulário (quantos campos foram preenchidos), a v2 mede coerência de realidade (se os dados preenchidos são internamente consistentes e plausíveis).

---

## 2. Escopo

### 2.1 O que o CPIE v2 faz

- Extrai semanticamente o perfil real da empresa a partir da descrição livre (fonte primária de verdade)
- Detecta contradições entre a descrição livre e os campos estruturados
- Detecta contradições entre os próprios campos estruturados
- Detecta combinações juridicamente impossíveis no contexto tributário brasileiro
- Calcula três scores independentes de qualidade do perfil
- Decide se o projeto pode avançar para o diagnóstico tributário

### 2.2 O que o CPIE v2 não faz

- Não valida CNAEs (responsabilidade do módulo seguinte)
- Não realiza diagnóstico tributário (responsabilidade do módulo de gap)
- Não verifica dados cadastrais na Receita Federal (sem integração com CNPJ externo)
- Não substitui a análise do consultor tributário

### 2.3 Posição no fluxo do produto

```
[Formulário do Perfil] → [CPIE v2 Gate] → [Seleção de CNAEs] → [Diagnóstico Tributário]
```

O CPIE v2 é um gate obrigatório: sem aprovação, o projeto não avança.

---

## 3. Regras de Negócio

### 3.1 Fonte primária de verdade

A **descrição livre** do negócio é a fonte primária de verdade. Quando há contradição entre a descrição e os campos estruturados, a descrição prevalece para fins de inferência. Os campos estruturados são tratados como declarações do usuário que podem estar erradas.

### 3.2 Os três scores

O CPIE v2 produz **três scores separados** que nunca devem ser misturados ou agregados:

| Score | Definição | Sujeito a veto? |
|---|---|---|
| `completenessScore` | Percentual de campos preenchidos (0–100) | Não |
| `consistencyScore` | Coerência interna dos dados (0–100) | Sim — vetos aplicam teto |
| `diagnosticConfidence` | Confiança diagnóstica real = `consistencyScore × completenessScore / 100` | Sim — derivado dos anteriores |

O `diagnosticConfidence` é o score que governa a decisão de bloqueio.

### 3.3 Regras de veto

Vetos são **tetos numéricos** que o `consistencyScore` não pode ultrapassar, independentemente da completude do formulário. Um único conflito crítico pode vetar o score em ≤ 15, tornando o `diagnosticConfidence` insuficiente para prosseguir.

| Origem do veto | Quando aplica | Teto máximo |
|---|---|---|
| `deterministicVeto` | Conflito determinístico crítico (A1, A4, C1) | 15 |
| `deterministicVeto` | Conflito determinístico high (A2, A3, B1b, B2 high) | 40–55 |
| `aiVeto` | Contradição composta crítica detectada pela IA | ≤ 15 |
| `aiVeto` | Múltiplos conflitos high sem explicação | ≤ 30 |
| `aiVeto` | Tipo de operação incompatível com setor | ≤ 40 |

### 3.4 Penalizações por conflito

Cada conflito reduz o `consistencyScore` antes da aplicação dos vetos:

| Severidade | Penalização |
|---|---|
| `critical` | −35 pontos |
| `high` | −20 pontos |
| `medium` | −10 pontos |
| `low` | −5 pontos |

As penalizações são acumulativas. O score bruto é `max(0, 100 − soma_das_penalizações)`.

---

## 4. Estados do Sistema

O CPIE v2 produz um de três estados possíveis para cada análise:

### 4.1 Hard Block (`hard_block`)

**Condição:** `diagnosticConfidence < 15%` **OU** presença de conflito com `severity = "critical"`.

**Comportamento:**
- O projeto **não pode avançar** para CNAEs
- O override está **proibido** — não há justificativa que permita prosseguir
- O usuário deve corrigir as contradições críticas no perfil

**Exemplos de causas:**
- MEI com operações de importação/exportação (A4)
- MEI com atividade de manufatura (C1)
- Regime tributário incompatível com faturamento (A1)
- Falha na arbitragem IA (AI-ERR)

### 4.2 Soft Block com Override (`soft_block_with_override`)

**Condição:** Presença de conflito com `severity = "high"` **E** ausência de conflito `critical`.

**Comportamento:**
- O projeto **não pode avançar** sem ação explícita do usuário
- O override é **permitido** mediante justificativa formal ≥ 50 caracteres
- A justificativa é gravada na trilha de auditoria (`consistency_checks.acceptedRiskReason`)
- O owner da plataforma é notificado via sistema de notificações

**Exemplos de causas:**
- Porte incompatível com faturamento (A2)
- MEI com operações multi-estado (A3)
- Faturamento descrito diverge do declarado em >2x (B1b)

### 4.3 Aprovado (`canProceed = true`)

**Condição:** Ausência de conflitos `critical` e `high`, e `diagnosticConfidence ≥ 15%`.

**Sub-estados:**
- **Aprovado limpo:** zero conflitos detectados
- **Aprovado com ressalvas:** presença de conflitos `medium` ou `low` — o usuário deve confirmar ciência no painel de revisão antes de avançar; o aceite é gravado em `consistency_checks.mediumAcknowledged`

---

## 5. Fluxos Completos

### 5.1 Fluxo de novo projeto (analyzePreview)

```
1. Usuário preenche formulário do perfil
2. Usuário clica em "Avançar"
3. Frontend dispara cpieV2.analyzePreview (sem persistência)
4. Motor executa E1→E5 (extração, completude, conflitos, IA, scores)
5. Frontend recebe CpieV2GateResult
6. Decisão de roteamento:
   ├── hard_block → exibe banner vermelho, bloqueia botão Avançar
   ├── soft_block_with_override → exibe painel de justificativa
   ├── canProceed=true + conflitos MEDIUM → exibe painel de revisão MEDIUM
   └── canProceed=true + sem conflitos → exibe banner verde
7. Usuário toma ação (corrige, justifica ou confirma)
8. Frontend chama createProject
9. createProject.onSuccess → frontend chama cpieV2.analyze (com persistência)
10. Se soft_block_with_override + justificativa → chama overrideSoftBlock
11. Se canProceed=true + mediumAcknowledgedByUser → chama acknowledgeMediumConflicts
12. Frontend chama fluxoV3.extractCnaes → abre modal de CNAEs
```

### 5.2 Fluxo de reanálise (projeto existente)

```
1. Usuário acessa projeto existente
2. PerfilEmpresaIntelligente carrega cpieV2.getByProject
3. Usuário clica em "Reexecutar análise"
4. Motor executa cpieV2.analyze (com persistência, substitui análise anterior)
5. Resultado atualiza o ScorePanel e os banners de status
```

---

## 6. Campos do Formulário

| Campo | Tipo | Obrigatório | Peso na completude |
|---|---|---|---|
| `cnpj` | string (14 dígitos) | Não | 1/17 |
| `companyType` | enum | Sim | 1/17 |
| `companySize` | enum | Sim | 1/17 |
| `annualRevenueRange` | enum | Sim | 1/17 |
| `taxRegime` | enum | Sim | 1/17 |
| `operationType` | enum | Sim | 1/17 |
| `clientType` | array | Sim | 1/17 |
| `multiState` | boolean | Sim | 1/17 |
| `hasMultipleEstablishments` | boolean | Sim | 1/17 |
| `hasImportExport` | boolean | Sim | 1/17 |
| `hasSpecialRegimes` | boolean | Sim | 1/17 |
| `paymentMethods` | array | Sim | 1/17 |
| `hasIntermediaries` | boolean | Sim | 1/17 |
| `hasTaxTeam` | boolean | Sim | 1/17 |
| `hasAudit` | boolean | Sim | 1/17 |
| `hasTaxIssues` | boolean | Sim | 1/17 |
| `description` | texto livre (≥ 20 chars) | Sim | 1/17 |

**Nota:** O `completenessScore` é calculado como `(campos_preenchidos / 17) × 100`.

---

## 7. Compatibilidade com CPIE v1

O CPIE v1 (`server/cpie.ts`) permanece intacto e disponível. As análises v2 são identificadas pelo campo `analysisVersion: "cpie-v2.0"` na tabela `consistency_checks`. O `getByProject` detecta automaticamente a versão e retorna o formato adequado. Projetos criados antes da migração para v2 continuam funcionando com as análises v1.
