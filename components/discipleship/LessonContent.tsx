'use client';

import ReactMarkdown from 'react-markdown';

export default function LessonContent({ content }: { content: string }) {
  return (
    <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--pf-text)' }}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 style={{ fontFamily: 'var(--pf-serif)', fontWeight: 400, fontSize: 24, color: 'var(--pf-text-bright)', margin: '0 0 12px' }}>{children}</h1>,
          h2: ({ children }) => <h2 style={{ fontFamily: 'var(--pf-serif)', fontWeight: 400, fontSize: 20, color: 'var(--pf-text-bright)', margin: '20px 0 10px' }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontFamily: 'var(--pf-serif)', fontWeight: 400, fontSize: 17, color: 'var(--pf-text-bright)', margin: '16px 0 8px' }}>{children}</h3>,
          p: ({ children }) => <p style={{ margin: '0 0 14px' }}>{children}</p>,
          blockquote: ({ children }) => (
            <blockquote
              style={{
                margin: '16px 0',
                padding: '10px 16px',
                borderLeft: '2px solid var(--pf-gold)',
                background: 'var(--pf-gold-dim)',
                color: 'var(--pf-gold)',
                fontStyle: 'italic',
                fontSize: 14.5,
              }}
            >
              {children}
            </blockquote>
          ),
          strong: ({ children }) => <strong style={{ color: 'var(--pf-text-bright)' }}>{children}</strong>,
          ul: ({ children }) => <ul style={{ margin: '0 0 14px', paddingLeft: 20 }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: '0 0 14px', paddingLeft: 20 }}>{children}</ol>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
