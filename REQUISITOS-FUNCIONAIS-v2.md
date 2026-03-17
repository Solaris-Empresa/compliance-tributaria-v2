# Requisitos Funcionais — Plataforma de Compliance Tributário
**Versão:** 2.0 | **Data:** 17/03/2026 | **Status:** Vigente

> Este documento consolida os 54 RFs originais com todos os novos requisitos identificados e implementados ao longo do desenvolvimento. Serve como referência oficial para implementação, testes e auditoria.

---

## Visão Geral do Fluxo

O fluxo da plataforma é composto por **5 etapas sequenciais**, cada uma com um **gate de aprovação** que libera a próxima. A IA generativa (OpenAI) é utilizada em todas as etapas.

```
Etapa 1          Etapa 2              Etapa 3          Etapa 4              Etapa 5
Criação do  →   Questionário    →   Briefing de  →   Matrizes de    →   Plano de
Projeto         Adaptativo          Compliance        Riscos              Ação
(Gate 1:        (Gate 2:            (Gate 3:          (Gate 4:            (Gate 5:
CNAEs           Todos os CNAEs      Briefing          4 matrizes          Plano
confirmados)    concluídos)         aprovado)         aprovadas)          aprovado)
```

---

## Premissas Globais

| ID | Premissa |
|----|----------|
| PG-01 | A IA generativa (OpenAI) é utilizada de forma exaustiva em todas as etapas — identificação de CNAEs, geração de perguntas, briefing, matrizes de riscos e plano de ação |
| PG-02 | A UX deve ser de baixo esforço, fluida e inspirada em Typeform/SurveyMonkey — o usuário nunca deve sentir que está preenchendo um formulário burocrático |
| PG-03 | Formulários ricos: chips selecionáveis, sliders Likert, botões Sim/Não, escalas visuais — nunca campos de texto puro onde um componente rico é possível |
| PG-04 | Dois perfis de acesso: usuário autenticado (gestor) e usuários do cliente (Admin / Colaborador / Visualizador) |
| PG-05 | Ciclo de aprovação com regeneração ilimitada em todas as etapas — o usuário aprova ou solicita ajuste com campo de texto livre, a IA regenera até aprovação |
| PG-06 | Exportação padrão em PDF e CSV em todas as etapas que produzem documentos |
| PG-07 | Notificações configuráveis por tarefa no Plano de Ação (e-mail por evento) |
| PG-08 | Persistência automática de progresso — o usuário pode fechar o navegador e retomar exatamente do ponto onde parou |
| PG-09 | Cada cliente possui seus próprios usuários, projetos e dados — isolamento total entre clientes |

---

## Etapa 1 — Criação do Projeto

### Premissas da Etapa 1

| ID | Premissa |
|----|----------|
| PE1-01 | O campo Descrição é a fonte primária para a IA identificar os CNAEs — deve ser rico e detalhado |
| PE1-02 | A IA retorna CNAEs com código, descrição, percentual de confiança e justificativa de relevância |
| PE1-03 | O usuário tem controle total sobre a lista de CNAEs — pode confirmar, remover, adicionar manualmente e solicitar nova análise com feedback |
| PE1-04 | O salvamento automático evita perda de dados durante o preenchimento |

### Requisitos Funcionais — Etapa 1

