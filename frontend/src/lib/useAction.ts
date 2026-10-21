// Runs one button-click action (save, delete, ...) and keeps track of
// "is it running?" and "did it fail?" so the page can show a spinner and an error.

import { useCallback, useState } from 'react';
import { errorMessage } from './api';

export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T>(task: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true);
    setError(null);
    try {
      return await task();
    } catch (err) {
      setError(errorMessage(err));
      return undefined; // the caller checks for undefined to know it failed
    } finally {
      setBusy(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);
  const fail = useCallback((message: string) => setError(message), []);

  return { busy, error, run, clearError, fail };
}