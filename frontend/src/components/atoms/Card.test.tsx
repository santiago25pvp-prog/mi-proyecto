import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders as a div element', () => {
    render(<Card>Test</Card>);
    const card = screen.getByText('Test').closest('div');
    expect(card?.tagName).toBe('DIV');
  });

  it('applies custom className', () => {
    render(<Card className="custom-class">Custom</Card>);
    const card = screen.getByText('Custom').closest('div');
    expect(card?.className).toContain('custom-class');
  });
});
