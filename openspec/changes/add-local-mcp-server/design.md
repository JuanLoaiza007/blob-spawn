# Design

## Context

La generación actual vive en `lib/generators` y se consume desde `app/page.tsx`. El núcleo devuelve `Blob` y el backend de seguridad PDF depende de `qpdf-run`, un Worker del navegador, y de `window.location.origin`. La aplicación se despliega como exportación estática (`output: "export"`), sin Route Handlers ni funciones, y esa restricción se mantiene. Ver `proposal.md` para la motivación.

El nuevo consumidor es un proceso Node lanzado por un cliente MCP mediante stdio. Ese proceso no comparte `cwd`, sistema de archivos ni APIs con el navegador, y debe funcionar en Linux, macOS y Windows.

## Goals / Non-Goals

**Goals:**

- Compartir una única implementación de formatos, validación y verificación entre web y MCP.
- Mantener el paquete MCP invisible para el build y el despliegue de Vercel.
- Evitar dependencias de binarios del sistema para que la instalación no varíe por plataforma.
- Hacer que las escrituras sean seguras, atómicas y confinadas.
- Mantener el coste de Vercel en cero incremental.

**Non-Goals:**

- Crear un MCP remoto o un endpoint HTTP.
- Añadir autenticación, cuotas o telemetría al servidor local.
- Soportar clientes que no puedan lanzar procesos locales.
- Garantizar PDFs de 2 GB en memoria; el límite práctico de PDF será configurable y menor.
- Extraer un paquete `core` independiente en esta iteración.

## Decisions

### Paquete anidado sin workspaces

`packages/mcp` será un paquete npm independiente dentro del repo, con su propio `package.json`, `node_modules`, lockfile y build. No se declara workspace en la raíz.

Razón: Vercel ejecuta `npm install` en la raíz. Sin workspaces, no instala dependencias MCP ni incluye el paquete en el build. El `tsconfig.json` raíz excluye `packages`, y ESLint lo ignora.

Alternativas descartadas:

- Workspace npm: Vercel instalaría dependencias ajenas al sitio y aumentaría el build.
- Repo separado: duplicaría el core o exigiría publicar `@blob-spawn/core` antes de tiempo.
- Copiar el core: deriva inevitable entre web y MCP.

El build de `packages/mcp` importa `../../../lib/generators/*` y `tsup` lo bundlea en `dist`. El tarball publicado contiene solo `dist`, README y LICENSE; nunca el código fuente del padre.

### Core con salida incremental y backend inyectable

`lib/generators/text.ts` añade `textChunks(options)`, un generador que emite `Uint8Array` del tamaño exacto sin reservar el archivo completo. `generateTextFile` se mantiene para la web juntando los chunks en un `Blob`.

`lib/generators/pdf.ts` acepta un `PdfSecurityBackend` opcional. Si la seguridad está activa y no se inyecta backend, importa dinámicamente el backend navegador actual. El backend Node se implementa en el paquete MCP.

Razón: el navegador necesita `Blob`; Node necesita escribir a disco con memoria acotada. La inyección evita importar `window` o Workers en Node.

Alternativa descartada: duplicar generadores en el paquete MCP. Rompería la verificación y los tests existentes.

### Cifrado con qpdf WebAssembly en Node

Se vendoriza `public/qpdf/qpdf.js` y `public/qpdf/qpdf.wasm` dentro del paquete y se envuelve el runtime Emscripten en un runner Node con `FS.writeFile`, `callMain` y `FS.readFile`, serializado con una cola de un solo trabajo.

Razón: un artefacto wasm funciona en todas las plataformas y arquitecturas sin instalar binarios. El binario Emscripten ya incluye la rama `ENVIRONMENT_IS_NODE`.

Riesgos del spike:

- Si el runtime no arranca en Node, el fallback es detectar `qpdf` en `PATH` y usarlo solo para cifrado. El resto del paquete sigue funcionando.
- El wasm es de 32 bits; los PDFs grandes pueden agotar memoria. Se aplica un límite configurable y se documenta.

Resultado del spike: el runtime Emscripten arranca en Node mediante un contexto `vm` con `Module`, `FS.writeFile`, `callMain` y `FS.readFile`. Cifrado AES-256, descifrado y verificación con `pdf-lib` funcionan en Linux con 1,8 MB de wasm vendorizado. El mismo artefacto no depende del sistema operativo. La matriz de CI ejecuta las pruebas de cifrado en Linux, macOS y Windows con Node 20 y 22; el fallback por binario queda implementado para entornos donde el runtime wasm no inicialice.

Alternativas descartadas:

- Binario `qpdf` obligatorio: instalación distinta por sistema y fricción alta.
- Descargar un binario en runtime: riesgo de supply chain.
- Reimplementar cifrado PDF: fuera de alcance y peligroso.

### Directorio de salida obligatorio y guard por contención relativa

El servidor exige `--output-dir` o `BLOB_SPAWN_OUTPUT_DIR`. Las tools no aceptan rutas absolutas; solo un `subdir` relativo opcional. El guard resuelve la ruta, aplica `realpath` al padre y comprueba contención con `path.relative`, rechazando resultados que empiecen por `..` o sean absolutos.

Razón: el `cwd` de un cliente MCP es impredecible. Exigir el directorio elimina escrituras accidentales y hace que el error sea accionable.

Detalles multiplataforma:

- Nombres reservados de Windows (`CON`, `PRN`, `AUX`, `NUL`, `COM1`..`LPT9`) rechazados.
- Sin puntos ni espacios finales.
- Sin separadores en el nombre.
- Longitud acotada para evitar el límite de ruta de Windows.
- Comparación de rutas con `path.relative`, no con prefijos de string.

