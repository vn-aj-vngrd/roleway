import { SelectField } from "@/components/form-controls";
import { WorkspaceIconPicker } from "@/components/workspace-icon-picker";
import type { SearchProject } from "@/features/projects/context";

export function WorkspaceSettingsFields({ project, focusName = false }: { project?: SearchProject; focusName?: boolean }) {
  const list = (value: string[] | undefined) => value?.join(", ") ?? "";
  const prefix = project ? "workspace" : "new-workspace";

  return <>
    <section className="form-section" id="general">
      <h2>{project ? "Workspace identity" : "Name the direction"}</h2>
      <p>A Workspace is one coherent strategy. Its Opportunity key keeps identifiers recognizable everywhere in Roleway.</p>
      <div className="workspace-identity-card">
        <div className="field"><label htmlFor={`${prefix}-name`}>Icon and name</label><span className="workspace-name-control"><WorkspaceIconPicker defaultType={project?.icon_type} defaultValue={project?.icon_value} defaultColor={project?.icon_color} /><input className="input" id={`${prefix}-name`} name="name" required defaultValue={project?.name ?? ""} placeholder="Remote product engineering" autoFocus={focusName} /></span></div>
        <div className="field"><span><label htmlFor={`${prefix}-ticket-key`}>Opportunity key</label><small id={`${prefix}-ticket-key-help`}>Used in Opportunity identifiers</small></span><input className="input workspace-ticket-key-input" id={`${prefix}-ticket-key`} name="ticketKey" required minLength={2} maxLength={10} pattern="[A-Za-z][A-Za-z0-9]{1,9}" defaultValue={project?.ticket_key ?? ""} placeholder="PROD" autoCapitalize="characters" spellCheck={false} aria-describedby={`${prefix}-ticket-key-help`} /></div>
      </div>
      <div className="workspace-setting-block"><div><label htmlFor={`${prefix}-objective`}>Objective</label><small>The outcome this focused job search is designed to reach</small></div><input className="input" id={`${prefix}-objective`} name="objective" defaultValue={project?.objective ?? ""} placeholder="Find a senior product role at a small, global company" /></div>
      <div className="workspace-setting-block workspace-setting-block-textarea"><div><label htmlFor={`${prefix}-description`}>Strategy notes</label><small>A short summary of what makes this Workspace distinct</small></div><textarea className="textarea" id={`${prefix}-description`} name="description" rows={4} defaultValue={project?.description ?? ""} placeholder="What makes this Workspace distinct?" /></div>
    </section>

    <section className="form-section" id="role-focus">
      <h2>Role focus</h2><p>Separate multiple values with commas.</p>
      <div className="field"><label htmlFor={`${prefix}-titles`}>Target roles</label><input className="input" id={`${prefix}-titles`} name="targetTitles" defaultValue={list(project?.target_titles)} placeholder="Product Engineer, Full-Stack Engineer" /></div>
      <div className="field-grid"><div className="field"><label htmlFor={`${prefix}-industries`}>Industries</label><input className="input" id={`${prefix}-industries`} name="industries" defaultValue={list(project?.industries)} placeholder="Developer tools, fintech" /></div><div className="field"><label htmlFor={`${prefix}-seniority`}>Seniority</label><input className="input" id={`${prefix}-seniority`} name="seniority" defaultValue={list(project?.seniority)} placeholder="Senior, Staff" /></div></div>
      <div className="field"><label htmlFor={`${prefix}-technologies`}>Preferred skills and technologies</label><input className="input" id={`${prefix}-technologies`} name="technologies" defaultValue={list(project?.preferred_technologies)} placeholder="TypeScript, React, PostgreSQL" /></div>
      <div className="field-grid"><div className="field"><label htmlFor={`${prefix}-employment`}>Employment types</label><input className="input" id={`${prefix}-employment`} name="employmentTypes" defaultValue={list(project?.employment_types)} placeholder="Full-time, contract" /></div><div className="field"><label htmlFor={`${prefix}-company-size`}>Company sizes</label><input className="input" id={`${prefix}-company-size`} name="companySizes" defaultValue={list(project?.company_sizes)} placeholder="Startup, 50–500" /></div></div>
    </section>

    <section className="form-section" id="location-compensation">
      <h2>Location and compensation</h2><p>Use these as review criteria, not silent filters.</p>
      <div className="field-grid"><div className="field"><label htmlFor={`${prefix}-remote`}>Remote preference</label><SelectField id={`${prefix}-remote`} name="remotePreference" defaultValue={project?.remote_preference ?? "flexible"} ariaLabel="Remote preference" options={[{ value: "required", label: "Remote required" }, { value: "preferred", label: "Remote preferred" }, { value: "flexible", label: "Flexible" }]} /></div><div className="field"><label htmlFor={`${prefix}-locations`}>Locations</label><input className="input" id={`${prefix}-locations`} name="locations" defaultValue={list(project?.locations)} placeholder="Remote, New York, Sydney" /></div></div>
      <div className="compensation-grid"><div className="field"><label htmlFor={`${prefix}-compensation`}>Minimum annual compensation</label><input className="input" id={`${prefix}-compensation`} name="minimumCompensation" type="number" min="0" defaultValue={project?.minimum_compensation ?? ""} /></div><div className="field"><label htmlFor={`${prefix}-currency`}>Currency</label><SelectField id={`${prefix}-currency`} name="currency" defaultValue={project?.currency ?? "USD"} ariaLabel="Compensation currency" options={["USD", "EUR", "GBP", "CAD", "AUD", "SGD", "PHP"].map((value) => ({ value, label: value }))} /></div></div>
    </section>

    <section className="form-section" id="decision-boundaries">
      <h2>Decision boundaries</h2><p>Record the criteria that should change how you evaluate a role.</p>
      <div className="field"><label htmlFor={`${prefix}-preferred-companies`}>Preferred companies</label><input className="input" id={`${prefix}-preferred-companies`} name="preferredCompanies" defaultValue={list(project?.preferred_companies)} placeholder="Companies you want to watch" /></div>
      <div className="field"><label htmlFor={`${prefix}-excluded-companies`}>Excluded companies</label><input className="input" id={`${prefix}-excluded-companies`} name="excludedCompanies" defaultValue={list(project?.excluded_companies)} placeholder="Companies you will not pursue" /></div>
      <div className="field"><label htmlFor={`${prefix}-deal-breakers`}>Deal breakers</label><textarea className="textarea" id={`${prefix}-deal-breakers`} name="dealBreakers" rows={3} defaultValue={list(project?.deal_breakers)} placeholder="Mandatory relocation, night shift, unpaid trial" /></div>
      <div className="field"><label htmlFor={`${prefix}-keywords`}>Search keywords</label><input className="input" id={`${prefix}-keywords`} name="searchKeywords" defaultValue={list(project?.search_keywords)} placeholder="product engineer, TypeScript" /></div>
      <input type="hidden" name="weeklyApplicationGoal" value={project?.weekly_application_goal ?? 0} />
    </section>
  </>;
}
