import { useEffect, useMemo, useState } from "react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { statusColors, statusIcons, statusLabels } from "@/components/status-icons"
import type { Status } from "@/types"

type ColorToken = {
  name: string
  variable: string
  foregroundVariable?: string
  usage: string
}

const colorSections: { title: string; tokens: ColorToken[] }[] = [
  {
    title: "Brand & Actions",
    tokens: [
      {
        name: "Primary",
        variable: "--primary",
        foregroundVariable: "--primary-foreground",
        usage: "Primary buttons, links, active states",
      },
      {
        name: "Destructive",
        variable: "--destructive",
        foregroundVariable: "--primary-foreground",
        usage: "Error and destructive actions",
      },
    ],
  },
  {
    title: "Surfaces & Text",
    tokens: [
      {
        name: "Background",
        variable: "--background",
        foregroundVariable: "--foreground",
        usage: "App canvas and page backgrounds",
      },
      {
        name: "Card",
        variable: "--card",
        foregroundVariable: "--card-foreground",
        usage: "Cards, panels, and grouped sections",
      },
      {
        name: "Popover",
        variable: "--popover",
        foregroundVariable: "--popover-foreground",
        usage: "Menus, overlays, and floating surfaces",
      },
      {
        name: "Foreground",
        variable: "--foreground",
        foregroundVariable: "--background",
        usage: "Default text and icon color",
      },
      {
        name: "Muted",
        variable: "--muted",
        foregroundVariable: "--muted-foreground",
        usage: "Subtle backgrounds and supporting copy",
      },
      {
        name: "Secondary",
        variable: "--secondary",
        foregroundVariable: "--secondary-foreground",
        usage: "Secondary buttons and UI accents",
      },
      {
        name: "Accent",
        variable: "--accent",
        foregroundVariable: "--accent-foreground",
        usage: "Hover states and highlighted UI",
      },
    ],
  },
  {
    title: "Structure",
    tokens: [
      {
        name: "Border",
        variable: "--border",
        usage: "Dividers and container outlines",
      },
      {
        name: "Input",
        variable: "--input",
        usage: "Input outlines and control strokes",
      },
      {
        name: "Ring",
        variable: "--ring",
        usage: "Focus ring color",
      },
    ],
  },
]

const logoAssets = [
  {
    label: "Wordmark / Blue",
    src: "/logo/arkiv-logo-blue.svg",
    bgClass: "bg-white",
  },
  {
    label: "Wordmark / Black",
    src: "/logo/arkiv-logo-black.svg",
    bgClass: "bg-[#F4F4F5]",
  },
  {
    label: "Wordmark / White",
    src: "/logo/arkiv-logo-white.svg",
    bgClass: "bg-[#121212]",
  },
  {
    label: "Icon / Blue",
    src: "/logo/arkiv-icon-blue.svg",
    bgClass: "bg-white",
  },
  {
    label: "Icon / Black",
    src: "/logo/arkiv-icon-black.svg",
    bgClass: "bg-[#F4F4F5]",
  },
  {
    label: "Icon / White",
    src: "/logo/arkiv-icon-white.svg",
    bgClass: "bg-[#121212]",
  },
]

const statusOrder: Status[] = [
  "in_collection",
  "backlog",
  "in_progress",
  "completed",
  "paused",
  "dropped",
]

const iconsInUse = [
  "IconAdjustmentsHorizontal",
  "IconAlertCircle",
  "IconAlertTriangle",
  "IconArrowLeft",
  "IconArrowRight",
  "IconArrowsUpDown",
  "IconBolt",
  "IconBook",
  "IconBookFilled",
  "IconBookmarkFilled",
  "IconBooks",
  "IconCalendar",
  "IconCheck",
  "IconChevronDown",
  "IconChevronLeft",
  "IconChevronRight",
  "IconChevronUp",
  "IconCircleCheck",
  "IconDeviceFloppy",
  "IconDeviceFloppyFilled",
  "IconDeviceGamepad2",
  "IconDeviceGamepad2Filled",
  "IconDots",
  "IconDownload",
  "IconEdit",
  "IconEye",
  "IconFileText",
  "IconFilter",
  "IconFlagFilled",
  "IconInfoCircle",
  "IconLayoutGrid",
  "IconLayoutGridFilled",
  "IconListDetails",
  "IconListDetailsFilled",
  "IconLoader2",
  "IconLogout",
  "IconMenu2",
  "IconPencil",
  "IconPlayerPauseFilled",
  "IconPlayerPlayFilled",
  "IconPlaylistAdd",
  "IconPlus",
  "IconQuestionMark",
  "IconRefresh",
  "IconSearch",
  "IconSearchOff",
  "IconSettings",
  "IconSettingsFilled",
  "IconStar",
  "IconTable",
  "IconTableFilled",
  "IconTrash",
  "IconTrashXFilled",
  "IconTrophy",
  "IconUpload",
  "IconX",
]

