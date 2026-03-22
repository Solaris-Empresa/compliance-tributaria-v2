# CPIE v2 — Matriz de Cenários

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado  
**Rastreabilidade:** `server/cpie-v2.test.ts` · `server/cpie-v2.ts`

---

## Convenções

Cada cenário define:
- **ID:** identificador único no formato `C-NNN`
- **Categoria:** tipo de cenário (Hard Block, Soft Block, Aprovado, Borda)
- **Regra(s) ativada(s):** IDs das regras do doc 04
- **Input:** campos do perfil que disparam o cenário
- **Output esperado:** `canProceed`, `blockType`, `overallLevel`, conflitos esperados
- **Teste Vitest:** nome do `it()` correspondente em `cpie-v2.test.ts`

---

## Grupo 1 — Hard Block (Conflitos Críticos)

### C-001 — MEI com faturamento acima do limite

| Campo | Valor |
|---|---|
| **ID** | C-001 |
| **Categoria** | Hard Block |
| **Regra ativada** | A1 |
| **companySize** | `mei` |
| **taxRegime** | `mei` |
| **annualRevenueRange** | `360000-4800000` (R$ 360K–4,8M) |
| **canProceed esperado** | `false` |
| **blockType esperado** | `hard_block` |
| **overallLevel esperado** | `critical` |
| **Conflito esperado** | A1 (critical) — regime incompatível com faturamento |
| **Teste Vitest** | `[C-001] MEI com faturamento acima do limite → hard_block` |

---

### C-002 — Simples Nacional com faturamento acima do limite

| Campo | Valor |
|---|---|
| **ID** | C-002 |
| **Categoria** | Hard Block |
| **Regra ativada** | A1 |
| **taxRegime** | `simples_nacional` |
| **annualRevenueRange** | `4800000-78000000` (R$ 4,8M–78M) |
| **canProceed esperado** | `false` |
| **blockType esperado** | `hard_block` |
| **overallLevel esperado** | `critical` |
| **Conflito esperado** | A1 (critical) |
| **Teste Vitest** | `[C-002] Simples Nacional faturamento acima limite → hard_block` |

---

### C-003 — MEI com importação/exportação

| Campo | Valor |
|---|---|
| **ID** | C-003 |
| **Categoria** | Hard Block |
| **Regra ativada** | A4 |
| **companySize** | `mei` |
| **taxRegime** | `mei` |
| **hasImportExport** | `true` |
| **annualRevenueRange** | `0-81000` |
| **canProceed esperado** | `false` |
| **blockType esperado** | `hard_block` |
| **overallLevel esperado** | `critical` |
| **Conflito esperado** | A4 (critical) |
| **Teste Vitest** | `[C-003] MEI com importação/exportação → hard_block` |

---

### C-004 — MEI com manufatura (operationType)

| Campo | Valor |
|---|---|
| **ID** | C-004 |
| **Categoria** | Hard Block |
| **Regra ativada** | C1 |
| **companySize** | `mei` |
| **taxRegime** | `mei` |
| **operationType** | `industria` |
| **annualRevenueRange** | `0-81000` |
| **canProceed esperado** | `false` |
| **blockType esperado** | `hard_block` |
| **overallLevel esperado** | `critical` |
| **Conflito esperado** | C1 (critical) |
| **Teste Vitest** | `[C-004] MEI com operationType industria → hard_block` |

---

### C-005 — Faturamento descrito 5× o declarado (B1)

| Campo | Valor |
|---|---|
| **ID** | C-005 |
| **Categoria** | Hard Block |
| **Regra ativada** | B1 |
| **description** | "Empresa com faturamento de R$ 50 milhões por ano, exportando para 10 países" |
| **annualRevenueRange** | `0-81000` (R$ 0–81K) |
| **companySize** | `mei` |
| **taxRegime** | `mei` |
| **canProceed esperado** | `false` |
| **blockType esperado** | `hard_block` |
| **overallLevel esperado** | `critical` |
| **Conflito esperado** | B1 (critical) + A1 (critical) |
| **Teste Vitest** | `[C-005] Faturamento descrito 5x declarado → hard_block` |

---

### C-006 — diagnosticConfidence < 15% por completude zero

