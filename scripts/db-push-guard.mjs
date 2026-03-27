// scripts/db-push-guard.mjs
// Guard de ambiente para db:push — padrão .mjs do projeto (DT-01)
// Bloqueia execução em NODE_ENV=production para evitar migrations acidentais
const env = process.env.NODE_ENV

if (env === 'production') {
  console.error('BLOQUEADO: db:push não permitido em produção (NODE_ENV=production)')
  process.exit(1)
}
