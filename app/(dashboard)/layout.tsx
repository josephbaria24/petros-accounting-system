//app\(dashboard)\layout.tsx
import type React from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Topbar } from "@/components/topbar"
import { BackupScheduler } from "@/components/backup-scheduler"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider className="h-svh max-h-svh min-h-0 overflow-hidden">
      <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="z-50 shrink-0 border-b border-border/60 bg-background/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/80">
              <Topbar />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
              {children}
            </div>
          </div>
        </main>
      </div>
      <BackupScheduler />
    </SidebarProvider>
  )
}