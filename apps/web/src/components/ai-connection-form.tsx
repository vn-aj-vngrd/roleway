"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { saveAiConnection } from "@/app/(app)/settings/ai/actions";

const providers = {
  openai: { label: "OpenAI", model: "gpt-4.1-mini", key: "sk-…" },
  anthropic: { label: "Anthropic", model: "claude-sonnet-4-5", key: "sk-ant-…" },
  gemini: { label: "Google Gemini", model: "gemini-2.5-flash", key: "AIza…" },
  openrouter: { label: "OpenRouter", model: "openai/gpt-4.1-mini", key: "sk-or-…" },
  "openai-compatible": { label: "OpenAI-compatible", model: "", key: "Provider API key" },
} as const;
type Provider = keyof typeof providers;

export function AiConnectionForm() {
  const [provider, setProvider] = useState<Provider>("openai");
  const preset = providers[provider];
  return <form action={saveAiConnection} className="ai-connection-form"><div className="field-grid"><div className="field"><label htmlFor="provider">Provider</label><select className="input" id="provider" name="provider" value={provider} onChange={(event) => setProvider(event.target.value as Provider)}>{Object.entries(providers).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></div><div className="field"><label htmlFor="connectionLabel">Connection name</label><input className="input" id="connectionLabel" name="label" defaultValue="Personal API" required /></div></div><div className="field"><label htmlFor="model">Model</label><input key={provider} className="input mono" id="model" name="model" defaultValue={preset.model} placeholder="Provider model ID" required /><span className="field-hint">Use a model enabled for your provider account. You can change this connection later by replacing it.</span></div>{provider === "openai-compatible" ? <div className="field"><label htmlFor="baseUrl">API base URL</label><input className="input mono" id="baseUrl" name="baseUrl" type="url" placeholder="https://api.example.com/v1" required /><span className="field-hint">Public HTTPS endpoints only. Local and private network addresses are blocked.</span></div> : <input type="hidden" name="baseUrl" value="" />}<div className="field"><label htmlFor="apiKey">API key</label><input className="input mono" id="apiKey" name="apiKey" type="password" autoComplete="off" placeholder={preset.key} required /><span className="field-hint">Encrypted before storage. Roleway never returns the key to your browser after saving.</span></div><SubmitButton pendingLabel="Encrypting and saving…">Save connection</SubmitButton></form>;
}
