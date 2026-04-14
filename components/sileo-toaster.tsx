"use client"

import { Toaster } from "sileo"
import { useTheme } from "next-themes"

/**
 * Sileo physics-based toasts — must be mounted once inside ThemeProvider.
 */
export function SileoToaster() {
  const { theme = "system" } = useTheme()

  const sileoTheme: "light" | "dark" | "system" =
    theme === "system"
      ? "system"
      : theme === "dark"
        ? "dark"
        : "light"

  return (
    <Toaster
      theme={sileoTheme}
      position="top-center"
      options={{
        duration: 6000,
      }}
    />
  )
}
