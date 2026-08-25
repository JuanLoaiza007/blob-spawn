## 1. Spike Del Motor WebAssembly

- [x] 1.1 Evaluar qpdf WebAssembly y al menos una alternativa compatible, documentando versión, licencia, tamaño del bundle y APIs disponibles; verificar que la dependencia seleccionada se instala y puede importarse en el proyecto sin errores de TypeScript.
- [x] 1.2 Crear un spike aislado que ejecute el motor en navegador con `output: "export"`, procese `Uint8Array` en memoria y no use Node.js, filesystem ni red; verificarlo con `npm run build` y una prueba de navegador o fixture automatizado.
- [x] 1.3 Aplicar en el spike contraseñas `owner-password` y `user-password` a un PDF producido por el generador actual; verificar apertura con ambas contraseñas y presencia de un diccionario `/Encrypt` mediante qpdf u otra herramienta PDF.
- [x] 1.4 Probar cada permiso solicitado y registrar la correspondencia real con el Standard Security Handler, incluyendo impresión por niveles, permisos agrupados, accesibilidad no restringible en revisiones modernas, extracción de páginas, firmas y plantillas; verificar la matriz con inspección de permisos y al menos dos lectores PDF.
- [ ] 1.5 Medir el coste de memoria y tiempo para una y varias páginas, además del impacto del bundle; verificar que el resultado determina si se necesita carga diferida o un Web Worker sin bloquear la decisión de integración.
- [x] 1.6 Decidir y fijar una única dependencia de producción o detener la integración si ningún motor cumple navegador, exportación estática, cifrado y permisos; verificar que la decisión y las incompatibilidades queden documentadas en el diseño o en el resultado del spike.

## 2. Contrato Y Compilación De Permisos

- [x] 2.1 Definir el tipo de configuración de seguridad opcional con modo sin restricciones y estado de los diez permisos; verificar que el valor por defecto representa seguridad desactivada y que una configuración no ambigua puede construirse desde la unión tipada.
- [x] 2.2 Implementar el compilador desde los checkboxes de restricciones activas al perfil de permisos soportado por el motor; verificar que desactivado permite y activado restringe, además de bits, niveles y capacidades derivadas con pruebas de tabla.
- [x] 2.3 Añadir las credenciales fijas `owner-password` y `user-password` en un único punto de configuración no editable; verificar que se muestran al usuario, no se guardan en almacenamiento y no se incorporan como metadatos PDF.
- [x] 2.4 Implementar validación y mensajes para permisos cooperativos, accesibilidad y capacidades derivadas; verificar que la UI no prometa restricciones independientes que el estándar o los lectores no puedan representar.

## 3. Posprocesado PDF Local

- [x] 3.1 Añadir el adaptador aislado del motor WebAssembly que reciba y devuelva bytes PDF en memoria; verificar que el adaptador no modifica el flujo ni las salidas cuando la seguridad está desactivada.
- [x] 3.2 Integrar la etapa de seguridad después de crear el contenido PDF y antes de la verificación y descarga; verificar que páginas, imagen, texto, enlace fijo, MIME y nombre `.pdf` se conservan en un documento protegido.
- [x] 3.3 Implementar carga diferida del motor y, si el spike lo exige, ejecución mediante Web Worker; verificar que la generación muestra estado ocupado, libera recursos y no bloquea de forma inaceptable la interfaz.
- [x] 3.4 Incorporar errores diferenciados para dependencia no disponible, cifrado fallido, perfil no soportado, memoria insuficiente y PDF inválido; verificar que ningún error produce descarga o estado de éxito falso.

## 4. Integración De Interfaz

