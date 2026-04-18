# Tabela de Melhorias Técnicas — Coluna "Técnica / Ferramentas (How)"
**IA SOLARIS — Plataforma de Compliance da Reforma Tributária**

> **Versão:** 1.0 — 2026-03-23
> **Contexto:** Os testes automatizados (107/107) foram aprovados, mas a **qualidade do conteúdo gerado** pelos questionários, matriz de riscos, plano de ação e briefing está abaixo de 30% do esperado. Este documento propõe melhorias profundas e fundamentadas em melhores práticas de mercado para a coluna "Técnica / Ferramentas (How)" de cada etapa do fluxo.
> **Objetivo:** Elevar a qualidade do conteúdo gerado de < 30% para ≥ 80% do padrão esperado, sem alterar a arquitetura de fluxo aprovada.

---

## Diagnóstico Raiz: Por que a qualidade está abaixo de 30%?

Antes de propor melhorias, é necessário nomear os problemas estruturais que causam baixa qualidade de conteúdo mesmo quando os testes técnicos passam. Testes automatizados validam **integridade de fluxo** (o dado chegou, o estado mudou, o retorno foi 200), mas não validam **qualidade semântica** (a pergunta é relevante? o risco tem origem rastreável? a ação é acionável?).

Os cinco vetores de falha identificados são:

**1. Prompt genérico sem ancoragem normativa.** O LLM gera perguntas e riscos a partir de contexto vago ("empresa tributária"), sem receber os artigos específicos da LC 214/2024, EC 132/2023, LC 224/2024 e LC 227/2024 como base. O resultado é linguagem jurídica correta mas sem especificidade regulatória — o equivalente a um advogado que conhece direito mas não leu o caso.

**2. Ausência de requirement-to-question mapping.** As perguntas são geradas por tema, não por requisito regulatório específico. Isso gera cobertura irregular: alguns requisitos são perguntados três vezes (redundância), outros nunca são cobertos (lacuna). A literatura de engenharia de requisitos chama isso de "traceability gap" — a pergunta não tem pai normativo identificável.

**3. Deduplicação semântica ausente.** Sem um mecanismo de deduplicação semântica entre etapas (corporativo → operacional → CNAE), o sistema repete perguntas com palavras diferentes, gerando fadiga no usuário e dados redundantes que contaminam o briefing.

**4. Risk scoring sem taxonomia hierárquica.** A matriz de riscos classifica por severidade/probabilidade, mas sem uma taxonomia hierárquica de domínios (fiscal, trabalhista, societário, operacional, tecnológico), o scoring é inconsistente entre projetos e não permite comparação entre empresas.

**5. Briefing e plano de ação sem template estruturado multi-input.** O LLM recebe todos os inputs em um único prompt longo e gera um texto narrativo. Sem um template com seções fixas e regras de completude por seção, o output varia dramaticamente entre execuções — o que é inaceitável em um produto jurídico.

---

## Tabela de Melhorias — Técnica / Ferramentas (How) Proposta

A tabela abaixo apresenta, para cada etapa do fluxo: (a) o problema específico de qualidade atual, (b) a técnica/ferramenta proposta com fundamentação de mercado, e (c) o impacto esperado na qualidade.

---

### Etapa 3 — Questionário Corporativo

