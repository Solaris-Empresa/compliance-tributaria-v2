/**
 * TESTE E2E v2.1.2 — Perfil da Empresa Obrigatório
 * Prova ponta a ponta:
 *   1. Frontend envia payload completo → backend recebe → banco grava
 *   2. Frontend envia payload incompleto → backend rejeita (Zod)
 *   3. Banco confirma dados gravados (JSON columns)
 *   4. getProjectById retorna os campos (reload mantém)
 *
 * PO: Uires Tapajós | branch: fix/v2.1-company-profile-required
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { z } from "zod";
import * as db from "../db";

// ─── Zod schema idêntico ao do router (reproduzido para teste isolado) ───────
// BUG-AGRO-CPF F1 (#1290) — espelho do refine dual em routers-fluxo-v3.ts.
// cnpj agora é opcional · refine no objeto deriva taxId de cnpj/cpf conforme taxIdType.
// Retrocompat F1↔F2: payload legacy sem taxId/taxIdType continua validando via cnpj.
const companyProfileSchema = z.object({
  cnpj: z.string().optional(), // deprecated — retrocompat F1↔F2 (era min(14) em F0)
  companyType: z.enum(["ltda", "sa", "mei", "eireli", "scp", "cooperativa", "outro"]),
  companySize: z.enum(["mei", "micro", "pequena", "media", "grande"]),
  taxRegime: z.enum(["simples_nacional", "lucro_presumido", "lucro_real"]),
  foundingYear: z.number().optional(),
  stateUF: z.string().optional(),
  employeeCount: z.string().optional(),
  annualRevenueRange: z.enum(["ate_360k", "360k_4_8m", "4_8m_78m", "acima_78m"]).optional(),
  // BUG-AGRO-CPF F1 (#1290) — identidade fiscal dual
  cpf: z.string().optional(),
  taxIdType: z.enum(["cnpj", "cpf"]).default("cnpj"),
  taxId: z.string().optional(),
}).refine(
  (data) => {
    const taxId = data.taxId ?? (data.taxIdType === "cpf" ? data.cpf : data.cnpj);
    if (!taxId) return false;
    const d = taxId.replace(/\D/g, "");
    return d.length === 11 || d.length === 14;
  },
  {
    message: "Documento inválido — CPF (11 dígitos) ou CNPJ (14 dígitos)",
    path: ["taxId"],
  },
);

const operationProfileSchema = z.object({
  operationType: z.enum(["produto", "servico", "misto"]),
  clientType: z.array(z.string()).min(1, "Selecione pelo menos 1 tipo de cliente"),
  multiState: z.boolean(),
  geographicScope: z.string().optional(),
});

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(50),
  clientId: z.number(),
  companyProfile: companyProfileSchema,
  operationProfile: operationProfileSchema,
  taxComplexity: z.object({
    hasMultipleEstablishments: z.boolean().optional(),
    hasImportExport: z.boolean().optional(),
    hasSpecialRegimes: z.boolean().optional(),
  }).optional(),
  financialProfile: z.object({
    paymentMethods: z.array(z.string()).optional(),
    hasIntermediaries: z.boolean().optional(),
  }).optional(),
  governanceProfile: z.object({
    hasTaxTeam: z.boolean().optional(),
    hasAudit: z.boolean().optional(),
    hasTaxIssues: z.boolean().optional(),
  }).optional(),
});

// ─── Payload COMPLETO (deve ser aceito) ──────────────────────────────────────
const VALID_PAYLOAD = {
  name: "Projeto E2E v2.1.2 — Teste Completo",
  description: "Empresa de tecnologia SaaS para validação E2E do Company Profile obrigatório na v2.1.2 da plataforma de compliance tributário.",
  clientId: 1,
  companyProfile: {
    cnpj: "11.222.333/0001-81",
    companyType: "ltda" as const,
    companySize: "media" as const,
    taxRegime: "lucro_presumido" as const,
    foundingYear: 2018,
    stateUF: "SP",
    employeeCount: "51-200",
    annualRevenueRange: "4_8m_78m" as const,
  },
  operationProfile: {
    operationType: "servico" as const,
    clientType: ["B2B", "B2C"],
    multiState: true,
    geographicScope: "nacional",
  },
  taxComplexity: {
    hasMultipleEstablishments: false,
    hasImportExport: false,
    hasSpecialRegimes: false,
  },
  financialProfile: {
    paymentMethods: ["pix", "cartao_credito"],
    hasIntermediaries: false,
  },
  governanceProfile: {
    hasTaxTeam: true,
    hasAudit: false,
    hasTaxIssues: false,
  },
};

// ─── Payloads INVÁLIDOS (devem ser rejeitados) ────────────────────────────────
const PAYLOAD_SEM_CNPJ = {
  ...VALID_PAYLOAD,
  companyProfile: { ...VALID_PAYLOAD.companyProfile, cnpj: "" },
};

const PAYLOAD_SEM_COMPANY_TYPE = {
  ...VALID_PAYLOAD,
  companyProfile: { ...VALID_PAYLOAD.companyProfile, companyType: undefined as any },
};

const PAYLOAD_SEM_TAX_REGIME = {
  ...VALID_PAYLOAD,
  companyProfile: { ...VALID_PAYLOAD.companyProfile, taxRegime: undefined as any },
};

const PAYLOAD_SEM_OPERATION_TYPE = {
  ...VALID_PAYLOAD,
  operationProfile: { ...VALID_PAYLOAD.operationProfile, operationType: undefined as any },
};

const PAYLOAD_SEM_CLIENT_TYPE = {
  ...VALID_PAYLOAD,
  operationProfile: { ...VALID_PAYLOAD.operationProfile, clientType: [] },
};

const PAYLOAD_SEM_MULTI_STATE = {
  ...VALID_PAYLOAD,
  operationProfile: { ...VALID_PAYLOAD.operationProfile, multiState: undefined as any },
};

const PAYLOAD_SEM_COMPANY_PROFILE = {
  name: "Projeto sem Company Profile",
  description: "Tentativa de criar projeto sem preencher o Perfil da Empresa obrigatório.",
  clientId: 1,
  companyProfile: undefined as any,
  operationProfile: undefined as any,
};

// ─── Testes ───────────────────────────────────────────────────────────────────
let createdProjectId: number | null = null;

describe("v2.1.2 — Perfil da Empresa Obrigatório (E2E)", () => {

  // ── EVIDÊNCIA 3: Validação de CNPJ/CPF inválido (BUG-AGRO-CPF F1 #1290) ──────
  // Em F0, cnpj era min(14) — erro tinha path ["cnpj"]. Em F1, refine é no objeto
  // e erro tem path ["taxId"] (derivação automática). Asserção atualizada.
  describe("Evidência 3 — Validação de CNPJ/CPF inválido bloqueada", () => {
    it("rejeita CNPJ vazio", () => {
      const result = createProjectSchema.safeParse(PAYLOAD_SEM_CNPJ);
      expect(result.success).toBe(false);
      if (!result.success) {
        // F1: erro do refine tem path ["taxId"] (não mais "cnpj").
        // Aceita ambos os paths para retrocompat de leitura.
        const docError = result.error.issues.find(
          (i) => i.path.includes("taxId") || i.path.includes("cnpj")
        );
        expect(docError).toBeDefined();
        console.log("✅ Documento (CNPJ/CPF) vazio rejeitado:", docError?.message);
      }
    });
  });

  // ── EVIDÊNCIA 4: Payload rejeitado pelo backend (Zod) ────────────────────
  describe("Evidência 4 — Payload rejeitado pelo backend (Zod)", () => {
    it("rejeita payload sem companyType", () => {
      const result = createProjectSchema.safeParse(PAYLOAD_SEM_COMPANY_TYPE);
      expect(result.success).toBe(false);
      console.log("✅ Sem companyType rejeitado:", result.success === false ? "REJEITADO" : "ACEITO");
    });

    it("rejeita payload sem taxRegime", () => {
      const result = createProjectSchema.safeParse(PAYLOAD_SEM_TAX_REGIME);
      expect(result.success).toBe(false);
      console.log("✅ Sem taxRegime rejeitado:", result.success === false ? "REJEITADO" : "ACEITO");
    });

    it("rejeita payload sem operationType", () => {
      const result = createProjectSchema.safeParse(PAYLOAD_SEM_OPERATION_TYPE);
      expect(result.success).toBe(false);
      console.log("✅ Sem operationType rejeitado:", result.success === false ? "REJEITADO" : "ACEITO");
    });

    it("rejeita payload com clientType vazio", () => {
      const result = createProjectSchema.safeParse(PAYLOAD_SEM_CLIENT_TYPE);
      expect(result.success).toBe(false);
      console.log("✅ clientType vazio rejeitado:", result.success === false ? "REJEITADO" : "ACEITO");
    });

    it("rejeita payload sem multiState", () => {
      const result = createProjectSchema.safeParse(PAYLOAD_SEM_MULTI_STATE);
      expect(result.success).toBe(false);
      console.log("✅ Sem multiState rejeitado:", result.success === false ? "REJEITADO" : "ACEITO");
    });

    it("rejeita payload sem companyProfile inteiro", () => {
      const result = createProjectSchema.safeParse(PAYLOAD_SEM_COMPANY_PROFILE);
      expect(result.success).toBe(false);
      console.log("✅ Sem companyProfile rejeitado:", result.success === false ? "REJEITADO" : "ACEITO");
    });

    it("aceita payload completo e válido", () => {
      const result = createProjectSchema.safeParse(VALID_PAYLOAD);
      expect(result.success).toBe(true);
      console.log("✅ Payload completo ACEITO pelo Zod schema");
    });
  });

  // ── EVIDÊNCIA 5 + 6: Banco grava e reload mantém ─────────────────────────
  describe("Evidência 5 e 6 — Banco grava e reload mantém os dados", () => {
    it("grava projeto completo no banco com todos os campos JSON", async () => {
      const projectId = await db.createProject({
        name: VALID_PAYLOAD.name,
        description: VALID_PAYLOAD.description,
        clientId: VALID_PAYLOAD.clientId,
        status: "rascunho",
        createdById: 1,
        createdByRole: "equipe_solaris" as any,
        notificationFrequency: "semanal",
        currentStep: 1,
        companyProfile: VALID_PAYLOAD.companyProfile as any,
        operationProfile: VALID_PAYLOAD.operationProfile as any,
        taxComplexity: VALID_PAYLOAD.taxComplexity as any,
        financialProfile: VALID_PAYLOAD.financialProfile as any,
        governanceProfile: VALID_PAYLOAD.governanceProfile as any,
      } as any);

      expect(projectId).toBeGreaterThan(0);
      createdProjectId = projectId;
      console.log(`✅ Projeto criado no banco com ID: ${projectId}`);
    });

    it("getProjectById retorna companyProfile com todos os 7 campos obrigatórios", async () => {
      expect(createdProjectId).not.toBeNull();
      const project = await db.getProjectById(createdProjectId!);
      expect(project).toBeDefined();

      const cp = project!.companyProfile as any;
      const op = project!.operationProfile as any;

      // Evidência 5: campos gravados
      expect(cp).not.toBeNull();
      expect(cp.cnpj).toBe("11.222.333/0001-81");
      expect(cp.companyType).toBe("ltda");
      expect(cp.companySize).toBe("media");
      expect(cp.taxRegime).toBe("lucro_presumido");
      expect(op).not.toBeNull();
      expect(op.operationType).toBe("servico");
      expect(op.clientType).toContain("B2B");
      expect(op.multiState).toBe(true);

      // Evidência 6: reload mantém (dados persistidos e recuperados)
      console.log("✅ Evidência 5 — companyProfile gravado:", JSON.stringify(cp));
      console.log("✅ Evidência 6 — operationProfile gravado (reload):", JSON.stringify(op));
      console.log("✅ taxComplexity:", JSON.stringify(project!.taxComplexity));
      console.log("✅ financialProfile:", JSON.stringify(project!.financialProfile));
      console.log("✅ governanceProfile:", JSON.stringify(project!.governanceProfile));
    });
  });

  // ── Limpeza ───────────────────────────────────────────────────────────────
  afterAll(async () => {
    if (createdProjectId) {
      const dbConn = await db.getDb();
      if (dbConn) {
        const { projects } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        await dbConn.delete(projects).where(eq(projects.id, createdProjectId));
        console.log(`🧹 Projeto de teste ${createdProjectId} removido do banco`);
      }
    }
  });
});
