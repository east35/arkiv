import { useEffect, useState } from "react"
import { IconLoader2, IconDownload, IconUpload, IconRefresh, IconCircleCheck, IconLogout } from "@tabler/icons-react"
import { toast } from "sonner"

import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { usePreferences } from "@/hooks/usePreferences"
import { useShelfStore } from "@/store/useShelfStore"
import { useItems } from "@/hooks/useItems"
import { useTheme } from "@/components/theme-provider"
import { useMetadataEnrich, type EnrichReport } from "@/hooks/useMetadataEnrich"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
  const { user, signOut } = useAuth()
  const { preferences } = useShelfStore()
  const { fetchPreferences, updatePreferences } = usePreferences()
  const { items } = useShelfStore()
  const { fetchItems } = useItems()
  const { setTheme } = useTheme()
  const navigate = useNavigate()
  const { progress: enrichProgress, scan, execute: executeEnrich, reset: resetEnrich } = useMetadataEnrich()

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<UserPreferences>>({})
  const [sparseCount, setSparseCount] = useState<number | null>(null)
  const [enrichReport, setEnrichReport] = useState<EnrichReport | null>(null)

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

  const handleThemeChange = (val: string | null) => {
    if (!val) return
    const newTheme = val as "light" | "dark" | "system"
    setTheme(newTheme)
    setFormData({ ...formData, theme: newTheme })
  }

  const handleSave = async () => {
    // Basic username validation
    if (formData.username) {
      const u = formData.username.trim()
      if (u.length < 2 || u.length > 30) {
        toast.error("Username must be 2–30 characters")
        return
      }
      if (!/^[a-zA-Z0-9_]+$/.test(u)) {
        toast.error("Username can only contain letters, numbers, and underscores")
        return
      }
    }

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

    // IconDownload
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `arkiv_export_${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!preferences) {
    return (
      <div className="flex items-center justify-center h-full">
        <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 sm:p-6 pb-2 border-b mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your account, preferences, and data.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-8">
        <Tabs defaultValue="account" className="max-w-3xl">
          <TabsList className="grid w-full grid-cols-4 mb-4">
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
                  {loading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                  {loading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select 
                    value={formData.theme || "system"} 
                    onValueChange={handleThemeChange}
                  >
                    <SelectTrigger id="theme">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                  {loading && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                  Export your shelf or manage your data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Enrich Library */}
                <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Enrich Shelf</h4>
                      <p className="text-sm text-muted-foreground">
                        Backfill missing metadata (genres, descriptions, etc.) from IGDB & Google Books.
                      </p>
                    </div>
                    {enrichProgress.phase === "idle" && !enrichReport && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          const sparse = scan()
                          setSparseCount(sparse.length)
                        }}
                      >
                        <IconRefresh className="mr-2 h-4 w-4" />
                        Scan
                      </Button>
                    )}
                  </div>

                  {/* Scan result — confirm before enriching */}
                  {sparseCount !== null && enrichProgress.phase === "idle" && !enrichReport && (
                    <div className="flex items-center justify-between bg-background p-3 rounded border">
                      <p className="text-sm">
                        {sparseCount === 0
                          ? "All items already have full metadata."
                          : <><strong>{sparseCount}</strong> items need enrichment.</>}
                      </p>
                      {sparseCount > 0 && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            const report = await executeEnrich()
                            setEnrichReport(report)
                          }}
                        >
                          Enrich Now
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Progress bar */}
                  {enrichProgress.phase === "enriching" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <IconLoader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">
                          Enriching… {enrichProgress.current} / {enrichProgress.total}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${(enrichProgress.current / enrichProgress.total) * 100}%` }}
                        />
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>✓ {enrichProgress.enriched} enriched</span>
                        <span>⊘ {enrichProgress.skipped} skipped</span>
                        {enrichProgress.errors.length > 0 && (
                          <span className="text-destructive">✗ {enrichProgress.errors.length} errors</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Report */}
                  {enrichReport && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-600">
                        <IconCircleCheck className="h-4 w-4" />
                        <span className="text-sm font-medium">Enrichment complete</span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>✓ {enrichReport.enriched} enriched</span>
                        <span>⊘ {enrichReport.skipped} skipped</span>
                        {enrichReport.errors.length > 0 && (
                          <span className="text-destructive">✗ {enrichReport.errors.length} errors</span>
                        )}
                      </div>
                      {enrichReport.errors.length > 0 && (
                        <details className="text-xs text-destructive">
                          <summary className="cursor-pointer">View errors</summary>
                          <ul className="mt-1 space-y-0.5 pl-4 list-disc">
                            {enrichReport.errors.map((e, i) => <li key={i}>{e}</li>)}
                          </ul>
                        </details>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          resetEnrich()
                          setSparseCount(null)
                          setEnrichReport(null)
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                </div>

                <div className="bg-muted/50 p-4 rounded-lg border flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Import Shelf</h4>
                    <p className="text-sm text-muted-foreground">
                      Import your shelf from a Yamtrack CSV export.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => navigate("/import")}>
                    <IconUpload className="mr-2 h-4 w-4" />
                    Import CSV
                  </Button>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg border flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Export Shelf</h4>
                    <p className="text-sm text-muted-foreground">
                      Download a CSV file of all your tracked items.
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleExport}>
                    <IconDownload className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Mobile Sign Out */}
        <div className="md:hidden mt-8">
          <AlertDialog>
            <AlertDialogTrigger className="w-full">
              <Button variant="destructive" className="w-full">
                <IconLogout className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign Out</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to sign out of Arkiv?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => signOut()} className="bg-destructive text-white hover:bg-destructive/90">Sign Out</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}
