# Requisitos Funcionais — Plataforma IA SOLARIS
## Compliance Tributário — Reforma Tributária Brasileira 2026–2033

> **Rastreabilidade RF × PR × Sprint:** Para localizar onde cada requisito foi implementado (PR, Sprint, arquivos), consulte [RASTREABILIDADE-RF-PR-SPRINT.md](./RASTREABILIDADE-RF-PR-SPRINT.md).

| Campo | Valor |
|---|---|
| **Versão** | 6.1 |
| **Data** | 31 de Março de 2026 |
| **Sprint de Referência** | Sprint M (UAT E2E + BUG-UAT-02/03/05, 31/03/2026) |
| **Versão anterior** | v6.0 (Sprint v5.3.0, 23/03/2026) |
| **Classificação** | Documento Técnico Interno |
| **Responsável** | Equipe SOLARIS |

> **Histórico de versões:**
> v4.0 (Sprint V69) → v5.0 (Sprint V74) → v6.0 (Sprint v5.3.0, 23/03/2026) → **v6.1 (Sprint M, 31/03/2026)**
>
> **Mudanças da v6.1 (Sprint M):** RF-019 (auth.testLogin com guard E2E_TEST_MODE) e RF-020 (E2E Playwright CT-01/04/06/07/37) adicionados · BUG-UAT-03 corrigido (RF-015 — `completeOnda2` status destino) · BUG-UAT-05 corrigido (RF-014 — DiagnosticoStepper hardcode removido) · SOL-013/014 removidos do corpus. Total: **147 RFs** (2 novos em relação à v6.0).
>
> **Mudanças da v6.0:** Incorporação das Fases F-01 a F-04 (ADR-005 a ADR-008), Shadow Mode com adaptador `getDiagnosticSource()`, gate de limpeza de dados no retrocesso (F-03), estratégia de migração de schema (F-04/ADR-008), suite de validação automatizada Onda 1 (75 testes) + Onda 2 (32 testes = 107/107 ✅), protocolo UAT com advogados, monitoramento Shadow Monitor 48–72h. Total: **145 RFs** (15 novos em relação à v5.0).

---

## Sumário

1. Premissas Globais do Sistema
2. Modelo de Papéis e Permissões
3. Etapa 1 — Criação do Projeto (Fluxo V3)
4. Etapa 2 — Questionário Adaptativo
5. Etapa 3 — Briefing de Compliance
6. Etapa 4 — Matrizes de Riscos
7. Etapa 5 — Plano de Ação
8. Painel de Controle e Projetos
9. Gerenciamento de Situação do Projeto
10. Gerenciamento de Equipe e Clientes
11. Gerenciamento de Usuários da Plataforma
12. Módulo de IA, RAG e Embeddings Semânticos
13. Administração de Embeddings CNAE
14. Resiliência e UX de Carregamento
15. Navegação e FlowStepper
16. Onboarding Guiado (Tour Interativo)
17. **Arquitetura de Diagnóstico Dual (V1/V3) — ADR-005** *(novo v6.0)*
18. **Gate de Limpeza de Dados no Retrocesso — ADR-007** *(novo v6.0)*
19. **Shadow Mode e Monitoramento de Divergências** *(novo v6.0)*
20. **Protocolo de Validação Automatizada (Onda 1 + Onda 2)** *(novo v6.0)*
21. Banco de Dados e Schema
22. Resumo Quantitativo
23. Novos Requisitos vs. Versão 5.0
24. Correções Técnicas Incorporadas

---

## 1. Premissas Globais do Sistema

| ID | Premissa |
|---|---|
| PG-01 | A plataforma atende exclusivamente ao contexto da Reforma Tributária Brasileira (EC 132/2023, LC 214/2025, LC 227/2024 e legislação complementar) |
| PG-02 | O fluxo principal é sequencial e guiado por gates: Etapa 1 → 2 → 3 → 4 → 5 |
| PG-03 | A IA (GPT-4.1 via OpenAI API) é utilizada em 7 pontos do fluxo; o scoring de risco é determinístico (sem IA) |
| PG-04 | Todos os outputs de IA são validados com schemas Zod antes de serem persistidos no banco |
| PG-05 | O sistema RAG injeta artigos reais da legislação tributária nos prompts para reduzir alucinações |
| PG-06 | O progresso de cada etapa é salvo automaticamente — o usuário pode retomar de onde parou |
| PG-07 | A plataforma suporta múltiplos projetos por cliente, com histórico completo de versões |
| PG-08 | Todas as operações de IA têm timeout de 3 minutos e retry automático de 2 tentativas (exceto `extractCnaes`: 25s, 1 tentativa) |
| PG-09 | O sistema de papéis controla o acesso a funcionalidades: equipe_solaris, advogado_senior, advogado_junior, cliente |
| PG-10 | A situação do projeto é controlada por papel: equipe SOLARIS gerencia todos os 11 status; clientes vêem apenas o status atual + "Em Avaliação" |
| PG-11 | O corpus RAG contém 1.241 documentos de 8 fontes legais e é atualizado via script rag-ingest.mjs |
| PG-12 | A plataforma é acessada via autenticação OAuth Manus — sem cadastro manual de senha |
| PG-13 | A identificação de CNAEs utiliza busca semântica vetorial via embeddings OpenAI (text-embedding-3-small), substituindo o sistema RAG baseado em tokens hard-coded |
| PG-14 | Os embeddings de todos os 1.332 CNAEs são pré-computados e armazenados no banco; a busca usa similaridade de cosseno em memória (cache TTL 1h) |
| PG-15 | O rebuild dos embeddings é executado automaticamente toda segunda-feira às 03:00 (America/Sao_Paulo) via cron job, com registro de histórico no banco |
| **PG-16** | **O sistema suporta dois motores de diagnóstico coexistentes: V1 (fluxo legado) e V3 (fluxo novo). O adaptador `getDiagnosticSource()` seleciona automaticamente a fonte correta com base no campo `flowVersion` do projeto** *(novo v6.0 — ADR-005)* |
| **PG-17** | **O retrocesso de etapa aciona um gate de limpeza de dados: ao retroceder da Etapa N para N-1, os dados gerados pela IA na Etapa N são limpos do banco, garantindo consistência e evitando dados órfãos** *(novo v6.0 — ADR-007)* |
| **PG-18** | **O Shadow Mode executa ambos os motores (V1 e V3) em paralelo e registra divergências na tabela `diagnostic_shadow_divergences`, permitindo comparação antes de ativar o modo `new`** *(novo v6.0)* |
| **PG-19** | **A plataforma possui uma suite de validação automatizada com 107 testes (Onda 1: 75 + Onda 2: 32) que cobrem carga, concorrência, retrocesso e integridade de dados** *(novo v6.0)* |

---

## 2. Modelo de Papéis e Permissões

### Papéis Disponíveis

| Papel | Descrição | Acesso |
|---|---|---|
| `equipe_solaris` | Equipe interna da SOLARIS | Acesso total: gerencia projetos, clientes, usuários, status, configurações e painel de administração de embeddings |
| `advogado_senior` | Advogado sênior parceiro | Acesso a projetos dos clientes sob sua responsabilidade; pode alterar status e promover papéis |
| `advogado_junior` | Advogado júnior | Acesso de leitura e edição de projetos; não pode alterar papéis ou status finais |
| `cliente` | Usuário final (empresa) | Acesso apenas aos próprios projetos; visualiza status atual e "Em Avaliação" |

### Matriz de Permissões por Funcionalidade

