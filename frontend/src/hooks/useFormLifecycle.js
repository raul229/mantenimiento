import { useCallback } from "react";

export function useFormLifecycle({ reset, close, refetch, onAfter }) {
  const afterSave = useCallback(() => {
    reset?.();
    close?.();
    refetch?.();
    onAfter?.();
  }, [reset, close, refetch, onAfter]);

  return { afterSave };
}
