import type { Metadata } from "next"
import "./globals.css"
import Script from "next/script"
import { Providers } from "./providers"

export const metadata: Metadata = {
  title: "BlobSpawn | Generador de archivos de prueba",
  description: "Genera archivos de prueba con tamaño exacto directamente en tu navegador.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
      suppressHydrationWarning
    >
      <head>
        <Script id="anti-flash" strategy="beforeInteractive">{`
          try {
            var l=localStorage.getItem("blobspawn-locale");
            if(l){document.documentElement.setAttribute("lang",l)}else{var n=navigator.language||"";if(n&&n.slice(0,2)==="es")document.documentElement.setAttribute("lang","es")}
          }catch(e){}
          try {
            var t=localStorage.getItem("blobspawn-theme");
            var init={};
            if(t==="light"){
              document.documentElement.classList.remove("dark");
              init.theme="light";
            }else if(t==="system"){
              if(!window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.classList.remove("dark")}
              init.theme="system";
            }else{
              document.documentElement.classList.add("dark");
              init.theme="dark";
            }
            window.__BLOBSPAWN_INIT__=init;
          }catch(e){}
        `}</Script>
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
