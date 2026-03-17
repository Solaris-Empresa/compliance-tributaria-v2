# Requisitos Funcionais — Plataforma de Compliance Tributário

**Versão:** 3.0 | **Data:** 17/03/2026 | **Status:** Vigente

Este documento consolida os 65 RFs da versão 2.0 com os **11 novos requisitos** identificados e implementados nas sprints V55, V56 e V57. O total passa de **65 para 76 RFs**. Serve como referência oficial para implementação, testes e auditoria.

---

## Visão Geral do Fluxo

O fluxo da plataforma é composto por 5 etapas sequenciais, cada uma com um gate de aprovação que libera a próxima. A IA generativa (OpenAI) é utilizada em todas as etapas.

```
Etapa 1       →  Etapa 2          →  Etapa 3        →  Etapa 4         →  Etapa 5
Criação do       Questionário        Briefing de        Matrizes de        Plano de
Projeto          Adaptativo          Compliance         Riscos             Ação

(Gate 1:         (Gate 2:            (Gate 3:           (Gate 4:           (Gate 5:
CNAEs            Todos os CNAEs      Briefing           4 matrizes         Plano
confirmados)     concluídos)         aprovado)          aprovadas)         aprovado)
```

---

## Premissas Globais

| ID | Premissa |
|----|----------|
| PG-01 | A IA generativa (OpenAI) é utilizada de forma exaustiva em todas as etapas — identificação de CNAEs, geração de perguntas, briefing, matrizes de riscos e plano de ação |
| PG-02 | A UX deve ser de baixo esforço, fluida e inspirada em Typeform/SurveyMonkey — o usuário nunca deve sentir que está preenchendo um formulário burocrático |
| PG-03 | Formulários ricos: chips selecionáveis, sliders Likert, botões Sim/Não, escalas visuais — nunca campos de texto puro onde um componente rico é possível |
| PG-04 | Quatro perfis de acesso: Equipe SOLARIS, Advogado Sênior, Advogado Júnior e Cliente — com permissões distintas por papel |
| PG-05 | Ciclo de aprovação com regeneração ilimitada em todas as etapas — o usuário aprova ou solicita ajuste com campo de texto livre, a IA regenera até aprovação |
| PG-06 | Exportação padrão em PDF e CSV em todas as etapas que produzem documentos |
| PG-07 | Notificações configuráveis por tarefa no Plano de Ação (e-mail por evento) |
| PG-08 | Persistência automática de progresso — o usuário pode fechar o navegador e retomar exatamente do ponto onde parou |
| PG-09 | Cada cliente possui seus próprios usuários, projetos e dados — isolamento total entre clientes |
| **PG-10** | **Controle de situação do projeto por papel — clientes podem apenas solicitar avaliação; a equipe SOLARIS e advogados seniores têm acesso a todos os status** *(novo — Sprint V55)* |

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
|----|-----------|---------------------|------------|
| RF-1.01 | Formulário de Criação do Projeto | Tela com 3 campos: (1) Nome do Projeto — texto curto, obrigatório; (2) Descrição — texto longo, obrigatório, mínimo 100 caracteres com contador visual e indicador de progresso; (3) Cliente Vinculado — campo de seleção com busca, obrigatório. O botão "Avançar" fica desabilitado enquanto a descrição tiver menos de 100 caracteres | Alta |
| RF-1.02 | Cadastro de Cliente On the Fly | Botão "+ Novo Cliente" ao lado do campo de seleção de cliente. Ao clicar, abre formulário inline (drawer ou modal) com campos mínimos: Razão Social, CNPJ (com máscara XX.XXX.XXX/XXXX-XX e validação), E-mail de contato, Telefone. Após salvar, o cliente é automaticamente selecionado no campo | Alta |
| RF-1.03 | Cadastro de Usuários por Cliente | Cada cliente possui seus próprios usuários cadastrados. O administrador do cliente pode convidar usuários por e-mail, definindo papel (Admin / Colaborador / Visualizador). Usuários Colaboradores podem editar tarefas; Visualizadores apenas consultam | Alta |
| RF-1.04 | Extração de CNAEs via IA | Ao clicar em "Avançar", a plataforma envia o conteúdo do campo Descrição para a API da OpenAI, que retorna uma lista de CNAEs prováveis com código, descrição, percentual de confiança e justificativa de relevância | Alta |
| RF-1.05 | Modal de Confirmação de CNAEs com Loop de Feedback | Um modal é exibido com a lista de CNAEs sugeridos pela IA. Cada CNAE mostra: código, descrição e percentual de confiança. O usuário pode: (a) confirmar todos; (b) remover CNAEs irrelevantes; (c) adicionar CNAEs manualmente por código ou busca de texto; (d) clicar em "Pedir nova análise" — abre campo de texto livre onde descreve o que está incorreto ou faltando — a IA reanalisa com o feedback e apresenta nova lista. O ciclo de refinamento é ilimitado | Alta |
| RF-1.06 | Validação do Gate 1 | O botão "Confirmar e Avançar" no modal só é habilitado quando ao menos 1 CNAE estiver na lista confirmada | Alta |
| RF-1.07 | Feedback Visual durante Extração IA | Durante o processamento da IA (extração de CNAEs), exibir indicador de progresso com mensagem informativa (ex: "Analisando a descrição do negócio...") | Média |
| RF-1.08 | Salvamento Automático do Rascunho | Os dados da Etapa 1 são salvos automaticamente a cada campo preenchido via useAutoSave + ResumeBanner, evitando perda de dados em caso de fechamento acidental | Média |

