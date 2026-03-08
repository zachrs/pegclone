import { test, expect } from "./fixtures/auth.fixture";
import { CampaignTemplatesPage } from "./pages/campaign-templates.page";

test.describe("Campaign Templates - List Page", () => {
  test("loads templates page with heading and new button", async ({
    authedPage,
  }) => {
    const templates = new CampaignTemplatesPage(authedPage);
    await templates.goto();

    await expect(templates.heading).toBeVisible({ timeout: 10_000 });
    await expect(templates.newTemplateButton).toBeVisible();
  });

  test("shows empty state or template table", async ({ authedPage }) => {
    const templates = new CampaignTemplatesPage(authedPage);
    await templates.goto();

    // Either the table or the empty state should be visible
    const hasTable =
      (await templates.templateTable.count()) > 0 &&
      (await templates.templateTable.isVisible().catch(() => false));
    const hasEmpty = await templates.emptyState
      .isVisible()
      .catch(() => false);

    expect(hasTable || hasEmpty).toBe(true);
  });

  test("has link back to bulk send campaigns", async ({ authedPage }) => {
    const templates = new CampaignTemplatesPage(authedPage);
    await templates.goto();

    await expect(templates.backToBulkSendsLink).toBeVisible();
  });

  test("new template button navigates to editor", async ({ authedPage }) => {
    const templates = new CampaignTemplatesPage(authedPage);
    await templates.goto();

    await templates.newTemplateButton.click();
    await expect(authedPage).toHaveURL(/\/campaigns\/templates\/new/, {
      timeout: 5_000,
    });
  });
});

