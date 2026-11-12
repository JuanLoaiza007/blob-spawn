"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useI18n } from "@/lib/i18n"
import { clientConfig, type McpClient } from "@/lib/mcp-distribution"

const LABELS: Record<McpClient, string> = {
  claude: "Claude Desktop",
  cursor: "Cursor",
  opencode: "OpenCode",
  vscode: "VS Code",
}

export function McpConfig() {
  const { t } = useI18n()
  const [client, setClient] = useState<McpClient>("claude")
  const [outputDir, setOutputDir] = useState("")
  const [copied, setCopied] = useState(false)

  const directory = outputDir.trim() || t("mcp.outputDirPlaceholder")
  const config = JSON.stringify(clientConfig(client, directory), null, 2)

  async function copy() {
    try {
      await navigator.clipboard.writeText(config)
      setCopied(true)
      setTimeout(() => setCopied(false), 2_000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("mcp.client")}</Label>
          <Select value={client} onValueChange={(value) => value && setClient(value as McpClient)}>
            <SelectTrigger>
              <SelectValue>{LABELS[client]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mcp-output-dir">{t("mcp.outputDir")}</Label>
          <Input
            id="mcp-output-dir"
            value={outputDir}
            onChange={(event) => setOutputDir(event.target.value)}
            placeholder={t("mcp.outputDirPlaceholder")}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="relative rounded-xl border border-border/70 bg-muted/40">
        <pre className="overflow-x-auto p-4 pr-14 font-mono text-xs leading-6">{config}</pre>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 size-8"
          onClick={() => void copy()}
          aria-label={t("mcp.copy")}
        >
          {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{copied ? t("mcp.copied") : t("mcp.configHelp")}</p>
    </div>
  )
}
