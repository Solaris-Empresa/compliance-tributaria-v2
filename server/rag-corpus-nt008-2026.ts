/**
 * NT 008/2026 — Especificações Técnicas do DANFSe (Documento Auxiliar da NFS-e)
 * Secretaria-Executiva do Comitê Gestor da NFS-e (SE/CGNFS-e) | 05/05/2026
 *
 * Gerado automaticamente por scripts/build-corpus-nt008-2026.ts.
 * Total de entradas: 10 (chunks curados pelo Orquestrador)
 * NÃO editar manualmente — re-gerar via script para preservar determinismo.
 */

import type { CorpusEntry } from './rag-corpus';

export const RAG_CORPUS_NT_008_2026: CorpusEntry[] = [
  {
    lei: "nt_008_2026",
    artigo: "Prazo Crítico 01/07/2026",
    titulo: "Prazo Crítico DANFSe 01/07/2026",
    conteudo: `NT 008/2026 — DANFSe Especificações Técnicas | SE/CGNFS-e | Publicação: 05/05/2026
PRAZO CRÍTICO: A API de geração do DANFSe atual será SUSPENSA em 1º de julho de 2026. A partir desta data, todos os sistemas (emissores, ERP, sistemas fiscais) devem gerar o DANFSe seguindo as especificações desta Nota Técnica.
Novos fatos geradores enquadrados no IBS e CBS que não eram formalizados anteriormente por documento fiscal terão nota técnica específica futuramente.`,
    topicos: "DANFSe, NFS-e, prazo, API, IBS, CBS",
    cnaeGroups: "62,63,69,70,71,72,73,74,75,86,87,88",
    chunkIndex: 0,
  },
  {
    lei: "nt_008_2026",
    artigo: "Definição e Regras Gerais",
    titulo: "Definição Finalidade e Regras Gerais",
    conteudo: `NT 008/2026 — DANFSe Especificações Técnicas | SE/CGNFS-e
DANFSe: representação impressa da NFS-e. Finalidades: facilitar consulta resumida dos dados; auxiliar processos administrativos e financeiros de destinatários não credenciados como emissores.
Papel: qualquer tipo exceto papel jornal. Via única (salvo disposição contrária).
Ambiente de homologação (tpAmb=2): obrigatório exibir "NFS-e SEM VALIDADE JURÍDICA" em vermelho.
Tributos: totais aproximados Lei 12.741/2012 devem constar no campo Informações Complementares.`,
    topicos: "DANFSe, NFS-e, impressão, homologação",
    cnaeGroups: "62,63,69,70,71,72,73,74,75,86,87,88",
    chunkIndex: 1,
  },
  {
    lei: "nt_008_2026",
    artigo: "Estrutura de Campos",
    titulo: "Estrutura de Campos Identificação",
    conteudo: `NT 008/2026 — DANFSe Especificações Técnicas
Chave de Acesso: bloco único de 50 dígitos (sem prefixo "NFS").
Dados Básicos: número da NFS-e, competência, data/hora emissão, número/série/data da DPS, emitente, situação e finalidade.
Prestador/Fornecedor: CNPJ/CPF/NIF, inscrição municipal, razão social, endereço, telefone, e-mail, Simples Nacional.
Tomador/Adquirente: dados de identificação similares ao prestador.
Destinatário da Operação: identificação de quem recebe o serviço se diferente do tomador.
Intermediário: identificação de eventual intermediário da operação.`,
    topicos: "DANFSe, NFS-e, campos, chave de acesso, prestador, tomador",
    cnaeGroups: "62,63,69,70,71,72,73,74,75,86,87,88",
    chunkIndex: 2,
  },
  {
    lei: "nt_008_2026",
    artigo: "Tributação IBS CBS DANFSe",
    titulo: "Tributação IBS CBS no DANFSe",
    conteudo: `NT 008/2026 — DANFSe Especificações Técnicas
Tributação Municipal (ISSQN): tipo de tributação, local de incidência, regime especial, imunidade, suspensão, benefícios, base de cálculo, alíquota e valor do ISSQN retido ou apurado.
Tributação Federal: IRRF, Contribuição Previdenciária, PIS e COFINS débito próprio, retenções de contribuições sociais.
Tributação IBS/CBS: CST, localidade de incidência, exclusões/reduções de BC, alíquotas efetivas e valores apurados para IBS Municipal, IBS Estadual e CBS.
Linha PIS/COFINS: impressa apenas para notas com competência até fim de 2026.`,
    topicos: "DANFSe, NFS-e, ISSQN, IBS, CBS, tributação",
    cnaeGroups: "62,63,69,70,71,72,73,74,75,86,87,88",
    chunkIndex: 3,
  },
  {
    lei: "nt_008_2026",
    artigo: "Valores Totais",
    titulo: "Valores Totais DANFSe",
    conteudo: `NT 008/2026 — DANFSe Especificações Técnicas
Valor da Operação/Serviço, descontos condicionado e incondicionado, total de retenções, valor líquido da NFS-e, total de IBS/CBS, Valor Líquido Final (NFS-e + IBS/CBS).
Campo Valor Líquido Final com sombreamento cinza — destaque obrigatório.`,
    topicos: "DANFSe, NFS-e, valores, IBS, CBS",
    cnaeGroups: "62,63,69,70,71,72,73,74,75,86,87,88",
    chunkIndex: 4,
  },
  {
    lei: "nt_008_2026",
    artigo: "Formatação e Layout",
    titulo: "Formatação Layout e Tipografia",
    conteudo: `NT 008/2026 — DANFSe Especificações Técnicas
Tamanho mínimo: A4 (210x297mm), modo retrato, impressão em página única obrigatória.
Margens: entre 0,15 cm e 0,20 cm em todas as laterais.
Linhas divisórias de blocos: 0,5 ponto. Borda externa da página: 1 ponto.
Sombreamento cinza 5%: cabeçalho, títulos de blocos, campo Emitente e Valor Líquido Final.
Fontes: títulos de blocos Arial 7pt negrito caixa alta; títulos de campos Arial 6pt negrito; conteúdo Microsoft Sans Serif 7pt; cabeçalho DANFSe v2.0 Arial 9pt negrito.`,
    topicos: "DANFSe, NFS-e, layout, formatação, impressão",
    cnaeGroups: "62,63,69,70,71,72,73,74,75,86,87,88",
    chunkIndex: 5,
  },
  {
    lei: "nt_008_2026",
    artigo: "QR Code e Logomarca",
    titulo: "QR Code e Logomarca",
    conteudo: `NT 008/2026 — DANFSe Especificações Técnicas
Logomarca: logo oficial da NFS-e no canto superior esquerdo.
QR Code: dimensões mínimas 1,52x1,52 cm. URL: https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=[CHAVE_DE_ACESSO]. Deve vir acompanhado de texto explicativo sobre autenticidade.`,
    topicos: "DANFSe, NFS-e, QR Code, logomarca",
    cnaeGroups: "62,63,69,70,71,72,73,74,75,86,87,88",
    chunkIndex: 6,
  },
  {
    lei: "nt_008_2026",
    artigo: "Supressões Permitidas",
    titulo: "Supressões e Modificações Permitidas",
    conteudo: `NT 008/2026 — DANFSe Especificações Técnicas
Blocos vazios: se não houver Tomador, Destinatário ou Intermediário identificado, reduzir a uma linha: "[NOME DO BLOCO] NÃO IDENTIFICADO NA NFS-e".
Destinatário = Tomador: substituir bloco por "O DESTINATÁRIO É O PRÓPRIO TOMADOR/ADQUIRENTE DA OPERAÇÃO".
ISSQN sem incidência: exibir "TRIBUTAÇÃO MUNICIPAL (ISSQN) - OPERAÇÃO NÃO SUJEITA AO ISSQN".
Canhoto (data de cientificação/assinatura): opcional. Se suprimido, espaço revertido para Descrição do Serviço ou Informações Complementares.
Campos vazios: preencher com traço (-).`,
    topicos: "DANFSe, NFS-e, supressões, ISSQN",
    cnaeGroups: "62,63,69,70,71,72,73,74,75,86,87,88",
    chunkIndex: 7,
  },
  {
    lei: "nt_008_2026",
    artigo: "Cancelamento e Substituição",
    titulo: "Situações Especiais Cancelamento Substituição",
    conteudo: `NT 008/2026 — DANFSe Especificações Técnicas
Cancelamento: marca d'água "CANCELADA" na diagonal — Arial 50+ pontos, cor cinza K35.
Substituição: marca d'água "SUBSTITUÍDA" no mesmo padrão. Campo Informações Complementares deve informar: "NFS-e Subst.: [CHAVE_DE_ACESSO]".
Obra/Imóvel/Evento nas Informações Complementares: "Cod. Obra:", "Insc. Imob.:", "Cod. Evt.".`,
    topicos: "DANFSe, NFS-e, cancelamento, substituição",
    cnaeGroups: "62,63,69,70,71,72,73,74,75,86,87,88",
    chunkIndex: 8,
  },
  {
    lei: "nt_008_2026",
    artigo: "Campos Técnicos Dimensões",
    titulo: "Tabela de Campos Técnicos",
    conteudo: `NT 008/2026 — DANFSe Especificações Técnicas
Identificação Município: 1,16x5,09 cm. Chave de Acesso: 0,77x15,30 cm (50 dígitos). CNPJ/CPF/NIF Prestador: 0,63x5,09 cm. Descrição do Serviço: 0,63x20,40 cm (até 1300 caracteres, ajustável). BC ISSQN: 0,63x5,09 cm. Valor Total IBS (Mun+Est): 0,63x5,09 cm. Valor Líquido + IBS/CBS: 0,67x5,09 cm (sombreamento cinza).
Limitações de impressora: se margens maiores forem exigidas, reduzir prioritariamente o bloco de Informações Complementares.`,
    topicos: "DANFSe, NFS-e, campos técnicos, dimensões, IBS, CBS",
    cnaeGroups: "62,63,69,70,71,72,73,74,75,86,87,88",
    chunkIndex: 9,
  },
];
