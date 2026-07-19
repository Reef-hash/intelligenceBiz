import type { KnowledgeBaseEntry } from "./types.js";

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length > 2),
  );
}

/**
 * Naive keyword-overlap retriever: scores each knowledge base entry by how
 * many query tokens it contains and returns the top matches. No embeddings
 * or vector store — MVP knowledge bases are small enough that a keyword
 * match keeps the reply prompt relevant without new infrastructure.
 */
export function retrieveRelevantEntries(
  entries: KnowledgeBaseEntry[],
  query: string,
  limit = 3,
): KnowledgeBaseEntry[] {
  const queryTokens = tokenize(query);
  if (queryTokens.size === 0 || entries.length === 0) {
    return entries.slice(0, limit);
  }

  const scored = entries.map((entry) => {
    const entryTokens = tokenize(`${entry.title ?? ""} ${entry.content}`);
    let score = 0;
    for (const token of queryTokens) {
      if (entryTokens.has(token)) score += 1;
    }
    return { entry, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter((s) => s.score > 0)
    .map((s) => s.entry);
}