| Funcionalidade | equipe_solaris | advogado_senior | advogado_junior | cliente |
|---|---|---|---|---|
| Criar projeto | ✓ | ✓ | ✓ | ✓ |
| Ver todos os projetos | ✓ | ✓ | — | — |
| Alterar situação do projeto | ✓ (todos 11) | ✓ (todos 11) | — | ✓ (apenas "Em Avaliação") |
| Gerenciar clientes | ✓ | ✓ | — | — |
| Gerenciar usuários | ✓ | — | — | — |
| Promover papel de usuário | ✓ | — | — | — |
| Comentários colaborativos | ✓ | ✓ | ✓ | ✓ |
| Exportar PDF/CSV | ✓ | ✓ | ✓ | ✓ |
| Painel Admin Embeddings | ✓ | — | — | — |
| Disparar Rebuild Manual | ✓ | — | — | — |
| **Shadow Monitor** | **✓** | **—** | **—** | **—** |
| **Ativar modo `new`** | **✓** | **—** | **—** | **—** |

---

## 3. Etapa 1 — Criação do Projeto (Fluxo V3)

### Premissas da Etapa 1

| ID | Premissa |
|---|---|
| PE1-01 | O projeto é criado por qualquer papel autenticado, vinculado a um cliente existente ou novo |
| PE1-02 | A descrição do negócio é o ponto de entrada — o usuário descreve a atividade em linguagem natural |
| PE1-03 | A IA extrai automaticamente entre 2 e 6 CNAEs relevantes a partir da descrição |
| PE1-04 | O usuário pode refinar os CNAEs em ciclos ilimitados de feedback |
| PE1-05 | Os CNAEs confirmados são o gate de avanço para a Etapa 2 |
| PE1-06 | O faturamento anual estimado é coletado nesta etapa para alimentar o scoring financeiro |
| PE1-07 | A extração de CNAEs utiliza busca semântica vetorial (embeddings OpenAI) com estratégia multi-query e merge em 2 camadas, garantindo cobertura de atividades complexas com múltiplos CNAEs |

### Requisitos Funcionais — Etapa 1

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-1.01 | Formulário de Criação de Projeto | Campos obrigatórios: nome do projeto, cliente (seleção ou criação inline), descrição longa do negócio (mínimo 50 caracteres). Campo opcional: faturamento anual estimado (para scoring financeiro) | Alta |
| RF-1.02 | Criação de Cliente Inline | Modal "Novo Cliente" com campos: nome da empresa, CNPJ (máscara XX.XXX.XXX/XXXX-XX em tempo real, validação de 14 dígitos), segmento e telefone. Botão "Criar Cliente" desabilitado enquanto CNPJ está incompleto | Alta |
| RF-1.03 | Extração de CNAEs via IA com Embeddings Semânticos | Após submeter a descrição, o sistema: (1) divide a descrição em cláusulas semânticas independentes; (2) gera um embedding OpenAI para cada cláusula em paralelo; (3) busca os top-20 CNAEs mais similares por cláusula via similaridade de cosseno; (4) aplica merge em 2 camadas (garantidos + globais); (5) envia o contexto enriquecido para a IA (GPT-4.1) que extrai 2–6 CNAEs com código, descrição, confidence (0–100) e justificativa | Alta |
| RF-1.04 | Refinamento de CNAEs | Campo de feedback textual ("O que precisa ser ajustado?") + botão "Refinar CNAEs". A IA regenera a lista considerando o feedback. Ciclos ilimitados de refinamento | Alta |
| RF-1.05 | Confirmação de CNAEs | O usuário confirma a lista final de CNAEs via botão "Confirmar e Avançar". Os CNAEs confirmados são persistidos em `confirmedCnaes` (JSON) no banco | Alta |
| RF-1.06 | Indicador de Confiança por CNAE | Badge colorido em cada card de CNAE: Verde (≥80%), Amarelo (60–79%), Vermelho (<60%). Tooltip com justificativa da IA | Média |
| RF-1.07 | Persistência de Rascunho | O projeto é criado com status `rascunho` ao submeter o formulário. A descrição e os CNAEs extraídos são salvos automaticamente | Alta |
| RF-1.08 | Edição de Projeto Existente | Projetos em status `rascunho` ou `assessment_fase1` podem ser editados via parâmetro `?edit=ID` na URL | Alta |

**Gate 1:** CNAEs confirmados pelo usuário.

---

## 4. Etapa 2 — Questionário Adaptativo

### Premissas da Etapa 2

| ID | Premissa |
|---|---|
| PE2-01 | O questionário é sequencial por CNAE — o usuário conclui um CNAE antes de passar para o próximo |
| PE2-02 | Cada CNAE possui 2 níveis de perguntas: Nível 1 (obrigatório, até 10 perguntas) e Nível 2 (opcional, aprofundamento) |
| PE2-03 | As perguntas são geradas pela IA com base no CNAE, na descrição da empresa e em artigos legais reais (RAG) |
| PE2-04 | A IA escolhe o tipo de campo mais adequado para cada pergunta (sim/não, múltipla escolha, escala Likert, texto livre) |
| PE2-05 | O usuário pode pular o Nível 2 e avançar para o próximo CNAE sem penalização |
| PE2-06 | O progresso é salvo automaticamente a cada resposta — o usuário pode retomar de onde parou |
| PE2-07 | A UX deve ser fluida e de baixo esforço — inspirada em Typeform/SurveyMonkey |
| PE2-08 | Cada CNAE tem uma tela de entrada isolada antes de a IA gerar as perguntas — a IA só é chamada após o clique do usuário |
| PE2-09 | O estado "iniciado" por CNAE é persistido no banco para que ao retomar o rascunho o usuário não precise clicar "Iniciar" novamente |

### Requisitos Funcionais — Etapa 2

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-2.01 | Geração de Perguntas Nível 1 via IA | A IA gera até 10 perguntas com: texto, `objetivo_diagnostico`, `impacto_reforma`, `peso_risco` (baixo/medio/alto/critico) e `type`. O RAG injeta 5 artigos legais relevantes no prompt | Alta |
| RF-2.02 | Tipos de Campo Ricos | A IA define o tipo de campo: (a) Sim/Não — botões grandes; (b) Múltipla Escolha — chips selecionáveis; (c) Escala Likert 1-5 — slider visual com labels min/max; (d) Seleção única — radio buttons; (e) Texto livre curto — campo de uma linha; (f) Texto livre longo — textarea expansível | Alta |
| RF-2.03 | Stepper Visual de Progresso | Barra de progresso mostrando: CNAE atual / total de CNAEs (ex: "CNAE 2 de 4") e percentual de perguntas respondidas no CNAE atual | Alta |
| RF-2.04 | Transição para Nível 2 | Após a última pergunta do Nível 1, exibir tela de decisão com botões: "Sim, vamos aprofundar" e "Não, próximo CNAE" | Alta |
| RF-2.05 | Geração de Perguntas Nível 2 via IA | Quando o usuário aceita o aprofundamento, a IA gera perguntas adicionais baseadas nas respostas do Nível 1. Limite: até 10 perguntas adicionais | Alta |
| RF-2.06 | Salvamento Automático de Respostas | Cada resposta é salva imediatamente no banco via tRPC. Ao retornar após fechar o navegador, o usuário retoma exatamente do ponto onde parou | Alta |
| RF-2.07 | Navegação entre Perguntas | O usuário pode navegar para a pergunta anterior dentro do mesmo CNAE. Badge âmbar "Revisado" exibido ao lado do código CNAE quando o usuário retorna a um CNAE concluído | Média |
| RF-2.08 | Indicador de CNAE Concluído | Ao finalizar as perguntas de um CNAE, o CNAE é marcado como "Concluído" (✓) no stepper visual | Alta |
| RF-2.09 | Validação do Gate 2 | O avanço para a Etapa 3 só é liberado quando todos os CNAEs tiverem o Nível 1 concluído | Alta |
| RF-2.10 | Feedback Visual durante Geração IA | Indicador de carregamento com: (a) contador de tempo em segundos ("Gerando perguntas... 12s"); (b) barra de progresso estimada (45s para nível 1, 60s para nível 2, cap em 95%); (c) mensagem contextual por faixa de tempo | Média |
| RF-2.11 | Tela de Entrada Isolada por CNAE | Card isolado com: código CNAE, descrição completa, número na sequência e botão "Iniciar diagnóstico deste CNAE". A IA só é chamada após o clique | Alta |
| RF-2.12 | Restauração de Progresso ao Reabrir | Ao reabrir o questionário de um projeto já iniciado, o sistema restaura automaticamente o estado de cada CNAE (iniciado, em progresso, concluído) | Alta |