Alternativa descartada: aceptar `outputDir` por tool. Un agente podría elegir cualquier ruta y anular el confinamiento.

### Escritura atómica y sin sobrescritura implícita

Cada archivo se escribe en un temporal dentro del directorio destino y se publica con `rename`. Si el destino existe y no se pidió `overwrite`, se falla antes de generar. Ante error, se elimina el temporal y el destino queda intacto.

Razón: un fallo a mitad de generación no debe dejar un archivo corrupto con apariencia de éxito.

### Superficie de tools pequeña y explícita

Cuatro tools:

- `list_file_types`
- `generate_text_file`
- `estimate_pdf`
- `generate_pdf_file`

Los tamaños se expresan en `sizeBytes` enteros, no en tamaño más unidad, para eliminar ambigüedad. Los esquemas Zod usan uniones discriminadas para el modo PDF. Las respuestas devuelven ruta absoluta, bytes reales, MIME, SHA-256 y páginas; nunca el contenido completo. Se añade un `resource_link` además del texto porque no todos los clientes lo interpretan.

Errores con código estable y hint: `OUTPUT_DIR_NOT_CONFIGURED`, `OUTPUT_OUTSIDE_ROOT`, `OUTPUT_EXISTS`, `OUTPUT_WRITE_FAILED`, `PDF_SECURITY_UNAVAILABLE`, `QPDF_FAILED`, `QPDF_TIMEOUT`, más los códigos existentes del core.

### stdio exclusivo y logs en stderr

El servidor usa `StdioServerTransport` del SDK MCP v2. stdout queda reservado al protocolo. Todo diagnóstico va a stderr y solo se activa con `BLOB_SPAWN_DEBUG=1`.

Razón: un `console.log` en stdout rompe el protocolo y produce fallos difíciles de diagnosticar.

### Distribución y publicación

- Nombre `@juanloaiza/blob-spawn-mcp`, bin `blob-spawn-mcp`, marcado `private: true` para impedir una publicación accidental en npm.
- Distribución mediante un tarball adjunto a una GitHub Release con tag `mcp-v<version>`.
- El workflow de release construye con `npm pack`, renombra el asset a `blob-spawn-mcp-<version>.tgz` y publica también `blob-spawn-mcp-<version>.tgz.sha256`.
- Instalación con `npm exec --yes --allow-remote=all --package=<release-url> -- blob-spawn-mcp`.
- `--allow-remote=all` es obligatorio en npm 12, cuyo valor por defecto es `none` para instalaciones desde URL.
- `tsup` ESM, target Node 20, shebang en el banner.
- `pdf-lib` externo y declarado; el core va bundleado.
- `files`: `dist`, `README.md`, `LICENSE`.
- `engines.node >= 20`.
- Licencia MIT en raíz y copia en el paquete durante `prebuild`.

Razón: evita una cuenta y un publish en npm, mantiene un artefacto inmutable por tag y permite verificar el checksum. Alternativas descartadas: `npx github:` no soporta subcarpetas de monorepos en npm; un repo separado duplicaría o exigiría sincronizar el core; binarios por sistema multiplican la matriz y el soporte.

### Web estática y documentación

`app/mcp/page.tsx` es una página estática con instalación, configuración de clientes, tools, límites y aviso de ejecución local. Un componente cliente solo gestiona el botón de copiar configuración. No hay Route Handler ni función.

## Risks / Trade-offs

- **[Risk]** El runtime qpdf wasm no funciona en Node. → Spike de 2 horas antes de implementar; fallback a binario del sistema solo para cifrado.
- **[Risk]** El wasm de 32 bits agota memoria con PDFs grandes. → Límite configurable, cola de un trabajo y error accionable.
- **[Risk]** `pdf-lib` serializa el PDF completo en memoria. → Límite por defecto conservador y tamaño máximo configurable.
- **[Risk]** El `cwd` o la configuración del cliente apuntan a una ruta inesperada. → Directorio obligatorio, error explícito y configuración generada desde `/mcp`.
- **[Risk]** Diferencias de rutas entre sistemas, especialmente Windows. → `path.relative`, `realpath`, nombres reservados y matriz de tests en tres sistemas.
- **[Risk]** El build del paquete depende de código fuera de su directorio. → Bundle en `dist`, verificación con `npm pack --dry-run` y smoke test desde el tarball.
- **[Risk]** Clientes que ignoran `resource_link`. → Incluir siempre la ruta en texto plano.
- **[Risk]** Publicar una release sin licencia. → `LICENSE` MIT antes del primer tag `mcp-v*`.
- **[Risk]** npm 12 bloquea instalaciones desde URL. → Documentar `--allow-remote=all` en todos los ejemplos y comprobar el comando contra la release publicada.
- **[Risk]** La URL de release cambia con cada versión. → Constante única en `lib/mcp-distribution.ts`, página `/mcp` y README; el workflow valida que el tag coincide con la versión del paquete.

## Migration Plan

1. Refactorizar el core manteniendo los tests y el comportamiento web.
2. Crear el paquete MCP, el binario stdio y el guard de rutas.
3. Implementar tools de texto y PDF sin cifrado.
4. Ejecutar el spike wasm; implementar el backend qpdf o el fallback.
5. Añadir página `/mcp`, i18n y README.
6. Configurar CI multiplataforma, empaquetar y publicar `0.1.0`.

Rollback: retirar `packages/mcp` y la página `/mcp`. El refactor del core es compatible con la web y puede quedarse. La release de GitHub se puede borrar o marcar como prerelease sin afectar al despliegue estático.
