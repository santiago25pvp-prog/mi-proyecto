import React from 'react';

interface SidebarProps {
  children?: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  return (
    <aside className="w-64 bg-[var(--color-card-bg)] border-r border-[var(--color-card-border)] h-screen flex flex-col p-4">
      <div className="font-bold text-lg mb-4 text-white">Chat History</div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </aside>
  );
};
