import type React from "react"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { SileoToaster } from "@/components/sileo-toaster"
import { SwrProvider } from "@/components/swr-provider"
import { ThemeProvider } from "@/components/theme-provider"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "PetroBook",
  description: "Modern Sales CRM Interface",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="smooth-scroll">
      <head>
        <link rel="icon" href="/petrobook.png" type="image/png" />
      </head>
      <body className={geist.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SwrProvider>
            {children}
            <SileoToaster />
          </SwrProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}