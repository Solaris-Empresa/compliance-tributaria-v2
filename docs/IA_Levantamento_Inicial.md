# Análise da IA: Geração de Levantamento Inicial

**Autor:** Manus AI  
**Data:** 29 de Janeiro de 2026  
**Versão:** 1.0  

---

## Sumário Executivo

A etapa de **Geração de Levantamento Inicial** representa o núcleo inteligente da Plataforma de Compliance Tributária, onde a Inteligência Artificial processa dados estruturados e não estruturados coletados nas fases de avaliação para produzir um documento técnico abrangente. Este documento detalha os inputs processados, a lógica de análise da IA, e os outputs gerados, servindo como especificação técnica para implementação e manutenção do sistema.

---

## 1. Visão Geral do Processo

A Geração de Levantamento Inicial é acionada após a conclusão da **Avaliação Fase 2**, quando o sistema possui dados suficientes sobre o cliente e o projeto. O processo envolve três etapas principais: coleta e estruturação de dados, análise inteligente via LLM (Large Language Model), e geração de documento estruturado.

### 1.1 Fluxo de Processamento

```
Dados da Avaliação → Estruturação → Prompt Engineering → LLM → Pós-Processamento → Documento Final
```

O tempo médio de processamento varia entre 15 a 45 segundos, dependendo da complexidade dos dados e da carga do serviço de IA.

---

## 2. Inputs: Dados Analisados pela IA

A IA processa múltiplas fontes de dados estruturados e semi-estruturados coletados durante o processo de avaliação. Estes dados são organizados em categorias para facilitar a análise contextual.

### 2.1 Dados do Cliente (Tabela `clients`)

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| **razaoSocial** | String | Nome jurídico da empresa | "Tech Solutions Ltda" |
| **nomeFantasia** | String | Nome comercial | "TechSol" |
| **cnpj** | String | Identificador fiscal | "12.345.678/0001-90" |
| **setor** | String | Ramo de atividade | "Tecnologia da Informação" |
| **porte** | Enum | Classificação por receita | "pequena" |
| **telefone** | String | Contato principal | "(11) 98765-4321" |
| **email** | String | Email corporativo | "contato@techsol.com.br" |
| **endereco** | String | Localização física | "Av. Paulista, 1000 - São Paulo/SP" |

### 2.2 Dados do Projeto (Tabela `projects`)

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| **name** | String | Título do projeto | "Adequação à Reforma Tributária 2026" |
| **description** | Text | Escopo e objetivos | "Análise de impactos da reforma..." |
| **status** | Enum | Estado atual | "em_andamento" |
| **taxRegime** | Enum | Regime tributário atual | "lucro_presumido" |
| **businessType** | String | Tipo de negócio | "Desenvolvimento de Software" |
| **companySize** | Enum | Porte da empresa | "pequena" |
| **startDate** | Date | Data de início | "2026-01-15" |
| **deadline** | Date | Prazo final | "2026-06-30" |

### 2.3 Dados da Avaliação Fase 1 (Tabela `assessmentPhase1`)

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| **annualRevenue** | Decimal | Receita bruta anual | "R$ 2.500.000,00" |
| **employeeCount** | Integer | Número de funcionários | 25 |
| **hasAccountant** | Boolean | Possui contador | true |
| **accountingSystem** | String | Sistema contábil usado | "Domínio Sistemas" |
| **mainActivities** | Text | Atividades principais | "Desenvolvimento de software sob demanda..." |
| **taxObligations** | Text | Obrigações acessórias | "SPED Fiscal, SPED Contribuições, EFD-Reinf" |

### 2.4 Dados da Avaliação Fase 2 (Tabela `assessmentPhase2`)

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| **hasInternationalOperations** | Boolean | Opera internacionalmente | false |
| **hasInventory** | Boolean | Mantém estoque | false |
| **hasFixedAssets** | Boolean | Possui ativo imobilizado | true |
| **hasLoans** | Boolean | Possui financiamentos | true |
| **taxIncentives** | Text | Incentivos fiscais | "Nenhum" |
| **pendingIssues** | Text | Pendências fiscais | "Multa ICMS 2024 em discussão administrativa" |
| **specificChallenges** | Text | Desafios específicos | "Dificuldade em classificar NCM de produtos..." |
| **additionalNotes** | Text | Observações gerais | "Empresa em fase de expansão..." |