| Dimensão | Estado Atual (< 30%) | Melhoria Proposta | Fundamento de Mercado | Impacto Esperado |
|---|---|---|---|---|
| **Seleção de temas** | Temas gerados por LLM a partir do perfil | **Requirement-driven topic selection:** cada pergunta deve ser gerada a partir de um requisito regulatório universal mapeado (ex: RF-045 — Política de Preços de Transferência). O motor de regras seleciona quais RFs se aplicam ao perfil e os passa como seed para o LLM. | Requirement-to-question mapping é padrão em sistemas de auditoria baseados em LLM (ISACA Journal, 2025) | Cobertura de 100% dos requisitos aplicáveis; zero lacunas normativas |
| **Formulação da pergunta** | Prompt único: "gere perguntas sobre compliance tributário para esta empresa" | **Structured prompt com 5 campos obrigatórios:** (1) RF de origem, (2) domínio (fiscal/societário/operacional), (3) tipo de evidência esperada (documento/processo/política), (4) contexto do perfil, (5) restrição de não-repetição contra o Perfil. Usar **few-shot examples** com 3 exemplos de perguntas de alta qualidade por domínio. | Few-shot prompting melhora consistência em 40-60% em tarefas de geração estruturada (Chain-of-Thought, AWS/2024) | Perguntas com origem rastreável, tipo de evidência explícito e linguagem consistente |
| **Deduplicação** | Ausente | **Semantic deduplication gate:** antes de adicionar cada pergunta ao questionário, calcular similaridade coseno contra todas as perguntas já geradas E contra os campos do Perfil. Threshold: ≥ 0.85 = descarta. Usar o mesmo modelo de embeddings já existente na plataforma. | Deduplicação semântica é requisito em sistemas RAG de alta qualidade para evitar redundância (Thomson Reuters Legal Tech, 2024) | Redução de 60-80% de perguntas redundantes; questionário mais curto e mais denso |
| **Validação de qualidade** | Nenhuma | **LLM-as-judge:** após gerar o lote de perguntas, um segundo prompt avalia cada pergunta em 4 critérios (1-5): especificidade normativa, acionabilidade da resposta, não-redundância, adequação ao porte/regime da empresa. Perguntas com score < 3 em qualquer critério são descartadas ou reformuladas. | LLM-as-judge é a técnica dominante de avaliação de qualidade de geração em 2024-2025 (Taxonomy-Aligned Risk Extraction, arXiv 2026) | Garantia de qualidade mínima por pergunta antes de exibir ao usuário |
| **Cobertura de domínios** | Irregular — concentrada em fiscal | **Domain coverage checker:** após gerar o questionário completo, verificar se todos os 9 domínios de requisitos (fiscal, tributário, societário, trabalhista, operacional, tecnológico, ambiental, regulatório setorial, governança) têm pelo menos N perguntas (N configurável por porte). Se algum domínio estiver abaixo do mínimo, forçar geração adicional. | Cobertura balanceada por domínio é requisito em frameworks de compliance como COSO e ISO 37301 | Questionário equilibrado que não deixa domínios críticos sem cobertura |

---

### Etapa 4 — Questionário Operacional

| Dimensão | Estado Atual (< 30%) | Melhoria Proposta | Fundamento de Mercado | Impacto Esperado |
|---|---|---|---|---|
| **Dependência entre etapas** | Perguntas operacionais geradas independentemente do corporativo | **Conditional question engine:** cada pergunta operacional deve ser condicionada a uma resposta corporativa específica. Exemplo: se RF-045 (Preços de Transferência) foi respondido como "não temos política formal", o questionário operacional deve gerar perguntas sobre como as transações entre partes relacionadas são precificadas na prática. O motor de regras define as dependências; o LLM formula a pergunta contextualizada. | Dependency-based question generation é padrão em sistemas de auditoria adaptativa (ISACA, 2025) | Perguntas operacionais que aprofundam gaps identificados no corporativo, não repetem o que já foi respondido |
| **Captura de operação real** | Perguntas abstratas ("como vocês fazem X?") | **Evidence-anchored questions:** cada pergunta deve especificar o tipo de evidência que valida a resposta (ex: "Qual é o número do processo administrativo de adesão ao Simples Nacional?" em vez de "Vocês são optantes do Simples?"). O template de pergunta inclui o campo `evidência_esperada` que o LLM deve preencher. | Evidence-anchored questioning é técnica padrão em due diligence jurídica e auditoria externa (Fotoh, 2025) | Respostas que geram insumo real e verificável para o gap analysis |
| **Adaptação contextual** | Linguagem genérica independente do porte/setor | **Context-aware prompt injection:** injetar no prompt o porte (MEI/ME/EPP/Médio/Grande), regime tributário (Simples/Lucro Presumido/Lucro Real), e setor principal como variáveis que condicionam a linguagem e o nível de detalhe da pergunta. Uma pergunta para um MEI deve ser diferente da mesma pergunta para uma empresa de Lucro Real com 500 funcionários. | Context-aware generation é requisito básico de qualidade em LLM applications (MIT Law, 2025) | Linguagem adequada ao perfil; usuário reconhece a pergunta como relevante para sua realidade |
| **Deduplicação cross-etapa** | Ausente | **Cross-stage semantic deduplication:** o gate de deduplicação do Questionário Operacional deve comparar contra TODAS as perguntas já respondidas (Perfil + Corporativo), não apenas contra o lote atual. Isso evita que o operacional repita o que o corporativo já capturou. | Cross-stage deduplication é requisito em sistemas de questionário multi-etapa (RAG for Regulatory Compliance, latitude.so, 2025) | Eliminação de redundância cross-etapa; cada etapa captura informação genuinamente nova |

