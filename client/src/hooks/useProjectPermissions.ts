/**
 * Hook para verificar permissões do usuário em um projeto
 * Sprint V20 - Feature 1
 */

import { trpc } from "@/lib/trpc";

export function useProjectPermissions(projectId: number | undefined) {
  const { data, isLoading } = trpc.permissionsCheck.getProjectPermissions.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  return {
    permissions: data?.permissions || null,
    hasAccess: data?.hasAccess || false,
    isLoading,
    // Helpers para permissões específicas
    canEdit: data?.permissions?.canEditActions || false,
    canDelete: data?.permissions?.canDeleteActions || false,
    canEditQuestions: data?.permissions?.canEditQuestions || false,
    canDeleteQuestions: data?.permissions?.canDeleteQuestions || false,
    canViewAudit: data?.permissions?.canViewAudit || false,
    canManageUsers: data?.permissions?.canManageUsers || false,
    isEquipeSolaris: data?.permissions?.role === "equipe_solaris",
  };
}
