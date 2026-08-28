import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireSearchContext } from "@/features/projects/context";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const context = await requireSearchContext();
  if (!context) redirect("/login");
  if (!context.profile?.onboarding_completed) redirect("/onboarding");
  if (!context.project) redirect("/onboarding");

  const [notificationsResult, adminResult] = await Promise.all([
    context.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.user.id)
      .is("read_at", null),
    context.supabase.rpc("is_roleway_admin"),
  ]);

  return (
    <AppShell
      user={{
        name: context.profile.full_name || context.user.email?.split("@")[0] || "Roleway user",
        email: context.user.email || "",
      }}
      projects={context.projects}
      activeProject={context.project}
      showTour={!context.profile.tour_completed}
      notificationCount={notificationsResult.count ?? 0}
      isAdmin={adminResult.data === true}
    >
      {children}
    </AppShell>
  );
}
