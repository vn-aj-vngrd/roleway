"use client";

import { useEffect, useState, useTransition } from "react";
import {
  type NotificationPreference,
  updateNotificationPreference,
} from "@/app/(app)/settings/actions";

type Preferences = Record<NotificationPreference, boolean>;

type PreferenceOption = {
  key: NotificationPreference;
  label: string;
  description: string;
};

const options: PreferenceOption[] = [
  {
    key: "taskReminders",
    label: "Task updates",
    description: "Show updates when tasks are added to an Opportunity",
  },
  {
    key: "interviewReminders",
    label: "Interview reminders",
    description: "Updates when interviews are scheduled or approaching",
  },
  {
    key: "pipelineUpdates",
    label: "Pipeline changes",
    description: "Record when an Opportunity moves to another stage",
  },
];

export function NotificationPreferences({
  initialPreferences,
}: {
  initialPreferences: Preferences;
}) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [pendingKeys, setPendingKeys] = useState<NotificationPreference[]>([]);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  useEffect(() => setPreferences(initialPreferences), [initialPreferences]);

  const updatePreference = (
    preference: NotificationPreference,
    enabled: boolean,
  ) => {
    const previousValue = preferences[preference];
    setPreferences((current) => ({ ...current, [preference]: enabled }));
    setPendingKeys((current) => [...current, preference]);
    setError("");

    startTransition(async () => {
      const result = await updateNotificationPreference({
        preference,
        enabled,
      });
      if (!result.ok) {
        setPreferences((current) => ({
          ...current,
          [preference]: previousValue,
        }));
        setError(result.error);
      }
      setPendingKeys((current) =>
        current.filter((key) => key !== preference),
      );
    });
  };

  return (
    <section className="settings-group">
      <header className="settings-group-header">
        <h2>Workspace notifications</h2>
        <p>Choose which updates appear in your notification inbox.</p>
      </header>
      {error ? (
        <div className="form-alert error" role="alert">
          {error}
        </div>
      ) : null}
      <div className="settings-card">
        {options.map((option) => {
          const pending = pendingKeys.includes(option.key);
          return (
            <label
              className="preference-toggle settings-row"
              data-saving={pending || undefined}
              aria-busy={pending || undefined}
              key={option.key}
            >
              <span className="settings-row-copy">
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
              <input
                type="checkbox"
                checked={preferences[option.key]}
                disabled={pending}
                onChange={(event) =>
                  updatePreference(option.key, event.currentTarget.checked)
                }
              />
              <span className="switch" aria-hidden="true" />
            </label>
          );
        })}
      </div>
    </section>
  );
}
