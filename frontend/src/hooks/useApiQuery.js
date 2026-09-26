import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

function asList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export function useApiList(queryKey, fetcher, options = {}) {
  return useQuery({
    queryKey,
    queryFn: async () => asList((await fetcher()).data),
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys) =>
    Promise.all(
      keys.map((key) => queryClient.invalidateQueries({ queryKey: key })),
    );
}
