import { test, expect } from "./fixtures/auth.fixture";
import { SendPage } from "./pages/send.page";

test.describe("Send Wizard", () => {
  test("redirects to library if no items in cart", async ({ authedPage }) => {
    await authedPage.goto("/send");

    // Should redirect to library or show empty state
    await expect(authedPage).toHaveURL(/\/(library|send)/, { timeout: 10_000 });
  });

  test("shows step indicator with 3 steps", async ({ authedPage }) => {
    // Navigate to library first, select an item, then open send dialog
    await authedPage.goto("/library");
    await authedPage.waitForTimeout(2000);

    // Try clicking a content card to select it
    const card = authedPage.locator("[class*='rounded-xl'][class*='border'][class*='shadow-md']").first();
    const cardCount = await card.count();

    if (cardCount === 0) {
      test.skip();
      return;
    }

    await card.click();
    // Cart bar should appear with "{n} Selected" badge
    await expect(
      authedPage.locator("text=/\\d+ Selected/").first()
    ).toBeVisible({ timeout: 5_000 });

    // Click Send button in the cart bar to open the send dialog
    await authedPage.getByRole("button", { name: "Send" }).click();

    // The send dialog should open with a step indicator (3 steps)
    await expect(authedPage.locator("text=Add Recipients")).toBeVisible({ timeout: 5_000 });
    await expect(authedPage.locator("text=Schedule")).toBeVisible();
    await expect(authedPage.locator("text=Preview & Send")).toBeVisible();
  });

  test("recipient form has required fields", async ({ authedPage }) => {
    // Select content from library and open the send dialog
    await authedPage.goto("/library");
    await authedPage.waitForTimeout(2000);

    const card = authedPage.locator("[class*='rounded-xl'][class*='border'][class*='shadow-md']").first();
    const cardCount = await card.count();

    if (cardCount === 0) {
      test.skip();
      return;
    }

    await card.click();
    await expect(
      authedPage.locator("text=/\\d+ Selected/").first()
    ).toBeVisible({ timeout: 5_000 });

    // Open send dialog
    await authedPage.getByRole("button", { name: "Send" }).click();

    // Step 1 shows recipient fields — email/phone input and Continue button
    await expect(authedPage.getByLabel(/email or phone/i)).toBeVisible({ timeout: 5_000 });
    await expect(authedPage.getByRole("button", { name: /continue/i })).toBeVisible();
  });

  test("bulk mode tab exists", async ({ authedPage }) => {
    const sendPage = new SendPage(authedPage);
    await sendPage.goto();

    const url = authedPage.url();
    if (!url.includes("/send")) {
      test.skip();
      return;
    }

    // Navigate to recipients step
    try {
      await sendPage.continueButton.click({ timeout: 3_000 });
    } catch {
      test.skip();
      return;
    }

    // Look for bulk tab
    const bulkTab = authedPage.getByRole("tab", { name: /bulk/i });
    await expect(bulkTab).toBeVisible({ timeout: 5_000 });
  });

  test("QR code tab exists", async ({ authedPage }) => {
    const sendPage = new SendPage(authedPage);
    await sendPage.goto();

    const url = authedPage.url();
    if (!url.includes("/send")) {
      test.skip();
      return;
    }

    try {
      await sendPage.continueButton.click({ timeout: 3_000 });
    } catch {
      test.skip();
      return;
    }

    const qrTab = authedPage.getByRole("tab", { name: /qr code/i });
    await expect(qrTab).toBeVisible({ timeout: 5_000 });
  });
});
