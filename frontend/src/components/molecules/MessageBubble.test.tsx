import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from './MessageBubble';

describe('MessageBubble', () => {
  it('renders user message with correct alignment', () => {
    render(<MessageBubble message="Hello" isUser={true} />);
    const bubble = screen.getByText('Hello').parentElement;
    expect(bubble?.className).toContain('justify-end');
  });

  it('renders assistant message with correct alignment', () => {
    render(<MessageBubble message="Hi there" isUser={false} />);
    const bubble = screen.getByText('Hi there').parentElement;
    expect(bubble?.className).toContain('justify-start');
  });

  it('displays the message content', () => {
    render(<MessageBubble message="Test message" isUser={true} />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });
});
