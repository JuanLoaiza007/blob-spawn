## Context

La aplicación es una exportación estática de Next.js. `app/page.tsx` contiene el flujo cliente de selección, configuración y descarga; `lib/generators/config.ts` registra formatos y campos; los generadores puros devuelven `Blob` y metadatos; y las pruebas actuales verifican tamaño, MIME y validez básica de TXT, JSON y CSV. Véanse `proposal.md` y `specs/pdf-file-generation/spec.md` para la motivación y el contrato observable.

El PDF introduce dos problemas que no existen en los formatos actuales: debe contener objetos estructurados de páginas, fuentes e imágenes, y el modo de tamaño final debe alcanzar un número exacto de bytes sin invalidar la tabla xref, el trailer o `%%EOF`. La generación debe seguir ocurriendo en el navegador, sin APIs de servidor.

## Goals / Non-Goals

**Goals:**

- Mantener el catálogo declarativo y el contrato de descarga reutilizable, aislando la lógica PDF en módulos puros.
- Representar páginas y tamaño final como modos explícitos y mutuamente excluyentes dentro del mismo formulario.
- Generar una imagen rasterizada determinista y reutilizarla como recurso PDF en cada página.
- Insertar texto mediante una API de texto PDF, nunca como HTML o sintaxis PDF concatenada con entrada del usuario.
- Producir una estimación visible y reproducible antes de generar, sin confundirla con el tamaño exacto.
- Validar tanto límites lógicos (caracteres y páginas) como límites binarios y de memoria.
- Probar primero la librería candidata con un PDF real antes de conectar toda la configuración a la interfaz.

**Non-Goals:**

- No admitir subida de imágenes, fuentes del usuario, HTML, Markdown, plantillas, enlaces, anotaciones ni JavaScript PDF.
- No crear un editor de documentos ni permitir diseños diferentes por página.
- No persistir configuraciones ni subir documentos a un servidor.
- No garantizar tamaños arbitrariamente pequeños: el documento tiene un overhead estructural mínimo.
- No generar contenido PDF mediante una API Node, Route Handler o Server Action.

## Decisions

### Generador PDF separado del generador de texto

Se añadirá un generador dedicado que reciba una configuración normalizada de PDF y devuelva el Blob, la extensión y el MIME. El catálogo conservará el registro de campos para renderizar el formulario, pero la validación de páginas, texto y tamaño final se mantendrá separada de `validateTargetSize`, que presupone un objetivo directo en bytes.

Esto evita introducir condicionales PDF en el generador de TXT y permite probar la lógica PDF sin montar React. La alternativa descartada es ampliar `generateTextFile` con un `switch` que mezcle serialización textual y construcción de objetos PDF.

### Formulario con discriminated union de modos

El estado normalizado tendrá conceptualmente un discriminador:

```text
PdfOptions
├── mode: "pages"
│   └── pageCount
└── mode: "size"
    └── targetBytes
```

Los campos comunes serán texto, nombre base y configuración fija de página. La UI mostrará ambos modos en un selector tipo radio o tabs, pero solo habilitará el conjunto de controles activo. El generador y el validador comprobarán también la exclusividad para no confiar únicamente en el estado visual.

Se usará A4 vertical como configuración inicial fija para reducir variables y hacer comparables las estimaciones. El patrón visual y el layout serán constantes en esta capacidad; tamaño de página, orientación y temas serán extensiones posteriores.

### Librería candidata y spike técnico obligatorio

La candidata principal será `pdf-lib` por su ejecución en navegador, API TypeScript y soporte de páginas, imágenes rasterizadas y texto. Antes de implementar el catálogo completo se construirá un spike aislado que genere una página, inserte un PNG, dibuje texto, repita la página y mida el resultado en el navegador y en Vitest cuando sea compatible.

El spike deberá comprobar específicamente si la versión elegida permite incorporar un stream de relleno como objeto PDF referenciado, declarar su `/Length` y serializar offsets/xref de forma estable. El modo por tamaño no se considerará implementable hasta comprobarlo.

`jsPDF` se mantendrá como alternativa evaluada únicamente si `pdf-lib` no cumple el spike. No se introducirán ambas dependencias en producción. Si ninguna API pública permite padding estructural fiable, se elegirá un serializador PDF mínimo y determinista para este generador, reutilizando la librería solo si no compromete la exactitud; esa decisión deberá quedar respaldada por una prueba que abra el resultado en un lector PDF.

### Imagen rasterizada determinista

Se generará una imagen pequeña mediante una utilidad cliente que dibuje un patrón de colores, formas y una marca corta de prueba en un `Canvas`, y que produzca PNG o JPEG con dimensiones constantes. La imagen se incorporará una vez al documento y se referenciará desde el contenido de cada página para evitar duplicación innecesaria.

No se usará SVG o HTML como sustituto de una imagen rasterizada: el propósito es comprobar que el consumidor del formulario encuentra un objeto de imagen real dentro del PDF. La imagen no recibirá datos del usuario.

### Texto literal con límites estrictos

El texto tendrá un máximo configurable de caracteres y bytes UTF-8, inicialmente 500 caracteres y 2.000 bytes, aplicando ambos límites. La UI mostrará contador y bloqueará la generación cuando se supere cualquiera. Se normalizarán saltos de línea y se rechazarán o eliminarán controles no soportados según una utilidad centralizada.

