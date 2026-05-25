/**
 * grounding-smoke-v3.mts — Smoke determinístico do GROUNDING IBS/CBS/CGIBS
 * FASE 4 + BUG-IBS-01 + Regimes Diferenciados
 *
 * ESCOPO (honesto): valida a MONTAGEM do grounding (`fetchDeterministicGrounding`),
 * i.e., as tags [FONTE:] no INPUT enviado ao LLM. NÃO valida o briefing/output do LLM
 * (consumo end-to-end = SUG-1 #1220). Não é E2E.
 *
 * EXECUÇÃO: manual (NÃO roda no CI vitest). Requer DATABASE_URL apontando para o
 * banco (mesmo de produção). Rodar do repo root:
 *   DATABASE_URL=... npx tsx tests/grounding/grounding-smoke-v3.mts
 *
 * Findings conhecidos documentados como issues: BUG-1 #1244 (aliquota_reduzida legada
 * universal) · BUG-3 #1245 (regime_especifico_imoveis sem cnae_codes).
 *
 * today = 2026-05-25 · 6 Perfis positivos + 3 Negativos + Smoke Final.
 */
import { fetchDeterministicGrounding } from "../../server/lib/deterministic-grounding";
import { writeFileSync } from "fs";

const TODAY = new Date("2026-05-25");
const OUT = process.env.SMOKE_OUT || "grounding-smoke-v3.results.json";