**Gate 1:** CNAEs confirmados pelo usuário.

---

## Etapa 2 — Questionário Adaptativo

### Premissas da Etapa 2

| ID | Premissa |
|----|----------|
| PE2-01 | O questionário é sequencial por CNAE — o usuário conclui um CNAE antes de passar para o próximo |
| PE2-02 | Cada CNAE possui 2 níveis de perguntas: Nível 1 (obrigatório, até 10 perguntas) e Nível 2 (opcional, aprofundamento) |
| PE2-03 | As perguntas são geradas pela IA com base no CNAE e nas respostas anteriores |
| PE2-04 | A IA escolhe o tipo de campo mais adequado para cada pergunta (sim/não, múltipla escolha, escala, texto livre) |
| PE2-05 | O usuário pode pular o Nível 2 e avançar para o próximo CNAE sem penalização |
| PE2-06 | O progresso é salvo automaticamente a cada resposta — o usuário pode retomar de onde parou |
| PE2-07 | A UX deve ser fluida e de baixo esforço — inspirada em Typeform/SurveyMonkey |
| PE2-08 | Cada CNAE tem uma tela de entrada isolada (card com código, descrição e botão "Iniciar diagnóstico deste CNAE") antes de a IA gerar as perguntas — a IA só é chamada após o clique do usuário |
| PE2-09 | O estado "iniciado" por CNAE é persistido no banco de dados para que ao retomar o rascunho o usuário não precise clicar "Iniciar" novamente nos CNAEs já começados |

### Requisitos Funcionais — Etapa 2

