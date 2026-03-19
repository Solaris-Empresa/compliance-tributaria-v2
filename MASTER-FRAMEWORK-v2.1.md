# IA SOLARIS — MASTER DEV + RAG + VALIDATION FRAMEWORK v2.1 (STRICT MODE)

**Autoridade:** Product Owner Uires Tapajós  
**Modo:** STRICT MODE  
**Vigência:** 19/03/2026  
**Supersede:** DEV-FRAMEWORK-v2.1.md

---

## PRINCÍPIO FUNDAMENTAL

Nenhuma entrega é válida sem:
1. implementação completa
2. validação funcional
3. evidência concreta
4. aprovação do orquestrador

---

## REGRAS ABSOLUTAS

- NÃO assumir funcionamento sem evidência
- NÃO omitir etapas técnicas
- NÃO entregar parcialmente
- NÃO manter código morto
- NÃO criar fallback desnecessário
- NÃO gerar conteúdo sem base lógica
- NÃO responder "feito" sem prova

---

## MODO DE OPERAÇÃO (5 PASSOS OBRIGATÓRIOS)

1. ENTENDIMENTO — reescrever objetivo + listar impactos
2. PLANO — arquivos, schema, fluxo
3. IMPLEMENTAÇÃO — completa, sem partes parciais
4. VALIDAÇÃO — TypeScript + banco + API + reload
5. PROVA DE CONCLUSÃO — arquivos + payload + banco + UI + testes

---

## 1. ENGINEERING MODE (DEV)

Toda mudança cobre: frontend + backend + banco + API + persistência + leitura pós-reload

**Fluxo:** IN PROGRESS → VALIDATION → (aguarda PO) → DONE  
**Regra:** O agente NUNCA move para DONE.

---

## 2. RAG MODE (COBERTURA REGULATÓRIA)

**Estrutura obrigatória:**
- `regulatory_requirements` — requisitos legais identificados
- `regulatory_sources` — fontes (EC 132, LC 214, LC 224, LC 227)
- `requirement_question_mapping` — mapeamento requisito → pergunta
- `coverage_report` — % de cobertura por lei

**Proibido:**
- gerar perguntas sem requisito legal
- inferir regra sem base legal
- usar CNAE como gerador direto de pergunta

**"100% cobertura" só pode ser afirmado se:**
- todos os requisitos identificados
- todos no RAG
- todos mapeados para perguntas
- todos respondidos

---

## 3. PROMPT VALIDATION MODE (ANTI-ALUCINAÇÃO)

Antes de usar IA, verificar:
- consistência do Company Profile
- coerência entre campos
- ausência de conflito lógico

Se houver inconsistência: listar conflitos + classificar (critical/high/medium/low) + sugerir correção

Se usuário ignorar: registrar risco + incluir aviso "o diagnóstico pode não refletir a realidade"

---

## 4. AUDIT MODE

Sempre validar: TypeScript (0 erros) + API + persistência + reload + fluxo completo

**Regressão crítica (Briefing / Riscos / Plano):**
→ PARAR IMEDIATAMENTE → EXECUTAR ROLLBACK → REPORTAR

---

## 5. DATABASE MODE

Toda mudança garante: persistência real + leitura consistente + integridade de schema + validação backend

---

## 6. FRONTEND MODE

Obrigatório: UX explícita + campos obrigatórios claros + bloqueio de fluxo funcional

---

## 7. FLOW CONTROL MODE

```
Projeto → Diagnóstico → Briefing → Riscos → Plano
```

Diagnóstico:
- Corporativo → libera Operacional
- Operacional → libera CNAE
- CNAE → libera Briefing

---

## 8. GOVERNANÇA (KANBAN)

Colunas: BACKLOG → READY → IN PROGRESS → VALIDATION → DONE | BLOCKED

Cada tarefa só vira DONE com prova + aprovação do PO.

---

## 9. DOCUMENTAÇÃO

Sempre atualizar: requisitos funcionais + documentação IA + changelog + baseline

---

## 10. FORMATO DE RESPOSTA OBRIGATÓRIO

```
1. O que foi feito
2. Arquivos alterados
3. Evidência
4. Validação
5. Status: VALIDATION
```

**Frases proibidas** (sem evidência): "implementado", "feito", "pronto"

**Frases obrigatórias:** "Prova de conclusão:", "Arquivos alterados:", "Status: VALIDATION"

---

## BACKLOG v2.1 — SPRINT ÚNICA

| ID | Tarefa | Status |
|---|---|---|
| T1 | Criar estrutura diagnosticStatus | BACKLOG |
| T2 | Refatorar máquina de estados | BACKLOG |
| T3 | Criar DiagnosticoStepper | BACKLOG |
| T4 | Criar Questionário Corporativo | BACKLOG |
| T5 | Criar Questionário Operacional | BACKLOG |
| T6 | Adaptar CNAE (3ª camada) | BACKLOG |
| T7 | Integrar com Briefing | BACKLOG |
| T8 | Integrar com Riscos | BACKLOG |
| T9 | Integrar com Plano | BACKLOG |
| T10 | Atualizar rotas | BACKLOG |
| T11 | Ajustar testes | BACKLOG |
| T12 | Atualizar documentação | BACKLOG |

---

## ROLLBACK DE EMERGÊNCIA

```bash
bash /home/ubuntu/baseline-v2.1/rollback.sh verify   # verificar integridade
bash /home/ubuntu/baseline-v2.1/rollback.sh 1         # rollback git
bash /home/ubuntu/baseline-v2.1/rollback.sh 2         # rollback arquivos críticos
bash /home/ubuntu/baseline-v2.1/rollback.sh 3         # rollback completo
```

Baseline checkpoint: `6922c6dd`
