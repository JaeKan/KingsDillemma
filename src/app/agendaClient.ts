import { useCallback, useEffect, useMemo, useRef } from "react";
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AGENDA_PARALLEL_SESSION_MAX } from "../../shared/agenda-api.mts";
import { joinAppBasePath, normalizeAppBasePath } from "../../shared/app-base-path.mts";
import { ko } from "../resources/gameResources";
import { isAgendaWindowFocused } from "./agendaFocus";

type ViteImportMeta = ImportMeta & {
  env?: {
    BASE_URL?: string;
  };
};

function getClientAppBasePath(): string {
  const baseUrl = (import.meta as ViteImportMeta).env?.BASE_URL;

  return normalizeAppBasePath(baseUrl, "");
}

function getAgendaSessionKeySegment(): string {
  if (typeof window === "undefined") {
    return "default";
  }

  const raw = new URLSearchParams(window.location.search).get("session");

  if (!raw || !/^\d+$/.test(raw)) {
    return "default";
  }

  const slot = Number.parseInt(raw, 10);

  if (!Number.isFinite(slot) || slot < 1 || slot > AGENDA_PARALLEL_SESSION_MAX) {
    return "default";
  }

  return raw;
}

export function agendaApiPathWithSession(): string {
  const segment = getAgendaSessionKeySegment();
  const path = joinAppBasePath(getClientAppBasePath(), "/api/agenda");

  return segment === "default" ? path : `${path}?session=${segment}`;
}

export function agendaEventsPathWithSession(): string {
  const segment = getAgendaSessionKeySegment();
  const path = joinAppBasePath(getClientAppBasePath(), "/api/agenda/events");

  return segment === "default" ? path : `${path}?session=${segment}`;
}

const agendaMutationKeyBase = ["agenda", "mutation"] as const;
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
  const response = await fetch(agendaApiPathWithSession(), {
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
  const authenticated = Boolean(result.authenticated ?? previous?.authenticated ?? false);
  const admin = Boolean(result.admin ?? previous?.admin ?? false);
  const hasSpectatorFlag = Object.prototype.hasOwnProperty.call(result, "spectator");
  const spectator = hasSpectatorFlag
    ? Boolean(result.spectator)
    : authenticated || admin
      ? false
      : Boolean(previous?.spectator ?? false);

  return {
    authenticated,
    admin,
    spectator,
    realtimeEnabled: Boolean(result.realtimeEnabled ?? previous?.realtimeEnabled ?? false),
    state: result.state ?? previous?.state ?? null,
  };
}

export function shouldForceRefreshAfterAdminModeToggle(result: any, expectedAdmin: boolean) {
  if (!result) {
    return true;
  }

  const adminValue = result.admin ?? result.state?.isAdmin;

  if (typeof adminValue !== "boolean") {
    return true;
  }

  return adminValue !== expectedAdmin;
}

export function parseAgendaRealtimeVersion(data: unknown) {
  if (typeof data !== "string") {
    return 0;
  }

  try {
    const payload = JSON.parse(data) as { version?: unknown };
    const version =
      typeof payload.version === "number"
        ? payload.version
        : typeof payload.version === "string"
          ? Number.parseInt(payload.version, 10)
          : 0;

    return Number.isFinite(version) && version > 0 ? Math.floor(version) : 0;
  } catch {
    return 0;
  }
}

export function shouldSkipAgendaRealtimeRefresh(targetVersion: number, latestVersion: number) {
  return targetVersion > 0 && latestVersion >= targetVersion;
}

function isNonBlockingAgendaAction(payload: any) {
  return Boolean(payload && (nonBlockingAgendaActions as any).has(payload.action));
}

function useAgendaQueryKeys() {
  const sessionSegment = getAgendaSessionKeySegment();

  return useMemo(() => {
    const queryKey = ["agenda", sessionSegment] as const;
    const mutationKey = [...agendaMutationKeyBase, sessionSegment] as const;
    return { queryKey, mutationKey };
  }, [sessionSegment]);
}

export function useAgendaStateQuery(setError: (msg: string) => void, agendaWindowFocused: boolean) {
  const { queryKey } = useAgendaQueryKeys();

  const query = useQuery({
    queryKey,
    queryFn: () => agendaRequest(),
    enabled: agendaWindowFocused,
    refetchOnWindowFocus: true,
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
  const { queryKey, mutationKey } = useAgendaQueryKeys();
  const mutationCount = useIsMutating({ mutationKey });
  const mutationInFlight = useRef(false);

  useEffect(() => {
    mutationInFlight.current = mutationCount > 0;
  }, [mutationCount]);

  const handleSuccess = useCallback(
    (result: any) => {
      queryClient.setQueryData(queryKey, (previous: any) => mergeAgendaQueryResult(previous, result));
      setError("");
    },
    [queryClient, queryKey, setError],
  );
  const handleError = useCallback(
    (requestError: any) => {
      setError(requestError.message);
    },
    [setError],
  );
  const mutationConfig: any = {
    mutationKey,
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
  const { queryKey } = useAgendaQueryKeys();

  return useCallback(async (options: { force?: boolean } = {}) => {
    const force = Boolean(options.force);

    if (!isAgendaWindowFocused()) {
      return null;
    }

    if (!force && (mutationInFlight.current || queryClient.isFetching({ queryKey }) > 0)) {
      return null;
    }

    try {
      const result = await queryClient.fetchQuery({
        queryKey,
        queryFn: () => agendaRequest(),
        staleTime: 0,
      });
      setError("");
      return result;
    } catch (requestError: any) {
      setError(requestError.message);
      return null;
    }
  }, [mutationInFlight, queryClient, queryKey, setError]);
}
