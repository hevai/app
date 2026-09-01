import { memo, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";

function CodeBlock({ language, code }: { language: string; code: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const timeout = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeout.current !== null) window.clearTimeout(timeout.current);
    };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timeout.current !== null) window.clearTimeout(timeout.current);
      timeout.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="md-code">
      <div className="md-code-bar">
        <span>{language || t("md.code")}</span>
        <button type="button" onClick={() => void copy()} aria-label={t("md.copyCode")} title={t("md.copyCode")}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Markdown({ content }: { content: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: ({ className, children, ...props }) => {
            const text = String(children).replace(/\n$/, "");
            const match = /language-(\w+)/.exec(className ?? "");
            if (!match && !text.includes("\n")) {
              return (
                <code className="md-inline" {...props}>
                  {children}
                </code>
              );
            }
            return <CodeBlock language={match?.[1] ?? ""} code={text} />;
          },
          a: ({ href, children }) =>
            href ? (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          img: ({ src, alt }) =>
            src ? <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" /> : null,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownRenderer = memo(Markdown);
export default MarkdownRenderer;