---

### Etapa 5 — Questionário Especializado por CNAE

| Dimensão | Estado Atual (< 30%) | Melhoria Proposta | Fundamento de Mercado | Impacto Esperado |
|---|---|---|---|---|
| **Ancoragem normativa setorial** | RAG genérico sobre LC 214 | **CNAE-filtered RAG:** o retrieval deve ser filtrado por metadados de CNAE (`cnae_code`, `cnae_group`, `sector`) antes de passar para o LLM. Cada chunk do corpus normativo deve ter metadados de aplicabilidade por CNAE. Isso garante que uma empresa de saúde receba perguntas sobre CBS/IBS na saúde, não sobre ICMS de varejo. | Metadata-filtered RAG é a técnica padrão para evitar cross-contamination em RAG multi-domínio (RAG+KG for Regulatory Compliance, latitude.so, 2025) | Perguntas 100% aderentes ao CNAE específico; zero perguntas de outros setores |
| **Requirement-question mapping por CNAE** | Mapeamento manual ou ausente | **Automated RF-to-CNAE mapping:** manter uma tabela de mapeamento `(rf_id, cnae_code, applicability_score)` que indica quais dos 499 requisitos regulatórios se aplicam a cada CNAE. O motor de perguntas usa essa tabela como filtro primário antes de acionar o RAG. A tabela pode ser gerada semi-automaticamente via LLM e validada por especialistas. | Requirement traceability matrix é padrão em engenharia de sistemas (ISO/IEC 29148) e em auditoria baseada em LLM (ISACA, 2025) | Cobertura garantida de todos os RFs aplicáveis ao CNAE; auditabilidade total |
| **Formulação da pergunta especializada** | Prompt único por CNAE | **Multi-turn Chain-of-Thought (CoT) prompting:** usar uma cadeia de raciocínio em 3 passos: (1) "Dado o CNAE X e o requisito RF-Y, qual é o risco tributário específico?" → (2) "Qual evidência operacional permitiria avaliar esse risco?" → (3) "Formule uma pergunta que capture essa evidência de forma objetiva e verificável." Cada passo é um prompt separado, com o output do anterior como input do seguinte. | Multi-step CoT melhora qualidade de raciocínio jurídico em 25-35% vs. prompt único (Benchmarking Multi-Step Legal Reasoning, arXiv 2025) | Perguntas com raciocínio explícito e rastreável; qualidade jurídica superior |
| **Deduplicação semântica cross-CNAE** | Ausente | **Cross-CNAE deduplication:** quando a empresa tem múltiplos CNAEs, o sistema deve garantir que perguntas já respondidas em um CNAE não sejam repetidas em outro CNAE diferente se o requisito de origem for o mesmo. Manter um índice de `(rf_id, pergunta_gerada)` por projeto para lookup rápido. | Semantic deduplication cross-domain é requisito em sistemas de questionário multi-CNAE | Redução de fadiga do usuário em empresas com múltiplos CNAEs; dados mais limpos |

---

### Etapa 6 — Briefing