| ID | Requisito | Descrição Detalhada | Prioridade |
|----|-----------|---------------------|-----------|
| RF-1.01 | Formulário de Criação do Projeto | Tela com 3 campos: (1) Nome do Projeto — texto curto, obrigatório; (2) Descrição — texto longo, obrigatório, mínimo 100 caracteres com contador visual e indicador de progresso; (3) Cliente Vinculado — campo de seleção com busca, obrigatório. O botão "Avançar" fica desabilitado enquanto a descrição tiver menos de 100 caracteres | Alta |
| RF-1.02 | Cadastro de Cliente On the Fly | Botão "+ Novo Cliente" ao lado do campo de seleção de cliente. Ao clicar, abre formulário inline (drawer ou modal) com campos mínimos: Razão Social, CNPJ, E-mail de contato, Telefone. Após salvar, o cliente é automaticamente selecionado no campo | Alta |
| RF-1.03 | Cadastro de Usuários por Cliente | Cada cliente possui seus próprios usuários cadastrados. O administrador do cliente pode convidar usuários por e-mail, definindo papel (Admin / Colaborador / Visualizador). Usuários Colaboradores podem editar tarefas; Visualizadores apenas consultam | Alta |
| RF-1.04 | Extração de CNAEs via IA | Ao clicar em "Avançar", a plataforma envia o conteúdo do campo Descrição para a API da OpenAI, que retorna uma lista de CNAEs prováveis com código, descrição, percentual de confiança e justificativa de relevância | Alta |
| RF-1.05 | Modal de Confirmação de CNAEs com Loop de Feedback | Um modal é exibido com a lista de CNAEs sugeridos pela IA. Cada CNAE mostra: código, descrição e percentual de confiança. O usuário pode: (a) confirmar todos; (b) remover CNAEs irrelevantes; (c) adicionar CNAEs manualmente por código ou busca de texto; (d) clicar em "Pedir nova análise" — abre campo de texto livre onde descreve o que está incorreto ou faltando — a IA reanalisa com o feedback e apresenta nova lista. O ciclo de refinamento é ilimitado | Alta |
| RF-1.06 | Validação do Gate 1 | O botão "Confirmar e Avançar" no modal só é habilitado quando ao menos 1 CNAE estiver na lista confirmada | Alta |
| RF-1.07 | Feedback Visual durante Extração IA | Durante o processamento da IA (extração de CNAEs), exibir indicador de progresso com mensagem informativa (ex: "Analisando a descrição do negócio...") | Média |
| RF-1.08 | Salvamento Automático do Rascunho | Os dados da Etapa 1 são salvos automaticamente a cada campo preenchido via `useAutoSave` + `ResumeBanner`, evitando perda de dados em caso de fechamento acidental | Média |

**Gate 1:** CNAEs confirmados pelo usuário.

---

## Etapa 2 — Questionário Adaptativo

### Premissas da Etapa 2

| ID | Premissa |
|----|----------|
| PE2-01 | O questionário é **sequencial por CNAE** — o usuário conclui um CNAE antes de passar para o próximo |
| PE2-02 | Cada CNAE possui 2 níveis de perguntas: Nível 1 (obrigatório, até 10 perguntas) e Nível 2 (opcional, aprofundamento) |
| PE2-03 | As perguntas são geradas pela IA com base no CNAE e nas respostas anteriores |
| PE2-04 | A IA escolhe o tipo de campo mais adequado para cada pergunta (sim/não, múltipla escolha, escala, texto livre) |
| PE2-05 | O usuário pode pular o Nível 2 e avançar para o próximo CNAE sem penalização |
| PE2-06 | O progresso é salvo automaticamente a cada resposta — o usuário pode retomar de onde parou |
| PE2-07 | A UX deve ser fluida e de baixo esforço — inspirada em Typeform/SurveyMonkey |
| PE2-08 | Cada CNAE tem uma **tela de entrada isolada** (card com código, descrição e botão "Iniciar diagnóstico deste CNAE") antes de a IA gerar as perguntas — a IA só é chamada após o clique do usuário |
| PE2-09 | O estado "iniciado" por CNAE é persistido no localStorage para que ao retomar o rascunho o usuário não precise clicar "Iniciar" novamente nos CNAEs já começados |

### Requisitos Funcionais — Etapa 2

