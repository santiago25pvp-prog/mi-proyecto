import React from 'react';
import Link from 'next/link';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 p-4">
        <nav className="flex gap-4">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/docs">Documents</Link>
        </nav>
      </header>
      <main className="flex-grow p-4">{children}</main>
    </div>
  );
}