| Campo | Valor |
|---|---|
| **ID** | C-006 |
| **Categoria** | Hard Block |
| **Regra ativada** | E5 (threshold) |
| **description** | "" (vazio) |
| **Todos os campos opcionais** | ausentes |
| **completenessScore esperado** | < 30% |
| **canProceed esperado** | `false` |
| **blockType esperado** | `hard_block` |
| **overallLevel esperado** | `critical` |
| **Teste Vitest** | `[C-006] Perfil vazio diagnosticConfidence<15 → hard_block` |

---

## Grupo 2 — Soft Block (Conflitos High)

### C-007 — Porte incompatível com faturamento (A2)

| Campo | Valor |
|---|---|
| **ID** | C-007 |
| **Categoria** | Soft Block |
| **Regra ativada** | A2 |
| **companySize** | `micro` |
| **annualRevenueRange** | `360000-4800000` (R$ 360K–4,8M) |
| **taxRegime** | `simples_nacional` |
| **canProceed esperado** | `false` |
| **blockType esperado** | `soft_block_with_override` |
| **overallLevel esperado** | `high` |
| **Conflito esperado** | A2 (high) |
| **Teste Vitest** | `[C-007] Micro empresa faturamento acima limite → soft_block` |

---

### C-008 — MEI com operações multi-estado (A3)

| Campo | Valor |
|---|---|
| **ID** | C-008 |
| **Categoria** | Soft Block |
| **Regra ativada** | A3 |
| **companySize** | `mei` |
| **taxRegime** | `mei` |
| **multiState** | `true` |
| **annualRevenueRange** | `0-81000` |
| **canProceed esperado** | `false` |
| **blockType esperado** | `soft_block_with_override` |
| **overallLevel esperado** | `high` |
| **Conflito esperado** | A3 (high) |
| **Teste Vitest** | `[C-008] MEI multi-estado → soft_block` |

---

### C-009 — Faturamento descrito 3× o declarado (B1b)

| Campo | Valor |
|---|---|
| **ID** | C-009 |
| **Categoria** | Soft Block |
| **Regra ativada** | B1b |
| **description** | "Empresa com faturamento de R$ 15 milhões por ano, atuando em todo o Brasil" |
| **annualRevenueRange** | `0-81000` (R$ 0–81K) |
| **companySize** | `micro` |
| **taxRegime** | `simples_nacional` |
| **canProceed esperado** | `false` |
| **blockType esperado** | `soft_block_with_override` |
| **overallLevel esperado** | `high` |
| **Conflito esperado** | B1b (high) |
| **Teste Vitest** | `[C-009] Faturamento descrito 3x declarado → soft_block` |

---

### C-010 — Operação indústria vs. serviços declarado (B2 high)

| Campo | Valor |
|---|---|
| **ID** | C-010 |
| **Categoria** | Soft Block |
| **Regra ativada** | B2 |
| **description** | "Empresa de consultoria de TI prestando serviços de desenvolvimento de software para clientes corporativos" |
| **operationType** | `industria` |
| **companySize** | `pequena` |
| **taxRegime** | `simples_nacional` |
| **canProceed esperado** | `false` |
| **blockType esperado** | `soft_block_with_override` |
| **overallLevel esperado** | `high` |
| **Conflito esperado** | B2 (high) |
| **Teste Vitest** | `[C-010] Operação serviços vs industria declarado → soft_block` |

---

### C-011 — Porte inferido 2 categorias acima do declarado (B4)

| Campo | Valor |
|---|---|
| **ID** | C-011 |
| **Categoria** | Soft Block |
| **Regra ativada** | B4 |
| **description** | "Empresa com faturamento de R$ 500 milhões por ano, presente em todos os estados do Brasil, com mais de 5.000 funcionários e exportações para 30 países" |
| **companySize** | `micro` |
| **taxRegime** | `lucro_real` |
| **annualRevenueRange** | `4800000-78000000` |
| **canProceed esperado** | `false` |
| **blockType esperado** | `soft_block_with_override` |
| **overallLevel esperado** | `high` |
| **Conflito esperado** | B4 (high) |
| **Teste Vitest** | `[C-011] Porte inferido grande vs micro declarado → soft_block` |

---

### C-012 — MEI com múltiplos canais de venda (C2)

