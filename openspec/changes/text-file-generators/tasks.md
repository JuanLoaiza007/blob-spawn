## 1. Configuración y catálogo

- [ ] 1.1 Crear la configuración central de límites con unidades decimales, techo de entrada de 2048 MB, umbral de confirmación de 500 MB y máximo de aplicación modificable en un único archivo; verificar que el formulario no permita aumentar ese máximo.
- [ ] 1.2 Crear el registro declarativo de `.txt`, `.json` y `.csv` con extensión, MIME, nombre visible, alias de búsqueda, valores iniciales y parámetros específicos; verificar que cada tipo aparezca una sola vez en el selector.
- [ ] 1.3 Implementar la normalización y el filtrado de búsquedas por extensión, nombre y alias, manteniendo separados query y tipo seleccionado; verificar que escribir `.txt`, `txt`, `Texto plano` o mayúsculas filtre opciones sin cambiar el formulario activo.

## 2. Generación exacta en bytes

- [ ] 2.1 Crear utilidades de validación y conversión de tamaños a bytes usando unidades decimales; verificar mínimos, máximos, valores fraccionarios, valores inválidos y `Blob.size` esperado.
- [ ] 2.2 Crear la utilidad de relleno ASCII basada en `Uint8Array` sin usar longitud de strings como medida; verificar que produzca exactamente N bytes para tamaños pequeños y grandes de prueba.
- [ ] 2.3 Implementar el generador `.txt` con patrón de texto legible y relleno ASCII; verificar MIME, contenido no vacío y tamaño exacto para varias configuraciones.
- [ ] 2.4 Implementar el generador `.json` con una estructura compacta válida y campo ASCII ajustable; verificar que el resultado se pueda parsear y conserve exactamente el tamaño solicitado.
- [ ] 2.5 Implementar el generador `.csv` con encabezado, una cantidad fija de columnas, filas ASCII y terminador LF; verificar que todas las filas sean consistentes y que el tamaño sea exacto.
- [ ] 2.6 Definir el contrato común de los generadores y conectar cada descriptor del registro con su generador; verificar que una configuración normalizada devuelva bytes, MIME, extensión y nombre base coherentes.

## 3. Interfaz y flujo de descarga

- [ ] 3.1 Instalar mediante el CLI de Shadcn los componentes necesarios para búsqueda, campos, selección, aviso y acción, y componer la pantalla sin primitives visuales duplicados; verificar que el build de TypeScript compile.
- [ ] 3.2 Convertir la página principal en el flujo cliente de búsqueda, selección y formulario adaptativo; verificar que escribir solo filtre, que seleccionar una opción cambie el formulario y que Enter active la primera mejor coincidencia, mostrando únicamente los parámetros propios de `.txt`, `.json` o `.csv`.
- [ ] 3.3 Añadir el campo de nombre base con filtrado/validación de letras Unicode, números, guion y guion bajo, y añadir automáticamente la extensión; verificar nombres válidos como `prueba-á_01` y rechazo de espacios, barras y puntuación.
- [ ] 3.4 Implementar el estado de confirmación para solicitudes superiores a 500 MB con el texto de advertencia y acciones `Confirmar`/cancelar; verificar que la generación no comience antes de confirmar y que cancelar no descargue nada.
- [ ] 3.5 Implementar la descarga local con `Blob`, URL temporal y liberación del recurso; verificar que no se realicen peticiones de red y que el nombre y MIME descargados sean correctos.
- [ ] 3.6 Añadir estados de idle, validación, generación, éxito y error, incluyendo fallos de memoria o generación; verificar que se eviten dobles acciones y no se muestre éxito tras un fallo.

## 4. Configuración de despliegue y validación

- [ ] 4.1 Configurar Next.js para exportación estática y verificar que `npm run build` finalice sin APIs de servidor requeridas.
- [ ] 4.2 Añadir pruebas de integración o comprobaciones automatizadas para catálogo, validación, exactitud de bytes, parseo JSON, estructura CSV y nombre de archivo; verificar los escenarios definidos en `specs/text-file-generation/spec.md`.
- [ ] 4.3 Ejecutar lint, build y una verificación manual en navegador con tamaños pequeños y un caso mayor de 500 MB; confirmar que el máximo configurable y el warning funcionen sin introducir llamadas de red.
