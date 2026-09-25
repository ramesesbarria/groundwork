// Rough estimate: about 4 characters per token. Real tokenizers differ by model,
// so treat this as a budget guide, not an exact count.
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