| ID | Requisito | Descrição Detalhada | Prioridade |
|----|-----------|---------------------|------------|
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
| **RF-2.12** | **Restauração de Progresso ao Reabrir** | **Ao reabrir o questionário de um projeto já iniciado, o sistema restaura automaticamente o estado de cada CNAE (iniciado, em progresso, concluído) a partir das respostas salvas no banco, sem exigir que o usuário clique em "Iniciar" novamente nos CNAEs já respondidos** *(novo — Sprint V56)* | Alta |

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
|----|-----------|---------------------|------------|
| RF-3.01 | Geração do Briefing via IA | Ao entrar na Etapa 3, a IA consolida todas as respostas do questionário e gera um Briefing de Compliance estruturado, contendo: (a) Resumo executivo do negócio; (b) Análise de impacto da Reforma Tributária por CNAE; (c) Principais gaps de compliance identificados; (d) Nível de risco geral (Baixo / Médio / Alto / Crítico) | Alta |
| RF-3.02 | Visualização do Briefing | O Briefing é exibido em formato de documento legível com seções colapsáveis, renderização de Markdown e destaques visuais para trechos de risco alto (badges coloridos) | Alta |
| RF-3.03 | Ação de Aprovação | Botão "Aprovar Briefing" com confirmação. Ao aprovar, o documento é salvo com timestamp e o Gate 3 é liberado | Alta |
| RF-3.04 | Ação de Correção | Botão "Corrigir". Ao clicar, abre um campo de texto onde o usuário descreve o que está incorreto ou incompleto. A IA regenera o Briefing incorporando a correção | Alta |
| RF-3.05 | Ação de Complementar Informações | Botão "Adicionar Informações". Abre um campo de texto livre onde o usuário pode fornecer contexto adicional. A IA regenera o Briefing com as novas informações | Alta |
| RF-3.06 | Histórico de Versões do Briefing | Cada versão gerada é salva com número de versão e timestamp. O usuário pode consultar versões anteriores para comparação. Badge "Versão N" visível no documento | Média |
| RF-3.07 | Indicador de Regeneração | Durante a regeneração, exibir indicador de progresso com estimativa de tempo (ex: "Atualizando o briefing... estimativa: 30 segundos") | Alta |
| RF-3.08 | Exportação do Briefing Aprovado | Após aprovação, o Briefing pode ser exportado em PDF simples (via impressão do Markdown renderizado) | Média |
| **RF-3.09** | **Aviso de Re-geração de Conteúdo Aprovado** | **Ao reabrir a página de Briefing de um projeto que já teve o briefing aprovado anteriormente, exibir banner informativo azul ("Este briefing foi aprovado anteriormente — regenerar irá criar uma nova versão") para evitar re-gerações acidentais. O conteúdo aprovado é carregado automaticamente do banco** *(novo — Sprint V56)* | Alta |
| **RF-3.10** | **Comentários e Anotações Colaborativas no Briefing** | **Seção de comentários na página de Briefing, visível a todos os participantes do projeto. Cada comentário registra: autor (com avatar e iniciais), papel do usuário (badge colorido), conteúdo em texto livre, timestamp relativo (ex: "há 2 horas") e indicador de edição ("editado"). O autor pode editar ou excluir seu próprio comentário. A seção é colapsável e exibe o contador de comentários no cabeçalho** *(novo — Sprint V57)* | Alta |

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
|----|-----------|---------------------|------------|
| RF-4.01 | Geração das 4 Matrizes via IA | A IA gera as 4 matrizes de riscos a partir do Briefing aprovado. Cada risco contém: título, descrição, probabilidade, impacto, severidade calculada e recomendação | Alta |
| RF-4.02 | Visualização em Abas por Área | As 4 matrizes são exibidas em abas: "Contabilidade", "Negócio", "T.I.", "Jurídico". Cada aba exibe a tabela de riscos daquela área | Alta |
| RF-4.03 | Edição Inline das Linhas | Clique em qualquer célula da tabela ativa modo de edição inline — sem modais. O usuário edita diretamente na linha | Alta |
| RF-4.04 | Adição Manual de Riscos | Botão "Adicionar Risco" em cada aba. Abre linha em branco na tabela para preenchimento manual. O risco é adicionado ao plano sem regeneração da IA | Alta |
| RF-4.05 | Remoção de Riscos | Cada linha possui ícone de lixeira com confirmação antes de excluir | Alta |
| RF-4.06 | Campo de Ajuste para Regeneração | Campo de texto "O que precisa ser ajustado?" + botão "Regenerar esta Matriz". A IA regenera apenas a matriz da aba ativa | Alta |
| RF-4.07 | Regeneração Individual por Área | A regeneração é por aba — não afeta outras áreas já aprovadas | Alta |
| RF-4.08 | Aprovação por Área com Reabrir | Botão "Aprovar Matriz" por aba. Ao aprovar, exibe indicador "Aprovada ✓". Botão "Reabrir para edição" permite desfazer a aprovação e editar novamente | Alta |
| RF-4.09 | Cálculo Automático de Severidade | Severidade = Probabilidade × Impacto. Código de cor: Verde (Baixa), Amarelo (Média), Laranja (Alta), Vermelho (Crítica). Threshold: score ≥ 4 = "Alta" conforme tabela 3×3 padrão | Alta |
| RF-4.10 | Validação do Gate 4 | O botão "Avançar para Plano de Ação" só é habilitado quando as 4 matrizes estiverem com status "Aprovada" | Alta |
| RF-4.11 | Exportação das Matrizes | Após aprovação, as 4 matrizes podem ser exportadas juntas em PDF (paisagem, tabela por área) e CSV | Média |
| **RF-4.12** | **Aviso de Re-geração de Matrizes Aprovadas** | **Ao reabrir a página de Matrizes de um projeto que já teve as matrizes aprovadas, exibir banner informativo azul ("As matrizes de riscos foram aprovadas anteriormente — regenerar irá criar uma nova versão") para evitar re-gerações acidentais. O conteúdo aprovado é carregado automaticamente do banco** *(novo — Sprint V56)* | Alta |
| **RF-4.13** | **Comentários e Anotações Colaborativas nas Matrizes** | **Seção de comentários na página de Matrizes de Riscos, com as mesmas funcionalidades do RF-3.10 (autor, papel, timestamp relativo, edição, exclusão, seção colapsável)** *(novo — Sprint V57)* | Alta |

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
| PE5-05 | O responsável é um usuário cadastrado no cliente vinculado ao projeto — a lista de responsáveis é filtrada por clientMembers do cliente do projeto |
| PE5-06 | As notificações por e-mail são configuráveis por tarefa — o usuário define quais eventos disparam notificação |
| PE5-07 | A exportação é em PDF simples e CSV |
| PE5-08 | O loop de geração usa useRef para garantir que a IA seja chamada apenas uma vez por área — sem loops infinitos por re-render |

