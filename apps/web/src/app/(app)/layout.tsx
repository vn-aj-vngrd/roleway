import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/supabase/server";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireUser();
  if (!auth) redirect("/login");

  const [profileResult, notificationsResult] = await Promise.all([
    auth.supabase.from("profiles").select("full_name, onboarding_completed, tour_completed").eq("user_id", auth.user.id).maybeSingle(),
    auth.supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).is("read_at", null),
  ]);
  const profile = profileResult.data;

  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <AppShell
      user={{
        name: profile.full_name || auth.user.email?.split("@")[0] || "Roleway user",
        email: auth.user.email || "",
      }}
      showTour={!profile.tour_completed}
      notificationCount={notificationsResult.count ?? 0}
      isAdmin={auth.user.email?.toLowerCase() === "vanajvanguardia@gmail.com"}
    >
      {children}
    </AppShell>
  );
}
