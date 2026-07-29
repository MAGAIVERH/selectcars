import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { env } from "../env";
import type { ComputedInsight } from "../repositories/insights";

/**
 * The sentence over the numbers.
 *
 * Everything a dealer needs is already computed by `repositories/insights.ts`: the median,
 * the sample size, the percentage, the day counts, and a headline built from them. This
 * module adds one optional thing on top: a sentence that reads like a person wrote it.
 *
 * Three rules make that safe to ship:
 *
 * 1. **It is off unless configured.** No `ENABLE_AI_INSIGHTS`, no key, no model call. The
 *    feature still works: `narrative` stays null and the dashboard shows the headline and
 *    the evidence. A demo must never depend on someone's API key.
 * 2. **It never runs inside a request.** This is called from the worker, off the queue.
 * 3. **It cannot invent a number.** The model is given the facts and told to write from
 *    them. It writes prose, it does not compute: the arithmetic already happened in SQL.
 *
 * Any failure here is swallowed and logged. A model that is slow, rate limited, or having a
 * bad day must not fail a run whose real output (the numbers) is already correct.
 */

/** Cheap and short: this is one sentence per car, not an essay. */
const MAX_TOKENS = 4000;
/** Above this, split into several calls rather than sending one enormous prompt. */
const BATCH_SIZE = 20;

const SYSTEM_PROMPT = [
  "You write one-sentence notes for used-car dealership managers in the United States.",
  "",
  "You are given facts that were already computed from the dealership's own data. Write from",
  "those facts only. Never invent a number, a trend, or a cause that is not in the input, and",
  "never restate a number the headline already gives unless it adds meaning.",
  "",
  "Each note says what the manager should do about the car, in plain language, as a colleague",
  "would say it across a desk. At most 25 words. No greeting, no preamble, no hedging.",
  "",
  "Write US English. Use dollars, miles, and US date format. Never use an em dash: use a",
  "colon, a comma, or a period instead.",
].join("\n");

/** What we ask back: one sentence per insight, addressed by its position in the batch. */
const narrativeResponseSchema = z.object({
  notes: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      sentence: z.string().min(1),
    }),
  ),
});

/**
 * The same shape as a JSON Schema, for `output_config.format`.
 *
 * Structured outputs constrain what the model may emit, so the reply parses on the first
 * try instead of being coaxed with "respond with only JSON". The Zod schema above still
 * validates it: a contract enforced at both ends is the project's default posture.
 */
const NARRATIVE_JSON_SCHEMA = {
  type: "object",
  properties: {
    notes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          index: { type: "integer" },
          sentence: { type: "string" },
        },
        required: ["index", "sentence"],
        additionalProperties: false,
      },
    },
  },
  required: ["notes"],
  additionalProperties: false,
} as const;

export function isNarrativeEnabled(): boolean {
  return env.ENABLE_AI_INSIGHTS && Boolean(env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;

function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

/** One line of input: what the model is allowed to know about this car. */
function describe(insight: ComputedInsight, index: number): string {
  const facts = Object.entries(insight.facts)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
  return `${index}. [${insight.kind}] ${insight.headline}. Facts: ${facts}`;
}

/**
 * Write a sentence for each insight, in order.
 *
 * The returned array lines up with the input: `undefined` at a position means "no sentence
 * for this one", which is a normal outcome, not an error. The caller writes whatever came
 * back and leaves the rest null.
 */
export async function writeNarratives(
  insights: ComputedInsight[],
  log: { info: (msg: string) => void; warn: (msg: string) => void },
): Promise<(string | undefined)[]> {
  const out: (string | undefined)[] = new Array(insights.length).fill(undefined);
  if (!isNarrativeEnabled() || insights.length === 0) return out;

  for (let start = 0; start < insights.length; start += BATCH_SIZE) {
    const batch = insights.slice(start, start + BATCH_SIZE);
    try {
      const written = await writeBatch(batch);
      for (const [offset, sentence] of written) out[start + offset] = sentence;
      log.info(`narrative: wrote ${written.size}/${batch.length} sentences`);
    } catch (error) {
      // Deliberately not rethrown: the run's numbers are already correct, and a failed
      // sentence is a missing nicety, not a failed job. Retrying the whole run over this
      // would recompute correct data to chase optional prose.
      log.warn(`narrative: batch failed, leaving these insights without a sentence: ${error}`);
    }
  }

  return out;
}

async function writeBatch(batch: ComputedInsight[]): Promise<Map<number, string>> {
  const response = await anthropic().beta.messages.create({
    model: "claude-opus-5",
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    // Low effort on purpose: rewriting given facts into a sentence is not a reasoning
    // problem, and effort is what this costs in time and money.
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: NARRATIVE_JSON_SCHEMA },
    },
    // Safety classifiers can decline a request. Routing the retry server-side means one
    // round trip and no fallback model list of ours to maintain.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages: [
      {
        role: "user",
        content: [
          "Write one note for each numbered listing below.",
          "Return every index you were given.",
          "",
          ...batch.map((insight, index) => describe(insight, index)),
        ].join("\n"),
      },
    ],
  });

  // Check the stop reason before reading content: a refusal returns HTTP 200 with an empty
  // or partial body, so indexing into `content` first would read a hole.
  if (response.stop_reason === "refusal") {
    throw new Error(`model declined (${response.stop_details?.category ?? "unspecified"})`);
  }

  const text = response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  const parsed = narrativeResponseSchema.parse(JSON.parse(text));

  const written = new Map<number, string>();
  for (const note of parsed.notes) {
    // Trust nothing about the index: a note addressed to a car that was not in this batch
    // is dropped rather than written onto whatever happens to sit at that position.
    if (note.index < batch.length) written.set(note.index, note.sentence.trim());
  }
  return written;
}
