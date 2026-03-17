import React from 'react';
import { Button } from '../atoms/Button';

interface DocItemProps {
  title: string;
  type: string;
  onView: () => void;
}

export const DocItem: React.FC<DocItemProps> = ({ title, type, onView }) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50">
      <div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <span className="text-xs text-gray-500 uppercase">{type}</span>
      </div>
      <Button variant="outline" onClick={onView} className="text-xs py-1">View</Button>
    </div>
  );
};
