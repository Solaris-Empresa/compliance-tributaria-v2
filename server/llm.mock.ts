/**
 * Mocks para invokeLLM
 * 
 * Este módulo fornece mocks para a função invokeLLM usada em testes,
 * permitindo simular respostas do LLM sem fazer chamadas reais à API.
 */

import type { InvokeParams, InvokeResult } from "./_core/llm";

/**
 * Mock de perguntas dinâmicas para Assessment Fase 2
 */
export const mockQuestionsResponse: InvokeResult = {
  id: "mock-questions-123",
  created: Date.now(),
  model: "gemini-2.5-flash",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content: JSON.stringify({
          questions: [
            {
              id: "q1",
              text: "Sua empresa realiza operações interestaduais?",
              type: "select",
              required: true,
              options: ["Sim", "Não", "Parcialmente"]
            },
            {
              id: "q2",
              text: "Qual o percentual de receita proveniente de serviços?",
              type: "number",
              required: true
            },
            {
              id: "q3",
              text: "Descreva os principais desafios tributários atuais da empresa",
              type: "textarea",
              required: true
            },
            {
              id: "q4",
              text: "A empresa possui sistema de gestão fiscal integrado?",
              type: "select",
              required: false,
              options: ["Sim", "Não", "Em implementação"]
            },
            {
              id: "q5",
              text: "Quantas unidades federativas a empresa opera?",
              type: "number",
              required: false
            }
          ]
        })
      },
      finish_reason: "stop"
    }
  ],
  usage: {
    prompt_tokens: 150,
    completion_tokens: 200,
    total_tokens: 350
  }
};

/**
 * Mock de briefing (levantamento inicial)
 */
export const mockBriefingResponse: InvokeResult = {
  id: "mock-briefing-456",
  created: Date.now(),
  model: "gemini-2.5-flash",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content: JSON.stringify({
          executiveSummary: "A empresa apresenta um perfil de grande porte no setor de tecnologia, com operações interestaduais e faturamento anual de R$ 50 milhões. A análise identificou 3 gaps críticos relacionados à adaptação à reforma tributária CBS/IBS.",
          companyProfile: {
            size: "Grande Empresa",
            sector: "Tecnologia",
            revenue: "R$ 50.000.000,00",
            employees: 500,
            taxRegime: "Lucro Real",
            internationalOperations: true
          },
          gapsIdentified: [
            {
              category: "Conformidade Tributária",
              description: "Necessidade de adequação dos sistemas fiscais para CBS/IBS",
              severity: "Alta",
              impact: "Risco de autuação e multas significativas"
            },
            {
              category: "Processos Internos",
              description: "Falta de integração entre sistemas de gestão e fiscal",
              severity: "Média",
              impact: "Retrabalho e possíveis erros de apuração"
            },
            {
              category: "Capacitação",
              description: "Equipe fiscal precisa de treinamento em nova legislação",
              severity: "Média",
              impact: "Dificuldade de adaptação e interpretação das normas"
            }
          ],
          recommendations: [
            "Implementar sistema de gestão fiscal integrado compatível com CBS/IBS",
            "Realizar treinamento da equipe fiscal sobre a reforma tributária",
            "Estabelecer rotina de monitoramento de conformidade mensal",
            "Contratar consultoria especializada para revisão de processos"
          ],
          timeline: "12 meses para adequação completa",
          estimatedCost: "R$ 250.000,00 a R$ 400.000,00"
        })
      },
      finish_reason: "stop"
    }
  ],
  usage: {
    prompt_tokens: 500,
    completion_tokens: 800,
    total_tokens: 1300
  }
};

/**
 * Mock de plano de ação
 */
