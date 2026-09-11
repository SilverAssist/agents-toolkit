import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { instructions } from "@/content";

export function InstructionsIndex() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return instructions;
    return instructions.filter(
      (i) =>
        i.name.toLowerCase().includes(query.toLowerCase()) ||
        i.applyTo?.toLowerCase().includes(query.toLowerCase()) ||
        i.description?.toLowerCase().includes(query.toLowerCase()),
    );
  }, [query]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Instructions</span>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{instructions.length} file-type standards</h1>
        <p className="mt-3 text-muted-foreground">
          Applied automatically by GitHub Copilot and Codex based on the <code>applyTo</code> glob in each file's
          frontmatter — no manual invocation needed. Available as shared references for Claude Code too.
        </p>
      </div>

      <Input
        placeholder="Search instructions…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mt-8 max-w-xs"
      />

      <div className="mt-10 divide-y divide-white/10 rounded-xl border border-white/10 bg-card/60">
        {filtered.map((instruction) => (
          <Link
            key={instruction.slug}
            to={`/instructions/${instruction.slug}`}
            className="group flex flex-col gap-2 p-5 transition hover:bg-white/3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <h3 className="font-medium">{instruction.name}</h3>
              {instruction.description && (
                <p className="mt-1 text-sm text-muted-foreground">{instruction.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 sm:max-w-xs">
              {instruction.applyTo && (
                <code
                  className="truncate rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-muted-foreground"
                  title={instruction.applyTo}
                >
                  {instruction.applyTo}
                </code>
              )}
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
          </Link>
        ))}
        {filtered.length === 0 && <p className="p-16 text-center text-muted-foreground">No instructions match “{query}”.</p>}
      </div>
    </div>
  );
}
