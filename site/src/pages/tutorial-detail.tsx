import { Puzzle, Terminal } from "lucide-react";
import { Navigate, useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { CodeBlock } from "@/components/catalog/code-block";
import { ToneBadge } from "@/components/catalog/tone-badge";
import { TUTORIALS } from "@/content";
import { trackerTone } from "@/lib/badge-colors";

export function TutorialDetail() {
  const { slug } = useParams();
  const tutorial = TUTORIALS.find((t) => t.slug === slug);

  if (!tutorial) return <Navigate to="/tutorials" replace />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <ToneBadge tone={trackerTone(tutorial.tracker)}>{tutorial.tracker}</ToneBadge>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance">{tutorial.title}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{tutorial.summary}</p>

      <ol className="mt-12 space-y-8 border-l border-white/10 pl-8">
        {tutorial.steps.map((step, i) => (
          <li key={step.title} className="relative">
            <span className="absolute top-0.5 -left-[41px] flex size-8 items-center justify-center rounded-full border border-white/10 bg-card font-mono text-xs">
              {i + 1}
            </span>
            <h2 className="text-lg font-medium">{step.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
            {step.command && <CodeBlock command={step.command} className="mt-3" prompt="›" />}
            {(step.promptSlug || step.skillSlug) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {step.promptSlug && (
                  <Link
                    to={`/prompts/${step.promptSlug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-muted-foreground transition hover:border-white/20 hover:text-foreground"
                  >
                    <Terminal className="size-3" />/{step.promptSlug}
                  </Link>
                )}
                {step.skillSlug && (
                  <Link
                    to={`/skills/${step.skillSlug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-muted-foreground transition hover:border-white/20 hover:text-foreground"
                  >
                    <Puzzle className="size-3" />
                    {step.skillSlug}
                  </Link>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
