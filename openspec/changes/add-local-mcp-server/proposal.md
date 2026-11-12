## Why

BlobSpawn solo puede generar archivos desde su interfaz web. Los agentes de IA no pueden crear fixtures de tamaño exacto de forma automatizada, y mover esa generación a Vercel añadiría funciones, límites de payload y coste a una cuenta Hobby. Un servidor MCP local permite que el cliente del agente ejecute la generación en la máquina del usuario, sin enviar contenido ni archivos a ningún servidor.

## What Changes

- Añadir un paquete `@juanloaiza/blob-spawn-mcp` con un servidor MCP por stdio, instalable desde un tarball adjunto a una GitHub Release y ejecutable mediante `npm exec`, que expone la generación de TXT, JSON, CSV y PDF como tools.
- Publicar el tarball y su checksum SHA-256 en una release `mcp-v*` mediante GitHub Actions, sin publicar en el registro de npm.
- Escribir los archivos generados en el sistema de archivos local, con rutas confinadas a un directorio de salida configurado explícitamente, escritura atómica, límites de tamaño y sin sobrescritura por defecto.
- Reutilizar `lib/generators` como núcleo compartido entre la web y el servidor MCP, sin duplicar la lógica de formato, validación ni verificación.
- Refactorizar el núcleo para producir texto por chunks y para inyectar el backend de seguridad PDF, de modo que funcione tanto en navegador como en Node.
- Implementar un backend de cifrado PDF basado en qpdf WebAssembly ejecutado en Node, con fallback documentado si el spike no demuestra viabilidad.
- Mantener la web como exportación estática: sin Route Handlers, sin Vercel Functions, sin Vercel Blob y sin dependencias nuevas en el `package.json` raíz.
- Añadir una página estática `/mcp` con instalación, configuración para clientes MCP y límites, más un `LICENSE` MIT.
- Publicar el paquete con binario `blob-spawn-mcp`, soporte Node 20+ y matriz de pruebas Linux, macOS y Windows.

## Capabilities

### New Capabilities

- `local-mcp-server`: Servidor MCP local que expone tools de generación, valida entradas, escribe archivos en un directorio autorizado, aplica el perfil de seguridad PDF y devuelve metadatos verificables sin usar servicios remotos.

### Modified Capabilities

<!-- Ninguna. El comportamiento web de generación de texto, PDF y seguridad PDF no cambia; el nuevo servidor MCP se especifica como capacidad independiente. -->

## Impact

- Nuevo paquete en `packages/mcp` con `package.json`, build `tsup`, binario, tests y vendor de qpdf.
- Cambios internos en `lib/generators/text.ts`, `pdf.ts` y `pdf-security.ts` para chunks y backend inyectable; la interfaz web conserva su comportamiento.
- Nueva página estática `app/mcp/page.tsx` y claves i18n ES/EN.
- Nuevo `LICENSE` MIT en raíz y copia en el tarball de release.
- Afecta `tsconfig.json`, `eslint.config.mjs` y `.gitignore` raíz para excluir el paquete del build de Next.js y de Vercel.
- Dependencias del paquete: `@modelcontextprotocol/server`, `zod`, `pdf-lib`; qpdf wasm vendorizado.
- No añade funciones, APIs ni almacenamiento a Vercel. El despliegue web sigue siendo estático.
- Requiere decidir en el spike si qpdf wasm en Node es viable; el fallback es detección del binario `qpdf` del sistema solo para cifrado.
