"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { AiConnectionForm } from "@/components/ai-connection-form";
import { CreateModal } from "@/components/create-modal";
import { Button } from "@/components/ui/button";

export function AiConnectionDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" />
        Add connection
      </Button>
      {open ? (
        <CreateModal
          title="Add a connection"
          description="Connect an API provider for Agent. Your key is encrypted before storage."
          context="Agent"
          size="compact"
          allowFullscreen={false}
          hideContext
          onClose={() => setOpen(false)}
        >
          <AiConnectionForm onCancel={() => setOpen(false)} />
        </CreateModal>
      ) : null}
    </>
  );
}
