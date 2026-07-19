import type { KnowledgeBaseEntry } from "./types.js";

export function buildSystemPrompt(params: {
  personaName: string;
  systemPrompt: string;
  relevantKnowledge: KnowledgeBaseEntry[];
}): string {
  const { personaName, systemPrompt, relevantKnowledge } = params;

  const sections = [`You are ${personaName}.`, systemPrompt];

  if (relevantKnowledge.length > 0) {
    const knowledgeBlock = relevantKnowledge
      .map((entry) => (entry.title ? `## ${entry.title}\n${entry.content}` : entry.content))
      .join("\n\n");
    sections.push(`Relevant knowledge base entries:\n\n${knowledgeBlock}`);
  }

  sections.push(
    "Reply as this business's customer support agent over WhatsApp. Keep replies concise and conversational.",
  );

  return sections.join("\n\n");
}
