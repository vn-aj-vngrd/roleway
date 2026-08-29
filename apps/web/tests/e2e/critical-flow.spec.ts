import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const email = `e2e-${Date.now()}-${randomBytes(3).toString("hex")}@roleway.test`;
const password = `Rw!${randomBytes(12).toString("hex")}`;
let opportunityPath = "";
let userId = "";

const adminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Supabase E2E environment is not configured.");
  return createClient(url, key, { auth: { persistSession: false } });
};

async function findUserId() {
  const { data, error } = await adminClient().auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw error;
  return data.users.find((candidate) => candidate.email === email)?.id ?? "";
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await page.waitForURL("**/home");
}

async function expectNoSeriousAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const violations = results.violations
    .filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical",
    )
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.flatMap((node) => node.target).slice(0, 8),
    }));
  expect(violations).toEqual([]);
}

async function auditAuthenticatedSurface(page: Page, path: string) {
  const auditPage = await page.context().newPage();
  try {
    await auditPage.goto(path);
    await expectNoSeriousAccessibilityViolations(auditPage);
  } finally {
    await auditPage.close();
  }
}

async function chooseDateTwoDaysAhead(
  page: Page | Locator,
  triggerName: string,
) {
  const target = new Date();
  target.setDate(target.getDate() + 2);
  await page.getByRole("button", { name: triggerName }).click();
  const current = new Date();
  if (
    target.getMonth() !== current.getMonth() ||
    target.getFullYear() !== current.getFullYear()
  )
    await page.getByRole("button", { name: "Next month" }).click();
  await page
    .getByRole("button", { name: String(target.getDate()), exact: true })
    .click();
  await page.getByRole("button", { name: "Done" }).click();
}

