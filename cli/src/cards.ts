// Reading cards from .groundwork/cards/.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "./frontmatter.js";

export interface Card {
  id: string;
  title: string;
  status: string;
  dependsOn: string[];
}

// Compare card IDs as numbers, part by part, so 1.2 comes before 1.10.
export function compareCardIds(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function parseCard(md: string): Card | undefined {
  const fm = parseFrontmatter(md);
  if (!fm.id) return undefined;
  const deps = (fm.depends_on ?? "").replace(/[[\]]/g, "");
  return {
    id: fm.id,
    title: fm.title ?? "",
    status: fm.status ?? "",
    dependsOn: deps.split(",").map((d) => d.trim()).filter(Boolean),
  };
}

export function readCards(groundworkDir: string): Card[] {
  const dir = join(groundworkDir, "cards");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => parseCard(readFileSync(join(dir, name), "utf8")))
    .filter((card): card is Card => card !== undefined)
    .sort((a, b) => compareCardIds(a.id, b.id));
}

const isDone = (cards: Card[], id: string) => cards.find((c) => c.id === id)?.status === "done";

// The card gw-next would pick: lowest ID, status todo or rejected, all dependencies done.
export const nextReady = (cards: Card[]) =>
  cards.find((c) => (c.status === "todo" || c.status === "rejected") && c.dependsOn.every((d) => isDone(cards, d)));

// Waiting cards with at least one dependency that isn't done, and which ones.
export const blocked = (cards: Card[]) =>
  cards
    .filter((c) => c.status === "todo" || c.status === "rejected")
    .map((c) => ({ card: c, waitingOn: c.dependsOn.filter((d) => !isDone(cards, d)) }))
    .filter((b) => b.waitingOn.length > 0);
