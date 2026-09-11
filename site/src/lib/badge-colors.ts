// Category → color mapping shared across skill groups, prompt trackers, and prompt
// categories, so the same visual language (a dot + tinted pill) applies everywhere.
export type BadgeTone = 'blue' | 'teal' | 'amber' | 'violet' | 'rose' | 'neutral';

const TONE_CLASSES: Record<BadgeTone, string> = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  teal: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  neutral: 'bg-white/5 text-muted-foreground border-white/10',
};

const TONE_DOT: Record<BadgeTone, string> = {
  blue: 'bg-blue-400',
  teal: 'bg-teal-400',
  amber: 'bg-amber-400',
  violet: 'bg-violet-400',
  rose: 'bg-rose-400',
  neutral: 'bg-muted-foreground',
};

const SKILL_GROUP_TONE: Record<string, BadgeTone> = {
  Architecture: 'blue',
  WordPress: 'amber',
  Review: 'teal',
  Frontend: 'violet',
  SEO: 'rose',
  Release: 'neutral',
  Other: 'neutral',
};

const TRACKER_TONE: Record<string, BadgeTone> = {
  Jira: 'blue',
  GitHub: 'violet',
  All: 'teal',
};

const CATEGORY_TONE: Record<string, BadgeTone> = {
  Workflow: 'blue',
  Utility: 'teal',
};

const MODEL_TIER_TONE: Record<string, BadgeTone> = {
  cheap: 'teal',
  smart: 'violet',
};

export function toneClasses(tone: BadgeTone) {
  return TONE_CLASSES[tone];
}

export function toneDot(tone: BadgeTone) {
  return TONE_DOT[tone];
}

export function skillGroupTone(group: string): BadgeTone {
  return SKILL_GROUP_TONE[group] ?? 'neutral';
}

export function trackerTone(tracker: string): BadgeTone {
  return TRACKER_TONE[tracker] ?? 'neutral';
}

export function categoryTone(category: string): BadgeTone {
  return CATEGORY_TONE[category] ?? 'neutral';
}

export function modelTierTone(tier: string | null): BadgeTone {
  return tier ? (MODEL_TIER_TONE[tier] ?? 'neutral') : 'neutral';
}
