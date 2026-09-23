import { NotificationPreferences } from "@/components/notification-preferences";
import { SettingsNav } from "@/components/settings-nav";
import { PageHeader } from "@/components/ui-primitives";
import { requireUser } from "@/lib/supabase/server";

export default async function NotificationSettingsPage() {
  const auth = await requireUser();
  if (!auth) return null;
  const { data } = await auth.supabase
    .from("notification_preferences")
    .select("task_reminders, interview_reminders, pipeline_updates")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  return (
    <div className="page settings-page">
      <PageHeader title="Notifications" />
      <div className="settings-layout">
        <SettingsNav active="Notifications" />
        <main>
          <NotificationPreferences
            initialPreferences={{
              taskReminders: data?.task_reminders ?? true,
              interviewReminders: data?.interview_reminders ?? true,
              pipelineUpdates: data?.pipeline_updates ?? true,
            }}
          />
        </main>
      </div>
    </div>
  );
}
