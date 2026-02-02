/**
 * Testes para validar atualização da baseline.md com Sprint V34
 * 
 * Objetivo: Garantir que baseline.md foi atualizada corretamente com:
 * - Versão 1.1
 * - Data 02/02/2026
 * - Checkpoint 3fc6120e
 * - Métricas atualizadas (34 sprints, 62 issues)
 * - Sprint V34 documentado em erros-conhecidos.md
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Atualização da Baseline - Sprint V34', () => {
  const baselinePath = join(process.cwd(), 'baseline.md');
  const errosConhecidosPath = join(process.cwd(), 'erros-conhecidos.md');

  it('Deve ter versão 1.1 no cabeçalho', () => {
    const baseline = readFileSync(baselinePath, 'utf-8');
    expect(baseline).toContain('**Versão:** 1.1');
    console.log('✅ Versão 1.1 encontrada no cabeçalho');
  });

  it('Deve ter data 02/02/2026 no cabeçalho', () => {
    const baseline = readFileSync(baselinePath, 'utf-8');
    expect(baseline).toContain('**Data:** 02/02/2026');
    console.log('✅ Data 02/02/2026 encontrada no cabeçalho');
  });

  it('Deve ter checkpoint 3fc6120e no cabeçalho', () => {
    const baseline = readFileSync(baselinePath, 'utf-8');
    expect(baseline).toContain('**Checkpoint:** 3fc6120e');
    console.log('✅ Checkpoint 3fc6120e encontrado no cabeçalho');
  });

  it('Deve ter 34 sprints concluídos nas métricas', () => {
    const baseline = readFileSync(baselinePath, 'utf-8');
    expect(baseline).toContain('**Sprints Concluídos:** 34 sprints (V1-V34)');
    console.log('✅ Métricas atualizadas: 34 sprints');
  });

  it('Deve ter 62 issues resolvidas nas métricas', () => {
    const baseline = readFileSync(baselinePath, 'utf-8');
    expect(baseline).toContain('**Issues Resolvidas:** 62 issues fechadas no GitHub');
    console.log('✅ Métricas atualizadas: 62 issues');
  });

  it('Deve ter 35+ checkpoints nas métricas', () => {
    const baseline = readFileSync(baselinePath, 'utf-8');
    expect(baseline).toContain('**Checkpoints Criados:** 35+ checkpoints');
    console.log('✅ Métricas atualizadas: 35+ checkpoints');
  });

  it('Deve ter Sprint V34 documentado em erros conhecidos', () => {
    const baseline = readFileSync(baselinePath, 'utf-8');
    expect(baseline).toContain('3. **Seção "Planos por Ramo" Não Renderizada** (Sprint V34)');
    console.log('✅ Sprint V34 documentado na baseline');
  });

  it('Deve ter referência a docs/funcionalidade-planos-por-ramo.md', () => {
    const baseline = readFileSync(baselinePath, 'utf-8');
    expect(baseline).toContain('`docs/funcionalidade-planos-por-ramo.md`');
    console.log('✅ Referência à documentação de planos por ramo');
  });

  it('Deve ter rodapé atualizado com versão 1.1', () => {
    const baseline = readFileSync(baselinePath, 'utf-8');
    expect(baseline).toContain('**Última Atualização:** 02/02/2026');
    expect(baseline).toContain('**Versão do Documento:** 1.1');
    expect(baseline).toContain('**Checkpoint Atual:** 3fc6120e');
    console.log('✅ Rodapé atualizado corretamente');
  });

  it('Deve ter backlog atualizado para V1-V34', () => {
    const baseline = readFileSync(baselinePath, 'utf-8');
    expect(baseline).toContain('Ver arquivo `todo.md` para backlog completo e sprints concluídos (V1-V34).');
    console.log('✅ Backlog atualizado para V1-V34');
  });

  it('Deve ter Sprint V34 completo em erros-conhecidos.md', () => {
    const errosConhecidos = readFileSync(errosConhecidosPath, 'utf-8');
    expect(errosConhecidos).toContain('## 3. Seção "Planos por Ramo" Não Renderizada na Interface');
    expect(errosConhecidos).toContain('**Sprint:** V34');
    expect(errosConhecidos).toContain('**Data de Identificação:** 02/02/2026');
    expect(errosConhecidos).toContain('Projeto ID: 540001');
    expect(errosConhecidos).toContain('server/seed-test-project-with-branches.ts');
    expect(errosConhecidos).toContain('docs/funcionalidade-planos-por-ramo.md');
    console.log('✅ Sprint V34 documentado completamente em erros-conhecidos.md');
  });

  it('Deve ter 5/5 testes passaram em erros-conhecidos.md', () => {
    const errosConhecidos = readFileSync(errosConhecidosPath, 'utf-8');
    expect(errosConhecidos).toContain('**Resultado:** 5/5 testes passaram em 599ms ✅');
    console.log('✅ Resultado dos testes documentado');
  });

  it('Deve ter issue #62 referenciada em erros-conhecidos.md', () => {
    const errosConhecidos = readFileSync(errosConhecidosPath, 'utf-8');
    expect(errosConhecidos).toContain('**Issue GitHub:** #62');
    expect(errosConhecidos).toContain('https://github.com/Solaris-Empresa/reforma-tributaria-plano-compliance/issues/62');
    console.log('✅ Issue #62 referenciada corretamente');
  });
});
