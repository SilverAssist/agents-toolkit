import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ToneBadge } from "@/components/catalog/tone-badge";
import type { Skill } from "@/content/types";
import { skillGroupTone } from "@/lib/badge-colors";

export function SkillCard({ skill }: { skill: Skill }) {
  return (
    <Link
      to={`/skills/${skill.slug}`}
      className="group flex flex-col justify-between rounded-xl border border-white/10 bg-card/60 p-5 transition hover:border-white/20 hover:bg-card"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <ToneBadge tone={skillGroupTone(skill.group)}>{skill.group}</ToneBadge>
          {skill.model && <span className="font-mono text-xs text-muted-foreground">model: {skill.model}</span>}
        </div>
        <h3 className="mt-4 font-mono text-base font-medium">{skill.name}</h3>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{skill.description}</p>
      </div>
      <div className="mt-6 flex items-center justify-end border-t border-white/10 pt-3 text-sm text-muted-foreground transition group-hover:text-foreground">
        <span className="inline-flex items-center gap-1">
          View skill
          <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
