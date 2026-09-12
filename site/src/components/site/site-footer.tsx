import { Boxes } from "lucide-react";
import { Link } from "react-router-dom";
import { CodeBlock } from "@/components/catalog/code-block";
import { meta } from "@/content";

const COLUMNS = [
  {
    title: "Catalog",
    links: [
      { to: "/skills", label: "Skills" },
      { to: "/prompts", label: "Prompts / Commands" },
      { to: "/instructions", label: "Instructions" },
      { to: "/tutorials", label: "Tutorials" },
    ],
  },
  {
    title: "Setup",
    links: [
      { to: "/agents#claude", label: "Claude Code" },
      { to: "/agents#copilot", label: "GitHub Copilot" },
      { to: "/agents#codex", label: "Codex" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2 font-semibold">
              <Boxes className="size-5 text-accent-blue" />
              agents-toolkit
            </div>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">{meta.description}</p>
            <CodeBlock command={`npx ${meta.name}@latest install`} className="mt-4 max-w-sm" />
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">{col.title}</h4>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-muted-foreground transition hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {meta.name}@{meta.version}
          </span>
          <a href={meta.repository} target="_blank" rel="noreferrer" className="hover:text-foreground">
            {meta.repository?.replace("https://", "")}
          </a>
        </div>
      </div>
    </footer>
  );
}
