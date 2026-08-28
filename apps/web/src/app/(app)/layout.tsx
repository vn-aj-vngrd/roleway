import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireSearchContext } from "@/features/projects/context";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const context = await requireSearchContext();
  if (!context) redirect("/login");
  if (!context.profile?.onboarding_completed) redirect("/onboarding");
  if (!context.project) redirect("/onboarding");

  const [notificationsResult, adminResult, agentConnectionResult] = await Promise.all([
    context.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.user.id)
      .is("read_at", null),
    context.supabase.rpc("is_roleway_admin"),
    createAdminClient().from("ai_connections").select("id, label").eq("user_id", context.user.id).eq("status", "connected").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
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
      agentConnection={agentConnectionResult.data}
    >
      {children}
    </AppShell>
  );
}
