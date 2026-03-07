import { type Page, type Locator, expect } from "@playwright/test";

/** Page object for the Send wizard page (/send). */
export class SendPage {
  readonly page: Page;
  readonly stepLabels: Locator;
  readonly continueButton: Locator;
  readonly backButton: Locator;
  readonly sendButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.stepLabels = page.locator("text=Review Content, text=Add Recipients, text=Schedule, text=Preview");
    this.continueButton = page.getByRole("button", { name: /continue/i });
    this.backButton = page.getByRole("button", { name: /back/i });
    this.sendButton = page.getByRole("button", { name: /send now|schedule send/i });
  }

  async goto() {
    await this.page.goto("/send");
  }

  async getCurrentStep(): Promise<number> {
    // The active step has scale-110 class
    const activeCircle = this.page.locator("[class*='scale-110']");
    const text = await activeCircle.textContent();
    return parseInt(text ?? "1", 10);
  }

  async proceedToStep(target: number) {
    let current = await this.getCurrentStep();
    while (current < target) {
      await this.continueButton.click();
      current++;
    }
  }

  // Step 2: Recipients
  async fillSingleRecipient(contact: string, firstName?: string, lastName?: string) {
    if (firstName) {
      await this.page.getByLabel("First Name").fill(firstName);
    }
    if (lastName) {
      await this.page.getByLabel("Last Name").fill(lastName);
    }
    await this.page.getByLabel(/email or mobile/i).fill(contact);
  }

  async selectBulkMode() {
    await this.page.getByRole("tab", { name: /bulk/i }).click();
  }

  async selectQrMode() {
    await this.page.getByRole("tab", { name: /qr code/i }).click();
  }

  // Step 3: Schedule
  async selectScheduleLater(date: string, time: string) {
    await this.page.getByRole("button", { name: /schedule$/i }).click();
    await this.page.getByLabel("Date").fill(date);
    await this.page.getByLabel("Time").fill(time);
  }

  async toggleReminders(enabled: boolean) {
    const toggle = this.page.getByRole("switch");
    const isChecked = await toggle.getAttribute("aria-checked");
    if ((isChecked === "true") !== enabled) {
      await toggle.click();
    }
  }

  // Step 4: Preview
  async getSummaryValue(label: string): Promise<string> {
    const row = this.page.locator("dl").locator(`dt:has-text("${label}") + dd`);
    return (await row.textContent()) ?? "";
  }
}
