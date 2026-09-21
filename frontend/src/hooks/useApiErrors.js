import { useState } from "react";
import { formatApiError } from "@/utils/formatApiError";

export function useApiErrors() {
  const [errors, setErrors] = useState({});

  function handleApiError(error) {
    const resp = error?.response?.data;
    if (resp && typeof resp === "object") {
      setErrors(resp);
    } else {
      const msgs = formatApiError(error);
      setErrors({ non_field_errors: msgs });
    }
    return formatApiError(error);
  }

  function clearErrors() {
    setErrors({});
  }

  return { errors, setErrors, handleApiError, clearErrors };
}