| Campo | Valor |
|---|---|
| **ID** | C-012 |
| **Categoria** | Soft Block |
| **Regra ativada** | C2 |
| **companySize** | `mei` |
| **taxRegime** | `mei` |
| **description** | "Empresa que vende no varejo, atacado, e-commerce e marketplace, distribuindo para todo o Brasil" |
| **annualRevenueRange** | `0-81000` |
| **canProceed esperado** | `false` |
| **blockType esperado** | `soft_block_with_override` |
| **overallLevel esperado** | `high` |
| **Conflito esperado** | C2 (high) |
| **Teste Vitest** | `[C-012] MEI múltiplos canais de venda → soft_block` |

---

### C-013 — Simples Nacional + B2G + faturamento alto (C3)

| Campo | Valor |
|---|---|
| **ID** | C-013 |
| **Categoria** | Soft Block |
| **Regra ativada** | C3 |
| **taxRegime** | `simples_nacional` |
| **clientType** | `["b2g"]` |
| **description** | "Empresa fornecedora de serviços para prefeituras e órgãos federais, com faturamento de R$ 10 milhões por ano" |
| **annualRevenueRange** | `4800000-78000000` |
| **companySize** | `pequena` |
| **canProceed esperado** | `false` |
| **blockType esperado** | `soft_block_with_override` |
| **overallLevel esperado** | `high` |
| **Conflito esperado** | C3 (high) |
| **Teste Vitest** | `[C-013] Simples Nacional B2G faturamento alto → soft_block` |

---

## Grupo 3 — Aprovado com Ressalvas (MEDIUM)

### C-014 — Operação levemente incompatível (B2 medium)

| Campo | Valor |
|---|---|
| **ID** | C-014 |
| **Categoria** | Aprovado com Ressalvas |
| **Regra ativada** | B2 (medium) |
| **description** | "Empresa de comércio varejista de roupas com pequena linha de produção própria" |
| **operationType** | `servicos` |
| **companySize** | `pequena` |
| **taxRegime** | `simples_nacional` |
| **canProceed esperado** | `true` |
| **blockType esperado** | `undefined` |
| **overallLevel esperado** | `medium` |
| **Conflito esperado** | B2 (medium) |
| **Teste Vitest** | `[C-014] Operação levemente incompatível → canProceed=true medium` |

---

### C-015 — B2G improvável para o setor (B3)

| Campo | Valor |
|---|---|
| **ID** | C-015 |
| **Categoria** | Aprovado com Ressalvas |
| **Regra ativada** | B3 |
| **description** | "Salão de beleza atendendo clientes particulares no bairro" |
| **clientType** | `["b2g"]` |
| **companySize** | `micro` |
| **taxRegime** | `simples_nacional` |
| **canProceed esperado** | `true` |
| **blockType esperado** | `undefined` |
| **overallLevel esperado** | `medium` |
| **Conflito esperado** | B3 (medium) |
| **Teste Vitest** | `[C-015] B2G improvável setor beleza → canProceed=true medium` |

---

### C-016 — Empresa média faturamento R$12M/ano lucro real

| Campo | Valor |
|---|---|
| **ID** | C-016 |
| **Categoria** | Aprovado Limpo |
| **Regra ativada** | Nenhuma |
| **companySize** | `media` |
| **taxRegime** | `lucro_real` |
| **annualRevenueRange** | `4800000-78000000` (R$ 4,8M–78M) |
| **description** | "Cervejaria artesanal com faturamento de R$ 1 milhão por mês, presente em todas as capitais do sul do Brasil, lucro real" |
| **canProceed esperado** | `true` |
| **blockType esperado** | `undefined` |
| **overallLevel esperado** | `low` ou `none` |
| **Conflito esperado** | Nenhum conflito de porte (filtro de falso positivo ativo) |
| **Teste Vitest** | `[C-016] Empresa media faturamento 12M lucro real → canProceed=true sem conflito porte` |

---

### C-017 — Empresa pequena com importação/exportação

| Campo | Valor |
|---|---|
| **ID** | C-017 |
| **Categoria** | Aprovado Limpo |
| **Regra ativada** | Nenhuma |
| **companySize** | `pequena` |
| **taxRegime** | `simples_nacional` |
| **hasImportExport** | `true` |
| **annualRevenueRange** | `360000-4800000` |
| **canProceed esperado** | `true` |
| **blockType esperado** | `undefined` |
| **Teste Vitest** | `[C-017] Empresa pequena com importação → canProceed=true` |

