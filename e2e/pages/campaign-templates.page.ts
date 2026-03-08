import type { Page, Locator } from "@playwright/test";

/**
 * Page object for the Campaign Templates feature.
 */
export class CampaignTemplatesPage {
  readonly page: Page;

  // Templates list page
  readonly heading: Locator;
  readonly newTemplateButton: Locator;
  readonly templateTable: Locator;
  readonly emptyState: Locator;
  readonly backToBulkSendsLink: Locator;

  // Template editor
  readonly templateNameInput: Locator;
  readonly templateDescriptionInput: Locator;
  readonly addStepButton: Locator;
  readonly saveButton: Locator;

  // Template detail
  readonly overviewTab: Locator;
  readonly enrollmentsTab: Locator;
  readonly enrollRecipientsButton: Locator;
  readonly moreActionsButton: Locator;

  // Enroll dialog
  readonly enrollSearchInput: Locator;
  readonly enrollSearchButton: Locator;
  readonly enrollSubmitButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // List page
    this.heading = page.getByRole("heading", {
      name: /time-release campaign templates/i,
    });
    this.newTemplateButton = page.getByRole("link", {
      name: /new template/i,
    });
    this.templateTable = page.locator("table");
    this.emptyState = page.getByText(/no campaign templates yet/i);
    this.backToBulkSendsLink = page.getByText(
      /back to bulk send campaigns/i
    );

    // Editor
    this.templateNameInput = page.getByPlaceholder(
      /e\.g\. pregnancy education/i
    );
    this.templateDescriptionInput = page.getByPlaceholder(
      /brief description/i
    );
    this.addStepButton = page.getByRole("button", { name: /add step/i });
    this.saveButton = page.getByRole("button", {
      name: /save template|create template|update template/i,
    });

    // Detail
    this.overviewTab = page.getByRole("tab", { name: /overview/i });
    this.enrollmentsTab = page.getByRole("tab", { name: /enrollments/i });
    this.enrollRecipientsButton = page.getByRole("button", {
      name: /enroll recipients/i,
    });
    this.moreActionsButton = page.getByRole("button", { name: "" }).filter({
      has: page.locator("svg"),
    });

    // Enroll dialog
    this.enrollSearchInput = page.getByPlaceholder(
      /search by name or contact/i
    );
    this.enrollSearchButton = page
      .locator("button")
      .filter({ has: page.locator("svg") })
      .last();
    this.enrollSubmitButton = page.getByRole("button", {
      name: /enroll \d+ recipient/i,
    });
  }

  async goto() {
    await this.page.goto("/campaigns/templates");
    await this.page.waitForTimeout(1000);
  }

  async gotoNew() {
    await this.page.goto("/campaigns/templates/new");
    await this.page.waitForTimeout(500);
  }

  async gotoDetail(templateId: string) {
    await this.page.goto(`/campaigns/templates/${templateId}`);
    await this.page.waitForTimeout(1000);
  }

  /** Get all step cards in the editor */
  getStepCards() {
    return this.page.locator(
      "[class*='rounded-lg'][class*='border'][class*='bg-background']"
    );
  }

  /** Get a step name input by index */
  getStepNameInput(index: number) {
    return this.page
      .getByPlaceholder(/e\.g\. first trimester/i)
      .nth(index);
  }

  /** Get a step delay input by index */
  getStepDelayInput(index: number) {
    return this.getStepCards().nth(index).locator('input[type="number"]').first();
  }

  /** Get the timeline visualization */
  getTimeline() {
    return this.page.locator("[class*='bg-muted/50']").first();
  }

  /** Get the number of steps shown in timeline */
  async getTimelineStepCount() {
    return this.page
      .locator(
        "[class*='bg-muted/50'] [class*='rounded-full'][class*='bg-primary']"
      )
      .count();
  }

  /** Fill in a step's details */
  async fillStep(
    index: number,
    opts: { name: string; delayDays: number; contentIds?: string }
  ) {
    const nameInput = this.getStepNameInput(index);
    await nameInput.fill(opts.name);

    const delayInput = this.getStepDelayInput(index);
    await delayInput.fill(String(opts.delayDays));

    if (opts.contentIds) {
      const contentInput = this.getStepCards()
        .nth(index)
        .getByPlaceholder(/uuid1/i);
      await contentInput.fill(opts.contentIds);
    }
  }

  /** Remove a step by clicking its delete button */
  async removeStep(index: number) {
    const deleteButton = this.getStepCards()
      .nth(index)
      .getByRole("button")
      .filter({ has: this.page.locator("svg") })
      .last();
    await deleteButton.click();
  }
}
