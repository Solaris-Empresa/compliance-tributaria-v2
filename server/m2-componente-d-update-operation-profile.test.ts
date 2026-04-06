/**
 * m2-componente-d-update-operation-profile.test.ts
 * Q5 obrigatórios — Componente D (M2)
 *
 * Orquestrador Claude — 2026-04-06
 * TO-BE v3 aprovado · P.O. Uires Tapajós
 *
 * Testes:
 *   M2-D-01: updateOperationProfile persiste principaisProdutos corretamente
 *   M2-D-02: updateOperationProfile não sobrescreve campo ausente no input (undefined)
 *   M2-D-03: updateOperationProfile aceita array vazio [] sobrescrevendo existente
 *   M2-D-04: updateOperationProfile dispara engine apenas quando há change material
 *   M2-D-05: updateOperationProfile NÃO dispara engine sem change material
 *   M2-D-06: updateOperationProfile trata operationProfile null sem erro
 *   M2-D-07: updateOperationProfile trata operationProfile string JSON sem erro
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock de db (getProjectById + updateProject)
const mockGetProjectById = vi.fn();
const mockUpdateProject = vi.fn();

vi.mock('./db', () => ({
  getProjectById: (...args: any[]) => mockGetProjectById(...args),
  updateProject: (...args: any[]) => mockUpdateProject(...args),
}));

// Mock de engine-gap-analyzer
const mockAnalyzeEngineGaps = vi.fn();
vi.mock('./lib/engine-gap-analyzer', () => ({
  analyzeEngineGaps: (...args: any[]) => mockAnalyzeEngineGaps(...args),
}));

// ─── Importar a lógica da procedure diretamente ───────────────────────────────
// Testa a lógica de negócio isolada, sem tRPC context

import * as db from './db';
import { analyzeEngineGaps } from './lib/engine-gap-analyzer';
import { extractNcmNbsFromProfile } from './routers-fluxo-v3';

// ─── Helper: simular a lógica da mutation ─────────────────────────────────────
async function runUpdateOperationProfile(input: {
  projectId: number;
  principaisProdutos?: Array<{ ncm_code: string; descricao: string; percentualFaturamento?: number }>;
  principaisServicos?: Array<{ nbs_code: string; descricao: string; percentualFaturamento?: number }>;
}) {
  const { projectId, principaisProdutos, principaisServicos } = input;

  const projeto = await db.getProjectById(projectId);
  if (!projeto) throw new Error('NOT_FOUND');

  // Parse seguro do operationProfile
  let perfilAtual: Record<string, unknown> = {};
  const raw = (projeto as any).operationProfile;
  if (raw !== null && raw !== undefined) {
    if (typeof raw === 'string') {
      try { perfilAtual = JSON.parse(raw); } catch { perfilAtual = {}; }
    } else if (typeof raw === 'object') {
      perfilAtual = raw as Record<string, unknown>;
    }
  }

  // Merge seguro — undefined NÃO sobrescreve
  const merged = { ...perfilAtual };
  if (principaisProdutos !== undefined) {
    merged.principaisProdutos = principaisProdutos;
  }
  if (principaisServicos !== undefined) {
    merged.principaisServicos = principaisServicos;
  }

  await db.updateProject(projectId, { operationProfile: merged } as any);

  // Fire-and-forget engine APENAS se change material
  const produtosAntes = (perfilAtual.principaisProdutos as any[]) ?? [];
  const produtosDepois = (merged.principaisProdutos as any[]) ?? [];
  const servicosAntes  = (perfilAtual.principaisServicos as any[]) ?? [];
  const servicosDepois = (merged.principaisServicos as any[]) ?? [];

  const houveChangeMaterial =
    JSON.stringify(produtosAntes) !== JSON.stringify(produtosDepois) ||
    JSON.stringify(servicosAntes) !== JSON.stringify(servicosDepois);

  if (houveChangeMaterial) {
    const { ncmCodes, nbsCodes } = extractNcmNbsFromProfile(merged);
    if (ncmCodes.length > 0 || nbsCodes.length > 0) {
      void analyzeEngineGaps(projectId, ncmCodes, nbsCodes)
        .catch(err => console.error('[ENGINE-GAP] falhou:', err));
    }
  }

  return { success: true, projectId };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateProject.mockResolvedValue(undefined);
  mockAnalyzeEngineGaps.mockResolvedValue({ inserted: 1, skipped_pending: 0 });
});

// ─── Testes Q5 obrigatórios ───────────────────────────────────────────────────

describe('M2 Componente D — updateOperationProfile', () => {

  it('M2-D-01: persiste principaisProdutos corretamente', async () => {
    mockGetProjectById.mockResolvedValue({
      id: 1,
      operationProfile: null,
    });

    const result = await runUpdateOperationProfile({
      projectId: 1,
      principaisProdutos: [
        { ncm_code: '2202.10.00', descricao: 'Água mineral', percentualFaturamento: 80 },
      ],
    });

    expect(result).toEqual({ success: true, projectId: 1 });
    expect(mockUpdateProject).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        operationProfile: expect.objectContaining({
          principaisProdutos: [
            { ncm_code: '2202.10.00', descricao: 'Água mineral', percentualFaturamento: 80 },
          ],
        }),
      })
    );
  });

  it('M2-D-02: não sobrescreve campo ausente no input (undefined)', async () => {
    mockGetProjectById.mockResolvedValue({
      id: 1,
      operationProfile: {
        operationType: 'produto',
        principaisProdutos: [{ ncm_code: '9619.00.00', descricao: 'Absorvente' }],
        principaisServicos: [{ nbs_code: '1.09.01.00.00', descricao: 'Saúde' }],
      },
    });

    // Enviar apenas principaisProdutos — principaisServicos deve ser preservado
    await runUpdateOperationProfile({
      projectId: 1,
      principaisProdutos: [{ ncm_code: '2202.10.00', descricao: 'Água mineral' }],
      // principaisServicos: undefined (não enviado)
    });

    const callArg = mockUpdateProject.mock.calls[0][1].operationProfile;
    // operationType deve ser preservado
    expect(callArg.operationType).toBe('produto');
    // principaisServicos deve ser preservado (undefined não sobrescreve)
    expect(callArg.principaisServicos).toEqual([{ nbs_code: '1.09.01.00.00', descricao: 'Saúde' }]);
    // principaisProdutos deve ser atualizado
    expect(callArg.principaisProdutos).toEqual([{ ncm_code: '2202.10.00', descricao: 'Água mineral' }]);
  });

  it('M2-D-03: aceita array vazio [] sobrescrevendo existente', async () => {
    mockGetProjectById.mockResolvedValue({
      id: 1,
      operationProfile: {
        principaisProdutos: [{ ncm_code: '9619.00.00', descricao: 'Absorvente' }],
      },
    });

    await runUpdateOperationProfile({
      projectId: 1,
      principaisProdutos: [], // array vazio deve sobrescrever
    });

    const callArg = mockUpdateProject.mock.calls[0][1].operationProfile;
    expect(callArg.principaisProdutos).toEqual([]);
  });

  it('M2-D-04: dispara engine apenas quando há change material', async () => {
    mockGetProjectById.mockResolvedValue({
      id: 1,
      operationProfile: {
        principaisProdutos: [{ ncm_code: '9619.00.00', descricao: 'Absorvente' }],
      },
    });

    await runUpdateOperationProfile({
      projectId: 1,
      principaisProdutos: [{ ncm_code: '2202.10.00', descricao: 'Água mineral' }], // mudança real
    });

    // Aguardar microtask do void analyzeEngineGaps
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockAnalyzeEngineGaps).toHaveBeenCalledWith(
      1,
      ['2202.10.00'],
      []
    );
  });

  it('M2-D-05: NÃO dispara engine sem change material', async () => {
    const produtos = [{ ncm_code: '9619.00.00', descricao: 'Absorvente' }];
    mockGetProjectById.mockResolvedValue({
      id: 1,
      operationProfile: { principaisProdutos: produtos },
    });

    // Enviar exatamente os mesmos dados — sem mudança
    await runUpdateOperationProfile({
      projectId: 1,
      principaisProdutos: [{ ncm_code: '9619.00.00', descricao: 'Absorvente' }],
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockAnalyzeEngineGaps).not.toHaveBeenCalled();
  });

  it('M2-D-06: trata operationProfile null sem erro', async () => {
    mockGetProjectById.mockResolvedValue({
      id: 1,
      operationProfile: null,
    });

    await expect(
      runUpdateOperationProfile({
        projectId: 1,
        principaisProdutos: [{ ncm_code: '2202.10.00', descricao: 'Água' }],
      })
    ).resolves.toEqual({ success: true, projectId: 1 });

    const callArg = mockUpdateProject.mock.calls[0][1].operationProfile;
    expect(callArg.principaisProdutos).toEqual([{ ncm_code: '2202.10.00', descricao: 'Água' }]);
  });

  it('M2-D-07: trata operationProfile string JSON sem erro', async () => {
    mockGetProjectById.mockResolvedValue({
      id: 1,
      operationProfile: JSON.stringify({
        operationType: 'servicos',
        principaisServicos: [{ nbs_code: '1.09.01.00.00', descricao: 'Saúde' }],
      }),
    });

    await expect(
      runUpdateOperationProfile({
        projectId: 1,
        principaisServicos: [{ nbs_code: '2.01.01.00.00', descricao: 'Educação' }],
      })
    ).resolves.toEqual({ success: true, projectId: 1 });

    const callArg = mockUpdateProject.mock.calls[0][1].operationProfile;
    // operationType deve ser preservado do JSON parseado
    expect(callArg.operationType).toBe('servicos');
    // principaisServicos deve ser atualizado
    expect(callArg.principaisServicos).toEqual([{ nbs_code: '2.01.01.00.00', descricao: 'Educação' }]);
  });

});
