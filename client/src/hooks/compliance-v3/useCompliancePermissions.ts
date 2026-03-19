import { useAuth } from "@/_core/hooks/useAuth";
import type { CompliancePermissions } from "@/types/compliance-v3";

export function useCompliancePermissions(): CompliancePermissions {
  const { user } = useAuth();

  const isAuthenticated = !!user;
  const isAdmin = user?.role === "equipe_solaris";

  return {
    canEditAssessment: isAuthenticated,
    canViewDashboard: isAuthenticated,
    canUpdateActions: isAuthenticated,
    canUpdateTasks: isAuthenticated,
    canExport: isAuthenticated || isAdmin,
  };
}
