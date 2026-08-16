import type { z } from "zod";

export type ModelSlot = "default" | "fast" | "reasoning" | "agent" | "embedding";
export type ProviderKind = "openai" | "anthropic" | "gemini" | "openrouter" | "ollama" | "openai-compatible";

export type ContextManifest = {
  included: readonly { kind: string; label: string; resourceId: string }[];
  excluded: readonly string[];
};

export type GenerationRequest<T extends z.ZodType> = {
  task: string;
  slot: ModelSlot;
  instructions: string;
  context: ContextManifest;
  outputSchema: T;
};

export type GenerationResult<T> = {
  value: T;
  provider: ProviderKind;
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
};

/** Provider seam. Adapters own vendor SDK translation; product modules only use this interface. */
export interface AiProvider {
  readonly kind: ProviderKind;
  generateStructured<T extends z.ZodType>(request: GenerationRequest<T>): Promise<GenerationResult<z.infer<T>>>;
}

export class ProviderRegistry {
  readonly #providers = new Map<ProviderKind, AiProvider>();

  register(provider: AiProvider): void {
    this.#providers.set(provider.kind, provider);
  }

  require(kind: ProviderKind): AiProvider {
    const provider = this.#providers.get(kind);
    if (!provider) throw new Error(`AI provider is not configured: ${kind}`);
    return provider;
  }
}

export function redactCredential(value: string): string {
  if (value.length < 8) return "••••••••";
  return `${value.slice(0, 3)}••••${value.slice(-3)}`;
}
