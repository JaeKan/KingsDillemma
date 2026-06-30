import { QueryClient, focusManager } from "@tanstack/react-query";
import { isAgendaWindowFocused, subscribeAgendaWindowFocus } from "./agendaFocus";

if (typeof window !== "undefined") {
  focusManager.setEventListener((setFocused) => {
    const updateFocus = () => setFocused(isAgendaWindowFocused());

    updateFocus();
    return subscribeAgendaWindowFocus(updateFocus);
  });
}

export const queryClient =
  (globalThis as any).__KINGS_DILEMMA_QUERY_CLIENT__ ??
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

(globalThis as any).__KINGS_DILEMMA_QUERY_CLIENT__ = queryClient;