| ID | Requisito | Descrição Detalhada | Prioridade |
|----|-----------|---------------------|-----------|
| RF-2.01 | Geração de Perguntas Nível 1 via IA | A IA gera até 10 perguntas contextualizadas sobre impactos da Reforma Tributária naquele ramo de atividade. As perguntas consideram o CNAE e o conteúdo da Descrição da Etapa 1 | Alta |
| RF-2.02 | Tipos de Campo Ricos | A IA define o tipo de campo para cada pergunta: (a) Sim/Não — botões grandes; (b) Múltipla Escolha — chips selecionáveis; (c) Escala Likert 1-5 — slider visual; (d) Seleção única — radio buttons estilizados; (e) Texto livre curto — campo de uma linha; (f) Texto livre longo — textarea expansível | Alta |
| RF-2.03 | Stepper Visual de Progresso | Barra de progresso mostrando: CNAE atual / total de CNAEs (ex: "CNAE 2 de 4") e percentual de perguntas respondidas no CNAE atual | Alta |
| RF-2.04 | Transição para Nível 2 | Após a última pergunta do Nível 1, exibir tela de decisão com mensagem: "Você tem alguns minutos para nos contar mais sobre este ramo? Respostas mais detalhadas geram um diagnóstico mais preciso." Botões: "Sim, vamos aprofundar" e "Não, próximo CNAE" | Alta |
| RF-2.05 | Geração de Perguntas Nível 2 via IA | Quando o usuário aceita o aprofundamento, a IA gera perguntas adicionais baseadas nas respostas do Nível 1 daquele CNAE, explorando nuances e cenários específicos. Limite: até 10 perguntas adicionais | Alta |
| RF-2.06 | Salvamento Automático de Respostas | Cada resposta é salva imediatamente no banco de dados. Ao retornar após fechar o navegador, o usuário retoma exatamente do ponto onde parou | Alta |
| RF-2.07 | Navegação entre Perguntas | O usuário pode navegar para a pergunta anterior dentro do mesmo CNAE para corrigir uma resposta. Não é permitido retornar a um CNAE já concluído sem confirmação explícita do usuário | Média |
| RF-2.08 | Indicador de CNAE Concluído | Ao finalizar as perguntas de um CNAE (Nível 1 + decisão de Nível 2), o CNAE é marcado como "Concluído" (✓) no stepper visual | Alta |
| RF-2.09 | Validação do Gate 2 | O avanço para a Etapa 3 só é liberado quando todos os CNAEs tiverem o Nível 1 concluído. O Nível 2 é opcional e não bloqueia o avanço | Alta |
| RF-2.10 | Feedback Visual durante Geração IA | Ao gerar as perguntas de cada CNAE, exibir indicador de carregamento com mensagem contextual (ex: "Preparando perguntas sobre Comércio Varejista...") | Média |
| RF-2.11 | Tela de Entrada Isolada por CNAE | Antes de gerar as perguntas de cada CNAE, exibir card isolado com: código CNAE, descrição completa, número do CNAE na sequência e botão "Iniciar diagnóstico deste CNAE". A IA só é chamada após o clique — nunca automaticamente | Alta |

**Gate 2:** Todos os CNAEs com Nível 1 concluído.

---

## Etapa 3 — Briefing de Compliance

### Premissas da Etapa 3

| ID | Premissa |
|----|----------|
| PE3-01 | O Briefing é gerado automaticamente pela IA a partir de todas as respostas da Etapa 2 |
| PE3-02 | O Briefing é um documento único consolidado cobrindo todos os CNAEs |
| PE3-03 | O ciclo de revisão é ilimitado — a IA regenera quantas vezes forem necessárias até a aprovação |
| PE3-04 | O usuário pode corrigir (apontar erros específicos) ou complementar (fornecer mais informações) antes de solicitar a regeneração |
| PE3-05 | A aprovação do Briefing é o Gate 3 — sem aprovação, as Etapas 4 e 5 não são acessíveis |

### Requisitos Funcionais — Etapa 3

