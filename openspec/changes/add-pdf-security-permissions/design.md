## Context

La generación existente vive en el navegador: `app/page.tsx` configura la operación, `lib/generators/pdf.ts` crea el PDF con `pdf-lib` y el resultado se verifica antes de descargarse como `Blob`. La aplicación es una exportación estática de Next.js y no debe enviar el texto, las contraseñas ni los bytes a un servidor. `pdf-lib` no crea cifrado ni permisos, aunque conoce documentos cifrados al cargarlos.

La seguridad PDF se expresa mediante el Standard Security Handler. Las etiquetas de la interfaz no corresponden todas a permisos independientes: impresión usa niveles de resolución, modificación se combina con anotaciones, formularios y ensamblaje, accesibilidad no puede restringirse de forma fiable en revisiones modernas, y extracción de páginas, firma y páginas de plantilla dependen de capacidades agrupadas o del lector.

## Goals / Non-Goals

**Goals:**

- Mantener `mode: "none"` como comportamiento predeterminado y conservar intactos los generadores que no son PDF.
- Aplicar seguridad como una etapa aislada posterior a la creación del contenido PDF.
- Ejecutar cifrado y configuración de permisos localmente mediante una dependencia WebAssembly compatible con navegador y exportación estática.
- Representar las diez opciones solicitadas en la interfaz mediante checkboxes desactivados inicialmente, compilándolas a las capacidades PDF realmente disponibles.
- Mostrar siempre las credenciales fijas `owner-password` y `user-password` cuando se activa la seguridad, sin persistirlas ni permitir edición.
- Verificar el resultado con un lector o herramienta PDF capaz de interpretar cifrado, además de las comprobaciones actuales de páginas y contenido.
- Hacer explícitas las limitaciones de seguridad cooperativa y las relaciones entre permisos.

**Non-Goals:**

- Implementar un cifrado PDF propio o modificar algoritmos criptográficos manualmente.
- Ofrecer DRM, protección contra herramientas que ignoran permisos o control de acceso fuerte.
- Permitir contraseñas personalizadas, persistencia de credenciales o envío de documentos a un backend.
- Garantizar que cada etiqueta visual tenga un bit PDF independiente cuando el estándar no lo permite.
- Añadir formularios PDF, firmas digitales reales, páginas de plantilla reales o edición de documentos a la aplicación.
- Cambiar silenciosamente el modo de tamaño exacto a un tamaño aproximado cuando la combinación con seguridad no sea viable.

## Decisions

### Posprocesado desacoplado del generador de contenido

El generador continuará creando páginas, imagen, texto y enlace con `pdf-lib`. Una etapa de seguridad recibirá los bytes terminados y devolverá bytes protegidos. El contrato de PDF incluirá una configuración de seguridad opcional, pero el layout no conocerá el motor de cifrado.

```text
PdfOptions
   |
   v
Contenido PDF con pdf-lib
   |
   v
Seguridad opcional con WASM
   |
   v
Verificación PDF y permisos
   |
   v
Blob local
```

Esto mantiene aislada la complejidad criptográfica y evita introducir condicionales de seguridad en TXT, JSON o CSV. La alternativa descartada es insertar manualmente `/Encrypt` en el contexto interno de `pdf-lib`, porque un diccionario incompleto no cifra streams ni satisface el Standard Security Handler.

### Spike obligatorio antes de fijar la dependencia

El spike evaluó qpdf WebAssembly y wrappers alternativos. Se fija `qpdf-run@0.2.1` como dependencia de producción: ofrece API `Uint8Array`, ejecución mediante Web Worker, limpieza de archivos temporales en MEMFS, tipos TypeScript y licencia MIT. Los binarios y worker se sirven desde `public/qpdf` para que la exportación estática resuelva sus URLs sin depender de APIs de Node.

El spike confirma ejecución desde el bundle del navegador con `output: "export"`, bytes en memoria, contraseñas fijas y todas las restricciones activadas. Se mantiene como pendiente la matriz manual con varios lectores y la medición detallada de memoria. No se adopta una solución basada únicamente en manipular texto PDF ni se mantienen dependencias PDF redundantes.

### Contrato visual y compilación de permisos

La UI usará los diez checkboxes solicitados como restricciones activables, todos inicialmente desactivados. Un compilador interno convertirá el conjunto visual a permisos estándar, invirtiendo la selección: checkbox desactivado significa capacidad permitida y checkbox activado significa capacidad restringida:

- Impresión se mapeará a impresión denegada cuando el checkbox esté activado; si la herramienta permite niveles, se documentará la diferencia entre baja y alta resolución.
- Cambio de documento, comentarios, formularios y ensamblaje se combinarán cuando compartan bits o reglas de revisión.
- Copia general se mapeará al permiso de extracción de texto y gráficos y se denegará cuando el checkbox esté activado.
- Accesibilidad se marcará como no restringible en revisiones modernas y mostrará un aviso inline junto al checkbox; no se presentará como una garantía de bloqueo aunque el checkbox esté activado.
- Extracción de páginas, firmas y páginas de plantilla se tratarán como capacidades derivadas, normalmente relacionadas con extracción, modificación, formularios o ensamblaje.

