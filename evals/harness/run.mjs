#!/usr/bin/env node
// Runs paired evaluation scenarios: the same task, agent, model and settings, with and without
// Groundwork, in fresh workspaces outside this repository.
//
//   node evals/harness/run.mjs --tgz <groundwork-ai.tgz> --tag pilot --tasks S01,S04,T01 \
//     [--arms baseline,groundwork] [--runs 1] [--parallel 2] [--model deepseek/deepseek-flash]
//
// Each scenario step is a fresh agent session (a new day, a new person). Inside a step the scripted
// human answers with one symmetric policy, recorded as an intervention:
//   - groundwork arm, a card awaiting approval: "/gw-approve <id>"
//   - the agent ends by asking the human something: the step's scripted reply
// Raw records (turn logs, session exports, scores) go to .groundwork/evidence/evals/<tag>/.
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EVALS, addTeamPlan, applyUpstream, baseRepo, branchFor, checksFor, git, setupBaseline, setupGroundwork, taskRefFor,
} from "./arms.mjs";
import { scoreDir, succeeded } from "./score.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => (arg.startsWith("--") ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []),
);
const MODEL = args.model ?? "deepseek/deepseek-flash";
const ARMS = (args.arms ?? "baseline,groundwork").split(",");
const RUNS = Number(args.runs ?? 1);
const PARALLEL = Number(args.parallel ?? 2);
const TAG = args.tag ?? "pilot";
const TGZ = args.tgz;
const MAX_FOLLOWUPS = 4;
const TURN_TIMEOUT = 30 * 60_000;
const REPO = join(EVALS, "..");
const OUT = join(REPO, ".groundwork/evidence/evals", TAG);
const WORK = args.work ?? join(tmpdir(), "gw-evals", TAG);
const OPENCODE =
  process.env.OPENCODE_BIN ??
  (process.platform === "win32" ? join(process.env.APPDATA, "npm/node_modules/@opencode/cli/bin/opencode.exe") : "opencode");


function loadTask(id) {
  const name = readdirSync(join(EVALS, "tasks")).find((n) => n.startsWith(`${id}-`));
  if (!name) throw new Error(`No task ${id}`);
  const dir = join(EVALS, "tasks", name);
  return { ...JSON.parse(readFileSync(join(dir, "task.json"), "utf8")), dir, name };
}

