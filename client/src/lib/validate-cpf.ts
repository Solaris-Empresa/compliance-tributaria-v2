/**
 * validate-cpf.ts — Validação local de CPF (Opção A · sem integração RFB)
 *
 * BUG-AGRO-CPF F1 (#1290) — Pessoa Física para Art. 164 LC 214/2025.
 * Espelha estrutura de `validateCnpj` em PerfilEmpresaIntelligente.tsx:152.
 *
 * Algoritmo módulo 11 padrão Receita Federal (DV1 + DV2).
 * Pura, determinística, sem side effects, sem network.
 *
 * Tech debt P3 (decisão P.O. 29/05/2026): consulta RFB async não-bloqueante
 * (Opção C) em sprint futura — `cpf_status` em projects, job scheduler, etc.
 *
 * Spec: docs/governance/relatorios/PLANO-TESTES-BUG-AGRO-CPF.md §C.1
 * 13 contratos (TC-01 a TC-13) em validate-cpf.test.ts.
 */

/**
 * Valida CPF via algoritmo módulo 11 (DV1 + DV2). Aceita formato cru ou mascarado.
 *
 * Critérios de rejeição (retorna `false`):
 * - Comprimento ≠ 11 dígitos (após strip de caracteres não-numéricos)
 * - Sequências de dígitos repetidos (`00000000000`, `11111111111`, ...)
 * - DV1 ou DV2 inválido (módulo 11 da Receita Federal)
 *
 * @example
 *   validateCpf("529.982.247-25") // → true
 *   validateCpf("52998224725")    // → true
 *   validateCpf("111.111.111-11") // → false (sequência repetida)
 *   validateCpf("529.982.247-26") // → false (DV2 errado)
 */
export function validateCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "");

  // Regra 1: comprimento exato 11
  if (digits.length !== 11) return false;

  // Regra 2: rejeitar sequências repetidas (todos os dígitos iguais)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Regra 3: dígito verificador 1 (DV1) — pesos 10..2
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * (10 - i);
  }
  let rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(digits[9], 10)) return false;

  // Regra 4: dígito verificador 2 (DV2) — pesos 11..2
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * (11 - i);
  }
  rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  return rem === parseInt(digits[10], 10);
}

/**
 * Aplica máscara CPF progressiva `000.000.000-00` conforme dígitos digitados.
 * Strip caracteres não-numéricos antes de aplicar. Trunca em 11 dígitos.
 *
 * @example
 *   maskCpf("")              // → ""
 *   maskCpf("529")           // → "529"
 *   maskCpf("529982")        // → "529.982"
 *   maskCpf("52998224725")   // → "529.982.247-25"
 *   maskCpf("abc52998xyz224725") // → "529.982.247-25" (strip + truncate)
 */
export function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}
