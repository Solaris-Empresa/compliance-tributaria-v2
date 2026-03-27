/**
 * server/utils/db-push-guard.ts
 * Guard de ambiente para db:push — versão TypeScript para testes unitários (DT-01)
 * A versão executável pelo package.json está em scripts/db-push-guard.mjs
 */
export function checkDbPushGuard(env = process.env.NODE_ENV): void {
  if (env === 'production') {
    throw new Error('BLOQUEADO: db:push não permitido em produção')
  }
}
