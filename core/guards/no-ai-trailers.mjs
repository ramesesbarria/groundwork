// Guard: block commits whose message adds AI attribution.
// On in new installs. Remove "no-ai-trailers" from "guards" in .groundwork/config.json to switch it off.
//
// Limitation: it sees the command text only. A message passed with `git commit -F file.txt`
// (a file on disk) isn't read.

const AI_NAMES = /(claude|anthropic|copilot|chatgpt|openai|gpt-\d|gemini|cursor|codeium|windsurf|devin|deepseek|\bai\b)/i;

const TRAILER = /co-authored-by:[^\n]*/gi;
const GENERATED = /generated (with|by)[^\n]*(claude|chatgpt|copilot|cursor|gemini|\bai\b)/i;

export const name = "no-ai-trailers";

export function check(action) {
  if (action.kind !== "command" || !/\bgit\b[\s\S]*\bcommit\b/.test(action.command)) return { block: false };

  const aiTrailer = (action.command.match(TRAILER) ?? []).find((line) => AI_NAMES.test(line));
  if (aiTrailer || GENERATED.test(action.command)) {
    return {
      block: true,
      reason:
        "This commit message adds AI attribution (a Co-Authored-By trailer or a 'Generated with' line), " +
        "which this project doesn't allow. Remove it and commit again.",
    };
  }
  return { block: false };
}
