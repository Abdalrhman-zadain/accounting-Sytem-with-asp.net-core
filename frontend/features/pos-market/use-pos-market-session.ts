"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  closePosMarketSession,
  getActivePosMarketSession,
  openPosMarketSession,
} from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { PosSession } from "@/types/api";

export function isReadyPosSession(
  session: PosSession | null | undefined,
): session is PosSession {
  return Boolean(
    session?.id &&
      session.warehouse?.id &&
      session.cashAccount?.id &&
      session.salesRep?.id,
  );
}

export function isStaleOpenPosSession(
  session: PosSession | null | undefined,
): session is PosSession {
  return Boolean(
    session?.id &&
      session.status === "OPEN" &&
      session.warehouse?.id &&
      session.cashAccount?.id &&
      !session.salesRep?.id,
  );
}

export function usePosMarketSession(token: string | null | undefined) {
  const queryClient = useQueryClient();

  const activeSessionQuery = useQuery({
    queryKey: queryKeys.posMarketActiveSession(token ?? null),
    queryFn: () => getActivePosMarketSession(token),
    enabled: Boolean(token),
  });

  const rawSession = activeSessionQuery.data ?? null;
  const activeSession = isReadyPosSession(rawSession) ? rawSession : null;
  const staleSession = isStaleOpenPosSession(rawSession) ? rawSession : null;

  const openSessionMutation = useMutation({
    mutationFn: (payload: {
      warehouseId: string;
      cashAccountId: string;
      salesRepId?: string;
      terminalName?: string;
      branchName?: string;
      openingCash: number;
      notes?: string;
    }) => openPosMarketSession(payload, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posMarketActiveSession(token ?? null),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posMarketSessions(token ?? null),
      });
    },
  });

  const closeSessionMutation = useMutation({
    mutationFn: (payload: { sessionId: string; actualCash: number; notes?: string }) =>
      closePosMarketSession(
        payload.sessionId,
        { actualCash: payload.actualCash, notes: payload.notes },
        token,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posMarketActiveSession(token ?? null),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posMarketSessions(token ?? null),
      });
    },
  });

  return {
    activeSession,
    staleSession,
    isLoading: activeSessionQuery.isLoading,
    isOpen: Boolean(activeSession),
    openSessionMutation,
    closeSessionMutation,
    refetch: activeSessionQuery.refetch,
  };
}