---

## Grupo 4 — Aprovado Limpo

### C-018 — Perfil ideal MEI

| Campo | Valor |
|---|---|
| **ID** | C-018 |
| **Categoria** | Aprovado Limpo |
| **companySize** | `mei` |
| **taxRegime** | `mei` |
| **annualRevenueRange** | `0-81000` |
| **hasImportExport** | `false` |
| **multiState** | `false` |
| **operationType** | `servicos` |
| **description** | "Freelancer de design gráfico atendendo clientes locais, faturamento de R$ 5.000 por mês" |
| **canProceed esperado** | `true` |
| **blockType esperado** | `undefined` |
| **overallLevel esperado** | `low` ou `none` |
| **Teste Vitest** | `[C-018] Perfil ideal MEI → canProceed=true limpo` |

---

### C-019 — Empresa grande lucro real

| Campo | Valor |
|---|---|
| **ID** | C-019 |
| **Categoria** | Aprovado Limpo |
| **companySize** | `grande` |
| **taxRegime** | `lucro_real` |
| **annualRevenueRange** | `78000000+` |
| **hasImportExport** | `true` |
| **multiState** | `true` |
| **description** | "Multinacional brasileira de manufatura com mais de 10.000 funcionários, exportando para 50 países, faturamento de R$ 2 bilhões por ano" |
| **canProceed esperado** | `true` |
| **blockType esperado** | `undefined` |
| **Teste Vitest** | `[C-019] Empresa grande lucro real → canProceed=true limpo` |

---

### C-020 — Empresa pequena Simples Nacional B2B

| Campo | Valor |
|---|---|
| **ID** | C-020 |
| **Categoria** | Aprovado Limpo |
| **companySize** | `pequena` |
| **taxRegime** | `simples_nacional` |
| **annualRevenueRange** | `360000-4800000` |
| **clientType** | `["b2b"]` |
| **operationType** | `servicos` |
| **description** | "Agência de marketing digital prestando serviços para empresas de médio porte, faturamento de R$ 2 milhões por ano" |
| **canProceed esperado** | `true` |
| **blockType esperado** | `undefined` |
| **Teste Vitest** | `[C-020] Empresa pequena Simples B2B → canProceed=true limpo` |

---

## Grupo 5 — Cenários de Borda e Regressão

### C-021 — MEI no limite exato do faturamento (borda)

| Campo | Valor |
|---|---|
| **ID** | C-021 |
| **Categoria** | Borda |
| **Regra ativada** | Nenhuma (borda) |
| **companySize** | `mei` |
| **taxRegime** | `mei` |
| **annualRevenueRange** | `0-81000` (limite exato) |
| **canProceed esperado** | `true` |
| **blockType esperado** | `undefined` |
| **Nota** | R$ 81.000 é o limite máximo do MEI — deve ser aceito |
| **Teste Vitest** | `[C-021] MEI no limite exato faturamento → canProceed=true` |

---

### C-022 — Empresa média no limite superior (borda)

| Campo | Valor |
|---|---|
| **ID** | C-022 |
| **Categoria** | Borda |
| **Regra ativada** | Nenhuma (borda) |
| **companySize** | `media` |
| **taxRegime** | `lucro_presumido` |
| **annualRevenueRange** | `78000000+` (próximo de R$ 300M) |
| **canProceed esperado** | `true` |
| **blockType esperado** | `undefined` |
| **Nota** | R$ 300M é o limite máximo do porte médio — deve ser aceito |
| **Teste Vitest** | `[C-022] Empresa media no limite superior → canProceed=true` |

---

### C-023 — Dois conflitos high simultâneos

| Campo | Valor |
|---|---|
| **ID** | C-023 |
| **Categoria** | Soft Block |
| **Regra ativada** | A2 + A3 |
| **companySize** | `micro` |
| **taxRegime** | `simples_nacional` |
| **annualRevenueRange** | `360000-4800000` |
| **multiState** | `true` |
| **canProceed esperado** | `false` |
| **blockType esperado** | `soft_block_with_override` |
| **overallLevel esperado** | `high` |
| **Conflito esperado** | A2 (high) + A3 não ativa (A3 é para MEI) |
| **Teste Vitest** | `[C-023] Dois conflitos high simultâneos → soft_block` |

