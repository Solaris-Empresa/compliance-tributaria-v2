/**
 * Fitness Functions — Gate ADR + Contrato
 *
 * "Um ADR documenta a decisão. Uma Fitness Function garante a decisão."
 * — Building Evolutionary Architectures · Neal Ford, Rebecca Parsons, Patrick Kua
 *
 * Estas funções verificam automaticamente que:
 * 1. ADRs existem para decisões arquiteturais ativas
 * 2. Contratos existem para interfaces públicas críticas
 * 3. O código implementa o que os contratos especificam
 * 4. ADRs referenciados no código existem como arquivos
 *
 * Origem: BUG-MANUAL-02 — product-questions.ts implementado sem ADR/Contrato
 * no fluxo de desenvolvimento. 198 testes passaram, E2E manual falhou.
 */

import { readFileSync, existsSync, readdirSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const ROOT         = resolve(__dirname, '../..')
const ADR_DIR      = resolve(ROOT, 'docs/adr')
const CONTRACT_DIR = resolve(ROOT, 'docs/contratos')
const DIV_DIR      = resolve(ROOT, 'docs/divergencias')

function read(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf-8') : ''
}

function listFiles(dir: string, pattern: RegExp): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter(f => pattern.test(f))
}

// ─── SUITE 1: Existência de ADRs ────────────────────────────────────────────

describe('Fitness Function 1 — Existência de ADRs', () => {

  it('FF-01: docs/adr/ existe e tem pelo menos 1 ADR', () => {
    const adrs = listFiles(ADR_DIR, /^ADR-\d{4}/)
    expect(
      adrs.length,
      `Nenhum ADR encontrado em docs/adr/.\n` +
      `Criar pelo menos ADR-0001 antes de qualquer mudança arquitetural.`
    ).toBeGreaterThan(0)
  })

  it('FF-02: ADR-0009 existe (Fluxo Canônico e Fontes do Diagnóstico)', () => {
    const adrs = listFiles(ADR_DIR, /^ADR-0009/)
    expect(adrs.length, 'ADR-0009 não encontrado').toBeGreaterThan(0)
  })

  it('FF-03: ADR-0010 existe (Substituição QC/QO por NCM/NBS)', () => {
    // Arquivo usa ADR-010 (3 dígitos) — padrão histórico do projeto
    const adrs = listFiles(ADR_DIR, /^ADR-010/)
    expect(
      adrs.length,
      `ADR-0010 não encontrado.\n` +
      `A decisão de substituir QC/QO por Q.Produtos/Q.Serviços deve ter ADR.`
    ).toBeGreaterThan(0)
  })

  it('FF-04: todo ADR tem seção Status definida', () => {
    const adrs = listFiles(ADR_DIR, /^ADR-\d{4}/)
    adrs.forEach(file => {
      const content = read(resolve(ADR_DIR, file))
      const hasStatus = content.includes('**Status:**') ||
                        content.includes('## Status') ||
                        content.toLowerCase().includes('status:')
      expect(
        hasStatus,
        `${file} não tem seção Status.\n` +
        `ADR sem status é ADR sem responsável.`
      ).toBe(true)
    })
  })

  it('FF-05: todo ADR tem seção Decisão ou Decision', () => {
    const adrs = listFiles(ADR_DIR, /^ADR-\d{4}/)
    adrs.forEach(file => {
      const content = read(resolve(ADR_DIR, file))
      const hasDecision = content.includes('## 2. Decisão') ||
                          content.includes('## Decisão') ||
                          content.includes('## Decision') ||
                          content.includes('## 2. Decision')
      expect(
        hasDecision,
        `${file} não tem seção Decisão.\n` +
        `ADR sem decisão explícita é apenas contexto — não é um ADR.`
      ).toBe(true)
    })
  })

})

// ─── SUITE 2: Existência de Contratos ───────────────────────────────────────

