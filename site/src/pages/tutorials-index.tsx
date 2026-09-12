import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ToneBadge } from "@/components/catalog/tone-badge";
import { TUTORIALS } from "@/content";
import { trackerTone } from "@/lib/badge-colors";

export function TutorialsIndex() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Tutorials</span>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{TUTORIALS.length} worked examples</h1>
        <p className="mt-3 text-muted-foreground">
          The catalog explains what each piece does in isolation. These walk through chaining them together for a
          real outcome — a merged PR, a scaffolded plugin, a review pass that never generates review comments.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TUTORIALS.map((tutorial) => (
          <Link
            key={tutorial.slug}
            to={`/tutorials/${tutorial.slug}`}
            className="group flex flex-col justify-between rounded-xl border border-white/10 bg-card/60 p-5 transition hover:border-white/20 hover:bg-card"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <ToneBadge tone={trackerTone(tutorial.tracker)}>{tutorial.tracker}</ToneBadge>
                <span className="font-mono text-xs text-muted-foreground">{tutorial.steps.length} steps</span>
              </div>
              <h3 className="mt-4 text-lg font-medium">{tutorial.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{tutorial.summary}</p>
            </div>
            <div className="mt-6 flex items-center justify-end border-t border-white/10 pt-3 text-sm text-muted-foreground transition group-hover:text-foreground">
              <span className="inline-flex items-center gap-1">
                Walk through it
                <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
