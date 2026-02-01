/**
 * Sistema de Permissões Granulares
 * Sprint V19 - Feature 3
 * 
 * Define quem pode fazer o quê no sistema
 */

import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { getProjectParticipant } from "./db-participants";

/**
 * Roles do sistema
 */
export type UserRole = "cliente" | "equipe_solaris" | "advogado_senior" | "advogado_junior";
export type ProjectRole = "responsavel" | "membro_equipe" | "observador";

/**
 * Permissões por role de usuário
 */
export const USER_PERMISSIONS = {
  equipe_solaris: {
    canCreateProjects: true,
    canEditAllProjects: true,
    canDeleteProjects: true,
    canManageUsers: true,
    canViewAllProjects: true,
    canEditActions: true,
    canDeleteActions: true,
    canEditQuestions: true,
    canDeleteQuestions: true,
    canApproveActionPlans: true,
  },
  advogado_senior: {
    canCreateProjects: true,
    canEditAllProjects: false,
    canDeleteProjects: false,
    canManageUsers: false,
    canViewAllProjects: true,
    canEditActions: true,
    canDeleteActions: false,
    canEditQuestions: true,
    canDeleteQuestions: false,
    canApproveActionPlans: true,
  },
  advogado_junior: {
    canCreateProjects: false,
    canEditAllProjects: false,
    canDeleteProjects: false,
    canManageUsers: false,
    canViewAllProjects: false,
    canEditActions: true,
    canDeleteActions: false,
    canEditQuestions: false,
    canDeleteQuestions: false,
    canApproveActionPlans: false,
  },
  cliente: {
    canCreateProjects: true,
    canEditAllProjects: false,
    canDeleteProjects: false,
    canManageUsers: false,
    canViewAllProjects: false,
    canEditActions: false,
    canDeleteActions: false,
    canEditQuestions: false,
    canDeleteQuestions: false,
    canApproveActionPlans: false,
  },
} as const;

/**
 * Permissões por role no projeto
 */
export const PROJECT_PERMISSIONS = {
  responsavel: {
    canEditProject: true,
    canDeleteProject: false, // Apenas equipe_solaris
    canAddMembers: true,
    canRemoveMembers: true,
    canEditActions: true,
    canDeleteActions: false, // Apenas equipe_solaris
    canEditQuestions: true,
    canDeleteQuestions: false, // Apenas equipe_solaris
    canViewAudit: true,
  },
  membro_equipe: {
    canEditProject: true,
    canDeleteProject: false,
    canAddMembers: false,
    canRemoveMembers: false,
    canEditActions: true,
    canDeleteActions: false,
    canEditQuestions: true,
    canDeleteQuestions: false,
    canViewAudit: true,
  },
  observador: {
    canEditProject: false,
    canDeleteProject: false,
    canAddMembers: false,
    canRemoveMembers: false,
    canEditActions: false,
    canDeleteActions: false,
    canEditQuestions: false,
    canDeleteQuestions: false,
    canViewAudit: true,
  },
} as const;

/**
 * Verifica se usuário tem permissão global
 */
export function hasUserPermission(
  userRole: UserRole,
  permission: keyof typeof USER_PERMISSIONS.equipe_solaris
): boolean {
  return USER_PERMISSIONS[userRole][permission] || false;
}

/**
 * Verifica se usuário tem permissão no projeto
 */
export async function hasProjectPermission(
  userId: number,
  projectId: number,
  permission: keyof typeof PROJECT_PERMISSIONS.responsavel
): Promise<boolean> {
  // Equipe SOLARIS tem acesso total
  const user = await db.getUserById(userId);
  if (!user) return false;
  
  if (user.role === "equipe_solaris") {
    return true;
  }

  // Verifica role no projeto
  const participant = await getProjectParticipant(projectId, userId);
  if (!participant) return false;

  const projectRole = participant.role as ProjectRole;
  return PROJECT_PERMISSIONS[projectRole][permission] || false;
}

/**
 * Middleware para validar permissão global
 */
export async function requireUserPermission(
  userId: number,
  permission: keyof typeof USER_PERMISSIONS.equipe_solaris
) {
  const user = await db.getUserById(userId);
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
  }

  if (!hasUserPermission(user.role, permission)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Permission denied: ${permission}`,
    });
  }

  return user;
}

/**
 * Middleware para validar permissão no projeto
 */
export async function requireProjectPermission(
  userId: number,
  projectId: number,
  permission: keyof typeof PROJECT_PERMISSIONS.responsavel
) {
  const hasPermission = await hasProjectPermission(userId, projectId, permission);
  
  if (!hasPermission) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Permission denied: ${permission} on project ${projectId}`,
    });
  }
}

/**
 * Obter permissões do usuário para um projeto
 */
export async function getUserProjectPermissions(userId: number, projectId: number) {
  const user = await db.getUserById(userId);
  if (!user) return null;

  // Equipe SOLARIS tem todas as permissões
  if (user.role === "equipe_solaris") {
    return {
      ...USER_PERMISSIONS.equipe_solaris,
      ...PROJECT_PERMISSIONS.responsavel,
      role: "equipe_solaris" as const,
      projectRole: null,
    };
  }

  // Buscar role no projeto
  const participant = await getProjectParticipant(projectId, userId);
  if (!participant) {
    return {
      ...USER_PERMISSIONS[user.role],
      canEditProject: false,
      canDeleteProject: false,
      canAddMembers: false,
      canRemoveMembers: false,
      canEditActions: false,
      canDeleteActions: false,
      canEditQuestions: false,
      canDeleteQuestions: false,
      canViewAudit: false,
      role: user.role,
      projectRole: null,
    };
  }

  return {
    ...USER_PERMISSIONS[user.role],
    ...PROJECT_PERMISSIONS[participant.role as ProjectRole],
    role: user.role,
    projectRole: participant.role,
  };
}
