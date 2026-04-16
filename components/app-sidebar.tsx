"use client"

import { 
  ChartArea,
  DollarSign,
  Receipt, 
  BarChart3, 
  Settings, 
  UserCog,
  ChevronRight,
  Users,
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
  /** When set, active if pathname matches or starts with any of these (e.g. /customers and /contacts). */
  activePathPrefixes?: string[]
}

type MenuGroup = {
  items: MenuItem[]
}

const groupedMenu: MenuGroup[] = [
  {
    items: [{ title: "Dashboard", url: "/", icon: ChartArea }],
  },

  {
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
        ],
      },
    ],
  },

  {
    items: [
      {
        title: "Customers & Leads",
        url: "/customers-leads",
        icon: Users,
        activePathPrefixes: ["/customers-leads", "/customers", "/contacts"],
        submenu: [
          { title: "Overview", url: "/customers-leads" },
          { title: "Customers", url: "/customers-leads?tab=customers" },
          { title: "Leads", url: "/customers-leads?tab=leads" },
        ],
      },
    ],
  },

  {
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
        ],
      },
    ],
  },

  {
    items: [
      { title: "Reports", url: "/reports", icon: BarChart3 },
    ],
  },

  {
    items: [{ title: "Settings", url: "/settings", icon: Settings }],
  },

  {
    items: [{ title: "Account Overview", url: "/overview", icon: UserCog }],
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
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {groupedMenu.map((group, groupIdx) => (
                  <div key={groupIdx} className="space-y-1">
                    {group.items.map((item) => (
                      <SidebarMenuItem
                        key={item.title}
                        ref={(el) => {
                          if (el) menuItemRefs.current[item.title] = el
                        }}
                        onMouseEnter={() => item.submenu && handleMouseEnter(item.title)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <SidebarMenuButton
                          asChild
                          isActive={
                            item.activePathPrefixes?.length
                              ? item.activePathPrefixes.some(
                                  (p) => pathname === p || pathname.startsWith(p + "/")
                                )
                              : pathname === item.url ||
                                (item.url !== "/" && pathname.startsWith(item.url))
                          }
                        >
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

                    {groupIdx < groupedMenu.length - 1 ? (
                      <div className="my-2 h-px bg-border/60" />
                    ) : null}
                  </div>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="px-4 pb-4 pt-6 space-y-4">
          <div className="h-px bg-border/70" />

          <div className="rounded-md bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage
                  src="logo.png"
                  alt="Admin avatar"
                />
                <AvatarFallback>PSI</AvatarFallback>
              </Avatar>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-medium">Admin</span>
                <span className="text-xs text-muted-foreground">Petrosphere Accounting</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t">
            <p className="text-xs text-center text-muted-foreground">
              Developed by <span className="font-bold text-foreground">PetroCore<span className="text-red-500">X</span></span>
            </p>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Render submenu using portal */}
      {hoveredItem && submenuPosition && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed w-48 bg-background border rounded-md shadow-lg py-1 z-100"
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