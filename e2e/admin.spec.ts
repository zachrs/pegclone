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

    // Admin should see the library page with team folder toggle actions
    await expect(adminPage.getByRole("button", { name: /my materials/i })).toBeVisible();

    // Find a folder item and hover to reveal admin actions
    const folderItem = adminPage.locator(".group").filter({
      has: adminPage.locator("span.truncate"),
    }).first();

    if ((await folderItem.count()) === 0) {
      test.skip();
      return;
    }

    await folderItem.hover();

    // Admin should see toggle type button (Make team/personal folder)
    const toggleButton = adminPage.locator(
      "[aria-label='Make team folder'], [aria-label='Make personal folder']"
    ).first();
    await expect(toggleButton).toBeVisible({ timeout: 3_000 });
  });

  test("folder publish/unpublish requires admin", async ({ authedPage }) => {
    await authedPage.goto("/library");
    await authedPage.waitForTimeout(2000);

    // Hover over a folder item
    const folderItem = authedPage.locator(".group").filter({
      has: authedPage.locator("span.truncate"),
    }).first();

    if ((await folderItem.count()) === 0) {
      test.skip();
      return;
    }

    await folderItem.hover();

    // Regular users should not see publish/unpublish toggle buttons
    const toggleButtons = authedPage.locator(
      "[aria-label='Make team folder'], [aria-label='Make personal folder']"
    );
    await expect(toggleButtons.first()).not.toBeVisible({ timeout: 3_000 });
  });

  test("folder delete has confirmation step", async ({ adminPage }) => {
    await adminPage.goto("/library");
    await adminPage.waitForTimeout(2000);

    // Find a deletable folder by hovering to reveal the delete button
    const folderItems = adminPage.locator(".group").filter({
      has: adminPage.locator("span.truncate"),
    });
    const count = await folderItems.count();

    let deleteButton = null;
    for (let i = 0; i < count; i++) {
      await folderItems.nth(i).hover();
      const btn = adminPage.locator("[aria-label='Delete folder']").first();
      if ((await btn.count()) > 0 && (await btn.isVisible())) {
        deleteButton = btn;
        break;
      }
    }

    if (!deleteButton) {
      test.skip();
      return;
    }

    // Click delete — should show confirmation
    await deleteButton.click();

    await expect(adminPage.locator("[aria-label='Confirm delete']")).toBeVisible({ timeout: 3_000 });
    await expect(adminPage.locator("[aria-label='Cancel delete']")).toBeVisible({ timeout: 3_000 });

    // Cancel the delete to avoid side effects
    await adminPage.locator("[aria-label='Cancel delete']").click();
  });
});
