"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
const destination = "/settings/billing";
async function call(
  name: string,
  args: Record<string, unknown>,
  success: string,
) {
  const auth = await requireUser();
  if (!auth) redirect("/login");
  const { error } = await auth.supabase.rpc(name, args);
  if (error)
    redirect(
      `${destination}?error=${encodeURIComponent(error.message.includes("PAYMENT_REQUEST_LIMIT") ? "You can create up to three requests in 24 hours. Contact support if you need help." : error.code === "23505" ? "You already have an open request. Complete or cancel it before starting another." : "The request could not be updated. Refresh the page and check its current status.")}`,
    );
  revalidatePath(destination);
  redirect(`${destination}?saved=${encodeURIComponent(success)}`);
}
export async function requestPayment(data: FormData) {
  const plan = z.enum(["plus", "pro"]).safeParse(data.get("plan"));
  if (!plan.success) redirect(`${destination}?error=Choose+a+paid+plan.`);
  await call(
    "request_plan_payment",
    { input_plan: plan.data },
    "Payment request created. Review the instructions before paying.",
  );
}
export async function submitPayment(data: FormData) {
  const input = z
    .object({
      id: z.string().uuid(),
      reference: z.string().trim().min(3).max(160),
    })
    .safeParse(Object.fromEntries(data));
  if (!input.success)
    redirect(`${destination}?error=Enter+a+valid+transfer+reference.`);
  await call(
    "submit_plan_payment",
    { input_id: input.data.id, input_reference: input.data.reference },
    "Payment submitted for review. Your plan changes after verification.",
  );
}
export async function cancelPayment(data: FormData) {
  const id = z.string().uuid().safeParse(data.get("id"));
  if (!id.success) return;
  await call(
    "cancel_plan_payment",
    { input_id: id.data },
    "Unpaid request cancelled.",
  );
}
