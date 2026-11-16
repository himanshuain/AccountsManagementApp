"use client";

import { useCallback, useState } from "react";

/**
 * Implicit idle → running → done | error job state.
 */
export function useAsyncTask() {
  const [status, setStatus] = useState("idle");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const run = useCallback(async asyncFn => {
    setStatus("running");
    setError(null);
    try {
      const result = await asyncFn();
      setData(result);
      setStatus("done");
      return { success: true, data: result };
    } catch (err) {
      const message = err?.message || "Something went wrong";
      setError(message);
      setStatus("error");
      return { success: false, error: message };
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setData(null);
    setError(null);
  }, []);

  const hydrate = useCallback(value => {
    setData(value ?? null);
    setError(null);
    setStatus(value != null ? "done" : "idle");
  }, []);

  const isLoading = status === "running";

  return { status, data, error, isLoading, run, reset, hydrate };
}

export default useAsyncTask;