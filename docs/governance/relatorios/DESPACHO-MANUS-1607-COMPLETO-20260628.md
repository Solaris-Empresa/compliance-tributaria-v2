# DESPACHO COMPLETO MANUS — Issue #1607 (Construção Civil) — 2 partes

> **Para:** Manus (Implementador/Validador) · **De:** Claude Code (Orquestrador) · **Data:** 28/06/2026
> **Autocontido** (não depende de contexto anterior). **HEAD esperado:** `git fetch origin && git reset --hard origin/main` (`main` = `5885a170` ou superior).
> **Saída esperada:** (A) confirmações de banco read-only + (B) **um documento formatado em linguagem jurídica, pronto para o P.O. enviar ao Dr. José**, commitado no repositório.
> Reportar ao final `git=<sha> / checkpoint=<id>` (REGRA-ORQ-25).

---

## CONTEXTO (o que já está provado e onde)

O Dr. José apontou que 13 riscos setoriais de construção civil **não aparecem** no diagnóstico, embora a fundamentação jurídica/RAG/método estejam **100% corretos**. O Claude Code auditou de forma **determinística (no código, fonte da verdade)** e identificou **3 quebras independentes** que impedem as respostas do questionário Q.CNAE de virarem risco. Arquivos de análise já em `main` (ler antes de começar):

- `docs/governance/relatorios/PARECER-CONSTRUCAO-CIVIL-PLATAFORMA-1607-20260628.md` — parecer em linguagem jurídica (base do entregável da Parte B)
- `docs/governance/relatorios/AUDITORIA-DET-CONSTRUCAO-CIVIL-1607-v2-20260628.md` — causa-raiz determinística (código linha a linha)
- `docs/governance/relatorios/AS-IS-TO-BE-QCNAE-REQUIREMENT-LINK-20260628.md` — análise de impacto da “ponte” resposta→requisito

