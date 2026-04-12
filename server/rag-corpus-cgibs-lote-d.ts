/**
 * RAG Corpus — Lote D: Resoluções CGIBS nº 1, 2 e 3/2026
 *
 * Fonte oficial: https://www.cgibs.gov.br/resolucoes
 * Ingestão: node server/rag-ingest-cgibs.mjs
 *
 * Flags de rastreabilidade:
 *   vigente: true  → dispositivo já em vigor
 *   dependente_regulamentacao: false → não aguarda regulamentação adicional
 *
 * Nota: As 3 resoluções tratam da estruturação interna do CGIBS (comissões,
 * eleição da presidência, representação judicial). NÃO contêm obrigações
 * tributárias diretas para contribuintes — são normas de governança do órgão.
 */

export interface CgibsCorpusEntry {
  lei: "resolucao_cgibs_1" | "resolucao_cgibs_2" | "resolucao_cgibs_3";
  anchor_id: string;
  artigo: string;
  titulo: string;
  conteudo: string;
  topicos: string[];
  cnaeGroups: string[];
  vigente: boolean;
  dependente_regulamentacao: boolean;
  data_publicacao: string; // ISO 8601
  url_oficial: string;
}

export const cgibsLoteD: CgibsCorpusEntry[] = [
  // ─── RESOLUÇÃO Nº 1 ─────────────────────────────────────────────────────────
  {
    lei: "resolucao_cgibs_1",
    anchor_id: "resolucao_cgibs_1_art1",
    artigo: "Art. 1º",
    titulo: "Resolução CGIBS nº 1/2026 — Comissões de Trabalho (Art. 1º)",
    conteudo: `RESOLUÇÃO Nº 1, DE 23 DE FEVEREIRO DE 2026 — Institui Comissões de Trabalho de caráter transitório no âmbito do Comitê Gestor do Imposto sobre Bens e Serviços – CGIBS, define suas competências, estabelece regras de funcionamento e dá outras providências.

Art. 1º Ficam instituídas, no âmbito do CGIBS, em caráter transitório, as seguintes Comissões de Trabalho:
I – Comissão de Trabalho Administrativo – CT-ADM;
II – Comissão de Trabalho Jurídico – CT-JUR;
III – Comissão de Trabalho do Regimento Interno – CT-REG;
IV – Comissão de Trabalho do Regulamento do IBS – CT-RIBS;
V – Comissão de Trabalho Operacional – CT-OPE; e,
VI – Comissão de Trabalho do Tesouro – CT-TES.

§ 1º As Comissões de Trabalho terão natureza técnico-preparatória e destinam-se a assessorar a Presidência e o Conselho Superior na fase de instalação do CGIBS.
§ 2º As Comissões de Trabalho serão automaticamente extintas com a efetiva instalação das Diretorias permanentes previstas na Lei Complementar nº 227, de 2026.
§ 3º A supervisão das Comissões de Trabalho é atribuição da presidência do CGIBS, nos termos do artigo 12, II, da Lei Complementar nº 227, de 2026.`,
    topicos: ["CGIBS", "comissões de trabalho", "estruturação", "IBS", "LC 227/2026"],
    cnaeGroups: [],
    vigente: true,
    dependente_regulamentacao: false,
    data_publicacao: "2026-02-23",
    url_oficial: "https://www.cgibs.gov.br/upload/arquivos/202602/27102250-resoluc-a-o-csibs-n-1-de-23-de-fevereiro-de-2026-assinatura.pdf",
  },
  {
    lei: "resolucao_cgibs_1",
    anchor_id: "resolucao_cgibs_1_art2_funcionamento",
    artigo: "Art. 2º",
    titulo: "Resolução CGIBS nº 1/2026 — Regras de Funcionamento das Comissões (Art. 2º)",
    conteudo: `Art. 2º As Comissões de Trabalho observarão, no exercício de suas atribuições, as seguintes regras de funcionamento e governança:
I – as reuniões serão convocadas por qualquer dos Coordenadores, preferencialmente com antecedência mínima de 48 (quarenta e oito) horas, mediante encaminhamento de pauta e, quando possível, dos documentos de suporte;
II – as reuniões somente se instalarão com a presença de ao menos um Coordenador e metade dos membros técnicos designados, admitida reunião conjunta entre Comissões quando a matéria assim exigir;
III – será obrigatória a lavratura de ata das reuniões, contendo registro de presenças, síntese objetiva dos debates, encaminhamentos definidos, responsáveis designados e, quando houver, registro fundamentado de posicionamentos divergentes;
IV – as propostas, minutas e notas técnicas elaboradas deverão conter identificação da Comissão responsável, data, versão e indicação de eventual divergência técnica, assegurada a rastreabilidade documental;
V – as Comissões não possuem competência deliberativa ou normativa, sendo-lhes vedada a criação, implementação ou imposição de obrigações acessórias, padrões operacionais vinculantes ou quaisquer atos que produzam efeitos externos;
VI – a interlocução técnico-institucional com a Secretaria Especial da Receita Federal do Brasil ou com outros órgãos será realizada por intermédio dos Coordenadores;
VII – as Comissões deverão, quando da instalação das Diretorias permanentes, apresentar relatório final circunstanciado e promover a entrega formal e documentada de seu acervo técnico e administrativo.`,
    topicos: ["CGIBS", "governança", "comissões de trabalho", "regras de funcionamento"],
    cnaeGroups: [],
    vigente: true,
    dependente_regulamentacao: false,
    data_publicacao: "2026-02-23",
    url_oficial: "https://www.cgibs.gov.br/upload/arquivos/202602/27102250-resoluc-a-o-csibs-n-1-de-23-de-fevereiro-de-2026-assinatura.pdf",
  },
  {
    lei: "resolucao_cgibs_1",
    anchor_id: "resolucao_cgibs_1_art3_8_competencias",
    artigo: "Arts. 3º–8º",
    titulo: "Resolução CGIBS nº 1/2026 — Competências das Comissões CT-ADM, CT-JUR, CT-REG, CT-RIBS, CT-OPE, CT-TES (Arts. 3º–8º)",
    conteudo: `Art. 3º Compete à CT-ADM: assessorar a Presidência na organização e funcionamento inicial do Conselho Superior; organizar e secretariar as reuniões; preparar documentação técnica e administrativa; coordenar a comunicação institucional; elaborar propostas de atos destinados à disponibilização temporária de pessoal e recursos pelos entes federativos; propor medidas administrativas provisórias necessárias à estruturação e ao funcionamento inicial do CGIBS.

Art. 4º Compete à CT-JUR: prestar consultoria e assessoramento jurídico à Presidência e ao Conselho Superior; emitir pareceres jurídicos sobre matérias relacionadas ao CGIBS; apoiar a elaboração de minutas de atos administrativos e normativos.

Art. 5º Compete à CT-REG: elaborar minuta de Regimento Interno Procedimental (temporário) e minuta de Regimento Interno Estrutural (definitivo); consolidar estudos técnicos sobre organização e funcionamento dos órgãos previstos na LC 227/2026.

Art. 6º Compete à CT-RIBS: elaborar proposta de regulamento único do IBS (art. 11, II, LC 227/2026); consolidar estudos técnicos para uniformização da interpretação e aplicação da legislação do IBS; promover interlocução técnica com a Receita Federal para elaboração do regulamento comum IBS/CBS.

Art. 7º Compete à CT-OPE: planejar a infraestrutura tecnológica e TIC do CGIBS; coordenar a implantação inicial de sistemas e processos relacionados à administração do IBS; propor modelo e padrões operacionais para as soluções do CGIBS; desenvolver proposta e executar sistema piloto de apuração do IBS.

Art. 8º Compete à CT-TES: elaborar minuta de Resolução com proposta orçamentária para 2026; coordenar o desenvolvimento e implantação inicial do sistema de Distribuição do IBS e do SIGEF-CGIBS; coordenar atividades de gestão financeira e preparatórias relativas à contratação de operação de crédito.`,
    topicos: ["CGIBS", "CT-ADM", "CT-JUR", "CT-REG", "CT-RIBS", "CT-OPE", "CT-TES", "regulamento IBS", "IBS/CBS", "SIGEF-CGIBS"],
    cnaeGroups: [],
    vigente: true,
    dependente_regulamentacao: false,
    data_publicacao: "2026-02-23",
    url_oficial: "https://www.cgibs.gov.br/upload/arquivos/202602/27102250-resoluc-a-o-csibs-n-1-de-23-de-fevereiro-de-2026-assinatura.pdf",
  },
  {
    lei: "resolucao_cgibs_1",
    anchor_id: "resolucao_cgibs_1_art9_composicao",
    artigo: "Arts. 9º–11",
    titulo: "Resolução CGIBS nº 1/2026 — Composição, Cronogramas e Prazos (Arts. 9º–11)",
    conteudo: `Art. 9º Cada Comissão de Trabalho será composta por 2 (dois) Coordenadores (1 representante dos Estados/DF e 1 representante dos Municípios/DF) e membros técnicos indicados pelos entes federativos.

Art. 10 Fica autorizada a solicitação temporária de servidores efetivos das administrações tributárias e financeiras, bem como das Procuradorias dos Estados, do Distrito Federal e dos Municípios para atuação nas Comissões de Trabalho.

Art. 11 Prazos obrigatórios das Comissões:
- CT-ADM: plano de organização em 30 dias; relatório consolidado em 60 dias.
- CT-JUR: parecer sobre status do CGIBS até 1º de março de 2026; parecer sobre poder de dirimir casos omissos em 45 dias.
- CT-REG: minuta de Regimento Interno Procedimental até 1º de março de 2026; Regimento Interno Estrutural em 60 dias.
- CT-RIBS: minuta do Regulamento Único do IBS em 45 dias; parte comum IBS/CBS em 45 dias.
- CT-OPE: planejamento operacional em 60 dias; relatório de iniciativas em 15 dias.
- CT-TES: relatório de sistemas em 15 dias; minuta de proposta orçamentária em 30 dias; planejamento de tesouraria em 60 dias.

Art. 12. As comissões não possuem poder deliberativo, restringindo-se à atuação técnica, preparatória e de assessoramento.
Art. 14. Esta Resolução entra em vigor na data de sua publicação (23/02/2026).`,
    topicos: ["CGIBS", "prazos", "cronogramas", "regulamento IBS", "composição das comissões"],
    cnaeGroups: [],
    vigente: true,
    dependente_regulamentacao: false,
    data_publicacao: "2026-02-23",
    url_oficial: "https://www.cgibs.gov.br/upload/arquivos/202602/27102250-resoluc-a-o-csibs-n-1-de-23-de-fevereiro-de-2026-assinatura.pdf",
  },

  // ─── RESOLUÇÃO Nº 2 ─────────────────────────────────────────────────────────
  {
    lei: "resolucao_cgibs_2",
    anchor_id: "resolucao_cgibs_2_art1_eleicao",
    artigo: "Arts. 1º–3º",
    titulo: "Resolução CGIBS nº 2/2026 — Regimento Eleitoral: Eleição do Presidente e Vice-Presidentes (Arts. 1º–3º)",
    conteudo: `RESOLUÇÃO CGIBS Nº 2, DE 10 DE MARÇO DE 2026 — Dispõe sobre o processo de eleição do Presidente e dos Vice-Presidentes do Comitê Gestor do Imposto sobre Bens e Serviços – CGIBS, nos termos das Leis Complementares nº 214, de 16 de janeiro de 2025, e nº 227, de 13 de janeiro de 2026.

Art. 1º O Presidente e os Vice-Presidentes serão eleitos dentre os membros do Conselho Superior, observadas as seguintes etapas:
I - convocação da eleição mediante ato do Presidente em exercício;
II - registro das candidaturas em reunião do CGIBS;
III - realização da votação com voto aberto;
IV - apuração e proclamação do resultado.

§ 1º O Primeiro-Vice-Presidente deve representar esfera federativa diversa da esfera do Presidente. O Segundo-Vice-Presidente deve representar a mesma esfera federativa do presidente.
§ 5º Será considerado eleito o candidato que obtiver a maioria absoluta dos votos dos representantes dos municípios, a maioria absoluta dos votos dos representantes dos estados, e dos votos de representantes de estados e do DF que correspondam a mais de 50% da população do país.

Art. 2º Alternativamente, o Conselho Superior poderá convalidar a eleição do Presidente em exercício, ocorrida em agosto de 2025, para cumprimento do restante do mandato.

Art. 3º Esta Resolução entra em vigor no momento de sua aprovação pelo Conselho Superior, sendo que a publicação no sítio do CGIBS deve ocorrer em até 72 horas após a aprovação. Brasília, 10 de março de 2026. Flávio César Mendes de Oliveira — Presidente do Comitê Gestor do IBS.`,
    topicos: ["CGIBS", "eleição", "presidência", "vice-presidência", "Conselho Superior", "LC 214/2025", "LC 227/2026"],
    cnaeGroups: [],
    vigente: true,
    dependente_regulamentacao: false,
    data_publicacao: "2026-03-10",
    url_oficial: "https://www.cgibs.gov.br/upload/arquivos/202603/11173106-resolucao-cgibs-n-2-de-10-de-marco-de-2026-regimento-eleitoral.pdf",
  },

  // ─── RESOLUÇÃO Nº 3 ─────────────────────────────────────────────────────────
  {
    lei: "resolucao_cgibs_3",
    anchor_id: "resolucao_cgibs_3_art1_alteracao",
    artigo: "Art. 1º",
    titulo: "Resolução CGIBS nº 3/2026 — Altera Resolução nº 1: Representação Judicial da CT-JUR (Art. 1º)",
    conteudo: `RESOLUÇÃO CGIBS Nº 3, DE 10 DE MARÇO DE 2026 — Altera dispositivos da Resolução CGIBS nº 1, de 23 de fevereiro de 2026.

Art. 1º Fica acrescentado à Resolução CGIBS n. 1, de 23 de fevereiro de 2026, o seguinte dispositivo:

Art. 4º (acréscimo de inciso IV):
IV – Exercer a representação judicial e a defesa de agentes públicos do CGIBS, nos termos da Lei Complementar n. 227, de 13 de janeiro de 2026.

Brasília, 10 de março de 2026. Flávio César Mendes de Oliveira — Presidente do Comitê Gestor do IBS.

NOTA: Esta resolução acrescenta à competência da CT-JUR (Comissão de Trabalho Jurídico) a atribuição de exercer a representação judicial e a defesa de agentes públicos do CGIBS, complementando as competências já previstas nos incisos I, II e III do Art. 4º da Resolução nº 1/2026.`,
    topicos: ["CGIBS", "CT-JUR", "representação judicial", "defesa de agentes públicos", "LC 227/2026"],
    cnaeGroups: [],
    vigente: true,
    dependente_regulamentacao: false,
    data_publicacao: "2026-03-10",
    url_oficial: "https://www.cgibs.gov.br/upload/arquivos/202603/11173011-resolucao-cgibs-n-3-de-10-de-marco-de-2026-altera-resolucao-n-1.pdf",
  },
];
