// The flow's lines in the project brief: which card is in progress, and the commands that drive it.
// The brief (.groundwork/lib/brief.mjs) loads this file only when the flow is installed and on.

const LABELS = {
  todo: "to do",
  testing: "being tested",
  implementing: "being built",
  built: "built but not reviewed",
  review: "in review",
  "awaiting-approval": "waiting for you",
  done: "done",
  rejected: "sent back",
};

// Keeps the lines short, however long a HANDOFF field is.
const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

// `handoff` is the parsed handoff. The card and its status are the "- **Current card:**" and
// "- **Status:**" bullets, under "## Flow" or (in a handoff from before 2.0) at the top.
export function flowBrief(_project, handoff) {
  const card = String(handoff.fields["Current card"] ?? "").trim();
  const status = String(handoff.fields["Status"] ?? "").trim();
  const noCard = card === "" || card === "—" || /^none\b/i.test(card);
  const state = LABELS[status] ?? (status === "" || status === "—" ? "" : clip(status, 30));
  return {
    lines: [noCard ? "Groundwork: no card in progress." : `Groundwork: card ${clip(card, 60)}${state ? ` is ${state}` : ""}.`],
    foot:
      "Type /gw to continue (the only other commands: /gw-approve, /gw-reject). Memory lives in .groundwork/ (how it works: " +
      '.groundwork/memory.md). Before you stop or run low on context, save: npx groundwork-ai checkpoint --now "<what is in progress>" --next "<the very next step>"',
    json: { card: noCard ? null : card, status: noCard ? null : status },
  };
}