### Requisitos Funcionais — Etapa 5

| ID | Requisito | Descrição Detalhada | Prioridade |
|----|-----------|---------------------|------------|
| RF-5.01 | Geração dos 4 Planos via IA | A IA gera os 4 Planos de Ação a partir das respectivas matrizes aprovadas. Cada tarefa gerada contém: título, descrição da ação, área, responsável sugerido, prazo sugerido (baseado na severidade) e status inicial "Não Iniciado" | Alta |
| RF-5.02 | Visualização em Abas por Área | Os 4 planos são exibidos em abas: "Contabilidade", "Negócio", "T.I.", "Jurídico". Cada aba exibe a lista de tarefas daquela área | Alta |
| RF-5.03 | Aprovação e Ciclo de Regeneração | Mesmo padrão das etapas anteriores: o usuário revisa, aprova ou solicita ajustes com campo de texto. A IA regenera o plano até aprovação | Alta |
| RF-5.04 | Status das Tarefas | Cada tarefa possui status com 4 opções: Não Iniciado (cinza), Em Andamento (azul), Parado (laranja), Concluído (verde). O status é alterado via dropdown ou clique direto | Alta |
| RF-5.05 | Controle de Datas | Cada tarefa possui: Data de Início e Data de Fim. Exibição de alerta visual quando a data de fim está próxima (≤ 7 dias) ou vencida | Alta |
| RF-5.06 | Percentual de Andamento | Slider visual de 0% a 100% em incrementos de 5%. O valor é exibido numericamente ao lado do slider. Quando o usuário marca 100%, o sistema sugere alterar o status para "Concluído" | Alta |
| RF-5.07 | Atribuição de Responsável | Campo de seleção do responsável pela tarefa. A lista exibe apenas usuários cadastrados no cliente vinculado ao projeto. Múltiplos responsáveis são permitidos. Fallback para campo de texto livre quando não há membros cadastrados | Alta |
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
| **RF-5.20** | **Tela de Conclusão Persistente** | **A tela de conclusão do projeto é exibida automaticamente ao reabrir a página de Plano de Ação de um projeto já aprovado, carregando os dados reais de riscos e tarefas do banco. Botão "Editar Plano de Ação" permite retornar ao modo de edição a partir da tela de conclusão** *(novo — Sprint V56)* | Alta |
| **RF-5.21** | **Comentários e Anotações Colaborativas no Plano de Ação** | **Seção de comentários na página de Plano de Ação, com as mesmas funcionalidades do RF-3.10 (autor, papel, timestamp relativo, edição, exclusão, seção colapsável)** *(novo — Sprint V57)* | Alta |

**Gate 5:** Plano aprovado e publicado.

---

## Módulo Transversal — Painel de Controle

### Requisitos Funcionais — Painel

| ID | Requisito | Descrição Detalhada | Prioridade |
|----|-----------|---------------------|------------|
| RF-P.01 | Listagem de Projetos com Filtros | O Painel exibe todos os projetos do usuário com chips de filtro rápido: Todos, Em Andamento, Aguardando Aprovação, Aprovados, Rascunho. Cada chip exibe o contador de projetos naquela categoria | Alta |
| RF-P.02 | Busca por Nome de Projeto | Campo de busca por nome do projeto com filtragem em tempo real (case-insensitive, busca por substring) | Alta |
| RF-P.03 | Cards de Stats Clicáveis | Cards de resumo no topo do Painel (Total, Em Andamento, Aguardando, Aprovados) são clicáveis e ativam o filtro correspondente | Média |
| RF-P.04 | Estado Vazio Contextual | Quando nenhum projeto corresponde ao filtro ativo, exibir mensagem contextual específica para aquele filtro (ex: "Nenhum projeto aguardando aprovação") | Média |
| **RF-P.05** | **Filtro por Situação na Lista de Projetos** | **Dropdown de filtro por situação na página de listagem de projetos, com todas as 11 opções de status (rascunho, assessment_fase1, assessment_fase2, matriz_riscos, plano_acao, em_avaliacao, aprovado, em_andamento, parado, concluido, arquivado) mais "Todos os status". Indicador colorido (ponto) em cada opção. Botão de limpar filtros (X) quando há filtros ativos. Contador de resultados com informação sobre filtros ativos** *(novo — Sprint V55)* | Alta |

