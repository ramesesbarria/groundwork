import { withMermaid } from "vitepress-plugin-mermaid";

// Deployed as a GitHub Pages project site at /groundwork/.
// If the site ever moves to a custom domain, change base to "/" and the favicon href.
export default withMermaid({
  base: "/groundwork/",
  lang: "en",
  title: "Groundwork",
  description:
    "A tool-agnostic workflow for building software with AI agents: spec, plan, test-first build loop, human-approved ship.",
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/groundwork/favicon.svg" }],
    ["meta", { name: "theme-color", content: "#4f46e5" }],
  ],
  themeConfig: {
    nav: [
      { text: "Get started", link: "/getting-started/installation" },
      { text: "Why Groundwork", link: "/why" },
      { text: "Reference", link: "/reference/agent-commands" },
    ],
    sidebar: {
      "/getting-started/": [
        {
          text: "Getting started",
          items: [
            { text: "Installation", link: "/getting-started/installation" },
            { text: "Your first 10 minutes", link: "/getting-started/first-10-minutes" },
            { text: "Approval modes", link: "/getting-started/approval-modes" },
          ],
        },
      ],
      "/concepts/": [
        {
          text: "Concepts",
          items: [
            { text: "Cards and phases", link: "/concepts/cards-and-phases" },
            { text: "The build loop", link: "/concepts/the-build-loop" },
            { text: "Evidence and approval", link: "/concepts/evidence-and-approval" },
            { text: "Handoff and resuming", link: "/concepts/handoff" },
            { text: "Right-sizing", link: "/concepts/right-sizing" },
            { text: "The lessons ledger", link: "/concepts/lessons-ledger" },
          ],
        },
      ],
      "/guides/": [
        {
          text: "Guides",
          items: [
            { text: "Existing projects", link: "/guides/existing-projects" },
            { text: "UI and animation", link: "/guides/ui-and-animation" },
            { text: "Stack decisions", link: "/guides/decisions" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "Agent commands", link: "/reference/agent-commands" },
            { text: "CLI", link: "/reference/cli" },
            { text: "Configuration", link: "/reference/configuration" },
            { text: "Project files", link: "/reference/project-files" },
          ],
        },
      ],
      "/adapters/": [
        {
          text: "Adapters",
          items: [
            { text: "Claude Code", link: "/adapters/claude-code" },
            { text: "OpenCode", link: "/adapters/opencode" },
            { text: "Other tools", link: "/adapters/other-tools" },
          ],
        },
      ],
      "/": [
        {
          text: "Groundwork",
          items: [
            { text: "Why Groundwork", link: "/why" },
            { text: "Glossary", link: "/glossary" },
            { text: "FAQ", link: "/faq" },
          ],
        },
      ],
    },
    search: { provider: "local" },
    socialLinks: [{ icon: "github", link: "https://github.com/ramesesbarria/groundwork" }],
    editLink: {
      pattern: "https://github.com/ramesesbarria/groundwork/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },
    footer: {
      message: "MIT licensed",
      copyright: "Copyright © Rameses Barria",
    },
    outline: { level: [2, 3] },
  },
  mermaid: {},
});
