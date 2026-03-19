import React from 'react';

interface SourceDisplayProps {
  sources: { title: string; url: string }[];
}

export const SourceDisplay: React.FC<SourceDisplayProps> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-lg p-3 mt-2 text-sm text-[var(--color-text-muted)]">
      <h4 className="font-semibold mb-2 text-white">Fuentes Relacionadas:</h4>
      <ul className="space-y-1">
        {sources.map((source, index) => (
          <li key={index}>
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline">
              {source.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};
