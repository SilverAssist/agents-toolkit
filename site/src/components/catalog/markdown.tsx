import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

// The source templates are our own trusted content (not user input), so parsing embedded
// raw HTML — including the `<!-- -->` review-note comments some skills carry — is safe.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-headings:scroll-mt-24 prose-headings:font-semibold prose-a:text-accent-blue prose-code:font-mono prose-code:text-sm prose-pre:border prose-pre:border-white/10 prose-pre:bg-black/40 prose-blockquote:border-l-white/20 prose-blockquote:text-muted-foreground prose-strong:text-foreground prose-hr:border-white/10 prose-table:text-sm prose-th:text-left">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSlug]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
