import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import type { Config } from '../../config';

export type LlmResult<T> = { ok: true; data: T; usage: { inputTokens: number; outputTokens: number } } | { ok: false; error: string };

/**
 * The only door to an AI provider. Callers pass a zod schema and get back validated data or a failure —
 * never free text they would have to trust. Swap the implementation (or inject a fake in tests) without touching callers.
 */
export interface LlmClient {
  model: string;
  parse<T>(args: { system: string; user: string; schema: z.ZodType<T>; maxTokens?: number }): Promise<LlmResult<T>>;
  /** Cheap round-trip used by the admin "test connection" button. */
  ping(): Promise<void>;
}

export function createAnthropicLlm(config: Config): LlmClient | null {
  if (!config.ai.enabled) return null;
  // Reads ANTHROPIC_API_KEY from the server environment. The key never leaves the server.
  const client = new Anthropic({ timeout: config.ai.timeoutMs, maxRetries: 1 });
  const model = config.ai.model;
  // Models in the 5-series accept `effort`; keep it low for short, latency-sensitive customer answers.
  const supportsEffort = /^claude-(opus|sonnet|fable|haiku)-5/.test(model);

  return {
    model,
    async parse<T>({ system, user, schema, maxTokens = 8000 }: { system: string; user: string; schema: z.ZodType<T>; maxTokens?: number }): Promise<LlmResult<T>> {
      try {
        const res = await client.messages.parse({
          model,
          max_tokens: maxTokens, // adaptive thinking tokens count toward this
          // The system prompt (menu + rules) is identical across requests, so it is cached.
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: user }],
          output_config: { ...(supportsEffort ? { effort: 'low' as const } : {}), format: zodOutputFormat(schema) },
        });
        if (res.stop_reason === 'refusal') return { ok: false, error: 'The AI model declined to answer.' };
        if (res.stop_reason === 'max_tokens') return { ok: false, error: 'The AI answer was cut off.' };
        if (!res.parsed_output) return { ok: false, error: 'The AI answer did not match the expected format.' };
        return { ok: true, data: res.parsed_output as T, usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens } };
      } catch (e) {
        if (e instanceof Anthropic.RateLimitError) return { ok: false, error: 'The AI service is busy. Try again shortly.' };
        if (e instanceof Anthropic.AuthenticationError) return { ok: false, error: 'The AI API key was rejected.' };
        if (e instanceof Anthropic.APIConnectionError) return { ok: false, error: 'Could not reach the AI service.' };
        if (e instanceof Anthropic.APIError) return { ok: false, error: `The AI service returned an error (${e.status}).` };
        return { ok: false, error: e instanceof Error ? e.message : 'Unknown AI error' };
      }
    },
    async ping() {
      const res = await client.messages.create({ model, max_tokens: 64, messages: [{ role: 'user', content: 'Reply with the single word: ok' }] });
      if (res.stop_reason === 'refusal') throw new Error('The AI model declined the test request.');
    },
  };
}