test.describe("Campaign Templates - Editor", () => {
  test("new template page shows editor with default step", async ({
    authedPage,
  }) => {
    const templates = new CampaignTemplatesPage(authedPage);
    await templates.gotoNew();

    // Template details section
    await expect(templates.templateNameInput).toBeVisible({ timeout: 5_000 });
    await expect(templates.templateDescriptionInput).toBeVisible();

    // Should have exactly one step by default
    const stepCards = templates.getStepCards();
    await expect(stepCards).toHaveCount(1);

    // Step name and delay inputs should be visible
    await expect(templates.getStepNameInput(0)).toBeVisible();
    await expect(templates.getStepDelayInput(0)).toBeVisible();
  });

  test("can add and remove steps", async ({ authedPage }) => {
    const templates = new CampaignTemplatesPage(authedPage);
    await templates.gotoNew();

    const stepCards = templates.getStepCards();

    // Start with 1 step
    await expect(stepCards).toHaveCount(1);

    // Add a step
    await templates.addStepButton.click();
    await expect(stepCards).toHaveCount(2);

    // Add another
    await templates.addStepButton.click();
    await expect(stepCards).toHaveCount(3);

    // Remove the middle step (index 1) — click the trash icon
    // The delete button is the last icon button in each step card
    const middleCard = stepCards.nth(1);
    const deleteBtn = middleCard
      .getByRole("button")
      .filter({ has: authedPage.locator("svg") })
      .last();
    await deleteBtn.click();
    await expect(stepCards).toHaveCount(2);
  });

  test("timeline visualization updates with steps", async ({
    authedPage,
  }) => {
    const templates = new CampaignTemplatesPage(authedPage);
    await templates.gotoNew();

    // Initially 1 step in timeline
    let timelineSteps = await templates.getTimelineStepCount();
    expect(timelineSteps).toBe(1);

    // Add steps
    await templates.addStepButton.click();
    await templates.addStepButton.click();

    timelineSteps = await templates.getTimelineStepCount();
    expect(timelineSteps).toBe(3);
  });

  test("step name inputs can be filled", async ({ authedPage }) => {
    const templates = new CampaignTemplatesPage(authedPage);
    await templates.gotoNew();

    await templates.fillStep(0, {
      name: "First Trimester",
      delayDays: 0,
    });

    await expect(templates.getStepNameInput(0)).toHaveValue("First Trimester");
    await expect(templates.getStepDelayInput(0)).toHaveValue("0");
  });

  test("shows validation error when saving without name", async ({
    authedPage,
  }) => {
    const templates = new CampaignTemplatesPage(authedPage);
    await templates.gotoNew();

    // Fill step name but not template name
    await templates.fillStep(0, { name: "Step 1", delayDays: 0 });

    // Try to save
    await templates.saveButton.click();

    // Should show error
    await expect(
      authedPage.getByText(/template name is required/i)
    ).toBeVisible({ timeout: 3_000 });
  });

  test("shows validation error when step name is empty", async ({
    authedPage,
  }) => {
    const templates = new CampaignTemplatesPage(authedPage);
    await templates.gotoNew();

    // Fill template name but leave step name empty
    await templates.templateNameInput.fill("Test Template");

    // Try to save
    await templates.saveButton.click();

    // Should show error about step names
    await expect(
      authedPage.getByText(/all steps must have a name/i)
    ).toBeVisible({ timeout: 3_000 });
  });

  test("can create a template with multiple steps", async ({
    authedPage,
  }) => {
    const templates = new CampaignTemplatesPage(authedPage);
    await templates.gotoNew();

    // Fill template details
    await templates.templateNameInput.fill("Pregnancy Education");
    await templates.templateDescriptionInput.fill(
      "3-step pregnancy education campaign"
    );

    // Fill first step
    await templates.fillStep(0, {
      name: "First Trimester",
      delayDays: 0,
    });

    // Add and fill second step
    await templates.addStepButton.click();
    await templates.fillStep(1, {
      name: "Second Trimester",
      delayDays: 90,
    });

    // Add and fill third step
    await templates.addStepButton.click();
    await templates.fillStep(2, {
      name: "Third Trimester",
      delayDays: 180,
    });

    // Save
    await templates.saveButton.click();

    // Should redirect to the template detail page
    await expect(authedPage).toHaveURL(/\/campaigns\/templates\/[a-f0-9-]+$/, {
      timeout: 10_000,
    });

    // Template name should be visible on detail page
    await expect(
      authedPage.getByRole("heading", { name: "Pregnancy Education" })
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Campaign Templates - Detail Page", () => {
  // This test creates a template first, then tests the detail page
  test("detail page shows template info and timeline", async ({
    authedPage,
  }) => {
    const templates = new CampaignTemplatesPage(authedPage);

    // Create a template first
    await templates.gotoNew();
    await templates.templateNameInput.fill("E2E Test Campaign");
    await templates.templateDescriptionInput.fill("Test description");
    await templates.fillStep(0, {
      name: "Welcome",
      delayDays: 0,
    });
    await templates.addStepButton.click();
    await templates.fillStep(1, {
      name: "Follow-up",
      delayDays: 30,
    });
    await templates.saveButton.click();

    // Should be on detail page
    await expect(authedPage).toHaveURL(/\/campaigns\/templates\/[a-f0-9-]+$/, {
      timeout: 10_000,
    });

    // Check template info
    await expect(
      authedPage.getByRole("heading", { name: "E2E Test Campaign" })
    ).toBeVisible({ timeout: 5_000 });
    await expect(authedPage.getByText("Test description")).toBeVisible();

    // Check stats cards
    await expect(authedPage.getByText("Steps")).toBeVisible();
    await expect(authedPage.getByText("Duration")).toBeVisible();
    await expect(authedPage.getByText("Enrolled")).toBeVisible();

    // Check overview tab shows timeline
    await expect(authedPage.getByText("Campaign Timeline")).toBeVisible();
    await expect(authedPage.getByText("Welcome")).toBeVisible();
    await expect(authedPage.getByText("Follow-up")).toBeVisible();
  });

  test("detail page has overview and enrollments tabs", async ({
    authedPage,
  }) => {
    const templates = new CampaignTemplatesPage(authedPage);

    // Create a template
    await templates.gotoNew();
    await templates.templateNameInput.fill("Tabs Test Campaign");
    await templates.fillStep(0, { name: "Step 1", delayDays: 0 });
    await templates.saveButton.click();
    await expect(authedPage).toHaveURL(/\/campaigns\/templates\/[a-f0-9-]+$/, {
      timeout: 10_000,
    });

    // Check tabs
    await expect(templates.overviewTab).toBeVisible({ timeout: 5_000 });
    await expect(templates.enrollmentsTab).toBeVisible();

    // Switch to enrollments tab
    await templates.enrollmentsTab.click();

    // Should show empty enrollments state
    await expect(
      authedPage.getByText(/no recipients enrolled yet/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test("enroll recipients button opens dialog", async ({ authedPage }) => {
    const templates = new CampaignTemplatesPage(authedPage);

    // Create a template
    await templates.gotoNew();
    await templates.templateNameInput.fill("Enroll Dialog Test");
    await templates.fillStep(0, { name: "Step 1", delayDays: 0 });
    await templates.saveButton.click();
    await expect(authedPage).toHaveURL(/\/campaigns\/templates\/[a-f0-9-]+$/, {
      timeout: 10_000,
    });

    // Click enroll button
    await templates.enrollRecipientsButton.click();

    // Dialog should appear
    await expect(
      authedPage.getByRole("heading", { name: /enroll recipients/i })
    ).toBeVisible({ timeout: 5_000 });
    await expect(templates.enrollSearchInput).toBeVisible();
  });

  test("more actions menu has edit, duplicate, delete", async ({
    authedPage,
  }) => {
    const templates = new CampaignTemplatesPage(authedPage);

    // Create a template
    await templates.gotoNew();
    await templates.templateNameInput.fill("Actions Menu Test");
    await templates.fillStep(0, { name: "Step 1", delayDays: 0 });
    await templates.saveButton.click();
    await expect(authedPage).toHaveURL(/\/campaigns\/templates\/[a-f0-9-]+$/, {
      timeout: 10_000,
    });

    // Open more actions dropdown — it's the outline icon button next to "Enroll Recipients"
    const moreButton = authedPage
      .getByRole("button")
      .filter({ has: authedPage.locator("svg") })
      .last();
    await moreButton.click();

    // Check menu items
    await expect(
      authedPage.getByRole("menuitem", { name: /edit template/i })
    ).toBeVisible({ timeout: 3_000 });
    await expect(
      authedPage.getByRole("menuitem", { name: /duplicate/i })
    ).toBeVisible();
    await expect(
      authedPage.getByRole("menuitem", { name: /delete/i })
    ).toBeVisible();
  });

  test("edit mode shows template editor pre-filled", async ({
    authedPage,
  }) => {
    const templates = new CampaignTemplatesPage(authedPage);

    // Create a template
    await templates.gotoNew();
    await templates.templateNameInput.fill("Edit Mode Test");
    await templates.templateDescriptionInput.fill("Original description");
    await templates.fillStep(0, {
      name: "Original Step",
      delayDays: 7,
    });
    await templates.saveButton.click();
    await expect(authedPage).toHaveURL(/\/campaigns\/templates\/[a-f0-9-]+$/, {
      timeout: 10_000,
    });

    // Open more actions and click Edit
    const moreButton = authedPage
      .getByRole("button")
      .filter({ has: authedPage.locator("svg") })
      .last();
    await moreButton.click();
    await authedPage
      .getByRole("menuitem", { name: /edit template/i })
      .click();

    // Should show editor with pre-filled values
    await expect(templates.templateNameInput).toHaveValue("Edit Mode Test", {
      timeout: 5_000,
    });
    await expect(templates.templateDescriptionInput).toHaveValue(
      "Original description"
    );
    await expect(templates.getStepNameInput(0)).toHaveValue("Original Step");

    // Cancel editing link should be visible
    await expect(authedPage.getByText(/cancel editing/i)).toBeVisible();
  });
});

test.describe("Campaign Templates - Navigation", () => {
  test("sidebar has Campaigns link", async ({ authedPage }) => {
    await authedPage.goto("/dashboard");
    await authedPage.waitForTimeout(1000);

    const campaignsLink = authedPage.getByRole("link", {
      name: /campaigns/i,
    });
    await expect(campaignsLink.first()).toBeVisible({ timeout: 5_000 });
  });

  test("bulk send campaigns page has link to templates", async ({
    authedPage,
  }) => {
    await authedPage.goto("/campaigns");
    await authedPage.waitForTimeout(1000);

    const templatesLink = authedPage.getByRole("link", {
      name: /time-release templates/i,
    });
    await expect(templatesLink).toBeVisible({ timeout: 5_000 });
  });

  test("clicking templates link from campaigns navigates correctly", async ({
    authedPage,
  }) => {
    await authedPage.goto("/campaigns");
    await authedPage.waitForTimeout(1000);

    await authedPage
      .getByRole("link", { name: /time-release templates/i })
      .click();
    await expect(authedPage).toHaveURL(/\/campaigns\/templates/, {
      timeout: 5_000,
    });
  });
});

test.describe("Campaign Templates - Enrollment Dialog", () => {
  test("search input and results work in enroll dialog", async ({
    authedPage,
  }) => {
    const templates = new CampaignTemplatesPage(authedPage);

    // Create a template
    await templates.gotoNew();
    await templates.templateNameInput.fill("Enrollment Search Test");
    await templates.fillStep(0, { name: "Step 1", delayDays: 0 });
    await templates.saveButton.click();
    await expect(authedPage).toHaveURL(/\/campaigns\/templates\/[a-f0-9-]+$/, {
      timeout: 10_000,
    });

    // Open enroll dialog
    await templates.enrollRecipientsButton.click();
    await expect(templates.enrollSearchInput).toBeVisible({ timeout: 5_000 });

    // Type a search query (using seed data contact)
    await templates.enrollSearchInput.fill("test");
    await templates.enrollSearchInput.press("Enter");

    // Wait for results (either results show or nothing found)
    await authedPage.waitForTimeout(2000);

    // The dialog should still be open
    await expect(
      authedPage.getByRole("heading", { name: /enroll recipients/i })
    ).toBeVisible();
  });

  test("enroll dialog can be closed", async ({ authedPage }) => {
    const templates = new CampaignTemplatesPage(authedPage);

    // Create a template
    await templates.gotoNew();
    await templates.templateNameInput.fill("Close Dialog Test");
    await templates.fillStep(0, { name: "Step 1", delayDays: 0 });
    await templates.saveButton.click();
    await expect(authedPage).toHaveURL(/\/campaigns\/templates\/[a-f0-9-]+$/, {
      timeout: 10_000,
    });

    // Open enroll dialog
    await templates.enrollRecipientsButton.click();
    await expect(
      authedPage.getByRole("heading", { name: /enroll recipients/i })
    ).toBeVisible({ timeout: 5_000 });

    // Close with X button or pressing Escape
    await authedPage.keyboard.press("Escape");

    // Dialog should be closed
    await expect(
      authedPage.getByRole("heading", { name: /enroll recipients/i })
    ).not.toBeVisible({ timeout: 3_000 });
  });
});

test.describe("Campaign Templates - Step Intervals", () => {
  test("step delay values are stored correctly without real-time waits", async ({
    authedPage,
  }) => {
    const templates = new CampaignTemplatesPage(authedPage);

    // Create a pregnancy-style template with trimester intervals
    await templates.gotoNew();
    await templates.templateNameInput.fill("Interval Verification");
    await templates.fillStep(0, {
      name: "First Trimester",
      delayDays: 0,
    });
    await templates.addStepButton.click();
    await templates.fillStep(1, {
      name: "Second Trimester",
      delayDays: 90,
    });
    await templates.addStepButton.click();
    await templates.fillStep(2, {
      name: "Third Trimester",
      delayDays: 180,
    });
    await templates.saveButton.click();

    // Verify on the detail page the timeline shows correct intervals
    await expect(authedPage).toHaveURL(/\/campaigns\/templates\/[a-f0-9-]+$/, {
      timeout: 10_000,
    });

    // The overview should show the step names and day values
    await expect(authedPage.getByText("First Trimester")).toBeVisible({
      timeout: 5_000,
    });
    await expect(authedPage.getByText("Day 0")).toBeVisible();
    await expect(authedPage.getByText("Second Trimester")).toBeVisible();
    await expect(authedPage.getByText("Day 90")).toBeVisible();
    await expect(authedPage.getByText("Third Trimester")).toBeVisible();
    await expect(authedPage.getByText("Day 180")).toBeVisible();

    // Check interval display between steps
    await expect(authedPage.getByText("90d until next").first()).toBeVisible();
  });

  test("reordering steps updates step numbers in timeline", async ({
    authedPage,
  }) => {
    const templates = new CampaignTemplatesPage(authedPage);
    await templates.gotoNew();

    // Create 3 steps
    await templates.fillStep(0, { name: "Alpha", delayDays: 0 });
    await templates.addStepButton.click();
    await templates.fillStep(1, { name: "Beta", delayDays: 30 });
    await templates.addStepButton.click();
    await templates.fillStep(2, { name: "Gamma", delayDays: 60 });

    // Verify 3 steps in timeline
    const timelineSteps = await templates.getTimelineStepCount();
    expect(timelineSteps).toBe(3);

    // Move the second step down using the down arrow button
    const stepCards = templates.getStepCards();
    const secondCard = stepCards.nth(1);
    // The down arrow is the second icon button in the header area
    const downButton = secondCard
      .getByRole("button")
      .nth(1); // ArrowDown button
    await downButton.click();

    // Verify Beta and Gamma swapped — Beta's input should now be in position 2
    await expect(templates.getStepNameInput(1)).toHaveValue("Gamma");
    await expect(templates.getStepNameInput(2)).toHaveValue("Beta");
  });
});
