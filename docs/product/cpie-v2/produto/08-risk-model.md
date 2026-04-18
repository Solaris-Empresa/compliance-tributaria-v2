# CPIE v2 — Risk Model

**Versão:** 1.0  
**Data:** 2026-03-22  
**Status:** Aprovado  
**Rastreabilidade:** `server/cpie-v2.ts` · `server/routers/cpieV2Router.ts` · `drizzle/schema.ts`

---

## 1. Propósito

Este documento classifica os riscos associados a cada tipo de inconsistência detectada pelo CPIE v2, definindo o impacto no diagnóstico tributário, no compliance e a relação com os mecanismos de bloqueio (`hard_block` / `soft_block`).

---

## 2. Classificação de Risco por Tipo de Inconsistência

### 2.1 Nível CRÍTICO — Risco de Inviabilidade Jurídica

Inconsistências que tornam a empresa **juridicamente impossível** como descrita. O diagnóstico tributário baseado nesse perfil seria completamente inválido.

| Regra | Inconsistência | Risco Tributário | Risco Compliance | Bloqueio |
|---|---|---|---|---|
| A1 | Regime tributário incompatível com faturamento | Diagnóstico de regime errado → obrigações fiscais incorretas | Autuação por enquadramento indevido | `hard_block` |
| A4 | MEI com importação/exportação | Cálculo de impostos de importação impossível | Vedação legal — MEI não pode operar comércio exterior | `hard_block` |
| B1 | Faturamento descrito >4× o declarado | Análise baseada em faturamento errado → regime inadequado | Subfaturamento declarado pode configurar sonegação | `hard_block` |
| C1 | MEI com manufatura | CNAE industrial incompatível com MEI → diagnóstico de IPI/ICMS inválido | Vedação legal — MEI não pode exercer atividade industrial | `hard_block` |
| AI-ERR | Falha na arbitragem IA | Análise sem validação de coerência | Risco sistêmico — análise não confiável | `hard_block` |

**Impacto no diagnóstico tributário:** qualquer diagnóstico produzido com perfil de nível CRÍTICO é inválido e pode induzir o cliente a decisões tributárias erradas, com potencial de autuação fiscal.

**Impacto no compliance:** perfis com inconsistências críticas indicam dados incorretos que, se usados em declarações fiscais, podem configurar irregularidade perante a Receita Federal.

---

### 2.2 Nível ALTO — Risco de Diagnóstico Distorcido

Inconsistências que não tornam a empresa impossível, mas distorcem significativamente o diagnóstico tributário. O diagnóstico pode ser tecnicamente válido mas incorreto para a realidade da empresa.

| Regra | Inconsistência | Risco Tributário | Risco Compliance | Bloqueio |
|---|---|---|---|---|
| A2 | Porte incompatível com faturamento | Análise de benefícios fiscais por porte incorreta | Enquadramento incorreto em programas de benefício | `soft_block_with_override` |
| A3 | MEI com operações multi-estado | ICMS multi-estado não aplicável ao MEI | Obrigações acessórias estaduais incorretas | `soft_block_with_override` |
| B1b | Faturamento descrito 2–4× o declarado | Regime tributário pode ser inadequado | Subfaturamento potencial | `soft_block_with_override` |
| B2 (high) | Operação industria↔serviços | IPI vs. ISS — tributos completamente diferentes | CNAE incorreto → obrigações acessórias erradas | `soft_block_with_override` |
| B4 | Porte inferido vs. declarado (≥2 categorias) | Benefícios fiscais por porte calculados incorretamente | Enquadramento em Simples Nacional pode ser indevido | `soft_block_with_override` |
| C2 | MEI com múltiplos canais de venda | Estrutura de faturamento incompatível com MEI | Limite de faturamento MEI provavelmente ultrapassado | `soft_block_with_override` |
| C3 | Simples Nacional + B2G + faturamento alto | Regime incompatível com volume de contratos públicos | Vedação ao Simples Nacional | `soft_block_with_override` |

**Impacto no diagnóstico tributário:** o diagnóstico pode recomendar o regime tributário errado, calcular benefícios fiscais incorretamente ou sugerir CNAEs inadequados.

**Impacto no compliance:** o cliente pode adotar obrigações acessórias incorretas, perder benefícios fiscais legítimos ou incorrer em enquadramento indevido.

---

### 2.3 Nível MÉDIO — Risco de Imprecisão

Inconsistências que introduzem imprecisão no diagnóstico, mas não o invalidam. O diagnóstico pode ser usado com ressalvas.

| Regra | Inconsistência | Risco Tributário | Risco Compliance | Bloqueio |
|---|---|---|---|---|
| B2 (medium) | Operação levemente incompatível | Diagnóstico pode não cobrir todos os tributos relevantes | CNAE secundário pode estar incorreto | Nenhum (`canProceed=true`) |
| B3 | B2G improvável para o setor | Análise de contratos públicos pode ser desnecessária | Obrigações acessórias de contratos públicos podem ser irrelevantes | Nenhum (`canProceed=true`) |
| AI-xxx (medium) | Contradição composta moderada | Diagnóstico pode ter lacunas em áreas específicas | Risco pontual de obrigação não identificada | Nenhum (`canProceed=true`) |

