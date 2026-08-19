import { SettingsNav } from "@/components/settings-nav";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/supabase/server";
import { updateNotificationPreferences } from "../actions";

export default async function NotificationSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (!auth) return null;
  const { data } = await auth.supabase.from("notification_preferences").select("task_reminders, interview_reminders, pipeline_updates").eq("user_id", auth.user.id).maybeSingle();
  return <div className="page settings-page"><header className="page-header"><div><h1>Settings</h1><p className="page-subtitle">Tune Roleway around the way you work.</p></div></header><div className="settings-layout"><SettingsNav active="Notifications" /><main>{query.saved ? <div className="form-alert success" role="status">Notification preferences saved.</div> : null}{query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}<form action={updateNotificationPreferences}><section className="form-section"><h2>Workspace notifications</h2><p>Choose which changes appear in your notification inbox. You can mark each update as read when it is handled.</p><PreferenceToggle name="taskReminders" label="Task reminders" description="Reminders for next actions and tasks approaching their due date." checked={data?.task_reminders ?? true} /><PreferenceToggle name="interviewReminders" label="Interview reminders" description="Updates when interviews are scheduled or approaching." checked={data?.interview_reminders ?? true} /><PreferenceToggle name="pipelineUpdates" label="Pipeline changes" description="A record when an Opportunity moves to a different stage." checked={data?.pipeline_updates ?? true} /></section><SubmitButton pendingLabel="Saving…">Save notification settings</SubmitButton></form></main></div></div>;
}

function PreferenceToggle({ name, label, description, checked }: { name: string; label: string; description: string; checked: boolean }) {
  return <label className="preference-toggle"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" name={name} defaultChecked={checked} /><span className="switch" aria-hidden="true" /></label>;
}
