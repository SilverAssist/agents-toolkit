import generated from './generated.json';
import type { GeneratedContent } from './types';

export const content = generated as unknown as GeneratedContent;

export const { skills, prompts, instructions, agentOverrides, partials, hooks, meta, counts } = content;

export * from './types';
export { AGENTS } from './agents';
export type { AgentDoc } from './agents';
export { TUTORIALS } from './tutorials';
export type { Tutorial, TutorialStep } from './tutorials';
