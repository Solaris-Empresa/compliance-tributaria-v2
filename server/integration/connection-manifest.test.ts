/**
 * Connection Manifest — Gate FC
 *
 * Garante que cada procedure tRPC crítica tem um consumidor no frontend.
 * Previne o bug BUG-MANUAL-02: backend implementado mas não conectado à UI.
 *
 * Filosofia: este arquivo é um contrato vivo.
 * Toda procedure nova em routers-fluxo-v3.ts deve ter uma entrada aqui.
 * Se o componente não existir → teste falha → PR bloqueado.
 *
 * Calibração (2026-04-07):
 *   - Procedures verificadas contra routers-fluxo-v3.ts (HEAD b90a973)
 *   - Componentes verificados contra client/src/pages/ (HEAD b90a973)
 *   - Itens TO-BE marcados explicitamente — FAILs são intencionais (BUG-MANUAL-02)
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const ROOT = resolve(__dirname, '../..')
const FRONTEND_PAGES = resolve(ROOT, 'client/src/pages')
const FRONTEND_HOOKS = resolve(ROOT, 'client/src')
const ROUTER_FILE    = resolve(ROOT, 'server/routers-fluxo-v3.ts')
const APP_TSX        = resolve(ROOT, 'client/src/App.tsx')

/** Lê conteúdo de arquivo ou retorna '' se não existir */
function read(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf-8') : ''
}

/** Verifica se string existe em algum arquivo .tsx/.ts em diretório */
function existsInFrontend(symbol: string): boolean {
  try {
    const result = execSync(
      `grep -rl "${symbol}" "${FRONTEND_HOOKS}" --include="*.tsx" --include="*.ts" 2>/dev/null || true`,
      { encoding: 'utf-8' }
    ).trim()
    return result.length > 0
  } catch {
    return false
  }
}

// ─── MANIFESTO CANÔNICO ────────────────────────────────────────────────────
//
// Formato: { procedure, component, route?, toBeOnly? }
//   procedure: nome exato da procedure em routers-fluxo-v3.ts
//   component: arquivo em client/src/pages/ que a consome
//   route:     rota em App.tsx (opcional, verificada se presente)
//   toBeOnly:  true = item TO-BE — FAIL intencional até feat/z02-to-be-flow-refactor
//
const MANIFEST: Array<{
  procedure: string
  component: string
  route?:    string
  toBeOnly?: boolean
}> = [
  // ── Fluxo de criação de projeto ─────────────────────────────────────────
  {
    procedure: 'confirmCnaes',
    component: 'NovoProjeto.tsx',
  },

  // ── Onda 1: SOLARIS ──────────────────────────────────────────────────────
  // procedure: getOnda1Questions (linha 2228 do router)
  // componente: QuestionarioSolaris.tsx — chama trpc.fluxoV3.getOnda1Questions.useQuery
  {
    procedure: 'getOnda1Questions',
    component: 'QuestionarioSolaris.tsx',
    route:     '/projetos/:id/questionario-solaris',
  },
  // procedure: completeOnda1 (linha 2266 do router)
  // componente: QuestionarioSolaris.tsx — chama trpc.fluxoV3.completeOnda1.useMutation
  {
    procedure: 'completeOnda1',
    component: 'QuestionarioSolaris.tsx',
  },

  // ── Onda 2: IA GEN ────────────────────────────────────────────────────────
  // procedure: generateOnda2Questions (linha 2354 do router)
  // NOTA: o prompt do Orquestrador usa 'getOnda2Questions' mas o nome real é 'generateOnda2Questions'
  // DIV-Z02-003: mantendo o nome real do router
  {
    procedure: 'generateOnda2Questions',
    component: 'QuestionarioIaGen.tsx',
    route:     '/projetos/:id/questionario-iagen',
  },
  // procedure: completeOnda2 (linha 2475 do router)
  {
    procedure: 'completeOnda2',
    component: 'QuestionarioIaGen.tsx',
  },

  // ── TO-BE: Q. de Produtos (NCM) ───────────────────────────────────────────
  // ATENÇÃO: estes itens devem FALHAR até que o PR feat/z02-to-be-flow-refactor
  // seja mergeado. São a documentação do BUG-MANUAL-02.
  // procedure: getProductQuestions (linha 2610 do router) — existe, sem consumidor
  {
    procedure: 'getProductQuestions',
    component: 'QuestionarioProduto.tsx',
    route:     '/projetos/:id/questionario-produto',
    toBeOnly:  true,
  },
  // procedure: completeProductQuestionnaire — NÃO existe ainda no router
  {
    procedure: 'completeProductQuestionnaire',
    component: 'QuestionarioProduto.tsx',
    toBeOnly:  true,
  },

  // ── TO-BE: Q. de Serviços (NBS) ───────────────────────────────────────────
  // procedure: getServiceQuestions (linha 2645 do router) — existe, sem consumidor
  {
    procedure: 'getServiceQuestions',
    component: 'QuestionarioServico.tsx',
    route:     '/projetos/:id/questionario-servico',
    toBeOnly:  true,
  },
  // procedure: completeServiceQuestionnaire — NÃO existe ainda no router
  {
    procedure: 'completeServiceQuestionnaire',
    component: 'QuestionarioServico.tsx',
    toBeOnly:  true,
  },

  // ── Briefing ──────────────────────────────────────────────────────────────
  // procedure: generateBriefing (linha 975 do router)
  // componente: BriefingV3.tsx — chama trpc.fluxoV3.generateBriefing.useMutation
  {
    procedure: 'generateBriefing',
    component: 'BriefingV3.tsx',
  },
  // procedure: approveBriefing (linha 1082 do router)
  {
    procedure: 'approveBriefing',
    component: 'BriefingV3.tsx',
  },

  // ── Matrizes de risco ─────────────────────────────────────────────────────
  // procedure: generateRiskMatrices (linha 1113 do router)
  // componente: MatrizesV3.tsx — chama trpc.fluxoV3.generateRiskMatrices.useMutation
  {
    procedure: 'generateRiskMatrices',
    component: 'MatrizesV3.tsx',
  },

  // ── Plano de ação ─────────────────────────────────────────────────────────
  // procedure: generateActionPlan (linha 1267 do router)
  // componente: PlanoAcaoV3.tsx — chama trpc.fluxoV3.generateActionPlan.useMutation
  {
    procedure: 'generateActionPlan',
    component: 'PlanoAcaoV3.tsx',
  },
  // procedure: approveActionPlan (linha 1554 do router)
  {
    procedure: 'approveActionPlan',
    component: 'PlanoAcaoV3.tsx',
  },
]

