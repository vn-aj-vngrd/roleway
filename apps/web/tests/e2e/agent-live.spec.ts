import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { createFixtureAccount } from "./auth-fixture";

// Opt in explicitly: this makes real provider calls and uses only disposable synthetic career data.
test.use({ trace: "off", screenshot: "off" });
test("live OpenRouter retrieval → clarification → revision → approval and rejection", async ({page}) => {
  test.skip(process.env.ROLEWAY_RUN_LIVE_AGENT !== "1" || !process.env.ROLEWAY_TEST_OPENROUTER_KEY, "Set ROLEWAY_RUN_LIVE_AGENT=1 and a live provider key for this separate test.");
  test.setTimeout(900_000);
  page.setDefaultTimeout(30_000);
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  const email=`e2e-agent-${Date.now()}@roleway.test`;
  const password=`Rw!${randomBytes(12).toString("hex")}`;
  const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
  let userId="";
  try {
    userId=await createFixtureAccount(email,password,page);
    const {data:profile,error:profileError}=await admin.from("profiles").update({onboarding_completed:true,tour_completed:true,full_name:"Agent audit fixture"}).eq("user_id",userId).select("active_project_id").single();
    if(profileError) throw profileError;
    const {data:job,error:jobError}=await admin.from("jobs").insert({user_id:userId,project_id:profile.active_project_id,company:"Audit Fixture",title:"Product Engineer",description:"Build accessible TypeScript interfaces."}).select("id").single();
    if(jobError) throw jobError;
    const {data:opportunity,error:opportunityError}=await admin.from("opportunities").insert({user_id:userId,project_id:profile.active_project_id,job_id:job.id,stage:"interested"}).select("id").single();
    if(opportunityError) throw opportunityError;
    const document = await admin.from("documents").insert({user_id:userId,project_id:profile.active_project_id,opportunity_id:opportunity.id,title:"Cedar approved evidence",kind:"resume",status:"approved",content:{body:"Reduced build time by 37 percent on Project Cedar."}}).select("id").single();
    if(document.error) throw document.error;
    console.info("Live Agent: fixture ready");
    await page.goto("/settings/ai");
    await page.getByRole("button",{name:"Add connection",exact:true}).click();
    console.info("Live Agent: connection dialog requested");
    await page.getByRole("combobox",{name:"Provider",exact:true}).click();
    await page.getByRole("option",{name:"OpenRouter",exact:true}).click();
    await page.getByLabel("Connection name",{exact:true}).fill("Live audit provider");
    await page.getByLabel("Model",{exact:true}).fill(process.env.ROLEWAY_TEST_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free");
    await page.getByLabel("API key",{exact:true}).fill(process.env.ROLEWAY_TEST_OPENROUTER_KEY!);
    await page.getByRole("button",{name:"Save connection",exact:true}).click();
    await expect(page.getByText("Live audit provider", {exact:true})).toBeVisible();
    console.info("Live Agent: connection saved");
    await page.getByRole("button",{name:"Test Live audit provider",exact:true}).click();
    await expect(page.locator(".connection-row .status-label")).toHaveText("Connected", {timeout:260_000});
    console.info("Live Agent: provider verified");
    await page.goto(`/agent?opportunity=${opportunity.id}`);
    const input=page.getByLabel("Message Roleway Agent",{exact:true});
    const send=async (message: string) => {
      await expect(input).toBeEditable();
      await input.fill(message);
      await page.getByRole("button",{name:"Send to Agent",exact:true}).click();
    };
    await send(`Read the approved document ${document.data.id}. What exact improvement did I achieve on Project Cedar? Do not propose any changes.`);
    await expect(page.locator(".agent-message.agent").last()).toContainText("37",{timeout:260_000});
    await expect(input).toBeEditable();
    await expect(page.getByRole("region",{name:"Agent proposed change"})).toHaveCount(0);
    console.info("Live Agent: stored document retrieved");
    await send("Create a task titled Prepare TypeScript examples for this Opportunity, due at 8 on Friday. I have not specified morning or evening, or which Friday. Ask before choosing.");
    await expect(page.locator(".agent-message.agent").last()).toContainText("What exact date and time",{timeout:260_000});
    await expect(input).toBeEditable();
    await expect(page.getByRole("region",{name:"Agent proposed change"})).toHaveCount(0);
    console.info("Live Agent: date clarification withheld proposals");
    await input.fill("Propose exactly one create_task for the focused Audit Fixture Product Engineer Opportunity, titled 'Prepare TypeScript examples', with no due date. Do not apply it. Ask for my approval.");
    await page.getByRole("button",{name:"Send to Agent",exact:true}).click();
    let card=page.getByRole("region",{name:"Agent proposed change"});
    await expect(card).toBeVisible({timeout:260_000});
    console.info("Live Agent: proposal received");
    await expect(card).toContainText("Workspace");
    const before=await admin.from("tasks").select("id",{count:"exact",head:true}).eq("user_id",userId).eq("created_by","agent");
    expect(before.count).toBe(0);
    await send("Correct the pending task title to Prepare accessible TypeScript examples. Keep this Opportunity and no due date. Replace the old proposal; do not apply it.");
    await expect(page.getByText("Replaced by a revised proposal",{exact:true})).toBeVisible({timeout:260_000});
    await expect(page.getByRole("button",{name:"Approve change",exact:true})).toHaveCount(1);
    card=page.locator(".agent-approval-card.proposed");
    await expect(card).toContainText("Prepare accessible TypeScript examples");
    const unchanged=await admin.from("tasks").select("id",{count:"exact",head:true}).eq("user_id",userId).eq("created_by","agent");
    expect(unchanged.count).toBe(0);
    console.info("Live Agent: old proposal retired, no task written");
    await card.getByRole("button",{name:"Approve change",exact:true}).click();
    card=page.locator(".agent-approval-card.applied");
    await expect(card.getByText("Task created",{exact:true})).toBeVisible();
    const after=await admin.from("tasks").select("title,opportunity_id,project_id").eq("user_id",userId).eq("created_by","agent");
    expect(after.error).toBeNull();
    expect(after.data).toEqual([{title:"Prepare accessible TypeScript examples",opportunity_id:opportunity.id,project_id:profile.active_project_id}]);
    await page.reload();
    await expect(page.getByText("Task created",{exact:true})).toBeVisible();
    await send("Propose one note for this Opportunity with exactly this content: Recruiter prefers accessible examples. Do not apply it.");
    const noteCard=page.locator(".agent-approval-card.proposed");
    await expect(noteCard).toContainText("Recruiter prefers accessible examples",{timeout:260_000});
    await noteCard.getByRole("button",{name:"Reject",exact:true}).click();
    await expect(page.locator(".agent-approval-card.rejected")).toBeVisible();
    const notes=await admin.from("opportunity_notes").select("id",{count:"exact",head:true}).eq("opportunity_id",opportunity.id);
    expect(notes.error).toBeNull();
    expect(notes.count).toBe(0);
    console.info("Live Agent: approved task persisted and rejected note not written");
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:900});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    }
    expect(browserErrors).toEqual([]);
  } finally {
    if (browserErrors.length) console.info("Live Agent browser errors:", browserErrors);
    if (userId) {
      const { data: events } = await admin.from("system_events").select("code").eq("user_id", userId).eq("category", "ai");
      if (events?.length) console.info("Live Agent diagnostic codes:", events);
    }
    if(userId) { const {error}=await admin.auth.admin.deleteUser(userId);if(error) throw error; }
  }
});