test.describe.serial("critical product journey", () => {
  test.afterAll(async () => {
    const id = userId || (await findUserId());
    if (id) await adminClient().auth.admin.deleteUser(id);
  });

  test("public landing and recovery entry points are responsive", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "One workspace for every focused job search.",
      }),
    ).toBeVisible();
    await expect(page.locator(".rw-app")).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await expectNoSeriousAccessibilityViolations(page);
    await page.goto("/login");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(
      page.getByRole("heading", { name: "Reset your password" }),
    ).toBeVisible();
  });

  test("sign up → Search Project → Opportunity → application → interview → sign out", async ({
    page,
  }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/onboarding", { timeout: 20_000 });

    await page.getByLabel("Full name").fill("E2E User");
    await page.getByLabel("Professional headline").fill("Product Engineer");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Workspace name").fill("Product engineering");
    await page
      .getByLabel("Target role")
      .fill("Product Engineer, Full-Stack Engineer");
    await page
      .getByRole("button", { name: "Create Workspace and add a Job" })
      .click();
    await expect(page).toHaveURL(/\/inbox\?create=true&welcome=true/);
    await expect(page.getByText("Product engineering is ready.")).toBeVisible();
    userId = await findUserId();
    expect(userId).not.toBe("");

    const jobDialog = page.getByRole("dialog", { name: "Add a job" });
    await jobDialog.getByLabel("Role title").fill("Senior Product Engineer");
    await jobDialog.getByLabel("Company").fill("Northstar Systems");
    await jobDialog.getByLabel("Location").fill("Remote — United States");
    await jobDialog
      .getByRole("textbox", { name: "Description" })
      .fill(
        "Build dependable product workflows with TypeScript and PostgreSQL.",
      );
    await jobDialog.getByRole("button", { name: "Save job" }).click();
    await expect(page.locator(".app-toast").last()).toContainText(
      "Job added to Inbox",
    );
    await page.getByRole("button", { name: "Track as opportunity" }).click();
    await expect(page).toHaveURL(/\/opportunities\/[0-9a-f-]+/);
    opportunityPath = new URL(page.url()).pathname;
    await expect(
      page.getByRole("navigation", { name: "Opportunity sections" }),
    ).toBeVisible();
    await expect(
      page.locator(".opportunity-overview-actions .stage-focus"),
    ).toBeVisible();
    await expect(page.locator(".context-panel .stage-focus")).toHaveCount(0);

    const agentLauncher = page.getByRole("button", {
      name: "Open Roleway Agent",
    });
    await expect(agentLauncher).toHaveCSS("position", "fixed");
    const launcherBounds = await agentLauncher.boundingBox();
    expect(launcherBounds).not.toBeNull();
    expect(launcherBounds!.y).toBeGreaterThanOrEqual(0);
    expect(launcherBounds!.y + launcherBounds!.height).toBeLessThanOrEqual(
      page.viewportSize()!.height,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await agentLauncher.click();
    const agentPopover = page.getByRole("dialog", { name: "Roleway Agent" });
    await expect(
      agentPopover.getByText("You approve every change"),
    ).toBeVisible();
    await expect(
      agentPopover.getByRole("link", { name: "Set up provider" }),
    ).toBeVisible();
    const popoverBounds = await agentPopover.boundingBox();
    expect(popoverBounds).not.toBeNull();
    expect(popoverBounds!.x).toBeGreaterThanOrEqual(0);
    expect(popoverBounds!.x + popoverBounds!.width).toBeLessThanOrEqual(390);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await agentPopover.getByRole("button", { name: "Close Agent" }).click();
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto(`/agent?opportunity=${opportunityPath.split("/").at(-1)}`);
    await expect(
      page.getByRole("heading", { name: "Ask across your search." }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Set up connection" }),
    ).toBeVisible();
    await auditAuthenticatedSurface(
      page,
      `/agent?opportunity=${opportunityPath.split("/").at(-1)}`,
    );
    await page.goto(opportunityPath);
    await page
      .getByRole("button", { name: /Ask Agent about this Opportunity/ })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Roleway Agent" }),
    ).toBeVisible();
    await page
      .getByRole("dialog", { name: "Roleway Agent" })
      .getByRole("button", { name: "Close Agent" })
      .click();
    const opportunityTabs = page.getByRole("navigation", {
      name: "Opportunity sections",
    });
    await expect(
      opportunityTabs.getByRole("link", { name: "Overview" }),
    ).toHaveAttribute("aria-current", "page");
    await opportunityTabs.getByRole("link", { name: /^Activity/ }).click();
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
    await expect(
      page.locator(".linear-activity-list li").first(),
    ).toBeVisible();
    await expect(
      page.locator(".linear-activity-marker svg").first(),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Leave a note" }),
    ).toHaveCount(0);
    await opportunityTabs.getByRole("link", { name: /^Tasks/ }).click();

    await page.getByRole("button", { name: "Add task" }).click();
    await page
      .getByPlaceholder("What needs to happen?")
      .fill("Review requirements");
    await page.getByRole("button", { name: "Add task" }).click();
    await expect(
      page.getByText("Review requirements", { exact: true }),
    ).toBeVisible();

    await page.goto("/opportunities");
    const opportunityCard = page
      .locator(".opportunity-card")
      .filter({ hasText: "Senior Product Engineer" });
    await opportunityCard.dragTo(
      page.locator('.board-column[data-stage="preparing"]'),
    );
    await expect(
      page.locator('.board-column[data-stage="preparing"]'),
    ).toContainText("Senior Product Engineer");
    await page.getByRole("button", { name: "Display options" }).click();
    const sortControl = page.getByRole("combobox", {
      name: "Sort opportunities",
    });
    await sortControl.click();
    await page.getByRole("option", { name: "Recently updated" }).click();
    await expect(sortControl).toContainText("Recently updated");
    await page.reload();
    await page.getByRole("button", { name: "Display options" }).click();
    await expect(
      page.getByRole("combobox", { name: "Sort opportunities" }),
    ).toContainText("Recently updated");
    await expect(page.getByRole("button", { name: "Saved views" })).toHaveCount(
      0,
    );
    await page.goto(opportunityPath);

    await page.goto("/contacts?create=true");
    const contactDialog = page.getByRole("dialog", { name: "Add a contact" });
    await contactDialog.getByLabel("Name").fill("Maya Chen");
    await contactDialog.getByLabel("Role").fill("VP Engineering");
    await contactDialog.getByLabel("Company").fill("Northstar Systems");
    await contactDialog
      .getByRole("button", { name: "Add contact", exact: true })
      .click();
    await expect(page.getByText("Maya Chen", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Contact overview" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "People and follow-ups" }),
    ).toBeVisible();
    await auditAuthenticatedSurface(page, "/contacts");
    await page.getByRole("link", { name: /^Timeline/ }).click();
    await expect(
      page.getByRole("heading", { name: "Follow-up timeline" }),
    ).toBeVisible();
    await expect(page.getByText("No follow-ups scheduled")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/contacts");
    await expect(page.getByText("Maya Chen", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Contact overview" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/insights");
    const insightsRange = page.getByRole("combobox", {
      name: "Insight timeline",
    });
    await insightsRange.click();
    await page.getByRole("option", { name: "Last 90 days" }).click();
    await expect(page).toHaveURL(/\/insights\?range=90/);
    await expect(insightsRange).toContainText("Last 90 days");
    await page.goto("/agent");
    const appToolbarBox = await page.locator(".workspace-toolbar").boundingBox();
    const agentRoutebarBox = await page
      .locator(".agent-native-routebar")
      .boundingBox();
    expect(appToolbarBox).not.toBeNull();
    expect(agentRoutebarBox).not.toBeNull();
    expect(
      Math.abs(
        agentRoutebarBox!.y - (appToolbarBox!.y + appToolbarBox!.height),
      ),
    ).toBeLessThanOrEqual(1);
    await page.goto(opportunityPath);

    const stageControl = page.getByRole("combobox", {
      name: "Opportunity stage",
    });
    await expect(stageControl).toContainText("Preparing");
    await expect(
      stageControl.locator(".custom-select-value-icon svg"),
    ).toBeVisible();
    await expect(page.locator(".decision-disclosure")).toHaveAttribute(
      "open",
      "",
    );
    await expect(page.locator(".role-disclosure")).toHaveAttribute("open", "");
    await expect(page.locator(".application-status-badge")).toHaveText(
      "Not submitted",
    );
    await stageControl.click();
    const stageOptions = page.getByRole("listbox", {
      name: "Opportunity stage",
    });
    await expect(stageOptions).toBeVisible();
    const stageIconColors = await stageOptions
      .locator(".select-option-icon svg")
      .evaluateAll((icons) =>
        icons.map((icon) => getComputedStyle(icon).color),
      );
    expect(new Set(stageIconColors).size).toBeGreaterThanOrEqual(4);
    await page.getByRole("option", { name: "Interested", exact: true }).click();
    await expect(stageControl).toContainText("Interested");
    await expect(page.locator(".app-toast").last()).toContainText(
      "Stage updated",
    );
    await stageControl.click();
    await page.getByRole("option", { name: "Preparing", exact: true }).click();
    await expect(stageControl).toContainText("Preparing");
    const priorityControl = page.getByRole("combobox", {
      name: "Opportunity priority",
    });
    await priorityControl.click();
    await expect(
      page.getByRole("listbox", { name: "Opportunity priority" }),
    ).toBeVisible();
    await page.getByRole("option", { name: "High", exact: true }).click();
    await expect(page.locator(".app-toast").last()).toContainText(
      "Priority updated",
    );
    await expect(
      page.getByRole("button", { name: "Save decision" }),
    ).toHaveCount(0);
    expect(
      await stageControl.evaluate(
        (element) =>
          Math.abs(
            element.getBoundingClientRect().width -
              (element.closest(".issue-status-panel")?.getBoundingClientRect()
                .width ?? 0),
          ) < 2,
      ),
    ).toBe(true);
    const roleLocation = page
      .locator(".role-properties")
      .getByLabel("Location");
    await roleLocation.fill("Remote — North America");
    await roleLocation.press("Tab");
    await expect(page.locator(".app-toast").last()).toContainText(
      "Location updated",
    );
    await page.reload();
    await expect(
      page.locator(".role-properties").getByLabel("Location"),
    ).toHaveValue("Remote — North America");

    await page
      .getByRole("link", { name: "Mark application submitted" })
      .click();
    const applicationDialog = page.getByRole("dialog", {
      name: "Record application",
    });
    await applicationDialog
      .getByLabel("Confirmation")
      .fill("Company portal confirmation");
    await applicationDialog
      .getByRole("button", { name: "Record application", exact: true })
      .click();
    await expect(page.locator(".app-toast").last()).toContainText(
      "Application recorded",
    );
    await expect(
      page.getByRole("combobox", { name: "Opportunity stage" }),
    ).toContainText("Applied");

    await page
      .getByRole("navigation", { name: "Opportunity sections" })
      .getByRole("link", { name: /^Documents/ })
      .click();
    await page.getByRole("link", { name: "Create document" }).click();
    const documentDialog = page.getByRole("dialog", {
      name: "Create a document",
    });
    await documentDialog.getByLabel("Title").fill("Northstar tailored resume");
    await documentDialog
      .getByRole("button", { name: "Create document", exact: true })
      .click();
    await page
      .getByLabel("Document content")
      .fill("E2E User — Product Engineer\nTypeScript, React, PostgreSQL");
    await page.getByRole("button", { name: "Save new version" }).click();
    await expect(page.getByText("Version 2", { exact: true })).toBeVisible();
    await page.goto("/documents");
    await expect(
      page.getByRole("heading", { name: "Document library" }),
    ).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Document overview" }),
    ).toBeVisible();
    await expect(
      page.getByText("Northstar tailored resume", { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("link", { name: "Gallery" }).click();
    await expect(
      page.getByRole("heading", { name: "Document gallery" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Document gallery" }),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/documents?view=gallery");
    await expect(
      page.getByText("Northstar tailored resume", { exact: true }).first(),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto(
      `/interview?create=true&opportunity=${opportunityPath.split("/").at(-1)}`,
    );
    const interviewDialog = page.getByRole("dialog", {
      name: "Add an interview",
    });
    await chooseDateTwoDaysAhead(interviewDialog, "Choose date and time");
    await interviewDialog
      .getByLabel("Interviewers")
      .fill("Maya Chen · VP Engineering");
    await interviewDialog
      .getByRole("button", { name: "Add interview", exact: true })
      .click();
    await expect(page).toHaveURL(/\/interview\/[0-9a-f-]+\?created=true/, {
      timeout: 30_000,
    });
    await page
      .getByLabel(/Preparation plan/)
      .fill("Review the role priorities and choose two project stories.");
    await page
      .getByLabel(/Questions to ask/)
      .fill("What would make someone exceptional after six months?");
    await page.getByRole("button", { name: "Save interview" }).click();
    await expect(page.locator(".app-toast").last()).toContainText(
      "Interview saved",
    );
    await page.goto("/interview?view=calendar");
    await expect(
      page.getByRole("region", { name: "Interview calendar" }),
    ).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/interview?view=calendar");
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto("/home");
    await expect(
      page
        .locator(".home-action-groups")
        .getByText("Prepare for Recruiter screen", { exact: true })
        .first(),
    ).toBeVisible();
    await expect(
      page
        .locator(".home-action-groups")
        .getByText("Follow up on the application", { exact: true })
        .first(),
    ).toBeVisible();

    await page
      .locator(".sidebar")
      .getByRole("button", { name: /Open account menu/ })
      .click();
    await page
      .locator(".sidebar")
      .getByRole("menuitem", { name: "Sign out" })
      .click();
    await expect(page).toHaveURL(/\/login\?message=/);
    await page.goto(opportunityPath);
    await expect(page).toHaveURL(/\/login\?next=/);
    expect(page.url()).toContain(encodeURIComponent(opportunityPath));
  });

  test("project isolation, global search, export, and admin authorization", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/settings/workspaces?create=true");
    const projectDialog = page.getByRole("dialog", {
      name: "Create a workspace",
    });
    await projectDialog.getByLabel("Workspace name").fill("Consulting search");
    await projectDialog
      .getByLabel("Objective")
      .fill("Find a focused consulting engagement");
    await projectDialog.getByLabel("Target roles").fill("Technical Consultant");
    await projectDialog
      .getByRole("button", { name: "Create workspace" })
      .click();
    await expect(page).toHaveURL(
      /\/settings\/workspaces\?workspaceCreated=true/,
    );
    await expect(page.locator(".app-toast").last()).toContainText(
      "Workspace created",
    );
    await page.goto("/home");
    await expect(
      page
        .locator(".sidebar")
        .getByRole("button", { name: "Consulting search", exact: true }),
    ).toBeVisible();
    await page.goto("/opportunities");
    await expect(
      page.getByRole("heading", {
        name: "No tracked opportunities in this workspace",
      }),
    ).toBeVisible();

    const productWorkspace = page
      .locator(".sidebar-search-project")
      .filter({ hasText: "Product engineering" });
    await productWorkspace
      .getByRole("button", { name: "Product engineering", exact: true })
      .click();
    await productWorkspace.locator('a[href="/home"]').click();
    await page.waitForURL("**/home");
    await page.goto("/opportunities");
    await expect(
      page.getByText("Senior Product Engineer", { exact: true }),
    ).toBeVisible();

    await page.keyboard.press(
      process.platform === "darwin" ? "Meta+K" : "Control+K",
    );
    await page
      .getByRole("textbox", { name: "Search Roleway" })
      .fill("Northstar");
    await expect(
      page.getByRole("option", {
        name: /Senior Product Engineer.*Northstar Systems/,
      }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/home$/);
    const { error: roleError } = await adminClient()
      .from("admin_members")
      .upsert({ user_id: userId, role: "viewer" });
    if (roleError) throw roleError;
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Admin console" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Platform metrics" }),
    ).toBeVisible();
    await adminClient().from("admin_members").delete().eq("user_id", userId);

    await page.goto("/settings/privacy");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download data export" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(
      /^roleway-export-\d{4}-\d{2}-\d{2}\.json$/,
    );
  });

  test("RLS blocks another account from reading or linking private records", async () => {
    const intruderEmail = `e2e-intruder-${Date.now()}-${randomBytes(3).toString("hex")}@roleway.test`;
    const intruderPassword = `Rw!${randomBytes(12).toString("hex")}`;
    const admin = adminClient();
    const { data: intruder, error: createError } =
      await admin.auth.admin.createUser({
        email: intruderEmail,
        password: intruderPassword,
        email_confirm: true,
      });
    if (createError) throw createError;
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const client = createClient(url, anonKey, {
        auth: { persistSession: false },
      });
      const { error: signInError } = await client.auth.signInWithPassword({
        email: intruderEmail,
        password: intruderPassword,
      });
      if (signInError) throw signInError;
      const opportunityId = opportunityPath.split("/").at(-1)!;
      const { data: privateRows, error: readError } = await client
        .from("opportunities")
        .select("id")
        .eq("id", opportunityId);
      expect(readError).toBeNull();
      expect(privateRows).toEqual([]);
      const { data: victim } = await admin
        .from("opportunities")
        .select("project_id")
        .eq("id", opportunityId)
        .single();
      const { error: relationshipError } = await client.from("tasks").insert({
        user_id: intruder.user.id,
        project_id: victim!.project_id,
        opportunity_id: opportunityId,
        title: "Cross-owner task",
      });
      expect(relationshipError).toBeTruthy();
    } finally {
      await admin.auth.admin.deleteUser(intruder.user.id);
    }
  });

  test("account deletion requires the exact account identity", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/settings/privacy");
    await page.getByRole("button", { name: "Delete account" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete your account?" });
    await dialog.getByLabel("Confirm your name").fill("E2E User");
    await dialog.getByLabel("Confirm your email").fill(email);
    await dialog.getByLabel("Current password").fill(password);
    await dialog
      .getByRole("button", { name: "Delete account permanently" })
      .click();
    await expect(page).toHaveURL(/\/login\?message=/);
    await expect(
      page.getByText("Your Roleway account and workspace were deleted."),
    ).toBeVisible();
    userId = "";
  });
});
