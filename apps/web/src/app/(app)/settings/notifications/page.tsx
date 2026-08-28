import { SettingsNav } from "@/components/settings-nav";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader } from "@/components/ui-primitives";
import { requireUser } from "@/lib/supabase/server";
import { updateNotificationPreferences } from "../actions";

export default async function NotificationSettingsPage(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (!auth) return null;
  const { data } = await auth.supabase.from("notification_preferences").select("task_reminders, interview_reminders, pipeline_updates").eq("user_id", auth.user.id).maybeSingle();

  return <div className="page settings-page">
    <PageHeader title="Notifications" />
    <div className="settings-layout"><SettingsNav active="Notifications" /><main>
      {query.saved ? <div className="form-alert success" role="status">Notification preferences saved.</div> : null}
      {query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}
      <form action={updateNotificationPreferences} className="linear-settings-form">
        <section className="settings-group">
          <header className="settings-group-header"><h2>Workspace notifications</h2><p>Choose which updates appear in your notification inbox.</p></header>
          <div className="settings-card">
            <PreferenceToggle name="taskReminders" label="Task updates" description="Show updates when tasks are added to an Opportunity" checked={data?.task_reminders ?? true} />
            <PreferenceToggle name="interviewReminders" label="Interview reminders" description="Updates when interviews are scheduled or approaching" checked={data?.interview_reminders ?? true} />
            <PreferenceToggle name="pipelineUpdates" label="Pipeline changes" description="Record when an Opportunity moves to another stage" checked={data?.pipeline_updates ?? true} />
          </div>
        </section>
        <div className="settings-save-row"><SubmitButton pendingLabel="Saving…">Save notification settings</SubmitButton></div>
      </form>
    </main></div>
  </div>;
}

function PreferenceToggle({ name, label, description, checked }: { name: string; label: string; description: string; checked: boolean }) {
  return <label className="preference-toggle settings-row"><span className="settings-row-copy"><strong>{label}</strong><small>{description}</small></span><input type="checkbox" name={name} defaultChecked={checked} /><span className="switch" aria-hidden="true" /></label>;
}
