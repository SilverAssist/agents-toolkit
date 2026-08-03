/** Single skill entry persisted in agents-toolkit-lock.json. */
export interface LockfileEntry {
  source: string;
  packageVersion: string;
  computedHash: string | null;
  agents: string[];
}

/** Shape of agents-toolkit-lock.json written to the consumer project. */
export interface Lockfile {
  version: 1;
  packageVersion: string;
  config: { stack: string; tracker: string };
  skills: Record<string, LockfileEntry>;
}

/** Intermediate per-skill record tracked during a single install run. */
export interface SkillMeta {
  computedHash: string | null;
  agents: string[];
}

/** Parsed CLI flags threaded through the install pipeline. */
export interface InstallOptions {
  force: boolean;
  global: boolean;
  dryRun: boolean;
  copy: boolean;
  promptsOnly: boolean;
  partialsOnly: boolean;
  skillsOnly: boolean;
  instructionsOnly: boolean;
  hooksOnly: boolean;
  claude: boolean;
  codex: boolean;
  append: boolean;
  noAgentOverrides: boolean;
  target: string | null;
  stack: string | null;
  tracker: string | null;
}

/** Shape of .agents-toolkit.json (project or global config file). */
export interface AgentToolkitConfig {
  stack?: 'react' | 'wordpress' | 'all';
  tracker?: 'jira' | 'github' | 'all';
  jira?: { projectKey: string; baseUrl: string };
  git?: { defaultBranch: string; branchPrefix: Record<string, string> };
  pr?: { targetBranch: string; template: string };
}

/** Options accepted by copyDir. */
export interface CopyOptions {
  force?: boolean;
  dryRun?: boolean;
  renameFile?: (name: string) => string;
  transformContent?: (content: string) => string;
  filter?: (name: string) => boolean;
  dirFilter?: (name: string) => boolean;
  partialsFilter?: (name: string) => boolean;
}

/** Result of installSkillsStandard — extends InstallResult with per-skill metadata. */
export interface SkillInstallResult extends InstallResult {
  installedSkills: Record<string, { canonicalDir: string }>;
}

/** Resolved stack/tracker values used by shouldIncludeFile. */
export interface InstallFilters {
  stack: string;
  tracker: string;
}

/** Return value of extractClaudeAlias — the Claude Code model alias or null. */
export type ClaudeAlias = 'haiku' | 'sonnet' | 'opus' | 'fable' | null;

/** Count result returned by any install / copy operation. */
export interface InstallResult {
  written: number;
  planned: number;
}

/** Which content categories to install, derived from InstallOptions flags. */
export interface InstallScope {
  shouldInstallPrompts: boolean;
  shouldInstallInstructions: boolean;
  shouldInstallSkills: boolean;
  shouldInstallHooks: boolean;
}
