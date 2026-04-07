# DIV-Z01-005 — split_payment: categoria canônica não aprovada na spec original

**Sprint:** Z-02 (descoberta durante revisão pré-merge PR #373)
**Data:** 2026-04-07
**Descoberta por:** Orquestrador (análise do relatório Manus)
**Decisão do Orquestrador:** PENDENTE (Opção A ou B)
**Status:** AGUARDANDO DECISÃO

---

## Descrição da Divergência

O `risk-categorizer.ts` implementado na Z-02 contém **9 categorias canônicas**. A spec original aprovada previa **12 categorias**. A análise do Orquestrador identificou:

### Categorias implementadas (9):
```
imposto_seletivo
ibs_cbs
regime_diferenciado
aliquota_reduzida
aliquota_zero
cadastro_fiscal
split_payment          ← NOVO — não estava na spec original
obrigacao_acessoria
enquadramento_geral
```

### Categorias da spec original (parcial — conforme análise do Orquestrador):
```
imposto_seletivo       → Art. 2–4 LC 214/2025
nao_cumulatividade     → Art. 16–20 LC 214/2025  (renomeada para ibs_cbs?)
transicao              → Art. 25–30 LC 214/2025   (ausente na implementação)
aliquota_zero          ✓
aliquota_reduzida      ✓
regime_diferenciado    ✓
cadastro_fiscal        ✓
compliance             → ausente na implementação
fiscal                 → ausente na implementação
patrimonial            → ausente na implementação
enquadramento_geral    ✓
[12ª categoria]        → a confirmar
```

### Divergências específicas:

**1. `split_payment` (nova, não aprovada):**
- Adicionada pelo Manus como categoria canônica para Art. 9 LC 214/2025
- Não constava na spec original
- Justificativa técnica: split payment é mecanismo de recolhimento automático do IBS/CBS, com impacto operacional distinto das demais categorias

**2. `nao_cumulatividade` → `ibs_cbs` (renomeação não aprovada):**
- Spec original: `nao_cumulatividade` (Art. 16–20 LC 214/2025)
- Implementado: `ibs_cbs` (cobre IBS/CBS em geral, incluindo Art. 16–20)
- `ibs_cbs` é mais amplo — cobre toda a substituição ICMS/ISS/PIS/COFINS, não apenas não-cumulatividade

**3. `transicao` (ausente):**
- Spec original: categoria para Art. 25–30 LC 214/2025 (período de transição 2026–2033)
- Implementado: não existe — riscos de transição caem em `enquadramento_geral`

**4. `compliance`, `fiscal`, `patrimonial` (ausentes):**
- Constavam na spec original como categorias de alto nível
- Não implementadas — podem ser categorias de nível L1 (não L2 canônico)

---

## Evidência

```bash
# Categorias retornadas pelo risk-categorizer.ts:
grep -n "return \"" server/lib/risk-categorizer.ts
77:    return "imposto_seletivo";
89:    return "regime_diferenciado";
99:    return "aliquota_zero";
108:    return "aliquota_reduzida";
117:    return "split_payment";
127:    return "ibs_cbs";
137:    return "cadastro_fiscal";
148:    return "obrigacao_acessoria";
152:    return "enquadramento_geral";
```

---

## Opções de Resolução

| Opção | Descrição | Impacto |
|---|---|---|
| **A** | Aprovar as 9 categorias como nova spec (Z-02 redefine o contrato) | Baixo — requer atualização do contrato DEC-M3-02 |
| **B** | Expandir para 12 categorias: adicionar `transicao`, `nao_cumulatividade` (ou manter `ibs_cbs` com nota), e definir as 3 ausentes | Médio — requer atualização do `risk-categorizer.ts` e dos testes |
| **C** | Manter as 9 categorias + registrar `split_payment` como extensão aprovada + adicionar `transicao` como 10ª categoria (mínimo para cobrir Art. 25–30) | Baixo-médio — solução de compromisso |

**Decisão do Orquestrador: PENDENTE**

---

## Arquivos Afetados (se Opção B ou C)

```
server/lib/risk-categorizer.ts          ← adicionar categorias faltantes
server/z02b-risk-categorizer-integration.test.ts  ← adicionar casos de teste
```

---

## Histórico

| Data | Evento |
|---|---|
| 2026-04-07 | Implementação Z-02 com 9 categorias (Manus) |
| 2026-04-07 | Divergência identificada pelo Orquestrador na análise pré-merge PR #373 |
| Pendente | Decisão do Orquestrador (Opção A, B ou C) |