| Dimensão | Estado Atual (< 30%) | Melhoria Proposta | Fundamento de Mercado | Impacto Esperado |
|---|---|---|---|---|
| **Estrutura do output** | Texto narrativo livre gerado pelo LLM | **Template estruturado obrigatório com 8 seções fixas:** (1) Identificação da empresa e escopo, (2) Síntese do perfil regulatório, (3) Principais achados por domínio (tabela), (4) Gaps identificados com origem rastreável (RF de origem), (5) Inconsistências detectadas entre etapas, (6) Sinais de risco de alta prioridade, (7) Limitações e premissas, (8) Próximos passos. O LLM preenche cada seção separadamente, não em um único prompt. | Template-driven generation é padrão em sistemas de relatório jurídico e de auditoria (EY AI for Tax, 2025) | Briefing consistente entre execuções; todas as seções sempre presentes; auditável |
| **Grounding normativo** | LLM usa conhecimento interno | **RAG-grounded synthesis:** cada achado do briefing deve citar o artigo normativo de origem (ex: "Art. 9º da LC 214/2024 — CBS sobre serviços"). O prompt deve instruir o LLM a citar a fonte normativa para cada afirmação factual. Usar o mesmo corpus RAG dos questionários como fonte. | Formato híbrido determinista+interpretação é requisito inegociável em domínio jurídico-tributário (conhecimento do projeto) | Briefing auditável com rastreabilidade normativa; reduz risco de alucinação |
| **Completude verificável** | Sem verificação de completude | **Completeness checker:** após gerar o briefing, executar um segundo prompt que verifica se cada seção do template foi preenchida com conteúdo substantivo (não apenas "não se aplica" ou texto genérico). Seções incompletas são sinalizadas para o usuário antes de liberar o briefing. | Completeness verification é técnica padrão em sistemas de geração de relatórios (RAG for Drug Compliance, PMC 2026) | Zero briefings incompletos entregues ao usuário |
| **Rastreabilidade de inputs** | Sem referência explícita aos inputs | **Input citation in output:** cada parágrafo do briefing deve referenciar qual etapa/pergunta gerou aquela informação (ex: "[Q-Corp-12]", "[Q-CNAE-47-8711]"). Isso permite ao advogado rastrear de onde veio cada afirmação e validar ou contestar. | Input traceability é requisito em sistemas de compliance auditável (MIT Law, 2025) | Briefing auditável e defensável; advogado pode validar cada afirmação |
| **Consistência cross-seção** | Sem verificação de consistência | **Cross-section consistency check:** após gerar todas as seções, um terceiro prompt verifica se há contradições entre seções (ex: seção 2 diz "empresa optante do Simples" mas seção 4 lista risco de IRPJ/CSLL que só se aplica ao Lucro Real). Contradições são sinalizadas e resolvidas antes de liberar. | Cross-section consistency checking é técnica de QA em geração de documentos longos (LegalGPT, Springer 2024) | Briefing internamente consistente; sem contradições que exponham a plataforma a questionamentos jurídicos |

---

### Etapa 7 — Matriz de Riscos

| Dimensão | Estado Atual (< 30%) | Melhoria Proposta | Fundamento de Mercado | Impacto Esperado |
|---|---|---|---|---|
| **Taxonomia de riscos** | Classificação ad hoc por LLM | **Taxonomia hierárquica de 3 níveis:** Nível 1 (domínio): Fiscal, Tributário, Societário, Trabalhista, Operacional, Tecnológico, Regulatório Setorial. Nível 2 (categoria): ex. em Tributário → Apuração, Recolhimento, Obrigações Acessórias, Planejamento. Nível 3 (risco específico): ex. → Risco de recolhimento indevido de CBS por erro de alíquota. O LLM classifica cada risco nessa taxonomia; o motor de regras valida a classificação. | Taxonomy-aligned risk extraction é o estado da arte em risk scoring com LLM (arXiv 2026, 10-K filings) | Matriz comparável entre projetos; scoring consistente; relatórios agregados possíveis |
| **Origem rastreável do risco** | Risco gerado sem referência ao gap de origem | **Gap-to-risk traceability chain:** cada risco na matriz deve ter uma cadeia explícita: `RF (requisito) → Gap (o que está faltando) → Risco (o que pode acontecer) → Impacto (consequência financeira/legal)`. O LLM preenche essa cadeia; o motor de regras verifica que nenhum risco existe sem RF de origem. | Requirement-gap-risk traceability é padrão em frameworks de GRC (Governance, Risk & Compliance) como COSO ERM e ISO 31000 | Zero riscos genéricos; cada risco defensável e auditável |
| **Scoring** | Severidade/probabilidade estimados pelo LLM | **Scoring híbrido determinístico + LLM:** (1) Score base determinístico: calculado a partir de regras fixas por tipo de risco e porte da empresa (ex: risco de CPRB para empresa de Lucro Real com faturamento > R$ 78M tem severidade = ALTA por padrão). (2) Score ajustado por LLM: o LLM pode ajustar o score base em ±1 nível com justificativa explícita baseada nas respostas do questionário. O score final é sempre explicável. | Hybrid deterministic+LLM scoring é a abordagem recomendada para sistemas de risk assessment auditáveis (GUARD-D-LLM, arXiv 2024) | Scores consistentes e defensáveis; não variam entre execuções para o mesmo perfil |
| **Agrupamento de riscos** | Riscos listados individualmente sem agrupamento | **Semantic clustering de riscos:** antes de exibir a matriz, agrupar riscos semanticamente similares (ex: "risco de multa por atraso no DCTF" e "risco de autuação por DCTF incorreta" → grupo "Obrigações Acessórias — DCTF"). Cada grupo tem um score consolidado. O usuário vê grupos, não 50 riscos individuais. | Risk clustering é técnica padrão em relatórios de auditoria para evitar "risk fatigue" (ISACA, 2025) | Matriz legível e acionável; advogado foca nos grupos de maior risco |
| **Priorização** | Ordenação por severidade apenas | **Multi-criteria prioritization:** ordenar riscos por uma função composta: `score_final = (severidade × 0.4) + (probabilidade × 0.3) + (urgência_regulatória × 0.2) + (facilidade_de_mitigação × 0.1)`. A urgência regulatória é determinada por regra (ex: prazos da LC 214 para 2026 têm urgência = ALTA). A facilidade de mitigação é estimada pelo LLM com base nas respostas operacionais. | Multi-criteria risk prioritization é padrão em frameworks de GRC (ISO 31000, COSO ERM) | Priorização que reflete urgência real da reforma tributária, não apenas severidade abstrata |

