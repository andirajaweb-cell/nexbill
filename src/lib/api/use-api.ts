"use client";

import useSWR, { type SWRConfiguration } from "swr";
import { fetchJsonObject } from "./fetch-json";

/**
 * Thin useSWR wrapper standardized on the app's existing fetchJsonObject() fetcher — it never
 * throws (logs and resolves `null` on any failure, same as every plain GET call already in this
 * codebase), so existing "if (!data) return <Loading/>" render guards keep working unchanged
 * when a page switches from a raw useEffect+fetch to this hook.
 *
 * What SWR adds on top of the ad hoc `useEffect(() => { fetch(...) }, [])` (+ sometimes
 * `setInterval`) pattern used across most dashboard pages:
 *  - Request de-duplication: two components asking for the same URL within `dedupingInterval`
 *    share one network call instead of firing twice.
 *  - Instant cached render on remount: navigating away and back to a page shows the last-known
 *    data immediately (then silently revalidates) instead of a blank loading spinner every time.
 *  - `refreshInterval` polling that SWR itself pauses when the browser tab isn't visible, rather
 *    than a `setInterval` that keeps firing in a backgrounded tab.
 *
 * Usage: `const { data, error, isLoading, mutate } = useApi<BillingResponse>("/api/subscription");`
 * Pass `null` as the url to skip fetching (e.g. while a required id isn't known yet).
 */
export function useApi<T = any>(url: string | null, options?: SWRConfiguration<T | null>) {
  return useSWR<T | null>(url, url ? (fetchJsonObject<T>) : null, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
    ...options,
  });
}
