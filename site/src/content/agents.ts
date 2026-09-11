export interface AgentDoc {
  slug: 'claude' | 'copilot' | 'codex';
  name: string;
  initials: string;
  tagline: string;
  installCommand: string;
  rootFile: string;
  rootFileDescription: string;
  tree: string;
  modelPins: string;
  notes: string[];
}

export const AGENTS: AgentDoc[] = [
  {
    slug: 'claude',
    name: 'Claude Code',
    initials: 'CC',
    tagline: 'Slash commands, native skills, a cheap-tier Explore override.',
    installCommand: 'npx @silverassist/agents-toolkit@latest install --claude',
    rootFile: 'CLAUDE.md',
    rootFileDescription:
      'Project-wide instructions: the 4-phase workflow adapted for Claude Code conventions, a slash-commands reference table, code conventions, React patterns, and git guidelines.',
    tree: `CLAUDE.md
.agents/
└── skills/                  # canonical store, single source of truth
    ├── domain-driven-design/
    ├── testing-patterns/
    └── ...                  # 15 skills, filtered by --stack
.claude/
├── agents/
│   └── Explore.md           # cheap-tier override of the built-in Explore agent
├── commands/
│   ├── _partials/
│   ├── analyze-ticket.md
│   ├── create-plan.md
│   └── ...                  # 19 commands, filtered by --tracker and --stack
└── skills/                  # symlinks -> ../../.agents/skills/ (read natively)
.github/
└── instructions/            # shared with Copilot`,
    modelPins:
      'Copilot model names are mapped to Claude aliases at install time — Claude Haiku 4.5 → haiku, Claude Sonnet 5 → sonnet. Each skill or slash command establishes its own model boundary, so a cheap-tier skill called from a smart-tier orchestrator stays cheap.',
    notes: [
      'Type / in the chat to see all 19 installed slash commands.',
      'Skills are symlinked into .claude/skills/, where Claude Code reads them natively.',
      'Explore.md overrides the built-in Explore subagent to the cheap tier — it runs on nearly every autonomous cycle and only does read-only search.',
    ],
  },
  {
    slug: 'copilot',
    name: 'GitHub Copilot',
    initials: 'GH',
    tagline: 'Prompts, instructions applied automatically by glob, a pinned @core-review agent.',
    installCommand: 'npx @silverassist/agents-toolkit@latest install',
    rootFile: 'AGENTS.md',
    rootFileDescription:
      'Mandatory instructions for the coding agent working on issues autonomously: the 4-phase workflow (Analysis → Planning → Implementation → Documentation), code conventions, React patterns, testing requirements, and git guidelines.',
    tree: `AGENTS.md
.github/
├── copilot-instructions.md  # project-wide Copilot instructions
├── prompts/
│   ├── _partials/
│   ├── analyze-ticket.prompt.md
│   ├── create-plan.prompt.md
│   └── ...                  # 19 prompts, filtered by --tracker and --stack
├── instructions/
│   ├── typescript.instructions.md
│   ├── react-components.instructions.md
│   └── ...                  # filtered by --stack, applied automatically by glob
├── skills/                  # symlinks -> ../../.agents/skills/ (npx skills standard)
├── hooks/                   # PostToolUse validation hooks
│   ├── validate-tsx.json
│   ├── lint-format.json
│   └── scripts/
└── agents/
    └── core-review.agent.md # cheap-tier inline reviewer, @core-review
.agents/
└── skills/                  # canonical store, single source of truth`,
    modelPins:
      "The model: pin in each prompt wins over the Copilot model picker. Skills inherit the invoking prompt's model, so a dedicated cheap-tier pass reaches for @core-review (a custom agent that opens its own model boundary) or a standalone cheap-tier chat.",
    notes: [
      'Instructions apply automatically based on the applyTo glob in their frontmatter — no manual invocation needed.',
      'Run a prompt via Cmd/Ctrl+Shift+P → "GitHub Copilot: Run Prompt", then fill in variables like {ticket-id}.',
      'The only agent target with PostToolUse hooks (validate-tsx, lint-format) — real-time validation right after an edit.',
    ],
  },
  {
    slug: 'codex',
    name: 'Codex',
    initials: 'CX',
    tagline: "Shares Copilot's prompts and instructions; ignores model: pins entirely.",
    installCommand: 'npx @silverassist/agents-toolkit@latest install --codex',
    rootFile: 'AGENTS.md',
    rootFileDescription:
      'Project instructions for Codex — the same 4-phase workflow and conventions as the Copilot AGENTS.md, since Codex reads the same file.',
    tree: `AGENTS.md
.github/
├── prompts/
│   ├── _partials/
│   ├── analyze-ticket.prompt.md
│   ├── create-plan.prompt.md
│   └── ...                  # 19 prompts, filtered by --tracker and --stack
├── instructions/
│   ├── typescript.instructions.md
│   ├── react-components.instructions.md
│   └── ...                  # filtered by --stack
└── skills/                  # symlinks -> ../../.agents/skills/ (npx skills standard)
.agents/
└── skills/                  # canonical store, single source of truth`,
    modelPins:
      'model: is ignored entirely — Codex has no per-prompt model mechanism. Control the session tier with codex --model instead.',
    notes: [
      'Reuses the exact .github/prompts and .github/instructions Copilot reads — one install, two agents.',
      'Skills are symlinked into .github/skills/ and referenced from AGENTS.md or task context.',
      'No agent-override mechanism — core-review and Explore stay Copilot/Claude-only.',
    ],
  },
];
