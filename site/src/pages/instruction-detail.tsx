import { Navigate, useParams } from "react-router-dom";
import { Markdown } from "@/components/catalog/markdown";
import { instructions } from "@/content";

export function InstructionDetail() {
  const { slug } = useParams();
  const instruction = instructions.find((i) => i.slug === slug);

  if (!instruction) return <Navigate to="/instructions" replace />;

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_280px]">
      <article>
        {instruction.applyTo && (
          <code className="inline-block rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-muted-foreground">
            {instruction.applyTo}
          </code>
        )}
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{instruction.name}</h1>
        {instruction.description && <p className="mt-3 text-lg text-muted-foreground">{instruction.description}</p>}
        <div className="mt-10 border-t border-white/10 pt-10">
          <Markdown>{instruction.body}</Markdown>
        </div>
      </article>

      <aside className="h-fit space-y-6 lg:sticky lg:top-24">
        <div className="rounded-xl border border-white/10 bg-card/60 p-4">
          <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Installs to</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <span className="text-foreground">Copilot / Codex</span> — <code>.github/instructions/{instruction.slug}.instructions.md</code>
            </li>
            <li>
              <span className="text-foreground">Claude Code</span> — shared reference via <code>.github/instructions/</code>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
