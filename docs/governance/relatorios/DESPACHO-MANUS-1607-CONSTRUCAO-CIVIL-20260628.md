## 📋 DESPACHO FINAL MANUS — confirmação determinística de banco (READ-ONLY) · Issue #1607

> Consolida e **substitui** os despachos parciais anteriores. Fecha o diagnóstico determinístico da construção civil. O Claude Code já provou no CÓDIGO (fonte da verdade) as 3 quebras; este despacho confirma os **fatos de banco** que não estão no repo. **Zero escrita.** Reportar saída **literal** (REGRA-ORQ-37) + `git=<sha>/checkpoint=<id>` (REGRA-ORQ-25).
>
> Relatórios em main (`a70cec0a`): `AUDITORIA-DET-CONSTRUCAO-CIVIL-1607-v2`, `AS-IS-TO-BE-QCNAE-REQUIREMENT-LINK`, `PARECER-CONSTRUCAO-CIVIL-PLATAFORMA-1607`.

### CONTEXTO (o que o código já prova)
Pipeline ativo `risks-v4 → generateRisksV4Pipeline → gapEngine.analyzeGaps`. As respostas Q.CNAE (`questionnaireAnswersV3`) **não viram gap** porque a tabela não tem coluna de junção a requisito (`schema.ts:1215-1228`) → keying `Q{index}` (`gapEngine.ts:335`) nunca casa `req.code` (`:351`). Confirmar isto no banco real:

### QUERIES (todas SELECT · banco de produção)

**Q-A — Schema real (confirma ausência da chave de junção):**
```sql
DESCRIBE questionnaireAnswersV3;
```
→ Confirmar que NÃO existe coluna `requirement_id` / `source_reference` / `fonte_ref`.

**Q-B — PROVA NEGATIVA ESTRUTURAL (a mais importante):** o caminho Q.CNAE→gap já produziu algum gap?
```sql
SELECT source, COUNT(*) AS n FROM project_gaps_v3 GROUP BY source;
SELECT source, COUNT(*) AS n FROM project_gaps_v3 WHERE project_id=10680001 GROUP BY source;
```
→ Esperado: NENHUM gap com origem em `questionnaireAnswersV3` (qcnae). Se `source` não distinguir qcnae, reportar a distribuição completa.

**Q-C — Quebra de chave (confirma `req.code` nunca casa `"Q{index}"`):**
```sql
SELECT COUNT(*) AS q_codes FROM regulatory_requirements_v3 WHERE code REGEXP '^Q[0-9]+$';
SELECT DISTINCT LEFT(code,4) AS prefixo, COUNT(*) AS n FROM regulatory_requirements_v3 WHERE active=1 GROUP BY prefixo ORDER BY n DESC;
```
→ Esperado: `q_codes = 0`.

**Q-D — Requisitos setoriais de construção (frente C — confirma B1):**
```sql
SELECT code, name, domain, risk_category_code, source_reference
FROM regulatory_requirements_v3
WHERE active=1 AND (name LIKE '%imóv%' OR name LIKE '%imov%' OR name LIKE '%constru%'
   OR source_reference REGEXP '25[2-9]|26[0-9]|27[0]|365');
SELECT COUNT(*) AS total_ativos FROM regulatory_requirements_v3 WHERE active=1;
```
→ Esperado: pouquíssimos (Manus B1: só `REQ-CLA-005`, categoria `imposto_seletivo` — confirmar miscategorização).

**Q-E — `requirement_question_mapping` (#963 — motor separado, não o ativo):**
```sql
SELECT COUNT(*) AS total FROM requirement_question_mapping;
```
→ Esperado: 0 (confirma vazia; lembrar que é lida por `gapRouter`/`db-requirements`, NÃO por `gapEngine` ativo).

**Q-F — As 17 respostas Q.CNAE do projeto (D2 — mostra ausência de vínculo):**
```sql
SELECT * FROM questionnaireAnswersV3 WHERE projectId=10680001 ORDER BY questionIndex LIMIT 3;
```

**Q-G — `service_answers` (único caminho que casa, padrão idN):**
```sql
SELECT fonte_ref, COUNT(*) FROM service_answers WHERE project_id=10680001 GROUP BY fonte_ref;
```

### REPORTE (objetivo, ao final)
- (A) `questionnaireAnswersV3` tem coluna de junção a requisito? (sim/não)
- (B) Algum gap já originou de qcnae? (sim/não + nº) — **prova negativa**
- (C) `q_codes` = ? (esperado 0)
- (D) Nº de requisitos de construção/imóveis + seus `code`/`risk_category_code`
- (E) `requirement_question_mapping` count
- (F) As 17 respostas têm algum campo de vínculo a requisito?
- (G) `service_answers` do 10680001 têm `fonte_ref` padrão idN?
- Reportar `git=a70cec0a / checkpoint=<id Manus>`.

FIM.
