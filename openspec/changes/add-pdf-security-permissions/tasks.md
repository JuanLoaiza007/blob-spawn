## 1. Spike Del Motor WebAssembly

- [ ] 1.1 Evaluar qpdf WebAssembly y al menos una alternativa compatible, documentando versión, licencia, tamaño del bundle y APIs disponibles; verificar que la dependencia seleccionada se instala y puede importarse en el proyecto sin errores de TypeScript.
- [ ] 1.2 Crear un spike aislado que ejecute el motor en navegador con `output: "export"`, procese `Uint8Array` en memoria y no use Node.js, filesystem ni red; verificarlo con `npm run build` y una prueba de navegador o fixture automatizado.
- [ ] 1.3 Aplicar en el spike contraseñas `owner-password` y `user-password` a un PDF producido por el generador actual; verificar apertura con ambas contraseñas y presencia de un diccionario `/Encrypt` mediante qpdf u otra herramienta PDF.
- [ ] 1.4 Probar cada permiso solicitado y registrar la correspondencia real con el Standard Security Handler, incluyendo impresión por niveles, permisos agrupados, accesibilidad no restringible en revisiones modernas, extracción de páginas, firmas y plantillas; verificar la matriz con inspección de permisos y al menos dos lectores PDF.
- [ ] 1.5 Medir el coste de memoria y tiempo para una y varias páginas, además del impacto del bundle; verificar que el resultado determina si se necesita carga diferida o un Web Worker sin bloquear la decisión de integración.
- [ ] 1.6 Decidir y fijar una única dependencia de producción o detener la integración si ningún motor cumple navegador, exportación estática, cifrado y permisos; verificar que la decisión y las incompatibilidades queden documentadas en el diseño o en el resultado del spike.

## 2. Contrato Y Compilación De Permisos

- [ ] 2.1 Definir el tipo de configuración de seguridad opcional con modo sin restricciones y estado de los diez permisos; verificar que el valor por defecto representa seguridad desactivada y que una configuración no ambigua puede construirse desde la unión tipada.
- [ ] 2.2 Implementar el compilador desde los checkboxes visuales al perfil de permisos soportado por el motor; verificar bits, niveles y capacidades derivadas con pruebas de tabla, incluyendo las combinaciones imposibles o agrupadas.
- [ ] 2.3 Añadir las credenciales fijas `owner-password` y `user-password` en un único punto de configuración no editable; verificar que se muestran al usuario, no se guardan en almacenamiento y no se incorporan como metadatos PDF.
- [ ] 2.4 Implementar validación y mensajes para permisos cooperativos, accesibilidad y capacidades derivadas; verificar que la UI no prometa restricciones independientes que el estándar o los lectores no puedan representar.

## 3. Posprocesado PDF Local

- [ ] 3.1 Añadir el adaptador aislado del motor WebAssembly que reciba y devuelva bytes PDF en memoria; verificar que el adaptador no modifica el flujo ni las salidas cuando la seguridad está desactivada.
- [ ] 3.2 Integrar la etapa de seguridad después de crear el contenido PDF y antes de la verificación y descarga; verificar que páginas, imagen, texto, enlace fijo, MIME y nombre `.pdf` se conservan en un documento protegido.
- [ ] 3.3 Implementar carga diferida del motor y, si el spike lo exige, ejecución mediante Web Worker; verificar que la generación muestra estado ocupado, libera recursos y no bloquea de forma inaceptable la interfaz.
- [ ] 3.4 Incorporar errores diferenciados para dependencia no disponible, cifrado fallido, perfil no soportado, memoria insuficiente y PDF inválido; verificar que ningún error produce descarga o estado de éxito falso.

## 4. Integración De Interfaz

- [ ] 4.1 Añadir un control único para activar la seguridad PDF, inicialmente desactivado, sin alterar formularios ni valores de TXT, JSON o CSV; verificar la regresión de selección, validación y descarga de formatos existentes.
- [ ] 4.2 Añadir un checkbox para cada una de las diez propiedades solicitadas y mostrar todos desactivados inicialmente; verificar que cambiar de tipo PDF reinicia o descarta la configuración de seguridad de forma coherente.
- [ ] 4.3 Mostrar `owner-password` y `user-password` como valores informativos no editables únicamente cuando la seguridad esté activa; verificar que no existe un campo abierto ni persistencia al navegar o recargar.
- [ ] 4.4 Mostrar las advertencias de lector cooperativo, accesibilidad y permisos agrupados en un texto breve junto al control de seguridad; verificar que las etiquetas y estados coinciden con el perfil realmente emitido.
- [ ] 4.5 Actualizar la estimación, el mínimo estructural y el warning de archivos grandes para considerar el procesamiento seguro; verificar el recálculo al cambiar seguridad o cualquier checkbox.

## 5. Tamaño Exacto Y Verificación

- [ ] 5.1 Probar si el motor puede cifrar y después alcanzar un tamaño exacto conservando xref, trailer, `/Encrypt` y contenido válido; verificar targets pequeños, medianos y próximos al límite de la aplicación.
- [ ] 5.2 Integrar padding únicamente en una ruta compatible con cifrado y medir el Blob después del procesamiento completo; verificar que ningún ajuste posterior rompe la protección o el tamaño declarado.
- [ ] 5.3 Rechazar explícitamente la combinación de seguridad y modo `size` si el spike no demuestra exactitud; verificar mensaje accionable y ausencia de generación o descarga parcial.
- [ ] 5.4 Implementar verificación postprocesado con el motor o herramienta PDF seleccionada, comprobando contraseña, permisos, número de páginas, imagen, texto, enlace, MIME y tamaño; verificar un caso válido y un caso corrupto.

## 6. Pruebas Y Validación Final

- [ ] 6.1 Añadir pruebas unitarias de valores por defecto, compilación de permisos, contraseñas fijas, límites, relaciones entre permisos y mensajes de capacidades no independientes; verificar cobertura de las diez opciones.
- [ ] 6.2 Añadir pruebas de integración para abrir PDFs con `user-password` y `owner-password`, inspeccionar cifrado y permisos, y confirmar que la salida sin seguridad no contiene `/Encrypt`; verificar con qpdf u otra herramienta de referencia.
- [ ] 6.3 Verificar manualmente impresión, modificación, ensamblaje, copia, accesibilidad, extracción de páginas, comentarios, formularios, firma y páginas de plantilla en lectores representativos; registrar las diferencias aceptadas entre lectores.
- [ ] 6.4 Verificar privacidad observando que una generación segura no realiza peticiones de red y que no se almacenan contraseñas ni bytes; cubrirlo con prueba automatizada o inspección de red del navegador.
- [ ] 6.5 Ejecutar `npm test`, `npm run lint` y `npm run build`; verificar que la exportación estática funciona, que el bundle WebAssembly cumple los límites acordados y que todos los generadores anteriores siguen pasando.
- [ ] 6.6 Realizar la verificación manual final con seguridad desactivada, seguridad activa sin permisos, combinaciones representativas, contraseñas visibles, warning de memoria y el modo de tamaño exacto; verificar que solo se descargan PDFs validados y que los mensajes distinguen restricciones de DRM.
