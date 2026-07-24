import {
  documentPlanSchema,
  type DocumentPlan,
  type AppResult,
  type AgentTurnInput,
} from "@/contracts";
import type { GoogleAIClient } from "@/google-ai";
import { generateStructuredOutput } from "@/google-ai";
import { buildTurnContext } from "./context-builder";
import type { DocumentPort } from "@/contracts";

export async function planDocument(
  client: GoogleAIClient,
  input: AgentTurnInput,
  documentPort: DocumentPort,
): Promise<AppResult<DocumentPlan>> {
  const turnContext = buildTurnContext(input, documentPort);

  const prompt = `${turnContext.userPrompt}

Please create a high-level document plan for this document request.
Output MUST be a JSON object matching this schema:
{
  "summary": "string describing overall outline strategy",
  "sections": [
    {
      "heading": "string",
      "purpose": "string",
      "estimatedParagraphs": number,
      "includeTable": boolean,
      "includeList": boolean
    }
  ]
}`;

  return generateStructuredOutput(
    client,
    {
      prompt,
      systemPrompt: turnContext.systemPrompt,
      images: turnContext.activeImages,
      signal: input.signal,
    },
    documentPlanSchema,
  );
}
