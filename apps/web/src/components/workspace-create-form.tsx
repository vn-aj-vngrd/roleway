"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { SelectField } from "@/components/form-controls";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { WorkspaceIconPicker } from "@/components/workspace-icon-picker";
import { createSearchProject } from "@/features/projects/actions";
import type { SearchProject } from "@/features/projects/context";

function suggestedKey(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  if (words.length === 1)
    return (words[0] ?? "")
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 5)
      .toUpperCase();
  return words
    .map((word) => word.match(/[a-z0-9]/i)?.[0] ?? "")
    .join("")
    .slice(0, 5)
    .toUpperCase();
}

export function CreateWorkspaceButton({
  className = "button primary",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      className={className}
      type="button"
      onClick={() =>
        window.dispatchEvent(new CustomEvent("roleway:create-workspace"))
      }
    >
      {children}
    </button>
  );
}

export function WorkspaceComposerFields({
  project,
}: {
  project?: SearchProject;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [ticketKey, setTicketKey] = useState(project?.ticket_key ?? "");
  const [keyEdited, setKeyEdited] = useState(Boolean(project));
  const iconDefaults: {
    defaultType?: string;
    defaultValue?: string;
    defaultColor?: string;
  } = {};
  if (project?.icon_type) iconDefaults.defaultType = project.icon_type;
  if (project?.icon_value) iconDefaults.defaultValue = project.icon_value;
  if (project?.icon_color) iconDefaults.defaultColor = project.icon_color;

  return (
    <>
      <div className="workspace-create-editor">
        <div className="workspace-create-title-row">
          <WorkspaceIconPicker {...iconDefaults} />
          <label className="sr-only" htmlFor="workspace-composer-name">
            Workspace name
          </label>
          <input
            id="workspace-composer-name"
            name="name"
            required
            minLength={2}
            value={name}
            placeholder="Workspace name"
            autoComplete="off"
            autoFocus
            onChange={(event) => {
              const next = event.target.value;
              setName(next);
              if (!keyEdited) setTicketKey(suggestedKey(next));
            }}
          />
        </div>
        <label className="sr-only" htmlFor="workspace-composer-objective">
          Objective
        </label>
        <input
          className="workspace-create-objective"
          id="workspace-composer-objective"
          name="objective"
          defaultValue={project?.objective ?? ""}
          placeholder="What outcome is this search working toward?"
        />
        <label className="sr-only" htmlFor="workspace-composer-description">
          Strategy description
        </label>
        <textarea
          id="workspace-composer-description"
          name="description"
          rows={2}
          defaultValue={project?.description ?? ""}
          placeholder="Describe this job-search direction…"
        />
      </div>

      <section
        className="workspace-create-details"
        aria-labelledby="workspace-composer-details-heading"
      >
        <header>
          <div>
            <h2 id="workspace-composer-details-heading">Workspace details</h2>
            <p>Set the context used to organize and evaluate this search.</p>
          </div>
        </header>
        <div>
          <label>
            <span>Opportunity key</span>
            <input
              id="workspace-composer-key"
              name="ticketKey"
              required
              minLength={2}
              maxLength={10}
              pattern="[A-Za-z][A-Za-z0-9]{1,9}"
              value={ticketKey}
              placeholder="PLD"
              autoCapitalize="characters"
              spellCheck={false}
              aria-describedby="workspace-composer-key-help"
              onChange={(event) => {
                setKeyEdited(true);
                setTicketKey(
                  event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 10),
                );
              }}
            />
            <small id="workspace-composer-key-help">
              Generated from the name until you edit it
            </small>
          </label>
          <label>
            <span>
              Target roles <small>Optional</small>
            </span>
            <input
              id="workspace-composer-roles"
              name="targetTitles"
              defaultValue={project?.target_titles.join(", ") ?? ""}
              placeholder="Head of Product, Product Director"
            />
          </label>
          <label>
            <span>
              Industries <small>Optional</small>
            </span>
            <input
              id="workspace-composer-industries"
              name="industries"
              defaultValue={project?.industries.join(", ") ?? ""}
              placeholder="Developer tools, fintech"
            />
          </label>
          <label>
            <span>
              Seniority <small>Optional</small>
            </span>
            <input
              id="workspace-composer-seniority"
              name="seniority"
              defaultValue={project?.seniority.join(", ") ?? ""}
              placeholder="Senior, Staff, Director"
            />
          </label>
          <label>
            <span>
              Locations <small>Optional</small>
            </span>
            <input
              id="workspace-composer-locations"
              name="locations"
              defaultValue={project?.locations.join(", ") ?? ""}
              placeholder="Remote, New York"
            />
          </label>
          <label>
            <span>Work arrangement</span>
            <SelectField
              id="workspace-composer-remote"
              name="remotePreference"
              defaultValue={project?.remote_preference ?? "flexible"}
              ariaLabel="Work arrangement"
              options={[
                { value: "required", label: "Remote required" },
                { value: "preferred", label: "Remote preferred" },
                { value: "flexible", label: "Flexible" },
              ]}
            />
          </label>
        </div>
      </section>
    </>
  );
}

export function WorkspaceCreateForm({ onCancel }: { onCancel: () => void }) {
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);
  useEffect(
    () =>
      setError(
        new URLSearchParams(window.location.search).get("workspaceError"),
      ),
    [],
  );

  return (
    <form
      action={createSearchProject}
      className="modal-create-form workspace-composer-form workspace-create-form"
    >
      <input type="hidden" name="returnTo" value={pathname} />
      <input type="hidden" name="technologies" value="" />
      <input type="hidden" name="employmentTypes" value="" />
      <input type="hidden" name="minimumCompensation" value="" />
      <input type="hidden" name="currency" value="USD" />
      <input type="hidden" name="companySizes" value="" />
      <input type="hidden" name="dealBreakers" value="" />
      <input type="hidden" name="preferredCompanies" value="" />
      <input type="hidden" name="excludedCompanies" value="" />
      <input type="hidden" name="searchKeywords" value="" />
      <input type="hidden" name="weeklyApplicationGoal" value="0" />
      <WorkspaceComposerFields />
      {error ? (
        <div className="form-alert error workspace-create-error" role="alert">
          {error}
        </div>
      ) : null}
      <footer className="composer-footer">
        <span className="composer-footer-spacer" />
        <Button
          className="button secondary"
          variant="outline"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <SubmitButton pendingLabel="Creating…">Create workspace</SubmitButton>
      </footer>
    </form>
  );
}
