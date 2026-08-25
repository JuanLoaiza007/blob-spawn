## Why

BlobSpawn necesita generar PDFs dummy para probar formularios que aceptan documentos con páginas, imágenes y texto, manteniendo el procesamiento completamente local. La capacidad debe permitir controlar el documento por cantidad de páginas o por tamaño final, sin convertir el texto del usuario en una superficie de ejecución ni permitir entradas desproporcionadas.

## What Changes

- Añadir `.pdf` al catálogo de formatos seleccionables y conservar el flujo existente de nombre, generación local, descarga y advertencia para archivos grandes.
- Añadir un único formulario de configuración PDF con dos modos mutuamente excluyentes: cantidad de páginas o tamaño final en bytes.
- Generar en cada página un patrón de imagen rasterizado y texto plano personalizado para comprobar ambos contenidos en sistemas consumidores de PDFs.
- Mostrar una estimación del tamaño probable del documento según la cantidad de páginas y la configuración visual, distinguiéndola del objetivo exacto del modo por tamaño.
- Limitar, validar y normalizar el texto personalizado antes de incorporarlo al PDF; tratarlo siempre como texto literal, sin HTML, Markdown, scripts, enlaces ni plantillas ejecutables.
- Validar la cantidad de páginas, el tamaño final, el tamaño mínimo estructural del PDF y los límites operativos de memoria y generación.
- Investigar y seleccionar una librería compatible con navegador y exportación estática de Next.js antes de implementar el generador definitivo.
- Verificar que el modo por tamaño produzca un PDF estructuralmente válido con el tamaño exacto solicitado, o documentar explícitamente las restricciones técnicas si una librería no permite lograrlo de forma robusta.
- Añadir pruebas para catálogo, validación, páginas, imagen, texto, exactitud de bytes, errores de memoria y ausencia de peticiones de red.

## Capabilities

### New Capabilities

- `pdf-file-generation`: configuración, validación, generación y descarga local de PDFs dummy con imagen y texto, controlados por páginas o por tamaño final.

### Modified Capabilities

- Ninguna. La capacidad de archivos de texto existente no cambia sus requisitos.

## Impact

- Afecta el catálogo y contrato de generadores en `lib/generators/`, la validación compartida, el formulario y estados de `app/page.tsx`, y las pruebas de generadores.
- Requiere evaluar y posiblemente añadir una dependencia de generación PDF compatible con navegador, TypeScript y `output: "export"`.
- Puede requerir una utilidad local para generar una imagen dummy rasterizada y otra para calcular o verificar padding PDF válido.
- No requiere APIs, Route Handlers, Server Actions, base de datos, almacenamiento remoto ni subida de archivos.
- El modo por tamaño puede imponer límites más estrictos que el máximo general de archivos debido a copias temporales, compresión y consumo de memoria del navegador.
