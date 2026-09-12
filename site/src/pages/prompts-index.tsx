import { useMemo, useState } from "react";
import { PromptCard } from "@/components/catalog/prompt-card";
import { ToneBadge } from "@/components/catalog/tone-badge";
import { Input } from "@/components/ui/input";
import { prompts } from "@/content";
import { trackerTone } from "@/lib/badge-colors";
import { cn } from "@/lib/utils";

const TRACKERS = ["All", "Jira", "GitHub"] as const;
const CATEGORIES = ["All", "Workflow", "Utility"] as const;

export function PromptsIndex() {
  const [query, setQuery] = useState("");
  const [tracker, setTracker] = useState<(typeof TRACKERS)[number]>("All");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");

  const filtered = useMemo(() => {
    return prompts.filter((p) => {
      const matchesTracker = tracker === "All" || p.tracker === tracker || p.tracker === "All";
      const matchesCategory = category === "All" || p.category === category;
      const matchesQuery =
        !query ||
        p.slug.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase());
      return matchesTracker && matchesCategory && matchesQuery;
    });
  }, [query, tracker, category]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Prompts / Commands</span>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{prompts.length} prompts, one per workflow step</h1>
        <p className="mt-3 text-muted-foreground">
          Same set available as GitHub Copilot prompts, Claude Code slash commands, and Codex prompts. Each carries a
          hardcoded <code>model:</code> pin — cheap tier for mechanical work, smart tier for design reasoning.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        <Input
          placeholder="Search prompts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)}>
                <ToneBadge
                  tone="neutral"
                  className={cn("cursor-pointer transition", category === c ? "opacity-100" : "opacity-50 hover:opacity-80")}
                >
                  {c}
                </ToneBadge>
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex flex-wrap gap-2">
            {TRACKERS.map((t) => (
              <button key={t} type="button" onClick={() => setTracker(t)}>
                <ToneBadge
                  tone={t === "All" ? "neutral" : trackerTone(t)}
                  className={cn("cursor-pointer transition", tracker === t ? "opacity-100" : "opacity-50 hover:opacity-80")}
                >
                  {t}
                </ToneBadge>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((prompt) => (
          <PromptCard key={prompt.slug} prompt={prompt} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-16 text-center text-muted-foreground">No prompts match this filter.</p>
        )}
      </div>
    </div>
  );
}
