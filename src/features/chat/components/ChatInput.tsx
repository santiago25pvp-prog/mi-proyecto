import React, { useRef, useEffect } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({ value, onChange, onSend, placeholder = 'Escribe un mensaje...' }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <div className="flex items-end gap-2 p-4 bg-white border-t">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder={placeholder}
        className="w-full max-h-32 overflow-y-auto p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={1}
      />
      <button
        onClick={onSend}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Enviar
      </button>
    </div>
  );
};
