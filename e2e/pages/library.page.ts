import { type Page, type Locator, expect } from "@playwright/test";

/** Page object for the Content Library page. */
export class LibraryPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly addContentButton: Locator;
  readonly gridViewButton: Locator;
  readonly listViewButton: Locator;
  readonly pegLibraryButton: Locator;
  readonly myMaterialsButton: Locator;
  readonly newFolderButton: Locator;
  readonly contentCards: Locator;
  readonly loadingSkeleton: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator("h2").first();
    this.searchInput = page.getByPlaceholder(/search/i);
    this.addContentButton = page.getByRole("button", { name: /add content/i });
    this.gridViewButton = page.getByRole("button", { name: /grid view/i });
    this.listViewButton = page.getByRole("button", { name: /list view/i });
    this.pegLibraryButton = page.getByRole("button", { name: /peg library/i });
    this.myMaterialsButton = page.getByRole("button", { name: /my materials/i });
    this.newFolderButton = page.getByRole("button", { name: /new folder/i });
    this.contentCards = page.locator("[class*='rounded-xl'][class*='border'][class*='shadow-md']");
    this.loadingSkeleton = page.locator(".animate-pulse");
    this.emptyState = page.locator("text=No content");
  }

  async goto() {
    await this.page.goto("/library");
  }

  async waitForContentLoad() {
    // Wait for loading skeletons to disappear
    await expect(this.loadingSkeleton.first()).not.toBeVisible({ timeout: 15_000 });
  }

  async searchFor(query: string) {
    await this.searchInput.fill(query);
    // Debounce wait
    await this.page.waitForTimeout(500);
  }

  async switchToPegLibrary() {
    await this.pegLibraryButton.click();
  }

  async switchToMyMaterials() {
    await this.myMaterialsButton.click();
  }

  async selectFolder(folderName: string) {
    await this.page.getByRole("button", { name: folderName }).click();
  }

  async selectContentCard(title: string) {
    await this.page.locator(`text=${title}`).first().click();
  }

  async getContentCardCount() {
    return this.contentCards.count();
  }

  async addLink(title: string, url: string) {
    await this.addContentButton.click();
    await this.page.getByRole("button", { name: /add link/i }).click();
    await this.page.getByPlaceholder(/diabetes/i).fill(title);
    await this.page.getByPlaceholder(/https/i).fill(url);
    await this.page.getByRole("button", { name: /^add link$/i }).click();
  }

  async createFolder(name: string, isTeam = false) {
    await this.newFolderButton.click();
    await this.page.getByPlaceholder(/folder name/i).fill(name);
    if (isTeam) {
      await this.page.getByLabel(/team folder/i).check();
    }
    await this.page.getByRole("button", { name: /create/i }).click();
  }

  async getFolderNames(): Promise<string[]> {
    const buttons = this.page.locator("aside button span.truncate");
    return buttons.allTextContents();
  }
}
