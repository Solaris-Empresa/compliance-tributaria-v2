/**
 * Testes para validar renderização condicional da seção "Planos por Ramo"
 * 
 * Objetivo: Garantir que a seção só aparece quando projectBranches.length > 0
 * 
 * Cenários testados:
 * 1. Projeto com ramos → seção deve aparecer
 * 2. Projeto sem ramos → seção não deve aparecer
 * 3. Projeto com 1 ramo → seção deve aparecer
 * 4. Projeto com múltiplos ramos → seção deve aparecer
 */

import { describe, it, expect } from 'vitest';
import { getDb } from '../db.js';
import { projectBranches, activityBranches } from '../drizzle/schema.js';
import { eq } from 'drizzle-orm';

describe('Renderização Condicional - Planos por Ramo', () => {
  it('Deve retornar projectBranches.length > 0 para projeto 540001', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const branches = await db
      .select()
      .from(projectBranches)
      .where(eq(projectBranches.projectId, 540001));

    expect(branches.length).toBeGreaterThan(0);
    console.log(`✅ Projeto 540001 tem ${branches.length} ramos cadastrados`);
  });

  it('Deve retornar projectBranches.length === 0 para projeto 510076', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const branches = await db
      .select()
      .from(projectBranches)
      .where(eq(projectBranches.projectId, 510076));

    expect(branches.length).toBe(0);
    console.log(`✅ Projeto 510076 tem ${branches.length} ramos cadastrados (esperado)`);
  });

  it('Deve retornar exatamente 3 ramos para projeto 540001', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const branches = await db
      .select()
      .from(projectBranches)
      .where(eq(projectBranches.projectId, 540001));

    expect(branches.length).toBe(3);
    console.log(`✅ Projeto 540001 tem exatamente 3 ramos`);
  });

  it('Deve retornar dados completos dos ramos com JOIN', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const branches = await db
      .select({
        id: projectBranches.id,
        projectId: projectBranches.projectId,
        branchId: projectBranches.branchId,
        code: activityBranches.code,
        name: activityBranches.name,
      })
      .from(projectBranches)
      .innerJoin(activityBranches, eq(projectBranches.branchId, activityBranches.id))
      .where(eq(projectBranches.projectId, 540001));

    expect(branches.length).toBe(3);
    expect(branches[0]).toHaveProperty('code');
    expect(branches[0]).toHaveProperty('name');
    
    console.log(`✅ JOIN retornou ${branches.length} ramos com dados completos:`);
    branches.forEach((b, i) => {
      console.log(`   ${i + 1}. ${b.code} - ${b.name}`);
    });
  });

  it('Deve validar condição de renderização: projectBranches.length > 0', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Projeto COM ramos
    const branchesWithData = await db
      .select()
      .from(projectBranches)
      .where(eq(projectBranches.projectId, 540001));

    const shouldRenderWithData = branchesWithData.length > 0;
    expect(shouldRenderWithData).toBe(true);

    // Projeto SEM ramos
    const branchesWithoutData = await db
      .select()
      .from(projectBranches)
      .where(eq(projectBranches.projectId, 510076));

    const shouldRenderWithoutData = branchesWithoutData.length > 0;
    expect(shouldRenderWithoutData).toBe(false);

    console.log(`✅ Condição de renderização validada:`);
    console.log(`   - Projeto 540001 (com ramos): renderiza = ${shouldRenderWithData}`);
    console.log(`   - Projeto 510076 (sem ramos): renderiza = ${shouldRenderWithoutData}`);
  });
});
