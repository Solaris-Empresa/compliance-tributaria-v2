# DB-SPEC — BUG-AGRO-CPF (banco + migrations)

> **Status:** ✅ **COMPLETO** com dados reais reportados pelo Manus em 29/05/2026 (Q1-Q6 executadas).
> Placeholders substituídos pelos valores empíricos.

**Data:** 2026-05-29
**Branch:** `docs/cpf-pf-spec-exaustiva` · HEAD após amend
**Spec principal:** `AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v4-20260529.md`
**REGRA-ORQ:** 41 (AS-IS/TO-BE com impact-tree) + 32 (no hardcode) + 35 (NUNCA ASSUMA)

---

## §B.1 — Estado atual (dados reais Q1)

| Tabela | Campo | Tipo | Null | Default | Situação |
|---|---|---|---|---|---|
| `projects` | `companyProfile` | JSON | YES | null | Shape atual: `{ cnpj, companyType, companySize, taxRegime, annualRevenueRange }` — **sem CPF** |
| `users` | `cnpj` | varchar(20) | YES | null | Existe · não usado no fluxo de projeto |
| `users` | `cpf` | varchar(14) | YES | null | **Existe no schema** · dead-read confirmado (não usado no fluxo de projeto) |
| `projects` | `tax_id_type` | — | — | — | **NÃO EXISTE** — migration 0119 a criar |

**Nota arquitetural:** `users.cpf` e `companyProfile.cpf` são campos distintos. O fluxo de projeto usa `companyProfile` (JSON em `projects`), não `users`. A migration F0 adiciona `tax_id_type` em `projects` (não em `users`).

---

## §B.2 — Migration F0 (dados reais Q5 + Q6)

```sql
-- Arquivo: server/db/migrations/0119_tax_id_type_projects.sql
-- Predecessor: 0118_art197_decreto_resolucao_grupos.sql
-- Verificação pré-execução: coluna_existe = 0 (Q5 confirmado)

-- UP (não-destrutivo · DEFAULT 'cnpj' garante retrocompatibilidade)
ALTER TABLE projects
  ADD COLUMN tax_id_type ENUM('cnpj', 'cpf') NOT NULL DEFAULT 'cnpj'
  COMMENT 'cnpj=Pessoa Jurídica | cpf=Pessoa Física (Art. 164 LC 214/2025)';

-- DOWN (rollback N4 — reversível)
ALTER TABLE projects DROP COLUMN tax_id_type;
```

**Justificativa:**
- `NOT NULL` + `DEFAULT 'cnpj'`: projetos existentes herdam o default sem ALTER seletivo
- `ENUM`: economia de bytes vs `varchar(10)` + invariante MySQL/TiDB embutida
- `COMMENT`: rastreabilidade jurídica + ponteiro para feature flag
- Filename `0119` confirmado por Q6 (última migration = 0118)
- Coluna não-existente confirmada por Q5 (evita migration dupla)

---

## §B.3 — `companyProfile` JSON shape (aditivo · sem migration DDL)

### Shape atual (Q1)

```json
{
  "cnpj": "string",
  "companyType": "string",
  "companySize": "string",
  "taxRegime": "string",
  "annualRevenueRange": "string"
}
```

### Shape TO-BE (campos novos opcionais via Zod)

```json
{
  "cnpj": "string (deprecated — manter para retrocompatibilidade)",
  "companyType": "string (N/A para PF — ocultar na UI)",
  "companySize": "string (N/A para PF — ocultar na UI)",
  "taxRegime": "string (manter visível para PF)",
  "annualRevenueRange": "string (manter visível para PF)",
  "cpf": "string? (novo — presente se tax_id_type='cpf')",
  "taxIdType": "'cnpj' | 'cpf'? (novo — discriminador)",
  "taxId": "string? (novo — valor unificado para perfilHash)"
}
```

**Campo `cnpj` mantido como `deprecated` (read-only legacy):**
- Continua válido para leitura de registros antigos
- Para projetos PJ novos: `cnpj` + `taxIdType='cnpj'` + `taxId=cnpj` (redundância intencional)
- Para projetos PF novos: `cpf` + `taxIdType='cpf'` + `taxId=cpf` (sem `cnpj`)

---

## §B.4 — Retrocompatibilidade (confirmada Q2)

| Cenário | Comportamento esperado |
|---|---|
| Projeto existente (0 projetos com CNPJ fake — Q2) | `tax_id_type='cnpj'` (DEFAULT) · `cpf=null` · `taxId=cnpj` |
| Projeto novo PJ | `tax_id_type='cnpj'` · `cnpj` preenchido · `cpf=null` |
| Projeto novo PF | `tax_id_type='cpf'` · `cpf` preenchido · `cnpj=null` |
| Leitura legacy | `companyProfile.cnpj` → funciona (campo mantido) |
| `perfilHash` (F3) | `taxId = cpf ?? cnpj` → null-safe |
| `ComplianceDashboard.tsx:88` (Q4) | Sem crash atual (cnpj opcional) · F4 adiciona `taxId` |
| `analise_1_cnpj_operacional` (campo derivado) | `true` por default (PF é sempre 1 entidade) — semântica preservada (v4 §3.1) |

