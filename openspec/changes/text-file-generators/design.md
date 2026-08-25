## Context

El proyecto es una aplicación Next.js con App Router, React y TypeScript estricto, actualmente sin flujo de generación implementado. La interfaz se desplegará como exportación estática y todo el procesamiento debe ejecutarse en el navegador. Véanse `proposal.md` y `specs/text-file-generation/spec.md` para la motivación y el contrato de comportamiento.

## Goals / Non-Goals

**Goals:**

- Crear una frontera estable entre catálogo de tipos, configuración visual y generadores puros.
- Permitir añadir formatos futuros registrando descriptores sin reescribir el flujo principal.
- Construir resultados de tamaño exacto con buffers de bytes y verificar el tamaño antes de descargar.
- Mantener válidos JSON y CSV incluso cuando se ajusta el relleno al byte final.
- Hacer que el máximo de aplicación y los metadatos de búsqueda sean fáciles de localizar y modificar en código.
- Mantener la generación y la descarga libres de peticiones de red.

**Non-Goals:**

- No incluir todavía imágenes, PDF, ZIP, BIN, XLS/XLSX, DOC/DOCX ni otros formatos de oficina.
- No implementar edición avanzada de plantillas, subida de archivos, persistencia de configuraciones ni historial.
- No prometer que el navegador pueda generar 2 GiB en todos los dispositivos; el límite configurable es una autorización máxima, no una garantía de memoria disponible.

## Decisions

### Registro declarativo de tipos

Se usará un registro central de descriptores de archivo. Cada descriptor contendrá extensión, MIME, nombre visible, alias de búsqueda, valores iniciales, definición de campos específicos y referencia a su generador. La pantalla consultará este registro para resolver búsquedas y renderizar controles.

Esto se elige sobre un `switch` en la página porque concentra la configuración solicitada por el usuario y permite añadir un tipo futuro sin duplicar lógica de búsqueda, validación o descarga.

### Búsqueda como selector guiado

La barra será un selector con apariencia de campo desplegable, no un campo que acepte extensiones arbitrarias. La normalización quitará espacios laterales, ignorará mayúsculas y tratará de forma equivalente la extensión con y sin punto. Se buscará contra extensión, nombre visible y alias configurables, priorizando coincidencia exacta.

El estado se dividirá en dos valores independientes:

- `searchQuery`: texto que el usuario está escribiendo y que controla únicamente el filtrado de opciones.
- `selectedType`: descriptor confirmado que controla el formulario mostrado y el generador utilizado.

Escribir nunca asignará directamente `selectedType`. Una selección explícita de la lista actualizará ambos valores; Enter confirmará la primera opción mejor puntuada cuando existan resultados. Una búsqueda sin coincidencias conservará `selectedType` y mostrará un estado informativo. Esto evita que el formulario salte de formato a formato mientras el usuario escribe.

La composición visual usará componentes instalados mediante Shadcn CLI, especialmente `Command` o `Input`, `Label`, `Select`, `Alert` y `Button`. No se creará un sistema de componentes visuales paralelo para reemplazar los primitives de Shadcn.

### Cliente y generación pura

La pantalla que contiene estado de formulario y descarga será un Client Component. Los generadores serán módulos sin dependencias de React: reciben una configuración normalizada y devuelven bytes y metadatos (`Blob`, nombre y MIME). La descarga se hará con `URL.createObjectURL`, un enlace temporal y posterior `URL.revokeObjectURL`.

Esta separación evita que la lógica de exactitud en bytes dependa del renderizado y facilita probar cada generador sin montar la UI.

### Unidades y límites

La primera versión usará unidades decimales: `1 KB = 1,000 bytes` y `1 MB = 1,000,000 bytes`. El valor convertido a bytes se validará como entero seguro antes de generar. La interfaz aceptará `1 KB` a `2048 MB`; una constante de configuración en código definirá el máximo real permitido, con valor inicial de `2,000,000,000` bytes aproximadamente 2 GB. Esta constante no se expondrá como control editable.

El umbral de confirmación será `500,000,000` bytes, coherente con el significado decimal de MB. El warning será un estado explícito del flujo, no un `confirm()` nativo, para poder mostrar el texto amigable y usar una acción `Confirmar` de la interfaz.

### Exactitud mediante bytes ASCII

Cada generador construirá una representación válida mínima y utilizará `TextEncoder` solo para convertir contenido estructural a UTF-8. El relleno de tamaño se hará principalmente con bytes ASCII (`A` o `0`), que tienen una correspondencia estable de un byte por carácter. El resultado final se comprobará con `Blob.size` antes de iniciar la descarga.