**As 3 quebras (resumo):**
1. **Q1** — `questionnaireAnswersV3` não tem coluna de junção a requisito (`drizzle/schema.ts:1215-1228`); o gap engine chaveia a resposta por `"Q"+questionIndex` (`gapEngine.ts:335`) e busca por `req.code` (`:351`) → **nunca casa**.
2. **Q2** — o normalizador planejado `normalizeQcnaeOnda3Answers` é stub que retorna `[]` (`unified-answer.ts:198`).
3. **Q3** — o `gapEngine` não chama esse normalizador e `requirement_question_mapping` está vazia (#963).
Os 2 riscos de imóveis que aparecem vêm só de `inferNormativeRisks` (CNAE, confiança 0,64), **não do questionário**.

---

## PARTE A — CONFIRMAÇÃO DE BANCO (READ-ONLY, banco de produção)

> Todas SELECT. **Zero INSERT/UPDATE/DELETE.** Colar a saída literal de cada uma.

**Q-A — Schema (confirma ausência da chave de junção):**
```sql
DESCRIBE questionnaireAnswersV3;
```
→ Confirmar que NÃO existe `requirement_id` / `source_reference` / `fonte_ref`.

**Q-B — PROVA NEGATIVA ESTRUTURAL (a mais importante):** o caminho Q.CNAE→gap já gerou algum gap?
```sql
SELECT source, COUNT(*) AS n FROM project_gaps_v3 GROUP BY source;
SELECT source, COUNT(*) AS n FROM project_gaps_v3 WHERE project_id=10680001 GROUP BY source;
```
→ Esperado: nenhum gap originado de `questionnaireAnswersV3` (qcnae).

**Q-C — Quebra de chave (`req.code` nunca casa `"Q{index}"`):**
```sql
SELECT COUNT(*) AS q_codes FROM regulatory_requirements_v3 WHERE code REGEXP '^Q[0-9]+$';
SELECT DISTINCT LEFT(code,4) AS prefixo, COUNT(*) AS n FROM regulatory_requirements_v3 WHERE active=1 GROUP BY prefixo ORDER BY n DESC;
```
→ Esperado: `q_codes = 0`.

**Q-D — Requisitos setoriais de construção:**
```sql
SELECT code, name, domain, risk_category_code, source_reference
FROM regulatory_requirements_v3
WHERE active=1 AND (name LIKE '%imóv%' OR name LIKE '%imov%' OR name LIKE '%constru%'
   OR source_reference REGEXP '25[2-9]|26[0-9]|27[0]|365');
SELECT COUNT(*) AS total_ativos FROM regulatory_requirements_v3 WHERE active=1;
```
→ Esperado: pouquíssimos (provável só `REQ-CLA-005`, categoria `imposto_seletivo` — confirmar miscategorização).

**Q-E — `requirement_question_mapping` (#963, motor separado):**
```sql
SELECT COUNT(*) AS total FROM requirement_question_mapping;
```
→ Esperado: 0.

**Q-F — As respostas Q.CNAE do projeto (mostra ausência de vínculo):**
```sql
SELECT * FROM questionnaireAnswersV3 WHERE projectId=10680001 ORDER BY questionIndex LIMIT 3;
```

**Q-G — `service_answers` (único caminho que casa, padrão idN):**
```sql
SELECT fonte_ref, COUNT(*) FROM service_answers WHERE project_id=10680001 GROUP BY fonte_ref;
```

---

## PARTE B — FORMATAR O DOCUMENTO PARA O DR. JOSÉ (entregável)

Com os resultados da Parte A, produzir **um documento em linguagem jurídica acessível** (sem jargão de código), commitado em `docs/governance/relatorios/PARECER-FINAL-DR-JOSE-CONSTRUCAO-CIVIL-20260628.md`, que o P.O. possa **enviar diretamente** ao Dr. José. Base: o parecer existente (`PARECER-CONSTRUCAO-CIVIL-PLATAFORMA-1607-20260628.md`), agora com as **confirmações de banco preenchidas** (substituir “pendente de confirmação” pelos números reais da Parte A).

**Estrutura obrigatória do documento (8 seções):**
1. **A pergunta** — a plataforma identifica automaticamente os riscos de compliance do cliente?
2. **Resposta direta e transparente** — Sim para riscos transversais (alta confiança); **Não** (ou parcial/baixa confiança) para os setoriais de construção. Uma frase clara.
3. **O que está correto** — base legal/RAG/método (validado pelo Dr. José). Tranquilizar.
4. **O que não apareceu e por quê** — as 3 lacunas em **linguagem de negócio** (sem código), agora **com a evidência de banco** (ex.: “confirmado: nenhum risco foi gerado a partir das respostas do questionário — query X retornou zero”).
5. **É existencial?** — Não na fundação (corrigível); **sim na reputação SE não houver transparência** sobre a meta de 98% calculada em base incompleta.
6. **O que é preciso** — tabela: o que falta · quem decide/executa · esforço. Destacar a **curadoria jurídica do Dr. José** como insumo que destrava o maior valor.
7. **Recomendação** — transparência imediata + priorizar curadoria + validar com caso real (CONSTRUTORA VII).
8. **Declaração de transparência** + frase-resumo para o Dr. José.

**Regras de formatação:**
- Linguagem de advogado; evitar nomes de arquivo/linha de código no corpo (podem ir em anexo).
- Incorporar os números reais da Parte A (ex.: total de requisitos, requisitos de construção, contagem de gaps qcnae = 0).
- Tom honesto: não amenizar nem exagerar (transparência é requisito do P.O.).
- Incluir, ao final, links dos anexos técnicos (os 3 arquivos em `main`).
- Commitar o arquivo + abrir PR docs-only para o P.O. revisar/enviar.

---

## REPORTE FINAL
- Saída literal das queries Q-A a Q-G.
- Respostas objetivas: (A) tem coluna de junção? (B) algum gap de qcnae? (C) q_codes? (D) nº requisitos construção + codes/categorias (E) mapping count (F) respostas têm vínculo? (G) service_answers tem fonte_ref idN?
- Caminho do documento gerado para o Dr. José + nº do PR.
- `git=<sha> / checkpoint=<id>`.

FIM.
