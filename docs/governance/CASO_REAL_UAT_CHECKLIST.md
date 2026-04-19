# Checklist UAT — Teste Manual com Caso Real do Advogado

## Sprint Z-20 · Bateria 4 (validação final antes de produção)
## Referência: MATRIZ_RISCOS_SNAPSHOT_2026-04-18.md + SPEC-TESTE-MATRIZ-RISCOS-v1.md

---

## Pré-condições (P4 — 6 requisitos do projeto UAT)

Antes de iniciar o teste manual, confirmar:

- [ ] 1. Projeto é **caso real de empresa** (anonimizado se necessário por LGPD)
- [ ] 2. Cobre **no mínimo 5 das 10 categorias** oficiais
- [ ] 3. Tem **respostas completas nas Ondas 1+2** (SOLARIS + IA GEN)
- [ ] 4. Tem CNAE(s) válido(s) para acionar **Onda 3 (RAG)** com hits no corpus
- [ ] 5. **NÃO é** 930001 nem test_z20_destructive
- [ ] 6. Tem `status=aprovado` ou `em_andamento` — passou pelo fluxo SOLARIS completo

**ID do projeto UAT:** `__________________`
**Advogado responsável:** `__________________`
**Data do teste:** `__________________`

---

## Parte 1 — Bugs com inspeção humana (da triagem C2 do Bloco 9.1)

Lista preenchida pelo Claude Code na implementação. Exemplos:

- [ ] B-10 — Aba Oportunidades com borda teal + sem botão "+ Plano"
- [ ] B-18 — Barra de progresso X/N está semanticamente correta
- [ ] B-20 — Modal editar plano mostra breadcrumb completo do risco
- [ ] (demais conforme triagem)

---

## Parte 2 — Validação de fluxo jurídico

### 2.1 — Cadastro até diagnóstico

- [ ] Advogado cria projeto, insere CNPJ + CNAEs
- [ ] Advogado preenche operationProfile, taxComplexity, etc.
- [ ] **CPIE** mostra score > 50 (perfil suficiente)

### 2.2 — Questionários (3 ondas)

- [ ] Onda 1 SOLARIS: 22 perguntas fazem sentido para o caso
- [ ] Onda 2 IA GEN: perguntas personalizadas coerentes com perfil
- [ ] Onda 3 QCNAE: perguntas por CNAE confirmado

### 2.3 — Briefing

- [ ] Briefing gerado menciona os gaps reais do caso
- [ ] Base legal citada corresponde aos artigos da LC 214/2025 aplicáveis
- [ ] Advogado aprova o briefing

### 2.4 — Matriz de Riscos (Step 5)

- [ ] Riscos gerados automaticamente após aprovação do briefing
- [ ] **Quantidade:** entre 10 e 40 riscos (PROVA 1 Gate 7)
- [ ] **Categorias:** `aliquota_zero` + `credito_presumido` presentes se aplicáveis (PROVA 2)
- [ ] **Títulos:** sem "[categoria]" literal nem "geral" (PROVA 3)
- [ ] **RAG:** ≥50% dos riscos com `rag_validated=1` (PROVA 4)
- [ ] **Severidades** batem com a realidade do caso (advogado valida)
- [ ] **Breadcrumb** de cada risco faz sentido (fonte › categoria › artigo › ruleId)
- [ ] **Exposição ao Risco de Compliance** atualiza ao aprovar/excluir riscos (DEC-01)
- [ ] Advogado aprova riscos relevantes / exclui com motivo os irrelevantes

### 2.5 — Planos de Ação (Step 6)

- [ ] Planos gerados automaticamente após aprovação de riscos
- [ ] **Oportunidades não geram planos** (RN-RISK-05)
- [ ] Banner de rastreabilidade sticky presente no topo
- [ ] Tarefas BLOQUEADAS enquanto plano está em rascunho
- [ ] Advogado adiciona/edita tarefas manualmente se necessário
- [ ] Advogado aprova plano → tarefas LIBERADAS
- [ ] Prazos (30/60/90/180 dias) aparecem corretamente

### 2.6 — Consolidação (Step 7)

- [ ] Redireciona automaticamente após aprovar primeiro plano
- [ ] **Score** exibido e consistente com riscos aprovados
- [ ] **KPIs** corretos (riscos alta, media, oportunidades)
- [ ] **Tabela auditável** de riscos com breadcrumb + RAG status
- [ ] **Disclaimer jurídico** visível
- [ ] **PDF** baixa com nome `diagnostico-CNPJ-YYYY-MM-DD.pdf`
- [ ] **PDF** contém: CNPJ + CNAEs + data + disclaimer + todos os riscos

---

## Parte 3 — Teste de edição posterior (RN-CV4-10)

- [ ] Advogado sai da ConsolidacaoV4 e volta depois
- [ ] Edição de planos/tarefas preservada
- [ ] Novo snapshot gerado ao retornar (histórico acumulado em `scoringData.snapshots[]`)
- [ ] Score histórico visível com timestamps

---

## Parte 4 — Cenários de erro

- [ ] Perfil incompleto (CPIE < 50): sistema avisa antes de gerar briefing?
- [ ] Resposta ambígua no questionário: sistema pede esclarecimento ou assume pessimista?
- [ ] CNAE sem requisitos no RAG: risco marcado como `skipped` com motivo?
- [ ] Erro de rede: mensagem clara e ação de retry?

---

## Parte 5 — Parecer jurídico do advogado parceiro

Avaliação qualitativa (advogado escreve livremente):

**Os riscos identificados fazem sentido para o caso?**
```
(resposta do advogado)
```

**As bases legais citadas são aplicáveis?**
```
(resposta do advogado)
```

**O diagnóstico em PDF é utilizável na prática (apresentar ao cliente)?**
```
(resposta do advogado)
```

**Score de 0-10 para confiabilidade do sistema como ferramenta de apoio:**
```
___/10
```

---

## Parte 6 — Aprovação formal

- [ ] **Advogado:** `__________________` aprova para uso em casos reais
- [ ] **P.O.:** `__________________` aprova GO para produção
- [ ] **Data:** `__________________`

Se houver bloqueios: listar e despachar para o Orquestrador criar issues
com label `from-uat-real` (prioridade elevada).

---

*IA SOLARIS · UAT Checklist · Sprint Z-20 · Bateria 4*
*Pré-requisito para liberação de suite automatizada → produção*