| ID | Requisito | Descrição Detalhada | Prioridade |
|----|-----------|---------------------|-----------|
| RF-3.01 | Geração do Briefing via IA | Ao entrar na Etapa 3, a IA consolida todas as respostas do questionário e gera um Briefing de Compliance estruturado, contendo: (a) Resumo executivo do negócio; (b) Análise de impacto da Reforma Tributária por CNAE; (c) Principais gaps de compliance identificados; (d) Nível de risco geral (Baixo / Médio / Alto / Crítico) | Alta |
| RF-3.02 | Visualização do Briefing | O Briefing é exibido em formato de documento legível com seções colapsáveis, renderização de Markdown e destaques visuais para trechos de risco alto (badges coloridos) | Alta |
| RF-3.03 | Ação de Aprovação | Botão "Aprovar Briefing" com confirmação. Ao aprovar, o documento é salvo com timestamp e o Gate 3 é liberado | Alta |
| RF-3.04 | Ação de Correção | Botão "Corrigir". Ao clicar, abre um campo de texto onde o usuário descreve o que está incorreto ou incompleto. A IA regenera o Briefing incorporando a correção | Alta |
| RF-3.05 | Ação de Complementar Informações | Botão "Adicionar Informações". Abre um campo de texto livre onde o usuário pode fornecer contexto adicional. A IA regenera o Briefing com as novas informações | Alta |
| RF-3.06 | Histórico de Versões do Briefing | Cada versão gerada é salva com número de versão e timestamp. O usuário pode consultar versões anteriores para comparação. Badge "Versão N" visível no documento | Média |
| RF-3.07 | Indicador de Regeneração | Durante a regeneração, exibir indicador de progresso com estimativa de tempo (ex: "Atualizando o briefing... estimativa: 30 segundos") | Alta |
| RF-3.08 | Exportação do Briefing Aprovado | Após aprovação, o Briefing pode ser exportado em PDF simples (via impressão do Markdown renderizado) | Média |

**Gate 3:** Briefing aprovado pelo usuário.

---

## Etapa 4 — Matrizes de Riscos

### Premissas da Etapa 4

| ID | Premissa |
|----|----------|
| PE4-01 | São geradas 4 matrizes independentes, uma por área: Contabilidade, Áreas de Negócio, T.I. e Advocacia Tributária |
| PE4-02 | Cada matriz é gerada pela IA a partir do Briefing aprovado na Etapa 3 |
| PE4-03 | A severidade é calculada automaticamente: Probabilidade × Impacto |
| PE4-04 | O ciclo de revisão é por matriz — o usuário pode aprovar uma área e ajustar outra |
| PE4-05 | A UX deve facilitar a edição inline das linhas da matriz — sem abrir modais para cada edição |
| PE4-06 | O Gate 4 só é liberado quando todas as 4 matrizes estiverem aprovadas |

### Requisitos Funcionais — Etapa 4

| ID | Requisito | Descrição Detalhada | Prioridade |
|----|-----------|---------------------|-----------|
| RF-4.01 | Geração das 4 Matrizes via IA | A IA gera as 4 matrizes de riscos a partir do Briefing aprovado. Cada risco contém: título, descrição, probabilidade, impacto, severidade calculada e recomendação | Alta |
| RF-4.02 | Visualização em Abas por Área | As 4 matrizes são exibidas em abas: "Contabilidade", "Negócio", "T.I.", "Jurídico". Cada aba exibe a tabela de riscos daquela área | Alta |
| RF-4.03 | Edição Inline das Linhas | Clique em qualquer célula da tabela ativa modo de edição inline — sem modais. O usuário edita diretamente na linha | Alta |
| RF-4.04 | Adição Manual de Riscos | Botão "Adicionar Risco" em cada aba. Abre linha em branco na tabela para preenchimento manual. O risco é adicionado ao plano sem regeneração da IA | Alta |
| RF-4.05 | Remoção de Riscos | Cada linha possui ícone de lixeira com confirmação antes de excluir | Alta |
| RF-4.06 | Campo de Ajuste para Regeneração | Campo de texto "O que precisa ser ajustado?" + botão "Regenerar esta Matriz". A IA regenera apenas a matriz da aba ativa | Alta |
| RF-4.07 | Regeneração Individual por Área | A regeneração é por aba — não afeta outras áreas já aprovadas | Alta |
| RF-4.08 | Aprovação por Área com Reabrir | Botão "Aprovar Matriz" por aba. Ao aprovar, exibe indicador "Aprovada ✓". Botão "Reabrir para edição" permite desfazer a aprovação e editar novamente | Alta |
| RF-4.09 | Cálculo Automático de Severidade | Severidade = Probabilidade × Impacto. Código de cor: Verde (Baixa), Amarelo (Média), Laranja (Alta), Vermelho (Crítica) | Alta |
| RF-4.10 | Validação do Gate 4 | O botão "Avançar para Plano de Ação" só é habilitado quando as 4 matrizes estiverem com status "Aprovada" | Alta |
| RF-4.11 | Exportação das Matrizes | Após aprovação, as 4 matrizes podem ser exportadas juntas em PDF (paisagem, tabela por área) e CSV | Média |

