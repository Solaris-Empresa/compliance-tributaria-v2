# BASELINE — Plataforma de Compliance Tributário
**Data:** 16/03/2026 | **Commit:** `bbeecc9` | **Branch:** `main`

Este documento é o ponto de referência oficial do projeto. Registra com precisão o que está implementado, o que está parcialmente implementado e o que está ausente em relação aos 54 Requisitos Funcionais aprovados.

---

## Arquitetura Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Tailwind CSS 4 + shadcn/ui |
| Backend | Express 4 + tRPC 11 |
| Banco de dados | MySQL/TiDB via Drizzle ORM |
| IA Generativa | OpenAI API (via `invokeLLM`) |
| Autenticação | Manus OAuth (JWT + cookie) |
| Armazenamento | S3 (via `storagePut`/`storageGet`) |
| Testes | Vitest |

### Arquivos principais do fluxo V3

| Arquivo | Responsabilidade |
|---------|-----------------|
| `client/src/pages/NovoProjeto.tsx` | Etapa 1 — criação do projeto e confirmação de CNAEs |
| `client/src/pages/QuestionarioV3.tsx` | Etapa 2 — questionário adaptativo por CNAE |
| `client/src/pages/BriefingV3.tsx` | Etapa 3 — geração, revisão e aprovação do briefing |
| `client/src/pages/MatrizesV3.tsx` | Etapa 4 — matrizes de riscos por área |
| `client/src/pages/PlanoAcaoV3.tsx` | Etapa 5 — plano de ação por área |
| `server/routers-fluxo-v3.ts` | Procedures tRPC: createProject, extractCnaes, refineCnaes, confirmCnaes, generateQuestions, saveAnswer, getAnswers, generateBriefing, approveBriefing, generateRiskMatrix, generateActionPlan |
| `drizzle/schema.ts` | 40+ tabelas incluindo: projects, questionnaireAnswersV3, briefingVersions, riskMatrix, actionPlans, clientMembers |

---

## Mapeamento dos 54 RFs — Estado Atual

### Legenda
- **IMPL** — Implementado e funcional
- **PARC** — Parcialmente implementado (funciona mas incompleto)
- **AUSE** — Ausente no código atual

---

### ETAPA 1 — Criação do Projeto (8 RFs)

| ID | Requisito | Status | Observação |
|----|-----------|--------|-----------|
| RF-1.01 | Formulário com Nome, Descrição (mín. 100 chars), Cliente | **IMPL** | Validação ativa, botão desabilitado abaixo de 100 chars, contador visual |
| RF-1.02 | Cadastro de Cliente On the Fly | **IMPL** | Modal "Novo Cliente" com Razão Social, CNPJ, E-mail, Telefone |
| RF-1.03 | Cadastro de Usuários por Cliente | **IMPL** | Página `GerenciarEquipe.tsx` com papéis Admin/Colaborador/Visualizador, tabela `clientMembers` |
| RF-1.04 | Extração de CNAEs via IA | **IMPL** | Procedure `extractCnaes` — OpenAI analisa a descrição e retorna lista com código, descrição, confiança e justificativa |
| RF-1.05 | Modal de Confirmação de CNAEs | **PARC** | Modal existe com toggle, edição e adição manual. **Falta:** botão "Pedir nova análise" com campo de feedback para a IA reanalise (loop PG-05). Procedure `refineCnaes` já existe no backend mas não está conectada ao frontend |
| RF-1.06 | Validação do Gate 1 | **IMPL** | Botão "Confirmar e Avançar" desabilitado quando nenhum CNAE selecionado |
| RF-1.07 | Feedback Visual durante Extração IA | **IMPL** | Spinner com "Analisando a descrição do negócio..." durante `extractCnaes.isPending` |
| RF-1.08 | Salvamento Automático do Rascunho | **IMPL** | `useAutoSave` + `ResumeBanner` — salva no localStorage a cada 500ms |

**Gap RF-1.05:** A procedure `refineCnaes` foi adicionada ao backend (`server/routers-fluxo-v3.ts`, linhas 94–147) mas o `NovoProjeto.tsx` ainda não a consome. O modal não tem o botão "Pedir nova análise" nem o campo de feedback.

---

### ETAPA 2 — Questionário Adaptativo (10 RFs)

