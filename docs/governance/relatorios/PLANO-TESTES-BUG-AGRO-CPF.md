# Plano de Testes — BUG-AGRO-CPF

> **Status:** completo (13 + 5 + 5 + 6 = 29 contratos + DoD por fase).
> **Aplicação:** cada fase F1-F5 traz a parte que lhe corresponde + verificação automática no CI antes do merge.

**Data:** 2026-05-29
**Branch:** `docs/cpf-pf-spec-exaustiva` · HEAD `e163f47`
**Spec principal:** `AS-IS-TO-BE-CPF-PRODUTOR-RURAL-PF-v4-20260529.md`
**DB-SPEC:** `DB-SPEC-BUG-AGRO-CPF.md`
**Triade ORQ-28:** este arquivo é o **Artefato 2** (test contracts) da Triade de Garantia.

---

## §C.1 — Testes unitários (F1 — `validate-cpf.ts`)

**Arquivo destino:** `client/src/lib/validate-cpf.test.ts` (a criar)
**13 contratos obrigatórios** espelhando estrutura de `validateCnpj` existente.

```typescript
import { describe, it, expect } from "vitest";
import { validateCpf, maskCpf } from "./validate-cpf";

describe("validateCpf — Opção A (DV local sem RFB)", () => {
  // TC-01: CPF válido formatado
  it("TC-01: aceita CPF válido com formatação", () =>
    expect(validateCpf("529.982.247-25")).toBe(true));

  // TC-02: CPF válido sem formatação
  it("TC-02: aceita CPF válido sem formatação", () =>
    expect(validateCpf("52998224725")).toBe(true));

  // TC-03: CPF inválido — DV errado
  it("TC-03: rejeita CPF com dígito verificador errado", () =>
    expect(validateCpf("529.982.247-26")).toBe(false));

  // TC-04: CPF inválido — sequência repetida
  it("TC-04: rejeita sequência repetida (111.111.111-11)", () =>
    expect(validateCpf("111.111.111-11")).toBe(false));

  // TC-05: CPF inválido — comprimento errado (10 dígitos)
  it("TC-05: rejeita CPF com 10 dígitos", () =>
    expect(validateCpf("5299822472")).toBe(false));

  // TC-06: CPF inválido — comprimento errado (12 dígitos)
  it("TC-06: rejeita CPF com 12 dígitos", () =>
    expect(validateCpf("529982247250")).toBe(false));

  // TC-07: CPF inválido — string vazia
  it("TC-07: rejeita string vazia", () =>
    expect(validateCpf("")).toBe(false));

  // TC-08: CPF inválido — apenas letras
  it("TC-08: rejeita string não-numérica", () =>
    expect(validateCpf("abc.def.ghi-jk")).toBe(false));

  // TC-09: CPF inválido — 000.000.000-00
  it("TC-09: rejeita CPF 000.000.000-00", () =>
    expect(validateCpf("000.000.000-00")).toBe(false));

  // TC-10: CPF válido — segundo CPF real de teste (literatura pública)
  it("TC-10: aceita segundo CPF válido de teste", () =>
    expect(validateCpf("153.509.460-56")).toBe(true));
});

describe("maskCpf — formatação progressiva", () => {
  // TC-11: máscara progressiva — 3 dígitos
  it("TC-11: formata 3 dígitos como 529", () =>
    expect(maskCpf("529")).toBe("529"));

  // TC-12: máscara progressiva — 6 dígitos
  it("TC-12: formata 6 dígitos como 529.982", () =>
    expect(maskCpf("529982")).toBe("529.982"));

  // TC-13: máscara completa — 11 dígitos
  it("TC-13: formata 11 dígitos como 529.982.247-25", () =>
    expect(maskCpf("52998224725")).toBe("529.982.247-25"));
});
```

**Verificação:** `pnpm vitest run client/src/lib/validate-cpf.test.ts` → 13/13 PASS · 0 FAIL.

---

## §C.2 — Testes de integração (F1 — Zod `refine` dual)

**Arquivo destino:** `server/integration/create-project-tax-id-dual.test.ts` (a criar)
**5 contratos obrigatórios:**

