---
layout: home

hero:
  name: Groundwork
  text: Spec, proof, approval
  tagline: A workflow your AI agent can't skip — the project layer for any AI coding tool. Your project lives in files, not in the chat.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started/installation
    - theme: alt
      text: Why Groundwork
      link: /why

features:
  - icon: 🧾
    title: Evidence, not claims
    details: Cards are built test-first and checked by a reviewer with fresh context. "Done" means the proof is attached.
  - icon: ✋
    title: Nothing ships without you
    details: You approve every card, or each phase. Every stop says what changed, how to check it yourself, and the caveats.
  - icon: 🪜
    title: Mistakes become guards
    details: A mistake is written down once. Repeat it and it becomes a rule. Keep breaking it and it becomes a guard that blocks the action.
  - icon: 📐
    title: Right-sized process
    details: A typo goes through the quick path in one pass. A feature gets a spec, a plan and cards. The agent says which path it's taking.
  - icon: 🧩
    title: Any tool, any model
    details: A plain-markdown core with adapters for Claude Code and OpenCode. Use a cheaper model for the tester and a stronger one for the reviewer.
  - icon: 🔁
    title: Always resumable
    details: Close the laptop partway through a card. The next session, in any tool, picks up from the handoff file.
---

## How it works

```mermaid
flowchart TD
  idea([Your idea]) --> spec[Spec<br/>a few specific questions]
  spec --> plan[Plan<br/>phases and small cards]
  plan --> card

  subgraph card [For each card]
    direction LR
    tester[Tester<br/>writes failing tests] --> impl[Implementer<br/>makes them pass]
    impl --> review[Reviewer<br/>checks the evidence]
    review -. sent back .-> impl
  end

  card --> approve{You approve?}
  approve -- yes --> commit([Committed, on to the next card])
  approve -. no, with a reason .-> card

  classDef you fill:#fef3c7,stroke:#d97706,color:#451a03
  classDef agent fill:#e0e7ff,stroke:#6366f1,color:#1e1b4b
  classDef done fill:#dcfce7,stroke:#16a34a,color:#052e16
  class idea,approve you
  class spec,plan,tester,impl,review agent
  class commit done
  style card fill:none,stroke:#94a3b8,stroke-dasharray:4 3
```

## Install

```bash
cd your-project
npx groundwork-ai init
```

Then open your AI tool in the project and type `/gw`. The first time it asks a few setup questions;
after that it always says where things stand and runs the next step.

Nothing is committed until you approve. Every approval tells you how to check the work yourself.

[Your first 10 minutes →](/getting-started/first-10-minutes)
