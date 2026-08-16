import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/supabase/server";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireUser();
  if (!auth) redirect("/login");

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("full_name, onboarding_completed")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <AppShell
      user={{
        name: profile.full_name || auth.user.email?.split("@")[0] || "Roleway user",
        email: auth.user.email || "",
      }}
    >
      {children}
    </AppShell>
  );
}
