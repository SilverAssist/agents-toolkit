import { CodeBlock } from "@/components/catalog/code-block";
import { Separator } from "@/components/ui/separator";
import { AGENTS } from "@/content";

export function AgentsIndex() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Agents</span>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">One source, three install targets</h1>
        <p className="mt-3 text-muted-foreground">
          Skills, prompts, and instructions live once under <code>templates/shared/</code> in the package and get
          installed into whichever agent you target, with file layout and model-pin behavior adapted per agent.
        </p>
      </div>

      <div className="mt-16 space-y-24">
        {AGENTS.map((agent, i) => (
          <section key={agent.slug} id={agent.slug} className="scroll-mt-24">
            <div className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-sm">
                {agent.initials}
              </div>
              <div>
                <span className="font-mono text-xs text-muted-foreground">Agent 0{i + 1}</span>
                <h2 className="text-2xl font-semibold">{agent.name}</h2>
              </div>
            </div>
            <p className="mt-4 max-w-2xl text-muted-foreground">{agent.tagline}</p>

            <CodeBlock command={agent.installCommand} className="mt-6 max-w-xl" />

            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div>
                <h3 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  Root file — {agent.rootFile}
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">{agent.rootFileDescription}</p>

                <h3 className="mt-6 font-mono text-xs tracking-widest text-muted-foreground uppercase">Model pins</h3>
                <p className="mt-3 text-sm text-muted-foreground">{agent.modelPins}</p>

                <h3 className="mt-6 font-mono text-xs tracking-widest text-muted-foreground uppercase">Notes</h3>
                <ul className="mt-3 list-disc space-y-2 pl-4 text-sm text-muted-foreground">
                  {agent.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>

              <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-relaxed text-muted-foreground">
                {agent.tree}
              </pre>
            </div>

            {i < AGENTS.length - 1 && <Separator className="mt-16" />}
          </section>
        ))}
      </div>
    </div>
  );
}