El valor se pasará exclusivamente a la operación de texto de la librería o del serializador, que debe escapar delimitadores PDF. No se aceptarán HTML, Markdown, expresiones de plantilla ni acciones. Para evitar un problema de fuentes, el spike deberá verificar texto latino y caracteres acentuados; si se requiere soporte Unicode amplio, se documentará como una ampliación separada con una fuente embebida.

### Modo por páginas y estimación

En modo `pages`, la salida tendrá exactamente `pageCount` páginas y se calculará una estimación a partir de una muestra del documento con el mismo layout, imagen y texto. La estimación será marcada como aproximada y no se usará para afirmar un tamaño final.

En modo `size`, se generará primero el documento base y se calculará cuántas páginas de contenido caben dentro de la estrategia elegida. Después se agregará padding como un stream PDF válido, preferentemente como objeto no visible, hasta alcanzar exactamente `targetBytes`. La longitud de streams y offsets se calcularán en bytes, no en caracteres JavaScript.

El algoritmo deberá rechazar el objetivo si el PDF mínimo ya excede el objetivo. Tras serializar, se comprobarán encabezado PDF, trailer básico, número de páginas, presencia de imagen, presencia de texto y `Blob.size`. Si el resultado no coincide exactamente, se lanzará un error y no se descargará.

### Estimación y características del modo por tamaño

Para que el usuario pueda anticipar el documento antes de generarlo, la interfaz mostrará el objetivo, el tamaño base estimado y, cuando el algoritmo lo permita, una cantidad o rango esperado de páginas. La estimación será recalculada cuando cambie texto, modo o configuración de documento.

La estimación no intentará predecir con falsa precisión el efecto de compresión. El resultado exitoso será la única fuente de verdad para el tamaño final.

### Límites operativos y memoria

Se mantendrá el máximo general de aplicación como techo, pero se definirán límites específicos para páginas y texto. El warning existente para archivos grandes se activará con el objetivo final en modo `size` y con la estimación en modo `pages` cuando el resultado probable supere el umbral.

La generación se ejecutará fuera del estado React, bloqueará acciones duplicadas y convertirá fallos de asignación o serialización en un error visible. El diseño no promete que el navegador pueda producir el máximo configurado: el límite es una autorización, no una garantía de capacidad.

### Verificación de estructura

Las pruebas deberán inspeccionar el resultado con las capacidades disponibles de la librería y, para los casos de integración, abrir o parsear el PDF con un lector/validador compatible. Buscar únicamente cadenas en el Blob no será suficiente para demostrar que existen objetos de imagen, páginas y texto válidos.

### Hipervínculo de origen

Cada página dibujará la etiqueta fija `blob-spawn.vercel.app` en la franja inferior derecha, por debajo del marco de contenido, y añadirá una anotación `Link` con acción `URI` sobre las mismas coordenadas. El destino será la constante fija `https://blob-spawn.vercel.app`; no se derivará del texto de prueba ni de metadatos. La anotación se añadirá como objeto PDF real para que lectores comunes la presenten como enlace clicable.

## Risks / Trade-offs

- **[Riesgo]** La librería candidata puede crear PDFs válidos pero no exponer una forma estable de ajustar un stream al byte exacto. **Mitigación:** spike obligatorio antes del formulario; fallback a un serializador determinista o reducción explícita del alcance antes de implementar.
- **[Riesgo]** Un stream de padding puede hacer que el PDF sea válido pero poco representativo de un documento real. **Mitigación:** mantener siempre páginas con imagen y texto reales, documentar el padding y usar el modo por páginas para pruebas de contenido natural.
- **[Riesgo]** La compresión hace que el tamaño varíe entre versiones de la dependencia. **Mitigación:** fijar la versión, generar una configuración base determinista y medir siempre el Blob final.
- **[Riesgo]** Texto Unicode puede no renderizarse con las fuentes estándar. **Mitigación:** probar caracteres acentuados, limitar la primera versión a la cobertura comprobada y no prometer soporte Unicode total.
- **[Riesgo]** Muchas páginas o targets grandes pueden crear varias copias temporales en memoria. **Mitigación:** límites específicos, warning, generación fuera de React, reutilización de imagen y errores sin falso éxito.
- **[Riesgo]** Una prueba que solo compruebe `%PDF` y `Blob.size` podría aceptar un archivo corrupto. **Mitigación:** verificar conteo de páginas, objetos de imagen/texto y apertura por un parser o lector PDF.

## Migration Plan

1. Ejecutar el spike de la librería candidata y decidir si el modo de tamaño exacto es viable con la estrategia de padding estructural.
2. Añadir la dependencia seleccionada y las utilidades puras de imagen, layout, validación y generación PDF.
3. Registrar `.pdf` y conectar el formulario discriminado sin cambiar el comportamiento de TXT, JSON o CSV.
4. Añadir pruebas unitarias y de integración del Blob, estructura PDF, seguridad del texto, estimación y límites.
5. Ejecutar lint, build de exportación estática, pruebas y verificación manual en navegador.
6. Si el spike falla, detener la integración del modo por tamaño y revisar la decisión técnica; no sustituirlo silenciosamente por un tamaño aproximado.

No hay migración de datos ni rollback de persistencia. El rollback consiste en retirar el descriptor PDF, el generador y la dependencia, dejando intactos los generadores existentes.

## Open Questions

- La selección final entre PNG y JPEG puede hacerse durante el spike según tamaño base y estabilidad del resultado, sin cambiar el contrato externo.
- El máximo exacto de páginas puede ajustarse durante las pruebas de rendimiento siempre que siga siendo un límite configurable y visible en la validación.
