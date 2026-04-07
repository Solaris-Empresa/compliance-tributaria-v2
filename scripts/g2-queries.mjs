/**
 * g2-queries.mjs — Sprint Z Z-01 · Bloco G2 · Evidências SQL de produção
 * Executa G2-01 a G2-05 no banco TiDB Cloud e imprime resultados
 */
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('ERROR: DATABASE_URL not set');
  process.exit(1);
}

const conn = await mysql.createConnection(url);

// ─── G2-01 ────────────────────────────────────────────────────────────────────
console.log('\n=== G2-01: NCMs em corporateAnswers batem com NCMs do perfil ===');
const [g201] = await conn.execute(`
  SELECT
    p.id, p.name,
    JSON_EXTRACT(p.operationProfile, '$.ncmCodes')     as perfil_ncms,
    JSON_EXTRACT(p.corporateAnswers, '$[0].ncm')       as pergunta0_ncm,
    JSON_EXTRACT(p.corporateAnswers, '$[1].ncm')       as pergunta1_ncm,
    JSON_EXTRACT(p.corporateAnswers, '$[2].ncm')       as pergunta2_ncm,
    JSON_LENGTH(p.corporateAnswers)                    as total_perguntas
  FROM projects p
  WHERE JSON_EXTRACT(p.corporateAnswers, '$[0].fonte') IS NOT NULL
    AND JSON_EXTRACT(p.operationProfile, '$.ncmCodes') IS NOT NULL
  ORDER BY p.id DESC LIMIT 5
`);
console.table(g201);

// ─── G2-02 ────────────────────────────────────────────────────────────────────
console.log('\n=== G2-02: NBS em operationalAnswers batem com NBS do perfil ===');
const [g202] = await conn.execute(`
  SELECT
    p.id, p.name,
    JSON_EXTRACT(p.operationProfile, '$.nbsCodes')       as perfil_nbs,
    JSON_EXTRACT(p.operationalAnswers, '$[0].nbs')       as pergunta0_nbs,
    JSON_EXTRACT(p.operationalAnswers, '$[0].fonte')     as pergunta0_fonte,
    JSON_EXTRACT(p.operationalAnswers, '$[0].fonte_ref') as pergunta0_ref,
    JSON_EXTRACT(p.operationalAnswers, '$[0].lei_ref')   as pergunta0_lei
  FROM projects p
  WHERE JSON_EXTRACT(p.operationalAnswers, '$[0].fonte') IN ('rag', 'solaris')
  ORDER BY p.id DESC LIMIT 5
`);
console.table(g202);

// ─── G2-03 ────────────────────────────────────────────────────────────────────
console.log('\n=== G2-03: JOIN CRÍTICO: fonte_ref RAG existe em ragDocuments ===');
const [g203] = await conn.execute(`
  SELECT
    p.id,
    JSON_EXTRACT(p.corporateAnswers, '$[0].fonte_ref')  as fonte_ref_qc,
    r.anchor_id, r.lei, r.artigo,
    JSON_EXTRACT(p.corporateAnswers, '$[0].ncm')        as ncm_pergunta
  FROM projects p
  JOIN ragDocuments r
    ON r.anchor_id = JSON_UNQUOTE(
      JSON_EXTRACT(p.corporateAnswers, '$[0].fonte_ref')
    )
  WHERE JSON_EXTRACT(p.corporateAnswers, '$[0].fonte') = 'rag'
  ORDER BY p.id DESC LIMIT 5
`);
console.table(g203);
console.log('G2-03 linhas retornadas:', g203.length, g203.length > 0 ? '✅ OK' : '❌ BUG CRÍTICO');

// ─── G2-04 ────────────────────────────────────────────────────────────────────
console.log('\n=== G2-04: JOIN: fonte_ref SOLARIS existe em solarisQuestions ===');
const [g204] = await conn.execute(`
  SELECT
    p.id,
    JSON_EXTRACT(p.operationalAnswers, '$[0].fonte_ref') as solaris_ref,
    sq.codigo, LEFT(sq.texto, 80) as texto_solaris,
    JSON_EXTRACT(p.operationalAnswers, '$[0].confidence') as confidence
  FROM projects p
  JOIN solaris_questions sq
    ON sq.codigo = JSON_UNQUOTE(
      JSON_EXTRACT(p.operationalAnswers, '$[0].fonte_ref')
    )
  WHERE JSON_EXTRACT(p.operationalAnswers, '$[0].fonte') = 'solaris'
  ORDER BY p.id DESC LIMIT 5
`);
console.table(g204);
console.log('G2-04 linhas retornadas:', g204.length, g204.length > 0 ? '✅ OK' : '❌ BUG');

// ─── G2-05 ────────────────────────────────────────────────────────────────────
console.log('\n=== G2-05: Distribuição de fontes por tipo de empresa ===');
const [g205] = await conn.execute(`
  SELECT
    JSON_EXTRACT(p.operationProfile, '$.operationType') as tipo_empresa,
    JSON_EXTRACT(p.corporateAnswers,   '$[0].fonte')    as qc_fonte,
    JSON_EXTRACT(p.operationalAnswers, '$[0].fonte')    as qo_fonte,
    COUNT(*) as total
  FROM projects p
  WHERE JSON_EXTRACT(p.corporateAnswers, '$[0].fonte') IS NOT NULL
  GROUP BY
    JSON_EXTRACT(p.operationProfile, '$.operationType'),
    JSON_EXTRACT(p.corporateAnswers,   '$[0].fonte'),
    JSON_EXTRACT(p.operationalAnswers, '$[0].fonte')
  ORDER BY tipo_empresa, total DESC
`);
console.table(g205);

await conn.end();
console.log('\n=== G2 CONCLUÍDO ===');
