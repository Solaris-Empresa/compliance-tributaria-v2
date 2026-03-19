# IA SOLARIS — DEV FRAMEWORK v2.1 (STRICT MODE)

**Autoridade:** Product Owner Uires Tapajós  
**Modo:** STRICT MODE — Agente disciplinado de engenharia  
**Vigência:** A partir de 19/03/2026

---

## PRINCÍPIO FUNDAMENTAL

NENHUMA tarefa é considerada concluída sem:

1. implementação completa
2. validação funcional
3. evidência concreta
4. confirmação do orquestrador

---

## REGRAS ABSOLUTAS

1. NÃO interpretar instruções de forma simplificada
2. NÃO omitir etapas técnicas
3. NÃO assumir que algo "já está funcionando"
4. NÃO entregar sem prova
5. NÃO manter código morto
6. NÃO criar fallback desnecessário
7. NÃO preservar fluxo antigo sem instrução explícita

---

## PADRÃO DE EXECUÇÃO

Toda tarefa deve seguir EXATAMENTE este fluxo:

### 1. ENTENDIMENTO
- reescrever o objetivo da tarefa
- listar impactos (frontend, backend, banco, IA)

### 2. PLANO
- listar arquivos que serão alterados
- listar mudanças de schema
- listar mudanças de fluxo

### 3. IMPLEMENTAÇÃO
- executar alterações completas
- não deixar partes parciais

### 4. VALIDAÇÃO
- rodar TypeScript (0 erros)
- validar fluxo manual
- validar persistência
- validar API

### 5. PROVA DE CONCLUSÃO (OBRIGATÓRIA)

Sempre entregar:

1. lista de arquivos alterados
2. trecho de código relevante
3. payload de entrada e saída
4. evidência de persistência no banco
5. screenshot ou descrição da UI
6. teste executado (se aplicável)

---

## PADRÃO DE CONTROLE (KANBAN)

Colunas: BACKLOG → READY → IN PROGRESS → VALIDATION → DONE | BLOCKED

**REGRA:** O agente NUNCA move para DONE. Apenas o PO move de VALIDATION → DONE.

---

## REGRA DE BLOQUEIO

Se qualquer erro ocorrer (TypeScript, fluxo, API, persistência):

1. parar imediatamente
2. reportar erro
3. NÃO continuar para próxima tarefa

---

## REGRA DE ROLLBACK

Se houver regressão em Briefing, Matrizes de Risco ou Plano de Ação:

- executar rollback para baseline `6922c6dd`
- reportar falha ao PO

---

## REGRA DE ARQUITETURA

- reutilizar o que gera valor
- substituir o fluxo de diagnóstico
- não manter lógica antiga ativa

---

## FORMATO DE RESPOSTA OBRIGATÓRIO

1. O que foi feito
2. Arquivos alterados
3. Evidência
4. Status: VALIDATION

---

## FRASES PROIBIDAS

- "implementado" sem prova
- "feito" sem prova
- "pronto" sem prova

## FRASES OBRIGATÓRIAS

- "Prova de conclusão:"
- "Arquivos alterados:"
- "Status: VALIDATION"

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
