/**
 * build-version.ts — Informações de Versão do Build e Deploy
 *
 * Fornece metadados do build atual para o endpoint GET /api/version.
 * Permite verificar se o código em produção corresponde ao esperado.
 *
 * Estratégia de versionamento:
 * - VITE_BUILD_HASH: git hash curto injetado em tempo de build (via package.json)
 * - VITE_BUILD_TIME: timestamp ISO do build
 * - BUILD_VERSION: versão semântica do package.json
 * - Em dev: usa o hash do git ao vivo via child_process
 *
 * Sprint v5.5.0
 */

import { execSync } from "child_process";

/** Versão semântica do pipeline (atualizar a cada sprint) */
const PIPELINE_VERSION = "5.5.0";

/** Obtém o git hash atual do processo em execução (fallback para dev) */
function getLiveGitHash(): string {
  try {
    return execSync("git rev-parse --short HEAD", { timeout: 3000 })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

/** Obtém o timestamp do último commit (para comparação com o deploy) */
function getLastCommitTime(): string {
  try {
    return execSync("git log -1 --format=%cI", { timeout: 3000 })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

/** Obtém a mensagem do último commit (primeiros 80 chars) */
function getLastCommitMessage(): string {
  try {
    return execSync("git log -1 --format=%s", { timeout: 3000 })
      .toString()
      .trim()
      .substring(0, 80);
  } catch {
    return "unknown";
  }
}

export interface BuildVersionInfo {
  /** Versão semântica do pipeline */
  version: string;
  /** Git hash curto do commit em execução */
  gitHash: string;
  /** Timestamp ISO do último commit */
  commitTime: string;
  /** Mensagem do último commit (primeiros 80 chars) */
  commitMessage: string;
  /** Timestamp ISO do servidor ao responder (para detectar drift de relógio) */
  serverTime: string;
  /** Ambiente de execução */
  env: "production" | "development" | "test";
  /** Uptime do processo em segundos */
  uptimeSeconds: number;
  /** Node.js version */
  nodeVersion: string;
  /**
   * Instrução de uso: compare gitHash com o hash do checkpoint publicado
   * para confirmar que o deploy está rodando o código correto.
   *
   * Exemplo:
   *   GET https://iasolaris.manus.space/api/version
   *   → { gitHash: "ea616dd", ... }
   *   Checkpoint Manus: ea616dd9 → primeiros 7 chars = "ea616dd" ✅
   */
  howToVerify: string;
}

export function getBuildVersionInfo(): BuildVersionInfo {
  const isProduction = process.env.NODE_ENV === "production";
  const isTest = process.env.NODE_ENV === "test";

  // Em produção: usa variáveis injetadas em build-time (mais rápido, sem child_process)
  // Em dev: executa git ao vivo para ter o hash atual
  const gitHash = isProduction
    ? (process.env.VITE_BUILD_HASH ?? getLiveGitHash())
    : getLiveGitHash();

  return {
    version: PIPELINE_VERSION,
    gitHash,
    commitTime: getLastCommitTime(),
    commitMessage: getLastCommitMessage(),
    serverTime: new Date().toISOString(),
    env: isProduction ? "production" : isTest ? "test" : "development",
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    howToVerify:
      "Compare gitHash com os primeiros 7 chars do ID do checkpoint Manus (ex: ea616dd9 → ea616dd). Se coincidirem, o deploy está atualizado.",
  };
}
