import { test as base, expect, type Page } from "@playwright/test";

/**
 * Custom test fixtures that provide pre-authenticated browser contexts.
 *
 * Usage:
 *   import { test, expect } from "../fixtures/auth.fixture";
 *   test("my test", async ({ authedPage }) => { ... });
 *   test("admin test", async ({ adminPage }) => { ... });
 */

export const test = base.extend<{
  authedPage: Page;
  adminPage: Page;
}>({
  // Authenticated user (org_user / non-admin)
  authedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "e2e/.auth/user.json",
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  // Authenticated admin user (isAdmin: true)
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "e2e/.auth/admin.json",
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
