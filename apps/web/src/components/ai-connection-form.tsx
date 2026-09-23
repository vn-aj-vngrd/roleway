"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { saveAiConnection } from "@/app/(app)/settings/ai/actions";
import { SelectField } from "@/components/form-controls";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";

const providers = {
  openai: { label: "OpenAI", model: "gpt-4.1-mini", key: "sk-…" },
  anthropic: {
    label: "Anthropic",
    model: "claude-sonnet-4-5",
    key: "sk-ant-…",
  },
  gemini: {
    label: "Google Gemini",
    model: "gemini-2.5-flash",
    key: "AIza…",
  },
  openrouter: {
    label: "OpenRouter",
    model: "openai/gpt-4.1-mini",
    key: "sk-or-…",
  },
  "openai-compatible": {
    label: "OpenAI-compatible",
    model: "",
    key: "Provider API key",
  },
} as const;

export type Provider = keyof typeof providers;

export type EditableAiConnection = { id: string; provider: Provider; label: string; model: string; baseUrl: string };

export function AiConnectionForm({ onCancel, connection }: { onCancel: () => void; connection?: EditableAiConnection | undefined }) {
  const error = useSearchParams().get("error");
  const [provider, setProvider] = useState<Provider>(connection?.provider ?? "openai");
  const needsKey = !connection || provider !== connection.provider;
  const preset = providers[provider];

  return (
    <form action={saveAiConnection} className="ai-connection-form">
      {error ? <div className="form-alert error" role="alert">{error}</div> : null}
      <input type="hidden" name="connectionId" value={connection?.id ?? ""} />
      <div className="field-grid">
        <div className="field">
          <label htmlFor="provider">Provider</label>
          <SelectField
            id="provider"
            name="provider"
            value={provider}
            onValueChange={(value) => setProvider(value as Provider)}
            options={Object.entries(providers).map(([value, item]) => ({
              value,
              label: item.label,
            }))}
          />
        </div>
        <div className="field">
          <label htmlFor="connectionLabel">Connection name</label>
          <input
            className="input"
            id="connectionLabel"
            name="label"
            defaultValue={connection?.label ?? "Personal API"}
            maxLength={80}
            required
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="model">Model</label>
        <input
          key={provider}
          className="input mono"
          id="model"
          name="model"
          defaultValue={connection && provider === connection.provider ? connection.model : preset.model}
          maxLength={160}
          placeholder="Provider model ID"
          required
        />
        <span className="field-hint">
          Use a model enabled for your provider account. Test the connection after changing its model or key.
        </span>
      </div>
      {provider === "openai-compatible" ? (
        <div className="field">
          <label htmlFor="baseUrl">API base URL</label>
          <input
            className="input mono"
            id="baseUrl"
            name="baseUrl"
            defaultValue={connection?.baseUrl ?? ""}
            maxLength={500}
            type="url"
            placeholder="https://api.example.com/v1"
            required
          />
          <span className="field-hint">
            Public HTTPS endpoints only. Local and private network addresses are
            blocked.
          </span>
        </div>
      ) : (
        <input type="hidden" name="baseUrl" value="" />
      )}
      <div className="field">
        <label htmlFor="apiKey">API key</label>
        <input
          className="input mono"
          key={provider}
          id="apiKey"
          name="apiKey"
          type="password"
          autoComplete="off"
          placeholder={needsKey ? preset.key : "Keep saved key"}
          minLength={8}
          maxLength={500}
          required={needsKey}
        />
        <span className="field-hint">
          Encrypted before storage. Roleway never returns the key to your
          browser after saving.
        </span>
      </div>
      <footer className="ai-connection-form-actions">
        <Button
          className="button secondary"
          variant="outline"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <SubmitButton pendingLabel="Encrypting and saving…">
          {connection ? "Save changes" : "Save connection"}
        </SubmitButton>
      </footer>
    </form>
  );
}
