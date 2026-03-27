'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextValue {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  exiting: boolean;
}

const TYPE_STYLES: Record<ToastType, string> = {
  success: 'bg-correct-bg text-correct-text border-correct-border',
  error: 'bg-wrong-bg text-wrong-text border-wrong-border',
  info: 'bg-info-bg text-info-text border-border-light',
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps): React.ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

    // Start exit after 2.7s, remove after 3s
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    }, 2700);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 left-1/2 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg text-sm font-medium shadow-sm border pointer-events-auto -translate-x-1/2 whitespace-nowrap ${TYPE_STYLES[toast.type]}`}
            style={{
              animation: toast.exiting ? 'toastOut 200ms ease-in forwards' : 'toastIn 200ms ease-out forwards',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
