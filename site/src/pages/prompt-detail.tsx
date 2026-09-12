import { Navigate, useParams } from "react-router-dom";
import { Markdown } from "@/components/catalog/markdown";
import { ToneBadge } from "@/components/catalog/tone-badge";
import { prompts } from "@/content";
import { categoryTone, modelTierTone, trackerTone } from "@/lib/badge-colors";

export function PromptDetail() {
  const { slug } = useParams();
  const prompt = prompts.find((p) => p.slug === slug);

  if (!prompt) return <Navigate to="/prompts" replace />;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_280px]">
      <article>
        <div className="flex flex-wrap gap-2">
          <ToneBadge tone={categoryTone(prompt.category)}>{prompt.category}</ToneBadge>
          <ToneBadge tone={trackerTone(prompt.tracker)}>{prompt.tracker}</ToneBadge>
          {prompt.modelTier && <ToneBadge tone={modelTierTone(prompt.modelTier)}>{prompt.modelTier} tier</ToneBadge>}
        </div>
        <h1 className="mt-4 font-mono text-3xl font-semibold sm:text-4xl">/{prompt.slug}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{prompt.description}</p>
        <div className="mt-10 border-t border-white/10 pt-10">
          <Markdown>{prompt.body}</Markdown>
        </div>
      </article>

      <aside className="h-fit space-y-6 lg:sticky lg:top-24">
        <div className="rounded-xl border border-white/10 bg-card/60 p-4">
          <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Metadata</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Model</dt>
              <dd className="font-mono">{prompt.model ?? "—"}</dd>
            </div>
            {prompt.claudeModel && (
              <div>
                <dt className="text-muted-foreground">Claude alias</dt>
                <dd className="font-mono">{prompt.claudeModel}</dd>
              </div>
            )}
            {prompt.variables.length > 0 && (
              <div>
                <dt className="text-muted-foreground">Variables</dt>
                <dd className="font-mono">{prompt.variables.join(", ")}</dd>
              </div>
            )}
            {prompt.tools.length > 0 && (
              <div>
                <dt className="text-muted-foreground">Tools</dt>
                <dd className="font-mono text-xs">{prompt.tools.join(", ")}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-xl border border-white/10 bg-card/60 p-4">
          <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Run it</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <span className="text-foreground">Claude Code</span> — <code className="break-all">/{prompt.slug}</code>
            </li>
            <li>
              <span className="text-foreground">Copilot</span> — Run Prompt → {prompt.slug}
            </li>
            <li>
              <span className="text-foreground">Codex</span> — installed to{" "}
              <code className="break-all">.github/prompts/</code>, point the session at it
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
