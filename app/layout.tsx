import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BlobSpawn | Generador de archivos de prueba",
  description: "Genera archivos de prueba con tamaño exacto directamente en tu navegador.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="dark h-full antialiased font-sans"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
