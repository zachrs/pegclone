import { test, expect } from "@playwright/test";

test.describe("Admin Features", () => {
  test("non-admin cannot access super-admin routes", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "e2e/.auth/user.json",
    });
    const page = await context.newPage();

    await page.goto("/super-admin/orgs");
    const url = page.url();
    expect(url).not.toContain("/super-admin/orgs");

    await context.close();
  });

  test("admin can see team folder actions", async ({ browser }) => {
    // This test requires admin storage state
    // Skip if admin auth not available
    const fs = await import("fs");
    if (!fs.existsSync("e2e/.auth/admin.json")) {
      test.skip();
      return;
    }

    const context = await browser.newContext({
      storageState: "e2e/.auth/admin.json",
    });
    const page = await context.newPage();

    await page.goto("/library");
    await page.waitForTimeout(2000);

    // Admin should see the library page
    await expect(page.getByRole("button", { name: /my materials/i })).toBeVisible();

    await context.close();
  });

  test("folder publish/unpublish requires admin", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "e2e/.auth/user.json",
    });
    const page = await context.newPage();

    await page.goto("/library");
    await page.waitForTimeout(2000);

    // Regular users should not see publish/unpublish icons on team folders
    // The toggle type button (Users/Folder icon) should not be visible for non-admins
    const toggleButtons = page.locator("[aria-label='Make team folder'], [aria-label='Make personal folder']");
    await expect(toggleButtons.first()).not.toBeVisible({ timeout: 3_000 });

    await context.close();
  });

  test("folder delete has confirmation step", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "e2e/.auth/user.json",
    });
    const page = await context.newPage();

    await page.goto("/library");
    await page.waitForTimeout(2000);

    // If a delete button exists, clicking it should show confirm/cancel
    const deleteButton = page.locator("[aria-label='Delete folder']").first();
    const deleteExists = (await deleteButton.count()) > 0;

    if (!deleteExists) {
      test.skip();
      await context.close();
      return;
    }

    // Hover to reveal actions
    const folderItem = deleteButton.locator("../..");
    await folderItem.hover();

    await deleteButton.click();

    // Should show confirmation buttons
    await expect(page.locator("[aria-label='Confirm delete']")).toBeVisible({ timeout: 3_000 });
    await expect(page.locator("[aria-label='Cancel delete']")).toBeVisible({ timeout: 3_000 });

    await context.close();
  });
});