---

## Módulo Transversal — Situação do Projeto

Este módulo foi introduzido na Sprint V55 e não existia na versão 2.0 do documento.

### Requisitos Funcionais — Situação

| ID | Requisito | Descrição Detalhada | Prioridade |
|----|-----------|---------------------|------------|
| **RF-S.01** | **Dropdown de Situação do Projeto** | **Na página de detalhes do projeto (ProjetoDetalhesV2), o badge estático de status é substituído por um `Select` interativo. Ícone `Tag` ao lado do dropdown para sinalizar visualmente o campo. Indicador circular colorido em cada opção. Spinner de carregamento durante a mutação. Persistência via mutação tRPC `projects.updateStatus`** *(novo — Sprint V55)* | Alta |
| **RF-S.02** | **Controle de Permissões por Papel** | **Equipe SOLARIS e Advogados Seniores visualizam e podem selecionar todos os 11 status. Clientes visualizam apenas o status atual e a opção "Em Avaliação" (solicitação de revisão). Advogados Júniores têm acesso somente leitura ao status** *(novo — Sprint V55)* | Alta |
| **RF-S.03** | **Transições de Status com Auditoria** | **Cada mudança de status é registrada em log de auditoria no servidor com: ID do projeto, status anterior, novo status, papel do usuário e timestamp. A procedure retorna `changedBy` (papel do usuário que realizou a mudança) para rastreabilidade** *(novo — Sprint V55)* | Alta |

---

## Módulo Transversal — Gerenciamento de Equipe

### Requisitos Funcionais — Equipe

| ID | Requisito | Descrição Detalhada | Prioridade |
|----|-----------|---------------------|------------|
| RF-E.01 | Cadastro de Membros por Cliente | Página "Minha Equipe" onde o gestor cadastra membros por cliente. Campos: nome, e-mail, papel (Admin / Colaborador / Visualizador) | Alta |
| RF-E.02 | Convite por E-mail | Ao adicionar um membro, o sistema envia notificação com link de acesso | Alta |
| RF-E.03 | Papéis e Permissões | Admin: acesso total; Colaborador: pode editar tarefas; Visualizador: somente leitura | Alta |
| RF-E.04 | Listagem de Membros Ativos | Tabela com membros ativos, papel, data de cadastro e opções de editar/remover | Média |

---

## Módulo Transversal — Gerenciamento de Usuários da Plataforma

Este módulo foi introduzido na Sprint V56 e não existia na versão 2.0 do documento.

### Requisitos Funcionais — Usuários

| ID | Requisito | Descrição Detalhada | Prioridade |
|----|-----------|---------------------|------------|
| **RF-U.01** | **Listagem de Usuários da Plataforma** | **Página `/usuarios` acessível apenas para Equipe SOLARIS e Advogados Seniores. Exibe todos os usuários cadastrados com: avatar (iniciais), nome, e-mail, empresa, papel (badge colorido) e data do último login** *(novo — Sprint V56)* | Alta |
| **RF-U.02** | **Filtro e Busca de Usuários** | **Filtro por papel (todos, cliente, equipe_solaris, advogado_senior, advogado_junior) e campo de busca em tempo real por nome, e-mail ou empresa (case-insensitive)** *(novo — Sprint V56)* | Alta |
| **RF-U.03** | **Promoção de Papel via Modal** | **Apenas a Equipe SOLARIS pode alterar o papel de um usuário. A alteração é confirmada via modal de diálogo com seleção do novo papel e botão "Confirmar Alteração". O usuário não pode alterar o próprio papel** *(novo — Sprint V56)* | Alta |
| **RF-U.04** | **Estatísticas de Usuários** | **Cards no topo da página exibem: total de usuários, usuários ativos nos últimos 7 dias e distribuição por papel** *(novo — Sprint V56)* | Média |

---

## Resumo Quantitativo

