"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, FileDown, Settings, ShieldCheck, Sparkles } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FILE_TYPES, GENERATOR_LIMITS, SIZE_UNITS, searchFileTypes } from "@/lib/generators/config"
import { AppError, isAppError } from "@/lib/generators/errors"
import { estimatePdf, generatePdf } from "@/lib/generators/pdf"
import { DEFAULT_PDF_SECURITY, PDF_SECURITY_PASSWORDS, type PdfSecurityRestrictions } from "@/lib/generators/pdf-security"
import { generateTextFile } from "@/lib/generators/text"
import { sizeToBytes, validatePdfPageCount, validatePdfText, validateTargetSize } from "@/lib/generators/validation"
import { useI18n } from "@/lib/i18n"
import { useTheme } from "@/lib/theme"

type FormState = {
  size: string
  unit: keyof typeof SIZE_UNITS
  filename: string
  fields: Record<string, string>
}

const initialType = FILE_TYPES[0]

function formatBytes(bytes: number, locale: string) {
  if (bytes >= SIZE_UNITS.MB) return `${(bytes / SIZE_UNITS.MB).toLocaleString(locale)} MB`
  return `${bytes.toLocaleString(locale)} bytes`
}

function fieldLabelKey(type: string, fieldName: string) {
  return `types.${type}.fields.${fieldName}`
}

function fieldDescriptionKey(type: string, fieldName: string) {
  return `types.${type}.fields.${fieldName}Description`
}

function optionLabelKey(optionValue: string) {
  const map: Record<string, string> = {
    pages: "fieldOptions.pdfModePages",
    size: "fieldOptions.pdfModeSize",
    lorem: "fieldOptions.contentSourceLorem",
    sequence: "fieldOptions.contentSourceSequence",
  }
  return map[optionValue] ?? optionValue
}

