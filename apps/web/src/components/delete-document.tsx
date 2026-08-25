"use client";

import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { deleteDocument } from "@/features/workspace/actions";

export function DeleteDocument({ documentId, title }: { documentId: string; title: string }) {
  return <ConfirmationDialog
    title={`Delete “${title}”?`}
    description="This permanently removes the document from your workspace. This action cannot be undone."
    action={deleteDocument}
    confirmLabel="Delete permanently"
    pendingLabel="Deleting…"
    trigger="Delete document"
    triggerClassName="button danger-outline"
    hiddenFields={{ documentId }}
    destructive
  />;
}
