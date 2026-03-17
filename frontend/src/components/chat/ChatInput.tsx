import React, { useState } from 'react';
import { Textarea } from '../atoms/Textarea';
import { Button } from '../atoms/Button';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="flex gap-2 p-4 border-t border-gray-700 bg-gray-900">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your question..."
        className="flex-grow bg-gray-800 text-white border-gray-600 focus:ring-blue-500"
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />
      <Button 
        onClick={handleSend} 
        disabled={disabled || !input.trim()}
      >
        Send
      </Button>
    </div>
  );
};
