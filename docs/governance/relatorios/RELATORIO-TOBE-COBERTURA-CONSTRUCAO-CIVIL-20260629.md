# RELATÓRIO TO-BE — GARANTIA DE COBERTURA SETORIAL
## Plano de Ação para 100% de Cobertura dos 13 Riscos do Dr. José

**Projeto:** Compliance Tributária — Reforma Tributária Brasileira
**Data:** 2026-06-29
**Referência:** Auditoria determinística 28/06/2026 (PRs #1611–#1614)

---

## 1. Estado Atual (AS-IS)

| Causa-Raiz | Descrição | Impacto |
|------------|-----------|---------|
| **CR-01** | `taxRegime=null` na tabela `projects` para CONSTRUTORA VII (ID 10680001). `extractProjectProfile` não implementa fallback. | Zero riscos gerados pelo motor de inferência. |
| **CR-02** | `cnaeGroups=''` em todos os artigos de construção civil nos 3 diplomas legais (LC 214, Decreto 12.955, Res. CGIBS 6). Motor não roteia riscos setoriais. | 13 riscos do Dr. José não aparecem no briefing. |
| **CR-03** | Tabela `requirement_question_mapping` vazia (0 registros). Perguntas do questionário não geram gaps. | Perguntas CNAE 41/42/43/68 não vinculadas a requisitos. |

---

## 2. Plano de Ação (TO-BE)

### CR-01: Corrigir `extractProjectProfile` — Fallback `taxRegime`

**Arquivo:** `server/services/project-profile-extractor.ts`

**Mudança:**
```typescript
// ANTES (bugado)
const taxRegime = project.taxRegime; // null para CONSTRUTORA VII

// DEPOIS (corrigido)
const taxRegime = project.taxRegime ?? companyProfile?.taxRegime ?? 'lucro_real';
```

**Impacto:** Motor de inferência passa a receber `taxRegime` válido e gera riscos.
**Esforço:** 1 linha. Baixo risco.

### CR-02: Popular `cnaeGroups` nos artigos de construção civil

**Arquivo:** `scripts/seed-cnae-groups-construcao-civil.mjs` (novo)

**Mudança:**
```sql
-- UPDATE ragDocuments SET cnaeGroups = '41,42,43,68'
-- WHERE lei IN ('lc214','decreto12955','resolucao_cgibs_6')
-- AND artigo IN ('Art. 252','Art. 253',...,'Art. 270')
-- AND artigo IN ('Art. 360','Art. 361',...,'Art. 372')
-- APROVAÇÃO P.O. OBRIGATÓRIA antes de executar
```

**Artigos afetados:**
- LC 214: Arts. 252–270 (19 artigos)
- Decreto 12.955: Arts. 360–372 (13 artigos)
- Resolução CGIBS 6: artigos relacionados a construção civil (a definir)

**Impacto:** Motor passa a rotear todos os 13 riscos para empresas com CNAE 41/42/43/68.
**Esforço:** Script de seed + aprovação P.O.

### CR-03: Popular `requirement_question_mapping`

**Arquivo:** `scripts/seed-requirement-question-mapping-construcao.mjs` (novo)

**Mudança:**
Vincular as 17 perguntas CNAE de construção civil (source='qcnae') aos requisitos regulatórios correspondentes.

**Impacto:** Perguntas do questionário passam a gerar gaps vinculados a requisitos.
**Esforço:** Script de seed + aprovação P.O.

---

## 3. Garantia de Cobertura Pós-Implementação

Após implementação dos 3 planos de ação, a cobertura esperada é:

| # | Risco Dr. José | Artigo Base | Cobertura TO-BE |
|---|----------------|-------------|-----------------|
| 1 | Perda de créditos do IBS | Art. 269, Art. 270 (LC 214) | ✅ Briefing + Matriz + Plano de Ação |
| 2 | Perda do Redutor de Ajuste | Art. 257, Art. 258 (LC 214) + Art. 360-362 (Dec. 12.955) | ✅ Briefing + Matriz + Plano de Ação |
| 3 | Risco SINTER / avaliação | Art. 256 (LC 214) + Art. 363-364 (Dec. 12.955) | ✅ Briefing + Matriz + Plano de Ação |
| 4 | Risco permuta | Art. 259 (LC 214) + Art. 365-366 (Dec. 12.955) | ✅ Briefing + Matriz + Plano de Ação |
| 5 | Controle por empreendimento | Art. 270 (LC 214) + Art. 370-371 (Dec. 12.955) | ✅ Briefing + Matriz + Plano de Ação |
| 6 | Documentação fiscal da obra | Art. 269 (LC 214) + Art. 369 (Dec. 12.955) | ✅ Briefing + Matriz + Plano de Ação |
| 7 | CIB — Cadastro Imobiliário | Art. 265, Art. 266 (LC 214) + Art. 367-368 (Dec. 12.955) | ✅ Briefing + Matriz + Plano de Ação |
| 8 | Custos históricos 2027 | Art. 258 (LC 214) + Art. 361-362 (Dec. 12.955) | ✅ Briefing + Matriz + Plano de Ação |
| 9 | Contrapartidas urbanísticas | Art. 258 (LC 214) + Art. 362 (Dec. 12.955) | ✅ Briefing + Matriz + Plano de Ação |
| 10 | Recálculo posterior do IBS | Art. 262 (LC 214) + Art. 370 (Dec. 12.955) | ✅ Briefing + Matriz + Plano de Ação |
| 11 | Tributação por parcelas | Art. 262 (LC 214) + Art. 372 (Dec. 12.955) | ✅ Briefing + Matriz + Plano de Ação |
| 12 | Revisão dos contratos | Art. 263, Art. 264 (LC 214) + Art. 365-366 (Dec. 12.955) | ✅ Briefing + Matriz + Plano de Ação |
| 13 | Risco tecnológico | Art. 270 (LC 214) + Art. 371 (Dec. 12.955) | ✅ Briefing + Matriz + Plano de Ação |

**Cobertura TO-BE: 13/13 riscos (100%)**

---

## 4. Pré-condições para Implementação

| Pré-condição | Responsável | Status |
|--------------|-------------|--------|
| Aprovação P.O. para CR-02 (UPDATE ragDocuments) | Uires Tapajós | ⏳ Pendente |
| Aprovação P.O. para CR-03 (INSERT requirement_question_mapping) | Uires Tapajós | ⏳ Pendente |
| PR com template preenchido e JSON de evidência | Manus | ⏳ Pendente |
| CI/CD verde (5 checks obrigatórios) | GitHub Actions | ⏳ Pendente |

---

## 5. Referências

- Auditoria determinística: `docs/governance/relatorios/DESPACHO-MANUS-1607-COMPLETO-20260628.md`
- Parecer final Dr. José: `docs/governance/relatorios/PARECER-FINAL-DR-JOSE-CONSTRUCAO-CIVIL-20260628.md`
- Baseline do produto: `docs/BASELINE-PRODUTO.md` (v9.2 · 2026-06-28)
- Corpus RAG: 16.702 chunks · 25 leis · Jina Reranker v3
