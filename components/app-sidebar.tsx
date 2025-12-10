"use client"

import { 
  ChartArea,
  DollarSign,
  Receipt, 
  Building2, 
  BookOpen, 
  ListTree, 
  BarChart3, 
  Settings, 
  CreditCardIcon,
  ClipboardEditIcon,
  UserCog
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { usePathname } from "next/navigation"

const groupedMenu = [
  {
    label: "Dashboard",
    items: [{ title: "Dashboard", url: "/", icon: ChartArea }]
  },

  {
    label: "Sales",
    items: [{ title: "Sales", url: "/sales", icon: DollarSign }]
  },

  {
    label: "Expenses",
    items: [{ title: "Expenses", url: "/expenses", icon: Receipt },
    { title: "Bills", url: "/bills", icon: Receipt }
    ]
  },

  {
    label: "Accounting",
    items: [
      { title: "Chart of Accounts", url: "/accounts", icon: ListTree },
      { title: "Journal Entries", url: "/journal", icon: BookOpen },
      { title: "Reports", url: "/reports", icon: BarChart3 },
    ]
  },

  {
    label: "Banking",
    items: [{ title: "Bankings", url: "/bankings", icon: CreditCardIcon }]
  },

  {
    label: "Settings",
    items: [
      { title: "Settings", url: "/settings", icon: Settings },
      { title: "Account Overview", url: "/overview", icon: UserCog },
    ]
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-6">
        <div className="p-2 flex h-12 w-auto items-center justify-center overflow-hidden">
          <img
            src="/petrobook2.png"
            alt="Company Logo"
            className="h-full w-full object-contain"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groupedMenu.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e"
              alt="John Doe"
            />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">John Doe</span>
            <span className="text-xs text-muted-foreground">Sales Manager</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
