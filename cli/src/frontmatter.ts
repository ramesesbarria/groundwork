// Minimal "key: value" frontmatter reader. Groundwork's files only use flat, single-line values.
export function parseFrontmatter(md: string): Record<string, string> {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) fields[m[1]] = m[2];
  }
  return fields;
}

// The text of one "## Heading" section, without the heading line.
export function sectionBody(md: string, heading: string): string {
  const start = md.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const bodyStart = md.indexOf("\n", start) + 1;
  const next = md.indexOf("\n## ", bodyStart);
  return md.slice(bodyStart, next === -1 ? undefined : next).trim();
}
