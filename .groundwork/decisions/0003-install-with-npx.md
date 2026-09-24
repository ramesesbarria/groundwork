---
id: 0003
title: Install with npx only
status: accepted
date: 2026-09-24
---
## Context
Groundwork could be distributed as an npm CLI, as plugins in each tool's marketplace, or both.

## Options
- **(a) `npx groundwork-ai init` only.** The core is copied into each project, so any tool that reads files can follow it. Pros: one install path, tool-agnostic, versioned with the project. Cons: no marketplace discovery. Switching later: easy to add plugins on top.
- **(b) Plugins per tool.** Pros: discovery, one-click install. Cons: one package per harness to maintain, and the core would drift toward tool-specific behavior.

## Decision
(a) `npx groundwork-ai init` only. No plugin distribution. Decided by the human on 2026-09-24.

## Consequences
- Every feature must work from the plain-markdown core in `.groundwork/`, with no adapter.
- Marketplace listings stay out of scope (see PLAN.md, "Where we don't compete").