export default function Home() {
  const { t, locale, setLocale } = useI18n()
  const { theme, setTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState(initialType)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [form, setForm] = useState<FormState>({
    size: "5",
    unit: "MB",
    filename: "blob-spawn",
    fields: { ...initialType.defaults },
  })
  const [largeFileConfig, setLargeFileConfig] = useState<FormState | null>(null)
  const [status, setStatus] = useState<"idle" | "generating" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [pdfEstimate, setPdfEstimate] = useState<{ estimatedBytes: number; pageCount: number } | null>(null)

  const formatLocale = locale === "es" ? "es-ES" : "en-US"
  const filteredTypes = useMemo(() => searchFileTypes(searchQuery), [searchQuery])
  const isPdf = selectedType.type === "pdf"
  const pdfMode = form.fields.pdfMode ?? "pages"
  const targetBytes = sizeToBytes(form.size, form.unit) ?? 0
  const displayedSize = isPdf && pdfMode === "pages"
    ? pdfEstimate ? t("form.estimatedWithPages", { count: String(pdfEstimate.pageCount), size: formatBytes(pdfEstimate.estimatedBytes, formatLocale) }) : t("form.pendingEstimate")
    : Number.isFinite(targetBytes) && targetBytes > 0 ? formatBytes(targetBytes, formatLocale) : t("form.pendingSize")
  const pdfSecurity = useMemo(() => getPdfSecurity(form.fields), [form.fields])

  useEffect(() => {
    function handleOutsidePointerDown(event: PointerEvent) {
      if (searchContainerRef.current?.contains(event.target as Node)) return

      setIsSearchOpen(false)
      setSearchQuery("")
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown)
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown)
  }, [])

  useEffect(() => {
    if (!isPdf) return

    let cancelled = false
    const options = pdfMode === "size"
      ? { mode: "size" as const, targetBytes, text: form.fields.pdfText ?? "", security: pdfSecurity }
      : { mode: "pages" as const, pageCount: Number(form.fields.pageCount), text: form.fields.pdfText ?? "", security: pdfSecurity }
    void estimatePdf(options).then((estimate) => {
      if (!cancelled) setPdfEstimate(estimate)
    }).catch(() => {
      if (!cancelled) setPdfEstimate(null)
    })
    return () => { cancelled = true }
  }, [form.fields.pageCount, form.fields.pdfText, isPdf, pdfMode, targetBytes, pdfSecurity])

  function selectType(type: typeof initialType) {
    setSelectedType(type)
    setSearchQuery("")
    setIsSearchOpen(false)
    setForm((current) => ({ ...current, fields: { ...type.defaults } }))
    setMessage("")
  }

  function updateField(name: string, value: string) {
    setForm((current) => {
      const fields = { ...current.fields, [name]: value }
      if (name === "pdfMode" && value === "size") fields.pageCount = ""
      return { ...current, fields }
    })
  }

  function validate(currentForm: FormState) {
    if (selectedType.type === "pdf") {
      const mode = currentForm.fields.pdfMode
      if (mode !== "pages" && mode !== "size") return "SELECT_MODE"
      if (mode === "size" && currentForm.fields.pdfSecurityEnabled === "true") return "SECURITY_SIZE_INCOMPATIBLE"
      const textError = validatePdfText(currentForm.fields.pdfText ?? "")
      if (textError) return textError
      if (mode === "pages") return validatePdfPageCount(currentForm.fields.pageCount ?? "")
      return validateTargetSize(currentForm.size, currentForm.unit)
    }

    const bytes = sizeToBytes(currentForm.size, currentForm.unit)
    const filename = currentForm.filename.trim()

    const sizeError = validateTargetSize(currentForm.size, currentForm.unit)
    if (sizeError || bytes === null) return sizeError ?? "SIZE_POSITIVE"
    if (!filename || !/^[\p{L}\p{N}_-]+$/u.test(filename)) {
      return "INVALID_FILENAME"
    }
    return null
  }

  function startGeneration(currentForm: FormState) {
    const error = validate(currentForm)
    if (error) {
      setStatus("error")
      setMessage(t(`errors.${error}`))
      return
    }

    const bytes = selectedType.type === "pdf" && currentForm.fields.pdfMode === "pages"
      ? pdfEstimate?.estimatedBytes ?? 0
      : Number(currentForm.size) * SIZE_UNITS[currentForm.unit]
    if (bytes > GENERATOR_LIMITS.largeFileWarningBytes) {
      setLargeFileConfig(currentForm)
      return
    }

    void download(currentForm)
  }

  async function download(currentForm: FormState) {
    setLargeFileConfig(null)
    setStatus("generating")
    setMessage("")

    try {
      const result = selectedType.type === "pdf"
          ? await generatePdf(currentForm.fields.pdfMode === "size"
          ? { mode: "size", targetBytes: Number(currentForm.size) * SIZE_UNITS[currentForm.unit], text: currentForm.fields.pdfText ?? "", security: getPdfSecurity(currentForm.fields) }
          : { mode: "pages", pageCount: Number(currentForm.fields.pageCount), text: currentForm.fields.pdfText ?? "", security: getPdfSecurity(currentForm.fields) })
        : generateTextFile(
            { type: selectedType.type, targetBytes: Number(currentForm.size) * SIZE_UNITS[currentForm.unit], ...currentForm.fields },
            selectedType,
          )
      const objectUrl = URL.createObjectURL(result.blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = `${currentForm.filename}${result.extension}`
      link.click()
      URL.revokeObjectURL(objectUrl)
      setStatus("success")
      const pageMsg = selectedType.type === "pdf" && "pageCount" in result ? t("alert.pageMessage", { count: String(result.pageCount) }) : ""
      setMessage(t("alert.generated", { filename: link.download, size: formatBytes(result.blob.size, formatLocale), pageMessage: pageMsg }))
    } catch (error) {
      setStatus("error")
      setMessage(isAppError(error) ? t(`errors.${error.code}`) : t("errors.GENERIC_GENERATION"))
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_top,oklch(0.35_0.18_300/0.25),transparent_65%)]" />
      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="size-5" />
            </div>
            <span className="font-mono text-sm font-semibold tracking-[0.2em]">{t("header.brand")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              onClick={() => setIsSettingsOpen(true)}
              aria-label={t("settings.buttonAria")}
            >
              <Settings className="size-4" />
            </Button>
          </div>
        </header>

        <section className="space-y-8">
          <div className="max-w-3xl space-y-5">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">{t("home.subtitle")}</p>
            <h1 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-5xl">{t("home.headline")}</h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">{t("home.description")}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="h-auto gap-2 rounded-full px-3 py-2 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              onClick={() => setIsPrivacyOpen(true)}
              aria-label={t("badge.localProcessingAria")}
            >
              <ShieldCheck className="size-4 text-primary" />
              {t("badge.localProcessing")}
            </Button>
          </div>

          <div ref={searchContainerRef} className="relative overflow-visible p-0">
            <div className="mb-3 px-3 pt-2 text-base font-semibold text-foreground sm:text-lg">
              {t("search.prompt")}
            </div>
            <Command
              className="relative h-auto overflow-visible rounded-none bg-transparent p-0 [&_[data-slot=input-group]]:border [&_[data-slot=input-group]]:border-primary/40 [&_[data-slot=input-group]]:bg-card [&_[data-slot=input-group]]:shadow-lg"
              shouldFilter={false}
              onKeyDown={(event) => {
                if (event.key === "Enter" && filteredTypes[0]) {
                  event.preventDefault()
                  selectType(filteredTypes[0])
                }
              }}
            >
            <div className="relative">
              <CommandInput
                className={!isSearchOpen ? "pr-36 font-medium text-foreground" : undefined}
                value={searchQuery}
                onValueChange={(value) => {
                  setSearchQuery(value)
                  setIsSearchOpen(true)
                }}
                onPointerDown={() => setSearchQuery("")}
                onFocus={() => setIsSearchOpen(true)}
                placeholder={t("search.placeholder")}
                aria-label={t("search.placeholder")}
              />
              {!isSearchOpen && (
                <span className="pointer-events-none absolute top-1/2 right-4 flex -translate-y-1/2 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  <Check className="size-3.5" />
                  {t("search.selected", { ext: selectedType.extension })}
                </span>
              )}
            </div>
              {isSearchOpen && (
                <CommandList className="absolute inset-x-0 top-14 z-30 mt-2 rounded-2xl border border-border/70 bg-popover pt-1 shadow-xl">
                  <CommandEmpty>{t("search.empty")}</CommandEmpty>
                  {filteredTypes.map((type) => (
                    <CommandItem key={type.type} value={type.type} onSelect={() => selectType(type)}>
                      <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 font-mono text-xs text-primary">{type.extension}</span>
                      <span className="flex flex-col">
                        <span>{t(`types.${type.type}.name`)}</span>
                        <span className="text-xs font-normal text-muted-foreground">{type.aliases[0]}</span>
                      </span>
                      {selectedType.type === type.type && <Check className="ml-auto size-4 text-primary" />}
                    </CommandItem>
                  ))}
                </CommandList>
              )}
            </Command>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.55fr]">
          <div className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-xl shadow-black/10 sm:p-8">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("form.configTitle")}</p>
                <h2 className="text-2xl font-semibold">{t(`types.${selectedType.type}.name`)}</h2>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs text-primary">{selectedType.extension}</span>
            </div>

              {!isPdf && <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                 <Label htmlFor="size">{t("form.exactSize")}</Label>
                <Input id="size" type="number" min="1" step="1" value={form.size} onChange={(event) => setForm({ ...form, size: event.target.value })} />
                <p className="text-xs leading-5 text-muted-foreground">
                   {t("form.sizeHelp")}
                </p>
                </div>
                <div className="space-y-2 sm:min-w-32">
                <Label>{t("form.unitLabel")}</Label>
                    <Select value={form.unit} onValueChange={(value) => value && setForm({ ...form, unit: value as FormState["unit"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KB">KB</SelectItem>
                    <SelectItem value="MB">MB</SelectItem>
                  </SelectContent>
                </Select>
                </div>
              </div>}

            <div className="mt-5 space-y-2">
              <Label htmlFor="filename">{t("form.filenameLabel")}</Label>
              <Input id="filename" value={form.filename} onChange={(event) => setForm({ ...form, filename: event.target.value.replace(/[^\p{L}\p{N}_-]/gu, "") })} />
              <p className="text-xs text-muted-foreground">{t("form.filenameHelp")}</p>
            </div>

              <div className="mt-5 space-y-5">
               {selectedType.fields.map((field) => (
                 <div key={field.name} className="contents">
                 {!(field.name === "pageCount" && pdfMode !== "pages") && <div className="space-y-2">
                   <Label htmlFor={field.name}>{t(fieldLabelKey(selectedType.type, field.name))}</Label>
                  {field.kind === "select" ? (
                    <Select value={form.fields[field.name]} onValueChange={(value) => value && updateField(field.name, value)}>
                      <SelectTrigger id={field.name}><SelectValue>{t(optionLabelKey(form.fields[field.name]))}</SelectValue></SelectTrigger>
                      <SelectContent>{field.options.map((option) => <SelectItem key={option.value} value={option.value}>{t(optionLabelKey(option.value))}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : field.kind === "input" ? (
                    <Input id={field.name} type={field.inputType ?? "text"} value={form.fields[field.name]} onChange={(event) => updateField(field.name, event.target.value)} />
                  ) : (
                    <Textarea id={field.name} value={form.fields[field.name]} onChange={(event) => updateField(field.name, event.target.value)} />
                  )}
                  {field.description && !(field.name === "pageCount" && pdfMode !== "pages") && <p className="text-xs text-muted-foreground">{t(fieldDescriptionKey(selectedType.type, field.name))}</p>}
                   {field.name === "pdfText" && <p className="text-right text-xs text-muted-foreground">{t("form.charsCount", { count: String((form.fields.pdfText ?? "").length), limit: String(GENERATOR_LIMITS.pdfMaxTextCharacters) })}</p>}
                 </div>}
                 {isPdf && pdfMode === "size" && field.name === "pdfMode" && <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
                   <div className="space-y-2">
                     <Label htmlFor="size">{t("form.finalSize")}</Label>
                     <Input id="size" type="number" min="1" step="1" value={form.size} onChange={(event) => setForm({ ...form, size: event.target.value })} />
                     <p className="text-xs leading-5 text-muted-foreground">{t("form.sizeHelpShort")}</p>
                   </div>
                   <div className="space-y-2 sm:min-w-32">
                     <Label>{t("form.unitLabel")}</Label>
                     <Select value={form.unit} onValueChange={(value) => value && setForm({ ...form, unit: value as FormState["unit"] })}>
                       <SelectTrigger><SelectValue /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="KB">KB</SelectItem>
                         <SelectItem value="MB">MB</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </div>}
                 </div>
               ))}
             </div>

             {isPdf && <PdfSecurityFields fields={form.fields} updateField={updateField} t={t} />}

            <div className="mt-8 flex flex-col gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t("form.estimatedPrefix")}</p>
                <p className="font-mono text-sm font-medium">{displayedSize} · {form.filename || "blob"}{selectedType.extension}</p>
              </div>
              <Button size="lg" disabled={status === "generating"} onClick={() => startGeneration(form)}>
                <FileDown />
                {status === "generating" ? t("button.generating") : t("button.spawn")}
              </Button>
            </div>
          </div>

          <aside className="flex flex-col justify-between gap-5 rounded-[2rem] border border-border/70 bg-muted/30 p-6 sm:p-8">
            <div className="space-y-6">
              <div>
                <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{t("limits.title")}</p>
                <p className="text-3xl font-semibold">2 GB</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("limits.maxHelp")}</p>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Check className="size-4 text-primary" /> {t("limits.features.bytes")}</div>
                <div className="flex items-center gap-2"><Check className="size-4 text-primary" /> {t("limits.features.utf8")}</div>
                <div className="flex items-center gap-2"><Check className="size-4 text-primary" /> {t("limits.features.noServer")}</div>
              </div>
            </div>
            {message && <Alert variant={status === "error" ? "destructive" : "default"}><AlertTitle>{status === "success" ? t("alert.successTitle") : status === "error" ? t("alert.errorTitle") : t("alert.processing")}</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}
          </aside>
        </section>
      </div>

      <Dialog open={largeFileConfig !== null} onOpenChange={(open) => !open && setLargeFileConfig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("largeFileDialog.title")}</DialogTitle>
            <DialogDescription>{t("largeFileDialog.description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLargeFileConfig(null)}>{t("button.cancel")}</Button>
            <Button onClick={() => largeFileConfig && void download(largeFileConfig)}>{t("button.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent overlayClassName="backdrop-blur-lg">
          <DialogHeader>
            <DialogTitle>{t("settings.title")}</DialogTitle>
            <DialogDescription>{t("settings.description")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-6">
            <div className="space-y-2">
              <Label>{t("settings.language")}</Label>
              <Select value={locale} onValueChange={(value) => value && setLocale(value as "es" | "en")}>
                <SelectTrigger><SelectValue>{locale === "en" ? "English" : "Español"}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("settings.themeLabel")}</Label>
              <Select value={theme} onValueChange={(value) => value && setTheme(value as "dark" | "light" | "system")}>
                <SelectTrigger><SelectValue>{t("settings.theme." + theme)}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">{t("settings.theme.dark")}</SelectItem>
                  <SelectItem value="light">{t("settings.theme.light")}</SelectItem>
                  <SelectItem value="system">{t("settings.theme.system")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPrivacyOpen} onOpenChange={setIsPrivacyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("privacy.title")}</DialogTitle>
            <DialogDescription>
              {t("privacy.description")}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function getPdfSecurity(fields: Record<string, string>) {
  const restrictions: PdfSecurityRestrictions = {
    printing: fields.pdfRestrictionPrinting === "true",
    changingDocument: fields.pdfRestrictionChangingDocument === "true",
    documentAssembly: fields.pdfRestrictionDocumentAssembly === "true",
    contentCopying: fields.pdfRestrictionContentCopying === "true",
    accessibilityExtraction: fields.pdfRestrictionAccessibilityExtraction === "true",
    pageExtraction: fields.pdfRestrictionPageExtraction === "true",
    commenting: fields.pdfRestrictionCommenting === "true",
    formFilling: fields.pdfRestrictionFormFilling === "true",
    signing: fields.pdfRestrictionSigning === "true",
    templatePages: fields.pdfRestrictionTemplatePages === "true",
  }
  return { ...DEFAULT_PDF_SECURITY, enabled: fields.pdfSecurityEnabled === "true", restrictions }
}

const PDF_RESTRICTION_KEYS = [
  "printing",
  "changingDocument",
  "documentAssembly",
  "contentCopying",
  "accessibilityExtraction",
  "pageExtraction",
  "commenting",
  "formFilling",
  "signing",
  "templatePages",
] as const

function PdfSecurityFields({ fields, updateField, t }: { fields: Record<string, string>; updateField: (name: string, value: string) => void; t: (key: string, params?: Record<string, string>) => string }) {
  const enabled = fields.pdfSecurityEnabled === "true"
  return (
    <div className="mt-8 space-y-4 border-t border-border/60 pt-6">
      <div className="flex items-start gap-3">
        <input id="pdfSecurityEnabled" type="checkbox" className="mt-0.5 size-4 accent-primary" checked={enabled} onChange={(event) => updateField("pdfSecurityEnabled", String(event.target.checked))} />
        <div className="space-y-1">
          <Label htmlFor="pdfSecurityEnabled">{t("security.enableLabel")}</Label>
          <p className="text-xs leading-5 text-muted-foreground">{t("security.enableHelp")}</p>
        </div>
      </div>
      {enabled && <>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-5 text-muted-foreground">
          <p>{t("security.credentialsTitle")}</p>
          <p className="font-mono text-foreground">{t("security.user", { password: PDF_SECURITY_PASSWORDS.user })}</p>
          <p className="font-mono text-foreground">{t("security.owner", { password: PDF_SECURITY_PASSWORDS.owner })}</p>
          <p className="mt-2">{t("security.restrictionsHelp")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {PDF_RESTRICTION_KEYS.map((name) => {
            const checked = fields[`pdfRestriction${name.charAt(0).toUpperCase() + name.slice(1)}`] === "true"
            return <label key={name} className="flex items-start gap-3 rounded-xl border border-border/60 p-3 text-sm leading-5">
              <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={checked} onChange={(event) => updateField(`pdfRestriction${name.charAt(0).toUpperCase() + name.slice(1)}`, String(event.target.checked))} />
              <span className="space-y-1">
                <span className="block">{t(`security.restrictions.${name}`)}</span>
                {name === "accessibilityExtraction" && <span className="block text-xs font-normal leading-5 text-amber-700 dark:text-amber-300">{t("security.accessibilityWarning")}</span>}
              </span>
            </label>
          })}
        </div>
      </>}
    </div>
  )
}