**Gate 2:** Todos os CNAEs com Nível 1 concluído.

---

## 5. Etapa 3 — Briefing de Compliance

### Premissas da Etapa 3

| ID | Premissa |
|---|---|
| PE3-01 | O Briefing é gerado automaticamente pela IA a partir de todas as respostas da Etapa 2 |
| PE3-02 | O Briefing é um documento único consolidado cobrindo todos os CNAEs |
| PE3-03 | O ciclo de revisão é ilimitado — a IA regenera quantas vezes forem necessárias |
| PE3-04 | O usuário pode corrigir (apontar erros) ou complementar (fornecer mais informações) antes de regenerar |
| PE3-05 | A aprovação do Briefing é o Gate 3 — sem aprovação, as Etapas 4 e 5 não são acessíveis |
| PE3-06 | O RAG injeta 7 artigos legais com re-ranking LLM (temperatura 0.0) para máxima precisão |

### Requisitos Funcionais — Etapa 3

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-3.01 | Geração Automática do Briefing | A IA gera o Briefing estruturado com: `nivel_risco_geral`, `resumo_executivo`, `principais_gaps` (com `causa_raiz` e `evidencia_regulatoria`), `oportunidades`, `recomendacoes_prioritarias` e `confidence_score` | Alta |
| RF-3.02 | Exibição do Resumo Executivo | Painel principal com o resumo executivo em markdown, nível de risco geral (badge colorido) e confidence score | Alta |
| RF-3.03 | Seção de Gaps Identificados | Lista de gaps com: descrição, causa raiz, evidência regulatória (artigo legal citado) e urgência (imediata/curto_prazo/médio_prazo) | Alta |
| RF-3.04 | Seção de Oportunidades | Lista de oportunidades de otimização tributária identificadas pela IA | Alta |
| RF-3.05 | Seção de Recomendações Priorizadas | Lista de recomendações ordenadas por urgência | Alta |
| RF-3.06 | Confidence Score | Card com: `nivel_confianca` (0–100), `limitacoes` (lista de limitações identificadas) e `recomendacao` (enum: "Aprovado para uso", "Revisão recomendada", "Revisão por advogado obrigatória") | Alta |
| RF-3.07 | Ciclo de Revisão com Campo de Ajuste | Campo de texto "O que precisa ser corrigido?" + campo "Informações adicionais" + botão "Regenerar Briefing". A IA regenera considerando o feedback | Alta |
| RF-3.08 | Aprovação do Briefing | Botão "Aprovar Briefing" que avança o projeto para status `briefing_aprovado`. Botão "Reabrir para edição" permite desfazer a aprovação | Alta |
| RF-3.09 | Aviso de Re-geração de Conteúdo Aprovado | Ao reabrir a página de um projeto com briefing já aprovado, exibir banner azul informativo. O conteúdo aprovado é carregado automaticamente do banco | Alta |
| RF-3.10 | Comentários Colaborativos no Briefing | Seção de comentários com: autor, papel (badge), timestamp relativo, edição (apenas pelo autor), exclusão (autor ou equipe_solaris), seção colapsável. Suporte a texto formatado | Alta |

**Gate 3:** Briefing aprovado.

---

## 6. Etapa 4 — Matrizes de Riscos

### Premissas da Etapa 4

| ID | Premissa |
|---|---|
| PE4-01 | São geradas 4 Matrizes de Riscos independentes, uma por área: Contabilidade, Negócio, T.I. e Jurídico |
| PE4-02 | Cada matriz é gerada pela IA a partir do briefing aprovado, com RAG de 7 artigos |
| PE4-03 | As 4 matrizes são geradas em chamadas paralelas ao LLM para reduzir latência total |
| PE4-04 | Cada risco possui: evento, causa raiz, evidência regulatória, probabilidade, impacto, severidade calculada e plano de ação |
| PE4-05 | A severidade é calculada automaticamente: Probabilidade × Impacto (escala 1–9) |
| PE4-06 | O usuário pode aprovar ou solicitar ajustes em cada matriz individualmente |

### Requisitos Funcionais — Etapa 4

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-4.01 | Geração das 4 Matrizes via IA | A IA gera riscos por área com: `evento`, `causa_raiz`, `evidencia_regulatoria`, `probabilidade` (Baixa/Média/Alta), `impacto` (Baixo/Médio/Alto), `severidade` (Baixa/Média/Alta/Crítica), `severidade_score` (1–9) e `plano_acao` | Alta |
| RF-4.02 | Visualização em Abas por Área | 4 abas: "Contabilidade", "Negócio", "T.I.", "Jurídico". Cada aba exibe a lista de riscos daquela área em tabela | Alta |
| RF-4.03 | Tabela de Riscos com Código de Cor | Linha colorida por severidade: Verde (Baixa), Amarelo (Média), Laranja (Alta), Vermelho (Crítica) | Alta |
| RF-4.04 | Score Global de Risco | Card com score global (0–100), nível (baixo/médio/alto/crítico), impacto estimado em R$ e custo de inação. Calculado deterministicamente sem IA | Alta |
| RF-4.05 | Alertas Visuais de Inconsistência | Badge com contagem de inconsistências detectadas no briefing. Painel expansível com: `pergunta_origem`, `resposta_declarada`, `contradicao_detectada`, `impacto`. Codificação por cor: alto=vermelho, medio=laranja, baixo=amarelo | Alta |
| RF-4.06 | Ciclo de Revisão por Área | Campo de texto "O que precisa ser ajustado?" + botão "Regenerar esta Matriz". A IA regenera apenas a matriz da aba ativa | Alta |
| RF-4.07 | Regeneração Individual por Área | A regeneração é por aba — não afeta outras áreas já aprovadas | Alta |
| RF-4.08 | Aprovação por Área com Reabrir | Botão "Aprovar Matriz" por aba. Ao aprovar, exibe indicador "Aprovada ✓". Botão "Reabrir para edição" permite desfazer a aprovação | Alta |
| RF-4.09 | Cálculo Automático de Severidade | Severidade = Probabilidade × Impacto. Threshold: score ≥ 4 = "Alta" conforme tabela 3×3 padrão | Alta |
| RF-4.10 | Validação do Gate 4 | O botão "Avançar para Plano de Ação" só é habilitado quando as 4 matrizes estiverem com status "Aprovada" | Alta |
| RF-4.11 | Exportação das Matrizes | Após aprovação, as 4 matrizes podem ser exportadas em PDF (paisagem) e CSV | Média |
| RF-4.12 | Aviso de Re-geração de Matrizes Aprovadas | Ao reabrir a página de um projeto com matrizes já aprovadas, exibir banner azul informativo. O conteúdo aprovado é carregado automaticamente do banco | Alta |
| RF-4.13 | Comentários Colaborativos nas Matrizes | Seção de comentários com as mesmas funcionalidades do RF-3.10 | Alta |

**Gate 4:** 4 matrizes aprovadas.

---

## 7. Etapa 5 — Plano de Ação

### Premissas da Etapa 5