**Gate 4:** 4 matrizes aprovadas.

---

## Etapa 5 — Plano de Ação

### Premissas da Etapa 5

| ID | Premissa |
|----|----------|
| PE5-01 | São gerados 4 Planos de Ação independentes, um por área: Contabilidade, Negócio, T.I. e Jurídico |
| PE5-02 | Cada Plano de Ação é gerado pela IA a partir da respectiva Matriz de Riscos aprovada |
| PE5-03 | O Plano de Ação tem funcionalidades essenciais de gestão de tarefas (inspirado no Trello) |
| PE5-04 | Cada tarefa possui: título, descrição, responsável, data de início, data de fim, status, percentual de andamento e notificações configuráveis |
| PE5-05 | O responsável é um usuário cadastrado no cliente vinculado ao projeto — a lista de responsáveis é filtrada por `clientMembers` do cliente do projeto |
| PE5-06 | As notificações por e-mail são configuráveis por tarefa — o usuário define quais eventos disparam notificação |
| PE5-07 | A exportação é em PDF simples e CSV |
| PE5-08 | O loop de geração usa `useRef` para garantir que a IA seja chamada apenas uma vez por área — sem loops infinitos por re-render |

### Requisitos Funcionais — Etapa 5

| ID | Requisito | Descrição Detalhada | Prioridade |
|----|-----------|---------------------|-----------|
| RF-5.01 | Geração dos 4 Planos via IA | A IA gera os 4 Planos de Ação a partir das respectivas matrizes aprovadas. Cada tarefa gerada contém: título, descrição da ação, área, responsável sugerido, prazo sugerido (baseado na severidade) e status inicial "Não Iniciado" | Alta |
| RF-5.02 | Visualização em Abas por Área | Os 4 planos são exibidos em abas: "Contabilidade", "Negócio", "T.I.", "Jurídico". Cada aba exibe a lista de tarefas daquela área | Alta |
| RF-5.03 | Aprovação e Ciclo de Regeneração | Mesmo padrão das etapas anteriores: o usuário revisa, aprova ou solicita ajustes com campo de texto. A IA regenera o plano até aprovação | Alta |
| RF-5.04 | Status das Tarefas | Cada tarefa possui status com 4 opções: Não Iniciado (cinza), Em Andamento (azul), Parado (laranja), Concluído (verde). O status é alterado via dropdown ou clique direto | Alta |
| RF-5.05 | Controle de Datas | Cada tarefa possui: Data de Início e Data de Fim. Exibição de alerta visual quando a data de fim está próxima (≤ 7 dias) ou vencida | Alta |
| RF-5.06 | Percentual de Andamento | Slider visual de 0% a 100% em incrementos de 5%. O valor é exibido numericamente ao lado do slider. Quando o usuário marca 100%, o sistema sugere alterar o status para "Concluído" | Alta |
| RF-5.07 | Atribuição de Responsável | Campo de seleção do responsável pela tarefa. A lista exibe apenas usuários cadastrados no cliente vinculado ao projeto (via `clientMembers.listByProject`). Múltiplos responsáveis são permitidos. Fallback para campo de texto livre quando não há membros cadastrados | Alta |
| RF-5.08 | Configuração de Notificações por Tarefa | Cada tarefa possui painel de configuração de notificações. O usuário define quais eventos disparam e-mail: (a) X dias antes do prazo de fim (configurável: 1, 3, 7, 15 dias); (b) Mudança de status; (c) Atualização de percentual de andamento; (d) Adição de comentário. Cada evento pode ser ativado/desativado individualmente | Alta |
| RF-5.09 | Comentários por Tarefa | Campo de comentários em cada tarefa com histórico cronológico. Suporte a texto formatado. Cada comentário registra autor e timestamp | Alta |
| RF-5.10 | Filtros de Tarefas | Filtros disponíveis: por Status, por Responsável, por Área, por Prazo (vencidas, esta semana, este mês), por Prioridade. Filtros são combinados (AND) | Alta |
| RF-5.11 | Adição Manual de Tarefas | Botão "Adicionar Tarefa" em cada aba. O usuário preenche os campos manualmente. A tarefa é adicionada ao plano sem regeneração da IA | Alta |
| RF-5.12 | Edição de Tarefas | Todas as tarefas (geradas pela IA ou adicionadas manualmente) podem ser editadas pelo usuário com permissão de edição | Alta |
| RF-5.13 | Remoção de Tarefas (Soft Delete) | Cada tarefa possui opção de remoção com confirmação. Tarefas removidas são arquivadas (soft delete) e podem ser restauradas | Média |
| RF-5.14 | Exportação PDF | Botão "Exportar PDF" disponível por área (aba ativa) ou para todos os planos. O PDF contém tabela com todas as tarefas, seus campos e status atual | Alta |
| RF-5.15 | Exportação CSV | Botão "Exportar CSV" com as mesmas opções do PDF. O CSV contém uma linha por tarefa com todos os campos | Alta |
| RF-5.16 | Dashboard de Progresso por Área | Topo de cada aba exibe: total de tarefas, % concluídas, tarefas vencidas e tarefas em andamento — em cards de resumo | Média |
| RF-5.17 | Cadastro de Usuários por Cliente | Área de administração onde o gestor do cliente cadastra e convida usuários por e-mail, define papéis (Admin / Colaborador / Visualizador) e gerencia acessos | Alta |
| RF-5.18 | Tela de Conclusão do Projeto | Após a aprovação do Plano de Ação (última etapa), exibir tela de parabéns com: ícone animado, 3 cards de resumo (CNAEs analisados, riscos mapeados, tarefas criadas), lista completa de CNAEs, distribuição de tarefas por área e botões "Ir para o Painel" e "Ver Projeto" | Alta |
| RF-5.19 | Relatório Final em PDF | Botão "Baixar Relatório Final (PDF)" na tela de conclusão. Gera PDF A4 com: cabeçalho colorido, resumo executivo, tabela de CNAEs, matriz de riscos com cores por severidade e plano de ação ordenado por responsável — com rodapé e paginação automática | Alta |

