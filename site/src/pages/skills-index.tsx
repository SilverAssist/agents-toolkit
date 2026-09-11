import { useMemo, useState } from "react";
import { SkillCard } from "@/components/catalog/skill-card";
import { ToneBadge } from "@/components/catalog/tone-badge";
import { Input } from "@/components/ui/input";
import { skills } from "@/content";
import { cn } from "@/lib/utils";
import { skillGroupTone } from "@/lib/badge-colors";

const GROUPS = ["All", ...Array.from(new Set(skills.map((s) => s.group))).sort()];

export function SkillsIndex() {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");

  const filtered = useMemo(() => {
    return skills.filter((skill) => {
      const matchesGroup = group === "All" || skill.group === group;
      const matchesQuery =
        !query ||
        skill.name.toLowerCase().includes(query.toLowerCase()) ||
        skill.description.toLowerCase().includes(query.toLowerCase());
      return matchesGroup && matchesQuery;
    });
  }, [query, group]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Skills</span>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{skills.length} specialized knowledge guides</h1>
        <p className="mt-3 text-muted-foreground">
          Domain-specific patterns installed as symlinks from a canonical <code>.agents/skills/</code> store, shared
          across Claude Code, GitHub Copilot, and Codex.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search skills…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((g) => (
            <button key={g} type="button" onClick={() => setGroup(g)}>
              <ToneBadge
                tone={g === "All" ? "neutral" : skillGroupTone(g)}
                className={cn("cursor-pointer transition", group === g ? "opacity-100" : "opacity-50 hover:opacity-80")}
              >
                {g}
              </ToneBadge>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((skill) => (
          <SkillCard key={skill.slug} skill={skill} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-16 text-center text-muted-foreground">No skills match “{query}”.</p>
        )}
      </div>
    </div>
  );
}
