import { test, expect } from "@playwright/test";

test.describe("Patient Viewer", () => {
  test("viewer page requires a valid token", async ({ page }) => {
    // Access viewer without token — should show error or redirect
    await page.goto("/view");
    await expect(
      page.locator("text=/not found|invalid|expired|error/i").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("viewer page with invalid token shows error", async ({ page }) => {
    await page.goto("/view?token=invalid-token-123");

    // Should show an error message
    await expect(
      page.locator("text=/not found|invalid|expired|error/i").first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("viewer page does not require authentication", async ({ page }) => {
    // Access viewer — should NOT redirect to login
    await page.goto("/view?token=test");
    await page.waitForTimeout(2000);

    const url = page.url();
    // Viewer should stay on /view, not redirect to /login
    expect(url).not.toMatch(/\/login/);
  });

  test("viewer page is accessible without cookies", async ({ browser }) => {
    // Fresh context with no stored auth
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/view?token=test");
    await page.waitForTimeout(2000);

    const url = page.url();
    expect(url).not.toMatch(/\/login/);

    await context.close();
  });
});