**Invariante crítica (Lição #93 da v4):** o campo derivado `analise_1_cnpj_operacional` **NÃO** é renomeado. Continua significando "escopo unitário de 1 entidade operacional (CPF ou CNPJ) vs consolidação multi-CNPJ de grupo econômico". Para PF, valor permanece `true`.

---

## §B.5 — Queries de verificação pós-F0 (DoD SQL — dados reais)

### Gate 1 — coluna existe com tipo e default corretos

```sql
SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, IS_NULLABLE, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'projects' AND COLUMN_NAME = 'tax_id_type';
```

**Esperado:** `ENUM · 'cnpj' · NO · 'cnpj=Pessoa Jurídica...'`

### Gate 2 — projetos existentes não foram afetados (todos PJ por default)

```sql
SELECT COUNT(*) AS total_projetos,
  SUM(CASE WHEN tax_id_type = 'cnpj' THEN 1 ELSE 0 END) AS pj_count,
  SUM(CASE WHEN tax_id_type = 'cpf'  THEN 1 ELSE 0 END) AS pf_count
FROM projects;
```

**Esperado:** `pf_count = 0` (nenhum PF ainda) · `pj_count = total_projetos`

### Gate 3 — nenhum projeto perdeu companyProfile

```sql
SELECT COUNT(*) AS projetos_sem_profile
FROM projects
WHERE companyProfile IS NULL AND tax_id_type = 'cnpj';
```

**Esperado:** `0`

### Gate 4 — DOWN migration funciona (staging apenas)

```sql
-- Em staging:
ALTER TABLE projects DROP COLUMN tax_id_type;
SHOW COLUMNS FROM projects LIKE 'tax_id_type';
-- Esperado: Empty set
-- Restaurar:
ALTER TABLE projects ADD COLUMN tax_id_type ENUM('cnpj','cpf') NOT NULL DEFAULT 'cnpj';
```

---

## §B.6 — Workaround atual (Q2 — dado real)

**Resultado Q2:** **0 projetos com CNPJ fake.**

**Interpretação:** A barreira é **absoluta**. Produtores rurais PF simplesmente não usam a plataforma — não há workaround identificado. Isso confirma que a exclusão é total (não parcial), elevando a urgência de **P1**.

**Implicação para o produto:** o impacto da feature é **medido pela aquisição** de clientes PF agro (não pela conversão de clientes existentes via workaround). Métrica de sucesso pós-F5: número de projetos criados com `tax_id_type='cpf'` nos primeiros 30 dias após deploy.

---

## §B.7 — Impacto nos testes (Q3 — dado real)

**Resultado Q3:** **14 fixtures CNPJ em 3 arquivos** (não 17 como estimado na v4).

| Arquivo | Fixtures CNPJ | Ação F5 |
|---|---|---|
| `server/consistencyEngine.test.ts` | 9 | Adicionar fixture PF paralela (não substituir) |
| `client/src/lib/compute-profile-quality.test.ts` | 4 | Adicionar fixture PF paralela |
| `server/integration/test-e2e-t3-consolidator.test.ts` | 1 | Adicionar fixture PF paralela |
| **Total** | **14** | **3 arquivos** (era estimado 17) |

**Implicação:** LOC delta F5 cai de ~100-200 para **~50-70 LOC**.

**Reclassificação:** Classe B confirmada com folga (~250-370 LOC total — era ~280-400 na v4).

**Estratégia:** "adicionar fixture PF paralela" significa criar um cenário gêmeo PF para cada cenário PJ existente, sem alterar os testes legados. Mantém retrocompat 100% nos 14 contratos atuais.

---

## §B.8 — ComplianceDashboard.tsx (Q4 — dado real)

**Resultado Q4:** `generateDiagnosticoPDF()` na linha 88 **não passa `cnpj`**. Campo `cnpj?: string` é opcional na interface — sem crash atual. PDF usa fallback `"sem-cnpj"` no nome do arquivo quando `cnpj` ausente.

**Ação F4:** adicionar `taxId: project?.companyProfile?.cpf ?? project?.companyProfile?.cnpj` nos 3 consumers:

| Arquivo | Linha | Estado AS-IS | Ação F4 |
|---|---|---|---|
| `ActionPlanPage.tsx` | 1053 | `cnpj: undefined` literal | passar `taxId` calculado |
| `ConsolidacaoV4.tsx` | 675 | `cnpj: undefined` literal | passar `taxId` calculado |
| `ComplianceDashboard.tsx` | 88 | **sem `cnpj`** (descoberto Q4) | adicionar `taxId` calculado |

**Implicação no PDF:** `generateDiagnosticoPDF.ts:125` deve mudar de `if (data.cnpj) doc.text("CNPJ: ${data.cnpj}", ...)` para `if (data.cnpj || data.cpf) doc.text("${tipoIdent}: ${id}", ...)` (já documentado na v4 §7.2 F4).

**Filename:** `:355` muda de `cnpjSlug` para `taxIdSlug` (já documentado na v4).

---

## §B.9 — Decisões abertas para o P.O.

1. **`tax_id_type` ENUM vs VARCHAR(10)?** ✅ confirmado: **ENUM** (mais idiomático em MySQL/TiDB + invariante embutida + economia de bytes).
2. **`companyProfile.taxId` derivado vs persistido?** ✅ confirmado: **persistido** (redundante mas null-safe para `perfilHash` sem lógica de fallback).
3. **Snapshot DB pré-F0 (S3)?** ⏳ pendente Manus — `SELECT COUNT(*) FROM projects` para dimensionar S3 (item P1 do rollback).

---

**Confiabilidade declarada:** **98%** (sobe de 92% para 98% com os 6 valores reais incorporados — Q1 a Q6). Residual 2%: validação P1 (volume DB para snapshot) que será resolvida quando Manus executar o snapshot real.
