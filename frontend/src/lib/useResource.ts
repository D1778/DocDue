// A small hook that loads data for a page.
//
//   const { data, error, loading, reload } = useResource('list:' + filters, () => api.listDocuments(...));
//
// * `key` describes WHAT is loaded. When the key changes, the data is loaded again.
// * `data` is undefined until the first load finishes.
// * `loading` is true only while a NEW key is loading (old data stays visible meanwhile).
// * `pollMs` (optional) says how many ms to wait before refreshing in the background,
//   or null to stop. Used to watch documents that are still being read by OCR.
// * `reload()` loads again; `mutate(value)` replaces the data right away
//   (and keeps background refreshing going if the new data needs it).

import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from './api';

interface State<T> {
    key: string | null;
    data: T | undefined;
    error: string | null;
}

export function useResource<T>(
    key: string,
    fetcher: () => Promise<T>,
    pollMs?: (data: T) => number | null,
) {
    const [state, setState] = useState<State<T>>({ key: null, data: undefined, error: null });
    const [tick, setTick] = useState(0);

    // Keep the newest functions in refs so the loading effect below only restarts
    // when the key changes or reload() is called.
    const fetcherRef = useRef(fetcher);
    const pollRef = useRef(pollMs);
    const keyRef = useRef(key);
    useEffect(() => {
        fetcherRef.current = fetcher;
        pollRef.current = pollMs;
        keyRef.current = key;
    });

    useEffect(() => {
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let last: T | undefined;

        async function run() {
            try {
                const data = await fetcherRef.current();
                if (cancelled) return;
                last = data;
                setState({ key, data, error: null });
                const wait = pollRef.current?.(data) ?? null;
                if (wait) timer = setTimeout(run, wait);
            } catch (err) {
                if (cancelled) return;
                // Keep showing the old data of THIS key, but never data that belongs to another key.
                setState((prev) => ({
                    key,
                    data: prev.key === key ? prev.data : undefined,
                    error: errorMessage(err),
                }));
                // A background refresh that failed (for example Wi-Fi dropped) tries again later.
                const wait = last !== undefined ? (pollRef.current?.(last) ?? null) : null;
                if (wait) timer = setTimeout(run, wait * 2);
            }
        }

        void run();
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [key, tick]);

    const reload = useCallback(() => setTick((n) => n + 1), []);
    const mutate = useCallback((data: T) => {
        setState({ key: keyRef.current, data, error: null });
        // The new data may need watching (for example a document that is now "processing"),
        // so restart the loading loop, which also restarts the background refreshing.
        if (pollRef.current?.(data)) setTick((n) => n + 1);
    }, []);

    return {
        data: state.data,
        error: state.error,
        loading: state.key !== key,
        reload,
        mutate,
    };
}