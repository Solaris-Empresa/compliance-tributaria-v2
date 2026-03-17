/**
 * usePersistenceV3 — Hook de persistência dual para o Fluxo v3.0
 *
 * Estratégia:
 *  - TEMPORÁRIA: localStorage — salvo a cada interação, sem latência
 *  - DEFINITIVA:  banco de dados via tRPC — salvo ao avançar etapa ou aprovar
 *
 * Chave do localStorage: `compliance_v3_<projectId>_<stage>`
 * Stages: 'etapa1' | 'etapa2' | 'etapa3' | 'etapa4' | 'etapa5'
 */

import { useCallback, useEffect, useRef } from "react";

export type PersistenceStage =
  | "etapa1"
  | "etapa2"
  | "etapa3"
  | "etapa4"
  | "etapa5";

const STORAGE_PREFIX = "compliance_v3";

function buildKey(projectId: number, stage: PersistenceStage): string {
  return `${STORAGE_PREFIX}_${projectId}_${stage}`;
}

/**
 * Salva dados no localStorage (persistência temporária).
 * Silencia erros de quota excedida.
 */
export function saveTempData<T>(
  projectId: number,
  stage: PersistenceStage,
  data: T
): void {
  try {
    const key = buildKey(projectId, stage);
    localStorage.setItem(
      key,
      JSON.stringify({ data, savedAt: Date.now() })
    );
  } catch {
    // quota exceeded — ignora silenciosamente
  }
}

/**
 * Lê dados do localStorage (persistência temporária).
 * Retorna null se não houver dados ou se estiverem corrompidos.
 */
export function loadTempData<T>(
  projectId: number,
  stage: PersistenceStage
): { data: T; savedAt: number } | null {
  try {
    const key = buildKey(projectId, stage);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as { data: T; savedAt: number };
  } catch {
    return null;
  }
}

/**
 * Remove dados temporários do localStorage após salvamento definitivo.
 */
export function clearTempData(
  projectId: number,
  stage: PersistenceStage
): void {
  try {
    localStorage.removeItem(buildKey(projectId, stage));
  } catch {
    // ignora
  }
}

/**
 * Verifica se há dados temporários salvos para um projeto/etapa.
 */
export function hasTempData(
  projectId: number,
  stage: PersistenceStage
): boolean {
  try {
    return localStorage.getItem(buildKey(projectId, stage)) !== null;
  } catch {
    return false;
  }
}

/**
 * Hook de auto-save com debounce.
 * Salva automaticamente no localStorage após `delay` ms de inatividade.
 *
 * @param projectId  ID do projeto
 * @param stage      Etapa do fluxo
 * @param data       Dados a serem salvos (deve ser serializável)
 * @param delay      Debounce em ms (padrão: 500ms)
 */
export function useAutoSave<T>(
  projectId: number,
  stage: PersistenceStage,
  data: T,
  delay = 500
): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!projectId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveTempData(projectId, stage, dataRef.current);
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [projectId, stage, data, delay]);
}

/**
 * Hook principal de persistência dual.
 * Retorna helpers para salvar/carregar/limpar dados temporários
 * e uma flag indicando se há rascunho salvo.
 */
export function usePersistenceV3<T>(
  projectId: number,
  stage: PersistenceStage
) {
  const save = useCallback(
    (data: T) => saveTempData(projectId, stage, data),
    [projectId, stage]
  );

  const load = useCallback(
    () => loadTempData<T>(projectId, stage),
    [projectId, stage]
  );

  const clear = useCallback(
    () => clearTempData(projectId, stage),
    [projectId, stage]
  );

  const hasData = useCallback(
    () => hasTempData(projectId, stage),
    [projectId, stage]
  );

  return { save, load, clear, hasData };
}
