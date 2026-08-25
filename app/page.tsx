"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, FileDown, ShieldCheck, Sparkles } from "lucide-react"

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
import { estimatePdf, generatePdf } from "@/lib/generators/pdf"
import { generateTextFile } from "@/lib/generators/text"
import { sizeToBytes, validatePdfPageCount, validatePdfText, validateTargetSize } from "@/lib/generators/validation"

type FormState = {
  size: string
  unit: keyof typeof SIZE_UNITS
  filename: string
  fields: Record<string, string>
}

const initialType = FILE_TYPES[0]

function formatBytes(bytes: number) {
  if (bytes >= SIZE_UNITS.MB) return `${(bytes / SIZE_UNITS.MB).toLocaleString("es-ES")} MB`
  return `${bytes.toLocaleString("es-ES")} bytes`
}

export default function Home() {
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
  const [pdfEstimate, setPdfEstimate] = useState<{ estimatedBytes: number; pageCount: number } | null>(null)

  const filteredTypes = useMemo(() => searchFileTypes(searchQuery), [searchQuery])
  const isPdf = selectedType.type === "pdf"
  const pdfMode = form.fields.pdfMode ?? "pages"
  const targetBytes = sizeToBytes(form.size, form.unit) ?? 0
  const displayedSize = isPdf && pdfMode === "pages"
    ? pdfEstimate ? `${pdfEstimate.pageCount} páginas · ~${formatBytes(pdfEstimate.estimatedBytes)}` : "Estimación pendiente"
    : Number.isFinite(targetBytes) && targetBytes > 0 ? formatBytes(targetBytes) : "Tamaño pendiente"

  useEffect(() => {
    function handleOutsidePointerDown(event: PointerEvent) {
      if (searchContainerRef.current?.contains(event.target as Node)) return

      setIsSearchOpen(false)
      setSearchQuery(selectedType.displayName)
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown)
    return () => document.removeEventListener("pointerdown", handleOutsidePointerDown)
  }, [selectedType])

  useEffect(() => {
    if (!isPdf) return

    let cancelled = false
    const options = pdfMode === "size"
      ? { mode: "size" as const, targetBytes, text: form.fields.pdfText ?? "" }
      : { mode: "pages" as const, pageCount: Number(form.fields.pageCount), text: form.fields.pdfText ?? "" }
    void estimatePdf(options).then((estimate) => {
      if (!cancelled) setPdfEstimate(estimate)
    }).catch(() => {
      if (!cancelled) setPdfEstimate(null)
    })
    return () => { cancelled = true }
  }, [form.fields.pageCount, form.fields.pdfText, isPdf, pdfMode, targetBytes])

  function selectType(type: typeof initialType) {
    setSelectedType(type)
    setSearchQuery(type.displayName)
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
      if (mode !== "pages" && mode !== "size") return "Selecciona un modo de generación para el PDF."
      const textError = validatePdfText(currentForm.fields.pdfText ?? "")
      if (textError) return textError
      if (mode === "pages") return validatePdfPageCount(currentForm.fields.pageCount ?? "")
      return validateTargetSize(currentForm.size, currentForm.unit)
    }

    const bytes = sizeToBytes(currentForm.size, currentForm.unit)
    const filename = currentForm.filename.trim()

    const sizeError = validateTargetSize(currentForm.size, currentForm.unit)
    if (sizeError || bytes === null) return sizeError ?? "El tamaño no es válido."
    if (!filename || !/^[\p{L}\p{N}_-]+$/u.test(filename)) {
      return "El nombre solo puede contener letras, números, guion medio y guion bajo."
    }
    return null
  }

  function startGeneration(currentForm: FormState) {
    const error = validate(currentForm)
    if (error) {
      setStatus("error")
      setMessage(error)
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
          ? { mode: "size", targetBytes: Number(currentForm.size) * SIZE_UNITS[currentForm.unit], text: currentForm.fields.pdfText ?? "" }
          : { mode: "pages", pageCount: Number(currentForm.fields.pageCount), text: currentForm.fields.pdfText ?? "" })
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
      const pageMessage = selectedType.type === "pdf" && "pageCount" in result ? ` y ${result.pageCount} páginas` : ""
      setMessage(`${link.download} generado con ${formatBytes(result.blob.size)} exactos${pageMessage}.`)
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "No se pudo generar el archivo.")
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
            <span className="font-mono text-sm font-semibold tracking-[0.2em]">BLOBSPAWN</span>
          </div>
          <Button
            variant="ghost"
            className="h-auto gap-2 rounded-full px-3 py-2 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            onClick={() => setIsPrivacyOpen(true)}
            aria-label="Cómo funciona el procesamiento local"
          >
            <ShieldCheck className="size-4 text-primary" />
            Procesamiento local
          </Button>
        </header>

        <section className="space-y-8">
          <div className="max-w-3xl space-y-5">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">Generador de archivos de prueba</p>
            <h1 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-5xl">Prueba los límites. Sin subir nada.</h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">Configura un archivo de tamaño exacto y créalo directamente en tu navegador.</p>
          </div>

          <div ref={searchContainerRef} className="relative overflow-visible p-0">
            <div className="mb-3 px-3 pt-2 text-base font-semibold text-foreground sm:text-lg">
              ¿Qué tipo de archivo quieres generar?
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
                className={!isSearchOpen && searchQuery === selectedType.displayName ? "pr-36 font-medium text-foreground" : undefined}
                value={searchQuery}
                onValueChange={(value) => {
                  setSearchQuery(value)
                  setIsSearchOpen(true)
                }}
                onPointerDown={() => setSearchQuery("")}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Busca .txt, JSON, Texto plano..."
                aria-label="Buscar tipo de archivo"
              />
              {!isSearchOpen && searchQuery === selectedType.displayName && (
                <span className="pointer-events-none absolute top-1/2 right-4 flex -translate-y-1/2 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  <Check className="size-3.5" />
                  {selectedType.extension} seleccionado
                </span>
              )}
            </div>
              {isSearchOpen && (
                <CommandList className="absolute inset-x-0 top-14 z-30 mt-2 rounded-2xl border border-border/70 bg-popover pt-1 shadow-xl">
                  <CommandEmpty>No hay tipos compatibles con esta búsqueda.</CommandEmpty>
                  {filteredTypes.map((type) => (
                    <CommandItem key={type.type} value={type.type} onSelect={() => selectType(type)}>
                      <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 font-mono text-xs text-primary">{type.extension}</span>
                      <span className="flex flex-col">
                        <span>{type.displayName}</span>
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
                <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Configuración</p>
                <h2 className="text-2xl font-semibold">{selectedType.displayName}</h2>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs text-primary">{selectedType.extension}</span>
            </div>

              {!isPdf && <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                 <Label htmlFor="size">{isPdf ? "Tamaño final" : "Tamaño exacto"}</Label>
                <Input id="size" type="number" min="1" step="1" value={form.size} onChange={(event) => setForm({ ...form, size: event.target.value })} />
                <p className="text-xs leading-5 text-muted-foreground">
                   Usamos MB decimales: 1 MB = 1.000.000 bytes. Por ejemplo, 10 MB pueden aparecer en Linux como aproximadamente 9,5 MiB.
                </p>
                </div>
                <div className="space-y-2 sm:min-w-32">
                <Label>Unidad</Label>
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
              <Label htmlFor="filename">Nombre del archivo</Label>
              <Input id="filename" value={form.filename} onChange={(event) => setForm({ ...form, filename: event.target.value.replace(/[^\p{L}\p{N}_-]/gu, "") })} />
              <p className="text-xs text-muted-foreground">Solo letras, letras acentuadas, números, guion medio y guion bajo. La extensión se añade automáticamente.</p>
            </div>

              <div className="mt-5 space-y-5">
               {selectedType.fields.map((field) => (
                 <div key={field.name} className="contents">
                 {!(field.name === "pageCount" && pdfMode !== "pages") && <div className="space-y-2">
                   <Label htmlFor={field.name}>{field.label}</Label>
                  {field.kind === "select" ? (
                    <Select value={form.fields[field.name]} onValueChange={(value) => value && updateField(field.name, value)}>
                      <SelectTrigger id={field.name}><SelectValue /></SelectTrigger>
                      <SelectContent>{field.options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : field.kind === "input" ? (
                    <Input id={field.name} type={field.inputType ?? "text"} value={form.fields[field.name]} onChange={(event) => updateField(field.name, event.target.value)} />
                  ) : (
                    <Textarea id={field.name} value={form.fields[field.name]} onChange={(event) => updateField(field.name, event.target.value)} />
                  )}
                  {field.description && !(field.name === "pageCount" && pdfMode !== "pages") && <p className="text-xs text-muted-foreground">{field.description}</p>}
                   {field.name === "pdfText" && <p className="text-right text-xs text-muted-foreground">{(form.fields.pdfText ?? "").length}/{GENERATOR_LIMITS.pdfMaxTextCharacters} caracteres</p>}
                 </div>}
                 {isPdf && pdfMode === "size" && field.name === "pdfMode" && <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
                   <div className="space-y-2">
                     <Label htmlFor="size">Tamaño final</Label>
                     <Input id="size" type="number" min="1" step="1" value={form.size} onChange={(event) => setForm({ ...form, size: event.target.value })} />
                     <p className="text-xs leading-5 text-muted-foreground">Usamos MB decimales: 1 MB = 1.000.000 bytes.</p>
                   </div>
                   <div className="space-y-2 sm:min-w-32">
                     <Label>Unidad</Label>
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

            <div className="mt-8 flex flex-col gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Se generará</p>
                <p className="font-mono text-sm font-medium">{displayedSize} · {form.filename || "blob"}{selectedType.extension}</p>
              </div>
              <Button size="lg" disabled={status === "generating"} onClick={() => startGeneration(form)}>
                <FileDown />
                {status === "generating" ? "Generando..." : "Spawn"}
              </Button>
            </div>
          </div>

          <aside className="flex flex-col justify-between gap-5 rounded-[2rem] border border-border/70 bg-muted/30 p-6 sm:p-8">
            <div className="space-y-6">
              <div>
                <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Límites activos</p>
                <p className="text-3xl font-semibold">2 GB</p>
                <p className="mt-1 text-sm text-muted-foreground">Máximo configurable por la aplicación</p>
              </div>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Check className="size-4 text-primary" /> Tamaño medido en bytes</div>
                <div className="flex items-center gap-2"><Check className="size-4 text-primary" /> UTF-8 y estructuras válidas</div>
                <div className="flex items-center gap-2"><Check className="size-4 text-primary" /> Sin peticiones al servidor</div>
              </div>
            </div>
            {message && <Alert variant={status === "error" ? "destructive" : "default"}><AlertTitle>{status === "success" ? "Archivo listo" : status === "error" ? "No se pudo generar" : "Procesando"}</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}
          </aside>
        </section>
      </div>

      <Dialog open={largeFileConfig !== null} onOpenChange={(open) => !open && setLargeFileConfig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archivo muy grande</DialogTitle>
            <DialogDescription>Generar archivos muy grandes (&gt;500MB) puede consumir mucha memoria RAM y ralentizar tu navegador. ¿Estás seguro?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLargeFileConfig(null)}>Cancelar</Button>
            <Button onClick={() => largeFileConfig && void download(largeFileConfig)}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPrivacyOpen} onOpenChange={setIsPrivacyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Procesamiento local</DialogTitle>
            <DialogDescription>
              BlobSpawn genera el archivo directamente en tu navegador usando los recursos de tu computador. La velocidad depende del rendimiento y la memoria disponibles en tu equipo. No subimos tus parámetros ni el archivo a ningún servidor; la descarga se crea desde un Blob temporal y se libera al terminar.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </main>
  )
}
