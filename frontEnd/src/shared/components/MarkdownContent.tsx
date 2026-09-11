import DOMPurify from 'dompurify';
import { marked } from 'marked';
import type { CSSProperties } from 'react';

const MARKDOWN_OPTIONS = {
  gfm: true,
  breaks: true,
} as const;

export function renderSafeMarkdown(content: string): string {
  const rawHtml = marked.parse(content, MARKDOWN_OPTIONS) as string;

  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'option'],
    FORBID_ATTR: ['style'],
  });
}

interface MarkdownContentProps {
  content: string;
  className?: string;
  style?: CSSProperties;
}

export default function MarkdownContent({ content, className, style }: MarkdownContentProps) {
  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(content) }}
    />
  );
}