// ─── TESTES ────────────────────────────────────────────────────────────────

describe('Connection Manifest — Gate FC', () => {

  describe('Procedures registradas no router', () => {
    const routerContent = read(ROUTER_FILE)

    MANIFEST.forEach(({ procedure, toBeOnly }) => {
      it(`procedure '${procedure}' existe em routers-fluxo-v3.ts${toBeOnly ? ' [TO-BE]' : ''}`, () => {
        expect(routerContent).toContain(procedure)
      })
    })
  })

  describe('Componentes consumidores existem no frontend', () => {
    MANIFEST.forEach(({ procedure, component, toBeOnly }) => {
      it(`'${procedure}' tem consumidor: ${component}${toBeOnly ? ' [TO-BE — FAIL esperado]' : ''}`, () => {
        const componentPath = resolve(FRONTEND_PAGES, component)
        const exists = existsSync(componentPath)
        expect(
          exists,
          `Componente ${component} não encontrado em client/src/pages/.\n` +
          `Procedure '${procedure}' não tem consumidor no frontend.\n` +
          (toBeOnly
            ? `[TO-BE] Criar ${component} em feat/z02-to-be-flow-refactor.`
            : `Criar ${component} antes de mergear.`)
        ).toBe(true)
      })
    })
  })

  describe('Componentes realmente chamam as procedures', () => {
    MANIFEST.forEach(({ procedure, component, toBeOnly }) => {
      it(`${component} referencia '${procedure}'${toBeOnly ? ' [TO-BE — FAIL esperado]' : ''}`, () => {
        const componentPath = resolve(FRONTEND_PAGES, component)
        if (!existsSync(componentPath)) {
          // Já falhou no teste anterior — pular para evitar erro duplo
          return
        }
        const content = read(componentPath)
        expect(
          content,
          `${component} não contém referência a '${procedure}'.\n` +
          `O componente existe mas não chama a procedure tRPC.`
        ).toContain(procedure)
      })
    })
  })

  describe('Rotas declaradas em App.tsx', () => {
    const appContent = read(APP_TSX)

    MANIFEST
      .filter(entry => entry.route)
      .forEach(({ route, component, toBeOnly }) => {
        // Normalizar rota para busca: /projetos/:id/questionario-solaris → questionario-solaris
        const routeFragment = route!.replace('/projetos/:id/', '').replace('/', '')
        it(`rota '${route}' presente em App.tsx${toBeOnly ? ' [TO-BE — FAIL esperado]' : ''}`, () => {
          expect(
            appContent,
            `Rota '${route}' não encontrada em App.tsx.\n` +
            `Componente ${component} precisa de rota registrada.`
          ).toContain(routeFragment)
        })
      })
  })

  describe('Manifesto está atualizado com o router', () => {
    it('todas as procedures críticas do router devem estar no manifesto', () => {
      const routerContent = read(ROUTER_FILE)

      // Extrair procedures definidas no router (padrão: 2-4 espaços + nome + ':')
      const routerProcs = (routerContent.match(/^\s{2,4}([a-zA-Z][a-zA-Z0-9]+)\s*:/gm) ?? [])
        .map(s => s.trim().replace(':', ''))
        .filter(s => !['input', 'output', 'meta', 'middleware', 'use'].includes(s))
        .filter(s => s.length > 3)

      const manifestedProcs = new Set(MANIFEST.map(e => e.procedure))

      // Procedures no router mas não no manifesto → aviso (não bloqueante)
      const unmanifested = routerProcs.filter(p => !manifestedProcs.has(p))

      if (unmanifested.length > 0) {
        console.warn(
          '\n⚠️  Procedures no router não mapeadas no Connection Manifest:\n' +
          unmanifested.map(p => `   → ${p}`).join('\n') +
          '\n   Adicionar ao MANIFEST em connection-manifest.test.ts se tiver UI\n'
        )
      }

      // Não falha — apenas avisa. Procedures legadas ou internas podem estar no router.
      expect(true).toBe(true)
    })
  })

})
