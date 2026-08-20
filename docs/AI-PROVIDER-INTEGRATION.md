# AI provider integration notes

Roleway treats AI as an optional, user-initiated extension. The implementation uses provider APIs directly, validates every structured result, and never treats a consumer chat subscription as API authorization.

## Provider contracts

- **OpenAI**: server-side API keys use Bearer authentication. Chat Completions supports `response_format.type = json_schema`; OpenAI recommends JSON Schema structured output over the older JSON object mode when supported. [OpenAI API quickstart](https://platform.openai.com/docs/quickstart/make-your-first-api-request) · [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- **Anthropic**: Messages requests use `POST https://api.anthropic.com/v1/messages`, an `x-api-key`, and the `anthropic-version` header. Roleway uses forced tool output with an input schema to obtain a structured result. [Anthropic Messages API](https://docs.anthropic.com/en/api/messages)
- **Google Gemini**: Generate Content accepts an API key in `x-goog-api-key`. Structured JSON output uses `responseMimeType: application/json` and a response schema. [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output?lang=rest) · [Generate Content API](https://ai.google.dev/api/generate-content)
- **OpenRouter**: Chat Completions uses `POST /api/v1/chat/completions`; structured-output support depends on the selected model. Roleway supplies `response_format.json_schema` and validates the result independently. [OpenRouter chat completions](https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request) · [OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs)

## Security decisions

1. API keys are encrypted with AES-256-GCM before storage.
2. The encryption key exists only in the server environment.
3. The browser-facing database role has no policy granting access to the connections table.
4. Every server action authenticates the caller and scopes service-role queries to that user ID.
5. Custom compatible endpoints must be public HTTPS URLs; loopback, link-local, and private-network hosts are blocked to prevent server-side request forgery.
6. Provider responses are parsed and validated against Roleway’s own Zod schema before being saved or displayed.
7. AI outputs remain drafts. A user must explicitly approve a suggestion before it can become an Opportunity’s next action.

## Subscription boundary

ChatGPT, Claude, and Gemini consumer subscriptions are separate from developer API billing and do not supply an API key to Roleway. In the initial release, users bring a provider API key and the provider bills usage directly. This avoids storing a shared platform key, hidden usage markup, or implying that a consumer subscription can be linked when the provider does not support that contract.