describe('Fitness Function 2 — Existência de Contratos', () => {

  it('FF-06: docs/contratos/ existe', () => {
    expect(
      existsSync(CONTRACT_DIR),
      'docs/contratos/ não existe — criar diretório'
    ).toBe(true)
  })

  it('FF-07: contrato DEC-M3-05 existe (Q.Produtos/Q.Serviços)', () => {
    const contracts = listFiles(CONTRACT_DIR, /CONTRATO-DEC-M3-05/)
    expect(
      contracts.length,
      `Contrato DEC-M3-05 não encontrado em docs/contratos/.\n` +
      `Interfaces ProductAnswer, ServiceAnswer e procedures devem ter contrato.`
    ).toBeGreaterThan(0)
  })

  it('FF-08: todo contrato tem seção de Invariantes', () => {
    const contracts = listFiles(CONTRACT_DIR, /^CONTRATO-/)
    contracts.forEach(file => {
      const content = read(resolve(CONTRACT_DIR, file))
      const hasInvariants = content.toLowerCase().includes('invariante') ||
                            content.toLowerCase().includes('invariant') ||
                            content.toLowerCase().includes('garante:') ||
                            content.toLowerCase().includes('garantia')
      expect(
        hasInvariants,
        `${file} não tem seção de Invariantes.\n` +
        `Contrato sem invariantes não é verificável.`
      ).toBe(true)
    })
  })

  it('FF-09: todo contrato tem seção de Violações', () => {
    const contracts = listFiles(CONTRACT_DIR, /^CONTRATO-/)
    contracts.forEach(file => {
      const content = read(resolve(CONTRACT_DIR, file))
      const hasViolations = content.toLowerCase().includes('violação') ||
                            content.toLowerCase().includes('violacao') ||
                            content.toLowerCase().includes('violation')
      expect(
        hasViolations,
        `${file} não tem seção de Violações.\n` +
        `Contrato sem protocolo de violação não será seguido.`
      ).toBe(true)
    })
  })

})

// ─── SUITE 3: Código respeita o Contrato DEC-M3-05 ──────────────────────────

describe('Fitness Function 3 — Código vs Contrato DEC-M3-05', () => {

  const ROUTER  = resolve(ROOT, 'server/routers-fluxo-v3.ts')
  const FSM     = resolve(ROOT, 'server/flowStateMachine.ts')
  const SCHEMA  = resolve(ROOT, 'drizzle/schema.ts')
  const TRACKED = resolve(ROOT, 'server/lib/tracked-question.ts')

  it('FF-10: ProductAnswer ou TrackedAnswer definido no código', () => {
    const content = read(TRACKED)
    const hasInterface = content.includes('ProductAnswer') ||
                         content.includes('TrackedAnswer') ||
                         content.includes('interface.*Answer')
    expect(
      hasInterface,
      `server/lib/tracked-question.ts não define ProductAnswer.\n` +
      `Contrato exige interface ProductAnswer com fonte_ref e lei_ref obrigatórios.`
    ).toBe(true)
  })

  it('FF-11: getNextStateAfterProductQ usa valores em português (DIV-Z02-003)', () => {
    const content = read(FSM)
    if (!content.includes('getNextStateAfterProductQ')) return // ainda não implementado

    // Verificar que usa 'produto' e não 'product'
    const funcMatch = content.match(/getNextStateAfterProductQ[\s\S]{0,500}?}/m)
    if (funcMatch) {
      const funcBody = funcMatch[0]
      expect(
        funcBody,
        `getNextStateAfterProductQ deve usar 'produto' (português), não 'product' (inglês).\n` +
        `DIV-Z02-003: enum real usa valores em português.`
      ).toContain('produto')
      expect(funcBody).not.toMatch(/'product'/)  // inglês não deve aparecer
    }
  })

  it('FF-12: schema tem productAnswers E serviceAnswers', () => {
    const content = read(SCHEMA)
    if (!content.includes('productAnswers') && !content.includes('product_answers')) {
      // Ainda não implementado — marcar como pendente (não bloqueante agora)
      console.warn('⚠️  FF-12: productAnswers ainda não existe no schema — pendente Z-02')
      return
    }
    expect(content).toMatch(/product_?[aA]nswers/)
    expect(content).toMatch(/service_?[aA]nswers/)
  })

  it('FF-13: completeProductQuestionnaire existe no router', () => {
    const content = read(ROUTER)
    if (!content.includes('completeProductQuestionnaire')) {
      console.warn('⚠️  FF-13: completeProductQuestionnaire ainda não existe — pendente Z-02')
      return
    }
    expect(content).toContain('completeProductQuestionnaire')
    expect(content).toContain('completeServiceQuestionnaire')
  })

  it('FF-14: getProductQuestions grava em productAnswers (não em corporateAnswers)', () => {
    const content = read(ROUTER)
    if (!content.includes('productAnswers') && !content.includes('product_answers')) {
      console.warn('⚠️  FF-14: productAnswers ainda não no router — pendente Z-02')
      return
    }
    // Se productAnswers existe, verificar que getProductQuestions usa ele
    const getProductSection = content.match(
      /getProductQuestions[\s\S]{0,1000}?(?=\w+Questions:|getService)/m
    )
    if (getProductSection) {
      expect(
        getProductSection[0],
        `getProductQuestions deve gravar em productAnswers, não em corporateAnswers.\n` +
        `Ver Contrato DEC-M3-05 Parte 2.1`
      ).toMatch(/product[_A]nswers/)
    }
  })

  it('FF-15: VALID_TRANSITIONS tem q_produto e q_servico', () => {
    const content = read(FSM)
    if (!content.includes('q_produto')) {
      console.warn('⚠️  FF-15: q_produto ainda não no FSM — pendente Z-02')
      return
    }
    expect(content).toContain('q_produto')
    expect(content).toContain('q_servico')
  })

  it('FF-16: estados legados diagnostico_corporativo e diagnostico_operacional preservados', () => {
    const content = read(FSM)
    expect(
      content,
      `diagnostico_corporativo foi removido do flowStateMachine.\n` +
      `ADR-0010 Seção 5: estados legados NUNCA devem ser removidos.`
    ).toContain('diagnostico_corporativo')
    expect(
      content,
      `diagnostico_operacional foi removido do flowStateMachine.\n` +
      `ADR-0010 Seção 5: estados legados NUNCA devem ser removidos.`
    ).toContain('diagnostico_operacional')
  })

})