export default function DesignSystem() {
  const { theme, setTheme } = useTheme()
  const [resolvedVars, setResolvedVars] = useState<Record<string, string>>({})

  const allVariables = useMemo(
    () =>
      Array.from(
        new Set(
          colorSections.flatMap((section) =>
            section.tokens.flatMap((token) =>
              [token.variable, token.foregroundVariable].filter(Boolean),
            ),
          ),
        ),
      ) as string[],
    [],
  )

  useEffect(() => {
    const style = getComputedStyle(document.documentElement)
    const nextValues = allVariables.reduce(
      (acc, variable) => {
        acc[variable] = style.getPropertyValue(variable).trim()
        return acc
      },
      {} as Record<string, string>,
    )

    setResolvedVars(nextValues)
  }, [allVariables, theme])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 md:px-10 md:py-12">
        <header className="mb-8 flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <img
              src="/logo/arkiv-logo-black.svg"
              alt="Arkiv"
              className="h-9 dark:hidden"
            />
            <img
              src="/logo/arkiv-logo-white.svg"
              alt="Arkiv"
              className="hidden h-9 dark:block"
            />
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Design System</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Reference page for Arkiv brand tokens and core UI styles.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Route: /design-system</Badge>
            <Button variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>
              Light
            </Button>
            <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>
              Dark
            </Button>
            <Button variant={theme === "system" ? "default" : "outline"} onClick={() => setTheme("system")}>
              System
            </Button>
          </div>
        </header>

        <section className="mb-10">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">Color Tokens</h2>
          <div className="space-y-5">
            {colorSections.map((section) => (
              <div key={section.title}>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {section.tokens.map((token) => (
                    <Card key={token.variable} className="border border-border py-0">
                      <div
                        className="flex h-20 items-end justify-between border-b border-border p-3"
                        style={{
                          backgroundColor: `var(${token.variable})`,
                          color: token.foregroundVariable ? `var(${token.foregroundVariable})` : "inherit",
                        }}
                      >
                        <span className="text-xs font-medium">{token.name}</span>
                        <span className="text-[11px] opacity-80">{token.variable}</span>
                      </div>
                      <CardContent className="space-y-1 px-3 py-3">
                        <p className="text-xs text-muted-foreground">{token.usage}</p>
                        <p className="font-mono text-xs text-foreground/80">{resolvedVars[token.variable]}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10 grid gap-4 lg:grid-cols-2">
          <Card className="border border-border py-0">
            <CardHeader className="border-b border-border">
              <CardTitle>Typography</CardTitle>
              <CardDescription>Primary text styles used in product UI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-5">
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Display / H1</p>
                <p className="text-5xl font-semibold tracking-tight">Outfit 48</p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Heading / H2</p>
                <p className="text-3xl font-semibold tracking-tight">Outfit 30</p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Body</p>
                <p className="text-base">
                  Keep body copy direct and readable with generous line height for long lists and notes.
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Supporting Text</p>
                <p className="text-sm text-muted-foreground">Used for labels, descriptions, and metadata.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border py-0">
            <CardHeader className="border-b border-border">
              <CardTitle>Component Snapshot</CardTitle>
              <CardDescription>Current base component style direction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 py-5">
              <div className="flex flex-wrap gap-2">
                <Button>Primary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
              <div className="rounded-md border border-border bg-card p-4">
                <p className="text-sm font-medium">Surface Sample</p>
                <p className="text-sm text-muted-foreground">
                  Cards use `--card` with foreground text and subtle border rhythm.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">Logo Usage</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {logoAssets.map((logo) => (
              <Card key={logo.src} className="border border-border py-0">
                <div className={`${logo.bgClass} flex min-h-28 items-center justify-center border-b border-border p-5`}>
                  <img src={logo.src} alt={logo.label} className="h-10 w-auto object-contain" />
                </div>
                <CardContent className="space-y-1 px-3 py-3">
                  <p className="text-sm font-medium">{logo.label}</p>
                  <p className="font-mono text-xs text-muted-foreground">{logo.src}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">Status Colors</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {statusOrder.map((status) => (
              <Card key={status} className="border border-border py-0">
                <CardContent className="space-y-3 px-3 py-3">
                  <div
                    className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm ${statusColors[status]}`}
                  >
                    {statusIcons[status]}
                    <span>{statusLabels[status]}</span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{statusColors[status]}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-2 text-2xl font-semibold tracking-tight">Icons</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Source library:{" "}
            <a
              className="underline underline-offset-4 hover:text-foreground"
              href="https://tabler.io/icons"
              target="_blank"
              rel="noreferrer"
            >
              Tabler Icons
            </a>
          </p>
          <Card className="border border-border py-0">
            <CardHeader className="border-b border-border">
              <CardTitle>Icons In Use ({iconsInUse.length})</CardTitle>
              <CardDescription>Unique icon names imported from @tabler/icons-react</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 py-5">
              {iconsInUse.map((iconName) => (
                <Badge key={iconName} variant="outline" className="font-mono text-[11px]">
                  {iconName}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
