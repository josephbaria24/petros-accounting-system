"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Mail,
  Shield,
  CreditCard,
  Clock,
  ChevronRight,
  Globe,
  Bell,
  Lock,
  Smartphone,
  Eye,
  Download,
  LogOut,
  Settings,
  Key,
  Monitor,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Pencil,
} from "lucide-react"

export default function Overview() {
  const [activeTab, setActiveTab] = useState("settings")

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">

      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Account Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your profile, security, and billing preferences</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 text-sm gap-2">
          <Settings className="h-3.5 w-3.5" />
          Preferences
        </Button>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border bg-card overflow-hidden mb-8">
        <div className="h-24 bg-linear-to-r from-green-600 via-green-500 to-emerald-400 relative">
          <div className="absolute -bottom-10 left-6">
            <div className="w-20 h-20 rounded-xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold text-green-700">
              JD
            </div>
          </div>
        </div>

        <div className="pt-14 pb-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">Jane Doe</h2>
                <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Active</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                jane@example.com
              </p>
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-2 self-start sm:self-auto">
              <Pencil className="h-3.5 w-3.5" />
              Edit Profile
            </Button>
          </div>
        </div>

        <Separator />

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x">
          {[
            { label: "Role", value: "Accountant", icon: User },
            { label: "Joined", value: "Mar 2022", icon: Calendar },
            { label: "Plan", value: "Premium", icon: CreditCard },
            { label: "Location", value: "Philippines", icon: MapPin },
          ].map((stat) => (
            <div key={stat.label} className="px-6 py-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                <stat.icon className="h-3 w-3" />
                {stat.label}
              </div>
              <div className="text-sm font-semibold">{stat.value}</div>
            </div>
          ))}
          <div className="px-6 py-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              <Globe className="h-3 w-3" />
              Usage
            </div>
            <Progress value={70} className="h-1.5 mt-2" />
            <div className="text-xs text-muted-foreground mt-1">70% of storage used</div>
          </div>
        </div>
      </div>

      {/* Quick info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-semibold">Billing</h3>
          </div>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <p>Last payment: <span className="text-foreground font-medium">Apr 1, 2025</span></p>
            <p>Next renewal: <span className="text-foreground font-medium">May 1, 2025</span></p>
            <p>Card ending: <span className="text-foreground font-medium">•••• 4242</span></p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <Monitor className="h-4 w-4 text-green-600" />
            </div>
            <h3 className="text-sm font-semibold">Recent Logins</h3>
          </div>
          <div className="space-y-2">
            {[
              { browser: "Chrome", location: "New York", date: "Nov 19" },
              { browser: "Safari", location: "Los Angeles", date: "Nov 18" },
              { browser: "Firefox", location: "Remote", date: "Nov 17" },
            ].map((login, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{login.browser} · {login.location}</span>
                <span className="text-xs text-muted-foreground">{login.date}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
              <Shield className="h-4 w-4 text-orange-600" />
            </div>
            <h3 className="text-sm font-semibold">Security</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span>Two-factor authentication enabled</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span>Password changed Oct 12, 2025</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              <span>Recovery email configured</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent border-b rounded-none w-full justify-start px-0 h-auto pb-0">
          {[
            { value: "settings", label: "Profile", icon: User },
            { value: "billing", label: "Billing", icon: CreditCard },
            { value: "security", label: "Security", icon: Shield },
            { value: "notifications", label: "Notifications", icon: Bell },
            { value: "activity", label: "Activity", icon: Clock },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:text-green-700 data-[state=active]:shadow-none px-4 pb-3 pt-2 gap-1.5 text-sm"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Profile Settings ── */}
        <TabsContent value="settings" className="mt-6">
          <div className="rounded-xl border bg-card">
            <div className="px-6 py-5 border-b">
              <h3 className="text-base font-semibold">Profile Settings</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Update your personal information</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Full name</Label>
                  <Input defaultValue="Jane Doe" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email address</Label>
                  <Input type="email" defaultValue="jane@example.com" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone number</Label>
                  <Input placeholder="+63 9xx xxx xxxx" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job title</Label>
                  <Input defaultValue="Accountant" className="h-10" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company</Label>
                  <Input defaultValue="Petrosphere Inc." className="h-10" />
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-4 border-t">
                <Button className="h-9 text-sm bg-green-600 hover:bg-green-700 text-white">Save Changes</Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Billing ── */}
        <TabsContent value="billing" className="mt-6 space-y-5">
          <div className="rounded-xl border bg-card">
            <div className="px-6 py-5 border-b">
              <h3 className="text-base font-semibold">Current Plan</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Your subscription details and payment method</p>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-green-50/50 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">Premium Plan</span>
                    <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-xs">Active</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Renews on <strong>May 1, 2025</strong></p>
                </div>
                <Button variant="outline" size="sm" className="h-9 text-sm">Change Plan</Button>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment method</h4>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-7 rounded bg-slate-800 flex items-center justify-center text-white text-xs font-bold">VISA</div>
                    <div>
                      <p className="text-sm font-medium">•••• •••• •••• 4242</p>
                      <p className="text-xs text-muted-foreground">Expires 12/2026</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-sm">Update</Button>
                </div>
              </div>

              <div className="flex gap-2 mt-5 pt-4 border-t">
                <Button variant="outline" size="sm" className="h-9 text-sm gap-2">
                  <Download className="h-3.5 w-3.5" />
                  Download Invoice
                </Button>
                <Button variant="ghost" size="sm" className="h-9 text-sm">View Billing History</Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Security ── */}
        <TabsContent value="security" className="mt-6 space-y-5">
          <div className="rounded-xl border bg-card">
            <div className="px-6 py-5 border-b">
              <h3 className="text-base font-semibold">Security Settings</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Manage your authentication and access</p>
            </div>
            <div className="divide-y">
              {[
                {
                  icon: Lock, title: "Password", description: "Last changed October 12, 2025",
                  action: <Button variant="outline" size="sm" className="h-9 text-sm">Change Password</Button>,
                },
                {
                  icon: Smartphone, title: "Two-Factor Authentication", description: "Adds an extra layer of security to your account",
                  action: (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100 text-xs">Enabled</Badge>
                      <Button variant="ghost" size="sm" className="h-9 text-sm">Configure</Button>
                    </div>
                  ),
                },
                {
                  icon: Key, title: "Recovery Email", description: "Used to recover your account if you lose access",
                  action: <Button variant="outline" size="sm" className="h-9 text-sm">Update</Button>,
                },
                {
                  icon: Eye, title: "Active Sessions", description: "Manage devices where you're currently logged in",
                  action: <Button variant="outline" size="sm" className="h-9 text-sm text-red-600 border-red-200 hover:bg-red-50">Sign Out All</Button>,
                },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                  {item.action}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications" className="mt-6">
          <div className="rounded-xl border bg-card">
            <div className="px-6 py-5 border-b">
              <h3 className="text-base font-semibold">Notification Preferences</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Choose how and when you want to be notified</p>
            </div>
            <div className="divide-y">
              {[
                { title: "Email Notifications", description: "Receive email updates for account activity" },
                { title: "Invoice Reminders", description: "Get reminders before invoices are due" },
                { title: "Payment Alerts", description: "Notify when payments are received" },
                { title: "Security Alerts", description: "Alert on new login from unknown device" },
                { title: "Marketing & Updates", description: "Product news and feature announcements" },
              ].map((pref, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-4">
                  <div>
                    <p className="text-sm font-medium">{pref.title}</p>
                    <p className="text-xs text-muted-foreground">{pref.description}</p>
                  </div>
                  <Switch defaultChecked={i < 4} />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Activity ── */}
        <TabsContent value="activity" className="mt-6">
          <div className="rounded-xl border bg-card">
            <div className="px-6 py-5 border-b">
              <h3 className="text-base font-semibold">Recent Activity</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Your latest account activity and events</p>
            </div>
            <div className="divide-y">
              {[
                { action: "Logged in from Chrome", detail: "New York, USA", time: "Nov 19, 2025 · 3:42 PM", type: "login" },
                { action: "Invoice #INV-1042 created", detail: "PHP 12,500.00", time: "Nov 18, 2025 · 11:20 AM", type: "invoice" },
                { action: "Profile updated", detail: "Email address changed", time: "Nov 16, 2025 · 9:15 AM", type: "profile" },
                { action: "Payment received", detail: "PHP 7,000.00 from ELIZA", time: "Nov 15, 2025 · 2:30 PM", type: "payment" },
                { action: "Logged in from Safari", detail: "Los Angeles, USA", time: "Nov 14, 2025 · 10:05 AM", type: "login" },
                { action: "Bill #BILL-089 paid", detail: "PHP 3,200.00", time: "Nov 12, 2025 · 4:18 PM", type: "payment" },
                { action: "New supplier added", detail: "2GO Express", time: "Nov 10, 2025 · 1:45 PM", type: "profile" },
                { action: "Password changed", detail: "Security update", time: "Oct 12, 2025 · 8:00 AM", type: "security" },
              ].map((event, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    event.type === "login" ? "bg-blue-50 text-blue-600" :
                    event.type === "invoice" ? "bg-green-50 text-green-600" :
                    event.type === "payment" ? "bg-emerald-50 text-emerald-600" :
                    event.type === "security" ? "bg-orange-50 text-orange-600" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {event.type === "login" && <Monitor className="h-3.5 w-3.5" />}
                    {event.type === "invoice" && <CreditCard className="h-3.5 w-3.5" />}
                    {event.type === "payment" && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {event.type === "security" && <Shield className="h-3.5 w-3.5" />}
                    {event.type === "profile" && <User className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{event.action}</p>
                    <p className="text-xs text-muted-foreground">{event.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{event.time}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
