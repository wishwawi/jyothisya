import { useEffect, useRef, useState, useCallback } from "react";
import { useNekath } from "../store";
import { id } from "../model";
import type { Envelope } from "./contracts";
export function useQuery<T>(
  key: string,
  loader: () => Promise<Envelope<T>>,
): { data?: T; error?: Error; loading: boolean; reload: () => void } {
  const { state } = useNekath();
  const latest = useRef(loader);
  useEffect(() => {
    latest.current = loader;
  }, [loader]);
  const [token, setToken] = useState(0),
    [value, setValue] = useState<{
      key: string;
      resourceKey: string;
      data?: T;
      error?: Error;
      loading: boolean;
    }>({ key, resourceKey: key, loading: true });
  const requestKey = `${key}:${token}:${state.revision}`;
  useEffect(() => {
    let active = true;
    latest
      .current()
      .then((result) => {
        if (active)
          setValue({
            key: requestKey,
            resourceKey: key,
            data: result.data,
            loading: false,
          });
      })
      .catch((error) => {
        if (active)
          setValue({
            key: requestKey,
            resourceKey: key,
            error:
              error instanceof Error ? error : new Error("The request failed."),
            loading: false,
          });
      });
    return () => {
      active = false;
    };
  }, [requestKey, key]);
  const reload = useCallback(() => setToken((n) => n + 1), []);
  return {
    ...(value.key === requestKey ||
    (value.resourceKey === key && value.data !== undefined)
      ? value
      : { key, loading: true }),
    reload,
  };
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<Error | null>(null);
  const locked = useRef(false),
    last = useRef<(() => Promise<void>) | null>(null);
  async function execute<T>(
    fn: (key: string) => Promise<T>,
    success?: (value: T) => void,
    key = "action_" + id(),
  ) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    last.current = () => execute(fn, success, key);
    try {
      const result = await fn(key);
      success?.(result);
      last.current = null;
    } catch (e) {
      setError(e instanceof Error ? e : new Error("The action failed."));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return {
    busy,
    error,
    run: execute,
    retry: () => void last.current?.(),
    clear: () => setError(null),
  };
}
