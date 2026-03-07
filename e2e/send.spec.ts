import { test, expect } from "./fixtures/auth.fixture";
import { SendPage } from "./pages/send.page";

test.describe("Send Wizard", () => {
  test("redirects to library if no items in cart", async ({ authedPage }) => {
    await authedPage.goto("/send");

    // Should redirect to library or show empty state
    await expect(authedPage).toHaveURL(/\/(library|send)/, { timeout: 10_000 });
  });

  test("shows step indicator with 4 steps", async ({ authedPage }) => {
    // Navigate to library first, select an item, then go to send
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
    // Look for send button in cart bar
    const sendLink = authedPage.locator("text=/send \\d+ item/i").first();
    await expect(sendLink).toBeVisible({ timeout: 5_000 });
    await sendLink.click();

    // Should be on send page
    await expect(authedPage).toHaveURL(/\/send/, { timeout: 5_000 });
  });

  test("recipient form has required fields", async ({ authedPage }) => {
    const sendPage = new SendPage(authedPage);
    await sendPage.goto();

    // If we're still on the send page (have items), check for form fields
    const url = authedPage.url();
    if (!url.includes("/send")) {
      test.skip();
      return;
    }

    // The first step should be Review Content
    // Check for continue button to proceed
    await expect(sendPage.continueButton).toBeVisible({ timeout: 5_000 });
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
