/**
 * V65 — Script de Ingestão do Corpus RAG
 *
 * Executa uma vez para popular a tabela ragDocuments com os chunks das leis.
 * Uso: node server/rag-ingest.mjs
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

// Corpus inline (duplicado do rag-corpus.ts para evitar dependência de TS)
// Importar diretamente do arquivo compilado não é possível em .mjs sem build
const RAG_CORPUS = [
  {
    lei: "ec132", artigo: "Art. 156-A", titulo: "IBS — Competência e Fato Gerador",
    conteudo: "O Imposto sobre Bens e Serviços (IBS) incidirá sobre operações com bens materiais ou imateriais, inclusive direitos, e com serviços. O IBS será de competência compartilhada entre Estados, Distrito Federal e Municípios. O fato gerador do IBS é a realização de operações com bens e serviços, ainda que iniciadas no exterior. O IBS terá legislação uniforme em todo o território nacional, com alíquota de referência fixada pelo Senado Federal. Cada ente federativo poderá fixar sua alíquota própria dentro dos limites estabelecidos. O IBS substituirá o ICMS (estadual) e o ISS (municipal) no prazo de transição estabelecido pela lei complementar.",
    topicos: "IBS, Imposto sobre Bens e Serviços, ICMS, ISS, fato gerador, operações, bens, serviços, competência, alíquota, transição",
    cnaeGroups: "01,02,03,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88,90,91,92,93,94,95,96",
    chunkIndex: 0,
  },
  {
    lei: "ec132", artigo: "Art. 156-A §1", titulo: "IBS — Não Cumulatividade e Creditamento",
    conteudo: "O IBS será não cumulativo, compensando-se o imposto devido em cada operação com o montante cobrado nas operações anteriores. O contribuinte terá direito ao crédito do IBS incidente nas aquisições de bens e serviços utilizados como insumos na produção de bens ou prestação de serviços tributados. O creditamento será integral e imediato, vedada qualquer restrição não prevista na Constituição. O saldo credor acumulado poderá ser transferido a terceiros ou ressarcido em prazo não superior a 60 dias.",
    topicos: "IBS, não cumulatividade, crédito, creditamento, insumos, saldo credor, ressarcimento, transferência de crédito",
    cnaeGroups: "10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "ec132", artigo: "Art. 149-B", titulo: "CBS — Competência Federal",
    conteudo: "A Contribuição sobre Bens e Serviços (CBS) é de competência da União e incide sobre as mesmas operações do IBS. A CBS substituirá o PIS e a COFINS. A CBS terá legislação uniforme e alíquota fixada em lei federal. O regime de não cumulatividade da CBS é idêntico ao do IBS, garantindo creditamento integral.",
    topicos: "CBS, Contribuição sobre Bens e Serviços, PIS, COFINS, União, alíquota federal, não cumulatividade, Comitê Gestor",
    cnaeGroups: "01,02,03,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88",
    chunkIndex: 0,
  },
  {
    lei: "ec132", artigo: "Art. 153 VIII", titulo: "Imposto Seletivo (IS)",
    conteudo: "O Imposto Seletivo (IS) é de competência da União e incide sobre a produção, extração, comercialização ou importação de bens e serviços prejudiciais à saúde ou ao meio ambiente. O IS não incide sobre exportações. O IS pode incidir sobre: cigarros e derivados do tabaco, bebidas alcoólicas, bebidas açucaradas, veículos automotores, embarcações e aeronaves, bens minerais e combustíveis fósseis.",
    topicos: "IS, Imposto Seletivo, tabaco, bebidas alcoólicas, combustíveis, veículos, extrafiscal, saúde, meio ambiente",
    cnaeGroups: "05,06,07,08,09,10,11,19,20,29,30,35,46,47",
    chunkIndex: 0,
  },
  {
    lei: "ec132", artigo: "Art. 156-A §5", titulo: "IBS — Regimes Diferenciados",
    conteudo: "Lei complementar poderá estabelecer regimes diferenciados de tributação para: serviços financeiros, operações com bens imóveis, planos de assistência à saúde, cooperativas, serviços de hotelaria, serviços de educação, serviços de saúde, transporte público coletivo, profissionais liberais, agronegócio e produtor rural.",
    topicos: "regime diferenciado, serviços financeiros, imóveis, saúde, educação, cooperativas, agronegócio, profissional liberal, hotelaria, transporte, benefício fiscal",
    cnaeGroups: "01,02,03,55,56,85,86,87,88,64,65,66,68,69,70,71,72,73,74,75,49,50,51,52,53",
    chunkIndex: 0,
  },
  {
    lei: "ec132", artigo: "Art. 316-336", titulo: "Período de Transição IBS/CBS",
    conteudo: "O período de transição para o IBS e CBS ocorrerá entre 2026 e 2032, com extinção gradual do ICMS, ISS, PIS e COFINS. Em 2026: CBS a 0,9% e IBS a 0,1% (alíquotas de teste). Em 2027: CBS plena com extinção de PIS/COFINS. Em 2029-2032: redução gradual do ICMS e ISS em 10% ao ano. Em 2033: extinção total do ICMS e ISS.",
    topicos: "transição, 2026, 2027, 2029, 2032, 2033, ICMS extinção, ISS extinção, PIS extinção, COFINS extinção, período transitório",
    cnaeGroups: "01,02,03,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88",
    chunkIndex: 0,
  },
  {
    lei: "lc214", artigo: "Art. 1-10", titulo: "LC 214/2025 — Contribuintes e Regime",
    conteudo: "A LC 214/2025 institui o IBS, a CBS e o IS. Contribuinte é toda pessoa física ou jurídica que realiza operações com bens e serviços de forma habitual. O regime regular aplica-se a contribuintes com receita bruta anual superior a R$ 4,8 milhões. O Simples Nacional terá regras próprias de transição.",
    topicos: "LC 214, contribuinte, pessoa jurídica, Simples Nacional, MEI, microempresa, regime regular, receita bruta",
    cnaeGroups: "01,02,03,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88",
    chunkIndex: 0,
  },
  {
    lei: "lc214", artigo: "Art. 11-25", titulo: "LC 214/2025 — Alíquotas e Base de Cálculo",
    conteudo: "A alíquota padrão estimada do IBS+CBS é de aproximadamente 26,5%. A alíquota reduzida (50% da padrão) aplica-se a: alimentos da cesta básica ampliada, medicamentos, serviços de educação, serviços de saúde, transporte público coletivo, insumos agropecuários. A alíquota zero aplica-se a: cesta básica nacional (25 itens), medicamentos do RENAME.",
    topicos: "alíquota, 26,5%, alíquota reduzida, alíquota zero, cesta básica, medicamentos, educação, saúde, agropecuário",
    cnaeGroups: "01,02,03,10,11,12,46,47,85,86,87,88,49,50,51,52,53",
    chunkIndex: 0,
  },
  {
    lei: "lc214", artigo: "Art. 26-45", titulo: "LC 214/2025 — Crédito e Ressarcimento",
    conteudo: "O contribuinte tem direito ao crédito integral do IBS e CBS incidentes nas aquisições de bens e serviços utilizados na atividade econômica. O crédito é imediato e integral. O saldo credor pode ser: compensado com outros tributos federais (CBS), transferido a fornecedores, ressarcido em até 60 dias. Produtor rural pessoa física tem crédito presumido de 20% sobre as vendas.",
    topicos: "crédito, creditamento, ressarcimento, saldo credor, compensação, transferência de crédito, crédito presumido, produtor rural",
    cnaeGroups: "01,02,03,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "lc214", artigo: "Art. 46-70", titulo: "LC 214/2025 — Split Payment",
    conteudo: "O split payment é o mecanismo de recolhimento automático do IBS e CBS no momento do pagamento da operação. No split payment, o adquirente retém e recolhe o tributo diretamente ao Comitê Gestor e à Receita Federal. O split payment é obrigatório para: pagamentos via cartão de crédito/débito, PIX, transferências bancárias. O prazo de adaptação dos sistemas para split payment é de 12 meses.",
    topicos: "split payment, recolhimento automático, cartão, PIX, NF-e, nota fiscal, Comitê Gestor, fornecedor, adquirente, retenção",
    cnaeGroups: "45,46,47,55,56,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82",
    chunkIndex: 0,
  },
  {
    lei: "lc214", artigo: "Art. 71-95", titulo: "LC 214/2025 — Serviços Financeiros",
    conteudo: "Serviços financeiros têm regime específico no IBS e CBS. Bancos, seguradoras, corretoras e demais instituições financeiras apuram o IBS e CBS pelo método de adição. A alíquota dos serviços financeiros é diferenciada, estimada em 5,88% para o IBS+CBS. Cooperativas de crédito têm alíquota reduzida.",
    topicos: "serviços financeiros, banco, seguradora, IOF, crédito, câmbio, seguro, fundo de investimento, cooperativa de crédito, fintech, método de adição",
    cnaeGroups: "64,65,66",
    chunkIndex: 0,
  },
  {
    lei: "lc214", artigo: "Art. 96-120", titulo: "LC 214/2025 — Imóveis e Construção Civil",
    conteudo: "Operações com bens imóveis têm regime específico. Na venda de imóveis: o IBS e CBS incidem sobre a margem de lucro. Na locação de imóveis: incidência sobre o valor do aluguel. Incorporadoras e construtoras: regime de apuração por unidade imobiliária, com crédito integral dos insumos da construção.",
    topicos: "imóveis, construção civil, incorporadora, construtora, locação, aluguel, loteamento, margem de lucro, unidade imobiliária",
    cnaeGroups: "41,42,43,68",
    chunkIndex: 0,
  },
  {
    lei: "lc214", artigo: "Art. 121-145", titulo: "LC 214/2025 — Saúde e Educação",
    conteudo: "Serviços de saúde têm alíquota reduzida de 60% da alíquota padrão. Planos de saúde têm regime específico com alíquota de 40% da padrão. Medicamentos e dispositivos médicos têm alíquota zero (RENAME) ou reduzida. Serviços de educação têm alíquota reduzida de 60% da padrão: ensino básico, médio, superior, técnico, profissional.",
    topicos: "saúde, educação, hospital, plano de saúde, medicamento, consulta médica, ensino, escola, universidade, alíquota reduzida, RENAME",
    cnaeGroups: "85,86,87,88",
    chunkIndex: 0,
  },
  {
    lei: "lc214", artigo: "Art. 146-170", titulo: "LC 214/2025 — Agronegócio",
    conteudo: "O agronegócio tem regime diferenciado no IBS e CBS. Produtor rural pessoa física: isento de IBS e CBS nas vendas, com crédito presumido de 20% para os adquirentes. Produtor rural pessoa jurídica: contribuinte normal, com alíquota reduzida de 60% da padrão. Insumos agropecuários: alíquota zero para fertilizantes, defensivos, sementes, rações, vacinas veterinárias.",
    topicos: "agronegócio, produtor rural, cooperativa agropecuária, insumos agropecuários, fertilizante, defensivo, semente, ração, exportação, alíquota zero, crédito presumido",
    cnaeGroups: "01,02,03,10,11,12",
    chunkIndex: 0,
  },
  {
    lei: "lc214", artigo: "Art. 171-195", titulo: "LC 214/2025 — Tecnologia e Serviços Digitais",
    conteudo: "Serviços de tecnologia da informação seguem o regime padrão do IBS e CBS. Software como serviço (SaaS), plataformas digitais e aplicativos: incidência normal. Marketplace e plataformas de intermediação: responsabilidade tributária do operador da plataforma pelo IBS e CBS das transações intermediadas.",
    topicos: "tecnologia, TI, software, SaaS, plataforma digital, aplicativo, computação em nuvem, marketplace, streaming, publicidade digital, licenciamento",
    cnaeGroups: "58,59,60,61,62,63",
    chunkIndex: 0,
  },
  {
    lei: "lc214", artigo: "Art. 196-220", titulo: "LC 214/2025 — Comércio e Varejo",
    conteudo: "O comércio varejista e atacadista segue o regime padrão do IBS e CBS. O crédito é integral pelos insumos adquiridos para revenda. Bens do ativo imobilizado: crédito em 12 parcelas mensais. Cashback para pessoas físicas de baixa renda: devolução de parte do IBS e CBS pagos.",
    topicos: "comércio, varejo, atacado, revenda, crédito, ativo imobilizado, devolução, cashback, baixa renda",
    cnaeGroups: "45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "lc214", artigo: "Art. 221-245", titulo: "LC 214/2025 — Profissional Liberal",
    conteudo: "Profissionais liberais (médicos, advogados, contadores, engenheiros, arquitetos, psicólogos) são contribuintes do IBS e CBS no regime padrão. Sociedades profissionais (S/S) têm regime específico: alíquota reduzida de 70% da padrão. Autônomos com receita até R$ 78.000/ano: isentos do IBS e CBS.",
    topicos: "profissional liberal, médico, advogado, contador, engenheiro, arquiteto, psicólogo, sociedade profissional, autônomo, S/S",
    cnaeGroups: "69,70,71,72,73,74,75,86",
    chunkIndex: 0,
  },
  {
    lei: "lc214", artigo: "Art. 246-270", titulo: "LC 214/2025 — Indústria e Manufatura",
    conteudo: "A indústria manufatureira segue o regime padrão do IBS e CBS, com não cumulatividade plena. Insumos industriais: crédito integral do IBS e CBS. Ativo imobilizado industrial: crédito em 12 parcelas mensais. Energia elétrica e combustíveis usados no processo produtivo: crédito integral. O IPI permanece durante a transição. Zona Franca de Manaus: manutenção dos benefícios fiscais por 50 anos.",
    topicos: "indústria, manufatura, insumo industrial, ativo imobilizado, IPI, Zona Franca de Manaus, drawback, exportação, processo produtivo",
    cnaeGroups: "10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33",
    chunkIndex: 0,
  },
  {
    lei: "lc214", artigo: "Art. 271-295", titulo: "LC 214/2025 — Transporte e Logística",
    conteudo: "Serviços de transporte de cargas: regime padrão do IBS e CBS. Transporte público coletivo de passageiros: alíquota zero. Serviços de logística e armazenagem: regime padrão. Combustíveis para transporte: crédito integral. Agências de viagem e turismo: regime específico com alíquota reduzida de 60% da padrão.",
    topicos: "transporte, logística, frete, armazenagem, transporte público, combustível, pedágio, porto, aeroporto, agência de viagem, turismo",
    cnaeGroups: "49,50,51,52,53,79",
    chunkIndex: 0,
  },
  {
    lei: "lc227", artigo: "Art. 1-15", titulo: "LC 227/2024 — Simples Nacional",
    conteudo: "A LC 227/2024 estabelece as regras de transição do Simples Nacional. A partir de 2027: o Simples Nacional incorpora o CBS em substituição ao PIS/COFINS. A partir de 2029: incorporação gradual do IBS em substituição ao ICMS e ISS. MEI: limite de receita mantido em R$ 81.000/ano.",
    topicos: "Simples Nacional, MEI, microempresa, transição, 2027, 2029, sublimite, PIS COFINS substituição",
    cnaeGroups: "01,02,03,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88",
    chunkIndex: 0,
  },
  {
    lei: "lc227", artigo: "Art. 16-35", titulo: "LC 227/2024 — Transição ICMS",
    conteudo: "O ICMS será extinto gradualmente entre 2029 e 2032. Cronograma: 2029 (90%), 2030 (80%), 2031 (70%), 2032 (60%), 2033 (extinção). Os benefícios fiscais de ICMS concedidos até 2032 são mantidos. Créditos acumulados de ICMS: podem ser transferidos para compensação com IBS.",
    topicos: "ICMS, transição, 2029, 2030, 2031, 2032, 2033, extinção, benefício fiscal, ICMS-ST, crédito acumulado",
    cnaeGroups: "10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47",
    chunkIndex: 0,
  },
  {
    lei: "lc227", artigo: "Art. 36-55", titulo: "LC 227/2024 — Transição ISS",
    conteudo: "O ISS será extinto gradualmente entre 2029 e 2032. Municípios com alíquota de ISS superior à alíquota municipal do IBS: diferença compensada pelo Fundo de Compensação. Serviços de construção civil: transição do ISS para o IBS com regras específicas.",
    topicos: "ISS, transição, 2029, 2032, 2033, extinção, município, Fundo de Compensação, ISS fixo, construção civil",
    cnaeGroups: "41,42,43,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88",
    chunkIndex: 0,
  },
  {
    lei: "lc227", artigo: "Art. 56-80", titulo: "LC 227/2024 — Transição PIS/COFINS",
    conteudo: "O PIS e a COFINS serão extintos em 2027, substituídos pela CBS. A CBS terá alíquota equivalente à soma das alíquotas do PIS e COFINS no regime não cumulativo (9,25%). Créditos de PIS/COFINS acumulados: podem ser utilizados para compensação com CBS.",
    topicos: "PIS, COFINS, CBS, extinção 2027, lucro presumido, lucro real, crédito, importação",
    cnaeGroups: "01,02,03,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88",
    chunkIndex: 0,
  },
  {
    lei: "lc116", artigo: "Art. 1-10", titulo: "LC 116/2003 — ISS Atual",
    conteudo: "O ISS continua vigente até 2032. Alíquota mínima: 2%. Alíquota máxima: 5%. Local de incidência: regra geral é o domicílio do prestador. Retenção na fonte: obrigatória quando o tomador é pessoa jurídica em município diferente. Sociedades profissionais: ISS fixo calculado por profissional habilitado.",
    topicos: "ISS, LC 116, alíquota mínima, alíquota máxima, lista de serviços, local de incidência, retenção na fonte, sociedade profissional, ISS fixo",
    cnaeGroups: "41,42,43,49,50,51,52,53,55,56,58,59,60,61,62,63,64,65,66,68,69,70,71,72,73,74,75,77,78,79,80,81,82,84,85,86,87,88",
    chunkIndex: 0,
  },
  {
    lei: "lc87", artigo: "Art. 1-20", titulo: "LC 87/1996 — ICMS Atual",
    conteudo: "O ICMS continua vigente até 2032. Alíquotas internas: variam por Estado (17% a 19%). Alíquotas interestaduais: 7% ou 12%. ICMS-ST: substituição tributária concentra o recolhimento no fabricante/importador. Exportações: imunes ao ICMS. DIFAL: incide nas compras interestaduais para consumidor final não contribuinte.",
    topicos: "ICMS, LC 87, Lei Kandir, alíquota interestadual, ICMS-ST, substituição tributária, crédito, exportação, DIFAL",
    cnaeGroups: "10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,41,42,43,45,46,47",
    chunkIndex: 0,
  },
];

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL não encontrada. Configure o .env");
    process.exit(1);
  }

  console.log("Conectando ao banco...");
  const conn = await createConnection(dbUrl);

  try {
    // Verificar se já há dados
    const [rows] = await conn.execute("SELECT COUNT(*) as cnt FROM ragDocuments");
    const count = rows[0].cnt;
    if (count > 0) {
      console.log(`Tabela ragDocuments já contém ${count} registros.`);
      const args = process.argv.slice(2);
      if (!args.includes("--force")) {
        console.log("Use --force para reinserir. Saindo.");
        await conn.end();
        return;
      }
      console.log("--force detectado. Limpando tabela...");
      await conn.execute("DELETE FROM ragDocuments");
    }

    console.log(`Inserindo ${RAG_CORPUS.length} chunks...`);
    let inserted = 0;
    for (const entry of RAG_CORPUS) {
      await conn.execute(
        `INSERT INTO ragDocuments (lei, artigo, titulo, conteudo, topicos, cnaeGroups, chunkIndex)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [entry.lei, entry.artigo, entry.titulo, entry.conteudo, entry.topicos, entry.cnaeGroups, entry.chunkIndex]
      );
      inserted++;
      if (inserted % 5 === 0) console.log(`  ${inserted}/${RAG_CORPUS.length} inseridos...`);
    }

    // Criar índice FULLTEXT se não existir
    try {
      await conn.execute(
        "ALTER TABLE ragDocuments ADD FULLTEXT INDEX ft_rag (titulo, conteudo, topicos)"
      );
      console.log("Índice FULLTEXT criado.");
    } catch (e) {
      if (e.message?.includes("Duplicate key name") || e.message?.includes("already exists")) {
        console.log("Índice FULLTEXT já existe.");
      } else {
        console.warn("Aviso ao criar índice FULLTEXT:", e.message);
      }
    }

    console.log(`\n✅ Ingestão concluída: ${inserted} chunks inseridos na tabela ragDocuments.`);
  } finally {
    await conn.end();
  }
}

main().catch(e => {
  console.error("Erro na ingestão:", e);
  process.exit(1);
});