| ID | Premissa |
|---|---|
| PE5-01 | São gerados 4 Planos de Ação independentes, um por área: Contabilidade, Negócio, T.I. e Jurídico |
| PE5-02 | Cada Plano é gerado pela IA a partir da respectiva Matriz de Riscos aprovada |
| PE5-03 | O Plano de Ação tem funcionalidades de gestão de tarefas (inspirado no Trello) |
| PE5-04 | Cada tarefa possui: título, descrição, responsável, data de início, data de fim, status, percentual de andamento e notificações configuráveis |
| PE5-05 | O responsável é um usuário cadastrado no cliente vinculado ao projeto |
| PE5-06 | As notificações por e-mail são configuráveis por tarefa |
| PE5-07 | Após aprovação do plano, a IA gera automaticamente a Decisão Recomendada (veredito executivo) |
| PE5-08 | O loop de geração usa `useRef` para garantir que a IA seja chamada apenas uma vez por área |
| PE5-09 | A navegação automática da Etapa 4 para a Etapa 5 invalida o cache tRPC do projeto antes de navegar, garantindo que o `PlanoAcaoV3` receba o status `"plano_acao"` atualizado e dispare a geração automaticamente |

### Requisitos Funcionais — Etapa 5

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-5.01 | Geração dos 4 Planos via IA | A IA gera tarefas por área com: `titulo`, `descricao`, `area`, `prazo_sugerido`, `prioridade`, `responsavel_sugerido`, `objetivo_diagnostico` e `evidencia_regulatoria` | Alta |
| RF-5.02 | Visualização em Abas por Área | 4 abas: "Contabilidade", "Negócio", "T.I.", "Jurídico". Cada aba exibe a lista de tarefas daquela área | Alta |
| RF-5.03 | Aprovação e Ciclo de Regeneração | O usuário revisa, aprova ou solicita ajustes com campo de texto. A IA regenera o plano até aprovação | Alta |
| RF-5.04 | Edição de Tarefas | Cada tarefa pode ser editada: título, descrição, responsável, datas, status e prioridade | Alta |
| RF-5.05 | Status de Tarefas | 5 status: "Não Iniciado", "Em Andamento", "Em Revisão", "Concluído", "Cancelado". Cada status tem cor e ícone distintos | Alta |
| RF-5.06 | Percentual de Andamento | Slider visual de 0% a 100% em incrementos de 5%. Sugestão automática de alterar status para "Concluído" ao atingir 100% | Alta |
| RF-5.07 | Atribuição de Responsável | Seleção de usuários cadastrados no cliente do projeto. Múltiplos responsáveis permitidos. Fallback para campo de texto livre quando não há membros cadastrados | Alta |
| RF-5.08 | Configuração de Notificações por Tarefa | Painel de notificações por tarefa com Switch shadcn/ui. Eventos configuráveis: (a) X dias antes do prazo (1, 3, 7, 15 dias); (b) Mudança de status; (c) Atualização de progresso; (d) Novo comentário. Badge âmbar "Ativas" quando ao menos uma opção está ativa | Alta |
| RF-5.09 | Comentários por Tarefa | Campo de comentários com histórico cronológico, autor e timestamp | Alta |
| RF-5.10 | Exportação do Plano | Exportação em PDF e CSV após aprovação | Média |
| RF-5.11 | Quadro Kanban | Visualização alternativa em quadro Kanban com colunas por status. Drag-and-drop para mover tarefas entre colunas | Alta |
| RF-5.12 | Sistema de Templates | Salvar plano aprovado como template. Biblioteca de templates reutilizáveis. Preview antes de aplicar. Exportação de template em PDF | Média |
| RF-5.13 | Aprovação do Plano de Ação | Botão "Aprovar Plano de Ação" que aciona automaticamente a geração da Decisão Recomendada | Alta |
| RF-5.14 | Decisão Recomendada (Veredito Executivo) | Após aprovação do plano, a IA (temperatura 0.35) gera: `acao_principal`, `prazo_dias`, `risco_se_nao_fazer`, `proximos_passos`, `momento_wow` e `fundamentacao_legal` | Alta |
| RF-5.15 | Tela de Conclusão | Exibição da Decisão Recomendada em card destacado. Score global, impacto estimado e custo de inação. Botão "Exportar Relatório Final" | Alta |
| RF-5.16 | Filtros de Tarefas | Filtros por: área, status, prioridade, responsável e data de vencimento | Média |
| RF-5.17 | Histórico de Versões do Plano | Cada regeneração cria uma nova versão. O usuário pode visualizar versões anteriores | Baixa |
| RF-5.18 | Controle de Período do Plano | Campo "Período do Plano" (12 ou 24 meses) obrigatório antes de gerar o plano. Afeta os prazos sugeridos pela IA | Alta |
| RF-5.19 | Observadores por Tarefa | Usuários podem se inscrever como observadores de uma tarefa para receber notificações | Média |
| RF-5.20 | Tela de Conclusão Persistente | Ao reabrir a página de um projeto com plano aprovado, a tela de conclusão é exibida automaticamente. Botão "Editar Plano de Ação" permite reabrir para edição | Alta |
| RF-5.21 | Comentários Colaborativos no Plano | Seção de comentários com as mesmas funcionalidades do RF-3.10 | Alta |
| RF-5.22 | Geração Automática ao Navegar da Etapa 4 | Ao clicar em "Aprovado e Gerar Plano" na Etapa 4, o sistema: (1) invalida o cache tRPC do projeto via `utils.fluxoV3.getProjectStep1.invalidate()`; (2) navega para `/plano-v3`; (3) o `PlanoAcaoV3` usa `refetchOnMount: "always"` e `staleTime: 0` para garantir que o status `"plano_acao"` seja lido do servidor antes de disparar a geração | Alta |

**Gate 5:** Plano aprovado e publicado.

---

## 8. Painel de Controle e Projetos

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-P.01 | Dashboard Executivo | Cards com KPIs: total de projetos, em andamento, em avaliação, aprovados. Gráficos de distribuição por status e por cliente | Alta |
| RF-P.02 | Lista de Projetos | Cards de projeto com: nome, cliente, status (badge colorido), data de criação, CNAEs confirmados e botão de CTA adaptativo por status | Alta |
| RF-P.03 | CTA Adaptativo por Status | Botão de ação principal do card muda conforme o status: "Iniciar Diagnóstico" (rascunho), "Continuar" (em andamento), "Ver Resultados" (concluído) | Alta |
| RF-P.04 | Busca e Filtros de Projetos | Campo de busca por nome de projeto ou cliente. Filtros por: status, cliente, data de criação | Média |
| RF-P.05 | Filtro por Situação na Lista de Projetos | Dropdown de filtro por status com todas as 11 opções + "Todos os status". Indicador colorido por status | Alta |
| RF-P.06 | Badge Contador de Projetos Ativos | Badge com contagem de projetos ativos exibido ao lado de "Projetos" na sidebar | Média |

---

## 9. Gerenciamento de Situação do Projeto

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-S.01 | Dropdown de Situação do Projeto | Select interativo no header da página de detalhes. Indicador circular colorido por status. Spinner durante a mutação | Alta |
| RF-S.02 | Controle de Permissões por Papel | Equipe SOLARIS e advogados seniores vêem todos os 11 status. Clientes vêem apenas o status atual + "Em Avaliação" | Alta |
| RF-S.03 | Transições de Status com Auditoria | Cada mudança de status registra: papel do usuário, timestamp e IDs. Log de auditoria no console do servidor | Alta |

### 11 Status do Projeto