if (!process.env.DATABASE_URL) {
  console.log("SKIP: grounding-smoke-v3 requer DATABASE_URL (smoke manual, não-CI).");
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
function hasCgibsArt(output: string, art: string): boolean {
  return output.includes(`[FONTE: Resolução CGIBS 6/2026, ${art}]`);
}
function hasPortariaArt(output: string, art: string): boolean {
  return output.includes(`[FONTE: Portaria MF/CGIBS 7/2026, ${art}]`);
}
function countCgibs(output: string): number {
  return (output.match(/\[FONTE: Resolução CGIBS 6\/2026/g) || []).length;
}
function countDecreto(output: string): number {
  return (output.match(/\[FONTE: Decreto 12\.955\/2026/g) || []).length;
}
function countPortaria(output: string): number {
  return (output.match(/\[FONTE: Portaria MF\/CGIBS 7\/2026/g) || []).length;
}
/** Nota SN ancorada à frase exata de buildSimplesNacionalNote (não substring "Art. 41"). */
function hasSnNote(output: string): boolean {
  return output.includes("(Art. 41, §2º e Art. 49)");
}

interface Check {
  desc: string;
  pass: boolean;
  type: "MUST" | "MUST_NOT" | "FINDING";
}

interface ProfileReport {
  id: string;
  title: string;
  cnae: string;
  regime: string;
  stats: { cgibs: number; decreto: number; portaria: number; chars: number };
  checks: Check[];
  pass: boolean;
}

async function run() {
  const reports: ProfileReport[] = [];

  // P1 — Construtora · 4120-4 · lucro_presumido
  {
    const out = await fetchDeterministicGrounding({ regime: "lucro_presumido", cnae: "4120-4", today: TODAY });
    const checks: Check[] = [
      { desc: "CGIBS Art. 359 presente (regime_especifico_imoveis)", pass: hasCgibsArt(out, "Art. 359"), type: "MUST" },
      { desc: "CGIBS Art. 390 presente (regime_especifico_imoveis)", pass: hasCgibsArt(out, "Art. 390"), type: "MUST" },
      { desc: "CGIBS Art. 234 presente (reabilitacao_urbana)", pass: hasCgibsArt(out, "Art. 234"), type: "MUST" },
      { desc: "CGIBS Art. 237 presente (reabilitacao_urbana)", pass: hasCgibsArt(out, "Art. 237"), type: "MUST" },
      { desc: "CGIBS Art. 28 presente (split_payment)", pass: hasCgibsArt(out, "Art. 28"), type: "MUST" },
      { desc: "CGIBS Art. 593 presente (split_payment)", pass: hasCgibsArt(out, "Art. 593"), type: "MUST" },
      { desc: "Portaria 7 Art. 1 presente", pass: hasPortariaArt(out, "Art. 1"), type: "MUST" },
      { desc: "Decreto 12.955 presente (>0 tags)", pass: countDecreto(out) > 0, type: "MUST" },
      { desc: "Art. 233 ausente (transporte — gate CNAE)", pass: !hasCgibsArt(out, "Art. 233"), type: "MUST_NOT" },
      { desc: "Arts. 238-244 ausentes (produtor_rural — gate CNAE)", pass: !hasCgibsArt(out, "Art. 238") && !hasCgibsArt(out, "Art. 244"), type: "MUST_NOT" },
      { desc: "Art. 202 presente (FINDING BUG-1 #1244: legada universal)", pass: hasCgibsArt(out, "Art. 202"), type: "FINDING" },
    ];
    reports.push({ id: "P1", title: "Construtora", cnae: "4120-4", regime: "lucro_presumido",
      stats: { cgibs: countCgibs(out), decreto: countDecreto(out), portaria: countPortaria(out), chars: out.length },
      checks, pass: checks.filter(c => c.type !== "FINDING").every(c => c.pass) });
  }

  // P2 — Advogado PJ · 6911-7 · lucro_presumido
  {
    const out = await fetchDeterministicGrounding({ regime: "lucro_presumido", cnae: "6911-7", today: TODAY });
    const checks: Check[] = [
      { desc: "CGIBS Art. 200 presente (reduzida_30)", pass: hasCgibsArt(out, "Art. 200"), type: "MUST" },
      { desc: "CGIBS Art. 201 presente (reduzida_30)", pass: hasCgibsArt(out, "Art. 201"), type: "MUST" },
      { desc: "CGIBS Art. 202 presente (reduzida_30)", pass: hasCgibsArt(out, "Art. 202"), type: "MUST" },
      { desc: "CGIBS Art. 28 presente (split_payment)", pass: hasCgibsArt(out, "Art. 28"), type: "MUST" },
      { desc: "CGIBS Art. 44 presente (obrigacao_acessoria)", pass: hasCgibsArt(out, "Art. 44"), type: "MUST" },
      { desc: "Portaria 7 Art. 1 presente", pass: hasPortariaArt(out, "Art. 1"), type: "MUST" },
      { desc: "Decreto 12.955 presente", pass: countDecreto(out) > 0, type: "MUST" },
      { desc: "Arts. 238-244 ausentes (produtor_rural — gate CNAE)", pass: !hasCgibsArt(out, "Art. 238"), type: "MUST_NOT" },
      { desc: "Art. 359 PRESENTE (FINDING BUG-3 #1245: regime_especifico_imoveis universal)", pass: hasCgibsArt(out, "Art. 359"), type: "FINDING" },
    ];
    reports.push({ id: "P2", title: "Advogado PJ", cnae: "6911-7", regime: "lucro_presumido",
      stats: { cgibs: countCgibs(out), decreto: countDecreto(out), portaria: countPortaria(out), chars: out.length },
      checks, pass: checks.filter(c => c.type !== "FINDING").every(c => c.pass) });
  }

  // P2-SN — Advogado · 6911-7 · simples_nacional
  {
    const out = await fetchDeterministicGrounding({ regime: "simples_nacional", cnae: "6911-7", today: TODAY });
    const checks: Check[] = [
      { desc: "0 tags CGIBS (guard SN)", pass: countCgibs(out) === 0, type: "MUST" },
      { desc: "Nota SIMPLES NACIONAL/MEI presente", pass: out.includes("SIMPLES NACIONAL/MEI"), type: "MUST" },
      { desc: "Nota SN cita Art. 41 §2º e Art. 49 (frase ancorada)", pass: hasSnNote(out), type: "MUST" },
      { desc: "Decreto presente (SN recebe Decreto)", pass: countDecreto(out) > 0, type: "MUST" },
      { desc: "Portaria presente (SN recebe Portaria)", pass: countPortaria(out) > 0, type: "MUST" },
      { desc: "Header CGIBS vazio não renderizado", pass: !out.includes("## Resolução CGIBS 6") || countCgibs(out) === 0, type: "MUST" },
    ];
    reports.push({ id: "P2-SN", title: "Advogado SN", cnae: "6911-7", regime: "simples_nacional",
      stats: { cgibs: countCgibs(out), decreto: countDecreto(out), portaria: countPortaria(out), chars: out.length },
      checks, pass: checks.filter(c => c.type !== "FINDING").every(c => c.pass) });
  }

  // P3 — Produtor Rural · 0111-3 · lucro_presumido
  {
    const out = await fetchDeterministicGrounding({ regime: "lucro_presumido", cnae: "0111-3", today: TODAY });
    const checks: Check[] = [
      { desc: "CGIBS Art. 238 presente (produtor_rural)", pass: hasCgibsArt(out, "Art. 238"), type: "MUST" },
      { desc: "CGIBS Art. 244 presente (produtor_rural)", pass: hasCgibsArt(out, "Art. 244"), type: "MUST" },
      { desc: "CGIBS Art. 28 presente (split_payment)", pass: hasCgibsArt(out, "Art. 28"), type: "MUST" },
      { desc: "Portaria 7 Art. 1 presente", pass: hasPortariaArt(out, "Art. 1"), type: "MUST" },
      { desc: "Decreto 12.955 presente", pass: countDecreto(out) > 0, type: "MUST" },
      { desc: "Art. 256 ausente (reciclagem — vigência 2027)", pass: !hasCgibsArt(out, "Art. 256"), type: "MUST_NOT" },
      { desc: "Art. 258 ausente (bens_usados — vigência 2027)", pass: !hasCgibsArt(out, "Art. 258"), type: "MUST_NOT" },
      { desc: "Art. 234 ausente (reabilitacao_urbana — gate CNAE)", pass: !hasCgibsArt(out, "Art. 234"), type: "MUST_NOT" },
    ];
    reports.push({ id: "P3", title: "Produtor Rural", cnae: "0111-3", regime: "lucro_presumido",
      stats: { cgibs: countCgibs(out), decreto: countDecreto(out), portaria: countPortaria(out), chars: out.length },
      checks, pass: checks.filter(c => c.type !== "FINDING").every(c => c.pass) });
  }

  // P4 — Transportador · 4921-3 · lucro_presumido
  {
    const out = await fetchDeterministicGrounding({ regime: "lucro_presumido", cnae: "4921-3", today: TODAY });
    const checks: Check[] = [
      { desc: "CGIBS Art. 233 presente (transporte)", pass: hasCgibsArt(out, "Art. 233"), type: "MUST" },
      { desc: "CGIBS Art. 200 presente (transporte chapéu)", pass: hasCgibsArt(out, "Art. 200"), type: "MUST" },
      { desc: "CGIBS Art. 28 presente (split_payment)", pass: hasCgibsArt(out, "Art. 28"), type: "MUST" },
      { desc: "Portaria 7 Art. 1 presente", pass: hasPortariaArt(out, "Art. 1"), type: "MUST" },
      { desc: "Decreto 12.955 presente", pass: countDecreto(out) > 0, type: "MUST" },
      { desc: "Art. 234 ausente (reabilitacao_urbana — gate CNAE)", pass: !hasCgibsArt(out, "Art. 234"), type: "MUST_NOT" },
      { desc: "Arts. 238-244 ausentes (produtor_rural — gate CNAE)", pass: !hasCgibsArt(out, "Art. 238") && !hasCgibsArt(out, "Art. 244"), type: "MUST_NOT" },
      { desc: "Art. 359 PRESENTE (FINDING BUG-3 #1245: regime_especifico_imoveis universal)", pass: hasCgibsArt(out, "Art. 359"), type: "FINDING" },
    ];
    reports.push({ id: "P4", title: "Transportador", cnae: "4921-3", regime: "lucro_presumido",
      stats: { cgibs: countCgibs(out), decreto: countDecreto(out), portaria: countPortaria(out), chars: out.length },
      checks, pass: checks.filter(c => c.type !== "FINDING").every(c => c.pass) });
  }

  // P5 — SN genérico · 4120-4 · simples_nacional
  {
    const out = await fetchDeterministicGrounding({ regime: "simples_nacional", cnae: "4120-4", today: TODAY });
    const checks: Check[] = [
      { desc: "0 tags CGIBS (guard SN)", pass: countCgibs(out) === 0, type: "MUST" },
      { desc: "Nota SIMPLES NACIONAL/MEI presente", pass: out.includes("SIMPLES NACIONAL/MEI"), type: "MUST" },
      { desc: "Nota SN cita Art. 41 §2º e Art. 49 (frase ancorada)", pass: hasSnNote(out), type: "MUST" },
      { desc: "Decreto presente", pass: countDecreto(out) > 0, type: "MUST" },
      { desc: "Portaria presente", pass: countPortaria(out) > 0, type: "MUST" },
    ];
    reports.push({ id: "P5", title: "SN genérico", cnae: "4120-4", regime: "simples_nacional",
      stats: { cgibs: countCgibs(out), decreto: countDecreto(out), portaria: countPortaria(out), chars: out.length },
      checks, pass: checks.filter(c => c.type !== "FINDING").every(c => c.pass) });
  }

  // P6 — Locação · 6810-2 · lucro_presumido
  // NOTA: enquanto BUG-3 #1245 (regime_especifico_imoveis universal 359-390) existir, estas
  // assertions de locação passam via a categoria universal, NÃO via gate de CNAE da locação.
  {
    const out = await fetchDeterministicGrounding({ regime: "lucro_presumido", cnae: "6810-2", today: TODAY });
    const checks: Check[] = [
      { desc: "CGIBS Art. 360 presente (locacao — ver BUG-3 #1245: via universal)", pass: hasCgibsArt(out, "Art. 360"), type: "MUST" },
      { desc: "CGIBS Art. 379 presente (locacao — ver BUG-3 #1245: via universal)", pass: hasCgibsArt(out, "Art. 379"), type: "MUST" },
      { desc: "CGIBS Art. 359 presente (regime_especifico_imoveis)", pass: hasCgibsArt(out, "Art. 359"), type: "MUST" },
      { desc: "CGIBS Art. 28 presente (split_payment)", pass: hasCgibsArt(out, "Art. 28"), type: "MUST" },
      { desc: "Portaria 7 Art. 1 presente", pass: hasPortariaArt(out, "Art. 1"), type: "MUST" },
      { desc: "Decreto 12.955 presente", pass: countDecreto(out) > 0, type: "MUST" },
      { desc: "Art. 234 ausente (reabilitacao_urbana — gate CNAE)", pass: !hasCgibsArt(out, "Art. 234"), type: "MUST_NOT" },
      { desc: "Art. 233 ausente (transporte — gate CNAE)", pass: !hasCgibsArt(out, "Art. 233"), type: "MUST_NOT" },
    ];
    reports.push({ id: "P6", title: "Locação de imóveis", cnae: "6810-2", regime: "lucro_presumido",
      stats: { cgibs: countCgibs(out), decreto: countDecreto(out), portaria: countPortaria(out), chars: out.length },
      checks, pass: checks.filter(c => c.type !== "FINDING").every(c => c.pass) });
  }

  // N1 — Comércio puro · 4711-3 · lucro_presumido
  {
    const out = await fetchDeterministicGrounding({ regime: "lucro_presumido", cnae: "4711-3", today: TODAY });
    const checks: Check[] = [
      { desc: "Arts. 238-244 ausentes (produtor_rural — gate CNAE)", pass: !hasCgibsArt(out, "Art. 238") && !hasCgibsArt(out, "Art. 244"), type: "MUST_NOT" },
      { desc: "Art. 233 ausente (transporte — gate CNAE)", pass: !hasCgibsArt(out, "Art. 233"), type: "MUST_NOT" },
      { desc: "Art. 234 ausente (reabilitacao_urbana — gate CNAE)", pass: !hasCgibsArt(out, "Art. 234"), type: "MUST_NOT" },
      { desc: "Art. 359 PRESENTE (FINDING BUG-3 #1245)", pass: hasCgibsArt(out, "Art. 359"), type: "FINDING" },
      { desc: "Art. 202 PRESENTE (FINDING BUG-1 #1244)", pass: hasCgibsArt(out, "Art. 202"), type: "FINDING" },
      { desc: "split_payment presente (Art. 28)", pass: hasCgibsArt(out, "Art. 28"), type: "MUST" },
      { desc: "Decreto presente", pass: countDecreto(out) > 0, type: "MUST" },
      { desc: "Portaria presente", pass: countPortaria(out) > 0, type: "MUST" },
    ];
    reports.push({ id: "N1", title: "Comércio puro (negativo)", cnae: "4711-3", regime: "lucro_presumido",
      stats: { cgibs: countCgibs(out), decreto: countDecreto(out), portaria: countPortaria(out), chars: out.length },
      checks, pass: checks.filter(c => c.type !== "FINDING").every(c => c.pass) });
  }

  // N2 — Engenharia · 7111-1 · lucro_presumido
  {
    const out = await fetchDeterministicGrounding({ regime: "lucro_presumido", cnae: "7111-1", today: TODAY });
    const checks: Check[] = [
      { desc: "Art. 234 ausente (reabilitacao_urbana — gate CNAE)", pass: !hasCgibsArt(out, "Art. 234"), type: "MUST_NOT" },
      { desc: "Art. 233 ausente (transporte — gate CNAE)", pass: !hasCgibsArt(out, "Art. 233"), type: "MUST_NOT" },
      // NOTA: NÃO se pode assertar "Art. 200/201/202 ausente" para 7111-1 — são universais via
      // reduzida_60/zero (sem cnae_codes, #1219) + legada (BUG-1 #1244). O gate de reduzida_30 (0114)
      // é, portanto, inobservável no negativo enquanto #1219/#1244 existirem.
      { desc: "Art. 359 PRESENTE (FINDING BUG-3 #1245)", pass: hasCgibsArt(out, "Art. 359"), type: "FINDING" },
      { desc: "Art. 202 PRESENTE (FINDING BUG-1 #1244: legada universal)", pass: hasCgibsArt(out, "Art. 202"), type: "FINDING" },
      { desc: "split_payment presente (Art. 28)", pass: hasCgibsArt(out, "Art. 28"), type: "MUST" },
      { desc: "Decreto presente", pass: countDecreto(out) > 0, type: "MUST" },
      { desc: "Portaria presente", pass: countPortaria(out) > 0, type: "MUST" },
    ];
    reports.push({ id: "N2", title: "Engenharia (negativo)", cnae: "7111-1", regime: "lucro_presumido",
      stats: { cgibs: countCgibs(out), decreto: countDecreto(out), portaria: countPortaria(out), chars: out.length },
      checks, pass: checks.filter(c => c.type !== "FINDING").every(c => c.pass) });
  }

  // N3 — Vigência 2027 · 3811-4 · lucro_real
  {
    const out = await fetchDeterministicGrounding({ regime: "lucro_real", cnae: "3811-4", today: TODAY });
    const checks: Check[] = [
      { desc: "Art. 256 ausente (reciclagem — vigência 2027)", pass: !hasCgibsArt(out, "Art. 256"), type: "MUST_NOT" },
      { desc: "Art. 257 ausente (reciclagem — vigência 2027)", pass: !hasCgibsArt(out, "Art. 257"), type: "MUST_NOT" },
      { desc: "Art. 258 ausente (bens_usados — vigência 2027)", pass: !hasCgibsArt(out, "Art. 258"), type: "MUST_NOT" },
      { desc: "split_payment presente (Art. 28)", pass: hasCgibsArt(out, "Art. 28"), type: "MUST" },
      { desc: "Decreto presente", pass: countDecreto(out) > 0, type: "MUST" },
      { desc: "Portaria presente", pass: countPortaria(out) > 0, type: "MUST" },
    ];
    reports.push({ id: "N3", title: "Vigência 2027 (negativo)", cnae: "3811-4", regime: "lucro_real",
      stats: { cgibs: countCgibs(out), decreto: countDecreto(out), portaria: countPortaria(out), chars: out.length },
      checks, pass: checks.filter(c => c.type !== "FINDING").every(c => c.pass) });
  }

  // ── SMOKE FINAL — Invariantes globais ──
  const smokeChecks: Check[] = [];
  const nonSN = reports.filter(r => r.regime !== "simples_nacional");
  smokeChecks.push({ desc: "Grounding multicamada: todos não-SN têm CGIBS + Decreto + Portaria",
    pass: nonSN.every(r => r.stats.cgibs > 0 && r.stats.decreto > 0 && r.stats.portaria > 0), type: "MUST" });
  smokeChecks.push({ desc: "Portaria 7 presente em todos os perfis (SN e não-SN)",
    pass: reports.every(r => r.stats.portaria > 0), type: "MUST" });
  smokeChecks.push({ desc: "Header CGIBS: SN=0 tags, não-SN>0 tags",
    pass: reports.filter(r => r.regime === "simples_nacional").every(r => r.stats.cgibs === 0) && nonSN.every(r => r.stats.cgibs > 0), type: "MUST" });
  smokeChecks.push({ desc: "Sem ranges gigantes: nenhum perfil > 200 tags CGIBS",
    pass: reports.every(r => r.stats.cgibs <= 200), type: "MUST" });
  let cooperativasFound = false;
  for (const r of reports) {
    const out = await fetchDeterministicGrounding({ regime: r.regime, cnae: r.cnae, today: TODAY });
    for (let i = 391; i <= 396; i++) { if (hasCgibsArt(out, `Art. ${i}`)) { cooperativasFound = true; break; } }
    if (cooperativasFound) break;
  }
  smokeChecks.push({ desc: "Arts. 391-396 (cooperativas) nunca aparecem em nenhum perfil", pass: !cooperativasFound, type: "MUST" });

  // ── OUTPUT ──
  console.log("════════════════════════════════════════════════════════════════════");
  console.log("  GROUNDING SMOKE V3 — montagem determinística IBS/CBS/CGIBS (input do LLM)");
  console.log("  Data: 2026-05-25 | gates CNAE + vigência + Portaria 7 | NÃO testa consumo (SUG-1 #1220)");
  console.log("════════════════════════════════════════════════════════════════════\n");

  let totalMust = 0, totalMustPass = 0, totalFindings = 0;
  for (const r of reports) {
    console.log(`${r.id} ${r.pass ? "✅ PASS" : "❌ FAIL"} — ${r.title} (${r.cnae}) [${r.regime}]`);
    console.log(`   Stats: CGIBS=${r.stats.cgibs} | Decreto=${r.stats.decreto} | Portaria=${r.stats.portaria} | ${r.stats.chars} chars`);
    for (const c of r.checks) {
      if (c.type === "FINDING") { console.log(`   ⚠️  FINDING: ${c.desc} → ${c.pass ? "confirmado" : "NÃO confirmado"}`); totalFindings++; }
      else if (!c.pass) console.log(`   ❌ FAIL: ${c.desc}`);
    }
    const mustChecks = r.checks.filter(c => c.type !== "FINDING");
    totalMust += mustChecks.length; totalMustPass += mustChecks.filter(c => c.pass).length;
    console.log("");
  }
  console.log("── SMOKE FINAL (Invariantes) ──");
  for (const s of smokeChecks) { console.log(`${s.pass ? "✅" : "❌"} ${s.desc}`); totalMust++; if (s.pass) totalMustPass++; }

  const allProfilesPass = reports.every(r => r.pass);
  const allSmokePass = smokeChecks.every(s => s.pass);
  const verdict = allProfilesPass && allSmokePass ? "🟢 montagem OK" : "🔴 REPROVADO";
  console.log("\n════════════════════════════════════════════════════════════════════");
  console.log(`  PERFIS: ${reports.filter(r => r.pass).length}/${reports.length} PASS`);
  console.log(`  ASSERTIONS (MUST/MUST_NOT): ${totalMustPass}/${totalMust} PASS`);
  console.log(`  FINDINGS (BUG-1 #1244 / BUG-3 #1245): ${totalFindings}`);
  console.log(`  SMOKE FINAL: ${smokeChecks.filter(s => s.pass).length}/${smokeChecks.length} PASS`);
  console.log(`  VEREDITO (montagem, não consumo): ${verdict}`);
  console.log("════════════════════════════════════════════════════════════════════");

  const evidence = {
    timestamp: new Date().toISOString(), today: "2026-05-25",
    scope: "montagem do grounding (input do LLM); NÃO consumo end-to-end (SUG-1 #1220)",
    execution_context: "tsx local → DATABASE_URL (banco de produção)",
    profiles: reports, smoke_final: smokeChecks,
    summary: {
      profiles_pass: `${reports.filter(r => r.pass).length}/${reports.length}`,
      assertions_pass: `${totalMustPass}/${totalMust}`,
      findings: totalFindings, smoke_pass: `${smokeChecks.filter(s => s.pass).length}/${smokeChecks.length}`, verdict,
    },
  };
  writeFileSync(OUT, JSON.stringify(evidence, null, 2));
  console.log(`\nEvidência salva em ${OUT}`);
  process.exit(allProfilesPass && allSmokePass ? 0 : 1);
}

run();
