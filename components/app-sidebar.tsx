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
  UserCog,
  ChevronRight
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
import { useState, useRef } from "react"
import { createPortal } from "react-dom"
import { LucideIcon } from "lucide-react"

type SubMenuItem = {
  title: string
  url: string
}

type MenuItem = {
  title: string
  url: string
  icon: LucideIcon
  submenu?: SubMenuItem[]
}

type MenuGroup = {
  label: string
  items: MenuItem[]
}

const groupedMenu: MenuGroup[] = [
  {
    label: "Dashboard",
    items: [{ title: "Dashboard", url: "/", icon: ChartArea }]
  },

  {
    label: "Sales",
    items: [
      { 
        title: "Sales", 
        url: "/sales", 
        icon: DollarSign,
        submenu: [
          { title: "Overview", url: "/sales?tab=overview" },
          { title: "Invoices", url: "/sales?tab=invoices" },
          { title: "Payments", url: "/sales?tab=payments" },
          { title: "Customers", url: "/sales?tab=customers" },
        ]
      }
    ]
  },

  {
    label: "Expenses",
    items: [
      { 
        title: "Expenses", 
        url: "/expenses", 
        icon: Receipt,
        submenu: [
          { title: "Expenses", url: "/expenses?tab=expenses" },
          { title: "Bills", url: "/expenses?tab=bills" },
          { title: "Purchase orders", url: "/expenses?tab=purchase-orders" },
          { title: "Suppliers", url: "/expenses?tab=suppliers" },
        ]
      }
    ]
  },

  {
    label: "Accounting",
    items: [
      { title: "Reports", url: "/reports", icon: BarChart3 },
    ]
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
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [submenuPosition, setSubmenuPosition] = useState<{ top: number; left: number } | null>(null)
  const menuItemRefs = useRef<{ [key: string]: HTMLElement | null }>({})
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const updateSubmenuPosition = (itemTitle: string) => {
    const element = menuItemRefs.current[itemTitle]
    if (element) {
      const rect = element.getBoundingClientRect()
      setSubmenuPosition({
        top: rect.top,
        left: rect.right
      })
    }
  }

  const handleMouseEnter = (itemTitle: string) => {
    // Clear any pending close timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
    setHoveredItem(itemTitle)
    updateSubmenuPosition(itemTitle)
  }

  const handleMouseLeave = () => {
    // Delay closing to allow moving to submenu
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null)
      setSubmenuPosition(null)
    }, 150)
  }

  const handleSubmenuMouseEnter = () => {
    // Clear close timeout when entering submenu
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }

  const handleSubmenuMouseLeave = () => {
    setHoveredItem(null)
    setSubmenuPosition(null)
  }

  return (
    <>
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
                    <SidebarMenuItem 
                      key={item.title}
                      ref={(el) => {
                        if (el) menuItemRefs.current[item.title] = el
                      }}
                      onMouseEnter={() => item.submenu && handleMouseEnter(item.title)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <SidebarMenuButton asChild isActive={pathname === item.url || pathname.startsWith(item.url)}>
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          {item.submenu && (
                            <ChevronRight className="h-4 w-4 ml-auto" />
                          )}
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
                src="logo.png"
                alt="John Doe"
              />
              <AvatarFallback>PSI</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Admin</span>
              <span className="text-xs text-muted-foreground">Petrosphere Accounting</span>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Render submenu using portal */}
      {hoveredItem && submenuPosition && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed w-48 bg-background border rounded-md shadow-lg py-1 z-[100]"
          style={{
            top: `${submenuPosition.top}px`,
            left: `${submenuPosition.left}px`
          }}
          onMouseEnter={handleSubmenuMouseEnter}
          onMouseLeave={handleSubmenuMouseLeave}
        >
          {groupedMenu
            .flatMap(group => group.items)
            .find(item => item.title === hoveredItem)
            ?.submenu?.map((subItem: SubMenuItem) => (
              <Link
                key={subItem.title}
                href={subItem.url}
                className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {subItem.title}
              </Link>
            ))}
        </div>,
        document.body
      )}
    </>
  )
}