| Status | Descrição | Quem pode definir |
|---|---|---|
| `rascunho` | Projeto criado, sem CNAEs confirmados | Auto (sistema) |
| `assessment_fase1` | CNAEs confirmados, questionário não iniciado | Auto (sistema) |
| `assessment_fase2` | Questionário em andamento | Auto (sistema) |
| `matriz_riscos` | Questionário concluído, matrizes não geradas | Auto (sistema) |
| `plano_acao` | Matrizes aprovadas, plano não gerado | Auto (sistema) |
| `em_avaliacao` | Plano gerado, aguardando aprovação do cliente | Equipe SOLARIS, cliente |
| `aprovado` | Plano aprovado pelo cliente | Equipe SOLARIS |
| `em_andamento` | Execução do plano em andamento | Equipe SOLARIS |
| `parado` | Execução pausada | Equipe SOLARIS |
| `concluido` | Projeto finalizado | Equipe SOLARIS |
| `arquivado` | Projeto arquivado | Equipe SOLARIS |

---

## 10. Gerenciamento de Equipe e Clientes

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-E.01 | Cadastro de Clientes | Formulário com: nome da empresa, CNPJ (validado), segmento, telefone e e-mail. Listagem com busca e filtros | Alta |
| RF-E.02 | Membros do Cliente | Cada cliente pode ter múltiplos membros cadastrados. Os membros são selecionáveis como responsáveis nas tarefas do plano de ação | Alta |
| RF-E.03 | Participantes do Projeto | Cada projeto pode ter múltiplos participantes da equipe SOLARIS e advogados. Controle de acesso por projeto | Alta |
| RF-E.04 | Permissões por Projeto | Procedure `projectPermissions` controla quem pode ver/editar cada projeto | Alta |

---

## 11. Gerenciamento de Usuários da Plataforma

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-U.01 | Listagem de Usuários | Página `/usuarios` acessível apenas para Equipe SOLARIS e Advogados Seniores. Exibe: avatar (iniciais), nome, e-mail, empresa, papel (badge colorido) e data do último login | Alta |
| RF-U.02 | Filtro e Busca de Usuários | Filtro por papel e campo de busca em tempo real por nome, e-mail ou empresa (case-insensitive) | Alta |
| RF-U.03 | Promoção de Papel via Modal | Apenas a Equipe SOLARIS pode alterar o papel de um usuário. Confirmação via modal de diálogo. O usuário não pode alterar o próprio papel | Alta |
| RF-U.04 | Estatísticas de Usuários | Cards no topo: total de usuários, usuários ativos nos últimos 7 dias e distribuição por papel | Média |

---

## 12. Módulo de IA, RAG e Embeddings Semânticos

Esta seção documenta todos os requisitos do motor de inteligência artificial da plataforma, incluindo as evoluções implementadas nas Sprints V70–v5.3.0.

### Requisitos Funcionais — IA e RAG

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-IA.01 | Extração de CNAEs com Embeddings Semânticos (Etapa 1) | A IA extrai 2–6 CNAEs usando a pipeline: (1) divisão da descrição em cláusulas via `splitIntoClauses()`; (2) embedding OpenAI por cláusula; (3) busca por similaridade de cosseno no cache de 1.332 CNAEs; (4) merge em 2 camadas (garantidos + globais); (5) formatação do contexto para o LLM. Temperatura 0.1 | Alta |
| RF-IA.02 | Geração de Perguntas (Etapa 2) | IA gera perguntas com metadata diagnóstica completa. RAG injeta 5 artigos. Temperatura 0.3 | Alta |
| RF-IA.03 | Geração de Briefing (Etapa 3) | IA gera briefing estruturado com gaps, oportunidades e confidence score. RAG injeta 7 artigos com re-ranking LLM. Temperatura 0.2 | Alta |
| RF-IA.04 | Geração de Matrizes (Etapa 4) | IA gera riscos por área (4 chamadas paralelas). RAG injeta 7 artigos. Temperatura 0.1 | Alta |
| RF-IA.05 | Geração de Plano de Ação (Etapa 5) | IA gera tarefas por área (4 chamadas paralelas). RAG injeta 7 artigos. Temperatura 0.2 | Alta |
| RF-IA.06 | Motor de Decisão Executiva | IA gera veredito final com ação principal, prazo, risco de inação e "momento wow". RAG com re-ranking. Temperatura 0.35 | Alta |
| RF-IA.07 | RAG Híbrido (LIKE + Re-ranking) | `retrieveArticlesFast` (LIKE, sem re-ranking) para latência. `retrieveArticles` (LIKE + re-ranking LLM temperatura 0.0) para precisão | Alta |
| RF-IA.08 | Corpus RAG | 1.241 documentos de 8 fontes: EC 132/2023, LC 214/2025, LC 227/2024, LC 116/2003, LC 87/1996, Resoluções CG-IBS, INs RFB/CBS, Convênios CONFAZ | Alta |
| RF-IA.09 | Scoring Determinístico | `calculateGlobalScore` calcula score global (0–100), nível, impacto estimado e custo de inação sem envolver o LLM | Alta |
| RF-IA.10 | Instrução Anti-Alucinação | Todos os prompts incluem: "cite apenas artigos fornecidos no contexto" e Contrato de Saída (auto-verificação) | Alta |
| RF-IA.11 | Alertas de Inconsistência | IA detecta contradições entre respostas do questionário. Exibição visual com badge e modal de detalhes | Alta |
| RF-IA.12 | Modelo de Embedding | Uso do modelo `text-embedding-3-small` da OpenAI (1.536 dimensões, custo ~$0.02/1M tokens). Vetores armazenados como JSON no banco TiDB | Alta |
| RF-IA.13 | Cache em Memória com TTL | Os 1.332 vetores CNAE são carregados do banco na primeira requisição e mantidos em memória por 1 hora. O cache é invalidado automaticamente após cada rebuild | Alta |
| RF-IA.14 | Divisão em Cláusulas Semânticas | A função `splitIntoClauses()` divide a descrição do negócio em cláusulas independentes usando delimitadores (`;`, `e`, `além de`, `também`, `,`). Cada cláusula representa uma atividade distinta | Alta |
| RF-IA.15 | Busca Multi-Query Paralela | Para cada cláusula, é gerado um embedding e realizada uma busca independente. As buscas são executadas em paralelo via `Promise.all()` para minimizar latência | Alta |
| RF-IA.16 | Merge em 2 Camadas | **Camada 1 (Garantidos):** os top-5 CNAEs de cada cláusula são sempre incluídos no contexto, independente do score global. **Camada 2 (Globais):** os demais CNAEs são ordenados por score e preenchem o contexto até o limite de 40 candidatos | Alta |
| RF-IA.17 | Similaridade de Cosseno | A função `cosineSimilarity(a, b)` calcula o produto escalar normalizado entre dois vetores. Scores variam de 0 (sem similaridade) a 1 (idênticos). Threshold mínimo: 0.0 (sem filtro) | Alta |
| RF-IA.18 | Fallback Síncrono | Se a API OpenAI estiver indisponível, `getFallbackCandidates()` retorna os primeiros CNAEs do cache sem chamar a API, garantindo continuidade do serviço | Alta |
| RF-IA.19 | Formatação do Contexto para o LLM | `formatCandidatesForPrompt()` formata os candidatos como lista numerada com código, descrição e score de similaridade (%), tornando o contexto legível para o LLM | Alta |

---

## 13. Administração de Embeddings CNAE