**Gate 5:** Plano aprovado e publicado.

---

## Módulo Transversal — Painel de Controle

### Requisitos Funcionais — Painel

| ID | Requisito | Descrição Detalhada | Prioridade |
|----|-----------|---------------------|-----------|
| RF-P.01 | Listagem de Projetos com Filtros | O Painel exibe todos os projetos do usuário com chips de filtro rápido: Todos, Em Andamento, Aguardando Aprovação, Aprovados, Rascunho. Cada chip exibe o contador de projetos naquela categoria | Alta |
| RF-P.02 | Busca por Nome de Projeto | Campo de busca por nome do projeto com filtragem em tempo real (case-insensitive, busca por substring) | Alta |
| RF-P.03 | Cards de Stats Clicáveis | Cards de resumo no topo do Painel (Total, Em Andamento, Aguardando, Aprovados) são clicáveis e ativam o filtro correspondente | Média |
| RF-P.04 | Estado Vazio Contextual | Quando nenhum projeto corresponde ao filtro ativo, exibir mensagem contextual específica para aquele filtro (ex: "Nenhum projeto aguardando aprovação") | Média |

---

## Módulo Transversal — Gerenciamento de Equipe

### Requisitos Funcionais — Equipe

| ID | Requisito | Descrição Detalhada | Prioridade |
|----|-----------|---------------------|-----------|
| RF-E.01 | Cadastro de Membros por Cliente | Página "Minha Equipe" onde o gestor cadastra membros por cliente. Campos: nome, e-mail, papel (Admin / Colaborador / Visualizador) | Alta |
| RF-E.02 | Convite por E-mail | Ao adicionar um membro, o sistema envia notificação com link de acesso | Alta |
| RF-E.03 | Papéis e Permissões | Admin: acesso total; Colaborador: pode editar tarefas; Visualizador: somente leitura | Alta |
| RF-E.04 | Listagem de Membros Ativos | Tabela com membros ativos, papel, data de cadastro e opções de editar/remover | Média |

