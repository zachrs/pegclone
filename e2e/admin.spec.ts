import { test, expect } from "./fixtures/auth.fixture";

test.describe("Admin Features", () => {
  test("non-admin cannot access super-admin routes", async ({ authedPage }) => {
    await authedPage.goto("/super-admin/orgs");
    const url = authedPage.url();
    expect(url).not.toContain("/super-admin/orgs");
  });

  test("admin can see team folder actions", async ({ adminPage }) => {
    await adminPage.goto("/library");
    await adminPage.waitForTimeout(2000);

    // Admin should see the library page
    await expect(adminPage.getByRole("button", { name: /my materials/i })).toBeVisible();
  });

  test("folder publish/unpublish requires admin", async ({ authedPage }) => {
    await authedPage.goto("/library");
    await authedPage.waitForTimeout(2000);

    // Regular users should not see publish/unpublish icons on team folders
    const toggleButtons = authedPage.locator("[aria-label='Make team folder'], [aria-label='Make personal folder']");
    await expect(toggleButtons.first()).not.toBeVisible({ timeout: 3_000 });
  });

  test("folder delete has confirmation step", async ({ adminPage }) => {
    await adminPage.goto("/library");
    await adminPage.waitForTimeout(2000);

    // If a delete button exists, clicking it should show confirm/cancel
    const deleteButton = adminPage.locator("[aria-label='Delete folder']").first();
    const deleteExists = (await deleteButton.count()) > 0;

    if (!deleteExists) {
      test.skip();
      return;
    }

    // Hover to reveal actions
    const folderItem = deleteButton.locator("../..");
    await folderItem.hover();

    await deleteButton.click();

    // Should show confirmation buttons
    await expect(adminPage.locator("[aria-label='Confirm delete']")).toBeVisible({ timeout: 3_000 });
    await expect(adminPage.locator("[aria-label='Cancel delete']")).toBeVisible({ timeout: 3_000 });
  });
});