| ID | Requisito | Status | Observação |
|----|-----------|--------|-----------|
| RF-2.01 | Geração de Perguntas Nível 1 via IA | **IMPL** | Procedure `generateQuestions` — gera até 10 perguntas por CNAE |
| RF-2.02 | Tipos de Campo Ricos (chips, Likert, etc.) | **IMPL** | Chips para múltipla escolha, botões Sim/Não, slider Likert, textarea, input texto |
| RF-2.03 | Stepper Visual de Progresso | **IMPL** | Barra lateral com CNAEs, indicador "CNAE X de Y", percentual de perguntas respondidas |
| RF-2.04 | Transição para Nível 2 | **IMPL** | Tela de decisão após Nível 1 com botões "Aprofundar" e "Próximo CNAE" |
| RF-2.05 | Geração de Perguntas Nível 2 via IA | **IMPL** | `generateQuestions` com `level: "nivel2"` e `previousAnswers` |
| RF-2.06 | Salvamento Automático de Respostas | **IMPL** | `saveAnswer` salva cada resposta no banco; `useAutoSave` salva progresso no localStorage |
| RF-2.07 | Navegação entre Perguntas | **PARC** | Botão "Anterior" existe para navegar entre perguntas do mesmo CNAE. **Falta:** confirmação ao tentar retornar a CNAE já concluído |
| RF-2.08 | Indicador de CNAE Concluído | **IMPL** | CNAE marcado com ✓ no stepper ao concluir Nível 1 |
| RF-2.09 | Validação do Gate 2 | **IMPL** | Botão "Avançar para Briefing" só habilitado quando todos os CNAEs têm Nível 1 concluído |
| RF-2.10 | Feedback Visual durante Geração IA | **IMPL** | Spinner com mensagem contextual "Preparando perguntas sobre [CNAE]..." |

**Gap RF-2 (PG-02/PE2-01):** O `useEffect` na linha 271 dispara `loadQuestions` automaticamente ao mudar de CNAE, sem tela de entrada/boas-vindas por CNAE. O usuário não tem a experiência de "iniciar o diagnóstico deste CNAE" — as perguntas aparecem diretamente. Isso é um gap de UX em relação à premissa PE2-07 (UX fluida, inspirada em Typeform).

---

### ETAPA 3 — Briefing de Compliance (8 RFs)

| ID | Requisito | Status | Observação |
|----|-----------|--------|-----------|
| RF-3.01 | Geração do Briefing via IA | **IMPL** | Procedure `generateBriefing` — consolida respostas e gera documento estruturado |
| RF-3.02 | Visualização com seções colapsáveis e destaques de risco | **IMPL** | Renderização Markdown com `Streamdown`, badges de risco alto/crítico |
| RF-3.03 | Ação de Aprovação | **IMPL** | Botão "Aprovar Briefing" com confirmação, salva timestamp, libera Gate 3 |
| RF-3.04 | Ação de Correção | **IMPL** | Botão "Corrigir" com campo de texto, IA regenera incorporando a correção |
| RF-3.05 | Ação de Complementar Informações | **IMPL** | Botão "Adicionar Informações" com campo de texto livre |
| RF-3.06 | Histórico de Versões | **IMPL** | Componente `VersionHistory`, tabela `briefingVersions`, badge "Versão N" |
| RF-3.07 | Indicador de Regeneração | **IMPL** | Modal de progresso com estimativa de tempo |
| RF-3.08 | Exportação do Briefing Aprovado | **IMPL** | Botão "Exportar PDF" — converte Markdown para HTML e abre janela de impressão |

---

### ETAPA 4 — Matrizes de Riscos (11 RFs)

| ID | Requisito | Status | Observação |
|----|-----------|--------|-----------|
| RF-4.01 | Geração das 4 Matrizes via IA | **IMPL** | Procedure `generateRiskMatrix` — gera as 4 áreas a partir do briefing |
| RF-4.02 | Visualização em Abas por Área | **IMPL** | Abas Contabilidade / Negócio / T.I. / Jurídico |
| RF-4.03 | Edição Inline das Linhas | **IMPL** | Clique na célula ativa modo de edição inline |
| RF-4.04 | Adição Manual de Riscos | **IMPL** | Botão "Adicionar Risco" abre linha em branco na tabela |
| RF-4.05 | Remoção de Riscos | **IMPL** | Ícone de lixeira com confirmação antes de excluir |
| RF-4.06 | Campo de Ajuste para Regeneração | **IMPL** | Campo de texto "O que precisa ser ajustado?" + botão "Regenerar esta Matriz" |
| RF-4.07 | Regeneração Individual por Área | **IMPL** | Regeneração por aba sem afetar outras áreas aprovadas |
| RF-4.08 | Aprovação por Área | **IMPL** | Botão "Aprovar Matriz" por aba, indicador "Aprovada ✓", opção "Reabrir para edição" |
| RF-4.09 | Cálculo Automático de Severidade | **IMPL** | Probabilidade × Impacto com código de cor Verde/Amarelo/Laranja/Vermelho |
| RF-4.10 | Validação do Gate 4 | **IMPL** | Botão "Avançar para Plano de Ação" só habilitado com as 4 matrizes aprovadas |
| RF-4.11 | Exportação das Matrizes | **IMPL** | Botão "Exportar PDF" (paisagem, tabela por área) + "Exportar CSV" |

---

### ETAPA 5 — Plano de Ação (17 RFs)

