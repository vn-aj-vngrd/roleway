"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { AiConnectionForm, type EditableAiConnection } from "@/components/ai-connection-form";
import { CreateModal } from "@/components/create-modal";
import { Button } from "@/components/ui/button";

export function AiConnectionDialog({ connection }: { connection?: EditableAiConnection }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant={connection ? "ghost" : "default"} size={connection ? "icon-sm" : "default"} aria-label={connection ? `Edit ${connection.label}` : undefined} data-tooltip={connection ? "Edit connection" : undefined} onClick={() => setOpen(true)}>
        {connection ? <Pencil aria-hidden="true" /> : <><Plus aria-hidden="true" />Add connection</>}
      </Button>
      {open ? (
        <CreateModal
          title={connection ? "Edit connection" : "Add a connection"}
          description={connection ? "Update your provider details. Leave the API key blank to keep your saved key." : "Connect an API provider for Agent. Your key is encrypted before storage."}
          context="Agent"
          size="compact"
          allowFullscreen={false}
          hideContext
          onClose={() => setOpen(false)}
        >
          <AiConnectionForm connection={connection} onCancel={() => setOpen(false)} />
        </CreateModal>
      ) : null}
    </>
  );
}