Esta seção documenta os requisitos do painel de administração de embeddings, acessível exclusivamente pela `equipe_solaris` via `/admin/embeddings`.

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-AE.01 | Status do Banco de Embeddings | Procedure `admin.embeddings.getStatus` retorna: total de CNAEs com embedding, cobertura (%), data do último rebuild, status do processo atual (running/idle) e progresso (processed/total/percent) | Alta |
| RF-AE.02 | Rebuild Manual | Procedure `admin.embeddings.rebuild` dispara o rebuild completo em background. Parâmetros: batches de 95 CNAEs, 200ms de pausa entre batches. Retorna imediatamente com `{ started: true }` | Alta |
| RF-AE.03 | Invalidação de Cache | Procedure `admin.embeddings.invalidateCache` invalida o cache em memória, forçando o próximo carregamento a buscar os embeddings atualizados do banco | Alta |
| RF-AE.04 | Histórico de Rebuilds | Procedure `admin.embeddings.getHistory` retorna as últimas 20 execuções com: `triggeredBy` (manual/cron), `status` (success/partial/error), `processedCount`, `errorCount`, `durationSeconds`, `startedAt` e `completedAt` | Alta |
| RF-AE.05 | Progresso em Tempo Real via WebSocket | Durante o rebuild, eventos WebSocket são emitidos para o usuário que disparou: `embeddings:rebuild:started`, `embeddings:rebuild:progress` (a cada batch), `embeddings:rebuild:batchError` e `embeddings:rebuild:completed` | Alta |
| RF-AE.06 | Cards de Cobertura | A página exibe cards com: total de CNAEs (1.332), CNAEs com embedding, cobertura (%), data do último rebuild e status atual | Alta |
| RF-AE.07 | Log de Eventos Colorido | A página exibe um log em tempo real dos eventos do rebuild com timestamps e codificação por cor: azul (progresso), verde (sucesso), vermelho (erro) | Alta |
| RF-AE.08 | Painel de Cron Agendado | A página exibe um card "Rebuild Automático Agendado" com: expressão cron (`0 3 * * 1`), próxima execução calculada, fuso horário (America/Sao_Paulo) e status do agendamento | Alta |
| RF-AE.09 | Notificação ao Owner | Ao concluir o rebuild (sucesso ou erro), o sistema envia uma notificação ao owner via `notifyOwner()` com: total processado, erros, duração e status | Alta |
| RF-AE.10 | Cron Job Semanal Automático | O módulo `embeddings-scheduler.ts` registra um cron job com `node-cron` na inicialização do servidor. Expressão: `"0 3 * * 1"` (toda segunda às 03:00). Proteção contra execução dupla: se um rebuild já estiver em andamento, o cron é ignorado | Alta |

---

## 14. Resiliência e UX de Carregamento

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-R.01 | Timeout de 3 Minutos | Todas as chamadas LLM têm timeout de 180 segundos via `AbortController`. Erro tipado `LLM_TIMEOUT` |Alta |
| RF-R.02 | Retry Automático com Countdown | Ao detectar `LLM_TIMEOUT`, exibir anel SVG animado com contagem regressiva de 10 segundos. Retry automático ao fim do countdown. Botão "Cancelar retry automático" | Alta |
| RF-R.03 | Retry no Servidor | `generateWithRetry()` tenta até 2 vezes com validação Zod em cada tentativa. Aguarda 1s entre tentativas | Alta |
| RF-R.04 | Contador de Tempo na Geração | Contador em segundos durante a geração de perguntas. Barra de progresso estimada com cap em 95%. Mensagens contextuais por faixa de tempo (0–15s, 15–45s, 45s+) | Média |
| RF-R.05 | Fallback Silencioso do RAG | Se o banco de dados estiver indisponível, o RAG falha silenciosamente e o prompt é enviado sem contexto regulatório | Alta |
| RF-R.06 | Extração Robusta de JSON | `extractJsonFromLLMResponse()` lida com blocos de thinking do GPT-4.1, markdown code blocks e JSON inline | Alta |
| RF-R.07 | Fallback de Embeddings | Se a API OpenAI estiver indisponível durante a busca de CNAEs, `getFallbackCandidates()` retorna os primeiros CNAEs do cache em memória sem chamar a API, garantindo que a Etapa 1 continue funcionando | Alta |

---

## 15. Navegação e FlowStepper

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-N.01 | FlowStepper Clicável | Componente FlowStepper reutilizável em todas as páginas do fluxo (Questionário, Briefing, Matrizes, Plano). Clicável para navegar entre etapas já concluídas | Alta |
| RF-N.02 | Etapas Coloridas por Status | O FlowStepper exibe etapas concluídas em verde, etapa atual em azul e etapas futuras em cinza. Helper `statusToCompletedStep` sincroniza com o status do projeto | Alta |
| RF-N.03 | Back Buttons com Label | Todos os botões de voltar têm label descritivo: "← Voltar ao Projeto", "← Voltar ao Questionário" | Alta |
| RF-N.04 | Sidebar com Persistência | O estado aberto/fechado da sidebar é persistido via `localStorage` entre navegações | Média |
| RF-N.05 | Indicador de Localização na Sidebar | A sidebar exibe indicador visual de localização para sub-rotas de projeto | Média |
| RF-N.06 | Botão "+ Novo Projeto" na Sidebar | Botão em destaque na sidebar esquerda, abaixo do logo | Alta |

---

## 16. Onboarding Guiado (Tour Interativo)

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-O.01 | Tour Step-by-Step | Tour interativo com 6 passos: (0) Boas-vindas, (1) Painel de Projetos, (2) Extração de CNAEs, (3) Questionário Adaptativo, (4) Briefing e Matrizes, (5) Plano de Ação e Decisão | Alta |
| RF-O.02 | Overlay com Spotlight | Overlay escuro com spotlight (box-shadow) no elemento alvo de cada passo. Tooltip posicionado dinamicamente (top/bottom/left/right/center) | Alta |
| RF-O.03 | Disparo Automático no Primeiro Login | `onboarding.getStatus` detecta `isNew = true` e abre o tour automaticamente sem ação do usuário | Alta |
| RF-O.04 | Persistência por Usuário | Tabela `onboardingProgress` no banco. Procedures: `getStatus`, `markStep`, `skip`, `reset` | Alta |
| RF-O.05 | Barra de Progresso | Barra de progresso (X/6 etapas) e botões: Próximo / Pular / Concluir Tour | Alta |
| RF-O.06 | Botão "Retomar Tour" na Sidebar | Botão com badge "Novo" na sidebar quando o usuário tem progresso parcial no tour | Alta |

---

## 17. Arquitetura de Diagnóstico Dual (V1/V3) — ADR-005 *(novo v6.0)*

Esta seção documenta os requisitos da arquitetura de coexistência dos motores de diagnóstico V1 (legado) e V3 (novo), implementada nas Fases F-01 a F-04 (Sprints v5.2.0–v5.3.0).

### Contexto

A plataforma mantém dois motores de diagnóstico coexistentes para garantir compatibilidade retroativa com os 2.145 projetos existentes. O campo `flowVersion` na tabela `projects` determina qual motor serve cada projeto: `v1` para projetos legados, `v3` para projetos novos.

### Requisitos Funcionais — Diagnóstico Dual

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-DD.01 | Adaptador `getDiagnosticSource()` | Função central em `server/diagnostic-source.ts` que, dado um `projectId`, determina automaticamente se o projeto usa o fluxo V1 ou V3 e retorna os dados do diagnóstico da fonte correta | Alta |
| RF-DD.02 | Campo `flowVersion` Imutável | O campo `flowVersion` é definido na criação do projeto e nunca alterado. Projetos criados antes da v2.1 têm `flowVersion = 'v1'`; novos projetos têm `flowVersion = 'v3'` | Alta |
| RF-DD.03 | Migração Zero-Downtime | A adição do campo `flowVersion` usa `DEFAULT 'v1'` para garantir compatibilidade com todos os projetos existentes sem migração de dados | Alta |
| RF-DD.04 | 121 Consumidores Migrados | Todos os 121 pontos de leitura direta do diagnóstico foram migrados para usar `getDiagnosticSource()` nas Fases F-01 a F-02D | Alta |
| RF-DD.05 | Gate de Retrocesso com Limpeza (F-03) | Ao retroceder da Etapa N para N-1, o sistema executa `cleanupOnRetrocesso()` que remove os dados gerados pela IA na Etapa N (briefing, matrizes ou plano) e registra a operação em `projectAuditLog` | Alta |
| RF-DD.06 | Proteção ao Usuário no Retrocesso | Antes de executar a limpeza, o sistema exibe um modal de confirmação com a lista de dados que serão removidos. O usuário deve confirmar explicitamente | Alta |
| RF-DD.07 | Log de Auditoria do Retrocesso | Cada operação de retrocesso registra em `projectAuditLog`: `projectId`, `fromStep`, `toStep`, `cleanedData` (JSON), `userId`, `timestamp` | Alta |
| RF-DD.08 | Estratégia de Migração de Schema (F-04/ADR-008) | Novos campos do fluxo V3 são adicionados como colunas nullable na tabela `projects`. A migração usa `pnpm db:push` com estratégia `addColumn` (sem `dropColumn`) para zero-downtime | Alta |