| Etapa | RFs v2.0 | RFs Novos (v3.0) | Total v3.0 | Alta Prioridade | Gate de Avanço |
|-------|----------|------------------|------------|-----------------|----------------|
| Etapa 1 — Criação do Projeto | 8 | 0 | 8 | 6 | CNAEs confirmados |
| Etapa 2 — Questionário Adaptativo | 11 | 1 | 12 | 10 | Todos os CNAEs com Nível 1 concluído |
| Etapa 3 — Briefing de Compliance | 8 | 2 | 10 | 8 | Briefing aprovado |
| Etapa 4 — Matrizes de Riscos | 11 | 2 | 13 | 12 | 4 matrizes aprovadas |
| Etapa 5 — Plano de Ação | 19 | 2 | 21 | 19 | Plano aprovado e publicado |
| Painel de Controle | 4 | 1 | 5 | 3 | — |
| Situação do Projeto | 0 | 3 | 3 | 3 | — |
| Gerenciamento de Equipe | 4 | 0 | 4 | 3 | — |
| Gerenciamento de Usuários | 0 | 4 | 4 | 3 | — |
| **Total** | **65** | **15** | **80** | **67** | — |

> **Nota:** A contagem final de 80 RFs inclui a premissa global PG-10 e os 3 RFs do novo módulo de Situação do Projeto, que não existiam na v2.0.

---

## Novos Requisitos vs. Versão 2.0

Os seguintes requisitos foram adicionados nesta versão 3.0 em relação ao documento v2.0:

| ID | Requisito | Sprint | Origem |
|----|-----------|--------|--------|
| PG-10 | Controle de situação do projeto por papel | V55 | Implementado durante desenvolvimento |
| RF-2.12 | Restauração de Progresso ao Reabrir | V56 | Correção de bug BUG-07 |
| RF-3.09 | Aviso de Re-geração de Conteúdo Aprovado (Briefing) | V56 | Solicitado durante sessão de desenvolvimento |
| RF-3.10 | Comentários e Anotações Colaborativas no Briefing | V57 | Solicitado pelo usuário |
| RF-4.12 | Aviso de Re-geração de Matrizes Aprovadas | V56 | Solicitado durante sessão de desenvolvimento |
| RF-4.13 | Comentários e Anotações Colaborativas nas Matrizes | V57 | Solicitado pelo usuário |
| RF-5.20 | Tela de Conclusão Persistente | V56 | Correção de bug BUG-05/BUG-06 |
| RF-5.21 | Comentários e Anotações Colaborativas no Plano de Ação | V57 | Solicitado pelo usuário |
| RF-P.05 | Filtro por Situação na Lista de Projetos | V55 | Implementado durante desenvolvimento |
| RF-S.01 | Dropdown de Situação do Projeto | V55 | Solicitado pelo usuário |
| RF-S.02 | Controle de Permissões por Papel | V55 | Implementado durante desenvolvimento |
| RF-S.03 | Transições de Status com Auditoria | V55 | Implementado durante desenvolvimento |
| RF-U.01 | Listagem de Usuários da Plataforma | V56 | Correção de bug BUG-04 |
| RF-U.02 | Filtro e Busca de Usuários | V56 | Implementado durante desenvolvimento |
| RF-U.03 | Promoção de Papel via Modal | V56 | Solicitado durante sessão de desenvolvimento |
| RF-U.04 | Estatísticas de Usuários | V56 | Implementado durante desenvolvimento |

---

## Correções Técnicas Incorporadas

As seguintes correções técnicas foram identificadas e implementadas durante o desenvolvimento e devem ser mantidas em qualquer refatoração futura:

| Componente | Problema | Solução |
|------------|----------|---------|
| `PlanoAcaoV3.tsx` | `useEffect([project])` causava loop infinito — re-disparava `handleGenerate` após cada mutação | Substituído por `generationTriggeredRef` (useRef) — garante execução única |
| `QuestionarioV3.tsx` | `useEffect([startedCnaes.size])` re-disparava `loadQuestions` em loop | Substituído por `loadedQuestionsRef` — carregamento direto em `handleStartCnae` |
| `MatrizesV3.tsx` | Threshold de severidade: Média×Médio (score 4) classificado incorretamente | Score ≥ 4 = "Alta" conforme tabela 3×3 padrão |
| `drizzle/schema.ts` | Campos `briefingContent`, `riskMatricesData` e `actionPlansData` ausentes na tabela `projects` | Adicionados como `text` nullable; migração executada via `pnpm db:push` |
| `QuestionarioV3.tsx` | `cnaeProgress` não restaurava estado de CNAEs já respondidos ao reabrir | Inicialização do `cnaeProgress` agora lê `savedProgress.answers` do banco |

---

*Documento gerado em 17/03/2026 — Plataforma de Compliance Tributário v3.0*
