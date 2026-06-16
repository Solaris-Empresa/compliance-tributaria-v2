# Corpus Audit Checklist

**Versão:** 1.0 · **Criado:** 16/06/2026 · **Origem:** Lições #131/#132

> Usar ANTES de qualquer PR que toque corpus, NCM, NBS ou `cnaeGroups`.

## Checklist obrigatório

### 1. Verificar cnaeGroups no arquivo fonte ANTES de diagnosticar
- [ ] `grep -B1 -A5 "Art\. NNN" server/rag-corpus-lcs-novas.ts` — confirmar valor real
- [ ] Nunca afirmar `cnaeGroups` sem evidência do arquivo fonte
- [ ] Art.139 ≠ Art.140 — verificar individualmente (anti-padrão Lição #132)

### 2. Antes de propor regeneração de questionário como fix
- [ ] O `cnaeGroups` do artigo problemático já foi corrigido no corpus?
- [ ] Se não → regenerar é **TESTE** (confirma bug), não fix (Lição #131)
- [ ] Se sim → regenerar é **VALIDAÇÃO** do fix

### 3. Antes de abrir PR de curadoria de cnaeGroups
- [ ] AS-IS: qual o valor atual? (`grep` no arquivo fonte)
- [ ] TO-BE: qual o valor correto? (base legal + CNAE do setor)
- [ ] Impacto: quais projetos/perfis são afetados pela mudança?
- [ ] Regressão: remover um CNAE do grupo pode ocultar artigo legítimo?

### 4. Após fix de cnaeGroups
- [ ] Regenerar questionário de projeto de teste → confirmar que artigo
      irrelevante não aparece mais
- [ ] Confirmar que artigo legítimo ainda aparece (ex: Art.197 para CNAE 28)
- [ ] Registrar evidência no PR body (antes/depois)

## Artigos com histórico de mis-tag

| Artigo | Problema identificado | Linha (~) | Data | Lição | Status |
|---|---|---|---|---|---|
| Art.140 LC 214 | `cnaeGroups` inclui CNAE 28 indevidamente | ~2974 | 16/06/2026 | #131/#132 | 🔴 CORPUS-FIX-01 (#1466) |
| Art.176 LC 214 | `cnaeGroups` inclui CNAE 28 indevidamente | ~3783 | 16/06/2026 | #131 | 🔴 CORPUS-FIX-02 (#1467) |

## Vinculadas

- Lições #131 / #132 · REGRA-ORQ-45 (Gate 0 do emissor) · REGRA-ORQ-46 (lição = PR)
- REGRA-ORQ-35 (NUNCA ASSUMA) · REGRA-ORQ-41 (AS-IS/TO-BE impact-tree) · Lição #93 (mecanismo verificado)
- Issues: CORPUS-FIX-01 #1466 · CORPUS-FIX-02 #1467 · RERANKER-NCM-AWARE-01 #1468
- Arquivo fonte do corpus: `server/rag-corpus-lcs-novas.ts`
