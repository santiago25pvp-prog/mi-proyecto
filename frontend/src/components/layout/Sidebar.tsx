import React, { useState } from 'react';
import { Button } from '../atoms/Button';
import { ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';

const mockChats = [
  { id: '1', title: '¿Cómo funciona la API?' },
  { id: '2', title: 'Configuración inicial' },
  { id: '3', title: 'Error en base de datos' },
];

export const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside className={`${isOpen ? 'w-64' : 'w-16'} bg-gray-900 text-white transition-all duration-300 h-screen flex flex-col border-r border-gray-700`}>
      <div className="p-4 flex items-center justify-between">
        {isOpen && <h2 className="font-bold">Historial</h2>}
        <Button 
          variant="secondary" 
          className="p-2" 
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </Button>
      </div>
      
      {isOpen && (
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-2">
            {mockChats.map((chat) => (
              <li key={chat.id} className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded cursor-pointer">
                <MessageSquare size={16} />
                <span className="truncate">{chat.title}</span>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </aside>
  );
};
