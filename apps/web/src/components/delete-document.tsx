"use client";

import { useRef } from "react";
import { deleteDocument } from "@/features/workspace/actions";
import { SubmitButton } from "@/components/submit-button";

export function DeleteDocument({ documentId, title }: { documentId: string; title: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  return <><button className="button danger" type="button" onClick={() => dialogRef.current?.showModal()}>Delete document</button><dialog className="confirm-dialog" ref={dialogRef} onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}><form action={deleteDocument}><input type="hidden" name="documentId" value={documentId} /><h2>Delete “{title}”?</h2><p>This permanently removes the document from your workspace. This action cannot be undone.</p><div><button className="button secondary" type="button" onClick={() => dialogRef.current?.close()}>Cancel</button><SubmitButton className="button danger" pendingLabel="Deleting…">Delete permanently</SubmitButton></div></form></dialog></>;
}