- [x] 4.1 Añadir un control único para activar la seguridad PDF, inicialmente desactivado, sin alterar formularios ni valores de TXT, JSON o CSV; verificar la regresión de selección, validación y descarga de formatos existentes.
- [x] 4.2 Añadir un checkbox de restricción para cada una de las diez propiedades solicitadas y mostrar todos desactivados inicialmente; verificar que cambiar de tipo PDF reinicia o descarta la configuración de seguridad de forma coherente.
- [x] 4.3 Mostrar `owner-password` y `user-password` como valores informativos no editables únicamente cuando la seguridad esté activa; verificar que no existe un campo abierto ni persistencia al navegar o recargar.
- [x] 4.4 Mostrar las advertencias de lector cooperativo, accesibilidad y permisos agrupados en un texto breve junto al control de seguridad; verificar que las etiquetas y estados coinciden con el perfil realmente emitido.
- [ ] 4.5 Actualizar la estimación, el mínimo estructural y el warning de archivos grandes para considerar el procesamiento seguro; verificar el recálculo al cambiar seguridad o cualquier checkbox.

## 5. Tamaño Exacto Y Verificación

- [ ] 5.1 Probar si el motor puede cifrar y después alcanzar un tamaño exacto conservando xref, trailer, `/Encrypt` y contenido válido; verificar targets pequeños, medianos y próximos al límite de la aplicación.
- [ ] 5.2 Integrar padding únicamente en una ruta compatible con cifrado y medir el Blob después del procesamiento completo; verificar que ningún ajuste posterior rompe la protección o el tamaño declarado.
- [x] 5.3 Rechazar explícitamente la combinación de seguridad y modo `size` si el spike no demuestra exactitud; verificar mensaje accionable y ausencia de generación o descarga parcial.
- [x] 5.4 Implementar verificación postprocesado con el motor o herramienta PDF seleccionada, comprobando contraseña, permisos, número de páginas, imagen, texto, enlace, MIME y tamaño; verificar un caso válido y un caso corrupto.

## 6. Pruebas Y Validación Final

- [x] 6.1 Añadir pruebas unitarias de valores por defecto, compilación invertida de restricciones, contraseñas fijas, límites, relaciones entre capacidades y mensajes de capacidades no independientes; verificar cobertura de las diez opciones.
- [x] 6.2 Añadir pruebas de integración para abrir PDFs con `user-password` y `owner-password`, inspeccionar cifrado y permisos, y confirmar que la salida sin seguridad no contiene `/Encrypt`; verificar con qpdf u otra herramienta de referencia.
- [ ] 6.3 Verificar manualmente impresión, modificación, ensamblaje, copia, accesibilidad, extracción de páginas, comentarios, formularios, firma y páginas de plantilla en lectores representativos; registrar las diferencias aceptadas entre lectores.
- [ ] 6.4 Verificar privacidad observando que una generación segura no realiza peticiones de red y que no se almacenan contraseñas ni bytes; cubrirlo con prueba automatizada o inspección de red del navegador.
- [x] 6.5 Ejecutar `npm test`, `npm run lint` y `npm run build`; verificar que la exportación estática funciona, que el bundle WebAssembly cumple los límites acordados y que todos los generadores anteriores siguen pasando.
- [ ] 6.6 Realizar la verificación manual final con seguridad desactivada, seguridad activa sin permisos, combinaciones representativas, contraseñas visibles, warning de memoria y el modo de tamaño exacto; verificar que solo se descargan PDFs validados y que los mensajes distinguen restricciones de DRM.

## 7. Trabajo Posterior: Pruebas De Integración Con Qpdf

