"use client"
 
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
 
export default function Overview() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">My Account</h1>
 
      {/* Profile Overview */}
      <Card className="p-6 mb-8 border border-muted rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-gray-100 rounded-full h-16 w-16 flex items-center justify-center text-2xl font-semibold text-gray-600">
              JD
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Jane Doe</h2>
              <p className="text-sm text-gray-500">jane@example.com</p>
              <Badge variant="outline" className="mt-2 bg-emerald-100 text-emerald-800">Active</Badge>
            </div>
          </div>
 
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm text-gray-700 w-full sm:w-auto">
            <div>
              <div className="text-muted-foreground">Role</div>
              <strong className="block mt-1">Accountant</strong>
            </div>
            <div>
              <div className="text-muted-foreground">Joined</div>
              <strong className="block mt-1">Mar 2022</strong>
            </div>
            <div>
              <div className="text-muted-foreground">Plan</div>
              <strong className="block mt-1">Premium</strong>
            </div>
            <div>
              <div className="text-muted-foreground">Usage</div>
              <div className="mt-2">
                <Progress value={70} className="h-2 rounded-full bg-emerald-100" />
                <div className="text-xs text-muted-foreground mt-1">70% used</div>
              </div>
            </div>
          </div>
        </div>
 
        {/* Rich Overview Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div>
            <h4 className="font-semibold mb-1">Billing Summary</h4>
            <p className="text-sm text-gray-600">Last payment on April 1, 2025</p>
            <p className="text-sm text-gray-600">Next renewal on May 1, 2025</p>
            <p className="text-sm text-gray-600">Payment method: **** **** **** 4242</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Recent Logins</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Nov 19, 2025 - Chrome - New York</li>
              <li>Nov 18, 2025 - Safari - Los Angeles</li>
              <li>Nov 17, 2025 - Firefox - Remote</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Security</h4>
            <p className="text-sm text-gray-600">2FA: Enabled</p>
            <p className="text-sm text-gray-600">Last password change: Oct 12, 2025</p>
            <p className="text-sm text-gray-600">Recovery email set</p>
          </div>
        </div>
      </Card>
 
      {/* Tabs */}
      <Tabs defaultValue="settings">
        <TabsList className="bg-muted p-1 rounded-xl mb-6">
          <TabsTrigger value="settings" className="px-4 py-2 rounded-md">Settings</TabsTrigger>
          <TabsTrigger value="billing" className="px-4 py-2 rounded-md">Billing</TabsTrigger>
          <TabsTrigger value="security" className="px-4 py-2 rounded-md">Security</TabsTrigger>
          <TabsTrigger value="activity" className="px-4 py-2 rounded-md">Activity</TabsTrigger>
        </TabsList>
 
        {/* Settings */}
        <TabsContent value="settings">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Profile Settings</h3>
            <form className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm mb-1 font-medium">Name</label>
                <Input id="name" placeholder="Jane Doe" defaultValue="Jane Doe" />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm mb-1 font-medium">Email</label>
                <Input id="email" type="email" placeholder="jane@example.com" defaultValue="jane@example.com" />
              </div>
              <div className="col-span-2 flex justify-end mt-4">
                <Button className="bg-emerald-600 text-white hover:bg-emerald-700">Save Changes</Button>
              </div>
            </form>
          </Card>
        </TabsContent>
 
        {/* Billing */}
        <TabsContent value="billing">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Billing Information</h3>
            <p className="text-sm text-muted-foreground mb-4">Your subscription renews on <strong>April 10, 2025</strong>.</p>
            <Button variant="outline" className="mr-3">Change Plan</Button>
            <Button variant="ghost">Request Invoice</Button>
          </Card>
        </TabsContent>
 
        {/* Security */}
        <TabsContent value="security">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Security Settings</h3>
            <p className="text-sm text-muted-foreground mb-4">Manage your password and authentication methods.</p>
            <Button variant="outline" className="mb-2">Change Password</Button>
            <br />
            <Button variant="ghost">Enable 2FA</Button>
          </Card>
        </TabsContent>
 
        {/* Activity Log */}
        <TabsContent value="activity">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span>Logged in from new device</span>
                <span className="text-muted-foreground">Nov 19, 2025</span>
              </li>
              <li className="flex justify-between">
                <span>Profile updated</span>
                <span className="text-muted-foreground">Nov 16, 2025</span>
              </li>
              <li className="flex justify-between">
                <span>Payment processed</span>
                <span className="text-muted-foreground">Nov 10, 2025</span>
              </li>
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}