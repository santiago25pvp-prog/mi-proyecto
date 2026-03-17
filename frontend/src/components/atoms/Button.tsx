import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyles = 'px-4 py-2 rounded-md font-medium transition-colors duration-200';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      {...props} 
    />
  );
};
