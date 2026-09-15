"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
async function run(view: string, rpc: string, args: Record<string, unknown>) {
  const auth = await requireUser();
  if (!auth) redirect("/login");
  const { error } = await auth.supabase.rpc(rpc, args);
  if (error)
    redirect(
      `/admin?view=${view}&error=${encodeURIComponent("The change could not be saved. Check your permissions, field values, and the current request status.")}`,
    );
  revalidatePath("/", "layout");
  redirect(`/admin?view=${view}&saved=Changes+saved+and+recorded.`);
}
function invalid(view: string, message: string): never {
  redirect(`/admin?view=${view}&error=${encodeURIComponent(message)}`);
}
export async function savePlan(data: FormData) {
  const parsed = z
    .object({
      slug: z.enum(["free", "plus", "pro", "unlimited"]),
      name: z.string().trim().min(1).max(40),
      description: z.string().trim().max(500),
      price: z.string().regex(/^\d*(\.\d{1,2})?$/),
      currency: z.enum(["PHP", "USD"]),
      availability: z.enum(["available", "coming_soon"]),
      workspaces: z.coerce.number().int().min(1).max(1000),
      storage: z.coerce.number().int().min(1).max(102400),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success)
    invalid(
      "plans",
      "Check the plan fields. Use whole MiB and prices with at most two decimals.",
    );
  const p = parsed.data;
  const price = p.price === "" ? null : Math.round(Number(p.price) * 100);
  if (
    p.slug !== "free" &&
    p.slug !== "unlimited" &&
    p.availability === "available" &&
    (!price || price < 1)
  )
    invalid(
      "plans",
      "Set a positive price before making a paid plan available.",
    );
  await run("plans", "admin_save_plan", {
    input_slug: p.slug,
    input_name: p.name,
    input_description: p.description,
    input_price_minor: p.slug === "free" || p.slug === "unlimited" ? 0 : price,
    input_currency: p.currency,
    input_availability:
      p.slug === "free" || p.slug === "unlimited"
        ? "available"
        : p.availability,
    input_workspace_limit: p.workspaces,
    input_storage_limit_bytes: p.storage * 1048576,
  });
}
export async function saveBilling(data: FormData) {
  const parsed = z
    .object({
      bankName: z.string().trim().max(120),
      accountName: z.string().trim().max(160),
      accountNumber: z.string().trim().max(100),
      instructions: z.string().trim().max(5000),
      supportEmail: z.union([
        z.literal(""),
        z.string().trim().email().max(254),
      ]),
    })
    .safeParse(Object.fromEntries(data));
  if (!parsed.success)
    invalid("billing", "Check payment details and the support email address.");
  const auth = await requireUser();
  if (!auth) redirect("/login");
  const { data: allowed } = await auth.supabase.rpc("can_manage_roleway_users");
  if (allowed !== true) invalid("billing", "You cannot manage billing.");
  const { data: current, error } = await auth.supabase
    .from("billing_settings")
    .select("qr_image")
    .single();
  if (error) invalid("billing", "Reload billing settings and try again.");
  let qr = data.get("removeQr") === "on" ? "" : String(current.qr_image || "");
  const file = data.get("qr");
  if (file instanceof File && file.size > 0) {
    if (
      file.size > 750000 ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    )
      invalid("billing", "Use a PNG, JPEG, or WebP QR image under 750 KB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const valid =
      file.type === "image/png"
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : file.type === "image/jpeg"
          ? bytes[0] === 255 && bytes[1] === 216
          : bytes.toString("ascii", 0, 4) === "RIFF" &&
            bytes.toString("ascii", 8, 12) === "WEBP";
    if (!valid) invalid("billing", "The QR image format is invalid.");
    qr = `data:${file.type};base64,${bytes.toString("base64")}`;
  }
  const p = parsed.data;
  await run("billing", "admin_save_billing", {
    input_enabled: data.get("enabled") === "on",
    input_bank_name: p.bankName,
    input_account_name: p.accountName,
    input_account_number: p.accountNumber,
    input_instructions: p.instructions,
    input_qr_image: qr,
    input_support_email: p.supportEmail,
  });
}
export async function reviewPayment(data: FormData) {
  const p = z
    .object({
      id: z.string().uuid(),
      decision: z.enum(["approve", "reject"]),
      note: z.string().trim().min(3).max(1000),
      verified: z.literal("on").optional(),
    })
    .safeParse(Object.fromEntries(data));
  if (!p.success || (p.data.decision === "approve" && p.data.verified !== "on"))
    invalid(
      "billing",
      "Record a review note and confirm receipt before approving.",
    );
  await run("billing", "admin_review_payment", {
    input_id: p.data.id,
    input_approve: p.data.decision === "approve",
    input_note: p.data.note,
  });
}
export async function assignPlan(data: FormData) {
  const p = z
    .object({
      userId: z.string().uuid(),
      plan: z.enum(["free", "plus", "pro", "unlimited"]),
      expires: z.string(),
      reason: z.string().trim().min(3).max(1000),
    })
    .safeParse(Object.fromEntries(data));
  if (!p.success)
    invalid("users", "Check the assignment and provide a reason.");
  const expires =
    p.data.plan === "free" || p.data.plan === "unlimited" || !p.data.expires
      ? null
      : new Date(p.data.expires);
  if (expires && (!Number.isFinite(expires.getTime()) || expires <= new Date()))
    invalid("users", "Choose a future expiration date.");
  await run("users", "admin_assign_plan", {
    input_user_id: p.data.userId,
    input_plan: p.data.plan,
    input_expires_at: expires?.toISOString() ?? null,
    input_reason: p.data.reason,
  });
}
export async function saveArticle(data: FormData) {
  const p = z
    .object({
      slug: z
        .string()
        .max(100)
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
      title: z.string().trim().min(1).max(160),
      summary: z.string().trim().max(400),
      body: z.string().trim().min(1).max(20000),
    })
    .safeParse(Object.fromEntries(data));
  if (!p.success)
    invalid("help", "Provide a title, article text, and a lowercase URL slug.");
  await run("help", "admin_save_article", {
    input_slug: p.data.slug,
    input_title: p.data.title,
    input_summary: p.data.summary,
    input_body: p.data.body,
    input_published: data.get("published") === "on",
  });
}
