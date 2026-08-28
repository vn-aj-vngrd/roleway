"use client";

import { deleteAccount } from "@/app/(app)/settings/actions";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

export function DeleteAccountControl({ name, email }: { name: string; email: string }) {
  return <div className="delete-account-control">
    <div className="danger-action-row">
      <div><strong>Delete account</strong><p>Remove your account and every career-search record permanently.</p></div>
      <ConfirmationDialog
        title="Delete your account?"
        description="This permanently removes your profile, Workspaces, Jobs, Opportunities, application records, tasks, contacts, interviews, documents, and settings. This action cannot be undone."
        action={deleteAccount}
        confirmLabel="Delete account permanently"
        pendingLabel="Deleting account…"
        trigger="Delete account"
        triggerClassName="button danger-outline"
        destructive
        confirmationFields={[
          { name: "confirmationName", label: "Confirm your name", expected: name },
          { name: "confirmationEmail", label: "Confirm your email", expected: email, type: "email" },
          { name: "currentPassword", label: "Current password", type: "password" },
        ]}
      />
    </div>
  </div>;
}
