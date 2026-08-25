## 1. Spike y selección de librería

- [x] 1.1 Evaluar `pdf-lib` en un spike aislado y verificar que puede generar un PDF válido en navegador con una página A4, imagen rasterizada y texto literal, sin APIs de servidor ni errores durante la exportación estática.
- [x] 1.2 Verificar en el spike la reutilización de una imagen en varias páginas y comprobar mediante un parser o lector PDF el número de páginas, la presencia de un objeto de imagen y la presencia de texto.
- [x] 1.3 Verificar si la librería candidata permite agregar un stream de padding PDF válido, declarar su longitud y serializar xref/trailer estables; comprobar que varios objetivos de prueba producen exactamente `Blob.size` sin corromperse.
- [x] 1.4 Fijar la dependencia que supere el spike y documentar la decisión, o detener el modo de tamaño exacto y actualizar el diseño si ninguna alternativa permite padding estructural fiable; verificar que no se mantengan dependencias PDF redundantes.

## 2. Contrato, límites y utilidades PDF

- [x] 2.1 Definir el descriptor PDF y el contrato tipado del generador con una unión discriminada `pages`/`size`; verificar que una configuración no pueda representar ambos modos activos.
- [x] 2.2 Añadir límites configurables para páginas, texto por caracteres y bytes, tamaño estructural mínimo y tamaño final, reutilizando el techo de aplicación sin permitir ampliarlo desde la UI; verificar valores válidos, cero, fracciones, entradas malformadas y excesos.
- [x] 2.3 Implementar la normalización y validación del texto plano, incluyendo límite duro, contador compatible, saltos de línea y controles no soportados; verificar que texto HTML, scripts, sintaxis PDF y plantillas se conserven como texto literal o se rechacen sin crear acciones.
- [x] 2.4 Implementar la utilidad de imagen rasterizada determinista con dimensiones y formato constantes; verificar que produzca bytes de imagen válidos sin leer archivos ni hacer peticiones de red.
- [x] 2.5 Implementar el cálculo de layout, tamaño base y estimación para una muestra representativa; verificar que la estimación cambie con páginas, texto y configuración y que se marque como aproximada.

## 3. Generador PDF por páginas

- [x] 3.1 Implementar la creación de un PDF A4 vertical con el patrón de imagen y el texto en cada página, reutilizando la imagen como recurso; verificar MIME `application/pdf`, encabezado válido y apertura por un parser PDF.
- [x] 3.2 Implementar el modo de cantidad de páginas con layout estable y texto envuelto dentro del área prevista; verificar que el resultado tenga exactamente la cantidad configurada y que todas las páginas contengan imagen y texto.
- [x] 3.3 Implementar la validación de tamaño mínimo, máximo de páginas y errores de fuente o serialización; verificar que no se descargue un resultado cuando la estructura solicitada no pueda producirse.

## 4. Generador PDF por tamaño exacto

- [x] 4.1 Implementar la generación del PDF base para el modo `size`, calculando las páginas de contenido y el tamaño mínimo real antes de aplicar padding; verificar el rechazo de objetivos menores al documento mínimo.
- [x] 4.2 Implementar padding como stream u objeto PDF válido con longitudes y referencias calculadas en bytes; verificar objetivos pequeños, medianos y cercanos al límite con `Blob.size` exactamente igual al objetivo.
- [x] 4.3 Implementar la verificación posterior a la serialización de encabezado, trailer, páginas, imagen, texto y tamaño; verificar que cualquier discrepancia produzca error y nunca una descarga o éxito falso.
- [x] 4.4 Añadir límites y manejo de presión de memoria para objetivos grandes, incluyendo el warning y la confirmación existente; verificar que cancelar no genere el PDF y que un fallo de asignación muestre un error accionable.

## 5. Integración del formulario y descarga

- [x] 5.1 Registrar `.pdf`, su MIME, alias, valores iniciales y campos específicos en el catálogo sin alterar la búsqueda ni los formularios de TXT, JSON y CSV; verificar selección por `.pdf`, `pdf` y alias.
- [x] 5.2 Integrar el formulario PDF en la pantalla principal con un control único de modo, el control de páginas o tamaño inmediatamente después y campos mutuamente excluyentes; verificar que cambiar de modo deshabilite o limpie el objetivo anterior y que una configuración ambigua sea rechazada.
- [x] 5.3 Mostrar tamaño estimado, objetivo seleccionado, páginas esperadas cuando estén disponibles y límites de texto con mensajes que distingan estimación de resultado exacto; verificar actualización al editar los parámetros.
- [x] 5.4 Conectar la generación PDF al flujo local de Blob, nombre base y extensión automática `.pdf`; verificar descarga local, liberación de URL temporal, ausencia de peticiones de red y estados idle/generating/success/error.
- [x] 5.5 Añadir confirmación para salidas grandes basada en objetivo o estimación; verificar que no se inicie generación antes de confirmar, que cancelar vuelva al formulario y que no haya dobles generaciones.

## 6. Pruebas y validación integral

- [x] 6.1 Añadir pruebas unitarias de catálogo, unión de modos, validación de páginas, validación de tamaño final, límites de texto, normalización, nombre y estimación; verificar que cubran los escenarios definidos en la especificación.
- [x] 6.2 Añadir pruebas de generación que comprueben MIME, número de páginas, presencia de imagen rasterizada, presencia de texto literal, ausencia de acciones o scripts y apertura por un parser PDF; verificar también texto acentuado y caracteres de control.
- [x] 6.3 Añadir pruebas de exactitud de bytes para el modo final-size y de rechazo del mínimo estructural; verificar que cada Blob válido mida exactamente el objetivo y que ningún Blob inválido se descargue.
- [x] 6.4 Ejecutar `npm test`, `npm run lint` y `npm run build`; verificar que el build de Next.js con `output: "export"` no requiera APIs de servidor y que los generadores existentes sigan pasando.
- [ ] 6.5 Realizar una verificación manual en navegador con un PDF de una página, varias páginas, texto en el límite, texto malicioso literal, tamaño final exacto, URL visible y clicable, y un caso que active el warning; verificar que el PDF se abra en un lector común y que la interfaz no reporte éxito falso.