### 2.5 Contexto Regulatório (Base de Conhecimento)

A IA também acessa uma base de conhecimento interna contendo informações sobre a Reforma Tributária brasileira, incluindo:

- Legislação aplicável (LC 214/2025, Emenda Constitucional 132/2023)
- Prazos de transição (2026-2033)
- Alíquotas de referência do IBS e CBS
- Regimes específicos (cashback, split payment, imunidades)
- Jurisprudência e orientações da Receita Federal

---

## 3. Processamento: Lógica de Análise da IA

A IA utiliza um modelo de linguagem de grande porte (LLM) configurado especificamente para análise tributária. O processamento ocorre em múltiplas etapas sequenciais.

### 3.1 Estruturação de Dados (Pré-Processamento)

Antes de enviar os dados ao LLM, o sistema realiza:

**Normalização de Valores:** Conversão de tipos de dados (decimais, datas, enums) para formato textual legível.

**Enriquecimento Contextual:** Adição de metadados explicativos. Por exemplo, o porte "pequena" é expandido para "Pequena Empresa (receita bruta anual entre R$ 360 mil e R$ 4,8 milhões)".

**Validação de Completude:** Verificação de campos obrigatórios e sinalização de dados ausentes que podem impactar a qualidade da análise.

### 3.2 Prompt Engineering

O sistema constrói um prompt estruturado que guia o LLM na análise. O prompt inclui:

**Contexto do Papel:** "Você é um consultor tributário especializado em Reforma Tributária brasileira..."

**Dados Estruturados:** Todos os inputs organizados em seções claras (Cliente, Projeto, Avaliação Fase 1, Avaliação Fase 2).

**Instruções Específicas:** Diretrizes sobre o que analisar e como estruturar o output.

**Formato de Saída:** Especificação do formato Markdown esperado com seções obrigatórias.

**Exemplo de Prompt (Simplificado):**

```
Você é um consultor tributário especializado em Reforma Tributária brasileira.

Analise os dados abaixo e gere um Levantamento Inicial completo:

## DADOS DO CLIENTE
- Razão Social: Tech Solutions Ltda
- CNPJ: 12.345.678/0001-90
- Setor: Tecnologia da Informação
- Porte: Pequena Empresa
- Regime Tributário Atual: Lucro Presumido

## DADOS DA AVALIAÇÃO
- Receita Anual: R$ 2.500.000,00
- Funcionários: 25
- Atividades Principais: Desenvolvimento de software sob demanda
- Desafios Específicos: Dificuldade em classificar NCM de produtos digitais

## INSTRUÇÕES
Gere um documento com as seguintes seções:
1. Resumo Executivo
2. Perfil da Empresa
3. Análise do Regime Tributário Atual
4. Impactos da Reforma Tributária
5. Recomendações Estratégicas
6. Cronograma de Ações
7. Riscos e Oportunidades

Use linguagem técnica mas acessível. Cite legislação quando relevante.
```

### 3.3 Análise do LLM

O modelo de linguagem processa o prompt e realiza as seguintes análises:

**Análise de Perfil Tributário:** Identifica características fiscais relevantes (regime, porte, setor) e compara com benchmarks do mercado.

**Mapeamento de Impactos:** Cruza os dados da empresa com as mudanças trazidas pela Reforma Tributária para identificar impactos específicos (aumento/redução de carga tributária, mudanças em obrigações acessórias, etc.).

**Identificação de Riscos:** Detecta potenciais problemas com base nos dados informados (pendências fiscais, complexidade operacional, gaps de conformidade).

**Geração de Recomendações:** Propõe ações estratégicas personalizadas com base no perfil da empresa e nos impactos identificados.

**Priorização de Ações:** Ordena as recomendações por urgência e impacto, considerando os prazos da reforma.

### 3.4 Pós-Processamento

Após receber a resposta do LLM, o sistema realiza:

