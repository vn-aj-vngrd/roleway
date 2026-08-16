import { SettingsNav } from "@/components/settings-nav";

const supportedProviders = ["OpenAI", "Anthropic", "Google Gemini", "OpenRouter", "Ollama", "OpenAI-compatible endpoint"];

export default function AiSettingsPage() {
  return <div className="page"><header className="page-header"><div><h1>Settings</h1><p className="page-subtitle">Provider-neutral models and private credentials.</p></div></header><div className="settings-layout"><SettingsNav active="AI providers" /><main><section className="form-section"><h2>No AI provider connected</h2><p>Roleway’s tracking workflow works without AI. Provider credential storage is intentionally unavailable until encrypted credential handling and request-context review are enabled end to end.</p><div className="provider-support-list">{supportedProviders.map((provider) => <div className="provider-row" key={provider}><div className="provider-icon">{provider.slice(0, 2).toUpperCase()}</div><div className="provider-copy"><div className="provider-name">{provider}</div><div className="provider-state">Supported architecture · not connected</div></div></div>)}</div></section><section className="form-section"><h2>Data transparency</h2><p>Roleway will never send job descriptions, profile evidence, notes, or documents to an external model until you connect a provider and approve the displayed context.</p></section></main></div></div>;
}
