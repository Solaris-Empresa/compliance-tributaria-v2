#!/usr/bin/env node
/**
 * sync-baseline.mjs
 * Lê BASELINE-PRODUTO.md e extrai os valores críticos para atualizar
 * o index.html do Cockpit P.O. automaticamente.
 *
 * Uso: node docs/painel-po/sync-baseline.mjs
 * Script: pnpm cockpit:sync
 *
 * Atualiza automaticamente:
 *   - Versão do produto nos cards de status
 *   - Contagem de testes no radar
 *   - Data de atualização no cabeçalho
 *   - Data e versão do BASELINE na biblioteca (via âncora data-key="doc-baseline")
 *
 * NÃO atualiza (requer julgamento humano):
 *   - INITIAL_KANBAN (estado das tarefas)
 *   - INITIAL_DECISIONS (log de decisões)
 *   - Card "Próxima ação obrigatória"
 *   - Sub-texto dos cards de status
 *   - Documentos novos na biblioteca
 */

import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

const BASELINE_PATH = resolve("docs/BASELINE-PRODUTO.md")
const COCKPIT_PATH = resolve("docs/painel-po/index.html")

const baseline = readFileSync(BASELINE_PATH, "utf-8")
let cockpit = readFileSync(COCKPIT_PATH, "utf-8")

// ─── Extrair valores do BASELINE ────────────────────────────────────────────

const versaoMatch = baseline.match(/\*\*Versão:\*\*\s+([\d.]+)/)
const versao = versaoMatch?.[1] ?? "?"

const commitMatch = baseline.match(/\*\*Commit HEAD:\*\*\s+`([a-f0-9]+)`/)
const commit = commitMatch?.[1] ?? "?"

const testesMatch = baseline.match(/\*\*(\d+) testes passando\*\*/)
const testes = testesMatch?.[1] ?? "?"

const modeMatch = baseline.match(/`DIAGNOSTIC_READ_MODE`\s*\|\s*`(\w+)`/)
const mode = modeMatch?.[1] ?? "shadow"

const dataMatch = baseline.match(/\*\*Versão:\*\*.*?(\d{4}-\d{2}-\d{2})/)
const data = dataMatch?.[1] ?? new Date().toISOString().slice(0, 10)

console.log("📊 Baseline extraído:")
console.log(`   Versão:  ${versao}`)
console.log(`   Commit:  ${commit}`)
console.log(`   Testes:  ${testes}`)
console.log(`   Mode:    ${mode}`)
console.log(`   Data:    ${data}`)

// ─── 1. Atualizar card "Estado do produto" (valor principal) ─────────────────
// Substitui apenas ocorrências que contenham "Sprint", "UAT", "B0", "B1", "B2"
// ou o padrão "vX.Y — N demandas" — preserva textos históricos
cockpit = cockpit.replace(/v[\d.]+ — [^<"]+/g, (match) => {
  if (
    match.includes("Sprint") ||
    match.includes("UAT") ||
    match.includes("B0") ||
    match.includes("B1") ||
    match.includes("B2") ||
    match.includes("demandas")
  ) {
    return `v${versao} — 12 demandas UAT implementadas`
  }
  return match
})

// ─── 2. Atualizar radar de testes ────────────────────────────────────────────
// Padrão: "NNN/NNN passando (atualizado YYYY-MM-DD)"
cockpit = cockpit.replace(
  /\d+\/\d+ passando \(atualizado \d{4}-\d{2}-\d{2}\)/,
  `${testes}/${testes} passando (atualizado ${data})`
)

// ─── 3. Atualizar data do cabeçalho ──────────────────────────────────────────
cockpit = cockpit.replace(
  /Última atualização: \d{4}-\d{2}-\d{2}/,
  `Última atualização: ${data}`
)

// ─── 4. Atualizar BASELINE na biblioteca via âncora data-key ─────────────────
// Usa data-key="doc-baseline" como âncora — robusto a reordenação de docs
cockpit = cockpit.replace(
  /(<span[^>]*data-key="doc-baseline"[^>]*>)Atualizado: \d{4}-\d{2}-\d{2}[^<]*(<\/span>)/,
  `$1Atualizado: ${data} (v${versao})$2`
)

// ─── Salvar ──────────────────────────────────────────────────────────────────
writeFileSync(COCKPIT_PATH, cockpit, "utf-8")
console.log("✅ Cockpit atualizado com sucesso!")
console.log(`   Arquivo: ${COCKPIT_PATH}`)
console.log("")
console.log("⚠️  Itens que requerem atualização manual:")
console.log("   - INITIAL_KANBAN (estado das tarefas)")
console.log("   - INITIAL_DECISIONS (log de decisões)")
console.log("   - Card 'Próxima ação obrigatória'")
console.log("   - Sub-texto dos cards de status (ex: '517 testes')")
console.log("   - Documentos novos na biblioteca")
