## Why

BlobSpawn necesita una primera capacidad útil para generar archivos de prueba localmente, sin subir datos a un servidor y sin depender de contenido generado de forma impredecible. Esta iteración establece el flujo base de selección por búsqueda, configuración y descarga de archivos de texto con tamaño exacto en bytes.

## What Changes

- Añadir un selector de tipos con apariencia de campo desplegable: mientras el usuario escribe, filtrar las opciones configurables por extensión, nombre visible y alias, sin cambiar todavía el formulario; cambiar el tipo activo únicamente al seleccionar una opción o confirmar la primera coincidencia con Enter.
- Añadir formularios adaptativos con los parámetros relevantes de cada formato.
- Generar archivos válidos de texto plano, JSON y CSV exclusivamente en el navegador.
- Garantizar que el archivo descargado tenga exactamente el tamaño solicitado en bytes UTF-8.
- Aceptar tamaños desde 1 KB hasta 2048 MB, usando unidades explícitas y un límite máximo de aplicación configurable en código.
- Mostrar una confirmación obligatoria antes de generar archivos mayores de 500 MB.
- Validar y normalizar el nombre base del archivo para permitir únicamente letras, letras acentuadas, números, guion medio y guion bajo; la aplicación añadirá la extensión.
- Mantener la capacidad preparada para añadir generadores binarios, imágenes, PDF y ZIP en iteraciones posteriores, sin incluirlos en esta primera entrega.

## Capabilities

### New Capabilities

- `text-file-generation`: selección, configuración, validación, generación y descarga de archivos `.txt`, `.json` y `.csv` válidos con tamaño exacto.

### Modified Capabilities

<!-- No existing capabilities exist in the repository. -->

## Impact

- Afecta la pantalla principal de la aplicación Next.js y requiere una composición de componentes Shadcn para búsqueda, formularios, avisos y acciones.
- Requiere lógica cliente para generar `Uint8Array`/`Blob`, crear descargas y liberar recursos del navegador.
- Requiere un registro de tipos de archivo fácilmente configurable, separado de la presentación.
- Requiere configurar la exportación estática de Next.js para que la aplicación pueda desplegarse sin servidor.
- No requiere API, base de datos, almacenamiento remoto ni procesamiento backend.
- La primera versión no añade dependencias de generación de archivos; utiliza APIs nativas del navegador para texto, JSON y CSV.
