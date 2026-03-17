import React from 'react';
import { Card } from '../atoms/Card';

interface StatCardProps {
  label: string;
  value: string | number;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value }) => {
  return (
    <Card className="flex flex-col items-center justify-center p-4">
      <h3 className="text-sm text-gray-500 font-medium mb-1">{label}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </Card>
  );
};
