/**
 * Tooling Check E2E — Sprint Z-18
 * Valida configuração: .mcp.json, hooks, settings
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";

test.describe("Tooling Z-18", () => {
  test("CT-01 — .mcp.json existe e é JSON válido", async () => {
    const content = fs.readFileSync(".mcp.json", "utf8");
    expect(() => JSON.parse(content)).not.toThrow();
    const config = JSON.parse(content);
    expect(config.mcpServers?.github).toBeDefined();
  });

  test("CT-02 — post-edit-lint.sh existe", async () => {
    expect(fs.existsSync(".claude/hooks/post-edit-lint.sh")).toBe(true);
  });

  test("CT-03 — settings.json tem PostToolUse hook", async () => {
    const settings = JSON.parse(
      fs.readFileSync(".claude/settings.json", "utf8")
    );
    const hooks = settings?.hooks?.PostToolUse;
    expect(hooks).toBeDefined();
    expect(hooks.length).toBeGreaterThan(0);
  });

  test("CT-04 — settings.json tem SessionStart hook", async () => {
    const settings = JSON.parse(
      fs.readFileSync(".claude/settings.json", "utf8")
    );
    const hooks = settings?.hooks?.SessionStart;
    expect(hooks).toBeDefined();
    expect(hooks.length).toBeGreaterThan(0);
  });
});
