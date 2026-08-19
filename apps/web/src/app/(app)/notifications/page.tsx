import { Bell, Check, CalendarClock, GitBranch, Inbox } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

const iconFor = (type: string) => type === "interview" ? CalendarClock : type === "pipeline" ? GitBranch : Inbox;

export default async function NotificationsPage() {
  const auth = await requireUser();
  if (!auth) return null;
  const { data: notifications, error } = await auth.supabase.from("notifications").select("id, notification_type, title, href, read_at, created_at").order("created_at", { ascending: false }).limit(100);
  const unread = notifications?.filter((item) => !item.read_at).length ?? 0;

  return <div className="page content-page"><header className="page-header"><div className="page-header-copy"><h1>Notifications</h1><p className="page-subtitle">A quiet record of changes that need your attention.</p></div>{unread > 0 ? <form action={markAllNotificationsRead}><button className="button secondary"><Check aria-hidden="true" />Mark all read</button></form> : null}</header>{error ? <div className="form-alert error" role="alert">Notifications could not be loaded. Refresh to try again.</div> : null}{!error && notifications?.length === 0 ? <div className="empty-state"><span className="empty-icon"><Bell aria-hidden="true" /></span><h2>You’re all caught up</h2><p>Interview reminders and important pipeline changes will appear here.</p><Link className="button secondary" href="/today">Return to Today</Link></div> : <section className="notification-list" aria-label="Notifications">{notifications?.map((notification) => { const Icon = iconFor(notification.notification_type); return <article className={`notification-row ${notification.read_at ? "is-read" : "is-unread"}`} key={notification.id}><span className="notification-icon"><Icon aria-hidden="true" /></span><div className="notification-copy"><strong>{notification.title}</strong><time dateTime={notification.created_at}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.created_at))}</time></div>{notification.href ? <Link className="button ghost" href={notification.href}>Open</Link> : null}{!notification.read_at ? <form action={markNotificationRead}><input type="hidden" name="notificationId" value={notification.id} /><button className="icon-button" aria-label={`Mark ${notification.title} as read`} title="Mark as read"><Check aria-hidden="true" /></button></form> : null}</article>; })}</section>}</div>;
}