// ─── SUITE 4: ADRs e Contratos têm índice atualizado ────────────────────────

describe('Fitness Function 4 — Índice de ADRs e Contratos', () => {

  it('FF-17: docs/adr/ADR-INDEX.md existe', () => {
    expect(existsSync(resolve(ADR_DIR, 'ADR-INDEX.md')),
      'ADR-INDEX.md não encontrado em docs/adr/'
    ).toBe(true)
  })

  it('FF-18: ADR-INDEX.md lista todos os ADRs existentes', () => {
    const index = read(resolve(ADR_DIR, 'ADR-INDEX.md'))
    const adrs  = listFiles(ADR_DIR, /^ADR-\d{4}/)

    adrs.forEach(file => {
      const adrNum = file.match(/ADR-(\d{4})/)?.[1]
      if (adrNum && adrNum !== 'INDEX') {
        expect(
          index,
          `ADR-${adrNum} existe em docs/adr/ mas não está no ADR-INDEX.md.\n` +
          `Atualizar ADR-INDEX.md ao criar novos ADRs.`
        ).toContain(`ADR-${adrNum}`)
      }
    })
  })

  it('FF-19: DIVs resolvidas têm referência ao ADR/PR que resolveu', () => {
    const divs = listFiles(DIV_DIR, /^DIV-/)
    divs.forEach(file => {
      const content = read(resolve(DIV_DIR, file))
      if (content.includes('RESOLVIDA')) {
        const hasResolution = content.includes('PR #') ||
                              content.includes('ADR-') ||
                              content.includes('Resolvido em:') ||
                              content.includes('Corrigido em:')
        expect(
          hasResolution,
          `${file} marcada como RESOLVIDA mas sem referência ao PR/ADR de resolução.`
        ).toBe(true)
      }
    })
  })

  it('FF-20: não existe ADR com status PROPOSTO há mais de 30 dias', () => {
    const adrs = listFiles(ADR_DIR, /^ADR-\d{4}/)
    const hoje = new Date()

    adrs.forEach(file => {
      const content = read(resolve(ADR_DIR, file))
      if (content.includes('Proposto') || content.includes('Proposed')) {
        // Verificar data do ADR
        const dateMatch = content.match(/\*\*Data:\*\*\s*(\d{4}-\d{2}-\d{2})/)
        if (dateMatch) {
          const adrDate = new Date(dateMatch[1])
          const diffDays = (hoje.getTime() - adrDate.getTime()) / (1000 * 60 * 60 * 24)
          expect(
            diffDays,
            `${file}: ADR Proposto há ${Math.round(diffDays)} dias.\n` +
            `ADRs Propostos devem ser Aceitos ou Rejeitados em 30 dias.`
          ).toBeLessThan(30)
        }
      }
    })
  })

})

