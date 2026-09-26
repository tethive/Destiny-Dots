import "server-only";
import { env, features } from "@/lib/env";
import { trackUsage } from "@/server/usage";

/**
 * Small wrapper around the Gemini REST API, used by the interview simulator.
 *
 * Everything here fails soft: without a key, or when Google is slow, busy or
 * over quota, the caller gets null and falls back to the curated question bank
 * and rule-based scoring, so an interview never breaks mid-session.
 */

const API = "https://generativelanguage.googleapis.com/v1beta";
const TIMEOUT_MS = 30_000;

/**
 * Tried in order. Google retires models for new keys and returns 503 when one
 * is busy, so the first that answers wins and is remembered for a short while.
 */
const MODEL_CANDIDATES = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-flash-lite-latest"];
const MODEL_CACHE_MS = 10 * 60 * 1000;

export const aiEnabled = features.ai;

let cachedModel: { name: string; until: number } | null = null;

type AskOptions = {
  /** Instructions that describe the role, kept out of the user turn. */
  system: string;
  /** Gemini responseSchema — forces valid JSON back. */
  schema: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
};

function candidates() {
  const preferred = env.GEMINI_MODEL ? [env.GEMINI_MODEL] : MODEL_CANDIDATES;
  const cached = cachedModel && cachedModel.until > Date.now() ? cachedModel.name : null;
  return cached ? [cached, ...preferred.filter((m) => m !== cached)] : preferred;
}

async function generate(model: string, prompt: string, options: AskOptions) {
  return fetch(`${API}/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: options.system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: options.schema,
        temperature: options.temperature ?? 0.4,
        maxOutputTokens: options.maxOutputTokens ?? 900,
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

/**
 * Asks Gemini for structured JSON. Returns null (never throws) when AI is off,
 * unavailable or replies with something unusable.
 */
export async function askJson<T>(prompt: string, options: AskOptions): Promise<{ data: T; model: string } | null> {
  if (!aiEnabled) return null;

  const queue = candidates();
  const tried = new Set<string>();
  let lastProblem = "no model answered";

  while (queue.length) {
    const model = queue.shift()!;
    if (tried.has(model)) continue;
    tried.add(model);

    let res: Response;
    try {
      res = await generate(model, prompt, options);
    } catch (e) {
      lastProblem = e instanceof Error ? e.message : String(e);
      continue;
    }

    if (res.ok) {
      try {
        const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
        if (!text.trim()) {
          lastProblem = `${model} returned an empty reply`;
          continue;
        }
        cachedModel = { name: model, until: Date.now() + MODEL_CACHE_MS };
        await trackUsage("gemini", "calls");
        return { data: JSON.parse(text) as T, model };
      } catch (e) {
        lastProblem = `${model} sent unreadable JSON: ${e instanceof Error ? e.message : e}`;
        continue;
      }
    }

    const detail = (await res.text()).slice(0, 400);
    lastProblem = `${model} → ${res.status} ${detail}`;
    // "…no longer available to new users. Please update your code to use models/X"
    const suggested = detail.match(/use\s+models\/([A-Za-z0-9._-]+)/)?.[1];
    if (suggested && !tried.has(suggested)) queue.unshift(suggested);
    // 429 is a quota wall on the whole key, so trying other models is pointless.
    if (res.status === 429) {
      await trackUsage("gemini", "rate_limited");
      console.warn("[ai] rate limited:", detail);
      return null;
    }
  }

  await trackUsage("gemini", "failed");
  console.error("[ai] no usable model:", lastProblem);
  return null;
}
