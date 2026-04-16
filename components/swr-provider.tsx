"use client"

import type { ReactNode } from "react"
import { SWRConfig } from "swr"
import { defaultSWRConfig } from "@/lib/swr-config"

export function SwrProvider({ children }: { children: ReactNode }) {
  return <SWRConfig value={defaultSWRConfig}>{children}</SWRConfig>
}
