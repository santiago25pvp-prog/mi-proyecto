import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/render';
import userEvent from '@testing-library/user-event';
import { ChatWindow } from './ChatWindow';
import '../../test/setup';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ChatWindow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem = vi.fn().mockReturnValue('mock-token');
  });

  it('renders chat window with empty state message', () => {
    render(<ChatWindow />);
    expect(screen.getByText(/¡Hola! ¿En qué te ayudo\?/i)).toBeInTheDocument();
  });

  it('renders input field and send button', () => {
    render(<ChatWindow />);
    expect(screen.getByPlaceholderText(/Escribe tu pregunta aquí.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar/i })).toBeInTheDocument();
  });

  it('updates input value on change', async () => {
    const user = userEvent.setup();
    render(<ChatWindow />);
    
    const input = screen.getByPlaceholderText(/Escribe tu pregunta aquí.../i);
    await user.type(input, 'Hello world');
    
    expect(input).toHaveValue('Hello world');
  });

  it('sends message on button click', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ answer: 'Hello back' })
    });

    render(<ChatWindow />);
    
    const input = screen.getByPlaceholderText(/Escribe tu pregunta aquí.../i);
    await user.type(input, 'Hello');
    
    const button = screen.getByRole('button', { name: /enviar/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/chat',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ query: 'Hello' })
        })
      );
    });
  });

  it('displays user message after sending', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ answer: 'Response' })
    });

    render(<ChatWindow />);
    
    const input = screen.getByPlaceholderText(/Escribe tu pregunta aquí.../i);
    await user.type(input, 'My question');
    
    const button = screen.getByRole('button', { name: /enviar/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('My question')).toBeInTheDocument();
    });
  });

  it('displays assistant response after receiving', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ answer: 'This is the AI response' })
    });

    render(<ChatWindow />);
    
    const input = screen.getByPlaceholderText(/Escribe tu pregunta aquí.../i);
    await user.type(input, 'Question?');
    
    const button = screen.getByRole('button', { name: /enviar/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('This is the AI response')).toBeInTheDocument();
    });
  });

  it('clears input after sending message', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ answer: 'Response' })
    });

    render(<ChatWindow />);
    
    const input = screen.getByPlaceholderText(/Escribe tu pregunta aquí.../i);
    await user.type(input, 'Test message');
    
    const button = screen.getByRole('button', { name: /enviar/i });
    await user.click(button);

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('shows loading state while fetching', async () => {
    const user = userEvent.setup();
    
    // Create a promise that we can control
    let resolveFetch: (value: any) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    
    mockFetch.mockReturnValue(fetchPromise);

    render(<ChatWindow />);
    
    const input = screen.getByPlaceholderText(/Escribe tu pregunta aquí.../i);
    await user.type(input, 'Question');
    
    const button = screen.getByRole('button', { name: /enviar/i });
    await user.click(button);

    expect(screen.getByText(/Enviando/i)).toBeInTheDocument();
    
    // Resolve the fetch
    resolveFetch!({
      ok: true,
      json: async () => ({ answer: 'Done' })
    });
  });

  it('handles API error gracefully', async () => {
    const user = userEvent.setup();
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ChatWindow />);
    
    const input = screen.getByPlaceholderText(/Escribe tu pregunta aquí.../i);
    await user.type(input, 'Question');
    
    const button = screen.getByRole('button', { name: /enviar/i });
    await user.click(button);

    // Component doesn't render error text, check if button is re-enabled
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it('does not send empty message', async () => {
    const user = userEvent.setup();
    render(<ChatWindow />);
    
    const button = screen.getByRole('button', { name: /enviar/i });
    await user.click(button);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sends message on Enter key press', async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ answer: 'Response' })
    });

    render(<ChatWindow />);
    
    const input = screen.getByPlaceholderText(/Escribe tu pregunta aquí.../i);
    await user.type(input, 'Question{Enter}');

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});
