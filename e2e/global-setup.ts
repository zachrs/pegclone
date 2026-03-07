import { test as setup, expect } from "@playwright/test";

/**
 * Global setup: logs in as a test user and saves the authenticated session
 * to a storage state file that other tests reuse.
 *
 * This runs once before all test suites (via the "setup" project dependency).
 */

const STORAGE_STATE = "e2e/.auth/user.json";

setup("authenticate as org user", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL ?? "testuser@example.com";
  const password = process.env.E2E_USER_PASSWORD ?? "TestPassword123!";

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  // Wait for redirect to authenticated page
  await expect(page).not.toHaveURL(/\/login/);

  // Handle MFA if it appears
  if (page.url().includes("/mfa-verify")) {
    // In test environment, use a known MFA code or skip
    const mfaCode = process.env.E2E_MFA_CODE ?? "000000";
    await page.getByPlaceholder(/code/i).fill(mfaCode);
    await page.getByRole("button", { name: /verify/i }).click();
    await expect(page).not.toHaveURL(/\/mfa-verify/);
  }

  // Verify we landed on an authenticated page
  await expect(page).toHaveURL(/\/(library|dashboard|send)/);

  // Save authentication state
  await page.context().storageState({ path: STORAGE_STATE });
});