---

## 18. Shadow Mode e Monitoramento de Divergências *(novo v6.0)*

O Shadow Mode é o mecanismo de validação que executa os dois motores de diagnóstico em paralelo antes de ativar o modo `new`. Ele permite comparar os resultados do V1 e V3 para garantir que a migração não introduz regressões.

### Requisitos Funcionais — Shadow Mode

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-SM.01 | Variável de Controle `DIAGNOSTIC_READ_MODE` | A variável de ambiente `DIAGNOSTIC_READ_MODE` controla o comportamento do sistema: `legacy` (apenas V1), `shadow` (V1 + V3 em paralelo, retorna V1), `new` (apenas V3) | Alta |
| RF-SM.02 | Registro de Divergências | Em modo `shadow`, quando os resultados V1 e V3 divergem, a divergência é registrada na tabela `diagnostic_shadow_divergences` com: `projectId`, `field_name`, `reason`, `legacyValue`, `newValue`, `createdAt` | Alta |
| RF-SM.03 | Dashboard Shadow Monitor | Página `/admin/shadow-monitor` (exclusiva `equipe_solaris`) exibe: total de divergências, divergências críticas, projetos afetados, campos monitorados, distribuição por campo e evolução nas últimas 24h | Alta |
| RF-SM.04 | Aba "Progresso UAT" | Aba no Shadow Monitor exibindo: projetos UAT criados, projetos UAT com divergência e status de aprovação do UAT | Alta |
| RF-SM.05 | Critério de Ativação do Modo `new` | O modo `new` só deve ser ativado quando: (a) 0 divergências críticas; (b) 0 projetos UAT com divergência; (c) total de divergências ≤ 5% acima do baseline (274) | Alta |
| RF-SM.06 | Limpeza de Divergências Antigas | Botão "Limpar >7d" no Shadow Monitor remove divergências com mais de 7 dias para manter o painel limpo | Média |
| RF-SM.07 | Baseline T=0 Documentado | O estado inicial do Shadow Monitor (T=0) é documentado antes do início do UAT: 274 divergências, 0 críticas, 38 projetos afetados (todos do tipo "legado tem valor, nova é null") | Alta |

---

## 19. Protocolo de Validação Automatizada *(novo v6.0)*

A plataforma possui uma suite de validação automatizada com 107 testes divididos em duas ondas, cobrindo os requisitos não-funcionais de carga, concorrência, retrocesso e integridade de dados.

### Onda 1 — Testes T01 a T10 (75 asserções)

| Suite | Arquivo | Foco | Asserções |
|---|---|---|---|
| T01–T05 | `onda1-t01-t05.test.ts` | Criação paralela, race conditions, retrocesso, persistência de progresso, limpeza de dados | 37 |
| T06–T10 | `onda1-t06-t10.test.ts` | Concorrência de leituras, integridade de dados, auditoria, permissões, rollback | 38 |

### Onda 2 — Testes T11 a T14 (32 asserções)

| Suite | Arquivo | Foco | Asserções |
|---|---|---|---|
| T11 | `onda2-t11-carga.test.ts` | 50 projetos em paralelo, race conditions de escrita, leituras concorrentes | 9 |
| T12–T13 | `onda2-t12-t13.test.ts` | Integridade de CNAEs, respostas do questionário, dados de diagnóstico | 13 |
| T14 | `onda2-t14-retrocesso.test.ts` | Retrocesso múltiplo acumulado, loop adversarial 10x, retrocesso pós-aprovação | 10 |

### Métricas de Performance (Onda 2)

| Operação | Tempo Medido | Limite Aceitável |
|---|---|---|
| 50 projetos criados em paralelo | 141ms | 10.000ms |
| 50 updates concorrentes | 38ms | 8.000ms |
| 35 inserts CNAE em paralelo | 67ms | 8.000ms |
| Deadlocks detectados | 0 | 0 |
| Corrupções de dados | 0 | 0 |

### Requisitos de Validação

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-VAL.01 | Suite de 107 Testes | A plataforma mantém 107 testes automatizados (Onda 1 + Onda 2) que devem passar 100% antes de qualquer deploy | Alta |
| RF-VAL.02 | Isolamento por Execução | Cada execução de teste usa um `RUN_ID` único para evitar colisões de dados no banco compartilhado | Alta |
| RF-VAL.03 | Pool de Conexões por Arquivo | Cada arquivo de teste usa `createPool` independente para evitar conflitos de `afterAll` em execuções paralelas | Alta |
| RF-VAL.04 | Limpeza Pós-Teste | Todos os dados criados durante os testes são removidos no `afterAll` de cada suite | Alta |

---

## 20. Protocolo UAT com Advogados *(novo v6.0)*

O protocolo UAT define o processo de validação da plataforma pela equipe jurídica antes da ativação do modo `new`.

| ID | Requisito | Descrição Detalhada | Prioridade |
|---|---|---|---|
| RF-UAT.01 | Guia UAT v2 | Documento `GUIA-UAT-ADVOGADOS-v2.md` com 8 cenários de teste, critérios de aceite por etapa, formulário de feedback e cronograma de 4 dias | Alta |
| RF-UAT.02 | Prefixo Obrigatório `[UAT]` | Todos os projetos criados durante o UAT devem usar o prefixo `[UAT]` no nome para identificação no Shadow Monitor | Alta |
| RF-UAT.03 | Verificação T+24/48/72h | O Shadow Monitor é verificado em T+24h, T+48h e T+72h após o início do UAT. A decisão de ativar o modo `new` é tomada em T+72h | Alta |
| RF-UAT.04 | Critérios de Aprovação | O UAT é aprovado quando: (a) 0 bugs críticos; (b) ≥ 80% de aprovação nos 8 cenários; (c) 0 projetos UAT com divergência no Shadow Monitor; (d) feedback jurídico positivo sobre precisão das citações legais | Alta |

---

## 21. Banco de Dados e Schema

O banco de dados utiliza TiDB MySQL com Drizzle ORM. O schema conta com **64 tabelas** organizadas em domínios (10 novas tabelas adicionadas desde a v4.0):

