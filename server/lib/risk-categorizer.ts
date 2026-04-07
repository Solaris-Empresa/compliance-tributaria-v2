/**
 * risk-categorizer.ts
 * Sprint Z · Z-01 · Categorização de Riscos
 *
 * Taxonomia canônica de categorias conforme LC 214/2025
 * Prioridade decrescente: IS > aliquota_zero > aliquota_reduzida > regime_diferenciado
 *   > nao_cumulatividade > cadastro_fiscal > ibs_cbs > transicao > compliance
 *   > fiscal > patrimonial > enquadramento_geral
 */

export interface GapInput {
  id?: string;
  fonte?: string;
  fonte_ref?: string;
  lei_ref?: string;
  ncm?: string;
  nbs?: string;
  descricao?: string;
  categoria?: string;
}

/**
 * Extrai número do artigo de uma string lei_ref
 * Ex: 'Art. 2 LC 214/2025' → 2
 */
function extractArtigo(leiRef: string | undefined): number | null {
  if (!leiRef) return null;
  const match = leiRef.match(/Art\.\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Categoriza um gap conforme a taxonomia canônica da LC 214/2025
 * Prioridade: IS > aliquota_zero > aliquota_reduzida > regime_diferenciado
 *   > nao_cumulatividade > cadastro_fiscal > ibs_cbs > transicao > compliance
 *   > fiscal > patrimonial > enquadramento_geral
 */
export function categorizeRisk(gap: GapInput): string {
  const ncm = gap.ncm || '';
  const nbs = gap.nbs || '';
  const leiRef = gap.lei_ref || '';
  const descricao = (gap.descricao || '').toLowerCase();
  const fonteRef = gap.fonte_ref || '';
  const fonte = gap.fonte || '';

  const artigo = extractArtigo(leiRef);

  // ─── 1. IMPOSTO SELETIVO ────────────────────────────────────────────────────
  // Art. 2 LC 214 OU NCM 22xx/24xx/27xx OU descricao contém 'Imposto Seletivo'
  if (
    artigo === 2 ||
    ncm.startsWith('22') ||
    ncm.startsWith('24') ||
    ncm.startsWith('27') ||
    ncm.startsWith('2207') ||
    descricao.includes('imposto seletivo') ||
    descricao.includes('is sobre') ||
    (fonteRef.includes('art2') && fonteRef.includes('ncm'))
  ) {
    return 'imposto_seletivo';
  }

  // ─── 2. ALÍQUOTA ZERO ───────────────────────────────────────────────────────
  // Art. 14 LC 214 OU NCM cesta básica (10xx, 07xx, 19xx, 15xx) OU descricao contém 'alíquota zero'
  if (
    artigo === 14 ||
    ncm.startsWith('10') ||
    ncm.startsWith('07') ||
    ncm.startsWith('19') ||
    ncm.startsWith('15') ||
    descricao.includes('alíquota zero') ||
    descricao.includes('aliquota zero') ||
    (fonteRef.includes('art14') && fonteRef.includes('ncm'))
  ) {
    return 'aliquota_zero';
  }

  // ─── 3. ALÍQUOTA REDUZIDA ───────────────────────────────────────────────────
  // Art. 34 LC 214 OU NCM medicamentos (30xx, 31xx)
  if (
    artigo === 34 ||
    ncm.startsWith('30') ||
    ncm.startsWith('31') ||
    descricao.includes('alíquota reduzida') ||
    descricao.includes('aliquota reduzida') ||
    (fonteRef.includes('art34') && fonteRef.includes('ncm'))
  ) {
    return 'aliquota_reduzida';
  }

  // ─── 4. REGIME DIFERENCIADO ─────────────────────────────────────────────────
  // Art. 29 LC 214 OU NBS 1.03/1.15/1.09 (saúde/educação/transporte)
  // Exceção: 'ativo imobilizado' tem prioridade sobre regime_diferenciado (vai para patrimonial)
  const isPatrimonialDesc = descricao.includes('ativo imobilizado') || descricao.includes('imobilizado') || descricao.includes('ativo fixo');
  if (
    !isPatrimonialDesc && (
      artigo === 29 ||
      nbs.startsWith('1.03') ||
      nbs.startsWith('1.15') ||
      nbs.startsWith('1.09') ||
      descricao.includes('regime diferenciado') ||
      (fonteRef.includes('art29'))
    )
  ) {
    return 'regime_diferenciado';
  }

  // ─── 5. NÃO-CUMULATIVIDADE ──────────────────────────────────────────────────
  // Arts. 28-33 LC 214 OU descricao contém 'crédito'/'estorno'/'ressarcimento'
  // Exceto 'ativo imobilizado' que vai para patrimonial
  if (artigo !== null && artigo >= 28 && artigo <= 33) {
    // Verificar se é patrimonial primeiro
    if (descricao.includes('ativo imobilizado') || descricao.includes('imobilizado')) {
      return 'patrimonial';
    }
    return 'nao_cumulatividade';
  }
  if (
    descricao.includes('ressarcimento') ||
    descricao.includes('estorno') ||
    (descricao.includes('crédito') && !descricao.includes('ativo imobilizado') && !descricao.includes('imobilizado'))
  ) {
    return 'nao_cumulatividade';
  }

  // ─── 6. CADASTRO FISCAL ─────────────────────────────────────────────────────
  // Arts. 40-45 LC 214 OU descricao contém 'inscrição'/'habilitação'/'registro'
  if (artigo !== null && artigo >= 40 && artigo <= 45) {
    return 'cadastro_fiscal';
  }
  if (
    descricao.includes('inscrição') ||
    descricao.includes('inscricao') ||
    descricao.includes('habilitação') ||
    descricao.includes('habilitacao') ||
    descricao.includes('registro fiscal') ||
    descricao.includes('cadastro')
  ) {
    return 'cadastro_fiscal';
  }

  // ─── 7. IBS/CBS ─────────────────────────────────────────────────────────────
  // Arts. 6-12 LC 214 OU descricao contém 'IBS'/'CBS'
  if (artigo !== null && artigo >= 6 && artigo <= 12) {
    return 'ibs_cbs';
  }
  if (
    descricao.includes('ibs') ||
    descricao.includes('cbs') ||
    descricao.includes('ibs/cbs')
  ) {
    return 'ibs_cbs';
  }

  // ─── 8. TRANSIÇÃO ───────────────────────────────────────────────────────────
  // Arts. 350+ LC 214 OU descricao contém 'período de transição'/'2026-2032'
  if (artigo !== null && artigo >= 350) {
    return 'transicao';
  }
  if (
    descricao.includes('período de transição') ||
    descricao.includes('periodo de transicao') ||
    descricao.includes('transição 2026') ||
    descricao.includes('2026-2032') ||
    descricao.includes('regra de transição')
  ) {
    return 'transicao';
  }

  // ─── 9. COMPLIANCE ──────────────────────────────────────────────────────────
  // descricao contém 'NF-e'/'SPED'/'obrigação acessória'
  if (
    descricao.includes('nf-e') ||
    descricao.includes('nfe') ||
    descricao.includes('sped') ||
    descricao.includes('obrigação acessória') ||
    descricao.includes('obrigacao acessoria')
  ) {
    return 'compliance';
  }

  // ─── 10. FISCAL ─────────────────────────────────────────────────────────────
  // descricao contém 'escrituração'/'guia de recolhimento'/'apuração'
  if (
    descricao.includes('escrituração') ||
    descricao.includes('escrituracao') ||
    descricao.includes('guia de recolhimento') ||
    descricao.includes('recolhimento') ||
    descricao.includes('apuração') ||
    descricao.includes('apuracao')
  ) {
    return 'fiscal';
  }

  // ─── 11. PATRIMONIAL ────────────────────────────────────────────────────────
  // descricao contém 'ativo imobilizado'/'imobilizado'
  if (
    descricao.includes('ativo imobilizado') ||
    descricao.includes('imobilizado') ||
    descricao.includes('ativo fixo')
  ) {
    return 'patrimonial';
  }

  // ─── 12. ENQUADRAMENTO GERAL ────────────────────────────────────────────────
  // fallback: fonte='fallback' OU lei_ref genérico OU sem match
  return 'enquadramento_geral';
}
