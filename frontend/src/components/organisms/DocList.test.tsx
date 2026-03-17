import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/render';
import userEvent from '@testing-library/user-event';
import { DocList } from './DocList';
import '../../test/setup';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock useQuery
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn()
    }))
  };
});

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;
const mockUseMutation = useMutation as ReturnType<typeof vi.fn>;
const mockUseQueryClient = useQueryClient as ReturnType<typeof vi.fn>;

describe('DocList Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem = vi.fn().mockReturnValue('mock-token');
    
    // Default mock implementations
    mockUseQuery.mockImplementation(({ queryKey }) => {
      if (queryKey[0] === 'admin-documents') {
        return {
          data: [
            { id: '1', name: 'doc1.pdf', created_at: '2024-01-01' },
            { id: '2', name: 'doc2.pdf', created_at: '2024-01-02' }
          ],
          isLoading: false,
          error: null
        };
      }
      return { data: undefined, isLoading: false, error: null };
    });
    
    mockUseMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
    
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: vi.fn()
    } as any);
  });

  it('renders document list with documents', () => {
    render(<DocList />);
    
    expect(screen.getByText('doc1.pdf')).toBeInTheDocument();
    expect(screen.getByText('doc2.pdf')).toBeInTheDocument();
  });

  it('displays document count', () => {
    render(<DocList />);
    expect(screen.getByText(/2 cargados/)).toBeInTheDocument();
  });

  it('displays empty state when no documents', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    });
    
    render(<DocList />);
    expect(screen.getByText(/No hay documentos subidos aún./i)).toBeInTheDocument();
  });

  it('renders section header', () => {
    render(<DocList />);
    expect(screen.getByText('Documentos')).toBeInTheDocument();
  });

  it('shows delete buttons for each document', () => {
    render(<DocList />);
    
    const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i });
    expect(deleteButtons).toHaveLength(2);
  });

  it('displays loading state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    });
    
    render(<DocList />);
    expect(screen.getByText(/cargando documentos/i)).toBeInTheDocument();
  });

  it('displays error state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load')
    });
    
    render(<DocList />);
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  it('displays empty state when no documents', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null
    });
    
    render(<DocList />);
    expect(screen.getByText(/no hay documentos/i)).toBeInTheDocument();
  });

  it('displays formatted date for each document', () => {
    render(<DocList />);
    
    // Check that dates are rendered (formatted as Jan 1, 2024)
    expect(screen.getByText(/ene/i)).toBeInTheDocument();
  });
});
