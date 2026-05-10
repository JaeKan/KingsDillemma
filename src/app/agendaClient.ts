import { useCallback, useEffect, useRef } from "react";
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ko } from "../resources/gameResources";

const agendaQueryKey = ["agenda"];
const agendaMutationKey = ["agenda", "mutation"];
const agendaMutationScope = { id: "agenda-state-writes" };
const nonBlockingAgendaActions = new Set([
  "saveInventory",
  "saveHouseProgress",
  "saveAlignmentReward",
  "saveAlignmentOrder",
]);

export async function agendaRequest(options: any = {}) {
  const { headers, ...requestOptions } = options;
  const requestHeaders = options.body ? { "Content-Type": "application/json", ...headers } : headers;
  const response = await fetch("/api/agenda", {
    credentials: "same-origin",
    ...requestOptions,
    ...(requestHeaders ? { headers: requestHeaders } : {}),
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.ok === false) {
    throw new Error(result.error || ko.agenda.requestFailed);
  }

  return result;
}

function mergeAgendaQueryResult(previous: any, result: any) {
  return {
    authenticated: Boolean(result.authenticated ?? previous?.authenticated ?? false),
    realtimeEnabled: Boolean(result.realtimeEnabled ?? previous?.realtimeEnabled ?? false),
    state: result.state ?? previous?.state ?? null,
  };
}

function isNonBlockingAgendaAction(payload: any) {
  return Boolean(payload && (nonBlockingAgendaActions as any).has(payload.action));
}

export function useAgendaStateQuery(setError: (msg: string) => void) {
  const query = useQuery({
    queryKey: agendaQueryKey,
    queryFn: () => agendaRequest(),
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (query.error) {
      setError((query.error as any).message);
      return;
    }

    if (query.data) {
      setError("");
    }
  }, [query.data, query.error, setError]);

  return query;
}

export function useAgendaMutations(setError: (msg: string) => void) {
  const queryClient = useQueryClient();
  const mutationCount = useIsMutating({ mutationKey: agendaMutationKey });
  const mutationInFlight = useRef(false);

  useEffect(() => {
    mutationInFlight.current = mutationCount > 0;
  }, [mutationCount]);

  const handleSuccess = useCallback(
    (result: any) => {
      queryClient.setQueryData(agendaQueryKey, (previous: any) => mergeAgendaQueryResult(previous, result));
      setError("");
    },
    [queryClient, setError],
  );
  const handleError = useCallback(
    (requestError: any) => {
      setError(requestError.message);
    },
    [setError],
  );
  const mutationConfig: any = {
    mutationKey: agendaMutationKey,
    mutationFn: (payload: any) =>
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
    async (payload: any) => {
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

export function useAgendaRefresh(setError: (msg: string) => void, mutationInFlight: any) {
  const queryClient = useQueryClient();

  // Ref identity is stable; .current is read intentionally inside the callback.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- mutationInFlight is a ref object; deps [mutationInFlight] are correct
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
    } catch (requestError: any) {
      setError(requestError.message);
      return null;
    }
  }, [mutationInFlight, queryClient, setError]);
}