// One agent turn: a fresh `opencode run`, or a continued session when sessionId is given.
function runTurn(cwd, message, sessionId) {
  const argv = ["run", "--standalone", "--auto", "--format", "json", "-m", MODEL, ...(sessionId ? ["--session", sessionId] : []), message];
  const started = Date.now();
  return new Promise((resolve) => {
    // OpenCode takes its project folder from PWD, not the process's working directory: without this
    // the agent works in whatever folder launched the harness (the 2026-10-19 pilot ran in this repo).
    const child = spawn(OPENCODE, argv, { cwd, env: { ...process.env, PWD: cwd }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    const timer = setTimeout(() => child.kill(), TURN_TIMEOUT);
    child.on("close", (code) => {
      clearTimeout(timer);
      const events = out.split(/\r?\n/).flatMap((line) => {
        try {
          return [JSON.parse(line)];
        } catch {
          return [];
        }
      });
      const session = events.find((e) => e.sessionID)?.sessionID ?? sessionId;
      const texts = events.filter((e) => e.type === "text" && e.part?.text).map((e) => e.part.text);
      resolve({ message, session, code, ms: Date.now() - started, finalText: texts.at(-1) ?? "", stderr: err.slice(-4000), raw: out });
    });
  });
}

const awaitingCards = (cwd) => {
  const dir = join(cwd, ".groundwork/cards");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => readFileSync(join(dir, name), "utf8"))
    .filter((md) => /^status:\s*awaiting-approval\s*$/m.test(md))
    // A card may write its id quoted (id: "1.1"); a person types /gw-approve 1.1.
    .map((md) => md.match(/^id:\s*(\S+)/m)?.[1]?.replace(/^["']|["']$/g, ""))
    .filter(Boolean);
};

// The agent stopped to ask the human something: its last paragraph is a question, or asks to proceed.
// Also counts a request for the human's go-ahead without a question mark ("Say OK and I'll commit").
export function asksHuman(text) {
  const tail = text.trim().split(/\n\s*\n/).at(-1) ?? "";
  // Imperative requests too ("Confirm those and I'll plan one card", "need a yes/no"), read over the
  // last two paragraphs. Added after v1-full: these went unanswered in three Groundwork runs.
  const lastTwo = text.trim().split(/\n\s*\n/).slice(-2).join("\n");
  return (
    /\?\s*\**\s*$/.test(tail) ||
    /\b(should I|shall I|would you like me to|do you want me to|OK to (proceed|continue|write|start|commit)|want me to|say (OK|the word|go)|give me (the|your) (OK|go-ahead)|once you (confirm|approve|say)|let me know (if|when|whether))\b/i.test(tail) ||
    /\bplease confirm\b|\bconfirm (\(|\*\*)|(^|[.!:]\s+|\n\s*)(\*\*)?confirm\b/i.test(lastTwo) ||
    /\b(confirm (those|this|it|the|them|or|both|and)|yes\/no|next step is yours|needs? your (yes|answer|OK|confirmation|decision)|waiting (for|on) your (yes|answer|OK|confirmation|approval|decision)|your (yes|confirmation|go-ahead))\b/i.test(lastTwo)
  );
}

async function runStep(cwd, arm, prompt, reply, log) {
  const record = { prompt, turns: [], approvals: 0, questions: 0 };
  let message = arm === "groundwork" ? `/gw ${prompt}` : prompt;
  let session;
  for (let i = 0; i <= MAX_FOLLOWUPS; i += 1) {
    const turn = await runTurn(cwd, message, session);
    session = turn.session;
    record.turns.push({ message: turn.message, session: turn.session, code: turn.code, ms: turn.ms, finalText: turn.finalText, stderr: turn.stderr });
    log.push(turn.raw);
    if (arm === "groundwork") {
      const waiting = awaitingCards(cwd);
      if (waiting.length > 0) {
        message = `/gw-approve ${waiting[0]}`;
        record.approvals += 1;
        continue;
      }
    }
    if (asksHuman(turn.finalText) && i < MAX_FOLLOWUPS) {
      message = reply;
      record.questions += 1;
      continue;
    }
    break;
  }
  return record;
}

// Exports every session the scenario used, following child (subagent) sessions recursively.
function exportSessions(cwds, roots, dir) {
  const seen = new Set();
  const queue = [...roots].map((id) => ({ id, cwd: cwds[0] }));
  const exports = [];
  while (queue.length > 0) {
    const { id, cwd } = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    let text = "";
    for (const c of cwds) {
      try {
        text = execFileSync(OPENCODE, ["session", "export", id], { cwd: c, env: { ...process.env, PWD: c }, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
        if (text.trim()) break;
      } catch {
        // try the next workspace
      }
    }
    if (!text.trim()) continue;
    writeFileSync(join(dir, `${id}.json`), text);
    const json = JSON.parse(text);
    exports.push(json);
    for (const child of new Set(text.match(/ses_[A-Za-z0-9]+/g) ?? [])) if (!seen.has(child)) queue.push({ id: child, cwd });
  }
  return exports;
}

const INVESTIGATE = new Set(["read", "glob", "grep", "list", "webfetch", "codesearch"]);
function usage(exports) {
  const u = { sessions: exports.length, input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0, assistantMessages: 0, toolCalls: 0, investigateCalls: 0, shellCalls: 0, editCalls: 0 };
  for (const { info, messages } of exports) {
    u.input += info.tokens?.input ?? 0;
    u.output += info.tokens?.output ?? 0;
    u.reasoning += info.tokens?.reasoning ?? 0;
    u.cacheRead += info.tokens?.cache?.read ?? 0;
    u.cacheWrite += info.tokens?.cache?.write ?? 0;
    u.costUsd += info.cost ?? 0;
    for (const m of messages ?? []) {
      if (m.type !== "assistant") continue;
      u.assistantMessages += 1;
      for (const p of m.content ?? m.parts ?? []) {
        if (p.type !== "tool") continue;
        const name = String(p.name ?? p.tool ?? "");
        u.toolCalls += 1;
        if (INVESTIGATE.has(name)) u.investigateCalls += 1;
        else if (name === "shell" || name === "bash") u.shellCalls += 1;
        else if (["edit", "write", "patch", "apply_patch"].includes(name)) u.editCalls += 1;
      }
    }
  }
  return u;
}

function scoreAt(repo, ref, taskDir) {
  const tree = mkdtempSync(join(tmpdir(), "gw-eval-tree-"));
  rmSync(tree, { recursive: true, force: true });
  try {
    git(repo, "worktree", "add", "--detach", "-q", tree, ref);
    return scoreDir(tree, taskDir);
  } catch (error) {
    return { error: String(error.message).slice(0, 300) };
  } finally {
    try {
      git(repo, "worktree", "remove", "--force", tree);
    } catch {
      rmSync(tree, { recursive: true, force: true });
    }
  }
}

async function soloScenario(task, arm, run, outDir) {
  const ws = join(WORK, `${task.id}-${arm}-r${run}`);
  rmSync(ws, { recursive: true, force: true });
  mkdirSync(ws, { recursive: true });
  baseRepo(ws, task);
  const setupStart = Date.now();
  if (arm === "groundwork") setupGroundwork(ws, TGZ);
  else setupBaseline(ws);
  const base = git(ws, "rev-parse", "HEAD");
  const log = [];
  const steps = [];
  for (const step of task.steps) steps.push(await runStep(ws, arm, step.prompt, step.reply, log));
  writeFileSync(join(outDir, "events.jsonl"), log.join("\n"));
  const sessions = steps.flatMap((s) => s.turns.map((t) => t.session));
  const sessionsDir = join(outDir, "sessions");
  mkdirSync(sessionsDir, { recursive: true });
  const exports = exportSessions([ws], sessions, sessionsDir);
  const working = scoreDir(ws, task.dir);
  const committed = scoreAt(ws, "HEAD", task.dir);
  return {
    task: task.id, arm, run, kind: "solo", workspace: ws, setupMs: Date.now() - setupStart,
    steps, usage: usage(exports),
    git: { base, head: git(ws, "rev-parse", "HEAD"), commits: Number(git(ws, "rev-list", "--count", `${base}..HEAD`)), uncommitted: git(ws, "status", "--porcelain", "--untracked-files=all").split("\n").filter(Boolean).length },
    score: { working, committed, success: succeeded(working), committedSuccess: succeeded(committed) },
  };
}

async function teamScenario(task, arm, run, outDir) {
  const root = join(WORK, `${task.id}-${arm}-r${run}`);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  const seed = join(root, "seed");
  mkdirSync(seed);
  baseRepo(seed, task);
  if (arm === "groundwork") setupGroundwork(seed, TGZ, { integration: "pr" });
  else setupBaseline(seed);
  addTeamPlan(seed, arm);
  const origin = join(root, "origin.git");
  git(root, "clone", "-q", "--bare", seed, origin);
  git(origin, "symbolic-ref", "HEAD", "refs/heads/main");
  const clones = {};
  const cloneFor = (name, task) => {
    if (clones[name]) return clones[name];
    const dir = join(root, name);
    git(root, "clone", "-q", "-c", "core.autocrlf=false", origin, dir);
    git(dir, "config", "core.autocrlf", "false");
    git(dir, "config", "user.name", `Developer ${name}`);
    git(dir, "config", "user.email", `${name.toLowerCase()}@example.com`);
    const branch = branchFor(arm, task);
    const remote = git(dir, "ls-remote", "--heads", "origin", branch);
    if (remote) git(dir, "checkout", "-q", "-b", branch, `origin/${branch}`);
    else git(dir, "checkout", "-q", "-b", branch);
    if (arm === "groundwork") execFileSync("npm", ["install", "--no-audit", "--no-fund"], { cwd: dir, stdio: "ignore", shell: process.platform === "win32" });
    clones[name] = dir;
    return dir;
  };
  const log = [];
  const stages = [];
  for (const stage of task.stages) {
    if (stage.kind === "agent") {
      const cwd = cloneFor(stage.clone, stage.task);
      const fill = (text) => text.replace("{taskRef}", taskRefFor(arm, stage.task)).replace("{branch}", branchFor(arm, stage.task)).replace("{checks}", checksFor(arm));
      stages.push({ kind: "agent", clone: stage.clone, ...(await runStep(cwd, arm, fill(stage.prompt), fill(stage.reply), log)) });
    } else if (stage.kind === "upstream") {
      const mate = join(root, "teammate");
      if (!existsSync(mate)) git(root, "clone", "-q", "-c", "core.autocrlf=false", origin, mate);
      git(mate, "pull", "-q", "origin", "main");
      for (const change of stage.changes) applyUpstream(mate, arm, change);
      git(mate, "push", "-q", "origin", "main");
      stages.push({ kind: "upstream", changes: stage.changes });
    } else if (stage.kind === "merge") {
      const mate = join(root, "teammate");
      if (!existsSync(mate)) git(root, "clone", "-q", "-c", "core.autocrlf=false", origin, mate);
      git(mate, "pull", "-q", "origin", "main");
      git(mate, "fetch", "-q", "origin");
      let merged = true;
      try {
        git(mate, "merge", "--no-ff", "-q", "-m", `Merge task ${stage.task}`, `origin/${branchFor(arm, stage.task)}`);
        git(mate, "push", "-q", "origin", "main");
      } catch {
        merged = false;
        try {
          git(mate, "merge", "--abort");
        } catch {
          // nothing to abort
        }
      }
      stages.push({ kind: "merge", task: stage.task, merged });
    }
  }
  writeFileSync(join(outDir, "events.jsonl"), log.join("\n"));
  const sessions = stages.flatMap((s) => (s.turns ?? []).map((t) => t.session));
  const sessionsDir = join(outDir, "sessions");
  mkdirSync(sessionsDir, { recursive: true });
  const exports = exportSessions(Object.values(clones), sessions, sessionsDir);
  const scorer = join(root, "scorer");
  git(root, "clone", "-q", "-c", "core.autocrlf=false", origin, scorer);
  const branch = branchFor(arm, task.score.branchTask);
  const hasBranch = Boolean(git(scorer, "ls-remote", "--heads", "origin", branch));
  let upToDate = false;
  let score = { error: "branch was not pushed" };
  if (hasBranch) {
    try {
      git(scorer, "merge-base", "--is-ancestor", "origin/main", `origin/${branch}`);
      upToDate = true;
    } catch {
      upToDate = false;
    }
    score = scoreAt(scorer, `origin/${branch}`, task.dir);
  }
  return {
    task: task.id, arm, run, kind: "team", workspace: root, stages, usage: usage(exports),
    git: { branch, pushed: hasBranch, upToDate },
    score: { branch: score, success: hasBranch && upToDate && succeeded(score) },
  };
}

async function main() {
  if (ARMS.includes("groundwork") && !TGZ) throw new Error("--tgz <path to the packed groundwork-ai build> is required");
  const tasks = (args.tasks ?? "").split(",").filter(Boolean).map(loadTask);
  const tgzHash = TGZ ? createHash("sha256").update(readFileSync(TGZ)).digest("hex") : null;
  mkdirSync(OUT, { recursive: true });
  const env = {
    tag: TAG, startedAt: new Date().toISOString(), model: MODEL, arms: ARMS, runs: RUNS,
    node: process.version, platform: `${process.platform} ${process.arch}`,
    opencode: execFileSync(OPENCODE, ["--version"], { encoding: "utf8" }).trim(),
    git: execFileSync("git", ["--version"], { encoding: "utf8" }).trim(),
    groundworkTgz: TGZ ?? null, groundworkTgzSha256: tgzHash,
    evalsRevision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO, encoding: "utf8" }).trim(),
    evalsDirty: execFileSync("git", ["status", "--porcelain", "--", "evals"], { cwd: REPO, encoding: "utf8" }).trim() !== "",
  };
  if (env.evalsDirty) throw new Error("Commit evals/ first: scored runs use a committed harness, and a change under evals/ during a run means an agent escaped its workspace.");
  writeFileSync(join(OUT, `environment-${Date.now()}.json`), JSON.stringify(env, null, 2));
  const jobs = [];
  for (let run = 1; run <= RUNS; run += 1) for (const task of tasks) for (const arm of ARMS) jobs.push({ task, arm, run });
  // --only S05-groundwork-r1,S08-groundwork-r1 reruns just those runs.
  if (args.only) {
    const only = new Set(args.only.split(","));
    jobs.splice(0, jobs.length, ...jobs.filter((j) => only.has(`${j.task.id}-${j.arm}-r${j.run}`)));
  }
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const { task, arm, run } = jobs[next++];
      const outDir = join(OUT, `${task.id}-${arm}-r${run}`);
      if (existsSync(join(outDir, "result.json")) && !args.force) continue;
      mkdirSync(outDir, { recursive: true });
      const started = Date.now();
      console.log(`start ${task.id} ${arm} r${run}`);
      try {
        const result = task.type === "team" ? await teamScenario(task, arm, run, outDir) : await soloScenario(task, arm, run, outDir);
        // An agent must never reach this repository: a change under evals/ would leak or alter the
        // fixture and the hidden tests. Stop everything if it happens.
        const leaked = execFileSync("git", ["status", "--porcelain", "--", "evals"], { cwd: REPO, encoding: "utf8" }).trim();
        if (leaked) {
          writeFileSync(join(outDir, "error.txt"), `evals/ changed during this run; result discarded:\n${leaked}`);
          console.log(`ABORT ${task.id} ${arm} r${run}: evals/ changed during the run`);
          process.exit(2);
        }
        result.elapsedMs = Date.now() - started;
        result.environment = { model: MODEL, groundworkTgzSha256: tgzHash };
        writeFileSync(join(outDir, "result.json"), JSON.stringify(result, null, 2));
        console.log(`done  ${task.id} ${arm} r${run} success=${result.score.success} ${Math.round(result.elapsedMs / 1000)}s $${result.usage.costUsd.toFixed(4)}`);
      } catch (error) {
        writeFileSync(join(outDir, "error.txt"), String(error.stack ?? error));
        console.log(`error ${task.id} ${arm} r${run}: ${error.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