No se usará `string.length` como medida de tamaño. Tampoco se dependerá de emojis o de contenido Unicode para alcanzar el objetivo.

### Formatos estructurados mínimos

- `.txt`: patrón ASCII legible repetido hasta el tamaño solicitado. El patrón puede incorporar una fuente seleccionable, pero el relleno final será ASCII.
- `.json`: documento compacto con una estructura estable, por ejemplo un objeto con un campo de datos. Se reservará el espacio de sintaxis de cierre y se ajustará la cadena ASCII interna; el JSON final se validará mediante parseo en pruebas.
- `.csv`: encabezado fijo, una columna de datos, filas ASCII y terminador `LF` documentado. La última fila podrá tener una longitud ajustada y no dependerá de una fila parcialmente escrita. Todos los registros tendrán el mismo número de campos.

El mínimo de entrada de 1 KB deja suficiente espacio para las estructuras compactas. Si en el futuro se admite una unidad de bytes o tamaños menores, cada generador deberá definir explícitamente su documento mínimo antes de reutilizar este algoritmo.

### Nombre de archivo

El estado conservará el nombre base sin extensión. La validación usará letras Unicode, números, guion medio y guion bajo; la extensión será aportada exclusivamente por el descriptor seleccionado. El nombre mostrado como ayuda explicará la restricción y la validación se hará antes de la generación, además de filtrar la entrada para evitar que se acumulen caracteres inválidos.

### Gestión de memoria y errores

La generación no almacenará el contenido completo en React state. Durante la operación se mostrará un estado ocupado, se evitarán acciones duplicadas y los errores de asignación de memoria se convertirán en un mensaje visible sin indicar éxito falso.

Para tamaños moderados se usará un `Uint8Array` final. La implementación deberá evitar construir simultáneamente múltiples strings del tamaño completo; para tamaños cercanos al máximo podrá generar por bloques y ensamblar el resultado de forma controlada, documentando que el navegador puede requerir copias temporales.

### Exportación estática

La configuración de Next.js se ajustará para exportación estática. No habrá Route Handlers, Server Actions ni acceso a APIs Node durante la generación. Las dependencias de la primera iteración se limitarán a las ya disponibles y a APIs nativas del navegador.

## Risks / Trade-offs

- **[Riesgo]** Un archivo cercano a 2 GB puede provocar presión severa de memoria o fallar aun estando dentro del máximo configurado. **Mitigación:** warning sobre 500 MB, límite configurable, estado de error y documentación de que el máximo no garantiza capacidad del dispositivo.
- **[Riesgo]** Crear un buffer final grande puede producir copias temporales del contenido. **Mitigación:** usar relleno ASCII, evitar strings gigantes intermedios y aislar una estrategia por bloques si las pruebas de rendimiento lo requieren.
- **[Riesgo]** JSON o CSV podrían perder validez al recortar para alcanzar el último byte. **Mitigación:** ajustar únicamente campos ASCII controlados, reservar sintaxis de cierre y validar parseo/estructura antes de descargar.
- **[Riesgo]** La percepción de `MB` puede variar entre herramientas del sistema. **Mitigación:** mostrar unidades decimales claramente y verificar `Blob.size` en bytes; no afirmar equivalencia con el formato de visualización del sistema operativo.
- **[Riesgo]** Una entrada Unicode válida en el nombre puede no ser aceptada igual por todos los sistemas de archivos. **Mitigación:** restringir a letras Unicode, números, guion y guion bajo, sin barras ni puntuación, y delegar la decisión final al navegador.

## Migration Plan

1. Añadir el registro, la configuración de límites, los generadores y la pantalla cliente detrás de la página inicial.
2. Configurar la exportación estática y comprobar que el build no introduce dependencias de servidor.
3. Verificar generación, tamaño, MIME, nombres, validez de JSON/CSV y warning de archivos grandes en navegador.
4. Si se detecta un problema, retirar la nueva pantalla o volver a la página inicial; no existe migración de datos porque esta capacidad no persiste información.

## Open Questions

- La forma visual exacta de los parámetros específicos de JSON y CSV puede refinarse sin cambiar el contrato: por defecto se mantendrán estructuras compactas y controladas por la aplicación.
- El límite inicial aproximado de 2 GB puede ajustarse en la constante de configuración después de pruebas reales de navegador, sin cambiar el techo de entrada documentado de 2048 MB.
