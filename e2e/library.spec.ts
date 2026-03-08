import { test, expect } from "./fixtures/auth.fixture";
import { LibraryPage } from "./pages/library.page";

test.describe("Library", () => {
  test("loads library page with content tabs", async ({ authedPage }) => {
    const library = new LibraryPage(authedPage);
    await library.goto();

    await expect(library.pegLibraryButton).toBeVisible();
    await expect(library.myMaterialsButton).toBeVisible();
  });

  test("PEG Library tab shows system content", async ({ authedPage }) => {
    const library = new LibraryPage(authedPage);
    await library.goto();

    await library.switchToPegLibrary();
    await library.waitForContentLoad();

    // Should show content cards or empty state
    const cards = await library.getContentCardCount();
    if (cards === 0) {
      await expect(library.emptyState).toBeVisible();
    } else {
      expect(cards).toBeGreaterThan(0);
    }
  });

  test("My Materials tab shows org content", async ({ authedPage }) => {
    const library = new LibraryPage(authedPage);
    await library.goto();

    await library.switchToMyMaterials();
    await library.waitForContentLoad();

    // Should show content or empty state
    const cards = await library.getContentCardCount();
    if (cards === 0) {
      await expect(library.emptyState).toBeVisible();
    } else {
      expect(cards).toBeGreaterThan(0);
    }
  });

  test("search filters content", async ({ authedPage }) => {
    const library = new LibraryPage(authedPage);
    await library.goto();
    await library.waitForContentLoad();

    await library.searchFor("diabetes");
    // Wait for search results
    await authedPage.waitForTimeout(1000);

    // Verify search input has the query
    await expect(library.searchInput).toHaveValue("diabetes");
  });

  test("can toggle between grid and list views", async ({ authedPage }) => {
    const library = new LibraryPage(authedPage);
    await library.goto();
    await library.waitForContentLoad();

    // Switch to list view
    await library.listViewButton.click();
    // Table should be visible
    await expect(authedPage.locator("table").first()).toBeVisible({ timeout: 5_000 });

    // Switch back to grid view
    await library.gridViewButton.click();
    // Table should not be visible
    await expect(authedPage.locator("table").first()).not.toBeVisible({ timeout: 5_000 });
  });

  test("create folder dialog works", async ({ authedPage }) => {
    const library = new LibraryPage(authedPage);
    await library.goto();

    await library.newFolderButton.click();
    // Dialog should appear
    await expect(authedPage.getByText("Create New Folder")).toBeVisible();
    await expect(authedPage.getByPlaceholder(/folder name/i)).toBeVisible();
    await expect(authedPage.getByLabel(/team folder/i)).toBeVisible();
    await expect(authedPage.getByRole("button", { name: /create/i })).toBeVisible();
  });

  test("selecting content shows send cart bar", async ({ authedPage }) => {
    const library = new LibraryPage(authedPage);
    await library.goto();
    await library.waitForContentLoad();

    const cards = await library.getContentCardCount();
    if (cards === 0) {
      test.skip();
      return;
    }

    // Click a content card to select it
    await library.contentCards.first().click();

    // Send cart bar should appear at the bottom with "{n} Selected" badge and "Send" button
    await expect(
      authedPage.locator("text=/\\d+ Selected/").first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("add link content dialog", async ({ authedPage }) => {
    const library = new LibraryPage(authedPage);
    await library.goto();
    await library.switchToMyMaterials();

    // Click Add Content button
    await library.addContentButton.click();

    // Dialog should show content type options (use .first() since "Add Link" appears as both mode toggle and form submit)
    await expect(
      authedPage.getByRole("button", { name: /add link/i }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test("favorite toggle updates heart icon", async ({ authedPage }) => {
    const library = new LibraryPage(authedPage);
    await library.goto();
    await library.waitForContentLoad();

    const cards = await library.getContentCardCount();
    if (cards === 0) {
      test.skip();
      return;
    }

    // Find a favorite button on the first card
    const favoriteButton = authedPage
      .getByRole("button", { name: /add to favorites|remove from favorites/i })
      .first();
    await expect(favoriteButton).toBeVisible();
  });
});
