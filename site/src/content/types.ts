export interface Skill {
  slug: string;
  name: string;
  description: string;
  model: string | null;
  argumentHint: string | null;
  group: string;
  body: string;
}

export interface Prompt {
  slug: string;
  title: string;
  description: string;
  model: string | null;
  modelTier: 'cheap' | 'smart' | null;
  claudeModel: string | null;
  tools: string[];
  category: 'Workflow' | 'Utility';
  tracker: 'Jira' | 'GitHub' | 'All';
  variables: string[];
  body: string;
}

export interface Instruction {
  slug: string;
  name: string;
  description: string | null;
  applyTo: string | null;
  body: string;
}

export interface AgentOverride {
  slug: string;
  name: string;
  description: string;
  tools: string[];
  model: string | null;
  body: string;
}

export interface Partial {
  slug: string;
  title: string;
  description: string;
  body: string;
}

export interface Hook {
  slug: string;
  trigger: string;
  description: string;
}

export interface GeneratedContent {
  generatedAt: string;
  meta: {
    name: string;
    version: string;
    description: string;
    repository: string;
    homepage: string;
    license: string;
  };
  counts: Record<string, number>;
  skills: Skill[];
  prompts: Prompt[];
  instructions: Instruction[];
  agentOverrides: AgentOverride[];
  partials: Partial[];
  hooks: Hook[];
}
