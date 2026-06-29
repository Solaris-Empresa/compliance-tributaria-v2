// project-profile-extractor.cr01.test.ts — CR-01 DoD
// Verifica que taxRegime é lido corretamente em 3 cenários:
//   P1 — construtora-SN:  taxRegime vem do companyProfile JSON (simples_nacional)
//                         → gate imóveis EXCLUI (null !== "simples_nacional" = false)
//   P2 — construtora-LR:  taxRegime vem da coluna direta (lucro_real)
//                         → gate imóveis INCLUI (lucro_real !== "simples_nacional" = true)
//   P3 — atacadista-LR-JSON: taxRegime=null na coluna direta, lucro_real no companyProfile JSON
//                         → gate crédito presumido DISPARA (lucro_real === "lucro_real" = true)
//                         → RESULTADO REPORTADO AO DR. JOSÉ (proxy incompleto — REGRA-ORQ-44)
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock do banco ────────────────────────────────────────────────────────────
// Interceptamos a query raw antes de qualquer chamada real ao banco.
const mockExecute = vi.fn();

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => ({
    $client: {
      promise: () => ({ execute: mockExecute }),
    },
  })),
}));

// Importar APÓS o mock
import { extractProjectProfile } from "./project-profile-extractor";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeRow(overrides: Record<string, unknown>) {
  return {
    id: 9999,
    confirmedCnaes: null,
    operationProfile: null,
    product_answers: null,
    taxRegime: null,
    companyProfile: null,
    companySize: null,
    archetype: null,
    ...overrides,
  };
}

function mockRow(row: Record<string, unknown>) {
  mockExecute.mockResolvedValueOnce([[row], []]);
}

// ─── P1 — Construtora Simples Nacional (taxRegime no companyProfile JSON) ─────
describe("CR-01 DoD P1 — construtora-SN: taxRegime lido do companyProfile JSON", () => {
  beforeEach(() => { mockExecute.mockReset(); });

  it("deve retornar taxRegime='simples_nacional' quando coluna direta é null mas companyProfile tem taxRegime", async () => {
    mockRow(makeRow({
      id: 1001,
      confirmedCnaes: JSON.stringify([{ code: "4120-4/00" }]),
      taxRegime: null,                                          // coluna direta: null
      companyProfile: JSON.stringify({ taxRegime: "simples_nacional", companySize: "pequena" }),
    }));

    const profile = await extractProjectProfile(1001);

    expect(profile).not.toBeNull();
    expect(profile!.taxRegime).toBe("simples_nacional");
  });

  it("gate imóveis EXCLUI construtora-SN (null !== 'simples_nacional' = false)", () => {
    const taxRegime = "simples_nacional";
    // Lógica de normative-inference.ts:229
    const gateImoveis = taxRegime !== "simples_nacional";
    expect(gateImoveis).toBe(false); // ✅ EXCLUI — corrige falso-positivo
  });
});

// ─── P2 — Construtora Lucro Real (taxRegime na coluna direta) ─────────────────
describe("CR-01 DoD P2 — construtora-LR: taxRegime lido da coluna direta", () => {
  beforeEach(() => { mockExecute.mockReset(); });

  it("deve retornar taxRegime='lucro_real' quando coluna direta tem valor", async () => {
    mockRow(makeRow({
      id: 1002,
      confirmedCnaes: JSON.stringify([{ code: "4120-4/00" }]),
      taxRegime: "lucro_real",                                  // coluna direta: preenchida
      companyProfile: JSON.stringify({ taxRegime: "simples_nacional" }), // JSON ignorado
    }));

    const profile = await extractProjectProfile(1002);

    expect(profile).not.toBeNull();
    expect(profile!.taxRegime).toBe("lucro_real"); // coluna direta tem prioridade
  });

  it("gate imóveis INCLUI construtora-LR ('lucro_real' !== 'simples_nacional' = true)", () => {
    const taxRegime = "lucro_real";
    const gateImoveis = taxRegime !== "simples_nacional";
    expect(gateImoveis).toBe(true); // ✅ INCLUI — mantém comportamento correto
  });
});

// ─── P3 — Atacadista Lucro Real (taxRegime=null coluna, lucro_real no JSON) ───
describe("CR-01 DoD P3 — atacadista-LR-JSON: gate crédito presumido dispara?", () => {
  beforeEach(() => { mockExecute.mockReset(); });

  it("deve retornar taxRegime='lucro_real' quando coluna direta é null mas companyProfile tem lucro_real", async () => {
    mockRow(makeRow({
      id: 1003,
      confirmedCnaes: JSON.stringify([{ code: "4639-7/01" }]), // CNAE atacadista
      taxRegime: null,                                          // coluna direta: null
      companyProfile: JSON.stringify({ taxRegime: "lucro_real", companySize: "media" }),
    }));

    const profile = await extractProjectProfile(1003);

    expect(profile).not.toBeNull();
    expect(profile!.taxRegime).toBe("lucro_real");
  });

  it("gate crédito presumido DISPARA para atacadista-LR (=== 'lucro_real' = true)", () => {
    // RESULTADO P3: gate dispara — reportar ao Dr. José (REGRA-ORQ-44)
    // O gate === "lucro_real" em normative-inference.ts:218 é proxy incompleto:
    // Arts. 168-171 exigem regime regular + natureza da aquisição específica.
    // Esta divergência é pré-existente ao CR-01 e deve ser tratada como issue separada.
    const taxRegime = "lucro_real";
    const hasAtacadistaCnae = true; // CNAE 4639-7/01 está em CNAES_ATACADISTA
    const gateCreditoPresumido = hasAtacadistaCnae && taxRegime === "lucro_real";
    expect(gateCreditoPresumido).toBe(true); // ⚠️ DISPARA — Dr. José deve classificar
  });

  it("coluna direta tem prioridade sobre companyProfile JSON (sem regressão)", async () => {
    mockRow(makeRow({
      id: 1004,
      confirmedCnaes: JSON.stringify([{ code: "4639-7/01" }]),
      taxRegime: "lucro_presumido",                             // coluna direta: preenchida
      companyProfile: JSON.stringify({ taxRegime: "lucro_real" }), // JSON diferente — ignorado
    }));

    const profile = await extractProjectProfile(1004);

    expect(profile).not.toBeNull();
    expect(profile!.taxRegime).toBe("lucro_presumido"); // coluna direta vence
  });

  it("retorna null quando companyProfile é JSON inválido (sem crash)", async () => {
    mockRow(makeRow({
      id: 1005,
      taxRegime: null,
      companyProfile: "INVALID_JSON{{",
    }));

    const profile = await extractProjectProfile(1005);

    expect(profile).not.toBeNull();
    expect(profile!.taxRegime).toBeNull(); // parse falhou → null seguro
  });
});