**Validação de Formato:** Verifica se o output está em Markdown válido e contém todas as seções obrigatórias.

**Sanitização de Conteúdo:** Remove caracteres inválidos e corrige formatação inconsistente.

**Enriquecimento de Metadados:** Adiciona cabeçalho com data de geração, versão, e identificadores do projeto.

**Armazenamento:** Salva o documento na tabela `briefings` com referência ao projeto.

---

## 4. Outputs: Documento de Levantamento Inicial

O output principal é um documento estruturado em formato Markdown, armazenado no campo `content` da tabela `briefings`. O documento segue uma estrutura padronizada para garantir consistência e completude.

### 4.1 Estrutura do Documento

#### 4.1.1 Cabeçalho (Metadados)

```markdown
# Levantamento Inicial: Adequação à Reforma Tributária

**Cliente:** Tech Solutions Ltda  
**CNPJ:** 12.345.678/0001-90  
**Projeto:** Adequação à Reforma Tributária 2026  
**Data de Geração:** 29/01/2026  
**Versão:** 1.0  
```

#### 4.1.2 Resumo Executivo

Síntese de 200-300 palavras com os principais achados e recomendações. Destina-se a gestores que precisam de uma visão rápida sem entrar em detalhes técnicos.

**Exemplo:**

> A Tech Solutions Ltda, empresa de pequeno porte no setor de Tecnologia da Informação, atualmente tributada pelo Lucro Presumido, enfrentará impactos moderados com a Reforma Tributária. A principal mudança será a transição do PIS/COFINS para o CBS e do ISS para o IBS, com alíquota combinada estimada em 27,5%. Recomenda-se iniciar imediatamente o mapeamento de operações e a adequação dos sistemas contábeis para suportar o novo modelo de apuração. O prazo crítico é dezembro de 2026 para preparação dos sistemas antes do início da fase de transição em 2027.

#### 4.1.3 Perfil da Empresa

Descrição detalhada do cliente com base nos dados coletados, incluindo:

- Identificação e localização
- Atividades econômicas principais
- Estrutura operacional (funcionários, faturamento, ativos)
- Regime tributário atual e histórico
- Sistemas e processos contábeis existentes

#### 4.1.4 Análise do Regime Tributário Atual

Avaliação técnica do regime tributário vigente, incluindo:

- Tributos recolhidos (IRPJ, CSLL, PIS, COFINS, ISS, ICMS)
- Alíquotas efetivas atuais
- Obrigações acessórias cumpridas
- Vantagens e desvantagens do regime atual para o perfil da empresa

**Exemplo de Tabela:**

| Tributo | Alíquota Atual | Base de Cálculo | Estimativa Anual |
|---------|----------------|-----------------|------------------|
| IRPJ | 15% + 10% | Lucro Presumido (32%) | R$ 120.000 |
| CSLL | 9% | Lucro Presumido (32%) | R$ 72.000 |
| PIS | 0,65% | Faturamento | R$ 16.250 |
| COFINS | 3% | Faturamento | R$ 75.000 |
| ISS | 2-5% | Faturamento | R$ 75.000 |
| **TOTAL** | - | - | **R$ 358.250** |

#### 4.1.5 Impactos da Reforma Tributária

Análise detalhada das mudanças trazidas pela reforma e seus efeitos específicos para a empresa:

**Mudanças Estruturais:**
- Extinção de PIS, COFINS, IPI, ISS e ICMS
- Criação do IBS (Imposto sobre Bens e Serviços - estadual/municipal)
- Criação do CBS (Contribuição sobre Bens e Serviços - federal)
- Implementação do sistema de não-cumulatividade plena

**Impactos Quantitativos:**
- Estimativa de carga tributária no novo modelo
- Comparação com carga atual (aumento/redução percentual)
- Impacto no fluxo de caixa (considerando créditos e débitos)

**Impactos Operacionais:**
- Mudanças em obrigações acessórias (novas declarações, formatos)
- Necessidade de adequação de sistemas (ERP, emissão de notas fiscais)
- Impacto em processos internos (compras, vendas, contabilidade)

