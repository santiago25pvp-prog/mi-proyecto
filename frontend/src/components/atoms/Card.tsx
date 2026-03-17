import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white shadow-md rounded-lg p-6 border border-gray-100 ${className}`}>
      {children}
    </div>
  );
};
