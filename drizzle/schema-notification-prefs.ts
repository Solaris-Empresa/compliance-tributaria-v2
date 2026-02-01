import { mysqlTable, int, boolean, timestamp } from "drizzle-orm/mysql-core";

/**
 * CAMADA 6 - Preferências de Notificação por Usuário
 * Permite configurar quais eventos geram notificações
 */
export const notificationPreferences = mysqlTable("notificationPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // 1:1 com usuário
  
  // Eventos de tarefas
  taskCreated: boolean("taskCreated").default(true).notNull(),
  taskStarted: boolean("taskStarted").default(true).notNull(),
  taskDueSoon: boolean("taskDueSoon").default(true).notNull(), // 3 dias antes
  taskOverdue: boolean("taskOverdue").default(true).notNull(),
  taskCompleted: boolean("taskCompleted").default(false).notNull(),
  taskCommented: boolean("taskCommented").default(true).notNull(),
  
  // Configurações gerais
  emailEnabled: boolean("emailEnabled").default(true).notNull(),
  inAppEnabled: boolean("inAppEnabled").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;
