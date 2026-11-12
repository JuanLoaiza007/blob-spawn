# Tasks

## 1. Refactor del core compartido

- [x] 1.1 Añadir `textChunks(options)` en `lib/generators/text.ts` y refactorizar `generateTextFile` para componer chunks, verificando que `npm test` sigue pasando y que un test nuevo compara la concatenación con los bytes anteriores.
- [x] 1.2 Definir `PdfSecurityBackend` en `lib/generators/pdf-security-backend.ts`, adaptar `pdf-security.ts` al backend navegador e inyectarlo en `generatePdf`, verificando que `tests/pdf.test.ts` y `tests/pdf-security.integration.test.ts` pasan.
- [x] 1.3 Exponer `bytes: Uint8Array` en los resultados de texto y PDF manteniendo `blob` para la web, verificando que la página sigue descargando archivos con el tamaño exacto.
- [x] 1.4 Ejecutar `npm test`, `npm run lint` y `npm run build`, verificando que no cambia el comportamiento web ni el contenido de `out/`.

## 2. Paquete MCP y transporte stdio

- [x] 2.1 Crear `packages/mcp` con `package.json`, `tsconfig.json`, `tsup.config.ts` y `vitest.config.ts`, verificando que `npm install` y `npm run build` dentro del paquete generan `dist/index.js`.
- [x] 2.2 Excluir `packages` en `tsconfig.json` y `eslint.config.mjs` raíz y añadir `packages/mcp/node_modules` y `dist` a `.gitignore`, verificando que `npm run build` y `npm run lint` raíz no procesan el paquete.
- [x] 2.3 Implementar `src/index.ts` y `src/server.ts` con `StdioServerTransport`, shebang, versión y logs exclusivamente a stderr, verificando con un test de protocolo que stdout solo contiene mensajes JSON-RPC.
- [x] 2.4 Añadir un README inicial del paquete con instalación, flags y estado de herramientas, verificando que los comandos documentados existen en `package.json`.

## 3. Configuración, rutas y escritura segura

- [x] 3.1 Implementar `src/config.ts` con `--output-dir`, `--max-text-bytes`, `--max-pdf-bytes`, `--allow-overwrite`, `--qpdf` y sus variables de entorno, verificando que una generación sin directorio falla con `OUTPUT_DIR_NOT_CONFIGURED`.
- [x] 3.2 Implementar `src/fs/guard.ts` con `realpath`, contención mediante `path.relative`, rechazo de traversal, symlinks y nombres reservados de Windows, verificando con tests de rutas en Linux, macOS y Windows.
- [x] 3.3 Implementar `src/fs/output.ts` con temporal en el directorio destino, `rename` atómico, SHA-256 incremental y limpieza ante error, verificando tests de sobrescritura, destino existente y ausencia de temporales.
- [x] 3.4 Documentar en el README del paquete la configuración obligatoria del directorio y los límites, verificando que el ejemplo de configuración se puede copiar y ejecutar tal cual.

## 4. Herramientas de descubrimiento y texto

- [x] 4.1 Implementar `list_file_types` con catálogo, campos, defaults, límites, estado del directorio y disponibilidad de cifrado, verificando un test que compara la respuesta con `FILE_TYPES` y `GENERATOR_LIMITS`.
- [x] 4.2 Implementar `generate_text_file` para TXT, JSON y CSV con `sizeBytes`, nombre saneado, subdirectorio relativo y metadatos de respuesta, verificando tests de tamaño exacto, JSON parseable y CSV con cabecera.
- [x] 4.3 Mapear errores de validación y escritura a resultados MCP con `isError`, código y hint, verificando tests para tamaño inválido, nombre inválido y directorio no configurado.
- [x] 4.4 Actualizar el README del paquete con ejemplos de las tools de texto, verificando que los ejemplos producen archivos con el tamaño indicado.

## 5. Herramientas PDF sin cifrado

- [x] 5.1 Implementar `estimate_pdf` para modos `pages` y `size`, verificando tests de páginas estimadas y bytes objetivo.
- [x] 5.2 Implementar `generate_pdf_file` en modo páginas con texto, imagen, enlace fijo y verificación de páginas, verificando el PDF resultante con `pdf-lib` en un test.
- [x] 5.3 Implementar el modo tamaño final exacto, verificando que el archivo escrito tiene exactamente `targetBytes` y sigue siendo legible.
- [x] 5.4 Rechazar cifrado en esta fase con `PDF_SECURITY_UNAVAILABLE`, verificando que no se escribe ningún archivo cuando se solicita seguridad.
- [x] 5.5 Documentar las tools PDF y sus límites en el README del paquete, verificando que los límites documentados coinciden con `GENERATOR_LIMITS`.

