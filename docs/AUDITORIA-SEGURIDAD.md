# Auditoría de seguridad — 24/10/2026

Verificación final y cierre del trabajo disponible: 25/10/2026.

## Alcance y resultado

Se revisó el frontend disponible: rutas y roles, sesión/SAML, servicios HTTP,
CSRF, certificados/Graph/AutoFirma, tratamiento de archivos, exportaciones CSV,
renderizado de datos, almacenamiento del navegador, configuración Vite y
dependencias. Se consultaron los avisos del registro oficial npm y se leyó la
cabecera pública de la página raíz mediante una petición HEAD.

**Parcheado en el repositorio; pendiente de desplegar.** No se dispone del código
del backend, acceso SSH, base de datos, configuración real de Apache ni cuentas de
prueba SAML/Graph. No se ha realizado explotación del sitio, escaneo de puertos,
pruebas con datos personales ni envío de correos/Telegram. No se puede certificar
la seguridad integral del sistema ni afirmar que la API tenga IDOR, inyección SQL
o fallos de SAML sin revisarla.

## Hallazgos y correcciones

La prioridad describe impacto potencial. Las condiciones de explotación y el
estado distinguen fallos del código, configuraciones de riesgo y controles
preventivos; no hay evidencia de que el sistema haya sido comprometido.

| Hallazgo | Evidencia y condición | Corrección y estado |
| --- | --- | --- |
| Dependencias con avisos altos/críticos | `npm audit` inicial: 14 paquetes afectados; 2 críticos, 9 altos, 3 moderados. Incluía herramientas de desarrollo, no solo código enviado al navegador. | Vite 6.4.5, Vitest/UI 4.1.12, React Router DOM 7.18.4, react-cookie-consent 10.0.2 y transitivas compatibles actualizadas. Auditoría final: 0. |
| Exposición del servidor de desarrollo | `vite.config.js` tenía `host: true` y admitía el hostname público de producción. La explotación de los avisos de Vite/Vitest depende de que esos servidores estén ejecutándose y sean accesibles. No se comprobó su exposición remota. | Vite y preview ligados a `127.0.0.1`; UI de pruebas local; host público eliminado. Producción debe servir `dist/`. |
| Inyección de fórmulas CSV — alta condicionada | `miPerfilAdmin.jsx` insertaba valores sin neutralizar fórmulas ni escapar comillas. Un dato controlado por un usuario y exportado por un administrador podía interpretarse como fórmula en una hoja de cálculo. El CSV de feedback protegía algunos prefijos, pero no espacios previos. | Codificador común: escape correcto de comillas/delimitadores y neutralización de fórmulas, incluidos espacios y caracteres de control. Aplicado a ambos exportadores. |
| Formularios Graph sin token CSRF — alta si el backend los acepta | `CertificadosDelegacion.jsx` hacía `form.submit()` fuera de `csrfFetch` para `enviar-graph` y `firmar-lote`. No se puede confirmar cómo los valida el servidor. | Se exige obtener el token antes de enviar y se incorpora `_csrf` al multipart. Destino validado y `rel=noopener noreferrer`. **Pendiente: backend debe validar `_csrf` antes de efectos.** |
| Redirección de logout sin validar — media/alta condicionada | `services/login.js` asignaba el `redirectUrl` del JSON directamente a `window.location.href`, sin restringir esquema/origen. Requiere controlar ese valor o comprometer una respuesta; no se ha demostrado un origen de datos atacante en el backend. | Solo HTTP local en desarrollo o HTTPS; sin credenciales URL; orígenes exactos del frontend/API/IdP configurado. Ante valor rechazado vuelve a `/login`. |
| Peticiones autenticadas sin limitar destinos/redirecciones — defensa adicional | El helper CSRF añadía tokens a cualquier destino recibido y seguía redirecciones. Los llamantes actuales usan principalmente rutas constantes; no se ha demostrado una filtración explotable por sí sola. | Destinos de API permitidos, HTTPS en producción, `redirect:error` y `cache:no-store`. Se respeta el método de objetos `Request`, se impide que una petición de token antigua sobreviva a un cambio de sesión y se mantiene un único reintento CSRF. |
| AutoFirma configurable sin integridad — media condicionada | La URL predeterminada ya estaba fijada con SRI; al configurar `VITE_AUTOFIRMA_SCRIPT_URL` se eliminaba esa protección. Riesgo si se compromete ese proveedor/script. | Los scripts personalizados también necesitan SHA-384/SHA-512 SRI y URL segura. Se limpian errores para permitir reintentar. |
| Clasificación permisiva de adjuntos — defensa adicional | `tipoArchivo.js` aceptaba MIME/extensión y convertía datos desconocidos en PDF. No se ha demostrado ejecución de HTML en el visor por esta vía. | Solo previsualiza PNG/PDF con firma inicial reconocida; lo desconocido se trata como binario. Esta inspección no valida todo el PDF ni detecta malware. |
| Cabeceras de protección ausentes en la respuesta pública — media | HEAD `/` el 24/10/2026: HSTS presente; ausentes CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy y Permissions-Policy. Solo se observó esa respuesta. | Include Apache preparado. **Pendiente de instalar y validar en servidor.** CSP mínima aplicada por el include; CSP completa en Report-Only hasta verificar integraciones. |
| Instalación no reproducible — riesgo de mantenimiento | `package-lock.json` estaba ignorado por Git. | Lockfile incluido; `.env.*` y caché npm ignorados; `.env.example` público sin secretos; instalación con `npm ci --ignore-scripts`. |

