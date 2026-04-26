import Anthropic from "@anthropic-ai/sdk";
import { SCORING_SYSTEM_PROMPT } from "./prompt";
import {
  ScoreCard,
  type ScoreCard as TScoreCard,
  type ScoreInput,
} from "./schema";
import { fallbackScore } from "./fallback";

const SCORING_TOOL = {
  name: "submit_score_card",
  description: "Submit the final risk score card. Call exactly once.",
  input_schema: {
    type: "object" as const,
    required: [
      "score",
      "tier",
      "predicted_days_to_pay",
      "reasoning",
      "headline",
      "action",
    ],
    properties: {
      score: { type: "integer", minimum: 0, maximum: 100 },
      tier: { type: "string", enum: ["low", "medium", "high", "critical"] },
      predicted_days_to_pay: { type: "integer", minimum: 1, maximum: 365 },
      reasoning: {
        type: "array",
        minItems: 2,
        maxItems: 6,
        items: {
          type: "object",
          required: ["signal", "weight", "evidence"],
          properties: {
            signal: { type: "string" },
            weight: { type: "integer", minimum: 1, maximum: 10 },
            evidence: { type: "string" },
          },
        },
      },
      headline: { type: "string", maxLength: 140 },
      action: {
        type: "object",
        required: [
          "deposit_pct",
          "terms_days",
          "chase_from_day",
          "escalation_at_day",
          "rationale",
        ],
        properties: {
          deposit_pct: { type: "integer", minimum: 0, maximum: 100 },
          terms_days: { type: "integer", enum: [7, 14, 21, 30, 60] },
          chase_from_day: { type: "integer", minimum: 1 },
          escalation_at_day: { type: "integer", minimum: 1 },
          rationale: { type: "string", maxLength: 280 },
        },
      },
    },
  },
};

export type ScoringResult = {
  card: TScoreCard;
  model_used: string;
  used_fallback: boolean;
  latency_ms: number;
};

export async function scoreCompany(input: ScoreInput): Promise<ScoringResult> {
  const start = Date.now();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL_SCORING ?? "claude-sonnet-4-6";

  if (!apiKey) {
    const card = fallbackScore(input);
    return {
      card,
      model_used: "fallback-heuristic",
      used_fallback: true,
      latency_ms: Date.now() - start,
    };
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create(
      {
        model,
        max_tokens: 1500,
        temperature: 0.2,
        system: SCORING_SYSTEM_PROMPT,
        tools: [SCORING_TOOL],
        tool_choice: { type: "tool", name: "submit_score_card" },
        messages: [
          {
            role: "user",
            content: `Here is the company dossier. Call submit_score_card.\n\n${JSON.stringify(
              input,
              null,
              2,
            )}`,
          },
        ],
      },
      { timeout: 10_000 },
    );

    const toolBlock = response.content.find(
      (block) =>
        block.type === "tool_use" && block.name === "submit_score_card",
    );

    if (!toolBlock || toolBlock.type !== "tool_use") {
      throw new Error("No tool call returned by scoring agent");
    }

    const parsed = ScoreCard.safeParse(toolBlock.input);
    if (!parsed.success) {
      console.warn(
        "Scoring agent returned malformed ScoreCard",
        parsed.error.flatten(),
      );
      throw new Error("Schema validation failed for ScoreCard");
    }

    return {
      card: parsed.data,
      model_used: model,
      used_fallback: false,
      latency_ms: Date.now() - start,
    };
  } catch (err) {
    console.error("Scoring agent failure, using fallback heuristic", err);
    const card = fallbackScore(input);
    return {
      card,
      model_used: `${model}-fallback`,
      used_fallback: true,
      latency_ms: Date.now() - start,
    };
  }
}
