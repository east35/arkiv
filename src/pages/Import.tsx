/**
 * ShelfLog — Yamtrack Import Page
 *
 * CSV upload UI with preview table, progress indicator,
 * and final import report. Supports drag-and-drop or
 * file picker for CSV selection.
 */

import { useState, useRef, useCallback } from "react"
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Gamepad2,
  BookOpen,
} from "lucide-react"
import { toast } from "sonner"

import { useYamtrackImport, type ImportReport } from "@/hooks/useYamtrackImport"
import type { ParseResult } from "@/lib/yamtrack-parser"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function Import() {
  const { progress, preview, execute, reset } = useYamtrackImport()

  const [csvText, setCsvText] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [dragging, setDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // -------------------------------------------------------------------------
  // File Handling
  // -------------------------------------------------------------------------

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setCsvText(text)
      setFileName(file.name)
      setReport(null)

      // Parse immediately for preview
      const result = preview(text)
      setParseResult(result)
    }
    reader.readAsText(file)
  }, [preview])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  // -------------------------------------------------------------------------
  // Import Execution
  // -------------------------------------------------------------------------

  const handleImport = async () => {
    if (!csvText) return
    try {
      const result = await execute(csvText)
      setReport(result)
      toast.success(`Imported ${result.inserted} items`)
    } catch (error) {
      console.error("Import failed:", error)
      toast.error("Import failed. Check the console for details.")
    }
  }

  const handleReset = () => {
    setCsvText(null)
    setFileName(null)
    setParseResult(null)
    setReport(null)
    reset()
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 sm:p-6 pb-2 border-b mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Import</h1>
            <p className="text-muted-foreground mt-1">
              Import your library from a Yamtrack CSV export.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-8 space-y-6 max-w-3xl">

        {/* Upload Zone */}
        {!parseResult && (
          <Card>
            <CardContent className="pt-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                )}
              >
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">
                  Drop your Yamtrack CSV here
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
              />
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        {parseResult && !report && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {fileName}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {parseResult.totalParsed} rows parsed
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleReset}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-green-500/10 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {parseResult.rows.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Ready to import</div>
                  </div>
                  <div className="bg-yellow-500/10 rounded-lg p-4">
                    <div className="text-2xl font-bold text-yellow-600">
                      {parseResult.skipped.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
                  </div>
                  <div className="bg-blue-500/10 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {parseResult.rows.filter((r) => r.item.media_type === "game").length} / {parseResult.rows.filter((r) => r.item.media_type === "book").length}
                    </div>
                    <div className="text-xs text-muted-foreground">Games / Books</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items to Import */}
            <Card>
              <CardHeader>
                <CardTitle>Items to Import ({parseResult.rows.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {parseResult.rows.map((row, i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5 border-b last:border-0">
                      {row.item.media_type === "game"
                        ? <Gamepad2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        : <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      }
                      <span className="truncate flex-1 text-sm">{row.item.title}</span>
                      <Badge variant="outline" className="text-xs capitalize flex-shrink-0">
                        {row.item.status.replace("_", " ")}
                      </Badge>
                      {row.item.user_score != null && (
                        <span className="text-xs text-muted-foreground w-8 text-right flex-shrink-0">
                          {row.item.user_score}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Skipped Items */}
            {parseResult.skipped.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    Skipped ({parseResult.skipped.length})
                  </CardTitle>
                  <CardDescription>
                    These items won't be imported.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {parseResult.skipped.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                        <span className="truncate">{s.title}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {s.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Import Button + Progress */}
            <Card>
              <CardContent className="pt-6">
                {progress.phase === "inserting" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">
                        Importing… {progress.current} / {progress.total}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                      />
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>✓ {progress.inserted} inserted</span>
                      <span>⊘ {progress.duplicates} duplicates</span>
                      {progress.errors.length > 0 && (
                        <span className="text-destructive">✗ {progress.errors.length} errors</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <Button onClick={handleImport} className="w-full" size="lg">
                    <Upload className="mr-2 h-4 w-4" />
                    Import {parseResult.rows.length} Items
                  </Button>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Report */}
        {report && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Import Complete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-green-500/10 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">{report.inserted}</div>
                  <div className="text-xs text-muted-foreground">Inserted</div>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <div className="text-2xl font-bold">{report.duplicates}</div>
                  <div className="text-xs text-muted-foreground">Duplicates (skipped)</div>
                </div>
              </div>
              {report.errors.length > 0 && (
                <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                  <p className="text-sm font-medium text-destructive mb-1">
                    {report.errors.length} error(s):
                  </p>
                  <ul className="text-xs text-destructive space-y-1">
                    {report.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={handleReset}>
                Import Another File
              </Button>
            </CardFooter>
          </Card>
        )}

      </div>
    </div>
  )
}
