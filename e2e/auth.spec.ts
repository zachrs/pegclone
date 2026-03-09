import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/login.page";

test.describe("Authentication", () => {
  test("shows login page for unauthenticated users", async ({ page }) => {
    await page.goto("/library");
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page has email and password fields", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login("bad@example.com", "wrongpassword");

    // Should stay on login page and show an error
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.locator("text=/invalid|incorrect|failed/i").first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("successful login redirects to library", async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL ?? "testuser@example.com";
    const password = process.env.E2E_USER_PASSWORD ?? "TestPassword123!";

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(email, password);

    // Should redirect away from login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("protected routes redirect unauthenticated users", async ({ page }) => {
    const protectedRoutes = ["/dashboard", "/library", "/send", "/recipients", "/profile"];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("admin routes block non-admin users", async ({ browser }) => {
    // Use authenticated context (regular org_user, not admin)
    const context = await browser.newContext({
      storageState: "e2e/.auth/user.json",
    });
    const page = await context.newPage();

    await page.goto("/super-admin/orgs");
    // Should be redirected or see forbidden
    const url = page.url();
    expect(url).not.toContain("/super-admin/orgs");

    await context.close();
  });
});
