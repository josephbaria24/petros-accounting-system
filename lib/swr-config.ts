import type { SWRConfiguration } from "swr"

/** Shared defaults so list views dedupe requests and revalidate sensibly on tab focus. */
export const defaultSWRConfig: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateIfStale: true,
  dedupingInterval: 3000,
  errorRetryCount: 2,
  focusThrottleInterval: 5000,
}
