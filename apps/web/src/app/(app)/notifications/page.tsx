import { Bell, CalendarClock, Check, GitBranch, Inbox } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/ui-primitives";
import { requireSearchContext } from "@/features/projects/context";
import { markAllNotificationsRead, markNotificationRead, openNotification } from "./actions";

type NotificationRow = { id: string; notification_type: string; title: string; href: string | null; read_at: string | null; created_at: string; search_projects: { name: string } | null };

const iconFor = (type: string) => type === "interview" ? CalendarClock : type === "pipeline" ? GitBranch : Inbox;

export default async function NotificationsPage() {
  const context = await requireSearchContext();
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");

  const { data: notifications, error } = await context.supabase
    .from("notifications")
    .select("id, notification_type, title, href, read_at, created_at, search_projects(name)")
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const accountNotifications = (notifications ?? []) as unknown as NotificationRow[];
  const unread = accountNotifications.filter((item) => !item.read_at).length;

  return <div className="page content-page">
    <PageHeader
      title="Notifications"
      description={<>Important changes and reminders across all workspaces.</>}
      actions={unread > 0 ? <form action={markAllNotificationsRead}><button className="button secondary"><Check aria-hidden="true" />Mark all read</button></form> : null}
    />
    {error ? <div className="form-alert error" role="alert">Notifications could not be loaded. Refresh to try again.</div> : null}
    {!error && accountNotifications.length === 0 ? <EmptyState
      icon={<Bell />}
      title="You’re all caught up"
      description="Interview reminders and important Opportunity changes will appear here."
      actions={<Link className="button secondary" href="/home">Return Home</Link>}
    /> : <section className="notification-list" aria-label="Notifications">
      {accountNotifications.map((notification) => {
        const Icon = iconFor(notification.notification_type);
        return <article className={`notification-row ${notification.read_at ? "is-read" : "is-unread"}`} key={notification.id}>
          <span className="notification-icon"><Icon aria-hidden="true" /></span>
          <div className="notification-copy">
            <strong>{notification.title}</strong>
            <time dateTime={notification.created_at}>{notification.search_projects?.name ? `${notification.search_projects.name} · ` : ""}{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.created_at))}</time>
          </div>
          {notification.href ? <form action={openNotification}><input type="hidden" name="notificationId" value={notification.id} /><button className="button ghost">Open</button></form> : null}
          {!notification.read_at ? <form action={markNotificationRead}>
            <input type="hidden" name="notificationId" value={notification.id} />
            <button className="icon-button" data-tooltip="Mark as read" aria-label={`Mark ${notification.title} as read`}><Check aria-hidden="true" /></button>
          </form> : null}
        </article>;
      })}
    </section>}
  </div>;
}