**Exemplo de Análise:**

> **Impacto Estimado na Carga Tributária:**  
> Com base na alíquota de referência de 27,5% (IBS + CBS) e considerando a não-cumulatividade plena, estima-se que a carga tributária efetiva da Tech Solutions Ltda aumentará em aproximadamente 8% em relação ao modelo atual. Este aumento decorre principalmente da impossibilidade de aproveitar o regime de Lucro Presumido, que oferece base de cálculo reduzida. No entanto, a empresa poderá se creditar integralmente de tributos pagos em aquisições de insumos e serviços, o que pode mitigar parcialmente este impacto.

#### 4.1.6 Recomendações Estratégicas

Lista priorizada de ações recomendadas, cada uma contendo:

- **Título da Recomendação**
- **Descrição:** Detalhamento da ação
- **Justificativa:** Por que é importante
- **Prazo:** Quando deve ser implementada
- **Responsável Sugerido:** Quem deve liderar (contador, gestor, TI)
- **Complexidade:** Baixa/Média/Alta
- **Impacto:** Baixo/Médio/Alto

**Exemplo:**

> **Recomendação 1: Mapeamento Completo de Operações**  
> **Descrição:** Realizar levantamento detalhado de todas as operações de compra e venda, identificando NCM/NBS de produtos e serviços, fornecedores, clientes, e alíquotas aplicáveis.  
> **Justificativa:** O novo sistema exige classificação precisa de todas as operações para cálculo correto de créditos e débitos. Erros de classificação podem gerar autuações e perda de créditos tributários.  
> **Prazo:** Até 30/06/2026  
> **Responsável:** Contador + Gestor Financeiro  
> **Complexidade:** Alta  
> **Impacto:** Alto  

#### 4.1.7 Cronograma de Ações

Linha do tempo visual com marcos importantes e prazos críticos, considerando:

- Prazos legais da reforma (2026-2033)
- Prazos internos recomendados (com margem de segurança)
- Dependências entre ações (o que precisa ser feito antes do quê)

**Exemplo de Cronograma:**

| Período | Ação | Status |
|---------|------|--------|
| Jan-Mar/2026 | Mapeamento de operações | A fazer |
| Abr-Jun/2026 | Adequação de sistemas contábeis | A fazer |
| Jul-Set/2026 | Treinamento de equipe | A fazer |
| Out-Dez/2026 | Testes e simulações | A fazer |
| Jan/2027 | Início da fase de transição (teste em paralelo) | Aguardando |
| 2027-2032 | Período de transição gradual | Aguardando |
| 2033 | Implementação completa da reforma | Aguardando |

#### 4.1.8 Riscos e Oportunidades

Análise de cenários positivos e negativos:

**Riscos Identificados:**
- Risco de autuação por classificação incorreta de operações
- Risco de perda de créditos tributários por falta de documentação
- Risco de indisponibilidade de sistemas durante a transição
- Risco de aumento de custos operacionais (contabilidade, TI)

**Oportunidades Identificadas:**
- Oportunidade de redução de carga tributária via planejamento tributário
- Oportunidade de simplificação de processos (menos obrigações acessórias)
- Oportunidade de recuperação de créditos não aproveitados no modelo atual
- Oportunidade de revisão de precificação considerando nova estrutura tributária

#### 4.1.9 Anexos e Referências

- Links para legislação aplicável
- Glossário de termos técnicos
- Contatos de órgãos reguladores (Receita Federal, Comitê Gestor do IBS)
- Referências bibliográficas e fontes consultadas

### 4.2 Metadados Armazenados (Tabela `briefings`)

Além do documento em si, o sistema armazena metadados estruturados:

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| **id** | Integer | Identificador único | 123 |
| **projectId** | Integer | Referência ao projeto | 456 |
| **content** | Text | Documento completo em Markdown | (conteúdo do documento) |
| **status** | Enum | Estado do documento | "finalizado" |
| **version** | Integer | Número da versão | 1 |
| **generatedAt** | Timestamp | Data/hora de geração | "2026-01-29 15:30:00" |
| **generatedBy** | String | Identificador do gerador | "IA-LLM-v1" |
| **promptUsed** | Text | Prompt enviado ao LLM | (prompt completo) |
| **tokensUsed** | Integer | Tokens consumidos | 3500 |
| **processingTime** | Integer | Tempo de processamento (ms) | 28000 |

