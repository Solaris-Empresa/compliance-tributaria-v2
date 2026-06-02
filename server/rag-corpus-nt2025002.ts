/**
 * NT 2025.002 v1.36 — Adequações NF-e/NFC-e para Reforma Tributária (IBS/CBS/IS)
 * Emenda Constitucional 132/2023 | Lei Complementar 214/2025
 *
 * Gerado automaticamente por scripts/build-corpus-nt2025002-v2.ts.
 * Total de entradas: 12 (chunks curados pelo Orquestrador)
 * NÃO editar manualmente — re-gerar via script para preservar determinismo.
 */

import type { CorpusEntry } from './rag-corpus';

export const RAG_CORPUS_NT_2025_002: CorpusEntry[] = [
  {
    lei: "nt_2025_002",
    artigo: "Cronograma CRT3",
    titulo: "Cronograma Implantação CRT3",
    conteudo: `NT 2025.002 v1.36 — NF-e/NFC-e Reforma Tributária | LC 214/2025 | EC 132/2023
CRT 3 (Regime Normal): julho/2025 homologação facultativo. Outubro/2025 produção facultativo (sem valor jurídico). Janeiro/2026 obrigatório com valor jurídico pleno — RVs aplicadas integralmente.
CRT 1 (Simples Nacional), 2 (Excesso de Sublimite) e 4 (MEI): tributação IBS/CBS/IS inicia apenas em 2027 conforme Art. 348 da LC 214/25. Orientações específicas em NT futura.`,
    topicos: "cronograma, CRT, NF-e, IBS, CBS, Simples Nacional",
    cnaeGroups: "",
    chunkIndex: 0,
  },
  {
    lei: "nt_2025_002",
    artigo: "Alterações Estruturais",
    titulo: "Alterações Estruturais Protocolo",
    conteudo: `NT 2025.002 v1.36 — NF-e/NFC-e Reforma Tributária
cStat expandido para 4 posições (rejeições exclusivas IBS/CBS/IS). nProt pode ter 15 ou 17 posições. cClassTrib: Código de Classificação Tributária do IBS/CBS vinculado a dispositivos da LC 214/2025. DFeTiposBasicos_v1.00.xsd padroniza estrutura de tributação entre NF-e, CT-e e outros documentos fiscais.`,
    topicos: "NF-e, classificação tributária, protocolo, IBS, CBS",
    cnaeGroups: "",
    chunkIndex: 1,
  },
  {
    lei: "nt_2025_002",
    artigo: "finNFe 5 e 6",
    titulo: "Novas Finalidades finNFe 5 e 6",
    conteudo: `NT 2025.002 v1.36 — NF-e/NFC-e Reforma Tributária
finNFe 5 = Nota de Crédito: redução no imposto devido pelo emitente (aumento de crédito para destinatário). Subtipos: multa e juros, crédito presumido ZFM, retorno por recusa, redução de valores, transferência por sucessão.
finNFe 6 = Nota de Débito: aumento no imposto devido pelo emitente (redução de crédito para destinatário). Subtipos: transferência para cooperativas, anulação de crédito imunes/isentas, débitos não processados, multa e juros, sucessão, pagamento antecipado, perda em estoque (roubo/furto/perecimento).
RV B25-80: notas de débito/crédito NÃO podem conter campos de ICMS, IPI, PIS ou COFINS (exceções: retornos e perdas). RV B25-110: Nota de Crédito deve ser de Entrada (tpNF=0). RV B25-120: Nota de Débito deve ser de Saída (tpNF=1).`,
    topicos: "NF-e, nota de crédito, nota de débito, IBS, CBS",
    cnaeGroups: "",
    chunkIndex: 2,
  },
  {
    lei: "nt_2025_002",
    artigo: "Grupo UB BC",
    titulo: "Grupo UB Base de Cálculo IBS CBS",
    conteudo: `NT 2025.002 v1.36 — NF-e/NFC-e Reforma Tributária
vBC (UB16): Base de cálculo IBS/CBS = vProd + vFrete + vSeg + vOutro + vII + vIS - vDesc - PIS/COFINS/ICMS/ISSQN.
IBS Estadual (gIBSUF): alíquota pIBSUF, diferimento pDif/vDif, devolução/cashback vDevTrib, redução pRedAliq, alíquota efetiva pAliqEfet.
IBS Municipal (gIBSMun): estrutura idêntica ao estadual para competência municipal.
CBS (gCBS): alíquota pCBS, diferimento, devolução e redução.
gTribRegular (UB68): tributação sem condições suspensivas (ex: ZFM).`,
    topicos: "base de cálculo, IBS, CBS, alíquota, diferimento, NF-e",
    cnaeGroups: "",
    chunkIndex: 3,
  },
  {
    lei: "nt_2025_002",
    artigo: "Alíquotas Transitórias",
    titulo: "Alíquotas Transitórias IBS CBS 2025-2028",
    conteudo: `NT 2025.002 v1.36 — NF-e/NFC-e Reforma Tributária
UB18-10/UB37-10: IBS (UF e Municipal) = 0,1% e 0% para 2025-2026; 0,05% e 0,05% para 2027-2028.
UB56-10: CBS = 0,9% para 2025-2026. Permite alíquota zero em operações ZFM/ALC.
UB28-10/UB47-10/UB66-10: Alíquota Efetiva deve considerar reduções de alíquota e redutor de compra governamental (pRedutor).
RV VC02-30: notas de débito/crédito só podem referenciar um único documento fiscal (exceto devoluções e débitos não processados).`,
    topicos: "alíquota, IBS, CBS, transição, ZFM, NF-e",
    cnaeGroups: "",
    chunkIndex: 4,
  },
  {
    lei: "nt_2025_002",
    artigo: "Monofásica Combustíveis",
    titulo: "Tributação Monofásica Combustíveis",
    conteudo: `NT 2025.002 v1.36 — NF-e/NFC-e Reforma Tributária
gIBSCBSMono (UB84): grupo específico para operações com combustíveis.
gMonoPadrao: quantidade qBCMono, alíquotas ad rem e valores.
gMonoReten: retenção sobre biocombustíveis na mistura.
gMonoRet: tributação retida anteriormente na cadeia produtiva.
gMonoDif: diferimento monofásico de combustíveis.`,
    topicos: "combustíveis, tributação monofásica, IBS, CBS, NF-e",
    cnaeGroups: "",
    chunkIndex: 5,
  },
  {
    lei: "nt_2025_002",
    artigo: "Crédito Presumido ZFM",
    titulo: "Crédito Presumido e ZFM",
    conteudo: `NT 2025.002 v1.36 — NF-e/NFC-e Reforma Tributária
gCredPresOper (UB120): crédito presumido na operação — aquisição de produtor rural ou transportador autônomo.
gCredPresIBSZFM (UB131): crédito presumido sobre saldo devedor na ZFM conforme Art. 450 LC 214/25.
RV B25.2-30: crédito presumido ZFM (tipo 02) permitido apenas a partir de janeiro/2029.
tpCredPresIBSZFM (I05k): classificação para subapuração do IBS na ZFM — bens de consumo final, capital, intermediários ou informática.`,
    topicos: "crédito presumido, ZFM, IBS, CBS, NF-e",
    cnaeGroups: "",
    chunkIndex: 6,
  },
  {
    lei: "nt_2025_002",
    artigo: "Compras Governamentais",
    titulo: "Compras Governamentais e Campos Novos",
    conteudo: `NT 2025.002 v1.36 — NF-e/NFC-e Reforma Tributária
gCompraGov (B31): tipo de ente (União, Estado, DF, Município) e percentual de redução de alíquota pRedutor.
cMunFGIBS (B12a): município de ocorrência do fato gerador IBS/CBS em operações presenciais fora do estabelecimento.
dPrevEntrega (B10a): data de previsão de entrega ou disponibilização do bem (não aplicável NFC-e).
indBemMovelUsado (I17c): indicador para bens usados adquiridos de não contribuintes ou MEI.`,
    topicos: "compras governamentais, NF-e, IBS, CBS",
    cnaeGroups: "",
    chunkIndex: 7,
  },
  {
    lei: "nt_2025_002",
    artigo: "Eventos Emitente 112110-112150",
    titulo: "Eventos Emitente 112110 a 112150",
    conteudo: `NT 2025.002 v1.36 — NF-e/NFC-e Reforma Tributária — Eventos do Emitente
112110 - Pagamento Integral: informa quitação para liberar crédito presumido ao adquirente.
112120 - Importação ALC/ZFM: informa que importação não se converteu em isenção por descumprimento de requisitos.
112130 - Perda no Transporte (Fornecedor): roubo/perecimento em frete CIF — exige estorno de crédito das aquisições.
112140 - Fornecimento não realizado: pagamento antecipado sem entrega do bem.
112150 - Atualização de Previsão de Entrega: altera dPrevEntrega para ajustar período de apuração do débito.`,
    topicos: "eventos, NF-e, crédito presumido, IBS, CBS",
    cnaeGroups: "",
    chunkIndex: 8,
  },
  {
    lei: "nt_2025_002",
    artigo: "Eventos Destinatário 211110-211150",
    titulo: "Eventos Destinatário 211110 a 211150",
    conteudo: `NT 2025.002 v1.36 — NF-e/NFC-e Reforma Tributária — Eventos do Destinatário
211110 - Solicitação de Crédito Presumido: gerado na aquisição de terceiros com direito a crédito presumido.
211120 - Consumo Pessoal: informa uso pessoal — impede o crédito de IBS/CBS.
211124 - Perda no Transporte (Adquirente): roubo/perecimento em frete FOB.
211128 - Aceite de Débito: concordância com nota de crédito do fornecedor para lançamento em apuração assistida.
211130 - Imobilização de Item: entrada no ativo imobilizado — afeta prazos de ressarcimento.
211140 - Crédito de Combustível: solicitação de crédito por adquirente da cadeia produtiva de combustíveis.
211150 - Crédito por Atividade: bens/serviços cujo crédito depende da atividade do adquirente.`,
    topicos: "eventos, NF-e, crédito, combustíveis, IBS, CBS",
    cnaeGroups: "",
    chunkIndex: 9,
  },
  {
    lei: "nt_2025_002",
    artigo: "Eventos Sucessão e Fisco",
    titulo: "Eventos Sucessão Fisco e Cancelamento",
    conteudo: `NT 2025.002 v1.36 — NF-e/NFC-e Reforma Tributária — Eventos de Sucessão e Fisco
212110/212120: manifestação da sucessora sobre transferência de crédito IBS/CBS.
412120/412130: manifestação do Fisco (deferimento/indeferimento) sobre transferências em sucessão.
110001: cancelamento de qualquer evento da reforma tributária — exige número do protocolo original.`,
    topicos: "eventos, sucessão, fisco, IBS, CBS, NF-e",
    cnaeGroups: "",
    chunkIndex: 10,
  },
  {
    lei: "nt_2025_002",
    artigo: "Obrigações Acessórias 2026",
    titulo: "Obrigações Acessórias e Cumprimento 2026",
    conteudo: `NT 2025.002 v1.36 — NF-e/NFC-e Reforma Tributária
O cumprimento correto das obrigações acessórias (emissão correta + registro de eventos) em 2026 é condição para dispensa do recolhimento do IBS/CBS no período de transição conforme Art. 348 §1º da EC 132/2023.
Tabelas externas dinâmicas no Portal Nacional da NF-e: cClassTrib, CST, NCM do IS e cCredPres — atualizações regulamentares rápidas sem nova NT.
DANFE: alterações para exibição dos novos tributos ainda em estudo — versão futura da NT.`,
    topicos: "obrigações acessórias, NF-e, IBS, CBS, transição",
    cnaeGroups: "",
    chunkIndex: 11,
  },
];