| ID | Requisito | Status | Observação |
|----|-----------|--------|-----------|
| RF-5.01 | Geração dos 4 Planos via IA | **IMPL** | Procedure `generateActionPlan` — gera a partir das matrizes aprovadas |
| RF-5.02 | Visualização em Abas por Área | **IMPL** | Abas Contabilidade / Negócio / T.I. / Jurídico |
| RF-5.03 | Aprovação e Ciclo de Regeneração | **IMPL** | Campo de ajuste + regeneração por área |
| RF-5.04 | Status das Tarefas | **IMPL** | 4 status: Não Iniciado / Em Andamento / Parado / Concluído com cores |
| RF-5.05 | Controle de Datas | **IMPL** | Data de início e fim, alerta visual para tarefas vencidas (≤7 dias) |
| RF-5.06 | Percentual de Andamento | **IMPL** | Slider 0–100% em incrementos de 5%, sugestão de "Concluído" ao atingir 100% |
| RF-5.07 | Atribuição de Responsável | **PARC** | Campo de seleção existe. **Falta:** filtrar lista apenas por usuários do cliente vinculado ao projeto (usa lista genérica atualmente) |
| RF-5.08 | Configuração de Notificações por Tarefa | **PARC** | Estrutura de notificações existe no schema (`notificationPreferences`). **Falta:** painel de configuração por tarefa (X dias antes, mudança de status, atualização de %, adição de comentário) |
| RF-5.09 | Comentários por Tarefa | **IMPL** | Campo de comentários com histórico cronológico, autor e timestamp |
| RF-5.10 | Filtros de Tarefas | **IMPL** | Filtros por Status, Responsável, Área, Prazo, Prioridade (combinados AND) |
| RF-5.11 | Adição Manual de Tarefas | **IMPL** | Botão "Adicionar Tarefa" em cada aba |
| RF-5.12 | Edição de Tarefas | **IMPL** | Todas as tarefas editáveis inline |
| RF-5.13 | Remoção de Tarefas (soft delete) | **IMPL** | Remoção com confirmação, arquivamento e opção de restaurar |
| RF-5.14 | Exportação PDF | **IMPL** | Botão "Exportar PDF" por área ou todos os planos |
| RF-5.15 | Exportação CSV | **IMPL** | Botão "Exportar CSV" |
| RF-5.16 | Dashboard de Progresso por Área | **IMPL** | Cards no topo de cada aba: total, % concluídas, vencidas, em andamento |
| RF-5.17 | Cadastro de Usuários por Cliente | **IMPL** | Página `GerenciarEquipe.tsx` com convite por e-mail e papéis |

---

## Resumo Executivo da Baseline

| Etapa | Total RFs | IMPL | PARC | AUSE |
|-------|-----------|------|------|------|
| Etapa 1 | 8 | 7 | 1 | 0 |
| Etapa 2 | 10 | 9 | 1 | 0 |
| Etapa 3 | 8 | 8 | 0 | 0 |
| Etapa 4 | 11 | 11 | 0 | 0 |
| Etapa 5 | 17 | 14 | 3 | 0 |
| **Total** | **54** | **49** | **5** | **0** |

**Cobertura:** 49/54 RFs totalmente implementados (91%). 5 RFs parcialmente implementados. 0 ausentes.

---

## Gaps Prioritários (RFs Parciais)

| Prioridade | RF | Gap | Esforço Estimado |
|-----------|-----|-----|-----------------|
| Alta | RF-1.05 | Conectar `refineCnaes` (backend pronto) ao modal de CNAEs no `NovoProjeto.tsx` — adicionar botão "Pedir nova análise" + campo de feedback | 2h |
| Média | RF-2 (UX) | Adicionar tela de entrada por CNAE no `QuestionarioV3.tsx` — card com código, descrição e botão "Iniciar diagnóstico" antes de chamar a IA | 3h |
| Média | RF-5.07 | Filtrar lista de responsáveis por usuários do cliente vinculado ao projeto (usar `clientMembers` + `clientId` do projeto) | 2h |
| Baixa | RF-5.08 | Painel de configuração de notificações por tarefa (X dias antes, mudança de status, etc.) | 4h |
| Baixa | RF-2.07 | Confirmação ao tentar retornar a CNAE já concluído | 1h |

---

## Premissas Globais — Status

| ID | Premissa | Status |
|----|----------|--------|
| PG-01 | IA Gen Maximizada | **IMPL** — IA usada em todas as 5 etapas |
| PG-02 | UX de Baixo Esforço | **PARC** — falta tela de entrada por CNAE (PE2-07) |
| PG-03 | Formulários Ricos | **IMPL** — chips, Likert, sim/não, slider, texto |
| PG-04 | Dois Perfis de Acesso | **PARC** — usuários cadastrados OK; sessão temporária 24h não implementada |
| PG-05 | Ciclo de Aprovação com Regeneração | **PARC** — Etapas 3/4/5 OK; Etapa 1 (CNAEs) falta o loop de feedback |
| PG-06 | Exportação Padrão | **IMPL** — PDF e CSV em todas as etapas |
| PG-07 | Notificações Configuráveis | **PARC** — estrutura existe, painel por tarefa ausente |

---

*Baseline gerada em 16/03/2026 — commit `bbeecc9` — branch `main`*
