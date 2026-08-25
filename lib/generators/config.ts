export const SIZE_UNITS = {
  KB: 1_000,
  MB: 1_000_000,
} as const

export const GENERATOR_LIMITS = {
  minBytes: SIZE_UNITS.KB,
  maxInputBytes: 2048 * SIZE_UNITS.MB,
  maxApplicationBytes: 2_000_000_000,
  largeFileWarningBytes: 500 * SIZE_UNITS.MB,
} as const

export type FileType = "txt" | "json" | "csv"

export type FileField =
  | {
      kind: "select"
      name: string
      label: string
      description?: string
      options: { value: string; label: string }[]
    }
  | {
      kind: "textarea"
      name: string
      label: string
      description?: string
    }

export type GeneratorConfig = {
  type: FileType
  extension: `.${FileType}`
  mimeType: string
  displayName: string
  aliases: string[]
  fields: FileField[]
  defaults: Record<string, string>
}

export const FILE_TYPES: GeneratorConfig[] = [
  {
    type: "txt",
    extension: ".txt",
    mimeType: "text/plain;charset=utf-8",
    displayName: "Texto plano",
    aliases: ["texto", "plain text", "text file"],
    fields: [
      {
        kind: "select",
        name: "contentSource",
        label: "Contenido",
        options: [
          { value: "lorem", label: "Lorem Ipsum" },
          { value: "sequence", label: "Secuencia ASCII" },
        ],
      },
    ],
    defaults: { contentSource: "lorem" },
  },
  {
    type: "json",
    extension: ".json",
    mimeType: "application/json;charset=utf-8",
    displayName: "JSON",
    aliases: ["javascript object notation", "datos json"],
    fields: [
      {
        kind: "textarea",
        name: "jsonKey",
        label: "Nombre del campo",
        description: "Se usará como una clave simple dentro del objeto generado.",
      },
    ],
    defaults: { jsonKey: "data" },
  },
  {
    type: "csv",
    extension: ".csv",
    mimeType: "text/csv;charset=utf-8",
    displayName: "CSV",
    aliases: ["comma separated values", "valores separados por comas"],
    fields: [
      {
        kind: "textarea",
        name: "csvHeader",
        label: "Encabezado",
        description: "Una columna ASCII. Las filas usarán el mismo número de campos.",
      },
    ],
    defaults: { csvHeader: "data" },
  },
]

const normalizeSearch = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase()
    .replace(/^\./, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

export function searchFileTypes(query: string) {
  const normalizedQuery = normalizeSearch(query)

  if (!normalizedQuery) return FILE_TYPES

  return FILE_TYPES
    .map((fileType, index) => {
      const searchableValues = [
        fileType.type,
        fileType.extension,
        fileType.displayName,
        ...fileType.aliases,
      ].map(normalizeSearch)

      const exactMatch = searchableValues.some((value) => value === normalizedQuery)
      const startsWithMatch = searchableValues.some((value) => value.startsWith(normalizedQuery))
      const includesMatch = searchableValues.some((value) => value.includes(normalizedQuery))

      return {
        fileType,
        score: exactMatch ? 0 : startsWithMatch ? 1 : includesMatch ? 2 : 3,
        index,
      }
    })
    .filter((result) => result.score < 3)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map(({ fileType }) => fileType)
}

export function parseFilenameBase(value: string) {
  return value.replace(/[^\p{L}\p{N}_-]/gu, "")
}

export function getFilename(fileType: GeneratorConfig, baseName: string) {
  return `${parseFilenameBase(baseName) || "blob"}${fileType.extension}`
}
