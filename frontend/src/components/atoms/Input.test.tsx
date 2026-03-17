import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renders with default styles', () => {
    render(<Input />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('px-3', 'py-2', 'border', 'border-gray-300');
  });

  it('accepts value and onChange', () => {
    const handleChange = vi.fn();
    render(<Input value="test" onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('test');
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  it('can be disabled', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('handles placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText(/enter text/i)).toBeInTheDocument();
  });
});
