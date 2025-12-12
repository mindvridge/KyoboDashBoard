'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { TestDeviceFilterProvider } from '@/contexts/TestDeviceFilterContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <TestDeviceFilterProvider>{children}</TestDeviceFilterProvider>
    </AuthProvider>
  );
}
