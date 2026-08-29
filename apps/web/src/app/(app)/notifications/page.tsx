import {
  ArrowRight,
  Bell,
  CalendarClock,
  Check,
  GitBranch,
  Inbox,
  Settings2,
  SquareCheckBig,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui-primitives";
import { requireSearchContext } from "@/features/projects/context";
import {
  markAllNotificationsRead,
  markNotificationRead,
  openNotification,
} from "./actions";

type NotificationRow = {
  id: string;
  notification_type: string;
  title: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
  search_projects: { name: string } | null;
};
type NotificationView = "all" | "unread";
type NotificationGroup = { label: string; items: NotificationRow[] };
type NotificationsPageProps = {
  searchParams: Promise<{ view?: string | string[]; error?: string | string[] }>;
};

const notificationTypeDetails = {
  interview: { label: "Interview", icon: CalendarClock },
  pipeline: { label: "Opportunity", icon: GitBranch },
  task: { label: "Task", icon: SquareCheckBig },
} as const;

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const context = await requireSearchContext();
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");

  const query = await searchParams;
  const requestedView = Array.isArray(query.view) ? query.view[0] : query.view;
  const view: NotificationView = requestedView === "unread" ? "unread" : "all";
  const actionError = Array.isArray(query.error) ? query.error[0] : query.error;
  const { data: notifications, error } = await context.supabase
    .from("notifications")
    .select("id, notification_type, title, href, read_at, created_at, search_projects(name)")
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const accountNotifications = (notifications ?? []) as unknown as NotificationRow[];
  const unreadNotifications = accountNotifications.filter((item) => !item.read_at);
  const visibleNotifications =
    view === "unread" ? unreadNotifications : accountNotifications;
  const now = new Date();
  const todayCount = accountNotifications.filter((item) => isSameDay(new Date(item.created_at), now)).length;
  const groups = groupNotifications(visibleNotifications, now);
  const unreadByWorkspace = buildWorkspaceCounts(unreadNotifications);
  const typeCounts = buildTypeCounts(accountNotifications);

  return (
    <div className="notifications-page">
      <PageHeader
        title="Notifications"
        description="Important changes and reminders across all Workspaces."
        actions={
          unreadNotifications.length > 0 ? (
            <form action={markAllNotificationsRead}>
              <input type="hidden" name="view" value={view} />
              <Button className="button secondary" variant="outline" type="submit">
                <Check aria-hidden="true" />
                Mark all read
              </Button>
            </form>
          ) : null
        }
      />

      {error || actionError ? (
        <div className="form-alert error" role="alert">
          {actionError || "Notifications could not be loaded. Refresh to try again."}
        </div>
      ) : null}

      <div className="notifications-layout">
        <main className="notifications-main">
          <nav className="notification-filters" aria-label="Notification view">
            <Link href="/notifications" aria-current={view === "all" ? "page" : undefined}>
              All <span>{accountNotifications.length}</span>
            </Link>
            <Link
              href="/notifications?view=unread"
              aria-current={view === "unread" ? "page" : undefined}
            >
              Unread <span>{unreadNotifications.length}</span>
            </Link>
          </nav>

          {!error && visibleNotifications.length === 0 ? (
            <EmptyState
              icon={<Bell />}
              title={view === "unread" ? "No unread notifications" : "You’re all caught up"}
              description={
                view === "unread"
                  ? "New reminders and Opportunity changes will stay here until you review them."
                  : "Interview reminders and important Opportunity changes will appear here."
              }
              actions={
                view === "unread" ? (
                  <Link className="button secondary" href="/notifications">
                    View all notifications
                  </Link>
                ) : (
                  <Link className="button secondary" href="/home">
                    Return Home
                  </Link>
                )
              }
            />
          ) : (
            <div className="notification-groups" aria-label="Notifications">
              {groups.map((group) => (
                <section className="notification-group" aria-labelledby={`group-${toId(group.label)}`} key={group.label}>
                  <header>
                    <h2 id={`group-${toId(group.label)}`}>{group.label}</h2>
                    <span>{group.items.length}</span>
                  </header>
                  <div className="notification-list">
                    {group.items.map((notification) => (
                      <NotificationItem notification={notification} key={notification.id} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>

        <aside className="notifications-rail" aria-label="Notification summary">
          <section>
            <h2>At a glance</h2>
            <dl className="notification-quick-list">
              <div>
                <dt>Unread</dt>
                <dd>{unreadNotifications.length}</dd>
              </div>
              <div>
                <dt>Received today</dt>
                <dd>{todayCount}</dd>
              </div>
              <div>
                <dt>Workspaces with unread</dt>
                <dd>{unreadByWorkspace.length}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2>Unread by Workspace</h2>
            {unreadByWorkspace.length ? (
              <div className="notification-workspace-list">
                {unreadByWorkspace.slice(0, 5).map((workspace) => (
                  <div key={workspace.name}>
                    <span>{workspace.name}</span>
                    <strong>{workspace.count}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="notification-rail-empty">Nothing is waiting for review.</p>
            )}
          </section>

          <section>
            <h2>Recent mix</h2>
            {typeCounts.length ? (
              <div className="notification-type-list">
                {typeCounts.map((item) => {
                  const details = getTypeDetails(item.type);
                  const Icon = details.icon;
                  return (
                    <div key={item.type}>
                      <Icon aria-hidden="true" />
                      <span>{details.label}</span>
                      <strong>{item.count}</strong>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="notification-rail-empty">No recent notification activity.</p>
            )}
          </section>

          <section>
            <Link className="notification-settings-link" href="/settings/notifications">
              <Settings2 aria-hidden="true" />
              <span>
                <strong>Notification settings</strong>
                <small>Choose which updates appear here.</small>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function NotificationItem({ notification }: { notification: NotificationRow }) {
  const details = getTypeDetails(notification.notification_type);
  const Icon = details.icon;
  const createdAt = new Date(notification.created_at);
  return (
    <article
      className={`notification-row ${notification.read_at ? "is-read" : "is-unread"}`}
    >
      <span className="notification-state" aria-hidden="true" />
      <span className="notification-icon">
        <Icon aria-hidden="true" />
      </span>
      <div className="notification-copy">
        <strong>{notification.title}</strong>
        <span>
          {notification.search_projects?.name || "Account"} · {details.label} ·{" "}
          <time dateTime={notification.created_at}>{formatNotificationTime(createdAt)}</time>
        </span>
      </div>
      <div className="notification-actions">
        {notification.href ? (
          <form action={openNotification}>
            <input type="hidden" name="notificationId" value={notification.id} />
            <Button className="button ghost notification-open" variant="ghost" type="submit">
              View <ArrowRight aria-hidden="true" />
            </Button>
          </form>
        ) : null}
        {!notification.read_at ? (
          <form action={markNotificationRead}>
            <input type="hidden" name="notificationId" value={notification.id} />
            <button
              className="icon-button"
              data-tooltip="Mark as read"
              aria-label={`Mark ${notification.title} as read`}
            >
              <Check aria-hidden="true" />
            </button>
          </form>
        ) : null}
      </div>
    </article>
  );
}

function getTypeDetails(type: string) {
  return notificationTypeDetails[type as keyof typeof notificationTypeDetails] ?? {
    label: "Update",
    icon: Inbox,
  };
}

function groupNotifications(notifications: NotificationRow[], now: Date): NotificationGroup[] {
  const groups = new Map<string, NotificationRow[]>();
  for (const notification of notifications) {
    const createdAt = new Date(notification.created_at);
    const daysAgo = Math.floor((startOfDay(now).getTime() - startOfDay(createdAt).getTime()) / 86_400_000);
    const label = daysAgo <= 0 ? "Today" : daysAgo === 1 ? "Yesterday" : daysAgo < 7 ? "Earlier this week" : "Earlier";
    const items = groups.get(label) ?? [];
    items.push(notification);
    groups.set(label, items);
  }
  return ["Today", "Yesterday", "Earlier this week", "Earlier"].flatMap((label) => {
    const items = groups.get(label);
    return items?.length ? [{ label, items }] : [];
  });
}

function buildWorkspaceCounts(notifications: NotificationRow[]) {
  const counts = new Map<string, number>();
  for (const notification of notifications) {
    const name = notification.search_projects?.name || "Account";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function buildTypeCounts(notifications: NotificationRow[]) {
  const counts = new Map<string, number>();
  for (const notification of notifications) {
    counts.set(notification.notification_type, (counts.get(notification.notification_type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((left, right) => right.count - left.count || left.type.localeCompare(right.type));
}

function formatNotificationTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(left: Date, right: Date) {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

function toId(value: string) {
  return value.toLowerCase().replaceAll(" ", "-");
}
