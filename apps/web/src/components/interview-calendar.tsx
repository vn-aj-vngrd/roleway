import { formatOpportunityTicket } from "@roleway/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

export type InterviewCalendarItem = {
  id: string;
  interview_type: string;
  starts_at: string;
  timezone: string;
  status: string;
  opportunities: {
    reference_number: number;
    jobs: { company: string; title: string } | null;
  } | null;
};

export function InterviewCalendar({
  interviews,
  month,
  ticketKey,
  baseHref = "/interview",
  itemHref,
}: {
  interviews: InterviewCalendarItem[];
  month: Date;
  ticketKey: string;
  baseHref?: string;
  itemHref?: (interview: InterviewCalendarItem) => string;
}) {
  const days = calendarDays(month);
  const eventsByDay = new Map<string, InterviewCalendarItem[]>();
  for (const interview of interviews) {
    const key = interviewCalendarDayKey(interview);
    const events = eventsByDay.get(key) ?? [];
    events.push(interview);
    eventsByDay.set(key, events);
  }
  const previousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);
  const isCurrentMonth =
    calendarMonthKey(month) === calendarMonthKey(currentMonth);

  return (
    <section className="interview-calendar" aria-label="Interview calendar">
      <nav
        className="interview-calendar-navigation"
        aria-label="Calendar months"
      >
        <Link
          className="icon-button"
          href={`${baseHref}?view=calendar&month=${calendarMonthKey(previousMonth)}`}
          aria-label={`Previous month, ${new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(previousMonth)}`}
        >
          <ChevronLeft aria-hidden="true" />
        </Link>
        <div className="interview-calendar-period">
          <strong>
            {new Intl.DateTimeFormat(undefined, {
              month: "long",
              year: "numeric",
            }).format(month)}
          </strong>
          {!isCurrentMonth ? (
            <Link className="button ghost" href={`${baseHref}?view=calendar`}>
              Today
            </Link>
          ) : null}
        </div>
        <Link
          className="icon-button"
          href={`${baseHref}?view=calendar&month=${calendarMonthKey(nextMonth)}`}
          aria-label={`Next month, ${new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(nextMonth)}`}
        >
          <ChevronRight aria-hidden="true" />
        </Link>
      </nav>
      {interviews.length === 0 ? (
        <p className="interview-calendar-empty">No conversations this month.</p>
      ) : null}
      <div className="interview-calendar-weekdays" aria-hidden="true">
        {weekdays().map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="interview-calendar-grid">
        {days.map((day) => {
          const key = calendarDayKey(day);
          const dayInterviews = eventsByDay.get(key) ?? [];
          const outsideMonth = day.getMonth() !== month.getMonth();
          const isToday = calendarDayKey(day) === calendarDayKey(new Date());
          return (
            <section
              className="interview-calendar-day"
              data-outside-month={outsideMonth || undefined}
              data-today={isToday || undefined}
              key={key}
              aria-label={new Intl.DateTimeFormat(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              }).format(day)}
            >
              <time dateTime={key}>{day.getDate()}</time>
              <div className="interview-calendar-events">
                {dayInterviews.map((interview) => (
                  <Link
                    href={itemHref?.(interview) ?? `/interview/${interview.id}`}
                    key={interview.id}
                    data-status={interview.status}
                  >
                    <strong>
                      {new Intl.DateTimeFormat(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: interview.timezone,
                      }).format(new Date(interview.starts_at))}
                    </strong>
                    <span>{interview.interview_type}</span>
                    <small>
                      {interview.opportunities
                        ? formatOpportunityTicket(
                            ticketKey,
                            interview.opportunities.reference_number,
                          )
                        : "Opportunity"}
                      {interview.opportunities?.jobs?.company
                        ? ` · ${interview.opportunities.jobs.company}`
                        : ""}
                    </small>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export function calendarMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function calendarDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function interviewCalendarDayKey(
  interview: Pick<InterviewCalendarItem, "starts_at" | "timezone">,
) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: interview.timezone,
  }).formatToParts(new Date(interview.starts_at));
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function calendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function weekdays() {
  const sunday = new Date(2026, 7, 30);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + index);
    return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(day);
  });
}