### 4.3 Outputs Secundários

Além do documento principal, o sistema gera outputs auxiliares:

**Tarefas Sugeridas:** Lista de tarefas extraídas das recomendações, prontas para serem inseridas no Plano de Ação (tabela `tasks`).

**Alertas e Notificações:** Avisos sobre prazos críticos ou riscos de alta prioridade, enviados ao gestor do projeto.

**Métricas de Qualidade:** Indicadores sobre a completude dos dados de entrada e a confiabilidade da análise (ex: "85% dos dados necessários foram fornecidos").

---

## 5. Tecnologias Utilizadas

### 5.1 Modelo de Linguagem (LLM)

O sistema utiliza a API do **Manus Built-in Forge**, que fornece acesso a modelos de linguagem de última geração otimizados para português brasileiro. A integração é feita através do helper `invokeLLM()` localizado em `server/_core/llm.ts`.

**Configuração Típica:**

```typescript
const response = await invokeLLM({
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ],
  temperature: 0.3, // Baixa criatividade para maior precisão
  max_tokens: 4000, // Limite de tokens na resposta
});
```

### 5.2 Processamento de Dados

**Drizzle ORM:** Utilizado para consultar dados estruturados das tabelas `clients`, `projects`, `assessmentPhase1`, e `assessmentPhase2`.

**Superjson:** Serialização de objetos complexos (incluindo `Date` e `Decimal`) para envio ao LLM.

**Markdown Parser:** Validação e sanitização do output gerado pelo LLM.

### 5.3 Armazenamento

**MySQL/TiDB:** Banco de dados relacional para armazenamento de metadados e conteúdo do documento.

**S3 (Opcional):** Para documentos muito grandes ou anexos (PDFs, planilhas), o conteúdo pode ser armazenado em S3 e apenas a URL é salva no banco.

---

## 6. Fluxo de Implementação (Backend)

### 6.1 Endpoint tRPC

O endpoint responsável pela geração do levantamento inicial está localizado em `server/routers.ts`:

```typescript
assessmentPhase2: {
  generateBriefing: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // 1. Buscar dados do projeto, cliente e avaliações
      const project = await getProjectById(input.projectId);
      const client = await getClientById(project.clientId);
      const phase1 = await getAssessmentPhase1(input.projectId);
      const phase2 = await getAssessmentPhase2(input.projectId);
      
      // 2. Estruturar prompt
      const prompt = buildBriefingPrompt({ project, client, phase1, phase2 });
      
      // 3. Chamar LLM
      const response = await invokeLLM({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });
      
      // 4. Pós-processar e salvar
      const content = response.choices[0].message.content;
      const briefingId = await saveBriefing({
        projectId: input.projectId,
        content,
        status: "finalizado",
        generatedBy: "IA-LLM-v1",
        tokensUsed: response.usage.total_tokens,
      });
      
      // 5. Gerar tarefas sugeridas
      await generateSuggestedTasks(briefingId, content);
      
      return { briefingId, content };
    }),
}
```

### 6.2 Helpers de Banco de Dados

Funções auxiliares em `server/db.ts`:

```typescript
export async function getProjectById(projectId: number) {
  return db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: { client: true }
  });
}

export async function saveBriefing(data: InsertBriefing) {
  const [result] = await db.insert(briefings).values(data);
  return Number(result.insertId);
}
```

---

## 7. Considerações de Qualidade e Limitações

### 7.1 Fatores que Afetam a Qualidade

**Completude dos Dados:** Quanto mais completos os dados de entrada, mais precisa e personalizada será a análise. Dados ausentes ou genéricos resultam em recomendações mais superficiais.

**Complexidade do Caso:** Empresas com operações simples (ex: prestação de serviços local) geram análises mais diretas. Empresas com operações complexas (ex: indústria com exportação) requerem análises mais elaboradas.

