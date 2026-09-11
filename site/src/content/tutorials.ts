export interface TutorialStep {
  title: string;
  description: string;
  command?: string;
  promptSlug?: string;
  skillSlug?: string;
}

export interface Tutorial {
  slug: string;
  title: string;
  summary: string;
  tracker: 'Jira' | 'GitHub' | 'All';
  steps: TutorialStep[];
}

export const TUTORIALS: Tutorial[] = [
  {
    slug: 'jira-ticket-to-pr',
    title: 'Ship a Jira ticket end-to-end',
    summary:
      'Chain six prompts from a bare ticket ID to a merged pull request, each one picking up where the last left off.',
    tracker: 'Jira',
    steps: [
      {
        title: 'Analyze the ticket',
        description:
          'Read the ticket, restate the ask, and flag anything underspecified — without touching a single file.',
        command: '/analyze-ticket WEB-1234',
        promptSlug: 'analyze-ticket',
      },
      {
        title: 'Plan the implementation',
        description: 'Turn the analysis into a step-by-step plan: files to touch, risks, and a rollback path.',
        command: '/create-plan WEB-1234',
        promptSlug: 'create-plan',
      },
      {
        title: 'Do the work',
        description: "Implement the plan, following the project's conventions and running tests as it goes.",
        command: '/work-ticket WEB-1234',
        promptSlug: 'work-ticket',
      },
      {
        title: 'Prepare for review',
        description:
          'Run formatting, linting, and the test suite, then hand off to core-review for a pre-emptive pass.',
        command: '/prepare-pr',
        promptSlug: 'prepare-pr',
        skillSlug: 'core-review',
      },
      {
        title: 'Open the pull request',
        description: 'Push the branch and open the PR with a description generated from the ticket and the diff.',
        command: '/create-pr WEB-1234',
        promptSlug: 'create-pr',
      },
      {
        title: 'Finalize and merge',
        description: 'Address any last review comments, then merge and transition the ticket.',
        command: '/finalize-pr WEB-1234',
        promptSlug: 'finalize-pr',
      },
    ],
  },
  {
    slug: 'github-issue-to-pr',
    title: 'Ship a GitHub issue end-to-end',
    summary: 'The same six-step shape as the Jira workflow, wired to GitHub Issues and gh instead.',
    tracker: 'GitHub',
    steps: [
      {
        title: 'Analyze the issue',
        description: 'Read the issue and comments, restate the ask, and flag anything underspecified.',
        command: '/analyze-github-issue 42',
        promptSlug: 'analyze-github-issue',
      },
      {
        title: 'Plan the implementation',
        description: 'Turn the analysis into a step-by-step plan the same way the Jira flow does.',
        command: '/create-plan',
        promptSlug: 'create-plan',
      },
      {
        title: 'Do the work',
        description: 'Implement the plan against the issue, running tests as it goes.',
        command: '/work-github-issue 42',
        promptSlug: 'work-github-issue',
      },
      {
        title: 'Prepare for review',
        description: 'Format, lint, test, then run core-review before anyone else sees the diff.',
        command: '/prepare-pr',
        promptSlug: 'prepare-pr',
        skillSlug: 'core-review',
      },
      {
        title: 'Open the pull request',
        description: 'Push the branch and open the PR, linked back to the originating issue.',
        command: '/create-github-pr 42',
        promptSlug: 'create-github-pr',
      },
      {
        title: 'Finalize and merge',
        description: 'Resolve review threads via the github-review-management skill, then merge.',
        command: '/finalize-github-pr 42',
        promptSlug: 'finalize-github-pr',
        skillSlug: 'github-review-management',
      },
    ],
  },
  {
    slug: 'wordpress-component',
    title: 'Scaffold a WordPress plugin and a component',
    summary: 'Go from nothing to a running Silver Assist plugin with a new component, fully quality-checked.',
    tracker: 'All',
    steps: [
      {
        title: 'Scaffold the plugin',
        description:
          'Generate the PSR-4 skeleton: main plugin file, composer.json, LoadableInterface architecture, CI/CD.',
        command: '/new-wp-plugin my-plugin',
        promptSlug: 'new-wp-plugin',
        skillSlug: 'plugin-creation',
      },
      {
        title: 'Add a component',
        description: 'Scaffold a service, controller, or view with proper registration and PHPDoc.',
        command: '/new-wp-component PricingTable',
        promptSlug: 'new-wp-component',
        skillSlug: 'create-component',
      },
      {
        title: 'Run the quality pipeline',
        description: 'PHPCS (WordPress Coding Standards), PHPStan level 8, and PHPUnit — all in one pass.',
        command: '/quality-check',
        promptSlug: 'quality-check',
        skillSlug: 'quality-checks',
      },
    ],
  },
  {
    slug: 'pre-review-pass',
    title: 'Catch review feedback before you push',
    summary:
      'Run the same consistency pass a reviewer would, before the branch ever leaves your machine — the read-only core-review skill.',
    tracker: 'All',
    steps: [
      {
        title: 'Finish the change',
        description: 'Implement and locally test the change as usual — no different from any other branch.',
      },
      {
        title: 'Run core-review at the diff scope',
        description:
          'Invoke the skill directly (inline, or @core-review on Copilot) scoped to just the diff — the fast, cheap pass.',
        command: 'core-review --budget quick',
        skillSlug: 'core-review',
      },
      {
        title: 'Apply findings, then widen the scope',
        description:
          'Fix what it flags, then re-run at --budget medium (diff plus one-hop neighbours) before opening the PR.',
        command: 'core-review --budget medium',
        skillSlug: 'core-review',
      },
      {
        title: 'Open the PR',
        description: 'create-pr and create-github-pr call core-review automatically as their last step before pushing.',
        promptSlug: 'create-pr',
      },
    ],
  },
  {
    slug: 'filtered-install',
    title: 'Install only what your stack needs',
    summary: 'Skip WordPress instructions in a React repo, or GitHub prompts in a Jira-only shop, with two flags.',
    tracker: 'All',
    steps: [
      {
        title: 'Pick a stack filter',
        description:
          '--stack react keeps TypeScript/React/Next.js instructions and skills; --stack wordpress keeps PHP ones.',
        command: 'npx @silverassist/agents-toolkit@latest install --stack react',
      },
      {
        title: 'Pick a tracker filter',
        description: '--tracker github drops every Jira-specific prompt and partial; --tracker jira does the reverse.',
        command: 'npx @silverassist/agents-toolkit@latest install --tracker github',
      },
      {
        title: 'Combine both',
        description: 'Filters compose — a React shop on GitHub Issues installs only what it will ever use.',
        command: 'npx @silverassist/agents-toolkit@latest install --stack react --tracker github',
      },
      {
        title: 'Persist the choice',
        description: 'Both flags get written to .agents-toolkit.json, so future update runs remember them.',
        command: 'npx @silverassist/agents-toolkit@latest update',
      },
    ],
  },
];