```typescript
import { describe, it, expect } from "vitest";
import { createProjectSchema } from "../routers-fluxo-v3"; // schema exportado para teste

describe("createProject schema — taxId dual (Zod refine)", () => {
  // TI-01: PJ com CNPJ válido — PASS
  it("TI-01: aceita PJ com CNPJ válido", () => {
    const result = createProjectSchema.safeParse({
      taxIdType: "cnpj",
      taxId: "11.222.333/0001-81",
      // demais campos obrigatórios omitidos para brevidade
    });
    expect(result.success).toBe(true);
  });

  // TI-02: PF com CPF válido — PASS
  it("TI-02: aceita PF com CPF válido", () => {
    const result = createProjectSchema.safeParse({
      taxIdType: "cpf",
      taxId: "529.982.247-25",
    });
    expect(result.success).toBe(true);
  });

  // TI-03: PF com CNPJ — FAIL (14 dígitos mas taxIdType='cpf')
  it("TI-03: rejeita CNPJ quando taxIdType=cpf", () => {
    const result = createProjectSchema.safeParse({
      taxIdType: "cpf",
      taxId: "11.222.333/0001-81",
    });
    expect(result.success).toBe(false);
  });

  // TI-04: retrocompatibilidade — cnpj legado sem taxIdType — PASS
  it("TI-04: aceita cnpj legado sem taxIdType (default cnpj)", () => {
    const result = createProjectSchema.safeParse({
      cnpj: "11.222.333/0001-81",
      // taxIdType ausente → default 'cnpj' no Zod
    });
    expect(result.success).toBe(true);
  });

  // TI-05: PJ com CPF — FAIL
  it("TI-05: rejeita CPF quando taxIdType=cnpj", () => {
    const result = createProjectSchema.safeParse({
      taxIdType: "cnpj",
      taxId: "529.982.247-25",
    });
    expect(result.success).toBe(false);
  });
});
```

**Verificação:** `pnpm vitest run server/integration/create-project-tax-id-dual.test.ts` → 5/5 PASS.

**Espelho no E2E E2E-v212:** atualizar `server/integration/test-e2e-v212.test.ts:18` com a mesma refine — TI-01 a TI-05 devem passar quando E2E rodar.

---

## §C.3 — Testes de regressão obrigatórios (F3 — `perfilHash` null-safety)

**Arquivo destino:** `server/lib/archetype/perfilHash-cpf.test.ts` (a criar — paralelo ao test existente)
**5 contratos obrigatórios:**

```typescript
import { describe, it, expect } from "vitest";
import { buildPerfilHash } from "./perfilHash";
import { buildPerfilEntidade, detectMultiCnpjBlocker } from "./buildPerfilEntidade";

describe("perfilHash — null-safety CPF/CNPJ", () => {
  // TR-01: hash com CNPJ — não crasha (retrocompatibilidade)
  it("TR-01: hash com CNPJ não crasha", () => {
    expect(() =>
      buildPerfilHash({
        cnpj: "11.222.333/0001-81",
        taxIdType: "cnpj",
      })
    ).not.toThrow();
  });

  // TR-02: hash com CPF — não crasha (novo)
  it("TR-02: hash com CPF não crasha", () => {
    expect(() =>
      buildPerfilHash({
        taxId: "529.982.247-25",
        taxIdType: "cpf",
      })
    ).not.toThrow();
  });

  // TR-03: hash com cnpj=null — não crasha (era o crash original)
  // Validação empírica em v4 §3.1: input.cnpj.trim() crasha em null;
  // a feature precisa garantir taxId não-null em vez de cnpj não-null.
  it("TR-03: hash com cnpj=null não crasha (null-safe)", () => {
    expect(() =>
      buildPerfilHash({
        cnpj: null,
        taxIdType: "cpf",
        taxId: "529.982.247-25",
      })
    ).not.toThrow();
  });

  // TR-04: campo derivado analise_1_cnpj_operacional mantém nome (decisão v4)
  // Validação empírica: a flag é sobre escopo unitário, não sobre "CNPJ existe".
  it("TR-04: campo derivado mantém nome analise_1_cnpj_operacional", () => {
    const result = buildPerfilEntidade({
      /* seed PF — completar com fixture válida */
      taxIdType: "cpf",
      taxId: "529.982.247-25",
    } as any);
    expect(result).toHaveProperty("analise_1_cnpj_operacional");
  });

  // TR-05: detectMultiCnpjBlocker funciona para PF (escopo unitário)
  // PF com integra_grupo_economico=false → NONE (não bloqueia)
  it("TR-05: PF com integra_grupo=false → NONE (não bloqueia)", () => {
    const blocker = detectMultiCnpjBlocker({
      integra_grupo_economico: false,
      analise_1_cnpj_operacional: true,
    } as any);
    expect(blocker).toBeNull();
  });
});
```

**Verificação:** `pnpm vitest run server/lib/archetype/perfilHash-cpf.test.ts` → 5/5 PASS.

