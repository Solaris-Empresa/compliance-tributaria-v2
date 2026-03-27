/**
 * server/dt01-db-push.test.ts
 * DT-01 — Guard db:push + integridade de schema
 * Testes unitários — zero banco, zero LLM
 *
 * Nota: T3 testa schema Drizzle em memória, não banco real.
 * Cobertura de fonte_risco_tipo já existente em server/schema-g11-136.test.ts (7 testes — não duplicado).
 */
import { describe, it, expect } from 'vitest'
import { checkDbPushGuard } from './utils/db-push-guard'
import { projects } from '../drizzle/schema'

describe('DT-01 — db:push guard e integridade de schema', () => {

  it('T1 — guard lança erro quando NODE_ENV=production', () => {
    expect(() => checkDbPushGuard('production')).toThrow(
      'BLOQUEADO: db:push não permitido em produção'
    )
  })

  it('T2 — guard não lança erro em NODE_ENV=development', () => {
    expect(() => checkDbPushGuard('development')).not.toThrow()
  })

  it('T3 — colunas críticas presentes no schema Drizzle (teste em memória)', () => {
    const colunas = Object.keys(projects)
    const criticas = [
      'briefingContent',
      'riskMatricesData',
      'actionPlansData',
      'briefingContentV1',
      'briefingContentV3',
    ]
    for (const col of criticas) {
      expect(colunas, `coluna ausente no schema: ${col}`).toContain(col)
    }
  })

})
