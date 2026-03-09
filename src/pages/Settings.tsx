import { useEffect, useState } from "react"
import { Loader2, Download } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/hooks/useAuth"
import { usePreferences } from "@/hooks/usePreferences"
import { useShelfStore } from "@/store/useShelfStore"
import { useItems } from "@/hooks/useItems"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { DateFormat, TimeFormat, UserPreferences } from "@/types"

export default function Settings() {
  const { user } = useAuth()
  const { preferences } = useShelfStore()
  const { fetchPreferences, updatePreferences } = usePreferences()
  const { items } = useShelfStore()
  const { fetchItems } = useItems()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<UserPreferences>>({})

  // Fetch prefs on mount
  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  // Sync form data with prefs
  useEffect(() => {
    if (preferences) {
      setFormData(preferences)
    }
  }, [preferences])

  const handleSave = async () => {
    setLoading(true)
    try {
      await updatePreferences(formData)
      toast.success("Settings saved")
    } catch (error) {
      console.error(error)
      toast.error("Failed to save settings")
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    // Ensure we have latest items
    await fetchItems()
    
    // Generate CSV
    const headers = ["ID", "Title", "Media Type", "Status", "Score", "Platform/Author", "Created At"]
    const rows = items.map(item => [
      item.id,
      `"${item.title.replace(/"/g, '""')}"`, // Escape quotes
      item.media_type,
      item.status,
      item.user_score ?? "",
      item.media_type === "game" ? item.game.developer : item.book.author,
      item.created_at
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n")

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `shelflog_export_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!preferences) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-4 sm:p-6 overflow-hidden">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account, preferences, and data.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 -mx-4 px-4 sm:mx-0 sm:px-0">
        <Tabs defaultValue="account" className="max-w-3xl">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-4 h-auto">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="linked">Linked</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          {/* Account Section */}
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Manage your personal details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email || ""} disabled />
                  <p className="text-xs text-muted-foreground">
                    Managed via Supabase Auth.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username" 
                    value={formData.username || ""} 
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Set a username"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSave} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Linked Accounts */}
          <TabsContent value="linked">
            <Card>
              <CardHeader>
                <CardTitle>Linked Accounts</CardTitle>
                <CardDescription>
                  Connect external services for metadata syncing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="steamId">Steam ID</Label>
                  <Input 
                    id="steamId" 
                    value={formData.steam_id || ""} 
                    onChange={(e) => setFormData({ ...formData, steam_id: e.target.value })}
                    placeholder="76561198000000000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to fetch game playtimes (coming soon).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calibre">Calibre Library Path</Label>
                  <Input 
                    id="calibre" 
                    value={formData.calibre_path || ""} 
                    onChange={(e) => setFormData({ ...formData, calibre_path: e.target.value })}
                    placeholder="/Users/name/Calibre Library"
                  />
                  <p className="text-xs text-muted-foreground">
                    Local path to your Calibre library (coming soon).
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSave} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Preferences */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>App Preferences</CardTitle>
                <CardDescription>
                  Customize your experience.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="hover-overlay" className="flex flex-col space-y-1">
                    <span>Hide Hover Overlay</span>
                    <span className="font-normal text-xs text-muted-foreground">
                      Don't show quick actions on hover in grid view.
                    </span>
                  </Label>
                  <Switch 
                    id="hover-overlay" 
                    checked={formData.hide_hover_overlay || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, hide_hover_overlay: checked })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date-format">Date Format</Label>
                  <Select 
                    value={formData.date_format || "iso"} 
                    onValueChange={(val) => setFormData({ ...formData, date_format: val as DateFormat })}
                  >
                    <SelectTrigger id="date-format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iso">ISO (YYYY-MM-DD)</SelectItem>
                      <SelectItem value="us">US (MM/DD/YYYY)</SelectItem>
                      <SelectItem value="eu">EU (DD/MM/YYYY)</SelectItem>
                      <SelectItem value="long">Long (Month D, YYYY)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time-format">Time Format</Label>
                  <Select 
                    value={formData.time_format || "12hr"} 
                    onValueChange={(val) => setFormData({ ...formData, time_format: val as TimeFormat })}
                  >
                    <SelectTrigger id="time-format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12hr">12-hour (1:00 PM)</SelectItem>
                      <SelectItem value="24hr">24-hour (13:00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSave} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Data Export */}
          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                  Export your library or manage your data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg border flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Export Library</h4>
                    <p className="text-sm text-muted-foreground">
                      Download a CSV file of all your tracked items.
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
