import { test as base, expect, type Page } from "@playwright/test";

/**
 * Custom test fixtures that provide pre-authenticated browser contexts.
 *
 * Usage:
 *   import { test, expect } from "../fixtures/auth.fixture";
 *   test("my test", async ({ authedPage }) => { ... });
 */

// Authenticated user (org_user)
export const test = base.extend<{
  authedPage: Page;
}>({
  authedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "e2e/.auth/user.json",
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
