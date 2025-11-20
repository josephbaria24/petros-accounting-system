"use client"

import { 
  Home, 
  FileText, 
  Users, 
  DollarSign, 
  Receipt, 
  CreditCard, 
  Building2, 
  BookOpen, 
  ListTree, 
  BarChart3, 
  Settings, 
  CreditCardIcon,
  ClipboardEditIcon,
  FolderKanban,
  ChartArea,
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
} from "@/components/ui/sidebar"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"
import { usePathname } from "next/navigation"

const menuItems = [
  // --------------------
  // Dashboard
  // --------------------
 
  {
    title: "Dashboard",
    url: "/",
    icon: ChartArea,
  },

  // --------------------
  // Sales Section
  // --------------------
  {
    title: "Invoices",
    url: "/invoices",
    icon: FileText,
  },
  {
    title: "Payments",
    url: "/payments",
    icon: DollarSign,
  },
  {
    title: "Customers",
    url: "/customers",
    icon: Users,
  },

  // --------------------
  // Expenses Section
  // --------------------
  {
    title: "Bills",
    url: "/bills",
    icon: Receipt,
  },
  {
    title: "Vendors",
    url: "/vendors",
    icon: Building2,
  },
  {
    title: "Expenses",
    url: "/expenses",
    icon: ClipboardEditIcon,
  },

  // --------------------
  // Accounting Section
  // --------------------
  {
    title: "Chart of Accounts",
    url: "/accounts",
    icon: ListTree,
  },
  {
    title: "Journal Entries",
    url: "/journal",
    icon: BookOpen,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
  },
  {
    title: "Bankings",
    url: "/bankings",
    icon: CreditCardIcon,
  },

  // --------------------
  // Settings
  // --------------------
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
  {
    title: "Account Overview",
    url: "/overview",
    icon: UserCog,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold">PetroBook</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
              alt="John Doe"
              className="object-cover"
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