**Impacto no diagnóstico tributário:** o diagnóstico é válido mas pode ter lacunas ou imprecisões em áreas específicas. Recomenda-se revisão pelo consultor tributário.

**Impacto no compliance:** risco baixo, mas o consultor deve verificar os pontos sinalizados durante a análise.

---

### 2.4 Nível BAIXO — Risco Informativo

Inconsistências menores que não afetam materialmente o diagnóstico. Servem como alertas para o consultor.

| Tipo | Inconsistência | Risco Tributário | Risco Compliance | Bloqueio |
|---|---|---|---|---|
| AI-xxx (low) | Divergência menor detectada pela IA | Impacto mínimo no diagnóstico | Ponto de atenção para o consultor | Nenhum (`canProceed=true`) |

---

## 3. Relação com Hard Block / Soft Block

### 3.1 Critério de Hard Block

```
Nível CRÍTICO → hard_block (sem exceção)
OU
diagnosticConfidence < 15% → hard_block
```

O `hard_block` é aplicado quando o risco de produzir um diagnóstico tributário incorreto é tão alto que nenhuma justificativa pode mitigá-lo. A empresa precisaria corrigir os dados antes de qualquer análise.

### 3.2 Critério de Soft Block

```
Nível ALTO (sem nível CRÍTICO) → soft_block_with_override
```

O `soft_block_with_override` reconhece que inconsistências de nível ALTO podem ter explicações legítimas (ex: empresa em transição de porte, dados provisórios, situação atípica). A justificativa formal registra a ciência do risco e a responsabilidade do usuário.

### 3.3 Critério de Aprovação com Ressalvas

```
Nível MÉDIO ou BAIXO (sem ALTO ou CRÍTICO) → canProceed=true com revisão obrigatória
```

O aceite de conflitos MEDIUM é registrado em `consistency_checks.mediumAcknowledged` como trilha de auditoria.

---

## 4. Cenários Críticos vs. Aceitáveis

### 4.1 Cenários Críticos (nunca aceitar sem correção)

| Cenário | Por que é crítico |
|---|---|
| MEI com faturamento de R$ 500K/ano | Juridicamente impossível — MEI tem limite de R$ 81K/ano |
| Simples Nacional com faturamento de R$ 10M/ano | Juridicamente impossível — limite é R$ 4,8M/ano |
| MEI com importação/exportação | Vedação legal expressa |
| MEI com manufatura | Vedação por CNAE e limite de faturamento |
| Empresa com `diagnosticConfidence = 0%` | Perfil completamente incoerente — qualquer diagnóstico seria inválido |

### 4.2 Cenários Aceitáveis com Justificativa (soft_block)

| Cenário | Por que é aceitável com justificativa |
|---|---|
| Empresa média com faturamento de R$ 36M/ano declarando Lucro Real | Tecnicamente possível — pode estar em transição ou ter razão estratégica |
| Empresa pequena com operações multi-estado | Possível — pode ter filiais em outros estados |
| Faturamento descrito 3× o declarado | Pode ser que a descrição mencione faturamento do grupo, não da empresa |
| Operação de serviços com menção a produtos físicos | Pode ser empresa de serviços com venda de produtos como atividade secundária |

### 4.3 Cenários Aceitáveis sem Justificativa (MEDIUM)

| Cenário | Por que é aceitável |
|---|---|
| Empresa média com faturamento de R$ 12M/ano | Dentro dos limites oficiais — sem conflito real |
| Empresa de serviços com menção a "clientes governamentais" sem declarar B2G | Pode ser que B2G seja atividade secundária não declarada |
| Faturamento descrito 1,5× o declarado | Divergência dentro da margem de imprecisão da IA |

---

## 5. Impacto no Score de Risco

O `diagnosticConfidence` é o indicador primário de risco:

| `diagnosticConfidence` | Nível de Risco | Interpretação |
|---|---|---|
| 85–100% | Baixo | Perfil altamente confiável para diagnóstico |
| 70–84% | Moderado-Baixo | Perfil confiável com pequenas ressalvas |
| 50–69% | Moderado | Perfil utilizável com revisão do consultor |
| 30–49% | Moderado-Alto | Perfil com inconsistências significativas |
| 15–29% | Alto | Perfil com inconsistências graves — override necessário |
| < 15% | Crítico | Perfil inviável — bloqueio absoluto |

---

## 6. Rastreabilidade de Risco na Trilha de Auditoria

Cada decisão de risco é registrada na tabela `consistency_checks`:

| Campo | O que registra |
|---|---|
| `overallLevel` | Nível de risco geral da análise |
| `criticalCount` | Número de conflitos críticos |
| `highCount` | Número de conflitos altos |
| `mediumCount` | Número de conflitos médios |
| `acceptedRisk` | Se o usuário fez override de soft_block |
| `acceptedRiskReason` | Justificativa do override + log completo |
| `acceptedRiskAt` | Timestamp do override |
| `acceptedRiskBy` | ID do usuário que fez o override |
| `mediumAcknowledged` | Se o usuário confirmou ciência de conflitos MEDIUM |
