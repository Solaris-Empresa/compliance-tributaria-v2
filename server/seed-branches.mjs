import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.js';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection, { schema, mode: 'default' });

const branches = [
  {
    code: 'COM',
    name: 'Comércio',
    description: 'Atividades de compra e venda de mercadorias, incluindo varejo e atacado',
    active: true,
  },
  {
    code: 'IND',
    name: 'Indústria',
    description: 'Produção e transformação de bens, manufatura e processos industriais',
    active: true,
  },
  {
    code: 'SER',
    name: 'Serviços',
    description: 'Prestação de serviços em geral, consultoria, assessoria e serviços profissionais',
    active: true,
  },
  {
    code: 'AGR',
    name: 'Agronegócio',
    description: 'Produção rural, agroindustrial e cadeias correlatas do agronegócio',
    active: true,
  },
  {
    code: 'SAU',
    name: 'Saúde',
    description: 'Clínicas, hospitais, laboratórios e serviços de saúde',
    active: true,
  },
  {
    code: 'IMO',
    name: 'Imobiliário',
    description: 'Compra, venda, locação e incorporação de imóveis',
    active: true,
  },
  {
    code: 'LOG',
    name: 'Logística',
    description: 'Transporte, armazenagem e distribuição de mercadorias',
    active: true,
  },
  {
    code: 'EDU',
    name: 'Educação',
    description: 'Instituições de ensino, treinamento e capacitação profissional',
    active: true,
  },
];

console.log('🌱 Inserindo ramos de atividade...');

for (const branch of branches) {
  try {
    await db.insert(schema.activityBranches).values(branch);
    console.log(`✅ ${branch.code} - ${branch.name}`);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.log(`⏭️  ${branch.code} - ${branch.name} (já existe)`);
    } else {
      console.error(`❌ Erro ao inserir ${branch.code}:`, error.message);
    }
  }
}

console.log('✅ Seed concluído!');
await connection.end();
process.exit(0);
