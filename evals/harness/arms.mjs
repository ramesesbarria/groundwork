// The two arms' starting workspaces. Both get the same code, docs, requirements and decisions; they
// differ only in how the agent is set up:
//   baseline    a competent ordinary AGENTS.md: commands, conventions, where requirements and
//               decisions live, and "record new decisions in docs/decisions.md"
//   groundwork  Groundwork from the packed build under evaluation, set up as gw-setup would leave it
//               (AGENTS.md, SPEC.md, decision records, config, HANDOFF), committed as setup
import { execFileSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const EVALS = fileURLToPath(new URL("..", import.meta.url));
const TODAY = "2026-10-19";

export const git = (cwd, ...args) =>
  execFileSync("git", ["-c", "user.name=Dev", "-c", "user.email=dev@example.com", ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

const BASELINE_AGENTS = `# Ledger

A small Node.js library and command-line tool for tracking personal expenses.

## Commands
- Test: \`node --test\`
- Run: \`node src/cli.js\`

## Conventions
- Requirements are in \`docs/requirements.md\`; project decisions are in \`docs/decisions.md\`. Read them
  before changing behavior, and record any new project decision in \`docs/decisions.md\`.
- Add tests for new behavior and run the full test suite before you finish.
- Commit finished work with a clear message.
`;

const DECISIONS = [
  ["0001-integer-cents", "Money is integer cents", "Amounts are stored and computed as whole cents (`1234` means 12.34). Never use floating-point arithmetic on money. Parse with `parseAmount`, show with `formatAmount`."],
  ["0002-no-runtime-dependencies", "No runtime dependencies", "Only Node.js built-ins. Tests use `node --test`."],
  ["0003-iso-dates", "Dates are ISO strings", "Entry dates are `YYYY-MM-DD` strings and are compared as strings."],
  ["0004-pure-functions", "Pure functions, no shared state", "Functions take a ledger and return new values. No module-level mutable state (no global registries or caches); pass configuration in as arguments."],
];

const decisionRecord = (id, title, decision) =>
  `---\nid: ${id}\ntitle: ${title}\nstatus: accepted\ndate: ${TODAY}\n---\n## Context\nAn existing convention of this project, recorded at setup.\n\n## Options\nKept as found in the codebase.\n\n## Decision\n${decision}\n\n## Consequences\nNew work follows it unless the human changes the decision.\n`;

// Copies the fixture and the task's setup overlay, and makes the starting commit(s).
export function baseRepo(dir, task) {
  cpSync(join(EVALS, "fixture"), dir, { recursive: true });
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "core.autocrlf", "false");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "Initial ledger");
  const setup = join(task.dir, "setup");
  if (existsSync(setup) || task.setup?.appendRequirements) {
    if (existsSync(setup)) cpSync(setup, dir, { recursive: true });
    if (task.setup?.appendRequirements) appendFileSync(join(dir, "docs/requirements.md"), task.setup.appendRequirements);
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", task.setup?.commit ?? "Update");
  }
}

export function setupBaseline(dir) {
  writeFileSync(join(dir, "AGENTS.md"), BASELINE_AGENTS);
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "Add agent instructions");
}

export function setupGroundwork(dir, tgz, { integration = "local" } = {}) {
  execFileSync("npm", ["install", "--save-dev", "--no-audit", "--no-fund", tgz], { cwd: dir, stdio: "ignore", shell: process.platform === "win32" });
  execFileSync(process.execPath, [join(dir, "node_modules/groundwork-ai/dist/bin.js"), "init", "--adapter", "opencode"], { cwd: dir, stdio: "ignore", input: "" });
  const fill = (path, values) => {
    let text = readFileSync(join(dir, path), "utf8");
    for (const [key, value] of Object.entries(values)) text = text.split(`{{${key}}}`).join(value);
    writeFileSync(join(dir, path), text);
  };
  fill("AGENTS.md", {
    project_name: "Ledger",
    project_summary: "A small Node.js library and command-line tool for tracking personal expenses. Requirements are also in `docs/requirements.md`.",
    install_command: "npm install",
    test_command: "node --test",
    lint_command: "none",
    build_command: "none",
    run_command: "node src/cli.js",
  });
  const requirements = readFileSync(join(dir, "docs/requirements.md"), "utf8").replace(/^# .*\n/, "");
  writeFileSync(
    join(dir, ".groundwork/SPEC.md"),
    `# Ledger: Spec\n\nStatus: confirmed · Last updated: ${TODAY}\n\n## Problem\nTrack personal expenses from the command line and as a library.\n\n## Features\n${requirements}\n\n## Constraints\nSee the decision records in \`.groundwork/decisions/\`.\n\n## Codebase map\n- \`src/ledger.js\` entries, totals, balance (found)\n- \`src/money.js\` parse/format cents (found)\n- \`src/report.js\` text report (found)\n- \`src/store.js\` JSON file (found)\n- \`src/cli.js\` commands (found)\n- \`test/\` node --test (found)\n\n## Changes\n`,
  );
  mkdirSync(join(dir, ".groundwork/decisions"), { recursive: true });
  for (const [file, title, decision] of DECISIONS) {
    writeFileSync(join(dir, `.groundwork/decisions/${file}.md`), decisionRecord(file.slice(0, 4), title, decision));
  }
  const configPath = join(dir, ".groundwork/config.json");
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  Object.assign(config, { setup: "done", experience: "experienced", approvalMode: "per-card", integration });
  config.commands = { install: "npm install", test: "node --test", lint: "", build: "", run: "node src/cli.js" };
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  writeFileSync(
    join(dir, ".groundwork/HANDOFF.md"),
    `# Handoff\n\n- **Phase:** none yet\n- **Current card:** none\n- **Status:** setup done; spec confirmed (describes the app today)\n- **Last step:** Groundwork set up for the existing codebase\n- **Next step:** wait for the human's next request\n- **Failing checks:** none\n- **Notes:** existing conventions are recorded as decisions 0001-0004\n`,
  );
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "[setup] Set up Groundwork");
}

