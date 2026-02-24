"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { CitationBadge } from "./CitationBadge";

interface MarkdownRendererProps {
  content: string;
  onCitationClick?: (page: number) => void;
}

export function MarkdownRenderer({ content, onCitationClick }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        a: ({ node, ...props }) => (
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
            {...props}
          />
        ),
        sup: ({ children, ...props }) => {
          const textContent = typeof children === 'string' ? children : Array.isArray(children) ? String(children[0]) : '';
          const citationNumber = textContent ? parseInt(textContent.replace(/[^0-9]/g, ""), 10) : null;

          if (citationNumber && !isNaN(citationNumber) && onCitationClick) {
            return (
              <CitationBadge
                index={citationNumber}
                onClick={() => onCitationClick(citationNumber)}
              />
            );
          }

          return <sup {...props}>{children}</sup>;
        },
        p: ({ children }) => (
          <p className="mb-3 last:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="ml-2">{children}</li>
        ),
        h1: ({ children }) => (
          <h1 className="text-xl font-bold mb-2 mt-4">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-bold mb-2 mt-2">{children}</h3>
        ),
        strong: ({ children }) => (
          <strong className="font-bold">{children}</strong>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-gray-300 pl-3 italic my-3 text-gray-700">
            {children}
          </blockquote>
        ),
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          return isInline ? (
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800" {...props}>{children}</code>
          ) : (
            <code className="block bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-sm font-mono my-3" {...props}>{children}</code>
          );
        },
        pre: ({ children }) => (
          <pre className="my-3">{children}</pre>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
