import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PublicStats, StripeConfiguration, TipRecord } from "../backend.d";
import { useActor } from "./useActor";

export function useIsStripeConfigured() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isStripeConfigured"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isStripeConfigured();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
    retry: false,
  });
}

export function useGetAllTips() {
  const { actor, isFetching } = useActor();
  return useQuery<TipRecord[]>({
    queryKey: ["allTips"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTips();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTotalTipsAmount() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["totalTipsAmount"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getTotalTipsAmount();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetGoal() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["goal"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getGoal();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useGetPublicStats() {
  const { actor, isFetching } = useActor();
  return useQuery<PublicStats>({
    queryKey: ["publicStats"],
    queryFn: async () => {
      if (!actor) return { totalAmountCents: 0n, tipCount: 0n, recentTips: [] };
      return actor.getPublicStats();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useSetGoal() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (amount: bigint) => {
      if (!actor) throw new Error("Actor not available");
      await actor.setGoal(amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goal"] });
      queryClient.invalidateQueries({ queryKey: ["publicStats"] });
    },
  });
}

export function useSetStripeConfiguration() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: StripeConfiguration) => {
      if (!actor) throw new Error("Actor not available");
      await actor.setStripeConfiguration(config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isStripeConfigured"] });
    },
  });
}

export type TipSession = { id: string; url: string };

export function useCreateTip() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (params: {
      amount: bigint;
      currency: string;
      message: string;
      sender: string;
      successUrl: string;
      cancelUrl: string;
    }): Promise<TipSession> => {
      if (!actor) throw new Error("Actor not available");
      const result = await actor.createTip(
        params.amount,
        params.currency,
        params.message,
        params.sender,
      );
      // Try JSON parse first (like createCheckoutSession)
      try {
        const session = JSON.parse(result) as TipSession;
        if (session?.url) return session;
      } catch {
        // fall through
      }
      // If not JSON, treat result as session ID -- build a Stripe URL
      if (!result) throw new Error("No session returned");
      // Return with just id, caller must handle redirect
      return { id: result, url: "" };
    },
  });
}
