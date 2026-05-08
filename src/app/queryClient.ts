import { QueryClient } from "@tanstack/react-query";

export const queryClient =
  globalThis.__KINGS_DILEMMA_QUERY_CLIENT__ ??
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

globalThis.__KINGS_DILEMMA_QUERY_CLIENT__ = queryClient;
