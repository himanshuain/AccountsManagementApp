'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
        gcTime: 1000 * 60 * 30, // 30 minutes - cache time
        refetchOnWindowFocus: false, // Don't refetch on tab focus
        refetchOnMount: false, // Don't refetch if data exists
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export default QueryProvider;

