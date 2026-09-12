import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { CodeBlock } from "@/components/catalog/code-block";
import { PromptCard } from "@/components/catalog/prompt-card";
import { SectionHeading } from "@/components/catalog/section-heading";
import { SkillCard } from "@/components/catalog/skill-card";
import { ToneBadge } from "@/components/catalog/tone-badge";
import { Button } from "@/components/ui/button";
import { AGENTS, counts, instructions, meta, prompts, skills, TUTORIALS } from "@/content";
import { trackerTone } from "@/lib/badge-colors";

const WORKFLOW_STEPS = [
  { slug: "analyze-ticket", label: "Analyze", tracker: "Jira" as const },
  { slug: "create-plan", label: "Plan", tracker: "All" as const },
  { slug: "work-ticket", label: "Work", tracker: "Jira" as const },
  { slug: "prepare-pr", label: "Prepare", tracker: "All" as const },
  { slug: "create-pr", label: "Create PR", tracker: "Jira" as const },
  { slug: "finalize-pr", label: "Finalize", tracker: "Jira" as const },
];

const STATS = [
  { label: "Skills", value: counts.skills },
  { label: "Prompts / commands", value: counts.prompts },
  { label: "Instructions", value: counts.instructions },
  { label: "Agents supported", value: 3 },
];

export function Home() {
  const featuredSkills = skills.slice(0, 6);
  const featuredPrompts = prompts.filter((p) => p.category === "Utility").slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
          <span className="mb-6 font-mono text-xs text-muted-foreground">
            {meta.name}@{meta.version}
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            One place for every skill,
            <br />
            prompt, and instruction.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-balance">
            A reference for what's already built into your Claude Code, Copilot, or Codex setup — so you reach for
            an existing skill instead of reinventing it.
          </p>

          <CodeBlock command={`npx ${meta.name}@latest install --claude`} className="mt-10 w-full max-w-lg" />

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/skills">
                Browse the catalog <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/agents">Setup per agent</Link>
            </Button>
          </div>

          <div className="mt-16 flex flex-col items-center gap-4">
            <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Works with</span>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
              {AGENTS.map((agent) => (
                <span key={agent.slug}>{agent.name}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="relative grid grid-cols-2 divide-x divide-white/10 border-t border-white/10 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 border-b border-white/10 py-8 sm:border-b-0">
              <span className="font-mono text-3xl font-semibold">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 01 The workflow */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHeading
          index="01"
          label="The lifecycle"
          title="One prompt per phase. Model tier pinned per step."
          description="The Jira workflow chains six prompts from ticket to merged PR. A parallel set covers GitHub Issues. Each prompt carries its own hardcoded model: pin, so mechanical steps stay cheap and design steps get the smart tier."
        />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {WORKFLOW_STEPS.map((step, i) => {
            const prompt = prompts.find((p) => p.slug === step.slug);
            return (
              <Link
                key={step.slug}
                to={`/prompts/${step.slug}`}
                className="group relative flex flex-col gap-2 rounded-lg border border-white/10 bg-card/60 p-4 transition hover:border-white/20 hover:bg-card"
              >
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                <span className="font-mono text-sm font-medium">/{step.slug}</span>
                <span className="text-xs text-muted-foreground">{step.label}</span>
                {prompt?.modelTier && (
                  <ToneBadge tone={step.tracker === "All" ? "teal" : trackerTone(step.tracker)} className="mt-1 w-fit">
                    {prompt.modelTier}
                  </ToneBadge>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* 02 The catalog */}
      <section className="border-t border-white/10 bg-black/20">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading
            index="02"
            label="The catalog"
            title={`${counts.skills} skills covering the stack`}
            description="Specialized knowledge guides, not one-shot prompts — component architecture, WordPress scaffolding, PR review, caching strategy, SEO. Reach for one by name or let the model pull it in."
            action={
              <Button asChild variant="outline">
                <Link to="/skills">
                  View all skills <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredSkills.map((skill) => (
              <SkillCard key={skill.slug} skill={skill} />
            ))}
          </div>
        </div>
      </section>

      {/* 03 Utility prompts */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <SectionHeading
          index="03"
          label="Utility prompts"
          title="Drop-in commands for everyday work"
          description="Outside the ticket-to-PR pipeline: quick reviews, test scaffolding, WordPress component generation, AI-search audits."
          action={
            <Button asChild variant="outline">
              <Link to="/prompts">
                View all prompts <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {featuredPrompts.map((prompt) => (
            <PromptCard key={prompt.slug} prompt={prompt} />
          ))}
        </div>
      </section>

      {/* 04 Instructions */}
      <section className="border-t border-white/10 bg-black/20">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading
            index="04"
            label="Instructions"
            title="Applied automatically, by file glob"
            description="Copilot and Codex apply these to every matching file with no manual invocation — TypeScript, React, caching, PHP, testing, and more."
            action={
              <Button asChild variant="outline">
                <Link to="/instructions">
                  View all instructions <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
          />
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {instructions.slice(0, 6).map((instruction) => (
              <Link
                key={instruction.slug}
                to={`/instructions/${instruction.slug}`}
                className="group flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-card/60 p-4 transition hover:border-white/20 hover:bg-card"
              >
                <div className="min-w-0">
                  <h3 className="font-medium">{instruction.name}</h3>
                  {instruction.applyTo && (
                    <code
                      className="mt-1 block truncate text-xs text-muted-foreground"
                      title={instruction.applyTo}
                    >
                      {instruction.applyTo}
                    </code>
                  )}
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 05 Tutorials */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading
            index="05"
            label="Tutorials"
            title="Worked examples, not just reference"
            description="The catalog explains each piece in isolation. These chain them together for a real outcome — ticket to merged PR, a scaffolded plugin, a review pass that leaves nothing for a human reviewer to catch."
            action={
              <Button asChild variant="outline">
                <Link to="/tutorials">
                  View all tutorials <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {TUTORIALS.slice(0, 3).map((tutorial) => (
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
                  <h3 className="mt-4 text-base font-medium">{tutorial.title}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{tutorial.summary}</p>
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
      </section>

      {/* 06 Agents */}
      <section className="border-t border-white/10 bg-black/20">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading
            index="06"
            label="Built for three agents"
            title="Same source, three install targets"
            description="Skills, prompts, and instructions live once under templates/shared/ and install into whichever agent you target — file layout and conventions adapted per agent."
            action={
              <Button asChild variant="outline">
                <Link to="/agents">
                  Compare agents <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {AGENTS.map((agent) => (
              <Link
                key={agent.slug}
                to={`/agents#${agent.slug}`}
                className="group flex flex-col gap-3 rounded-xl border border-white/10 bg-card/60 p-5 transition hover:border-white/20 hover:bg-card"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-white/10 font-mono text-sm">
                  {agent.initials}
                </div>
                <h3 className="font-medium">{agent.name}</h3>
                <p className="text-sm text-muted-foreground">{agent.tagline}</p>
                <code className="mt-2 block text-xs text-muted-foreground">{agent.rootFile}</code>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
