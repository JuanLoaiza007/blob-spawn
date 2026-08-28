import type { Metadata } from "next"
import "./globals.css"
import { I18nProvider } from "@/lib/i18n"

export const metadata: Metadata = {
  title: "BlobSpawn | Generador de archivos de prueba",
  description: "Genera archivos de prueba con tamaño exacto directamente en tu navegador.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="dark h-full antialiased font-sans"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem("blobspawn-locale");if(l){document.documentElement.setAttribute("lang",l)}else{var n=navigator.language||"";if(n&&n.slice(0,2)==="es")document.documentElement.setAttribute("lang","es")}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  )
}
