"use client"

import Link from "next/link"
import { ArrowLeft, FolderLock, ShieldCheck, Sparkles, Terminal, Wrench } from "lucide-react"

import { McpConfig } from "@/components/mcp-config"
import { buttonVariants } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"
import { installCommand } from "@/lib/mcp-distribution"
import { cn } from "@/lib/utils"

export default function McpPage() {
  const { t } = useI18n()

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_top,oklch(0.35_0.18_300/0.25),transparent_65%)]" />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="size-5" />
            </span>
            <span className="font-mono text-sm font-semibold tracking-[0.2em]">{t("header.brand")}</span>
          </Link>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "ghost" }), "gap-2 text-muted-foreground")}
          >
            <ArrowLeft className="size-4" />
            {t("mcp.back")}
          </Link>
        </header>

        <section className="space-y-5">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">{t("mcp.subtitle")}</p>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">{t("mcp.headline")}</h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground">{t("mcp.description")}</p>
          <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            {t("mcp.privacy")}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-xl shadow-black/10 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <Terminal className="size-5 text-primary" />
              <h2 className="text-xl font-semibold">{t("mcp.installTitle")}</h2>
            </div>
            <p className="mb-4 text-sm leading-6 text-muted-foreground">{t("mcp.installHelp")}</p>
            <div className="rounded-xl border border-border/70 bg-muted/40 p-4 font-mono text-xs leading-6 break-all whitespace-pre-wrap">
              {installCommand(t("mcp.outputDirPlaceholder"))}
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">{t("mcp.clients")}</p>
          </div>

          <div className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-xl shadow-black/10 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <Wrench className="size-5 text-primary" />
              <h2 className="text-xl font-semibold">{t("mcp.configTitle")}</h2>
            </div>
            <McpConfig />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-border/70 bg-muted/30 p-6 sm:p-8">
            <h2 className="mb-5 text-xl font-semibold">{t("mcp.toolsTitle")}</h2>
            <div className="space-y-4 text-sm">
              {[
                ["list_file_types", t("mcp.tools.list")],
                ["generate_text_file", t("mcp.tools.text")],
                ["estimate_pdf", t("mcp.tools.estimate")],
                ["generate_pdf_file", t("mcp.tools.pdf")],
              ].map(([name, description]) => (
                <div key={name} className="rounded-xl border border-border/60 bg-background/60 p-4">
                  <p className="font-mono text-xs text-primary">{name}</p>
                  <p className="mt-2 leading-6 text-muted-foreground">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-border/70 bg-muted/30 p-6 sm:p-8">
              <div className="mb-5 flex items-center gap-3">
                <FolderLock className="size-5 text-primary" />
                <h2 className="text-xl font-semibold">{t("mcp.limitsTitle")}</h2>
              </div>
              <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
                <li>{t("mcp.limits.text")}</li>
                <li>{t("mcp.limits.pdf")}</li>
                <li>{t("mcp.limits.security")}</li>
                <li>{t("mcp.limits.overwrite")}</li>
                <li>{t("mcp.limits.paths")}</li>
              </ul>
            </div>
            <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-800 dark:text-amber-200">
              {t("mcp.warning")}
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
