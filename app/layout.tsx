import type React from "react"
import type { Metadata } from "next"
import { Inter, Geist } from "next/font/google"
import "./globals.css"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner" // Add this line
import { Topbar } from "@/components/topbar"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          href="/petrobook.png"
          type="image/png"
        />
      </head>
      <body className={geist.className}>
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
           
            
            <main className="flex-1 overflow-auto">
              
              
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <Topbar />
            
            
            
            {children}
            
            
            </ThemeProvider>
            </main>
          </div>
        </SidebarProvider>
        <Toaster />
        <Sonner /> {/* Add this line */}
      </body>
    </html>
  )
}