# Bugs Pós-Conclusão — Análise Profunda (17/03/2026)

## Resumo Executivo

Após análise profunda dos 4 fluxos pós-conclusão (questionário, briefing, riscos, plano de ação),
foram identificados **5 bugs críticos** com causa raiz documentada abaixo.

---

## Bug #1 — CRÍTICO: `questionnaireAnswers` não existe na tabela `projects`

**Sintoma:** Ao visualizar/editar o questionário de um projeto concluído, as respostas não aparecem.

**Causa Raiz:**
- `saveQuestionnaireProgress` salva `questionnaireAnswers: input.allAnswers` via Drizzle ORM
- A coluna `questionnaireAnswers` **não existe** no schema `drizzle/schema.ts` nem no banco real
- O Drizzle ignora silenciosamente colunas desconhecidas → dado nunca é persistido na tabela `projects`
- As respostas ficam APENAS na tabela separada `questionnaireAnswersV3`

**Impacto:** BriefingV3 usa `(project as any).questionnaireAnswers || []` → sempre vazio → briefing gerado sem contexto das respostas

**Correção:**
1. Adicionar coluna `questionnaireAnswers: json("questionnaireAnswers")` ao schema `projects`
2. Rodar `pnpm db:push`
3. Atualizar `getProjectStep1` para retornar `questionnaireAnswers`

---

## Bug #2 — CRÍTICO: QuestionarioV3 mostra "0/0 respondidas" ao navegar entre CNAEs

**Sintoma:** Ao clicar num CNAE já concluído no topo, a tela mostra "0/0 respondidas" sem perguntas.

**Causa Raiz:**
- O `useEffect` que carrega perguntas só reage a mudança de `currentLevel`, não de `currentCnaeIdx`
- O click handler do chip de CNAE faz `setQuestions([])` mas não limpa o `loadedQuestionsRef`
- O `useEffect` não dispara porque o cacheKey já está no ref → perguntas nunca são recarregadas

**Correção:**
- Adicionar `currentCnaeIdx` como dependência do `useEffect` de carregamento
- Limpar o cacheKey do `loadedQuestionsRef` antes de mudar o CNAE

---

## Bug #3 — ALTO: QuestionarioV3 não tem modo "visualização" para projetos concluídos

**Sintoma:** Ao entrar em `/questionario-v3` de um projeto com status `aprovado`, o componente
tenta gerar novas perguntas em vez de mostrar as respostas salvas.

**Causa Raiz:**
- O componente não verifica o status do projeto ao inicializar
- Não há modo "read-only" para projetos já concluídos
- `isViewMode` existe mas só é ativado quando `savedProgress.answers` tem dados — que dependem
  da tabela `questionnaireAnswersV3` (que tem os dados corretos)

**Correção:**
- Quando `project.status` é `aprovado`/`concluido`/`em_andamento`, buscar respostas da tabela
  `questionnaireAnswersV3` via `getProgress` e exibir em modo leitura com opção de editar

---

## Bug #4 — ALTO: BriefingV3 regenera sem contexto das respostas

**Sintoma:** Ao clicar "Corrigir" ou "Mais Informações" no briefing de projeto concluído,
a regeneração usa `allAnswers = []` (vazio) → briefing gerado sem contexto.

**Causa Raiz:** Consequência direta do Bug #1 — `questionnaireAnswers` não existe na tabela.

**Correção:** Após corrigir Bug #1, o BriefingV3 já funcionará. Adicionalmente, fazer fallback
para buscar as respostas da tabela `questionnaireAnswersV3` via procedure separada.

---

## Bug #5 — MÉDIO: PlanoAcaoV3 mostra tela de conclusão mas não permite editar tarefas individuais

**Sintoma:** Ao clicar "Editar Plano de Ação" na tela de conclusão, o `setShowConclusion(false)`
funciona, mas ao reabrir o projeto, volta para a tela de conclusão (loop).

**Causa Raiz:**
- O `useEffect` que verifica `isApproved` sempre redireciona para `showConclusion = true`
- Não há flag persistente de "usuário escolheu editar"
- Ao recarregar a página, o estado `showConclusion` é resetado mas o `useEffect` o reativa

**Correção:**
- Adicionar um `editMode` state que persiste via `sessionStorage`
- Quando `editMode = true`, não ativar `showConclusion` mesmo que `isApproved`

---

## Plano de Correção

### Fase 1: Schema + Router (Bug #1)
1. Adicionar `questionnaireAnswers: json("questionnaireAnswers")` ao schema
2. `pnpm db:push`
3. Atualizar `getProjectStep1` para retornar `questionnaireAnswers`

### Fase 2: QuestionarioV3 (Bugs #2 e #3)
1. Corrigir `useEffect` + `loadedQuestionsRef` para recarregar ao trocar CNAE
2. Adicionar modo visualização com respostas da tabela `questionnaireAnswersV3`

### Fase 3: BriefingV3 (Bug #4)
- Já resolvido pelo Bug #1 + fallback para `questionnaireAnswersV3`

### Fase 4: PlanoAcaoV3 (Bug #5)
- Adicionar `editMode` com `sessionStorage` para evitar loop de conclusão
