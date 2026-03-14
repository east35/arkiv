import { useEffect, useState } from "react";
import {
  IconLoader2,
  IconDownload,
  IconUpload,
  IconCircleCheck,
  IconLogout,
  IconChevronDown,
  IconCheck,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePreferences } from "@/hooks/usePreferences";
import { useShelfStore } from "@/store/useShelfStore";
import { useItems } from "@/hooks/useItems";
import { useTheme } from "@/components/theme-provider";
import {
  useMetadataEnrich,
  type EnrichReport,
} from "@/hooks/useMetadataEnrich";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormFieldBlock } from "@/components/ui/form-field-block";
import { LoadingState } from "@/components/ui/loading-state";
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
} from "@/components/ui/alert-dialog";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { StatisticsDashboard } from "@/pages/Statistics";
import type { DateFormat, TimeFormat, UserPreferences } from "@/types";

export default function Settings() {
  const { user, signOut } = useAuth();
  const { preferences } = useShelfStore();
  const { fetchPreferences, updatePreferences } = usePreferences();
  const { items } = useShelfStore();
  const { fetchItems } = useItems();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = [
    "account",
    "linked",
    "preferences",
    "statistics",
    "data",
  ].includes(tabParam ?? "")
    ? (tabParam as "account" | "linked" | "preferences" | "statistics" | "data")
    : "account";
  const {
    progress: enrichProgress,
    scan,
    execute: executeEnrich,
    reset: resetEnrich,
  } = useMetadataEnrich();

  const [loading, setLoading] = useState(false);
  const [tabSheetOpen, setTabSheetOpen] = useState(false);

  const tabs = [
    { value: "account", label: "Account" },
    { value: "linked", label: "Linked" },
    { value: "preferences", label: "Preferences" },
    { value: "statistics", label: "Statistics" },
    { value: "data", label: "Data" },
  ] as const;

  const activeTabLabel =
    tabs.find((t) => t.value === activeTab)?.label ?? "Account";
  const [formData, setFormData] = useState<Partial<UserPreferences>>({});
  const [fieldErrors, setFieldErrors] = useState<{ username?: string }>({});
  const [sparseCount, setSparseCount] = useState<number | null>(null);
  const [enrichReport, setEnrichReport] = useState<EnrichReport | null>(null);

  // Fetch prefs on mount.
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Keep sparse count in sync with the live items list.
  useEffect(() => {
    const sparse = scan();
    setSparseCount(sparse.length);
  }, [items, scan]);

  // Sync form data with prefs
  useEffect(() => {
    if (preferences) {
      setFormData(preferences);
    }
  }, [preferences]);

  const handleThemeChange = (val: string | null) => {
    if (!val) return;
    const newTheme = val as "light" | "dark" | "system";
    setTheme(newTheme);
    setFormData({ ...formData, theme: newTheme });
  };

  const getUsernameError = (username?: string | null) => {
    if (!username) return null;
    const value = username.trim();
    if (value.length < 2 || value.length > 30)
      return "Username must be 2-30 characters";
    if (!/^[a-zA-Z0-9_]+$/.test(value))
      return "Username can only contain letters, numbers, and underscores";
    return null;
  };

  const handleSave = async () => {
    const usernameError = getUsernameError(formData.username);
    if (usernameError) {
      setFieldErrors({ username: usernameError });
      toast.error(usernameError);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      await updatePreferences(formData);
      toast.success("Settings saved");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    // Ensure we have latest items
    await fetchItems();

    // Generate CSV
    const headers = [
      "ID",
      "Title",
      "Media Type",
      "Status",
      "Score",
      "Platform/Author",
      "Created At",
    ];
    const rows = items.map((item) => [
      item.id,
      `"${item.title.replace(/"/g, '""')}"`, // Escape quotes
      item.media_type,
      item.status,
      item.user_score ?? "",
      item.media_type === "game" ? item.game.developer : item.book.author,
      item.created_at,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    // IconDownload
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `arkiv_export_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const runEnrich = async (force = false) => {
    setEnrichReport(null);
    const report = await executeEnrich(force);
    setEnrichReport(report);
    const sparse = scan();
    setSparseCount(sparse.length);
  };

  if (!preferences) {
    return <LoadingState className="h-full" />;
  }

  return (
    <div className="flex flex-col min-h-full">
      <Tabs
        value={activeTab}
        onValueChange={(tab) =>
          setSearchParams(tab === "account" ? {} : { tab })
        }
      >
        {/* Sticky header */}
        <div className="sticky top-0 z-20 bg-background">
          {/* Title row */}
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your account, preferences, and data.
            </p>
            {/* Mobile: sheet picker */}
            <Sheet open={tabSheetOpen} onOpenChange={setTabSheetOpen}>
              <SheetTrigger className="w-full mt-4 md:hidden">
                <Button variant="outline" className="w-full justify-between">
                  {activeTabLabel}
                  <IconChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom">
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                </SheetHeader>
                <div className="mt-4 flex flex-col gap-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.value}
                      className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-left text-sm font-medium hover:bg-accent transition-colors"
                      onClick={() => {
                        setSearchParams(
                          tab.value === "account" ? {} : { tab: tab.value },
                        );
                        setTabSheetOpen(false);
                      }}
                    >
                      {tab.label}
                      {activeTab === tab.value && (
                        <IconCheck className="h-4 w-4" />
                      )}
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop tab bar: full width, no side/top border, #fbfbfb bg */}
          <TabsList className="hidden md:flex w-full h-12 rounded-none p-0 gap-0 bg-[#FBFBFB] dark:bg-[#0F0F0F] border-0">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 h-full rounded-none border-0 text-sm font-medium"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 px-4 sm:px-6 pb-8 pt-6">
          <div className="max-w-5xl">
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
                  <FormFieldBlock
                    id="email"
                    label="Email"
                    description="Managed via Supabase Auth."
                  >
                    <Input id="email" value={user?.email || ""} disabled />
                  </FormFieldBlock>
                  <FormFieldBlock
                    id="username"
                    label="Username"
                    error={fieldErrors.username}
                  >
                    <Input
                      id="username"
                      value={formData.username || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({ ...formData, username: value });
                        if (fieldErrors.username) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            username: undefined,
                          }));
                        }
                      }}
                      onBlur={() =>
                        setFieldErrors((prev) => ({
                          ...prev,
                          username:
                            getUsernameError(formData.username) || undefined,
                        }))
                      }
                      placeholder="Set a username"
                    />
                  </FormFieldBlock>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading && (
                      <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
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
                  <FormFieldBlock
                    id="steamId"
                    label="Steam ID"
                    description="Used to fetch game playtimes (coming soon)."
                  >
                    <Input
                      id="steamId"
                      value={formData.steam_id || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, steam_id: e.target.value })
                      }
                      placeholder="76561198000000000"
                    />
                  </FormFieldBlock>
                  <FormFieldBlock
                    id="calibre"
                    label="Calibre Library Path"
                    description="Local path to your Calibre library (coming soon)."
                  >
                    <Input
                      id="calibre"
                      value={formData.calibre_path || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          calibre_path: e.target.value,
                        })
                      }
                      placeholder="/Users/name/Calibre Library"
                    />
                  </FormFieldBlock>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading && (
                      <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
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
                  <CardDescription>Customize your experience.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormFieldBlock id="theme" label="Theme">
                    <NativeSelect
                      id="theme"
                      value={formData.theme || "system"}
                      onValueChange={handleThemeChange}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System</option>
                    </NativeSelect>
                  </FormFieldBlock>

                  <FormFieldBlock id="date-format" label="Date Format">
                    <NativeSelect
                      id="date-format"
                      value={formData.date_format || "iso"}
                      onValueChange={(val) =>
                        setFormData({
                          ...formData,
                          date_format: val as DateFormat,
                        })
                      }
                    >
                      <option value="iso">ISO (YYYY-MM-DD)</option>
                      <option value="us">US (MM/DD/YYYY)</option>
                      <option value="eu">EU (DD/MM/YYYY)</option>
                      <option value="long">Long (Month D, YYYY)</option>
                    </NativeSelect>
                  </FormFieldBlock>

                  <FormFieldBlock id="time-format" label="Time Format">
                    <NativeSelect
                      id="time-format"
                      value={formData.time_format || "12hr"}
                      onValueChange={(val) =>
                        setFormData({
                          ...formData,
                          time_format: val as TimeFormat,
                        })
                      }
                    >
                      <option value="12hr">12-hour (1:00 PM)</option>
                      <option value="24hr">24-hour (13:00)</option>
                    </NativeSelect>
                  </FormFieldBlock>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading && (
                      <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="statistics">
              <StatisticsDashboard embedded />
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
                  {/* Enrich Library */}
                  <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Enrich Library</h4>
                        <p className="text-sm text-muted-foreground">
                          Backfill missing metadata (genres, descriptions, etc.)
                          from IGDB & Hardcover.
                        </p>
                      </div>
                    </div>

                    {/* Scan result — confirm before enriching */}
                    {sparseCount !== null &&
                      enrichProgress.phase === "idle" &&
                      !enrichReport && (
                        <div className="flex items-center justify-between bg-background p-3 rounded border">
                          <p className="text-sm">
                            {sparseCount === 0 ? (
                              "All items already have full metadata."
                            ) : (
                              <>
                                <strong>{sparseCount}</strong> items need
                                enrichment.
                              </>
                            )}
                          </p>
                          {sparseCount > 0 ? (
                            <Button size="sm" onClick={() => runEnrich(false)}>
                              Enrich Now
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => runEnrich(true)}
                            >
                              Force Re-enrich
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
                            Enriching… {enrichProgress.current} /{" "}
                            {enrichProgress.total}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{
                              width: `${(enrichProgress.current / enrichProgress.total) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>✓ {enrichProgress.enriched} enriched</span>
                          <span>⊘ {enrichProgress.skipped} skipped</span>
                          {enrichProgress.errors.length > 0 && (
                            <span className="text-destructive">
                              ✗ {enrichProgress.errors.length} errors
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Report */}
                    {enrichReport && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-600">
                          <IconCircleCheck className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Enrichment complete
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>✓ {enrichReport.enriched} enriched</span>
                          <span>⊘ {enrichReport.skipped} skipped</span>
                          {enrichReport.errors.length > 0 && (
                            <span className="text-destructive">
                              ✗ {enrichReport.errors.length} errors
                            </span>
                          )}
                        </div>
                        {enrichReport.errors.length > 0 && (
                          <details className="text-xs text-destructive">
                            <summary className="cursor-pointer">
                              View errors
                            </summary>
                            <ul className="mt-1 space-y-0.5 pl-4 list-disc">
                              {enrichReport.errors.map((e, i) => (
                                <li key={i}>{e}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => runEnrich(false)}>
                            Run Again
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => runEnrich(true)}
                          >
                            Force Re-enrich
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              resetEnrich();
                              setSparseCount(null);
                              setEnrichReport(null);
                            }}
                          >
                            Reset
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg border flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Import Library</h4>
                      <p className="text-sm text-muted-foreground">
                        Import your library from a Yamtrack CSV export.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/import")}
                    >
                      <IconUpload className="mr-2 h-4 w-4" />
                      Import CSV
                    </Button>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg border flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Export Library</h4>
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
          </div>

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
                  <AlertDialogAction
                    onClick={() => signOut()}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    Sign Out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
