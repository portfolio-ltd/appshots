import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * False during static prerender and the hydration pass, true afterwards.
 * Pages gate on this so they can read localStorage in lazy `useState`
 * initialisers without a hydration mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
