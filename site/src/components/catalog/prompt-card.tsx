import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ToneBadge } from "@/components/catalog/tone-badge";
import type { Prompt } from "@/content/types";
import { categoryTone, modelTierTone } from "@/lib/badge-colors";

export function PromptCard({ prompt }: { prompt: Prompt }) {
  return (
    <Link
      to={`/prompts/${prompt.slug}`}
      className="group flex flex-col justify-between rounded-xl border border-white/10 bg-card/60 p-5 transition hover:border-white/20 hover:bg-card"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <ToneBadge tone={categoryTone(prompt.category)}>{prompt.category}</ToneBadge>
          {prompt.modelTier && (
            <ToneBadge tone={modelTierTone(prompt.modelTier)} mono>
              {prompt.modelTier}
            </ToneBadge>
          )}
        </div>
        <h3 className="mt-4 font-mono text-base font-medium">/{prompt.slug}</h3>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{prompt.description}</p>
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-muted-foreground">
        <span>{prompt.tracker !== "All" ? prompt.tracker : "Jira + GitHub"}</span>
        <span className="inline-flex items-center gap-1 transition group-hover:text-foreground">
          Details
          <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