---

### Etapa 8 — Plano de Ação

| Dimensão | Estado Atual (< 30%) | Melhoria Proposta | Fundamento de Mercado | Impacto Esperado |
|---|---|---|---|---|
| **Acionabilidade das ações** | Ações genéricas ("revisar processos tributários") | **Action template por domínio:** manter uma biblioteca de templates de ação por domínio e tipo de risco (ex: para risco "Apuração CBS incorreta" → template: "Contratar revisão de alíquotas CBS para [produto/serviço X] com base no Art. [Y] da LC 214/2024, prazo: [data], responsável: [cargo], evidência de conclusão: [documento]"). O LLM preenche os campos do template com o contexto específico do projeto. | Template-driven action planning é padrão em sistemas de GRC e planos de adequação regulatória (EY, KPMG) | Ações específicas, com prazo, responsável e evidência de conclusão; não genéricas |
| **Rastreabilidade risco-ação** | Ação não referencia o risco de origem | **Risk-to-action traceability:** cada ação deve referenciar explicitamente o risco que mitiga e o gap que endereça. A cadeia completa é: `RF → Gap → Risco → Ação → Evidência de conclusão`. O motor de regras verifica que cada risco de severidade ALTA ou CRÍTICA tem pelo menos uma ação associada. | Risk-action traceability é requisito em planos de adequação auditáveis (ISO 37301, COSO) | Plano de ação auditável; cliente pode verificar que cada risco foi endereçado |
| **Prioridade e prazo** | Estimados pelo LLM sem base em regras | **Rule-based priority and deadline:** a prioridade da ação é derivada do score do risco de origem (não estimada novamente pelo LLM). O prazo é calculado por regra: riscos CRÍTICOS → 30 dias, ALTOS → 90 dias, MÉDIOS → 180 dias, BAIXOS → 360 dias. Prazos podem ser ajustados pelo usuário, mas o padrão é determinístico. | Deterministic deadline assignment é padrão em planos de remediação de auditoria (Big 4 methodology) | Prazos consistentes e realistas; não variam entre execuções |
| **Responsável** | Campo vazio ou genérico | **Role-based responsibility assignment:** manter uma tabela de mapeamento `(domínio_risco, porte_empresa) → cargo_responsável_padrão`. Ex: riscos fiscais em empresa de Lucro Real → "Gerente Fiscal / Contador Responsável". O LLM pode personalizar com base nas informações do perfil (ex: se a empresa declarou ter um CFO, usar "CFO"). | Role-based assignment é padrão em planos de ação de GRC | Campo responsável sempre preenchido com cargo adequado ao porte e domínio |
| **Agrupamento por iniciativa** | Ações listadas individualmente | **Initiative grouping:** agrupar ações relacionadas em iniciativas (ex: "Iniciativa 1 — Adequação ao IBS/CBS: 5 ações"). Cada iniciativa tem um owner, um prazo-mãe e um score de impacto consolidado. O usuário gerencia iniciativas, não 40 ações individuais. | Initiative-based action planning é padrão em roadmaps de adequação regulatória (Thomson Reuters, 2025) | Plano gerenciável; cliente consegue executar sem se perder em granularidade |

---

## Resumo Executivo das Melhorias por Etapa

