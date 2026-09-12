import { Boxes, Menu } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { CommandMenu } from "@/components/site/command-menu";
import { GitHubIcon } from "@/components/site/github-icon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { meta } from "@/content";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { to: "/skills", label: "Skills" },
  { to: "/prompts", label: "Prompts" },
  { to: "/instructions", label: "Instructions" },
  { to: "/tutorials", label: "Tutorials" },
  { to: "/agents", label: "Agents" },
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <NavLink to="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <Boxes className="size-5 text-accent-blue" />
          <span>agents-toolkit</span>
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground",
                  isActive && "bg-white/5 text-foreground",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <div className="hidden lg:block">
            <CommandMenu />
          </div>
          <Button variant="ghost" size="icon" asChild>
            <a href={meta.repository} target="_blank" rel="noreferrer" aria-label="GitHub repository">
              <GitHubIcon className="size-4" />
            </a>
          </Button>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>agents-toolkit</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground",
                      isActive && "bg-white/5 text-foreground",
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <a
                href={meta.repository}
                target="_blank"
                rel="noreferrer"
                className="mt-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground"
              >
                GitHub
              </a>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
