/**
 * useFluxoSession.ts — Hook centralizado para o Fluxo v2.0
 * Gerencia sessionToken e confirmedBranches de forma consistente
 * Usa sessionStorage como fonte de verdade (compatível com BriefingInteligente)
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export interface ConfirmedBranch {
  code: string;
  name: string;
}

export interface FluxoSession {
  sessionToken: string;
  sessionMode: string;
  confirmedBranches: ConfirmedBranch[];
  isReady: boolean;
}

/**
 * Retorna os dados da sessão do fluxo v2.0.
 * Se não houver sessão válida, redireciona para /modo-uso.
 */
export function useFluxoSession(requireBranches = false): FluxoSession {
  const [, navigate] = useLocation();
  const [isReady, setIsReady] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [sessionMode, setSessionMode] = useState("");
  const [confirmedBranches, setConfirmedBranches] = useState<ConfirmedBranch[]>([]);

  useEffect(() => {
    // Tentar sessionStorage primeiro (fonte primária), depois localStorage (fallback)
    const token =
      sessionStorage.getItem("sessionToken") ??
      localStorage.getItem("sessionToken") ??
      "";

    const mode =
      sessionStorage.getItem("sessionMode") ??
      localStorage.getItem("sessionMode") ??
      "temporario";

    const branchesRaw =
      sessionStorage.getItem("confirmedBranches") ??
      localStorage.getItem("confirmedBranches") ??
      "[]";

    let branches: ConfirmedBranch[] = [];
    try {
      branches = JSON.parse(branchesRaw);
    } catch {
      branches = [];
    }

    if (!token) {
      navigate("/modo-uso");
      return;
    }

    if (requireBranches && branches.length === 0) {
      navigate("/briefing");
      return;
    }

    // Sincronizar para sessionStorage (normalização)
    sessionStorage.setItem("sessionToken", token);
    sessionStorage.setItem("sessionMode", mode);
    if (branches.length > 0) {
      sessionStorage.setItem("confirmedBranches", JSON.stringify(branches));
    }

    setSessionToken(token);
    setSessionMode(mode);
    setConfirmedBranches(branches);
    setIsReady(true);
  }, [navigate, requireBranches]);

  return { sessionToken, sessionMode, confirmedBranches, isReady };
}

/**
 * Salva os ramos confirmados na sessão (sessionStorage + localStorage para redundância)
 */
export function saveConfirmedBranchesToSession(branches: ConfirmedBranch[]) {
  const raw = JSON.stringify(branches);
  sessionStorage.setItem("confirmedBranches", raw);
  localStorage.setItem("confirmedBranches", raw);
}

/**
 * Salva o sessionToken na sessão
 */
export function saveSessionToken(token: string, mode: string) {
  sessionStorage.setItem("sessionToken", token);
  sessionStorage.setItem("sessionMode", mode);
  localStorage.setItem("sessionToken", token);
  localStorage.setItem("sessionMode", mode);
}

/**
 * Limpa todos os dados da sessão (ao finalizar ou iniciar novo diagnóstico)
 */
export function clearFluxoSession() {
  ["sessionToken", "sessionMode", "confirmedBranches", "branchAnalyses"].forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
}