---

### C-024 — Conflito crítico + conflito high (crítico prevalece)

| Campo | Valor |
|---|---|
| **ID** | C-024 |
| **Categoria** | Hard Block |
| **Regra ativada** | A1 + A2 |
| **companySize** | `micro` |
| **taxRegime** | `mei` |
| **annualRevenueRange** | `360000-4800000` |
| **canProceed esperado** | `false` |
| **blockType esperado** | `hard_block` |
| **overallLevel esperado** | `critical` |
| **Nota** | A1 (critical) prevalece sobre A2 (high) |
| **Teste Vitest** | `[C-024] Crítico + high → hard_block prevalece` |

---

### C-025 — Override válido (justificativa ≥ 50 chars)

| Campo | Valor |
|---|---|
| **ID** | C-025 |
| **Categoria** | Override |
| **Pré-condição** | C-007 (soft_block) |
| **justification** | "A empresa está em processo de transição de porte e o faturamento atual já ultrapassou o limite da microempresa conforme balanço recente." |
| **Resultado esperado** | `overridden: true`, `acceptedRisk: 1` gravado no banco |
| **Teste Vitest** | `[C-025] Override válido justificativa ≥50 chars → aceito` |

---

### C-026 — Override rejeitado (justificativa < 50 chars)

| Campo | Valor |
|---|---|
| **ID** | C-026 |
| **Categoria** | Override |
| **Pré-condição** | C-007 (soft_block) |
| **justification** | "Empresa em transição." (21 chars) |
| **Resultado esperado** | Erro de validação — justificativa muito curta |
| **Teste Vitest** | `[C-026] Override rejeitado justificativa <50 chars → erro` |

---

### C-027 — Override rejeitado em hard_block

| Campo | Valor |
|---|---|
| **ID** | C-027 |
| **Categoria** | Override |
| **Pré-condição** | C-001 (hard_block) |
| **justification** | "Justificativa longa com mais de 50 caracteres para tentar o override." |
| **Resultado esperado** | Erro FORBIDDEN — hard_block não pode ser ignorado |
| **Teste Vitest** | `[C-027] Override em hard_block → FORBIDDEN` |

---

### C-028 — Aceite MEDIUM registrado no banco

| Campo | Valor |
|---|---|
| **ID** | C-028 |
| **Categoria** | Aceite MEDIUM |
| **Pré-condição** | C-014 (canProceed=true com MEDIUM) |
| **Resultado esperado** | `mediumAcknowledged: 1` gravado no banco |
| **Teste Vitest** | `[C-028] Aceite MEDIUM registrado no banco` |

---

### C-029 — Falso positivo de porte filtrado (R$1M/mês + média)

| Campo | Valor |
|---|---|
| **ID** | C-029 |
| **Categoria** | Regressão |
| **Regra ativada** | Nenhuma (filtro ativo) |
| **companySize** | `media` |
| **taxRegime** | `lucro_presumido` |
| **annualRevenueRange** | `4800000-78000000` |
| **description** | "Cervejaria artesanal com faturamento de R$ 1 milhão por mês, presença em todas as capitais do sul do Brasil, importação/exportação, lucro presumido" |
| **canProceed esperado** | `true` |
| **Conflito de porte esperado** | Nenhum (filtro de falso positivo deve remover) |
| **Teste Vitest** | `[C-029] Falso positivo porte filtrado R$1M mês media → sem conflito porte` |

---

### C-030 — Falha da IA resulta em hard_block

| Campo | Valor |
|---|---|
| **ID** | C-030 |
| **Categoria** | Resiliência |
| **Simulação** | Mock da IA retornando erro/timeout |
| **canProceed esperado** | `false` |
| **blockType esperado** | `hard_block` |
| **Conflito esperado** | `AI-ERR` (critical) |
| **Nota** | Falha da IA nunca resulta em aprovação silenciosa |
| **Teste Vitest** | `[C-030] Falha da IA → hard_block por segurança` |

---

### C-031 — Empresa média com faturamento R$36M/ano (caso real)

