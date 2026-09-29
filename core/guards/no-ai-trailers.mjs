// Guard: block commits whose message adds AI attribution.
// On in new installs. Remove "no-ai-trailers" from "guards" in .groundwork/config.json to switch it off.
//
// It reads the command text after `git ... commit`, and a message file passed with -F/--file when
// that file is on disk. A message built up by the shell in other ways isn't seen.

import { existsSync, readFileSync } from "node:fs";

// Matched against a trailer's name only, so a human co-author's email domain doesn't count.
const AI_NAMES = /(claude|anthropic|copilot|chatgpt|openai|gpt-\d|gemini|cursor|codeium|windsurf|devin|deepseek)/i;

const TRAILER = /co-authored-by:\s*([^<\n]*)/gi;
const GENERATED = /generated (with|by)[^\n]*(claude|chatgpt|copilot|cursor|gemini|\bai\b)/i;
const COMMIT = /\bgit\b(?:\s+-[^\s]+(?:\s+[^\s-][^\s]*)?)*\s+commit\b/;

export const name = "no-ai-trailers";

// A message file named with -F/--file, if it's on disk. `-F -` is the command's own stdin (a heredoc).
function messageFile(commit) {
  const match = commit.match(/(?:^|\s)(?:-F|--file)(?:\s+|=)(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))/);
  const path = match && (match[1] ?? match[2] ?? match[3]);
  if (!path || path === "-" || !existsSync(path)) return "";
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

export function check(action) {
  if (action.kind !== "command") return { block: false };
  const at = action.command.search(COMMIT);
  if (at === -1) return { block: false };

  const commit = action.command.slice(at);
  const text = `${commit}\n${messageFile(commit)}`;
  const aiTrailer = [...text.matchAll(TRAILER)].some((m) => AI_NAMES.test(m[1]));
  if (aiTrailer || GENERATED.test(text)) {
    return {
      block: true,
      reason:
        "This commit message adds AI attribution (a Co-Authored-By trailer or a 'Generated with' line), " +
        "which this project doesn't allow. Remove it and commit again.",
    };
  }
  return { block: false };
}
