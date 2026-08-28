import { formatOpportunityTicket } from "@roleway/core";
import { CalendarClock, Mail, Pencil, Plus, Search, SlidersHorizontal, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { CreateModal } from "@/components/create-modal";
import { DateTimeField, SelectField } from "@/components/form-controls";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { ViewToolbar, WorkspaceHeader } from "@/components/ui-primitives";
import { createProjectContact, deleteProjectContact, updateProjectContact } from "@/features/contacts/actions";
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
  opportunities: { id: string; reference_number: number; jobs: { company: string; title: string } | null } | null;
};
type OpportunityOption = { id: string; reference_number: number; jobs: { company: string; title: string } | null };

const relationshipOptions = [
  { value: "contact", label: "Contact" },
  { value: "recruiter", label: "Recruiter" },
  { value: "hiring_manager", label: "Hiring manager" },
  { value: "interviewer", label: "Interviewer" },
  { value: "referral", label: "Referral" },
  { value: "colleague", label: "Former colleague" },
];

export default async function ContactsPage(
  props: { searchParams: Promise<{ create?: string; edit?: string; q?: string; relationship?: string; created?: string; saved?: string; deleted?: string; error?: string }> }
) {
  const searchParams = await props.searchParams;
  const [context, query] = await Promise.all([requireSearchContext(), searchParams]);
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");

  const [contactsResult, opportunitiesResult] = await Promise.all([
    context.supabase.from("contacts").select("id, opportunity_id, name, role, company, relationship, email, phone, profile_url, notes, follow_up_at, updated_at, opportunities(id, reference_number, jobs(company, title))").eq("project_id", context.project.id).order("follow_up_at", { ascending: true, nullsFirst: false }).order("name").limit(500),
    context.supabase.from("opportunities").select("id, reference_number, jobs(company, title)").eq("project_id", context.project.id).neq("stage", "closed").order("updated_at", { ascending: false }).limit(500),
  ]);
  const contacts = (contactsResult.data ?? []) as unknown as ContactRow[];
  const opportunities = (opportunitiesResult.data ?? []) as unknown as OpportunityOption[];
  const normalizedQuery = query.q?.trim().toLowerCase() ?? "";
  const relationship = relationshipOptions.some((option) => option.value === query.relationship) ? query.relationship! : "all";
  const visibleContacts = contacts.filter((contact) => {
    if (relationship !== "all" && contact.relationship !== relationship) return false;
    if (!normalizedQuery) return true;
    return [contact.name, contact.role, contact.company, contact.email, contact.opportunities?.jobs?.title].filter(Boolean).some((value) => value!.toLowerCase().includes(normalizedQuery));
  });
  const editing = contacts.find((contact) => contact.id === query.edit) ?? null;
  const now = Date.now();
  const followUps = contacts.filter((contact) => contact.follow_up_at && new Date(contact.follow_up_at).getTime() <= now + 7 * 86_400_000).length;

  return <div className="workspace-page workspace-index-page contacts-page">
    <WorkspaceHeader title="Contacts" count={contacts.length} context={<>{followUps ? `${followUps} follow-up${followUps === 1 ? "" : "s"} due this week` : `People and follow-ups for ${context.project.name}`}.</>} actions={<Link className="button primary" href="/contacts?create=true"><Plus aria-hidden="true" />Add contact</Link>} />
    {query.created ? <div className="form-alert success" role="status">Contact added to {context.project.name}.</div> : null}
    {query.saved ? <div className="form-alert success" role="status">Contact updated.</div> : null}
    {query.deleted ? <div className="form-alert success" role="status">Contact removed.</div> : null}
    {query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}
    {contactsResult.error || opportunitiesResult.error ? <div className="form-alert error" role="alert">Some contact context could not be loaded. Refresh to try again.</div> : null}

    <ViewToolbar primary={<span className="workspace-view-chip" aria-current="page">All contacts <span>{visibleContacts.length}</span></span>} actions={<form className="contacts-toolbar" action="/contacts"><label className="contacts-search"><Search aria-hidden="true" /><span className="sr-only">Workspace contacts</span><input name="q" defaultValue={query.q ?? ""} placeholder="Search contacts…" /></label><div className="contacts-filter"><SelectField id="contact-relationship-filter" name="relationship" defaultValue={relationship} ariaLabel="Filter by relationship" options={[{ value: "all", label: "All relationships" }, ...relationshipOptions]} /></div><button className="icon-button workspace-filter-apply" data-tooltip="Apply filters" aria-label="Apply filters"><SlidersHorizontal aria-hidden="true" /></button>{normalizedQuery || relationship !== "all" ? <Link className="button ghost" href="/contacts">Clear</Link> : null}</form>} />

    <div className="workspace-index-content">{contacts.length === 0 ? <div className="empty-state"><span className="empty-icon"><UserRound aria-hidden="true" /></span><h2>No contacts in this workspace</h2><p>Add a recruiter, interviewer, referral, or networking contact. Follow-ups will appear on Home.</p><Link className="button primary" href="/contacts?create=true"><Plus aria-hidden="true" />Add your first contact</Link></div> : visibleContacts.length === 0 ? <div className="empty-state compact"><Search aria-hidden="true" /><h2>No matching contacts</h2><p>Try another name, company, or relationship.</p><Link className="button secondary" href="/contacts">Clear filters</Link></div> : <section className="contacts-table" role="table" aria-label="Contacts">
      <div className="contacts-row contacts-row-header" role="row"><span role="columnheader">Person</span><span role="columnheader">Relationship</span><span role="columnheader">Opportunity</span><span role="columnheader">Follow-up</span><span aria-hidden="true" /></div>
      {visibleContacts.map((contact) => <article className="contacts-row" role="row" key={contact.id}>
        <span className="contact-identity" role="cell"><span className="contact-avatar" aria-hidden="true">{initials(contact.name)}</span><span><strong>{contact.name}</strong><small>{[contact.role, contact.company].filter(Boolean).join(" · ") || "Details not added"}</small>{contact.email ? <a href={`mailto:${contact.email}`}><Mail aria-hidden="true" />{contact.email}</a> : null}</span></span>
        <span role="cell" className="contact-relationship"><Badge variant="secondary">{relationshipLabel(contact.relationship)}</Badge></span>
        <span role="cell" className="contact-opportunity">{contact.opportunities ? <Link href={`/opportunities/${contact.opportunities.id}`}><strong>{formatOpportunityTicket(context.project.ticket_key, contact.opportunities.reference_number)}</strong><small>{contact.opportunities.jobs?.title ?? "Untitled role"}</small></Link> : <span className="muted">Workspace-wide</span>}</span>
        <span role="cell" className={`contact-follow-up ${contact.follow_up_at && new Date(contact.follow_up_at).getTime() < now ? "overdue" : ""}`}>{contact.follow_up_at ? <><CalendarClock aria-hidden="true" /><time>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(contact.follow_up_at))}</time></> : <span className="faint">Not set</span>}</span>
        <span role="cell" className="contact-row-actions"><Link className="icon-button" data-tooltip="Edit contact" aria-label={`Edit ${contact.name}`} href={`/contacts?edit=${contact.id}`}><Pencil aria-hidden="true" /></Link><ConfirmationDialog title={`Remove ${contact.name}?`} description="This removes the contact from the current Workspace. It does not contact the person." action={deleteProjectContact} confirmLabel="Remove contact" pendingLabel="Removing…" trigger={<Trash2 aria-hidden="true" />} triggerClassName="icon-button" triggerAriaLabel={`Remove ${contact.name}`} triggerTooltip="Remove contact" hiddenFields={{ contactId: contact.id }} destructive /></span>
      </article>)}
    </section>}
    </div>

    {query.create || editing ? <CreateModal title={editing ? `Edit ${editing.name}` : "Add a contact"} description="Keep the relationship, Opportunity context, and next follow-up together." context={context.project.name} closeHref="/contacts" size="large"><ContactForm contact={editing} opportunities={opportunities} ticketKey={context.project.ticket_key} /></CreateModal> : null}
  </div>;
}