---

## Resumo Quantitativo

| Etapa | RFs | Alta Prioridade | Gate de Avanço |
|-------|-----|-----------------|----------------|
| Etapa 1 — Criação do Projeto | 8 | 6 | CNAEs confirmados |
| Etapa 2 — Questionário Adaptativo | 11 | 9 | Todos os CNAEs com Nível 1 concluído |
| Etapa 3 — Briefing de Compliance | 8 | 6 | Briefing aprovado |
| Etapa 4 — Matrizes de Riscos | 11 | 10 | 4 matrizes aprovadas |
| Etapa 5 — Plano de Ação | 19 | 17 | Plano aprovado e publicado |
| Painel de Controle | 4 | 2 | — |
| Gerenciamento de Equipe | 4 | 3 | — |
| **Total** | **65** | **53** | — |

---

## Novos Requisitos vs. Versão 1.0

Os seguintes requisitos foram **adicionados** nesta versão 2.0 em relação ao documento original de 54 RFs:

| ID | Requisito | Origem |
|----|-----------|--------|
| RF-2.11 | Tela de Entrada Isolada por CNAE | Identificado durante desenvolvimento — premissa PE2-08 |
| RF-5.18 | Tela de Conclusão do Projeto | Solicitado durante sessão de desenvolvimento |
| RF-5.19 | Relatório Final em PDF | Solicitado durante sessão de desenvolvimento |
| RF-P.01 | Listagem de Projetos com Filtros | Solicitado durante sessão de desenvolvimento |
| RF-P.02 | Busca por Nome de Projeto | Solicitado durante sessão de desenvolvimento |
| RF-P.03 | Cards de Stats Clicáveis | Solicitado durante sessão de desenvolvimento |
| RF-P.04 | Estado Vazio Contextual | Identificado durante desenvolvimento |
| RF-E.01 | Cadastro de Membros por Cliente | Extraído de RF-1.03 e RF-5.17 (módulo próprio) |
| RF-E.02 | Convite por E-mail | Extraído de RF-1.03 e RF-5.17 (módulo próprio) |
| RF-E.03 | Papéis e Permissões | Extraído de RF-1.03 e RF-5.17 (módulo próprio) |
| RF-E.04 | Listagem de Membros Ativos | Extraído de RF-1.03 e RF-5.17 (módulo próprio) |

---

## Correções Técnicas Incorporadas

As seguintes correções técnicas foram identificadas e implementadas durante o desenvolvimento e devem ser mantidas em qualquer refatoração futura:

| Componente | Problema | Solução |
|-----------|---------|---------|
| `PlanoAcaoV3.tsx` | `useEffect([project])` causava loop infinito — re-disparava `handleGenerate` após cada mutação | Substituído por `generationTriggeredRef` (`useRef`) — garante execução única |
| `QuestionarioV3.tsx` | `useEffect([startedCnaes.size])` re-disparava `loadQuestions` em loop | Substituído por `loadedQuestionsRef` — carregamento direto em `handleStartCnae` |
| `MatrizesV3.tsx` | Threshold de severidade: Média×Médio (score 4) classificado incorretamente | Score ≥ 4 = "Alta" conforme tabela 3×3 padrão |

---

*Documento gerado em 17/03/2026 — Plataforma de Compliance Tributário v2.0*
