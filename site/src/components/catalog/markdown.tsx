import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { CodeHighlight } from "@/components/catalog/code-highlight";

// The source templates are our own trusted content (not user input), so parsing embedded
// raw HTML — including the `<!-- -->` review-note comments some skills carry — is safe.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-headings:scroll-mt-24 prose-headings:font-semibold prose-a:text-accent-blue prose-code:font-mono prose-code:text-sm prose-blockquote:border-l-white/20 prose-blockquote:text-muted-foreground prose-strong:text-foreground prose-hr:border-white/10 prose-table:text-sm prose-th:text-left">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={{
          // Fenced blocks own their full presentation below — no double <pre>.
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const language = /language-(\w+)/.exec(className ?? "")?.[1];
            if (!language) {
              return <code className={className}>{children}</code>;
            }
            return (
              <div className="my-4 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 text-sm">
                <CodeHighlight language={language}>{String(children)}</CodeHighlight>
              </div>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
