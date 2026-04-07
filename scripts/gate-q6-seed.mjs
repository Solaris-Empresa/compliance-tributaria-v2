/**
 * gate-q6-seed.mjs — Sprint Z Z-01
 * Cria um projeto de teste com corporateAnswers = TrackedQuestion[]
 * para satisfazer o Gate Q6 do critério de avanço do PR #370.
 *
 * Uso: node scripts/gate-q6-seed.mjs
 */

import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);

// 1. Buscar IDs válidos
const [[user]] = await conn.execute('SELECT id FROM users ORDER BY id LIMIT 1');

if (!user) {
  console.error('ERRO: Nenhum usuário encontrado no banco.');
  process.exit(1);
}

console.log(`Usando userId=${user.id}`);

// 2. TrackedQuestion[] simulando output do getProductQuestions (NCM 2202.10.00)
const trackedQuestions = [
  {
    id: 'rag-ncm-220210-001',
    fonte: 'rag',
    fonte_ref: 'LC214-art45-ncm220210',
    lei_ref: 'LC 214/2025, Art. 45',
    texto: 'A empresa realizou o enquadramento do NCM 2202.10.00 nas alíquotas do IBS e CBS conforme LC 214/2025?',
    categoria: 'imposto_seletivo',
    ncm: '2202.10.00',
    nbs: undefined,
    confidence: 0.92,
  },
  {
    id: 'solaris-042-ncm-220210',
    fonte: 'solaris',
    fonte_ref: 'SOL-042',
    lei_ref: 'LC 214/2025',
    texto: 'A empresa possui controle de estoque por NCM atualizado para a Reforma Tributária?',
    categoria: 'controle_fiscal',
    ncm: '2202.10.00',
    nbs: undefined,
    confidence: 1.0,
  },
];

// 3. Inserir projeto de teste
const [result] = await conn.execute(
  `INSERT INTO projects
    (name, clientId, createdById, createdByRole, status, corporateAnswers, createdAt, updatedAt)
   VALUES (?, 9999, ?, 'equipe_solaris', 'diagnostico_cnae', ?, NOW(), NOW())`,
  [
    '[GATE-Q6-SEED] Projeto Teste Z-01 — NCM 2202.10.00',
    user.id,
    JSON.stringify(trackedQuestions),
  ]
);

const projectId = result.insertId;
console.log(`Projeto de teste criado: id=${projectId}`);

// 4. Executar Gate Q6
const [rows] = await conn.execute(`
  SELECT
    p.id,
    p.name,
    JSON_EXTRACT(p.corporateAnswers, '$[0].fonte')     as qc_fonte,
    JSON_EXTRACT(p.corporateAnswers, '$[0].fonte_ref') as qc_fonte_ref,
    JSON_EXTRACT(p.corporateAnswers, '$[0].lei_ref')   as qc_lei_ref
  FROM projects p
  WHERE JSON_EXTRACT(p.corporateAnswers, '$[0].fonte') IS NOT NULL
  LIMIT 5
`);

console.log(`\nGate Q6 — ${rows.length} linha(s):`);
console.table(rows);

await conn.end();
