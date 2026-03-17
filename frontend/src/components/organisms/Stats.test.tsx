import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stats } from './Stats';
import { createTestWrapper } from '../../test/setup';

// Mock useQuery
vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(),
  };
});

import { useQuery } from '@tanstack/react-query';

const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;

describe('Stats Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem = vi.fn().mockReturnValue('mock-token');
  });

  it('renders stats with data', () => {
    mockUseQuery.mockReturnValue({
      data: {
        docCount: 10,
        requestCount: 150,
        userCount: 5
      },
      isLoading: false,
      error: null
    });
    
    const TestWrapper = createTestWrapper();
    render(<Stats />, { wrapper: TestWrapper });
    
    expect(screen.getByText('10')).toBeInTheDocument(); // Documents
    expect(screen.getByText('150')).toBeInTheDocument(); // Requests
    expect(screen.getByText('5')).toBeInTheDocument(); // Users
  });

  it('renders all stat labels', () => {
    mockUseQuery.mockReturnValue({
      data: { docCount: 0, requestCount: 0 },
      isLoading: false,
      error: null
    });
    
    const TestWrapper = createTestWrapper();
    render(<Stats />, { wrapper: TestWrapper });
    
    expect(screen.getByText('Documentos')).toBeInTheDocument();
    expect(screen.getByText('Consultas')).toBeInTheDocument();
  });

  it('displays section header', () => {
    mockUseQuery.mockReturnValue({
      data: { docCount: 0, requestCount: 0 },
      isLoading: false,
      error: null
    });
    
    const TestWrapper = createTestWrapper();
    render(<Stats />, { wrapper: TestWrapper });
    expect(screen.getByText('Estadísticas del Sistema')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    });
    
    const TestWrapper = createTestWrapper();
    render(<Stats />, { wrapper: TestWrapper });
    expect(screen.getByText(/cargando estadísticas/i)).toBeInTheDocument();
  });

  it('displays error state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch')
    });
    
    const TestWrapper = createTestWrapper();
    render(<Stats />, { wrapper: TestWrapper });
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  it('handles missing userCount gracefully', () => {
    mockUseQuery.mockReturnValue({
      data: { docCount: 5, requestCount: 50 },
      isLoading: false,
      error: null
    });
    
    const TestWrapper = createTestWrapper();
    render(<Stats />, { wrapper: TestWrapper });
    
    // Should still render without crashing
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    // UserCount should not be present
    expect(screen.queryByText(/usuarios/i)).not.toBeInTheDocument();
  });

  it('renders icons for each stat', () => {
    mockUseQuery.mockReturnValue({
      data: { docCount: 1, requestCount: 1 },
      isLoading: false,
      error: null
    });
    
    const TestWrapper = createTestWrapper();
    render(<Stats />, { wrapper: TestWrapper });
    
    // Check for emoji icons
    expect(screen.getByText('📄')).toBeInTheDocument();
    expect(screen.getByText('💬')).toBeInTheDocument();
  });
});