## 6. Cifrado PDF con qpdf

- [ ] 6.1 Ejecutar el spike de qpdf wasm en Node cifrando y descifrando un PDF de 1 MB, verificando el resultado en Linux, macOS y Windows y registrando la decisión en `design.md`.
- [x] 6.2 Si el spike es viable, vendorizar `qpdf.js` y `qpdf.wasm` desde `public/qpdf` en `prebuild` e implementar el runner Node con cola de un trabajo, verificando un test de cifrado y descifrado.
- [x] 6.3 Si el spike no es viable, implementar detección de `qpdf` en `PATH` y flag `--qpdf`, verificando que la ausencia del binario produce `PDF_SECURITY_UNAVAILABLE` sin escribir archivos.
- [x] 6.4 Implementar `PdfSecurityBackend` sobre el runner elegido con las contraseñas fijas y las diez restricciones existentes, verificando que el PDF solo se abre con `user-password` y contiene `/Encrypt`.
- [x] 6.5 Añadir tests de integración de seguridad que se saltan si el backend no está disponible, verificando el perfil de permisos y el rechazo de seguridad combinada con tamaño exacto.
- [x] 6.6 Documentar en el README la disponibilidad de cifrado, el fallback y las contraseñas de prueba, verificando que el comportamiento documentado coincide con `list_file_types`.

## 7. Web estática y documentación

- [x] 7.1 Crear `app/mcp/page.tsx` con instalación, configuración para Claude Desktop, Cursor, OpenCode y VS Code, herramientas, límites y aviso de ejecución local, verificando que `npm run build` genera `out/mcp/index.html`.
- [x] 7.2 Crear `components/mcp-config.tsx` para copiar la configuración con el directorio de salida, verificando manualmente que el texto copiado es válido.
- [x] 7.3 Añadir las claves ES/EN en `lib/i18n/dictionaries.ts` y el test de paridad, verificando que `npm test` pasa.
- [x] 7.4 Añadir el enlace a `/mcp` en la cabecera de `app/page.tsx` y el enlace de vuelta al generador, verificando la navegación en `npm run dev`.
- [x] 7.5 Actualizar el README raíz con la sección MCP, privacidad y límites, verificando que no promete funciones ni endpoints en Vercel.

## 8. Distribución, CI y publicación

- [x] 8.1 Añadir `LICENSE` MIT en la raíz y copiarlo al paquete en `prebuild`, verificando que `npm pack --dry-run` incluye `LICENSE` y `package.json` declara `"license": "MIT"`.
- [x] 8.2 Configurar GitHub Actions con matriz `ubuntu-latest`, `macos-latest` y `windows-latest` para Node 20 y 22, verificando que el workflow ejecuta tests del core y del paquete.
- [x] 8.3 Verificar el tarball con `npm pack --dry-run` y una instalación desde el `.tgz` en un directorio temporal, comprobando que solo contiene `dist`, README y LICENSE.
- [x] 8.4 Crear `.github/workflows/release-mcp.yml` que valida que el tag coincide con la versión, ejecuta typecheck y tests, construye el tarball, genera el SHA-256 y crea la GitHub Release, verificando el YAML con una ejecución local de los mismos comandos.
- [x] 8.5 Centralizar la URL de release y el comando `npm exec --allow-remote=all` en `lib/mcp-distribution.ts`, actualizar `/mcp` y los README, y verificar con `tests/mcp-distribution.test.ts`.
- [ ] 8.6 Hacer commit, push del tag `mcp-v0.1.0` y publicar la release, verificando que el asset responde 200 y que su SHA-256 coincide con el fichero `.sha256`.
- [ ] 8.7 Instalar desde la URL pública de la release en un directorio temporal y completar `tools/list` y una generación, verificando que no se requiere login de npm.

## 9. Verificación de integración

- [x] 9.1 Ejecutar `npm test`, `npm run lint`, `npm run build`, y dentro de `packages/mcp` `npm run typecheck`, `npm test` y `npm run build`, verificando que todos terminan sin errores.
- [x] 9.2 Generar un TXT, JSON, CSV y PDF desde un cliente MCP real, verificando bytes exactos, SHA-256, páginas y apertura del PDF.
- [x] 9.3 Revisar el deployment de Vercel, verificando que no existen funciones, endpoints MCP ni dependencias nuevas en el `package.json` raíz.

## Workflow follow-up

- Archivar el change cuando la implementación y la verificación estén completas.
- Verificar el resultado archivado y actualizar la especificación principal `local-mcp-server`.