La configuración resultante debe conservar tanto el estado solicitado por la UI como las capacidades efectivamente emitidas, para que la verificación pueda detectar perfiles imposibles o degradaciones no documentadas.

### Credenciales fijas y apertura del documento

Cuando la seguridad está activa se usarán `owner-password` y `user-password` exactamente como valores definidos por el producto. Se mostrarán como texto informativo no editable. No se guardarán en almacenamiento local, metadatos PDF ni servidor.

La presencia de ambas contraseñas permite probar apertura restringida y administración del documento. La interfaz debe explicar que conocer o poder recuperar la contraseña de propietario puede permitir a un lector ignorar las restricciones, y que incluso sin contraseña de apertura los permisos no son DRM.

### Compatibilidad con tamaño exacto

La seguridad se aplicará antes de la verificación final del tamaño. El algoritmo de tamaño exacto deberá medir el resultado protegido, incluyendo `/Encrypt`, identificadores, streams cifrados, xref y trailer. El padding solo podrá agregarse mediante una ruta que mantenga la validez y el cifrado del documento.

El spike no demuestra que qpdf pueda alcanzar exactamente el target después del cifrado y del padding actual. Por tanto, la combinación `mode: "size"` y seguridad activa se rechaza actualmente con un error explícito. No se aplica seguridad después de producir el target, porque eso cambia el tamaño y puede invalidar la promesa existente.

### Verificación independiente del motor de generación

La verificación debe usar el motor de seguridad para inspeccionar el perfil y, cuando sea posible, qpdf en pruebas o una herramienta equivalente. `pdf-lib` continuará comprobando páginas y contenido no cifrado mediante las rutas apropiadas, pero no será la única autoridad para permisos.

Las pruebas de integración deben abrir los documentos con contraseña, inspeccionar el campo de permisos y comprobar el comportamiento observable en lectores representativos. Se deben probar también el PDF sin seguridad y el caso de fallo, en el que no se crea descarga.

### Carga diferida y memoria

El módulo WebAssembly se cargará únicamente al activar seguridad o justo antes de procesar un documento seguro. Si la dependencia lo permite, el trabajo se moverá a un Web Worker para evitar bloquear la UI. El límite general de archivos y el warning de memoria seguirán aplicándose, con una advertencia adicional por copias temporales durante el cifrado.

## Risks / Trade-offs

- **[Risk]** qpdf WASM incrementa el bundle y el consumo de memoria. → Mitigar con carga diferida, worker, límites existentes y mediciones de build.
- **[Risk]** La herramienta puede depender de APIs de Node o filesystem. → Mitigar con un spike de exportación estática antes de integrarla al formulario.
- **[Risk]** Lectores diferentes interpretan de forma distinta permisos agrupados. → Mitigar documentando el mapeo y probando varios lectores; no prometer independencia donde el estándar no la ofrece.
- **[Risk]** Accesibilidad no puede bloquearse en PDF moderno. → Presentar el estado como permitido o no restringible y cubrirlo con pruebas de metadatos y documentación.
- **[Risk]** El cifrado puede romper el modo de tamaño exacto o elevar el mínimo estructural. → Medir el PDF protegido antes del padding y rechazar combinaciones no demostradas.
- **[Risk]** Contraseñas fijas conocidas reducen el valor de confidencialidad. → Declarar que la finalidad es generar fixtures de prueba, no proteger información sensible.
- **[Risk]** Un error de integración podría descargar un PDF no protegido creyendo que sí lo está. → Verificar `/Encrypt`, credenciales de apertura y perfil de permisos antes de informar éxito.

## Migration Plan

1. Ejecutar el spike de qpdf WASM y documentar compatibilidad, tamaño del bundle, memoria, revisiones PDF y permisos observables.
2. Integrar el contrato de seguridad y el compilador de opciones sin modificar el comportamiento por defecto.
3. Conectar el posprocesado al flujo PDF por páginas y añadir las comprobaciones de seguridad.
4. Integrar los diez checkboxes, las credenciales fijas visibles y las advertencias de compatibilidad.
5. Evaluar y, si se demuestra viable, habilitar seguridad en modo de tamaño exacto; de lo contrario, mantener el rechazo explícito.
6. Ejecutar pruebas unitarias, integración con herramientas PDF, lint, build estático y verificación manual en lectores.

El rollback consiste en desactivar el perfil de seguridad y retirar el motor WebAssembly y sus campos, dejando el generador PDF existente en modo sin restricciones. No hay migración de datos porque no se persisten configuraciones ni contraseñas.

## Open Questions

- La matriz manual con Acrobat y otro lector debe confirmar las diferencias aceptadas en permisos agrupados, accesibilidad, extracción de páginas, firmas y plantillas.
- Una futura ampliación puede investigar padding compatible con cifrado para habilitar `mode: "size"` con seguridad sin degradar la exactitud.
