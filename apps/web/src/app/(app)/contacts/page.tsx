import { formatOpportunityTicket } from "@roleway/core";
import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  Clock3,
  Link2,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CollectionViewControls } from "@/components/collection-view-controls";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { CreateModal } from "@/components/create-modal";
import { DateTimeField, SelectField } from "@/components/form-controls";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import {
  CountBadge,
  EmptyState,
  PillTabs,
  ViewToolbar,
  WorkspaceHeader,
} from "@/components/ui-primitives";
import {
  createProjectContact,
  deleteProjectContact,
  updateProjectContact,
} from "@/features/contacts/actions";
import { requireSearchContext } from "@/features/projects/context";

type ContactRow = {
  id: string;
  opportunity_id: string | null;
  name: string;
  role: string;
  company: string;
  relationship: string;
  email: string | null;
  phone: string | null;
  profile_url: string | null;
  notes: string;
  follow_up_at: string | null;
  updated_at: string;
  opportunities: {
    id: string;
    reference_number: number;
    jobs: { company: string; title: string } | null;
  } | null;
};
type OpportunityOption = {
  id: string;
  reference_number: number;
  jobs: { company: string; title: string } | null;
};

const relationshipOptions = [
  { value: "contact", label: "Contact" },
  { value: "recruiter", label: "Recruiter" },
  { value: "hiring_manager", label: "Hiring manager" },
  { value: "interviewer", label: "Interviewer" },
  { value: "referral", label: "Referral" },
  { value: "colleague", label: "Former colleague" },
];

