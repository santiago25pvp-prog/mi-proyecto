import React from 'react';

interface MessageBubbleProps {
  message: string;
  isUser: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isUser }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`
          max-w-[80%] px-5 py-4 rounded-2xl text-[15px] leading-relaxed shadow-sm
          ${isUser 
            ? 'bg-blue-600 text-white rounded-tr-none' 
            : 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700'
          }
        `}
      >
        {message}
      </div>
    </div>
  );
};
