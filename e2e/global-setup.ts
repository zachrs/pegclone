import { test as setup, expect, type Page } from "@playwright/test";

/**
 * Global setup: logs in as test users and saves authenticated sessions
 * to storage state files that other tests reuse.
 *
 * This runs once before all test suites (via the "setup" project dependency).
 */

const USER_STORAGE_STATE = "e2e/.auth/user.json";
const ADMIN_STORAGE_STATE = "e2e/.auth/admin.json";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  // Wait for redirect to authenticated page
  await expect(page).not.toHaveURL(/\/login/);

  // Handle MFA if it appears
  if (page.url().includes("/mfa-verify")) {
    const mfaCode = process.env.E2E_MFA_CODE ?? "000000";
    await page.getByPlaceholder(/code/i).fill(mfaCode);
    await page.getByRole("button", { name: /verify/i }).click();
    await expect(page).not.toHaveURL(/\/mfa-verify/);
  }

  // Verify we landed on an authenticated page
  await expect(page).toHaveURL(/\/(library|dashboard|send)/);
}

setup("authenticate as org user", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL ?? "testuser@example.com";
  const password = process.env.E2E_USER_PASSWORD ?? "TestPassword123!";

  await login(page, email, password);
  await page.context().storageState({ path: USER_STORAGE_STATE });
});

setup("authenticate as admin user", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL ?? "admin@acme.test";
  const password = process.env.E2E_ADMIN_PASSWORD ?? "password123";

  await login(page, email, password);
  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