function ContactForm({ contact, opportunities, ticketKey }: { contact: ContactRow | null; opportunities: OpportunityOption[]; ticketKey: string }) {
  return <form action={contact ? updateProjectContact : createProjectContact} className="modal-create-form contact-directory-form">{contact ? <input type="hidden" name="contactId" value={contact.id} /> : null}<section className="form-section"><h2>Person</h2><p>Record only the context you need for this workspace.</p><div className="field-grid"><div className="field"><label htmlFor="directory-contact-name">Name</label><input className="input" id="directory-contact-name" name="name" required autoFocus defaultValue={contact?.name ?? ""} /></div><div className="field"><label htmlFor="directory-contact-relationship">Relationship</label><SelectField id="directory-contact-relationship" name="relationship" defaultValue={contact?.relationship ?? "contact"} ariaLabel="Relationship" options={relationshipOptions} /></div></div><div className="field-grid"><div className="field"><label htmlFor="directory-contact-role">Role</label><input className="input" id="directory-contact-role" name="role" defaultValue={contact?.role ?? ""} placeholder="Senior recruiter" /></div><div className="field"><label htmlFor="directory-contact-company">Company</label><input className="input" id="directory-contact-company" name="company" defaultValue={contact?.company ?? ""} /></div></div><div className="field"><label htmlFor="directory-contact-opportunity">Opportunity</label><SelectField id="directory-contact-opportunity" name="opportunityId" defaultValue={contact?.opportunity_id ?? ""} ariaLabel="Linked Opportunity" options={[{ value: "", label: "Workspace-wide contact" }, ...opportunities.map((opportunity) => ({ value: opportunity.id, label: `${formatOpportunityTicket(ticketKey, opportunity.reference_number)} · ${opportunity.jobs?.company ?? "Unknown company"} · ${opportunity.jobs?.title ?? "Untitled role"}` }))]} /></div></section><section className="form-section"><h2>Contact and follow-up</h2><div className="field-grid"><div className="field"><label htmlFor="directory-contact-email">Email</label><input className="input" id="directory-contact-email" name="email" type="email" defaultValue={contact?.email ?? ""} /></div><div className="field"><label htmlFor="directory-contact-phone">Phone</label><input className="input" id="directory-contact-phone" name="phone" type="tel" defaultValue={contact?.phone ?? ""} /></div></div><div className="field"><label htmlFor="directory-contact-profile">Profile URL</label><input className="input" id="directory-contact-profile" name="profileUrl" type="url" defaultValue={contact?.profile_url ?? ""} placeholder="https://linkedin.com/in/…" /></div><div className="field"><label htmlFor="directory-contact-follow-up">Follow up</label><DateTimeField id="directory-contact-follow-up" name="followUpAt" defaultValue={contact?.follow_up_at ?? ""} /></div><div className="field"><label htmlFor="directory-contact-notes">Notes</label><textarea className="textarea" id="directory-contact-notes" name="notes" rows={5} defaultValue={contact?.notes ?? ""} placeholder="How you met, what matters, and the next useful touchpoint…" /></div></section><footer className="composer-footer"><span className="composer-save-note">Scheduled follow-ups appear on Home.</span><Link className="button secondary" href="/contacts">Cancel</Link><SubmitButton pendingLabel="Saving contact…">{contact ? "Save contact" : "Add contact"}</SubmitButton></footer></form>;
}

function initials(name: string) { return name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }
function relationshipLabel(value: string) { return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