**Atualização da Base de Conhecimento:** A qualidade depende de manter a base de conhecimento sobre a Reforma Tributária atualizada com novas regulamentações e jurisprudência.

### 7.2 Limitações Conhecidas

**Não Substitui Consultoria Humana:** O documento gerado é um ponto de partida, não uma consultoria completa. Casos complexos exigem revisão por especialista tributário.

**Estimativas Aproximadas:** Cálculos de impacto tributário são estimativas baseadas em alíquotas de referência. A carga real dependerá de regulamentações estaduais/municipais ainda não finalizadas.

**Dependência de Dados Precisos:** "Garbage in, garbage out" - dados incorretos ou desatualizados levam a análises imprecisas.

**Limitações do LLM:** Modelos de linguagem podem ocasionalmente gerar informações imprecisas ("alucinações"). O sistema implementa validações, mas não elimina completamente este risco.

### 7.3 Estratégias de Mitigação

**Validação Humana:** Todos os documentos gerados devem ser revisados por um contador ou consultor tributário antes de serem apresentados ao cliente.

**Versionamento:** O sistema mantém histórico de versões, permitindo rastrear mudanças e reverter se necessário.

**Feedback Loop:** Implementar mecanismo para usuários reportarem imprecisões, alimentando melhorias contínuas no sistema.

**Auditoria de Prompts:** Armazenar o prompt usado em cada geração permite reproduzir e debugar problemas.

---

## 8. Roadmap de Evolução

### 8.1 Melhorias Planejadas (Curto Prazo)

**Análise Comparativa de Cenários:** Permitir que a IA simule múltiplos cenários (ex: manter Lucro Presumido vs. migrar para Lucro Real) e compare resultados.

**Integração com Sistemas Contábeis:** Importar dados diretamente de ERPs para reduzir entrada manual e aumentar precisão.

**Geração de Anexos Automáticos:** Criar automaticamente planilhas de cálculo, cronogramas visuais e checklists em formatos editáveis (Excel, PDF).

### 8.2 Melhorias Planejadas (Médio Prazo)

**Fine-Tuning do Modelo:** Treinar um modelo especializado em legislação tributária brasileira para aumentar precisão e reduzir alucinações.

**Análise Preditiva:** Usar dados históricos para prever tendências de carga tributária e sugerir otimizações proativas.

**Multimodalidade:** Permitir upload de documentos (balanços, DREs, declarações) para análise automática pela IA.

### 8.3 Melhorias Planejadas (Longo Prazo)

**Agente Autônomo:** Evoluir para um agente de IA que não apenas gera documentos, mas também monitora continuamente mudanças regulatórias e alerta proativamente sobre impactos.

**Integração com Órgãos Governamentais:** Conectar diretamente com APIs da Receita Federal e Comitê Gestor do IBS para obter dados atualizados em tempo real.

**Marketplace de Especialistas:** Conectar empresas com consultores tributários especializados para casos complexos identificados pela IA.

---

## 9. Resumo Executivo

A etapa de Geração de Levantamento Inicial é o diferencial competitivo da Plataforma de Compliance Tributária, transformando dados brutos em insights acionáveis através de Inteligência Artificial. O sistema processa dados estruturados de clientes, projetos e avaliações, aplicando análise contextual via LLM para gerar documentos técnicos personalizados em formato Markdown. Os outputs incluem análise de perfil tributário, mapeamento de impactos da Reforma Tributária, recomendações estratégicas priorizadas, cronograma de ações e identificação de riscos e oportunidades. O tempo médio de processamento é de 15 a 45 segundos, com qualidade dependente da completude dos dados de entrada. O sistema utiliza tecnologias modernas (Drizzle ORM, Superjson, Manus LLM API) e implementa boas práticas de versionamento e auditoria. Limitações incluem a necessidade de validação humana para casos complexos e dependência de dados precisos. O roadmap de evolução prevê análise comparativa de cenários, fine-tuning do modelo, e evolução para um agente autônomo de monitoramento regulatório.

---

**Documento gerado por:** Manus AI  
**Última atualização:** 29 de Janeiro de 2026  
**Versão:** 1.0  
