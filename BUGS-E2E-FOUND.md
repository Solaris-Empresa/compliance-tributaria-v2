# Bugs Encontrados - Teste E2E Completo

**Data:** 01/02/2026  
**Checkpoint:** cd5bfc15  
**Fase:** Teste E2E Manual via Browser

---

## 🐛 BUG #1: Botão "Criar Projeto" Não Funciona

**Severidade:** 🔴 CRÍTICO  
**Componente:** `/projetos/novo` - Formulário de criação de projeto  
**Status:** IDENTIFICADO

### Descrição
Ao preencher todos os campos obrigatórios do formulário de novo projeto e clicar no botão "Criar Projeto", nada acontece. O botão não dispara a mutation e não há redirecionamento para a próxima etapa.

### Passos para Reproduzir
1. Acessar `/projetos/novo`
2. Preencher "Nome do Projeto": "Projeto E2E Test Completo - Validação IA Real"
3. Selecionar "Cliente": "Observador QA"
4. Selecionar 2 ramos: "Comércio" e "Indústria"
5. Manter "Período": "12 meses" (padrão)
6. Clicar em "Criar Projeto"

### Comportamento Esperado
- Mutation `projects.create` deve ser disparada
- Projeto deve ser criado no banco de dados
- Usuário deve ser redirecionado para `/questionario-corporativo/:projectId`
- Toast de sucesso deve aparecer

### Comportamento Atual
- Nenhuma ação ocorre
- Botão permanece ativo
- Nenhum erro visível no console
- Página permanece em `/projetos/novo`

### Possíveis Causas
1. **Validação de formulário bloqueando:** Pode haver validação silenciosa impedindo submit
2. **Mutation não conectada:** Handler do botão pode não estar chamando `createProject.mutate()`
3. **Estado do formulário inconsistente:** `selectedBranches` pode não estar sendo atualizado corretamente
4. **Erro silencioso no tRPC:** Mutation pode estar falhando sem feedback visual

### Análise Técnica Necessária
- [ ] Verificar logs do console do browser (`.manus-logs/browserConsole.log`)
- [ ] Verificar logs de rede (`.manus-logs/networkRequests.log`)
- [ ] Inspecionar componente `NovoProjeto.tsx` linha do botão "Criar Projeto"
- [ ] Verificar se `createProject.mutate()` está sendo chamado
- [ ] Verificar estado do formulário React Hook Form
- [ ] Testar mutation diretamente via DevTools

### Impacto
🔴 **BLOQUEADOR TOTAL** - Impossibilita criação de novos projetos via interface, bloqueando todo o fluxo E2E.

---

## 📋 Próximos Passos

1. ✅ Documentar bug encontrado
2. ⏳ Analisar logs do servidor e browser
3. ⏳ Inspecionar código do componente NovoProjeto.tsx
4. ⏳ Identificar causa raiz
5. ⏳ Implementar correção
6. ⏳ Testar correção
7. ⏳ Continuar teste E2E

---

## 🔍 Contexto do Teste

**Objetivo:** Validar fluxo completo Projeto → Questionários → Planos de Ação com IA real (sem mock)

**Progresso:**
- ✅ Navegação para `/projetos/novo`
- ✅ Preenchimento do formulário
- ❌ Criação do projeto (BLOQUEADO)
- ⏸️ Questionário corporativo (PENDENTE)
- ⏸️ Geração de plano corporativo via IA (PENDENTE)
- ⏸️ Questionários por ramo (PENDENTE)
- ⏸️ Geração de planos por ramo via IA (PENDENTE)
- ⏸️ Validação de qualidade dos planos (PENDENTE)
