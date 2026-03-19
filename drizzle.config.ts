import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: [
    "./drizzle/schema.ts",
    "./drizzle/schema-assessments-v2.ts",
    "./drizzle/schema-action-plans-v2.ts",
    "./drizzle/schema-notification-prefs.ts",
    "./drizzle/schema-compliance-engine-v3.ts",
  ],
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
