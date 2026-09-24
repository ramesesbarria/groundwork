// Rough estimate: about 4 characters per token. Real tokenizers differ by model
// (SPEC §15.1), so treat this as a budget guide, not an exact count.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
