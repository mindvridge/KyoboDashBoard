'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TestDeviceFilterContextType {
  showTestDevices: boolean;
  setShowTestDevices: (show: boolean) => void;
}

const TestDeviceFilterContext = createContext<TestDeviceFilterContextType | undefined>(undefined);

const STORAGE_KEY = 'showTestDevices';

export function TestDeviceFilterProvider({ children }: { children: ReactNode }) {
  const [showTestDevices, setShowTestDevicesState] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // localStorage에서 초기값 로드
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setShowTestDevicesState(stored === 'true');
    }
    setIsInitialized(true);
  }, []);

  // 상태 변경 시 localStorage에 저장
  const setShowTestDevices = (show: boolean) => {
    setShowTestDevicesState(show);
    localStorage.setItem(STORAGE_KEY, String(show));
  };

  // 초기화 전에는 기본값 사용
  if (!isInitialized) {
    return (
      <TestDeviceFilterContext.Provider value={{ showTestDevices: false, setShowTestDevices }}>
        {children}
      </TestDeviceFilterContext.Provider>
    );
  }

  return (
    <TestDeviceFilterContext.Provider value={{ showTestDevices, setShowTestDevices }}>
      {children}
    </TestDeviceFilterContext.Provider>
  );
}

export function useTestDeviceFilter() {
  const context = useContext(TestDeviceFilterContext);
  if (context === undefined) {
    throw new Error('useTestDeviceFilter must be used within a TestDeviceFilterProvider');
  }
  return context;
}
