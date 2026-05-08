import { useCallback, useEffect, useRef } from "react";
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const agendaQueryKey = ["agenda"];
const agendaMutationKey = ["agenda", "mutation"];
const agendaMutationScope = { id: "agenda-state-writes" };
const nonBlockingAgendaActions = new Set([
  "saveInventory",
  "saveHouseProgress",
  "saveAlignmentReward",
  "saveAlignmentOrder",
]);

export async function agendaRequest(options = {}) {
  const { headers, ...requestOptions } = options;
  const requestHeaders = options.body ? { "Content-Type": "application/json", ...headers } : headers;
  const response = await fetch("/api/agenda", {
    credentials: "same-origin",
    ...requestOptions,
    ...(requestHeaders ? { headers: requestHeaders } : {}),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.ok === false) {
    throw new Error(result.error || "요청을 처리하지 못했습니다.");
  }

  return result;
}

function mergeAgendaQueryResult(previous, result) {
  return {
    authenticated: Boolean(result.authenticated ?? previous?.authenticated ?? false),
    realtimeEnabled: Boolean(result.realtimeEnabled ?? previous?.realtimeEnabled ?? false),
    state: result.state ?? previous?.state ?? null,
  };
}

function isNonBlockingAgendaAction(payload) {
  return Boolean(payload && nonBlockingAgendaActions.has(payload.action));
}

export function useAgendaStateQuery(setError) {
  const query = useQuery({
    queryKey: agendaQueryKey,
    queryFn: () => agendaRequest(),
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (query.error) {
      setError(query.error.message);
      return;
    }

    if (query.data) {
      setError("");
    }
  }, [query.data, query.error, setError]);

  return query;
}

export function useAgendaMutations(setError) {
  const queryClient = useQueryClient();
  const mutationCount = useIsMutating({ mutationKey: agendaMutationKey });
  const mutationInFlight = useRef(false);

  useEffect(() => {
    mutationInFlight.current = mutationCount > 0;
  }, [mutationCount]);

  const handleSuccess = useCallback(
    (result) => {
      queryClient.setQueryData(agendaQueryKey, (previous) => mergeAgendaQueryResult(previous, result));
      setError("");
    },
    [queryClient, setError],
  );
  const handleError = useCallback(
    (requestError) => {
      setError(requestError.message);
    },
    [setError],
  );
  const mutationConfig = {
    mutationKey: agendaMutationKey,
    mutationFn: (payload) =>
      agendaRequest({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    scope: agendaMutationScope,
    onSuccess: handleSuccess,
    onError: handleError,
  };
  const { isPending: blockingPending, mutateAsync: runBlockingMutation } = useMutation(mutationConfig);
  const { mutateAsync: runAutosaveMutation } = useMutation(mutationConfig);
  const mutate = useCallback(
    async (payload) => {
      const runMutation = isNonBlockingAgendaAction(payload) ? runAutosaveMutation : runBlockingMutation;

      try {
        return await runMutation(payload);
      } catch {
        return null;
      }
    },
    [runAutosaveMutation, runBlockingMutation],
  );

  return {
    busy: blockingPending,
    mutate,
    mutationInFlight,
  };
}

export function useAgendaRefresh(setError, mutationInFlight) {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    if (mutationInFlight.current || queryClient.isFetching({ queryKey: agendaQueryKey }) > 0) {
      return null;
    }

    try {
      const result = await queryClient.fetchQuery({
        queryKey: agendaQueryKey,
        queryFn: () => agendaRequest(),
        staleTime: 0,
      });
      setError("");
      return result;
    } catch (requestError) {
      setError(requestError.message);
      return null;
    }
  }, [mutationInFlight, queryClient, setError]);
}