export const mockActionPlanResponse: InvokeResult = {
  id: "mock-action-plan-789",
  created: Date.now(),
  model: "gemini-2.5-flash",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content: JSON.stringify({
          overview: "Plano de ação estruturado em 4 fases para adequação completa à reforma tributária CBS/IBS, com duração total de 12 meses e investimento estimado de R$ 300.000,00.",
          phases: [
            {
              id: 1,
              name: "Diagnóstico e Planejamento",
              duration: "2 meses",
              tasks: [
                {
                  id: 1,
                  title: "Mapeamento de processos fiscais atuais",
                  description: "Documentar todos os processos fiscais da empresa, identificando pontos críticos e oportunidades de melhoria",
                  responsible: "Equipe Fiscal",
                  deadline: "30 dias",
                  priority: "Alta",
                  status: "Pendente"
                },
                {
                  id: 2,
                  title: "Análise de gap entre processos atuais e requisitos CBS/IBS",
                  description: "Comparar processos atuais com requisitos da nova legislação, identificando necessidades de adequação",
                  responsible: "Consultoria Externa",
                  deadline: "45 dias",
                  priority: "Alta",
                  status: "Pendente"
                },
                {
                  id: 3,
                  title: "Definição de cronograma detalhado de implementação",
                  description: "Elaborar cronograma com marcos, responsáveis e recursos necessários",
                  responsible: "Gerente de Projetos",
                  deadline: "60 dias",
                  priority: "Média",
                  status: "Pendente"
                }
              ]
            },
            {
              id: 2,
              name: "Capacitação e Treinamento",
              duration: "3 meses",
              tasks: [
                {
                  id: 4,
                  title: "Treinamento da equipe fiscal em CBS/IBS",
                  description: "Curso completo sobre a reforma tributária, incluindo aspectos práticos e operacionais",
                  responsible: "RH + Consultoria",
                  deadline: "90 dias",
                  priority: "Alta",
                  status: "Pendente"
                },
                {
                  id: 5,
                  title: "Workshop de boas práticas de conformidade",
                  description: "Sessões práticas sobre procedimentos de conformidade e controles internos",
                  responsible: "Consultoria Externa",
                  deadline: "120 dias",
                  priority: "Média",
                  status: "Pendente"
                }
              ]
            },
            {
              id: 3,
              name: "Implementação de Sistemas",
              duration: "5 meses",
              tasks: [
                {
                  id: 6,
                  title: "Seleção e contratação de sistema fiscal integrado",
                  description: "Avaliar fornecedores, realizar POCs e contratar solução compatível com CBS/IBS",
                  responsible: "TI + Fiscal",
                  deadline: "150 dias",
                  priority: "Alta",
                  status: "Pendente"
                },
                {
                  id: 7,
                  title: "Parametrização e customização do sistema",
                  description: "Configurar sistema de acordo com as necessidades específicas da empresa",
                  responsible: "Fornecedor + TI",
                  deadline: "210 dias",
                  priority: "Alta",
                  status: "Pendente"
                },
                {
                  id: 8,
                  title: "Migração de dados históricos",
                  description: "Transferir dados fiscais históricos para o novo sistema",
                  responsible: "TI",
                  deadline: "240 dias",
                  priority: "Média",
                  status: "Pendente"
                }
              ]
            },
            {
              id: 4,
              name: "Testes e Homologação",
              duration: "2 meses",
              tasks: [
                {
                  id: 9,
                  title: "Testes de integração e conformidade",
                  description: "Validar funcionamento do sistema e conformidade com legislação",
                  responsible: "Equipe Fiscal + TI",
                  deadline: "300 dias",
                  priority: "Alta",
                  status: "Pendente"
                },
                {
                  id: 10,
                  title: "Homologação com órgãos fiscais",
                  description: "Submeter sistema para homologação junto aos órgãos competentes",
                  responsible: "Consultoria + Fiscal",
                  deadline: "330 dias",
                  priority: "Alta",
                  status: "Pendente"
                },
                {
                  id: 11,
                  title: "Go-live e acompanhamento inicial",
                  description: "Colocar sistema em produção e acompanhar primeiros meses de operação",
                  responsible: "Todos",
                  deadline: "365 dias",
                  priority: "Alta",
                  status: "Pendente"
                }
              ]
            }
          ],
          risks: [
            {
              description: "Atraso na entrega do sistema fiscal",
              mitigation: "Incluir cláusulas de SLA no contrato com fornecedor",
              probability: "Média",
              impact: "Alto"
            },
            {
              description: "Resistência da equipe às mudanças",
              mitigation: "Programa de gestão de mudanças e comunicação contínua",
              probability: "Baixa",
              impact: "Médio"
            }
          ],
          budget: {
            total: "R$ 300.000,00",
            breakdown: [
              { item: "Consultoria especializada", value: "R$ 80.000,00" },
              { item: "Sistema fiscal integrado", value: "R$ 150.000,00" },
              { item: "Treinamentos", value: "R$ 40.000,00" },
              { item: "Contingência (10%)", value: "R$ 30.000,00" }
            ]
          }
        })
      },
      finish_reason: "stop"
    }
  ],
  usage: {
    prompt_tokens: 800,
    completion_tokens: 1500,
    total_tokens: 2300
  }
};

/**
 * Função helper para criar mock de invokeLLM
 * Retorna diferentes respostas baseadas no conteúdo da mensagem
 */
export function createMockInvokeLLM() {
  return async (params: InvokeParams): Promise<InvokeResult> => {
    const lastMessage = params.messages[params.messages.length - 1];
    const content = typeof lastMessage.content === 'string' 
      ? lastMessage.content 
      : JSON.stringify(lastMessage.content);

    // Detectar tipo de requisição baseado no conteúdo
    if (content.includes("perguntas") || content.includes("questions") || content.includes("assessment")) {
      console.log("[MOCK LLM] Retornando perguntas dinâmicas mockadas");
      return mockQuestionsResponse;
    }

    if (content.includes("briefing") || content.includes("levantamento") || content.includes("gaps")) {
      console.log("[MOCK LLM] Retornando briefing mockado");
      return mockBriefingResponse;
    }

    if (content.includes("plano de ação") || content.includes("action plan") || content.includes("tarefas")) {
      console.log("[MOCK LLM] Retornando plano de ação mockado");
      return mockActionPlanResponse;
    }

    // Resposta genérica para outros casos
    console.log("[MOCK LLM] Retornando resposta genérica");
    return {
      id: "mock-generic-999",
      created: Date.now(),
      model: "gemini-2.5-flash",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: JSON.stringify({ result: "Mock response" })
          },
          finish_reason: "stop"
        }
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      }
    };
  };
}