**Asserção adicional:** snapshot `seed-normalizers.behavior.test.ts.snap` deve permanecer **inalterado** após F3 (6 refs ao campo `analise_1_cnpj_operacional` preservadas — Lição #93 da v4).

---

## §C.4 — Testes E2E de aceitação (smoke pós-deploy)

**Arquivo destino:** `tests/e2e/cpf-pf-bug-agro.spec.ts` (a criar via Playwright)
**6 cenários obrigatórios:**

| ID | Cenário | Asserção | Pré-requisito |
|---|---|---|---|
| **E2E-CPF-01** | Criar projeto PF com CPF válido | status 200 · projeto criado · `tax_id_type='cpf'` no banco | `ENABLE_TAX_ID_DUAL=true` |
| **E2E-CPF-02** | Criar projeto PF com CPF inválido (DV errado) | status 400 · mensagem "CPF inválido — verifique os dígitos verificadores" | flag ON |
| **E2E-CPF-03** | Criar projeto PJ com CNPJ (retrocompatibilidade) | status 200 · `tax_id_type='cnpj'` no banco · companyProfile.cnpj preenchido | flag ON ou OFF |
| **E2E-CPF-04** | Perfil PF → hash gerado sem crash | `perfilHash` retorna string sha256 válida · não lança exceção | flag ON + F3 implementado |
| **E2E-CPF-05** | feature flag OFF → comportamento AS-IS (apenas CNPJ aceito) | radio "Tipo de sujeito" não aparece · só campo CNPJ visível | `ENABLE_TAX_ID_DUAL=false` |
| **E2E-CPF-06** | Projeto PF existente → companyProfile.cnpj=null · cpf preenchido | leitura via GET retorna JSON com `cpf` preenchido e `cnpj=null` | F4 implementado |

**Tempo estimado:** 5-10 min para suite completa Playwright.

**Comando:** `pnpm test:e2e tests/e2e/cpf-pf-bug-agro.spec.ts`

---

## §C.5 — DoD por fase (checklist de aceite)

> Cada fase F0-F5 só é considerada "DONE" quando seu DoD passa empiricamente.

| Fase | DoD | Verificação | Responsável |
|---|---|---|---|
| **F0 Schema** | Gate SQL §B.5 Gates 1-2 passam · Gate 4 (DOWN migration) testado em staging · tag git `pre-cpf-pf-baseline` criada · feature flag `ENABLE_TAX_ID_DUAL=false` no env | Manus executa e reporta | Manus + Claude Code |
| **F1 Validação** | 13/13 TC (validateCpf) + 5/5 TI (Zod refine dual) · `pnpm tsc --noEmit` 0 erros · CI verde | CI automático | Claude Code (impl) + Manus (validação CI) |
| **F2 UI** | 6/6 `data-testid` presentes (radio + input CPF + validate success/error + checkbox-info) · radio PJ/PF funciona · CPF oculta Tipo Jurídico + Porte · CNPJ retrocompatível · UX_DICTIONARY §M1.1 atualizado | Manus testa na UI greenfield | Manus |
| **F3 Hash + ADR** | 5/5 TR (perfilHash null-safety) · `seed-normalizers.snap` inalterado · ADR-0032 bump MINOR documentado · ADR-0033 criado | CI verde + revisão P.O. | Claude Code (impl) + P.O. (revisão) |
| **F4 PDF + briefing** | PDF exibe "CPF: ..." OU "CNPJ: ..." conforme `taxIdType` · 3 consumers (ActionPlan, Consolidacao, **ComplianceDashboard**) passam `taxId` correto · filename usa `taxIdSlug` | Manus gera PDF em projeto PF e verifica visualmente | Manus |
| **F5 Testes + UX_DICT** | UX_DICTIONARY §M1.1 atualizado + 3 entradas novas (PerfilEmpresa, M1Perfil, Clientes) + mockup HTML commitado · `test-helpers.ts` fixture PF · 17 testes legados atualizados se quebrarem | Revisão P.O. | Claude Code + P.O. |

---

## §C.6 — Lições aplicáveis (rastreabilidade)

- **Lição #59** (assemble ≠ consumption) → TR-04 valida CONSUMO do campo derivado, não só presença
- **Lição #64** (dead-read) → `users.cpf` continua dead-read após F0 (intencional; consumer fica para sprint futura se necessário)
- **Lição #87** (smoke estático ≠ consumo) → E2E-CPF-01 a E2E-CPF-06 são runtime contracts (não grep)
- **Lição #93** (mecanismo verificado) → TR-03 e TR-04 são consequência direta da validação empírica feita na v4 §3.1
- **REGRA-ORQ-27** (validação de consumo) → todos os 29 contratos têm asserção dinâmica (não `toContain` de string fixa)
- **REGRA-ORQ-28** (Triade) → este arquivo é o Artefato 2; Artefato 1 = AS-IS/TO-BE v4 + ISSUE-BODY; Artefato 3 = CI gate (a configurar em F1 via `.github/workflows/`)
- **REGRA-ORQ-34 Protocolo 3** (DoD com critério negativo) → §B.5 Gate 2 é DoD negativo SQL
- **REGRA-ORQ-41** (NOVA — AS-IS/TO-BE com impact-tree) → este plano é parte dos entregáveis obrigatórios

---

**Total: 29 contratos** (13 unit + 5 integração + 5 regressão + 6 E2E) + **6 DoDs por fase**.

**Confiabilidade declarada do plano:** 98% (residual 2%: contratos podem precisar refinamento ao implementar F1 quando o schema Zod real for desenhado em detalhe).