export default async function ContactsPage(props: {
  searchParams: Promise<{
    create?: string;
    edit?: string;
    q?: string;
    relationship?: string;
    range?: string;
    view?: string;
    sort?: string;
    created?: string;
    saved?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const [context, query] = await Promise.all([
    requireSearchContext(),
    searchParams,
  ]);
  if (!context) redirect("/login");
  const project = context.project;
  if (!project) redirect("/onboarding");

  const [contactsResult, opportunitiesResult] = await Promise.all([
    context.supabase
      .from("contacts")
      .select(
        "id, opportunity_id, name, role, company, relationship, email, phone, profile_url, notes, follow_up_at, updated_at, opportunities(id, reference_number, jobs(company, title))",
      )
      .eq("project_id", project.id)
      .order("follow_up_at", { ascending: true, nullsFirst: false })
      .order("name")
      .limit(500),
    context.supabase
      .from("opportunities")
      .select("id, reference_number, jobs(company, title)")
      .eq("project_id", project.id)
      .neq("stage", "closed")
      .order("updated_at", { ascending: false })
      .limit(500),
  ]);
  const contacts = (contactsResult.data ?? []) as unknown as ContactRow[];
  const opportunities = (opportunitiesResult.data ??
    []) as unknown as OpportunityOption[];
  const normalizedQuery = query.q?.trim().toLowerCase() ?? "";
  const relationship = relationshipOptions.some(
    (option) => option.value === query.relationship,
  )
    ? query.relationship!
    : "all";
  const now = Date.now();
  const weekEnd = now + 7 * 86_400_000;
  const timelineView = query.view === "timeline";
  const weekFilter = !timelineView && query.range === "week";
  const contactSorts = ["follow_up", "name", "company", "updated"] as const;
  const sort = contactSorts.includes(
    query.sort as (typeof contactSorts)[number],
  )
    ? query.sort!
    : "follow_up";
  const visibleContacts = contacts
    .filter((contact) => {
      if (
        weekFilter &&
        (!contact.follow_up_at ||
          new Date(contact.follow_up_at).getTime() > weekEnd)
      )
        return false;
      if (relationship !== "all" && contact.relationship !== relationship)
        return false;
      if (!normalizedQuery) return true;
      return [
        contact.name,
        contact.role,
        contact.company,
        contact.email,
        contact.opportunities?.jobs?.title,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    })
    .sort((left, right) => {
      if (sort === "name") return left.name.localeCompare(right.name);
      if (sort === "company")
        return (
          (left.company || "\uffff").localeCompare(right.company || "\uffff") ||
          left.name.localeCompare(right.name)
        );
      if (sort === "updated")
        return (
          new Date(right.updated_at).getTime() -
          new Date(left.updated_at).getTime()
        );
      const leftFollowUp = left.follow_up_at
        ? new Date(left.follow_up_at).getTime()
        : Number.MAX_SAFE_INTEGER;
      const rightFollowUp = right.follow_up_at
        ? new Date(right.follow_up_at).getTime()
        : Number.MAX_SAFE_INTEGER;
      return (
        leftFollowUp - rightFollowUp || left.name.localeCompare(right.name)
      );
    });
  const timelineContacts = visibleContacts.filter(
    (contact) => contact.follow_up_at,
  );
  const editing = contacts.find((contact) => contact.id === query.edit) ?? null;
  const followUpContacts = contacts.filter(
    (contact) =>
      contact.follow_up_at &&
      new Date(contact.follow_up_at).getTime() <= weekEnd,
  );
  const overdueContacts = followUpContacts.filter(
    (contact) =>
      contact.follow_up_at && new Date(contact.follow_up_at).getTime() < now,
  );
  const linkedContacts = contacts.filter((contact) => contact.opportunity_id);
  const nextFollowUp = contacts
    .filter(
      (contact) =>
        contact.follow_up_at && new Date(contact.follow_up_at).getTime() >= now,
    )
    .sort(
      (left, right) =>
        new Date(left.follow_up_at!).getTime() -
        new Date(right.follow_up_at!).getTime(),
    )[0];
  const relationshipCounts = relationshipOptions
    .map((option) => ({
      ...option,
      count: contacts.filter((contact) => contact.relationship === option.value)
        .length,
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 4);

  return (
    <div className="workspace-page workspace-index-page contacts-page">
      <WorkspaceHeader
        title="Contacts"
        count={
          timelineView
            ? timelineContacts.length
            : weekFilter
              ? followUpContacts.length
              : contacts.length
        }
        context={<>People, relationships, and follow-ups for {project.name}.</>}
        actions={
          <Link className="button primary" href="/contacts?create=true">
            <Plus aria-hidden="true" />
            Add contact
          </Link>
        }
      />

      <ViewToolbar
        className="contacts-view-toolbar"
        label="Contact views and filters"
        primary={
          <PillTabs
            label="Contact views"
            items={[
              {
                href: "/contacts",
                label: "All contacts",
                active: !timelineView && !weekFilter,
                count: contacts.length,
              },
              {
                href: "/contacts?range=week",
                label: "Needs follow-up",
                active: weekFilter,
                count: followUpContacts.length,
              },
              {
                href: "/contacts?view=timeline",
                label: "Timeline",
                active: timelineView,
                count: contacts.filter((contact) => contact.follow_up_at).length,
              },
            ]}
          />
        }
        actions={
          <CollectionViewControls
            page="contacts"
            filterGroups={[
              {
                key: "relationship",
                label: "Relationship",
                defaultValue: "all",
                options: [
                  { value: "all", label: "All relationships" },
                  ...relationshipOptions,
                ],
              },
            ]}
            values={{ relationship }}
            sort={sort}
            defaultSort="follow_up"
            sortOptions={[
              { value: "follow_up", label: "Follow-up date" },
              { value: "name", label: "Name" },
              { value: "company", label: "Company" },
              { value: "updated", label: "Recently updated" },
            ]}
            search={{
              key: "q",
              value: query.q ?? "",
              placeholder: "Search people…",
            }}
          />
        }
      />

      {query.created ||
      query.saved ||
      query.deleted ||
      query.error ||
      contactsResult.error ||
      opportunitiesResult.error ? (
        <div className="contacts-notices">
          {query.created ? (
            <div className="form-alert success" role="status">
              Contact added to {project.name}.
            </div>
          ) : null}
          {query.saved ? (
            <div className="form-alert success" role="status">
              Contact updated.
            </div>
          ) : null}
          {query.deleted ? (
            <div className="form-alert success" role="status">
              Contact removed.
            </div>
          ) : null}
          {query.error ? (
            <div className="form-alert error" role="alert">
              {query.error}
            </div>
          ) : null}
          {contactsResult.error || opportunitiesResult.error ? (
            <div className="form-alert error" role="alert">
              Some contact context could not be loaded. Refresh to try again.
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className={`contacts-index-layout${contactsResult.error ? " no-rail" : ""}`}
      >
        <main className="contacts-directory">
          <header className="contacts-directory-header">
            <div>
              <h2>
                {timelineView
                  ? "Follow-up timeline"
                  : weekFilter
                    ? "Follow-ups needing attention"
                    : "People and follow-ups"}
              </h2>
              <p>
                {timelineView
                  ? "Review every scheduled touchpoint in date order."
                  : "Keep relationship context close to the Opportunity and the next useful touchpoint."}
              </p>
            </div>
            <span>
              {timelineView ? timelineContacts.length : visibleContacts.length}{" "}
              {(timelineView ? timelineContacts.length : visibleContacts.length) ===
              1
                ? timelineView
                  ? "follow-up"
                  : "person"
                : timelineView
                  ? "follow-ups"
                  : "people"}
            </span>
          </header>

          {contactsResult.error ? (
            <EmptyState
              className="contacts-empty-state"
              title="Contacts could not be loaded"
              description="Refresh this page to recover the directory. Your saved contacts have not been changed."
            />
          ) : contacts.length === 0 ? (
            <EmptyState
              className="contacts-empty-state"
              icon={<UserRound />}
              title="No contacts in this workspace"
              description="Add a recruiter, interviewer, referral, or networking contact. Follow-ups will appear on Home."
              actions={
                <Link className="button primary" href="/contacts?create=true">
                  <Plus aria-hidden="true" />
                  Add your first contact
                </Link>
              }
            />
          ) : timelineView && timelineContacts.length === 0 ? (
            <EmptyState
              className="contacts-empty-state"
              icon={<CalendarClock />}
              title="No follow-ups scheduled"
              description="Add a follow-up date to a contact to place it on this timeline and Home."
              actions={
                <Link className="button secondary" href="/contacts">
                  View all contacts
                </Link>
              }
            />
          ) : visibleContacts.length === 0 ? (
            <EmptyState
              className="contacts-empty-state"
              icon={<Search />}
              title={
                weekFilter
                  ? "No follow-ups need attention"
                  : "No matching contacts"
              }
              description={
                weekFilter
                  ? "No contact is overdue or scheduled for the next seven days."
                  : "Try another name, company, or relationship."
              }
              actions={
                <Link
                  className="button secondary"
                  href={weekFilter ? "/contacts" : "/contacts"}
                >
                  Clear filters
                </Link>
              }
            />
          ) : timelineView ? (
            <ContactTimeline
              contacts={timelineContacts}
              now={now}
              weekEnd={weekEnd}
              ticketKey={project.ticket_key}
            />
          ) : (
            <section
              className="contacts-table"
              role="table"
              aria-label="Contacts"
            >
              <div className="contacts-row contacts-row-header" role="row">
                <span role="columnheader">Person</span>
                <span role="columnheader">Relationship</span>
                <span role="columnheader">Opportunity</span>
                <span role="columnheader">Follow-up</span>
                <span aria-hidden="true" />
              </div>
              {visibleContacts.map((contact) => {
                const isOverdue = Boolean(
                  contact.follow_up_at &&
                  new Date(contact.follow_up_at).getTime() < now,
                );
                return (
                  <article className="contacts-row" role="row" key={contact.id}>
                    <span className="contact-identity" role="cell">
                      <span className="contact-avatar" aria-hidden="true">
                        {initials(contact.name)}
                      </span>
                      <span>
                        <strong>{contact.name}</strong>
                        <small>
                          {[contact.role, contact.company]
                            .filter(Boolean)
                            .join(" · ") || "Details not added"}
                        </small>
                        {contact.email ? (
                          <a href={`mailto:${contact.email}`}>
                            <Mail aria-hidden="true" />
                            {contact.email}
                          </a>
                        ) : (
                          <span className="contact-email-empty">
                            Email not added
                          </span>
                        )}
                      </span>
                    </span>
                    <span role="cell" className="contact-relationship">
                      <Badge variant="secondary">
                        {relationshipLabel(contact.relationship)}
                      </Badge>
                    </span>
                    <span role="cell" className="contact-opportunity">
                      {contact.opportunities ? (
                        <Link
                          href={`/opportunities/${contact.opportunities.id}`}
                        >
                          <strong>
                            {formatOpportunityTicket(
                              project.ticket_key,
                              contact.opportunities.reference_number,
                            )}
                          </strong>
                          <small>
                            {contact.opportunities.jobs?.title ??
                              "Untitled role"}
                          </small>
                        </Link>
                      ) : (
                        <span className="contact-workspace-wide">
                          <UsersRound aria-hidden="true" />
                          Workspace-wide
                        </span>
                      )}
                    </span>
                    <span
                      role="cell"
                      className={`contact-follow-up${isOverdue ? " overdue" : ""}`}
                    >
                      {contact.follow_up_at ? (
                        <>
                          <CalendarClock aria-hidden="true" />
                          <span>
                            <time>
                              {new Intl.DateTimeFormat(undefined, {
                                month: "short",
                                day: "numeric",
                              }).format(new Date(contact.follow_up_at))}
                            </time>
                            <small>{isOverdue ? "Overdue" : "Scheduled"}</small>
                          </span>
                        </>
                      ) : (
                        <span className="contact-follow-up-empty">
                          Not scheduled
                        </span>
                      )}
                    </span>
                    <span role="cell" className="contact-row-actions">
                      <Link
                        className="icon-button"
                        data-tooltip="Edit contact"
                        aria-label={`Edit ${contact.name}`}
                        href={`/contacts?edit=${contact.id}`}
                      >
                        <Pencil aria-hidden="true" />
                      </Link>
                      <ConfirmationDialog
                        title={`Remove ${contact.name}?`}
                        description="This removes the contact from the current Workspace. It does not contact the person."
                        action={deleteProjectContact}
                        confirmLabel="Remove contact"
                        pendingLabel="Removing…"
                        trigger={<Trash2 aria-hidden="true" />}
                        triggerClassName="icon-button"
                        triggerAriaLabel={`Remove ${contact.name}`}
                        triggerTooltip="Remove contact"
                        hiddenFields={{ contactId: contact.id }}
                        destructive
                      />
                    </span>
                  </article>
                );
              })}
            </section>
          )}
        </main>

        {!contactsResult.error ? (
          <aside
            className="contacts-insights-rail"
            aria-label="Contact overview"
          >
            <section>
              <header className="contacts-rail-heading">
                <h2>Contact overview</h2>
                <CountBadge value={contacts.length} />
              </header>
              <dl className="contacts-insight-list">
                <div>
                  <dt>Due or overdue</dt>
                  <dd>
                    <CountBadge
                      tone={followUpContacts.length ? "accent" : "neutral"}
                      value={followUpContacts.length}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Overdue</dt>
                  <dd>
                    <CountBadge value={overdueContacts.length} />
                  </dd>
                </div>
                <div>
                  <dt>Linked to an Opportunity</dt>
                  <dd>{linkedContacts.length}</dd>
                </div>
                <div>
                  <dt>Workspace-wide</dt>
                  <dd>{contacts.length - linkedContacts.length}</dd>
                </div>
              </dl>
            </section>

            <section>
              <header className="contacts-rail-heading">
                <h2>Next follow-up</h2>
              </header>
              {nextFollowUp ? (
                <Link
                  className="contacts-next-link"
                  href={`/contacts?edit=${nextFollowUp.id}`}
                >
                  <span className="contacts-next-date">
                    <Clock3 aria-hidden="true" />
                    {new Intl.DateTimeFormat(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    }).format(new Date(nextFollowUp.follow_up_at!))}
                  </span>
                  <strong>{nextFollowUp.name}</strong>
                  <span>
                    {[nextFollowUp.role, nextFollowUp.company]
                      .filter(Boolean)
                      .join(" · ") || "Contact details not added"}
                  </span>
                  <span className="contacts-next-action">
                    Open contact <ArrowRight aria-hidden="true" />
                  </span>
                </Link>
              ) : (
                <div className="contacts-rail-empty">
                  <p>No upcoming follow-up is scheduled.</p>
                  <Link href="/contacts?create=true">
                    Add a contact <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              )}
            </section>

            {relationshipCounts.length ? (
              <section>
                <header className="contacts-rail-heading">
                  <h2>Relationships</h2>
                  <span>{relationshipCounts.length} types</span>
                </header>
                <ul className="contacts-relationship-list">
                  {relationshipCounts.map((item) => (
                    <li key={item.value}>
                      <span>
                        <Link2 aria-hidden="true" />
                        {item.label}
                      </span>
                      <CountBadge value={item.count} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>
        ) : null}
      </div>

      {query.create || editing ? (
        <CreateModal
          title={editing ? `Edit ${editing.name}` : "Add a contact"}
          description="Keep the relationship, Opportunity context, and next follow-up together."
          context={project.name}
          closeHref="/contacts"
          size="large"
        >
          <ContactForm
            contact={editing}
            opportunities={opportunities}
            ticketKey={project.ticket_key}
          />
        </CreateModal>
      ) : null}
    </div>
  );
}

function ContactTimeline({
  contacts,
  now,
  weekEnd,
  ticketKey,
}: {
  contacts: ContactRow[];
  now: number;
  weekEnd: number;
  ticketKey: string;
}) {
  const groups = [
    {
      key: "overdue",
      label: "Overdue",
      contacts: contacts.filter(
        (contact) => new Date(contact.follow_up_at!).getTime() < now,
      ),
    },
    {
      key: "next",
      label: "Next 7 days",
      contacts: contacts.filter((contact) => {
        const followUp = new Date(contact.follow_up_at!).getTime();
        return followUp >= now && followUp <= weekEnd;
      }),
    },
    {
      key: "later",
      label: "Later",
      contacts: contacts.filter(
        (contact) => new Date(contact.follow_up_at!).getTime() > weekEnd,
      ),
    },
  ].filter((group) => group.contacts.length > 0);

  return (
    <section className="contact-timeline" aria-label="Scheduled follow-ups">
      {groups.map((group) => (
        <section className="contact-timeline-group" key={group.key}>
          <header>
            <h3>{group.label}</h3>
            <CountBadge value={group.contacts.length} />
          </header>
          <div>
            {[...group.contacts]
              .sort(
                (left, right) =>
                  new Date(left.follow_up_at!).getTime() -
                  new Date(right.follow_up_at!).getTime(),
              )
              .map((contact) => {
                const overdue =
                  new Date(contact.follow_up_at!).getTime() < now;
                return (
                  <Link
                    className="contact-timeline-item"
                    href={`/contacts?edit=${contact.id}`}
                    key={contact.id}
                  >
                    <time
                      dateTime={contact.follow_up_at!}
                      data-overdue={overdue || undefined}
                    >
                      <strong>
                        {new Intl.DateTimeFormat(undefined, {
                          month: "short",
                          day: "numeric",
                        }).format(new Date(contact.follow_up_at!))}
                      </strong>
                      <span>
                        {new Intl.DateTimeFormat(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date(contact.follow_up_at!))}
                      </span>
                    </time>
                    <span className="contact-timeline-marker" aria-hidden="true" />
                    <span className="contact-timeline-copy">
                      <strong>{contact.name}</strong>
                      <span>
                        {[contact.role, contact.company]
                          .filter(Boolean)
                          .join(" · ") || "Contact details not added"}
                      </span>
                      <small>
                        {contact.opportunities
                          ? `${formatOpportunityTicket(ticketKey, contact.opportunities.reference_number)} · ${contact.opportunities.jobs?.title ?? "Untitled role"}`
                          : "Workspace-wide"}
                      </small>
                    </span>
                    <ChevronRight aria-hidden="true" />
                  </Link>
                );
              })}
          </div>
        </section>
      ))}
    </section>
  );
}

function ContactForm({
  contact,
  opportunities,
  ticketKey,
}: {
  contact: ContactRow | null;
  opportunities: OpportunityOption[];
  ticketKey: string;
}) {
  return (
    <form
      action={contact ? updateProjectContact : createProjectContact}
      className="modal-create-form contact-directory-form"
    >
      {contact ? (
        <input type="hidden" name="contactId" value={contact.id} />
      ) : null}
      <section className="form-section">
        <h2>Person</h2>
        <p>Record only the context you need for this workspace.</p>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="directory-contact-name">Name</label>
            <input
              className="input"
              id="directory-contact-name"
              name="name"
              required
              autoFocus
              defaultValue={contact?.name ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="directory-contact-relationship">Relationship</label>
            <SelectField
              id="directory-contact-relationship"
              name="relationship"
              defaultValue={contact?.relationship ?? "contact"}
              ariaLabel="Relationship"
              options={relationshipOptions}
            />
          </div>
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="directory-contact-role">Role</label>
            <input
              className="input"
              id="directory-contact-role"
              name="role"
              defaultValue={contact?.role ?? ""}
              placeholder="Senior recruiter"
            />
          </div>
          <div className="field">
            <label htmlFor="directory-contact-company">Company</label>
            <input
              className="input"
              id="directory-contact-company"
              name="company"
              defaultValue={contact?.company ?? ""}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="directory-contact-opportunity">Opportunity</label>
          <SelectField
            id="directory-contact-opportunity"
            name="opportunityId"
            defaultValue={contact?.opportunity_id ?? ""}
            ariaLabel="Linked Opportunity"
            options={[
              { value: "", label: "Workspace-wide contact" },
              ...opportunities.map((opportunity) => ({
                value: opportunity.id,
                label: `${formatOpportunityTicket(ticketKey, opportunity.reference_number)} · ${opportunity.jobs?.company ?? "Unknown company"} · ${opportunity.jobs?.title ?? "Untitled role"}`,
              })),
            ]}
          />
        </div>
      </section>
      <section className="form-section">
        <h2>Contact and follow-up</h2>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="directory-contact-email">Email</label>
            <input
              className="input"
              id="directory-contact-email"
              name="email"
              type="email"
              defaultValue={contact?.email ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="directory-contact-phone">Phone</label>
            <input
              className="input"
              id="directory-contact-phone"
              name="phone"
              type="tel"
              defaultValue={contact?.phone ?? ""}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="directory-contact-profile">Profile URL</label>
          <input
            className="input"
            id="directory-contact-profile"
            name="profileUrl"
            type="url"
            defaultValue={contact?.profile_url ?? ""}
            placeholder="https://linkedin.com/in/…"
          />
        </div>
        <div className="field">
          <label htmlFor="directory-contact-follow-up">Follow up</label>
          <DateTimeField
            id="directory-contact-follow-up"
            name="followUpAt"
            defaultValue={contact?.follow_up_at ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="directory-contact-notes">Notes</label>
          <textarea
            className="textarea"
            id="directory-contact-notes"
            name="notes"
            rows={5}
            defaultValue={contact?.notes ?? ""}
            placeholder="How you met, what matters, and the next useful touchpoint…"
          />
        </div>
      </section>
      <footer className="composer-footer">
        <span className="composer-save-note">
          Scheduled follow-ups appear on Home.
        </span>
        <Link className="button secondary" href="/contacts">
          Cancel
        </Link>
        <SubmitButton pendingLabel="Saving contact…">
          {contact ? "Save contact" : "Add contact"}
        </SubmitButton>
      </footer>
    </form>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function relationshipLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
