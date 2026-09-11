import { Navigate, useParams } from "react-router-dom";
import { Markdown } from "@/components/catalog/markdown";
import { ToneBadge } from "@/components/catalog/tone-badge";
import { skills } from "@/content";
import { skillGroupTone } from "@/lib/badge-colors";

export function SkillDetail() {
  const { slug } = useParams();
  const skill = skills.find((s) => s.slug === slug);

  if (!skill) return <Navigate to="/skills" replace />;

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_280px]">
      <article>
        <ToneBadge tone={skillGroupTone(skill.group)}>{skill.group}</ToneBadge>
        <h1 className="mt-4 font-mono text-3xl font-semibold sm:text-4xl">{skill.name}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{skill.description}</p>
        <div className="mt-10 border-t border-white/10 pt-10">
          <Markdown>{skill.body}</Markdown>
        </div>
      </article>

      <aside className="h-fit space-y-6 lg:sticky lg:top-24">
        <div className="rounded-xl border border-white/10 bg-card/60 p-4">
          <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Metadata</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Slug</dt>
              <dd className="font-mono">{skill.slug}</dd>
            </div>
            {skill.model && (
              <div>
                <dt className="text-muted-foreground">Model pin</dt>
                <dd className="font-mono">{skill.model}</dd>
              </div>
            )}
            {skill.argumentHint && (
              <div>
                <dt className="text-muted-foreground">Argument hint</dt>
                <dd className="font-mono">{skill.argumentHint}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-xl border border-white/10 bg-card/60 p-4">
          <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Installs to</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <span className="text-foreground">Claude Code</span> — <code>.claude/skills/{skill.slug}</code>
            </li>
            <li>
              <span className="text-foreground">Copilot</span> — <code>.github/skills/{skill.slug}</code>
            </li>
            <li>
              <span className="text-foreground">Codex</span> — <code>.github/skills/{skill.slug}</code>
            </li>
            <li className="border-t border-white/10 pt-2">
              Canonical: <code>.agents/skills/{skill.slug}</code>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
