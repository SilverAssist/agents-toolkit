import { BookOpen, Compass, Puzzle, Terminal, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { AGENTS, instructions, prompts, skills, TUTORIALS } from "@/content";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = useMemo(
    () => (path: string) => {
      setOpen(false);
      navigate(path);
    },
    [navigate],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full max-w-56 items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-muted-foreground transition hover:border-white/20 hover:text-foreground"
      >
        <span>Search…</span>
        <kbd className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Search agents-toolkit" description="Jump to a skill, prompt, instruction, or agent">
        <Command>
          <CommandInput placeholder="Search skills, prompts, instructions, agents…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Agents">
              {AGENTS.map((agent) => (
                <CommandItem key={agent.slug} onSelect={() => go(`/agents#${agent.slug}`)}>
                  <Users className="size-4" />
                  {agent.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Skills">
              {skills.map((skill) => (
                <CommandItem key={skill.slug} onSelect={() => go(`/skills/${skill.slug}`)}>
                  <Puzzle className="size-4" />
                  {skill.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Prompts / Commands">
              {prompts.map((prompt) => (
                <CommandItem key={prompt.slug} onSelect={() => go(`/prompts/${prompt.slug}`)}>
                  <Terminal className="size-4" />/{prompt.slug}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Instructions">
              {instructions.map((instruction) => (
                <CommandItem key={instruction.slug} onSelect={() => go(`/instructions/${instruction.slug}`)}>
                  <BookOpen className="size-4" />
                  {instruction.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Tutorials">
              {TUTORIALS.map((tutorial) => (
                <CommandItem key={tutorial.slug} onSelect={() => go(`/tutorials/${tutorial.slug}`)}>
                  <Compass className="size-4" />
                  {tutorial.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
