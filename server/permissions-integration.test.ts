/**
 * Testes de Integração para Sistema de Permissões
 * Sprint V19 - Feature 3
 */

import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { USER_PERMISSIONS, PROJECT_PERMISSIONS } from "./permissions";

describe("Permissions System - Integration Tests", () => {
  it("should have permissionsCheck router registered", () => {
    expect(appRouter.permissionsCheck).toBeDefined();
  });

  it("should have getProjectPermissions procedure", () => {
    expect(appRouter.permissionsCheck.getProjectPermissions).toBeDefined();
  });

  it("should have checkPermission procedure", () => {
    expect(appRouter.permissionsCheck.checkPermission).toBeDefined();
  });

  it("should define correct permissions for equipe_solaris", () => {
    const permissions = USER_PERMISSIONS.equipe_solaris;
    
    expect(permissions.canCreateProjects).toBe(true);
    expect(permissions.canEditAllProjects).toBe(true);
    expect(permissions.canDeleteProjects).toBe(true);
    expect(permissions.canManageUsers).toBe(true);
    expect(permissions.canEditActions).toBe(true);
    expect(permissions.canDeleteActions).toBe(true);
    expect(permissions.canEditQuestions).toBe(true);
    expect(permissions.canDeleteQuestions).toBe(true);
  });

  it("should define correct permissions for cliente", () => {
    const permissions = USER_PERMISSIONS.cliente;
    
    expect(permissions.canCreateProjects).toBe(true);
    expect(permissions.canEditAllProjects).toBe(false);
    expect(permissions.canDeleteProjects).toBe(false);
    expect(permissions.canManageUsers).toBe(false);
    expect(permissions.canEditActions).toBe(false);
    expect(permissions.canDeleteActions).toBe(false);
    expect(permissions.canEditQuestions).toBe(false);
    expect(permissions.canDeleteQuestions).toBe(false);
  });

  it("should define correct permissions for responsavel in project", () => {
    const permissions = PROJECT_PERMISSIONS.responsavel;
    
    expect(permissions.canEditProject).toBe(true);
    expect(permissions.canDeleteProject).toBe(false); // Apenas equipe_solaris
    expect(permissions.canAddMembers).toBe(true);
    expect(permissions.canRemoveMembers).toBe(true);
    expect(permissions.canEditActions).toBe(true);
    expect(permissions.canDeleteActions).toBe(false); // Apenas equipe_solaris
  });

  it("should define correct permissions for observador in project", () => {
    const permissions = PROJECT_PERMISSIONS.observador;
    
    expect(permissions.canEditProject).toBe(false);
    expect(permissions.canDeleteProject).toBe(false);
    expect(permissions.canAddMembers).toBe(false);
    expect(permissions.canRemoveMembers).toBe(false);
    expect(permissions.canEditActions).toBe(false);
    expect(permissions.canDeleteActions).toBe(false);
    expect(permissions.canViewAudit).toBe(true); // Pode visualizar auditoria
  });

  it("should have all user roles defined", () => {
    expect(USER_PERMISSIONS.equipe_solaris).toBeDefined();
    expect(USER_PERMISSIONS.advogado_senior).toBeDefined();
    expect(USER_PERMISSIONS.advogado_junior).toBeDefined();
    expect(USER_PERMISSIONS.cliente).toBeDefined();
  });

  it("should have all project roles defined", () => {
    expect(PROJECT_PERMISSIONS.responsavel).toBeDefined();
    expect(PROJECT_PERMISSIONS.membro_equipe).toBeDefined();
    expect(PROJECT_PERMISSIONS.observador).toBeDefined();
  });
});