export const TEAM = JSON.parse(readFileSync(join(EVALS, "tasks/_team/team.json"), "utf8"));

// Team projects start with decision D5 and the planned tasks on main, in each arm's own form.
export function addTeamPlan(dir, arm) {
  const d = TEAM.decision;
  if (arm === "groundwork") {
    writeFileSync(join(dir, `.groundwork/decisions/${d.groundworkFile}`), decisionRecord("0005", d.title, d.before));
    for (const [id, t] of Object.entries(TEAM.tasks)) {
      const relies = t.relies.replace("decision D5", "decision 0005").replace("decision D1", "decision 0001");
      writeFileSync(
        join(dir, `.groundwork/cards/${id}-${t.slug}.md`),
        `---\nid: ${id}\ntitle: ${t.title}\nphase: 1\nstatus: todo\ndepends_on: []\n---\n## Goal\n${t.body}\n\n## Acceptance criteria\n${t.criteria.map((c) => `- [ ] ${c.replace("decision D5", "decision 0005")}`).join("\n")}\n\n## Affects\nRelies on ${relies}.\n\n## Evidence\n\n## History\n- ${TODAY} planned on main\n`,
      );
    }
  } else {
    appendFileSync(join(dir, "docs/decisions.md"), `\n## ${d.id}. ${d.title}\n${d.before}\n`);
    mkdirSync(join(dir, "docs/tasks"), { recursive: true });
    for (const [id, t] of Object.entries(TEAM.tasks)) {
      writeFileSync(
        join(dir, `docs/tasks/${id}-${t.slug}.md`),
        `# Task ${id}: ${t.title}\n\n${t.body}\n\n## Done when\n${t.criteria.map((c) => `- ${c}`).join("\n")}\n\nRelies on ${t.relies}.\n`,
      );
    }
  }
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", arm === "groundwork" ? "[plan] Plan tasks 1.1 and 1.2" : "Plan tasks 1.1 and 1.2");
  if (arm === "groundwork") {
    // Dependencies are recorded at planning time, as the team guide says.
    execFileSync(process.execPath, [join(dir, "node_modules/groundwork-ai/dist/bin.js"), "reassess", "1.1", "--target", "main", "--dep", "decision:0005"], { cwd: dir, stdio: "ignore" });
    execFileSync(process.execPath, [join(dir, "node_modules/groundwork-ai/dist/bin.js"), "reassess", "1.2", "--target", "main", "--dep", "decision:0001"], { cwd: dir, stdio: "ignore" });
    git(dir, "add", "-A");
    git(dir, "commit", "-qm", "[plan] Record task context");
  }
}

// The teammate's upstream change: code and test overlays, plus the decision record when D5 changes.
export function applyUpstream(dir, arm, change) {
  cpSync(join(EVALS, "tasks/_team", change), dir, { recursive: true });
  if (change === "decision-change") {
    const d = TEAM.decision;
    if (arm === "groundwork") {
      const path = join(dir, `.groundwork/decisions/${d.groundworkFile}`);
      writeFileSync(path, readFileSync(path, "utf8").replace(d.before, d.after));
    } else {
      const path = join(dir, "docs/decisions.md");
      writeFileSync(path, readFileSync(path, "utf8").replace(d.before, d.after));
    }
  }
  if (change === "unrelated-change") appendFileSync(join(dir, "docs/requirements.md"), "\n- `src/dates.js`: small date helpers.\n");
  git(dir, "add", "-A");
  const message = change === "decision-change" ? "Decision D5: transfers are not spending" : "Add date helpers";
  git(dir, "commit", "-qm", arm === "groundwork" ? `[plan] ${message}` : message);
}

export const branchFor = (arm, id) => (arm === "groundwork" ? `gw/${id}` : `task/${id}`);
export const taskRefFor = (arm, id) => {
  const t = TEAM.tasks[id];
  return arm === "groundwork" ? `card .groundwork/cards/${id}-${t.slug}.md` : `docs/tasks/${id}-${t.slug}.md`;
};
export const checksFor = (arm) => (arm === "groundwork" ? "`node --test` and `npx groundwork-ai check --base origin/main`" : "`node --test`");
