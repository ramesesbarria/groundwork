// Checked before anything else loads, so an old Node gets a plain message instead of a stack trace.
// Keep this file free of imports and of syntax or APIs newer than Node 18.
export const MIN_NODE_MAJOR = 22;

export function checkNode(version: string): string | undefined {
  const major = Number(version.split(".")[0]);
  if (major >= MIN_NODE_MAJOR) return undefined;
  return `Groundwork needs Node ${MIN_NODE_MAJOR} or later. You have ${version}. Install it from nodejs.org`;
}