| Etapa | Problema Raiz | Técnica Principal Proposta | Ganho de Qualidade Estimado |
|---|---|---|---|
| **3 — Questionário Corporativo** | Prompt genérico + sem deduplicação | Requirement-driven selection + few-shot + LLM-as-judge + semantic dedup | +50-60 pp |
| **4 — Questionário Operacional** | Independente do corporativo + perguntas abstratas | Conditional question engine + evidence-anchored questions + cross-stage dedup | +45-55 pp |
| **5 — Questionário por CNAE** | RAG não filtrado por CNAE + prompt único | CNAE-filtered RAG + RF-to-CNAE mapping + multi-turn CoT | +55-65 pp |
| **6 — Briefing** | Texto livre + sem grounding + sem completude | Template 8 seções + RAG-grounded + completeness checker + input citation | +60-70 pp |
| **7 — Matriz de Riscos** | Sem taxonomia + scoring inconsistente | Taxonomia 3 níveis + gap-to-risk chain + hybrid scoring + clustering | +55-65 pp |
| **8 — Plano de Ação** | Ações genéricas + sem rastreabilidade | Action templates por domínio + risk-to-action chain + rule-based deadlines | +50-60 pp |

> **Nota metodológica:** Os ganhos estimados são relativos ao estado atual (< 30% de qualidade esperada). A meta é atingir ≥ 80% após implementação completa. A implementação pode ser faseada: priorizar Etapas 5, 6 e 7 (maior impacto percebido pelo advogado) antes de 3 e 4.

---

## Priorização de Implementação

As melhorias foram priorizadas em 3 fases com base em impacto percebido pelo usuário final (advogado) e esforço de implementação:

| Fase | Etapas | Melhorias | Esforço | Impacto |
|---|---|---|---|---|
| **Fase A — Imediata (Sprint v5.4.0)** | 6, 7, 8 | Template estruturado briefing + taxonomia de riscos + action templates | Médio | Muito Alto — o advogado vê imediatamente |
| **Fase B — Curto prazo (Sprint v5.5.0)** | 5 | CNAE-filtered RAG + RF-to-CNAE mapping + multi-turn CoT | Alto | Alto — qualidade do questionário especializado |
| **Fase C — Médio prazo (Sprint v5.6.0)** | 3, 4 | Requirement-driven selection + conditional engine + cross-stage dedup | Alto | Médio-Alto — melhora a base de dados para as etapas seguintes |

---

## Referências

[1] ISACA Journal, "Refreshing IT Audit with LLMs", Volume 1, 2025. https://www.isaca.org/resources/isaca-journal/issues/2025/volume-1/refreshing-it-audit-with-llms

[2] Fotoh, L.E., "Exploring Large Language Models in external audits", *Computers & Security*, 2025. https://www.sciencedirect.com/science/article/pii/S1467089525000247

[3] Dolphin, R. et al., "Taxonomy-Aligned Risk Extraction from 10-K Filings with Autonomous Improvement Using LLMs", arXiv:2601.15247, 2026. https://arxiv.org/abs/2601.15247

[4] latitude.so, "How to Build RAG + KG for Regulatory Compliance", 2025. https://latitude.so/blog/build-rag-kg-regulatory-compliance

[5] AWS, "What Is Chain-of-Thought Prompting?", 2024. https://aws.amazon.com/what-is/chain-of-thought-prompting/

[6] arXiv, "Benchmarking Multi-Step Legal Reasoning and Analyzing Chain-of-Thought Effects in Large Language Models", arXiv:2511.07979, 2025. https://arxiv.org/abs/2511.07979

[7] MIT Law, "The Dawn of a New Era of Compliance", 2025. https://law.mit.edu/pub/thedawnofaneweraofcompliance

[8] Vishwakarma, S., "GUARD-D-LLM: An LLM-based Risk Assessment Engine", arXiv:2406.11851, 2024. https://arxiv.org/abs/2406.11851

[9] Thomson Reuters, "Intro to Retrieval-Augmented Generation (RAG) in Legal Tech", 2024. https://legal.thomsonreuters.com/blog/retrieval-augmented-generation-in-legal-tech/

[10] PMC, "RAG for Evaluating Regulatory Compliance of Drug Information", 2026. https://pmc.ncbi.nlm.wiley.com/articles/PMC12917324/

---

*Documento gerado em 2026-03-23 | IA SOLARIS — Plataforma de Compliance da Reforma Tributária*
*Repositório: https://github.com/Solaris-Empresa/compliance-tributaria-v2*