- [x] 7.1 Definir un ejecutor de integración que genere o reciba un PDF protegido y ejecute qpdf nativo con rutas absolutas y argumentos controlados; verificar que la prueba pueda omitirse con un diagnóstico claro cuando qpdf no esté instalado.
- [x] 7.2 Crear siempre un directorio temporal aislado mediante una API de directorios temporales; verificar que ningún archivo de prueba se escriba en el repositorio, `public`, `tests`, `Downloads` o el directorio personal del usuario.
- [x] 7.3 Añadir casos para seguridad desactivada, cada restricción individual, todas las restricciones activadas y el perfil sin capacidades representables; verificar `R = 6`, AESv3 y los valores esperados de `P` (`-4`, `-2056`, `-12`, `-36`, `-20`, `-260`, `-1028` y `-3392`).
- [x] 7.4 Verificar apertura y descifrado con `user-password` y `owner-password`, además de detectar contraseñas incorrectas; verificar que no se impriman contraseñas ni contenido sensible en la salida de la prueba.
- [x] 7.5 Verificar páginas, imagen, texto, enlace fijo, MIME, `/Encrypt` y ausencia de `/Encrypt` en el caso sin seguridad; incluir un PDF corrupto y comprobar que la prueba falla de forma controlada.
- [x] 7.6 Comparar la matriz de qpdf con el comportamiento documentado de Nitro Pro sin convertir las etiquetas no independientes en requisitos contradictorios del Standard Security Handler; verificar y registrar las diferencias aceptadas.
- [ ] 7.7 Aplicar límites de tiempo, tamaño, memoria y procesos hijos; verificar que los procesos se cierren y que la limpieza elimine únicamente el directorio temporal creado por la prueba, incluso cuando una aserción falle.
- [x] 7.8 Integrar la prueba en un comando explícito separado de `npm test` hasta confirmar su estabilidad en CI; verificar que la ausencia de qpdf o de un entorno de navegador no invalide silenciosamente una ejecución que se haya solicitado expresamente.

### 7.9 Matriz De Permisos Individuales

- [x] 7.9.1 Probar **Impresión / Printing** activando únicamente su restricción; verificar `P = -2056`, impresión de baja resolución no permitida, impresión de alta resolución no permitida y extracción general permitida.
- [x] 7.9.2 Probar **Cambiar documento / Changing the document** activando únicamente su restricción; verificar `P = -12`, `modify other: not allowed` y que ensamblaje, formularios y anotaciones permanecen permitidos.
- [x] 7.9.3 Probar **Ensamblaje del documento / Document assembly** activando únicamente su restricción; verificar `P = -1028` y `modify document assembly: not allowed`.
- [x] 7.9.4 Probar **Extracción o copia de contenido / Content copying or extraction** activando únicamente su restricción; verificar `P = -20`, `extract for any purpose: not allowed` y extracción para accesibilidad permitida.
- [x] 7.9.5 Probar **Extracción de contenido para accesibilidad / Content extraction for accessibility** activando únicamente su restricción; verificar que `P` permanece en `-4`, la extracción para accesibilidad continúa permitida en `R = 6` y el resultado se registra como limitación esperada, no como fallo.
- [x] 7.9.6 Probar **Extracción de páginas / Page extraction** activando únicamente su restricción; verificar que se agrupa con ensamblaje y produce `P = -1028`, sin exigir un bit independiente inexistente.
- [x] 7.9.7 Probar **Comentando / Commenting** activando únicamente su restricción; verificar `P = -36` y `modify annotations: not allowed`.
- [x] 7.9.8 Probar **Cumplimentar campos de formulario / Filling of form fields** activando únicamente su restricción; verificar `P = -260` y `modify forms: not allowed`.
- [x] 7.9.9 Probar **Firmar firmas digitales / Signing** activando únicamente su restricción; verificar que se agrupa con formularios y produce `P = -260`, documentando que no existe un bit universal de firma independiente.
- [x] 7.9.10 Probar **Creación de páginas de plantilla / Creation of template pages** activando únicamente su restricción; verificar que se agrupa con ensamblaje y produce `P = -1028`, documentando que no existe un bit universal de plantillas independiente.
- [x] 7.9.11 Probar el perfil **sin permisos representables** activando las diez restricciones; verificar `P = -3392`, `R = 6`, AESv3 y que accesibilidad continúa permitida como excepción del estándar moderno.
- [x] 7.9.12 Repetir la matriz con seguridad activada pero sin restricciones seleccionadas; verificar que el documento conserva todas las capacidades representables y que el perfil base corresponde a `P = -4`.