| Domínio | Tabelas | Descrição |
|---|---|---|
| Usuários e Auth | `users`, `projectParticipants`, `clientMembers` | Identidade, papéis e vínculos |
| Projetos e Clientes | `projects`, `activityBranches`, `projectBranches`, `projectPermissions` | Estrutura principal |
| Fluxo V3 (IA) | `questionnaireAnswersV3`, `questionnaireProgressV3` | Respostas e progresso do questionário |
| Briefings | `briefings`, `briefingVersions` | Conteúdo e histórico de versões |
| Matrizes de Riscos | `riskMatrix`, `riskMatrixVersions`, `riskMatrixPromptHistory` | Riscos e histórico |
| Planos de Ação | `actionPlans`, `actionPlanVersions`, `actionPlanPromptHistory`, `actionPlanTemplates` | Tarefas e templates |
| Tarefas | `phases`, `actions`, `taskObservers`, `taskComments`, `taskHistory` | Gestão de tarefas |
| Notificações | `notifications`, `notificationPreferences` | Sistema de alertas |
| Colaboração | `stepComments`, `auditLog` | Comentários e auditoria |
| RAG | `ragDocuments` | Corpus de 1.241 documentos tributários |
| Onboarding | `onboardingProgress` | Progresso do tour por usuário |
| Embeddings CNAE | `cnaeEmbeddings` | Vetores OpenAI de 1.536 dimensões para os 1.332 CNAEs |
| Histórico de Rebuilds | `embeddingRebuildLogs` | Log de execuções de rebuild (manual e cron) |
| **Shadow Mode** | **`diagnostic_shadow_divergences`** | **Divergências entre motores V1 e V3** *(novo v6.0)* |
| **Auditoria de Retrocesso** | **`projectAuditLog`** | **Log de operações de retrocesso com limpeza de dados** *(novo v6.0)* |
| Sessões | `sessions`, `branchSuggestions`, `sessionBranchAnswers`, `sessionActionPlans` | Modo temporário |
| Legado | `assessmentPhase1`, `assessmentPhase2`, `corporateAssessments`, `branchAssessments` | Fluxo anterior (mantido) |

---

## 22. Resumo Quantitativo

| Módulo | RFs v5.0 | RFs Novos (v6.0) | Total v6.0 | Alta Prioridade |
|---|---|---|---|---|
| Etapa 1 — Criação do Projeto | 8 | 0 | 8 | 6 |
| Etapa 2 — Questionário Adaptativo | 12 | 0 | 12 | 10 |
| Etapa 3 — Briefing de Compliance | 10 | 0 | 10 | 8 |
| Etapa 4 — Matrizes de Riscos | 13 | 0 | 13 | 12 |
| Etapa 5 — Plano de Ação | 22 | 0 | 22 | 20 |
| Painel de Controle | 6 | 0 | 6 | 4 |
| Situação do Projeto | 3 | 0 | 3 | 3 |
| Gerenciamento de Equipe | 4 | 0 | 4 | 3 |
| Gerenciamento de Usuários | 4 | 0 | 4 | 3 |
| Módulo de IA e RAG | 19 | 0 | 19 | 19 |
| Administração de Embeddings | 10 | 0 | 10 | 10 |
| Resiliência e UX | 7 | 0 | 7 | 6 |
| Navegação e FlowStepper | 6 | 0 | 6 | 4 |
| Onboarding Guiado | 6 | 0 | 6 | 6 |
| **Diagnóstico Dual (ADR-005)** | **0** | **8** | **8** | **8** |
| **Shadow Mode** | **0** | **7** | **7** | **6** |
| **Validação Automatizada** | **0** | **4** | **4** | **4** |
| **Protocolo UAT** | **0** | **4** | **4** | **4** |
| **Total** | **130** | **23** | **153** | **136** |

---

## 23. Novos Requisitos vs. Versão 5.0

| ID | Requisito | Sprint | Origem |
|---|---|---|---|
| PG-16 | Premissa do adaptador `getDiagnosticSource()` | v5.2.0 (F-01) | ADR-005 — Isolamento físico das fontes de verdade |
| PG-17 | Premissa do gate de limpeza no retrocesso | v5.2.0 (F-03) | ADR-007 — Gate de limpeza de dados no retrocesso |
| PG-18 | Premissa do Shadow Mode | v5.2.0 | Validação da migração V1→V3 |
| PG-19 | Premissa da suite de validação automatizada | v5.3.0 | Onda 1 (75 testes) + Onda 2 (32 testes) |
| RF-DD.01–RF-DD.08 | Requisitos do diagnóstico dual | v5.2.0 (F-01 a F-04) | ADR-005, ADR-007, ADR-008 |
| RF-SM.01–RF-SM.07 | Requisitos do Shadow Mode | v5.2.0 | Monitoramento de divergências V1/V3 |
| RF-VAL.01–RF-VAL.04 | Requisitos de validação automatizada | v5.3.0 | Suite Onda 1 + Onda 2 |
| RF-UAT.01–RF-UAT.04 | Requisitos do protocolo UAT | v5.3.0 | Validação jurídica antes do modo `new` |

---

## 24. Correções Técnicas Incorporadas

| Componente | Problema | Solução | Sprint |
|---|---|---|---|
| `PlanoAcaoV3.tsx` | `useEffect([project])` causava loop infinito | Substituído por `generationTriggeredRef` (`useRef`) | V74 |
| `QuestionarioV3.tsx` | `useEffect([startedCnaes.size])` re-disparava em loop | Substituído por `loadedQuestionsRef` | V74 |
| `MatrizesV3.tsx` | Threshold de severidade Média×Médio incorreto | Score ≥ 4 = "Alta" conforme tabela 3×3 padrão | V74 |
| `drizzle/schema.ts` | Campos `briefingContent`, `riskMatricesData`, `actionPlansData` ausentes | Adicionados como `text nullable` via `pnpm db:push` | V74 |
| `QuestionarioV3.tsx` | `cnaeProgress` não restaurava estado ao reabrir | Inicialização lê `savedProgress.answers` do banco | V74 |
| `FlowStepper.tsx` | Ícone "Projeto" navegava para rota errada | Rota corrigida para `/projetos/{id}` | V74 |
| `FlowStepper.tsx` | Etapas em cinza nas páginas internas | Helper `statusToCompletedStep` criado em `flowStepperUtils.ts` | V74 |
| `projects.updateStatus.test.ts` | Falha de isolamento em testes paralelos | `RUN_ID` único por execução adicionado | V74 |
| `invokeLLM()` | Sem timeout explícito — chamadas travavam | `AbortController` com 180s; erro tipado `LLM_TIMEOUT` | v5.1.0 |
| `extractJsonFromLLMResponse()` | Blocos thinking quebravam `JSON.parse()` | Remoção de blocos thinking antes da extração | v5.1.0 |
| `MatrizesV3.tsx` | Navegação para Etapa 5 sem invalidar cache tRPC | `await utils.fluxoV3.getProjectStep1.invalidate()` antes da navegação | V74 |
| `PlanoAcaoV3.tsx` | Query retornava status antigo após navegação | `refetchOnMount: "always"` e `staleTime: 0` na query | V74 |
| `cnae-embeddings.ts` | CNAEs de cláusulas secundárias excluídos do ranking | Merge em 2 camadas: top-5 garantidos + preenchimento global | V71 |
| **`diagnostic-source.ts`** | **121 consumidores lendo diretamente do banco sem considerar `flowVersion`** | **Adaptador `getDiagnosticSource()` centraliza todas as leituras** | **v5.2.0 (F-01 a F-02D)** |
| **`flowRouter.ts`** | **Retrocesso não limpava dados gerados pela IA** | **Gate `cleanupOnRetrocesso()` integrado no `saveStep`** | **v5.2.0 (F-03)** |
| **`onda2-t11-carga.test.ts`** | **Testes usavam `createConnection` causando conflito de `afterAll`** | **Migrado para `createPool` com conexões independentes** | **v5.3.0** |
| **`shadowMode.ts`** | **Cache incremental stale do `tsbuildinfo` causava falso positivo TypeScript** | **Cache limpo; `tsc --noEmit` compila com Exit: 0** | **v5.3.0** |

---

*Documento gerado em 23 de Março de 2026 — Plataforma de Compliance Tributário v6.0 (Sprint v5.3.0)*
*Versão anterior: v5.0 (Sprint V74, Março de 2026)*
*Próxima revisão prevista: Junho de 2026 (Sprint V80)*
*Mantido por: Equipe SOLARIS*