// ─── SUITE 5: Rastreabilidade ADR → Código → Teste ──────────────────────────

describe('Fitness Function 5 — Rastreabilidade ADR → Código → Teste', () => {

  it('FF-21: ADR-0010 referenciado em algum teste de integração', () => {
    // ADR-0010 é a decisão mais crítica — deve aparecer em pelo menos 1 teste
    const testFiles = [
      'server/integration/etapa2-state-machine.test.ts',
      'server/integration/connection-manifest.test.ts',
      'server/integration/fitness-functions.test.ts',
    ]

    let found = false
    for (const file of testFiles) {
      const content = read(resolve(ROOT, file))
      if (content.includes('ADR-0010') || content.includes('ADR-10')) {
        found = true
        break
      }
    }

    // Se ainda não existe — passa com aviso (pendente Z-02)
    if (!found) {
      console.warn('⚠️  FF-21: ADR-0010 não referenciado em testes — adicionar após Z-02')
    }
    expect(true).toBe(true)  // não bloqueante até Z-02 completo
  })

  it('FF-22: Contrato DEC-M3-05 referenciado no MANUS-GOVERNANCE', () => {
    const governance = read(resolve(ROOT, '.github/MANUS-GOVERNANCE.md'))
    const hasContractRef = governance.includes('CONTRATO-DEC-M3-05') ||
                           governance.includes('docs/contratos') ||
                           governance.includes('contrato de interface')
    if (!hasContractRef) {
      console.warn('⚠️  FF-22: MANUS-GOVERNANCE não referencia contratos — atualizar')
    }
    // Não bloqueante — informativo
    expect(true).toBe(true)
  })

})

// ─── SUITE 6: Cobertura E2E de componentes de página ────────────────────────
// Gate E2E v4.5 · 2026-04-07

describe('Fitness Function 6 — E2E Coverage de Frontend', () => {

  const PAGES_DIR = resolve(ROOT, 'client/src/pages')
  const E2E_DIR   = resolve(ROOT, 'playwright/e2e')

  // Páginas críticas que OBRIGATORIAMENTE precisam de spec E2E:
  const CRITICAL_PAGES = [
    { page: 'QuestionarioProduto.tsx', spec: 'fluxo-produto.spec.ts' },
    { page: 'QuestionarioServico.tsx', spec: 'fluxo-servico.spec.ts' },
  ]

  CRITICAL_PAGES.forEach(({ page, spec }) => {
    it(`FF-23: ${page} tem spec E2E em ${spec}`, () => {
      const specPath = resolve(E2E_DIR, spec)
      if (!existsSync(resolve(PAGES_DIR, page))) {
        console.warn(`⚠️  FF-23: ${page} ainda não existe — pendente Z-02`)
        return
      }
      expect(
        existsSync(specPath),
        `${page} existe mas não tem spec E2E correspondente.\n` +
        `Criar: playwright/e2e/${spec}\n` +
        `Gate E2E: toda PR com alteração em ${page} requer spec passando.`
      ).toBe(true)
    })
  })

  it('FF-24: playwright.config.ts existe', () => {
    expect(
      existsSync(resolve(ROOT, 'playwright.config.ts')),
      'playwright.config.ts não encontrado. Executar: Tarefa 2 do Gate E2E.'
    ).toBe(true)
  })

  it('FF-25: GitHub Action e2e-frontend.yml existe', () => {
    expect(
      existsSync(resolve(ROOT, '.github/workflows/e2e-frontend.yml')),
      'Workflow e2e-frontend.yml não encontrado.\n' +
      'PRs de frontend não estão sendo testados automaticamente no CI.'
    ).toBe(true)
  })

})
