import type { ResponseFormat, ResponseObject } from "@compose-market/sdk";
import { sdk } from "@/lib/sdk";
import { uid } from "@/schema";
import { toDated, toPair, toRank } from "@/lib/utils";
import type { AgentPayload, Component, Slice } from "@/types";

export interface AgentResult {
  data: Record<string, unknown>;
  model: string;
  usage: { input_tokens: number; output_tokens: number; total_tokens: number } | null;
}

export class SessionInvalidError extends Error {
  reason: string;
  constructor(reason: string) {
    super(`Session invalid: ${reason}`);
    this.reason = reason;
  }
}

function extractText(response: ResponseObject): string {
  const parts: string[] = [];
  for (const item of response.output ?? []) {
    if (typeof item.text === "string" && item.text) parts.push(item.text);
    if (Array.isArray(item.content)) {
      for (const piece of item.content) {
        const text = (piece as Record<string, unknown>).text;
        if (typeof text === "string" && text) parts.push(text);
      }
    }
  }
  return parts.join("\n");
}

export function extractJson(text: string): Record<string, unknown> {
  const attempts: string[] = [text.trim()];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) attempts.push(fenced[1].trim());
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) attempts.push(text.slice(start, end + 1));
  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // try the next candidate
    }
  }
  throw new Error("The model did not return valid JSON");
}

function coerceBars(value: unknown): Slice[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const entry = (row ?? {}) as Record<string, unknown>;
      const name = typeof entry.name === "string" ? entry.name.trim() : "";
      const num = typeof entry.value === "number" ? entry.value : Number(entry.value);
      return { name, value: Number.isFinite(num) ? Math.max(0, Math.min(100, num)) : 0 };
    })
    .filter((slice) => slice.name.length > 0);
}

function coerceMembers(value: unknown): Array<{ id: string; name: string; role: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const entry = (row ?? {}) as Record<string, unknown>;
      return {
        id: typeof entry.id === "string" && entry.id ? entry.id : uid(),
        name: typeof entry.name === "string" ? entry.name.trim() : "",
        role: typeof entry.role === "string" ? entry.role : "",
      };
    })
    .filter((member) => member.name.length > 0);
}

function coerceStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

// Merges the model output into the current block data field-by-field, keeping
// the current value whenever the model output is missing or empty.
export function coerceData(
  parsed: Record<string, unknown>,
  current: Record<string, unknown>,
  component: Component,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...current };
  for (const field of component.fields) {
    const value = parsed[field.name];
    if (value === undefined) continue;
    switch (field.kind) {
      case "text": {
        if (typeof value === "string" && value.trim()) next[field.name] = value;
        break;
      }
      case "number": {
        const num = typeof value === "number" ? value : Number(value);
        if (Number.isFinite(num)) next[field.name] = num;
        break;
      }
      case "select": {
        if (typeof value === "string" && value.trim()) next[field.name] = value;
        break;
      }
      case "bars": {
        const bars = coerceBars(value);
        if (bars.length > 0) next[field.name] = bars;
        break;
      }
      case "roles": {
        const members = coerceMembers(value);
        if (members.length > 0) next[field.name] = members;
        break;
      }
      case "tags":
      case "list": {
        const list = coerceStrings(value);
        if (list.length > 0) next[field.name] = list;
        break;
      }
      case "pairs": {
        if (Array.isArray(value) && value.length > 0) next[field.name] = value.map(toPair);
        break;
      }
      case "ranked": {
        if (Array.isArray(value) && value.length > 0) next[field.name] = value.map(toRank);
        break;
      }
      case "dated": {
        if (Array.isArray(value) && value.length > 0) next[field.name] = value.map(toDated);
        break;
      }
      default: {
        next[field.name] = value;
      }
    }
  }
  return next;
}

// Runs the prepared agent payload through the compose.market SDK. Payment is
// settled on the active session (Compose Key already attached by the session
// provider). The chain is tried first-to-last: same model, next provider.
export async function executeAgent(payload: AgentPayload): Promise<AgentResult> {
  if (payload.chain.length === 0) throw new Error("No models available for this block");
  let lastError: Error | null = null;
  for (const model of payload.chain) {
    try {
      const completion = await sdk.inference.responses.create(
        {
          model,
          input: payload.input,
          instructions: payload.instructions,
          response_format: payload.response_format as ResponseFormat,
          max_output_tokens: payload.max_output_tokens,
          temperature: payload.temperature,
        },
        { timeoutMs: 120_000 },
      );
      if (completion.sessionInvalidReason) throw new SessionInvalidError(completion.sessionInvalidReason);
      const response = completion.data;
      if (response.status === "failed") {
        throw new Error(response.error?.message ?? `${model} failed to respond`);
      }
      const text = extractText(response);
      if (!text.trim()) throw new Error(`${model} returned an empty response`);
      return { data: extractJson(text), model: response.model || model, usage: response.usage ?? null };
    } catch (cause) {
      if (cause instanceof SessionInvalidError) throw cause;
      lastError = cause instanceof Error ? cause : new Error(String(cause));
      console.warn(`[hevai] ${model} failed — trying next provider:`, lastError.message);
    }
  }
  throw lastError ?? new Error("All model providers failed");
}
