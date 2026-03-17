import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea: React.FC<TextareaProps> = ({ 
  className = '', 
  error = false,
  ...props 
}) => {
  return (
    <textarea 
      className={`
        px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200
        resize-none text-base leading-relaxed
        ${error 
          ? 'border-red-500 focus:ring-red-500 bg-red-50' 
          : 'border-gray-300 focus:ring-blue-500 bg-white'
        }
        ${props.disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
        ${className}
      `}
      style={{ fontSize: '16px' }}
      {...props}
    />
  );
};
