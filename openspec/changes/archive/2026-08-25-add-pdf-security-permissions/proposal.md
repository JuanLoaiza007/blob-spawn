## Why

BlobSpawn ya genera PDFs localmente, pero no puede producir documentos de prueba con restricciones de seguridad configurables. Esta capacidad permitirá probar consumidores PDF con permisos seleccionables sin cambiar el comportamiento actual: por defecto, los documentos seguirán generándose sin restricciones.

## What Changes

- Añadir un posprocesado opcional de seguridad PDF ejecutado completamente en el navegador mediante una herramienta WebAssembly compatible con exportación estática.
- Incorporar en el formulario PDF un checkbox independiente para cada propiedad de seguridad solicitada:
  - Impresión / Printing.
  - Cambiar documento / Changing the document.
  - Ensamblaje del documento / Document assembly.
  - Extracción o copia de contenido / Content copying or extraction.
  - Extracción de contenido para accesibilidad / Content extraction for accessibility.
  - Extracción de páginas / Page extraction.
  - Comentando / Commenting.
  - Cumplimentar campos de formulario / Filling of form fields.
  - Firmar firmas digitales / Signing.
  - Creación de páginas de plantilla / Creation of template pages.
- Dejar todos los checkboxes desactivados por defecto y mostrar las contraseñas estándar `owner-password` y `user-password` cuando la seguridad esté activa.
- Traducir las opciones de interfaz a las capacidades reales del estándar PDF, documentando las propiedades que comparten bits o que no pueden restringirse de forma independiente.
- Mantener la generación de TXT, JSON, CSV y el flujo de descarga existentes sin cambios.
- Verificar que el cifrado, los permisos, el contenido PDF y la integración con el modo de tamaño exacto no produzcan archivos inválidos ni falsos éxitos.

## Capabilities

### New Capabilities

- `pdf-security-permissions`: Configuración, cifrado local y aplicación opcional de permisos de seguridad a los PDFs generados.

### Modified Capabilities

- `pdf-file-generation`: El generador PDF acepta seguridad opcional, conserva el modo sin restricciones por defecto y verifica la salida protegida antes de descargarla.

## Impact

- Afecta el contrato tipado y el flujo de generación en `lib/generators/pdf.ts` y módulos PDF relacionados.
- Afecta el catálogo de campos y la interfaz PDF en `lib/generators/config.ts` y `app/page.tsx`.
- Requiere evaluar e integrar una dependencia de cifrado PDF compatible con navegador y `output: "export"`, preferentemente qpdf compilado a WebAssembly.
- Puede requerir un worker o carga diferida de WebAssembly para limitar el impacto sobre el bundle y la memoria.
- Requiere ajustar la estimación, el mínimo estructural y el algoritmo de tamaño exacto cuando la seguridad esté activa.
- Requiere pruebas con `pdf-lib`, qpdf y lectores PDF externos; las restricciones PDF son cooperativas y no constituyen DRM fuerte.
