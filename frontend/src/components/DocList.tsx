import React from 'react';
import { FileText } from 'lucide-react';

interface Doc {
  id: string;
  title: string;
}

interface DocListProps {
  docs: Doc[];
}

export default function DocList({ docs }: DocListProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Documents</h2>
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center gap-2 p-2 border rounded">
          <FileText size={16} />
          <span>{doc.title}</span>
        </div>
      ))}
    </div>
  );
}
