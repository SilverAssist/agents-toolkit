import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const Home = lazy(() => import("@/pages/home").then((m) => ({ default: m.Home })));
const SkillsIndex = lazy(() => import("@/pages/skills-index").then((m) => ({ default: m.SkillsIndex })));
const SkillDetail = lazy(() => import("@/pages/skill-detail").then((m) => ({ default: m.SkillDetail })));
const PromptsIndex = lazy(() => import("@/pages/prompts-index").then((m) => ({ default: m.PromptsIndex })));
const PromptDetail = lazy(() => import("@/pages/prompt-detail").then((m) => ({ default: m.PromptDetail })));
const InstructionsIndex = lazy(() =>
  import("@/pages/instructions-index").then((m) => ({ default: m.InstructionsIndex })),
);
const InstructionDetail = lazy(() =>
  import("@/pages/instruction-detail").then((m) => ({ default: m.InstructionDetail })),
);
const AgentsIndex = lazy(() => import("@/pages/agents-index").then((m) => ({ default: m.AgentsIndex })));
const TutorialsIndex = lazy(() => import("@/pages/tutorials-index").then((m) => ({ default: m.TutorialsIndex })));
const TutorialDetail = lazy(() => import("@/pages/tutorial-detail").then((m) => ({ default: m.TutorialDetail })));
const NotFound = lazy(() => import("@/pages/not-found").then((m) => ({ default: m.NotFound })));

export default function App() {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="bg-grid flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/skills" element={<SkillsIndex />} />
              <Route path="/skills/:slug" element={<SkillDetail />} />
              <Route path="/prompts" element={<PromptsIndex />} />
              <Route path="/prompts/:slug" element={<PromptDetail />} />
              <Route path="/instructions" element={<InstructionsIndex />} />
              <Route path="/instructions/:slug" element={<InstructionDetail />} />
              <Route path="/agents" element={<AgentsIndex />} />
              <Route path="/tutorials" element={<TutorialsIndex />} />
              <Route path="/tutorials/:slug" element={<TutorialDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        <SiteFooter />
      </div>
      <Toaster />
    </TooltipProvider>
  );
}