| Campo | Valor |
|---|---|
| **ID** | C-031 |
| **Categoria** | Regressão |
| **companySize** | `media` |
| **taxRegime** | `lucro_real` |
| **annualRevenueRange** | `4800000-78000000` |
| **description** | "Cervejaria artesanal com faturamento de R$ 3 milhões por mês, presença em todas as capitais do sul do Brasil, lucro real" |
| **canProceed esperado** | `true` |
| **Nota** | R$36M/ano está dentro do limite de porte médio (R$300M) — sem conflito de porte |
| **Teste Vitest** | `[C-031] Empresa media faturamento 36M → canProceed=true sem conflito porte` |

---

### C-032 — Regime incompatível com porte (Lucro Real + MEI)

| Campo | Valor |
|---|---|
| **ID** | C-032 |
| **Categoria** | Hard Block |
| **Regra ativada** | A1 + A4 (potencial) |
| **companySize** | `mei` |
| **taxRegime** | `lucro_real` |
| **annualRevenueRange** | `0-81000` |
| **canProceed esperado** | `false` |
| **blockType esperado** | `hard_block` |
| **Nota** | Lucro Real é incompatível com MEI (limite de faturamento) |
| **Teste Vitest** | `[C-032] Lucro Real com MEI → hard_block` |

---

### C-033 — Empresa grande com Simples Nacional

| Campo | Valor |
|---|---|
| **ID** | C-033 |
| **Categoria** | Hard Block |
| **Regra ativada** | A1 |
| **companySize** | `grande` |
| **taxRegime** | `simples_nacional` |
| **annualRevenueRange** | `78000000+` |
| **canProceed esperado** | `false` |
| **blockType esperado** | `hard_block` |
| **Conflito esperado** | A1 (critical) — Simples Nacional incompatível com faturamento |
| **Teste Vitest** | `[C-033] Empresa grande Simples Nacional → hard_block` |

---

### C-034 — Microempresa com faturamento no limite (borda)

| Campo | Valor |
|---|---|
| **ID** | C-034 |
| **Categoria** | Borda |
| **companySize** | `micro` |
| **taxRegime** | `simples_nacional` |
| **annualRevenueRange** | `0-360000` (limite exato) |
| **canProceed esperado** | `true` |
| **blockType esperado** | `undefined` |
| **Nota** | R$ 360K é o limite máximo da microempresa — deve ser aceito |
| **Teste Vitest** | `[C-034] Microempresa no limite exato → canProceed=true` |

---

### C-035 — Empresa pequena com faturamento no limite (borda)

| Campo | Valor |
|---|---|
| **ID** | C-035 |
| **Categoria** | Borda |
| **companySize** | `pequena` |
| **taxRegime** | `simples_nacional` |
| **annualRevenueRange** | `360000-4800000` (limite exato) |
| **canProceed esperado** | `true` |
| **blockType esperado** | `undefined` |
| **Nota** | R$ 4,8M é o limite máximo da empresa pequena — deve ser aceito |
| **Teste Vitest** | `[C-035] Empresa pequena no limite exato → canProceed=true` |

---

## Resumo da Matriz

| Categoria | Quantidade | IDs |
|---|---|---|
| Hard Block | 9 | C-001 a C-006, C-024, C-032, C-033 |
| Soft Block | 7 | C-007 a C-013, C-023 |
| Aprovado com Ressalvas | 2 | C-014, C-015 |
| Aprovado Limpo | 5 | C-016 a C-020 |
| Borda | 4 | C-021, C-022, C-034, C-035 |
| Override | 3 | C-025, C-026, C-027 |
| Aceite MEDIUM | 1 | C-028 |
| Regressão/Resiliência | 4 | C-029, C-030, C-031 |
| **Total** | **35** | C-001 a C-035 |

---

## Mapeamento Cenário → Regra

| Regra | Cenários que testam |
|---|---|
| A1 | C-001, C-002, C-032, C-033 |
| A2 | C-007, C-023, C-024 |
| A3 | C-008 |
| A4 | C-003 |
| B1 | C-005 |
| B1b | C-009 |
| B2 (high) | C-010 |
| B2 (medium) | C-014 |
| B3 | C-015 |
| B4 | C-011 |
| C1 | C-004 |
| C2 | C-012 |
| C3 | C-013 |
| Filtro falso positivo | C-016, C-029, C-031 |
| Override | C-025, C-026, C-027 |
| Aceite MEDIUM | C-028 |
| Resiliência IA | C-030 |
| Borda | C-021, C-022, C-034, C-035 |