Correcciones relacionadas: una API no configurada ya no genera URLs con el texto
`undefined`; el login usa el backend configurado; respuestas HTTP fallidas no se
interpretan como sesión válida; errores de sesión terminan en estado no
autenticado. El logout limpia el token CSRF y la selección de permutas.

## Dependencias: interpretación del resultado

Los 14 elementos del informe inicial son entradas de paquetes afectados, no 14
vulnerabilidades independientes explotables en producción. La entrada de React
Router menciona RSC; este frontend usa BrowserRouter y no demuestra ese escenario.
Los críticos iniciales afectan a Vitest y su dependencia tinypool; no se incluyen
en los estáticos de producción, pero sí importan en el entorno de desarrollo/CI.

Las correcciones se verificaron con el registro npm el día de la auditoría.
“0 vulnerabilidades” significa cero avisos conocidos en ese registro para el
árbol instalado, no ausencia garantizada de fallos ni cobertura de Apache, SAML,
AutoFirma nativo, sistema operativo o backend.

Referencias de los mantenedores: [aviso de Vite](https://github.com/vitejs/vite/security/advisories/GHSA-rq7h-c2jc-7f22),
[aviso de Vitest](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp) y
[aviso de tinypool](https://github.com/tinylibs/tinypool/security/advisories/GHSA-85c8-ppgw-ccpr).

## Controles observados y límites

- Los textos de usuarios se renderizan mediante React; la búsqueda de sinks no
  encontró `dangerouslySetInnerHTML`, `eval`, `new Function` ni `document.write` en
  el código de aplicación revisado. Esto no audita internamente cada dependencia.
- Las notificaciones ya restringían enlaces a rutas conocidas. Las rutas por rol
  ya existen; no se consideran una frontera de autorización del servidor.
- No se observaron tokens de sesión en localStorage. La búsqueda de patrones
  comunes de claves en el árbol de código no detectó secretos; no se inspeccionó
  todo el historial Git ni los secretos del servidor.
- No hay código SQL, persistencia de sesiones, validación SAML, verificación
  criptográfica del PDF, middleware de permisos ni política de archivos del
  backend en este repositorio. Esos controles siguen pendientes de evaluación.

## Validación

- Antes: 89 pruebas correctas; lint con 11 errores y 4 avisos preexistentes.
- Después: 129 pruebas correctas, 28 ficheros de pruebas.
- Pruebas añadidas: fórmulas CSV, destinos no autorizados, esquemas peligrosos,
  HTTP en producción, redirects/cache, métodos de Request, carrera al renovar
  sesión, denegaciones CSRF, token en formularios multipart, integridad AutoFirma,
  respuestas API manipuladas, destinos independientes de un elemento HTML `base`
  y MIME/extensiones engañosas.
- `npm ci --ignore-scripts`: instalación limpia correcta con npm 10.9.2;
  `npm audit`: 0 vulnerabilidades.
- `npm run build`: correcto. Mantiene el aviso de tamaño de bundle (>500 kB).
- `npm run lint`: 0 errores y 4 avisos previos de hooks/Fast Refresh. Se corrigieron
  los errores triviales de imports, variables sin uso, propiedad JSX y PropTypes.
- No se ha validado el include con `httpd -t` ni probado SAML/Graph/AutoFirma con
  credenciales y servicios reales. Los pasos de aceptación están en el runbook.

## Siguiente paso del servidor

Seguir [SEGURIDAD-SERVIDOR.md](SEGURIDAD-SERVIDOR.md): inventario y respaldo,
actualización de Rocky, despliegue del frontend, instalación del include Apache y
verificación del contrato del backend. Se necesita el repositorio del backend y
su configuración de despliegue para parchear y probar los controles pendientes.
