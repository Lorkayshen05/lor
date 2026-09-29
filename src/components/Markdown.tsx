import Link from "next/link";
import ReactMarkdown from "react-markdown";

/** react-markdown does not render raw HTML, so article bodies can't inject markup. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-content">
      <ReactMarkdown
        components={{
          a({ href, children }) {
            if (href?.startsWith("/")) return <Link href={href}>{children}</Link>;
            if (href && /^https?:\/\//.test(href)) return <a href={href} rel="nofollow noopener noreferrer" target="_blank">{children}</a>;
            return <>{children}</>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
